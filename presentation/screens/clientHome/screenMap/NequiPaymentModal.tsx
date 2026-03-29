import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert
} from "react-native";
import WebView from "react-native-webview";
import { API_BASE_URL } from "../../../API/API";
import COLORS from "../../../utils/colors";
import SuccessModal from "../../../components/SuccessModal";
import ErrorModal from "../../../components/ErrorModal";

interface NequiPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  userPhone: string;
  onSuccess?: (source?: any) => void;
}

const NequiPaymentModal: React.FC<NequiPaymentModalProps> = ({
  visible,
  onClose,
  userPhone,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const WOMPI_PUBLIC_KEY = "pub_test_B9NWftSIYxFt8oXHMhDLWhCfjwHVf6WX";

  // 1️⃣ Crear transacción en el backend
  const startNequiFlow = async () => {
    setLoading(true);

    try {
      console.log("🔹 Creando transacción para Nequi...");

      const createResp = await fetch(`${API_BASE_URL}/api/wompi/create-nequi-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPhone }),
      });

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

      // Construir URL del checkout
      const redirectUrl = encodeURIComponent("https://redirect-nequi.com");
      const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${WOMPI_PUBLIC_KEY}&acceptance-token=${acceptance_token}&redirect-url=${redirectUrl}&currency=COP&amount-in-cents=${amount}&reference=${transaction_id}&payment-method=nequi`;

      console.log("🔹 Abriendo checkout de Nequi...");
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
    if (url.includes("redirect-nequi.com")) {
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

  // 3️⃣ Verificar transacción con reintentos
  const verifyAndSaveTransaction = async (txId: string) => {
    setLoading(true);

    try {
      console.log("🔹 Verificando transacción...");

      // Intentar verificar hasta 5 veces con 2 segundos de espera
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`   Intento ${attempts}/${maxAttempts}...`);

        const verifyResp = await fetch(`${API_BASE_URL}/api/wompi/verify-nequi-transaction/${txId}`);
        const verifyData = await verifyResp.json();

        console.log("📊 Estado:", verifyData.status || verifyData.transaction?.status);

        // Si fue exitoso
        if (verifyResp.ok && verifyData.success && verifyData.payment_source) {
          console.log("✅ Payment source guardado");

          setSuccessMessage("✅ Payment source guardado");
          setShowSuccessModal(true);
          setTimeout(() => {
            onSuccess?.(verifyData.payment_source);
            onClose();
          }, 2000);
         /* Alert.alert(
            "¡Éxito! 🎉",
            "Tu cuenta Nequi ha sido vinculada correctamente",
            [
              {
                text: "OK",
                onPress: () => {
                  onSuccess?.(verifyData.payment_source);
                  onClose();
                }
              }
            ]
          );*/
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
      setErrorMessage("La transacción está siendo procesada. Verifica tu cuenta Nequi en unos minutos.");
      setShowErrorModal(true);
      /*Alert.alert(
        "Verificación pendiente",
        "La transacción está siendo procesada. Verifica tu cuenta Nequi en unos minutos."
      );*/

    } catch (err) {
      console.error("❌ Error en verificación:", err);
      setErrorMessage("Ocurrió un error al verificar el proceso.");
      setShowErrorModal(true);
      //Alert.alert("Error", "Ocurrió un error al verificar el proceso");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCheckoutUrl("");
    setTransactionId(null);
    onClose();
  };

  return (
    <>
      {/* Modal Principal */}
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.title}>Agregar Nequi</Text>

            <Text style={styles.description}>
              Para vincular tu cuenta Nequi, crearemos una transacción de prueba de $17.85 COP que se usará para autorizar el método de pago.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>ℹ️ Proceso:</Text>
              <Text style={styles.infoItem}>1. Se abrirá el checkout de Wompi</Text>
              <Text style={styles.infoItem}>2. Ingresa tu celular y contraseña Nequi</Text>
              <Text style={styles.infoItem}>3. Autoriza la transacción en tu app Nequi</Text>
              <Text style={styles.infoItem}>4. Tu cuenta quedará guardada para futuros pagos</Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Se te cobrará $17.85 COP para validar tu cuenta
              </Text>
            </View>

            <TouchableOpacity
              onPress={startNequiFlow}
              style={[styles.button, styles.primaryButton]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Continuar con Nequi</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClose}
              style={[styles.button, styles.cancelButton]}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WebView Modal para Checkout */}
      {checkoutUrl !== "" && (
        <Modal visible={true} animationType="slide">
          <View style={styles.webviewContainer}>
            <View style={styles.webviewHeader}>
              <Text style={styles.webviewTitle}>Pago Nequi</Text>
              <TouchableOpacity
                onPress={() => {
                  setCheckoutUrl("");
                  setErrorMessage("Has cancelado el proceso de vinculación de Nequi.");
                  setShowErrorModal(true);
                  /*Alert.alert(
                    "Proceso cancelado",
                    "Has cancelado el proceso de vinculación de Nequi"
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
                  <ActivityIndicator size="large" color="#A000FF" />
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
    padding: 24,
    borderRadius: 16,
    elevation: 5,
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
  infoBox: {
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#A000FF",
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
    backgroundColor: "#A000FF",
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
    backgroundColor: "#A000FF",
    borderBottomWidth: 1,
    borderBottomColor: "#8000CC",
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

export default NequiPaymentModal;