import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import WebView from "react-native-webview";
import { API_BASE_URL } from "../../../API/API";
import COLORS from "../../../utils/colors";
import ErrorModal from "../../../components/ErrorModal";
import SuccessModal from "../../../components/SuccessModal";

interface DaviPlataPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  userPhone: string;
  onSuccess?: (source?: any) => void;
}

const DaviPlataPaymentModal: React.FC<DaviPlataPaymentModalProps> = ({
  visible,
  onClose,
  userPhone,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Estados para datos del usuario
  const [documentType, setDocumentType] = useState<'CC' | 'CE' | 'TI'>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [showForm, setShowForm] = useState(true);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const WOMPI_PUBLIC_KEY = "pub_test_B9NWftSIYxFt8oXHMhDLWhCfjwHVf6WX";

  // 1️⃣ Crear transacción en el backend
  const startDaviPlataFlow = async () => {
    // Validar campos
    if (!documentNumber.trim()) {
      setErrorMessage("Por favor ingresa tu número de documento");
      setShowErrorModal(true);
      //Alert.alert('Error', 'Por favor ingresa tu número de documento');
      return;
    }

    if (documentNumber.length > 14) {
      setErrorMessage("El número de documento no puede tener más de 14 caracteres");
      setShowErrorModal(true);
      //Alert.alert('Error', 'El número de documento no puede tener más de 14 caracteres');
      return;
    }

    setLoading(true);

    try {
      console.log("🔹 Creando transacción para DaviPlata...");
      console.log(`   Teléfono: ${userPhone}`);
      console.log(`   Documento: ${documentType} ${documentNumber}`);

      const createResp = await fetch(`${API_BASE_URL}/api/wompi/create-daviplata-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPhone,
          documentType,
          documentNumber
        }),
      });

      //console.log("📊 Status de respuesta:", createResp.status);

      // Verificar si la respuesta es JSON
      const contentType = createResp.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await createResp.text();
        console.error("❌ Respuesta no es JSON:", text);
        setErrorMessage("El servidor respondió con un formato incorrecto");
        setShowErrorModal(true);
        //Alert.alert("Error", "El servidor respondió con un formato incorrecto");
        setLoading(false);
        return;
      }

      const createData = await createResp.json();

      if (!createResp.ok || !createData.success) {
        console.error("❌ Error creando transacción:", createData);
        setErrorMessage("No se pudo iniciar el proceso");
        setShowErrorModal(true);
        //Alert.alert("Error", createData.error || "No se pudo iniciar el proceso");
        setLoading(false);
        return;
      }

      const { transaction_id, acceptance_token, amount } = createData;

      console.log("✅ Transacción creada:", transaction_id);
      console.log("   Monto:", amount);
      setTransactionId(transaction_id);
      setShowForm(false);

      // Construir URL del checkout
      const redirectUrl = encodeURIComponent("https://redirect-daviplata.com");
      const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${WOMPI_PUBLIC_KEY}&acceptance-token=${acceptance_token}&redirect-url=${redirectUrl}&currency=COP&amount-in-cents=${amount}&reference=${transaction_id}&payment-method=daviplata`;

      console.log("🔹 Abriendo checkout de DaviPlata...");
      setCheckoutUrl(checkoutUrl);

    } catch (err) {
      console.error("❌ Error en el proceso:", err);
      setErrorMessage("Ocurrió un error al iniciar el proceso");
      setShowErrorModal(true);
      //Alert.alert("Error", "Ocurrió un error al iniciar el proceso");
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ Detectar cuando completa el proceso
  const onNavChange = async (navState: any) => {
    const { url } = navState;
    console.log("🔄 Navegación:", url);

    // Detectar cuando regresa del checkout
    if (url.includes("redirect-daviplata.com")) {
      try {
        const urlObj = new URL(url);
        const id = urlObj.searchParams.get("id");

        console.log("✅ Redirección detectada");
        console.log("   Transaction ID de URL:", id);
        console.log("   Transaction ID guardado:", transactionId);

        setCheckoutUrl(""); // Cerrar webview

        // Usar el ID de la URL si existe, si no usar el guardado
        const txIdToVerify = id || transactionId;

        if (txIdToVerify) {
          await verifyAndSaveTransaction(txIdToVerify);
        } else {
          setErrorMessage("No se pudo obtener el ID de la transacción");
          setShowErrorModal(true);
          //Alert.alert("Error", "No se pudo obtener el ID de la transacción");
        }
      } catch (error) {
        console.error("❌ Error parseando URL:", error);
        // Si hay error, usar el transactionId guardado
        if (transactionId) {
          setCheckoutUrl("");
          await verifyAndSaveTransaction(transactionId);
        }
      }
    }
  };

  // 3️⃣ Verificar transacción y GUARDAR en BD
  const verifyAndSaveTransaction = async (txId: string) => {
    setLoading(true);

    try {
      console.log("🔹 Verificando transacción...");

      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`   Intento ${attempts}/${maxAttempts}...`);

        const verifyResp = await fetch(`${API_BASE_URL}/api/wompi/verify-daviplata-transaction/${txId}`);
        const verifyData = await verifyResp.json();

        console.log("📊 Estado:", verifyData.status || verifyData.transaction?.status);

        // Si fue exitoso
        if (verifyResp.ok && verifyData.success && verifyData.payment_source) {
          console.log("✅ Payment source obtenido:", verifyData.payment_source);

          // GUARDAR EN BASE DE DATOS
          console.log("🔹 Guardando en base de datos...");
          const saveResp = await fetch(`${API_BASE_URL}/api/wompi/save-daviplata-method`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userPhone: userPhone,
              paymentSource: verifyData.payment_source
            })
          });

          const saveData = await saveResp.json();

          if (!saveResp.ok) {
            console.error("❌ Error guardando:", saveData);
            setErrorMessage("No se pudo guardar el método de pago");
            setShowErrorModal(true);
            //Alert.alert("Error", "No se pudo guardar el método de pago");
            setLoading(false);
            return;
          }

          console.log("✅ Método guardado en DB:", saveData);
          setSuccessMessage("Tu cuenta DaviPlata ha sido vinculada correctamente");
          setShowSuccessModal(true);

          setTimeout(() => {
            onSuccess?.(verifyData.payment_source);
            handleClose();
          }, 2000);
          /* Alert.alert(
            "¡Éxito! 🎉",
            "Tu cuenta DaviPlata ha sido vinculada correctamente",
            [
              {
                text: "OK",
                onPress: () => {
                  onSuccess?.(verifyData.payment_source);
                  handleClose();
                }
              }
            ]
          ); */
          setLoading(false);
          return;
        }

        // Si está pendiente, esperar y reintentar
        if (verifyData.status === "PENDING" && attempts < maxAttempts) {
          console.log("⏳ Transacción pendiente, esperando 2 segundos...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // Si falló definitivamente
        if (verifyData.status === "ERROR" || verifyData.status === "DECLINED") {
          setErrorMessage("La transacción fue rechazada");
          setShowErrorModal(true);
          //Alert.alert("Error", "La transacción fue rechazada");
          setLoading(false);
          return;
        }
      }

      // Si agotó los intentos
      setErrorMessage("La transacción está siendo procesada. Verifica tu cuenta DaviPlata en unos minutos.");
      setShowErrorModal(true);
     /* Alert.alert(
        "Verificación pendiente",
        "La transacción está siendo procesada. Verifica tu cuenta DaviPlata en unos minutos."
      );*/

    } catch (err) {
      console.error("❌ Error en verificación:", err);
      setErrorMessage("Ocurrió un error al verificar el proceso");
      setShowErrorModal(true);
      //Alert.alert("Error", "Ocurrió un error al verificar el proceso");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCheckoutUrl("");
    setTransactionId(null);
    setShowForm(true);
    setDocumentNumber('');
    setDocumentType('CC');
    onClose();
  };

  return (
    <>
      {/* Modal Principal - Formulario */}
      <Modal visible={visible && showForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={styles.modalContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.title}>Agregar DaviPlata</Text>

              <Text style={styles.description}>
                Ingresa tus datos para vincular tu cuenta DaviPlata
              </Text>

              {/* Selector de tipo de documento */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tipo de documento</Text>
                <View style={styles.documentTypeContainer}>
                  {(['CC', 'CE', 'TI'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.documentTypeButton,
                        documentType === type && styles.documentTypeButtonActive
                      ]}
                      onPress={() => setDocumentType(type)}
                    >
                      <Text style={[
                        styles.documentTypeText,
                        documentType === type && styles.documentTypeTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.helperText}>
                  CC: Cédula de Ciudadanía • CE: Cédula de Extranjería • TI: Tarjeta de Identidad
                </Text>
              </View>

              {/* Input de número de documento */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Número de documento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 1234567890"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={documentNumber}
                  onChangeText={(text) => setDocumentNumber(text.replace(/\D/g, ''))}
                  maxLength={14}
                />
                <Text style={styles.helperText}>
                  Máximo 14 caracteres
                </Text>
              </View>

              {/* Información del proceso */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>ℹ️ Proceso:</Text>
                <Text style={styles.infoItem}>1. Se abrirá el checkout de Wompi</Text>
                <Text style={styles.infoItem}>2. Ingresa tu celular y contraseña DaviPlata</Text>
                <Text style={styles.infoItem}>3. Autoriza la transacción en tu app DaviPlata</Text>
                <Text style={styles.infoItem}>4. Tu cuenta quedará guardada para futuros pagos</Text>
              </View>

              {/* Advertencia */}
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Se te cobrará $1,500 COP para validar tu cuenta
                </Text>
              </View>

              {/* Botón continuar */}
              <TouchableOpacity
                onPress={startDaviPlataFlow}
                style={[styles.button, styles.primaryButton]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Continuar con DaviPlata</Text>
                )}
              </TouchableOpacity>

              {/* Botón cancelar */}
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.button, styles.cancelButton]}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* WebView Modal para Checkout */}
      {checkoutUrl !== "" && (
        <Modal visible={true} animationType="slide">
          <View style={styles.webviewContainer}>
            <View style={styles.webviewHeader}>
              <Text style={styles.webviewTitle}>Pago DaviPlata</Text>
              <TouchableOpacity
                onPress={() => {
                  setCheckoutUrl("");
                  setShowForm(true);
                  setErrorMessage("Proceso cancelado");
                  setShowErrorModal(true);
                 /* Alert.alert(
                    "Proceso cancelado",
                    "Has cancelado el proceso de vinculación de DaviPlata"
                  );*/
                }}
                style={styles.closeWebviewButton}
              >
                <Text style={styles.closeWebviewText}>✕ Cerrar</Text>
              </TouchableOpacity>
            </View>

            <WebView
              source={{ uri: checkoutUrl }}
              onNavigationStateChange={onNavChange}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#EF0829" />
                  <Text style={styles.loadingText}>Cargando checkout...</Text>
                </View>
              )}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
            <ErrorModal
              visible={showErrorModal}
              message={errorMessage}
              onClose={() => setShowErrorModal(false)}
            />
            <SuccessModal
              visible={showSuccessModal}
              message={successMessage}
              onClose={() => setShowSuccessModal(false)}
            />
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    maxHeight: '90%',
    elevation: 5,
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  documentTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  documentTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  documentTypeButtonActive: {
    backgroundColor: '#EF0829',
    borderColor: '#EF0829',
  },
  documentTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  documentTypeTextActive: {
    color: '#fff',
  },
  infoBox: {
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#EF0829",
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
    marginTop: 4,
  },
  warningBox: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#FFA000",
  },
  warningText: {
    fontSize: 13,
    color: "#856404",
    fontWeight: "600",
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#EF0829",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundMedium,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 16,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#EF0829",
    borderBottomWidth: 1,
    borderBottomColor: "#CC0620",
  },
  webviewTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  closeWebviewButton: {
    padding: 8,
  },
  closeWebviewText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default DaviPlataPaymentModal;