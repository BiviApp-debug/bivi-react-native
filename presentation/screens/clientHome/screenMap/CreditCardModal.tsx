import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { API_BASE_URL } from "../../../API/API";
import COLORS from "../../../utils/colors";
import ErrorModal from "../../../components/ErrorModal";
import SuccessModal from "../../../components/SuccessModal";

interface CreditCardModalProps {
  visible: boolean;
  onClose: () => void;
  userPhone: string;
  onCardSaved?: () => void;
}

const CreditCardModal: React.FC<CreditCardModalProps> = ({
  visible,
  onClose,
  userPhone,
  onCardSaved,
}) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [loading, setLoading] = useState(false);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");



  // ---- FORMATTERS -----
  const formatCardNumber = (t: string) => {
    const clean = t.replace(/\s/g, "");
    return clean.match(/.{1,4}/g)?.join(" ") || clean;
  };

  const formatExpiryDate = (t: string) => {
    const clean = t.replace(/\D/g, "");
    if (clean.length === 0) return "";
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return clean.slice(0, 2) + "/" + clean.slice(2);
    return clean.slice(0, 2) + "/" + clean.slice(2, 4);
  };

  // ---- VALIDATION -----
  const validateCardNumber = (n: string) =>
    /^\d{16}$/.test(n.replace(/\s/g, ""));

  const validateExpiryDate = (d: string) => {
    if (!/^\d{2}\/\d{2}$/.test(d)) return false;
    const [m, y] = d.split("/").map(Number);
    const yearNow = new Date().getFullYear() % 100;
    const monthNow = new Date().getMonth() + 1;
    return m >= 1 && m <= 12 && (y > yearNow || (y === yearNow && m >= monthNow));
  };

  const validateCVV = (cvv: string) => /^\d{3}$/.test(cvv);

  // 📌 ---- MAIN FUNCTION: SAVE CARD -----
  const handleSaveCard = async () => {
    if (
      !validateCardNumber(cardNumber) ||
      !validateExpiryDate(expiryDate) ||
      !validateCVV(cvv) ||
      !cardHolder.trim()
    ) {
      setErrorMessage("Por favor completa todos los campos correctamente");
      setShowErrorModal(true);
      //Alert.alert("Error", "Por favor completa todos los campos correctamente");
      return;
    }

    setLoading(true);

    const cleanedCard = cardNumber.replace(/\s/g, "");
    const [expMonthStr, expYearShortStr] = expiryDate.split("/");

    // 🔥 Wompi espera strings de 2 dígitos
    const exp_month = expMonthStr.padStart(2, '0'); // "09"
    const exp_year = expYearShortStr.padStart(2, '0'); // "29"

    try {
     // console.log("🔹 Paso 1: Tokenizando tarjeta...");

      // 1️⃣ Tokenizar la tarjeta directamente contra WOMPI
      const tokResp = await fetch("https://sandbox.wompi.co/v1/tokens/cards", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": "Bearer pub_test_B9NWftSIYxFt8oXHMhDLWhCfjwHVf6WX"
        },
        body: JSON.stringify({
          number: cleanedCard,
          cvc: cvv,
          exp_month,
          exp_year,
          card_holder: cardHolder.trim(),
        }),
      });

      let tokData;
      try {
        tokData = await tokResp.json();
      } catch (err) {
        const text = await tokResp.text();
        // console.log("❌ Respuesta NO-JSON de Wompi:", text);
        throw new Error("Respuesta inválida desde Wompi");
      }

      if (!tokResp.ok) {
       // console.log("❌ Error de Wompi:", tokData);
        const errorMsg = tokData?.error?.messages
          ? JSON.stringify(tokData.error.messages)
          : "Error tokenizando tarjeta";
        throw new Error(errorMsg);
      }

      const wompiToken = tokData.data.id;
      console.log("✅ Token obtenido:", wompiToken);

      // 2️⃣ Obtener acceptance token FRESCO
     // console.log("🔹 Paso 2: Obteniendo acceptance token...");
      const accResp = await fetch(`${API_BASE_URL}/api/wompi/acceptance`);
      const accData = await accResp.json();

      if (!accData.acceptance_token) {
        throw new Error("No se pudo obtener el acceptance token");
      }

      const acceptance_token = accData.acceptance_token;
      console.log("✅ Acceptance token obtenido");

      // 3️⃣ Crear payment_source en tu backend
      console.log("🔹 Paso 3: Creando payment source...");
      const backendResp = await fetch(
        `${API_BASE_URL}/api/wompi/create-card-source`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `${userPhone}@motoUberos.com`,
            token: wompiToken,
            acceptance_token,
          }),
        }
      );

      const backendData = await backendResp.json();

      if (!backendResp.ok) {
        console.log("❌ Backend error:", backendData);
        throw new Error(backendData.error || "Error creando payment source");
      }

      console.log("✅ Tarjeta guardada exitosamente");
      setSuccessMessage("Tarjeta guardada con éxito");
      setShowSuccessModal(true);
      //Alert.alert("Éxito", "Tarjeta guardada con éxito");
      resetForm();
      onCardSaved?.();
      onClose();
    } catch (e) {
      console.log("❌ Error general:", e);
      const errorMessage = e instanceof Error ? e.message : "No se pudo guardar la tarjeta";
      setErrorMessage("No se pudo guardar la tarjeta");
      setShowErrorModal(true);
      //Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCardNumber("");
    setExpiryDate("");
    setCvv("");
    setCardHolder("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* HEADER */}
            <View style={styles.header}>
              <Text style={styles.title}>Agregar Tarjeta</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* CARD PREVIEW */}
            <View style={styles.cardPreview}>
              <View style={styles.cardChip} />
              <Text style={styles.cardNumberPreview}>
                {cardNumber || "•••• •••• •••• ••••"}
              </Text>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.cardLabel}>TITULAR</Text>
                  <Text style={styles.cardHolderPreview}>
                    {cardHolder.toUpperCase() || "NOMBRE APELLIDO"}
                  </Text>
                </View>

                <View>
                  <Text style={styles.cardLabel}>VENCE</Text>
                  <Text style={styles.cardExpiryPreview}>
                    {expiryDate || "MM/AA"}
                  </Text>
                </View>
              </View>
            </View>

            {/* FORM */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Número de Tarjeta</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="4242 4242 4242 4242"
                  placeholderTextColor={COLORS.textSecondary}
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                  maxLength={19}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Titular</Text>
                <TextInput
                  style={styles.input}
                  placeholder="JUAN PEREZ"
                  placeholderTextColor={COLORS.textSecondary}
                  value={cardHolder}
                  onChangeText={(t) => setCardHolder(t)}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>Vencimiento</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/AA"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    value={expiryDate}
                    onChangeText={(t) => setExpiryDate(formatExpiryDate(t))}
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    secureTextEntry
                    value={cvv}
                    onChangeText={(t) => setCvv(t.replace(/\D/g, ""))}
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            {/* INFO */}
            <Text style={styles.testCardInfo}>
              💳 Tarjeta de prueba: 4242 4242 4242 4242
            </Text>

            {/* BUTTONS */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveCard}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Tarjeta</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  scrollContent: { padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: COLORS.backgroundMedium,
  },
  title: { fontSize: 22, color: COLORS.textPrimary, fontWeight: "bold" },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.backgroundMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: { fontSize: 18, color: COLORS.textPrimary },

  cardPreview: {
    backgroundColor: "#667eea",
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    marginBottom: 32,
    elevation: 6,
  },
  cardChip: {
    width: 50,
    height: 35,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 8,
    marginBottom: 20,
  },
  cardNumberPreview: {
    fontSize: 22,
    color: "#fff",
    letterSpacing: 2,
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  cardHolderPreview: { color: "white", fontSize: 16, fontWeight: "600" },
  cardExpiryPreview: { color: "white", fontSize: 16, fontWeight: "600" },

  form: { marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 5 },
  input: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderColor: COLORS.backgroundMedium,
    borderWidth: 1,
    color: COLORS.textPrimary,
  },
  row: { flexDirection: "row" },

  testCardInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 16,
    fontStyle: "italic",
  },

  buttonContainer: { gap: 12 },
  button: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButton: { backgroundColor: COLORS.primary },
  cancelButton: { backgroundColor: COLORS.backgroundMedium },
  saveButtonText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 16,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});

export default CreditCardModal;