import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { API_BASE_URL } from "../../../API/API";
import COLORS from "../../../utils/colors";
import { patchFinishUser } from "../../../utils/PatchActiveTravel";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SuccessModal from "../../../components/SuccessModal";
import ErrorModal from "../../../components/ErrorModal";
import { createInvoiceTravel } from "../../../utils/createInvoiceTravel";
import { HandleDeleteActiveTravels } from "../../../utils/HandleActiveTravels";
import { HandleDeleteOffers } from "../../../utils/HandleOffers";
import { HandleDeleteTravels } from "../../../utils/HandleTravel";
import NequiPaymentModal from "./NequiPaymentModal";

interface SavedMethod {
  id: number;
  type: string;
  source_id: string;
  status: string;
  meta: any;
  created_at: string;
}

interface PaymentMethodsListProps {
  paymentData: any;
  userPhone: string;
  onPaymentSuccess?: () => void;
  driverSelectedMethod?: string; // method the driver chose (e.g. "nequi", "efectivo")
}

const formatCOP = (value: string | number): string => {
  if (!value) return "";
  const n = parseInt(String(value).replace(/\D/g, ""), 10);
  if (isNaN(n)) return "";
  return `$ ${n.toLocaleString("es-CO")}`;
};

const DRIVER_METHOD_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  efectivo:  { label: "Efectivo",  emoji: "💵", color: "#4CAF50" },
  nequi:     { label: "Nequi",     emoji: "📱", color: "#A000FF" },
  daviplata: { label: "DaviPlata", emoji: "📲", color: "#E31837" },
  tarjeta:   { label: "Tarjeta",   emoji: "💳", color: "#2196F3" },
  pse:       { label: "PSE",       emoji: "🏦", color: "#0066CC" },
};

const PaymentMethodsList: React.FC<PaymentMethodsListProps> = ({
  paymentData,
  userPhone,
  onPaymentSuccess,
  driverSelectedMethod = "",
}) => {
  const [savedMethods, setSavedMethods] = useState<SavedMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Nequi WebView flow
  const [showNequiModal, setShowNequiModal] = useState(false);

  // "Save method?" prompt after digital payment
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [usedPaymentType, setUsedPaymentType] = useState("");

  // ──────────────────────────────────────────────
  // Derive trip amount
  // ──────────────────────────────────────────────
  const tripAmount = (() => {
    const raw =
      paymentData?.contraoferta?.trim() ||
      paymentData?.oferta?.trim() ||
      paymentData?.tarifa?.trim() ||
      "";
    return raw.replace(/\D/g, "");
  })();

  // ──────────────────────────────────────────────
  // Load saved payment methods (background)
  // ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await AsyncStorage.setItem("updateRatings", "true");
    })();
    loadSavedMethods();
  }, []);

  const loadSavedMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payment-methods/${userPhone}`);
      const data = await res.json();
      if (data.success) setSavedMethods(data.payment_methods ?? []);
    } catch (_) {
      /* silently ignore — user can still pay without saved methods */
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // Finish trip after payment
  // ──────────────────────────────────────────────
  const completeTrip = async () => {
    await createInvoiceTravel(paymentData, "cliente");
    await Promise.allSettled([
      HandleDeleteActiveTravels(paymentData?.clientid),
      HandleDeleteOffers(paymentData?.clientid),
      HandleDeleteTravels(paymentData?.clientid),
    ]);
    await patchFinishUser(userPhone);
  };

  // ──────────────────────────────────────────────
  // CASH PAYMENT
  // ──────────────────────────────────────────────
  const handleCash = async () => {
    setProcessing(true);
    try {
      await completeTrip();
      // await asegura que el cleanup de HandletotalInvoice termine
      // ANTES de que esta función retorne, evitando race conditions
      // donde el nuevo viaje se borra al iniciar otro pedido.
      await onPaymentSuccess?.();
    } catch (_) {
      setErrorMessage("Error al registrar el pago en efectivo");
      setShowErrorModal(true);
    } finally {
      setProcessing(false);
    }
  };

  // ──────────────────────────────────────────────
  // CHARGE SAVED METHOD (Nequi / DaviPlata / Card)
  // ──────────────────────────────────────────────
  const handleChargeSaved = async (method: SavedMethod) => {
    const amountInCents = parseInt(tripAmount + "00");
    if (!amountInCents || amountInCents < 150000) {
      setErrorMessage("Monto inválido para cobro digital");
      setShowErrorModal(true);
      return;
    }

    const endpoints: Record<string, string> = {
      NEQUI: "/api/wompi/charge-nequi",
      DAVIPLATA: "/api/wompi/charge-daviplata",
      CARD: "/api/wompi/charge-card",
    };
    const endpoint = endpoints[method.type];
    if (!endpoint) return;

    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPhone,
          amount: amountInCents,
          source_id: method.source_id,
          description: `Pago viaje MotoUberos`,
          installments: 1,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const status = data.transaction?.status;
        if (status === "APPROVED") {
          await completeTrip();
          setSuccessMessage("✅ Pago realizado exitosamente");
          setShowSuccessModal(true);
        } else if (status === "PENDING") {
          setSuccessMessage("⏳ Tu pago está siendo procesado");
          setShowSuccessModal(true);
        } else {
          setErrorMessage("La transacción fue rechazada");
          setShowErrorModal(true);
        }
      } else {
        setErrorMessage("No se pudo realizar el cobro");
        setShowErrorModal(true);
      }
    } catch (_) {
      setErrorMessage("Error al procesar el pago");
      setShowErrorModal(true);
    } finally {
      setProcessing(false);
    }
  };

  // ──────────────────────────────────────────────
  // NEQUI NEW (via WebView checkout)
  // ──────────────────────────────────────────────
  const handleNequiNew = () => {
    setShowNequiModal(true);
  };

  const onNequiSuccess = async (_source?: any) => {
    setShowNequiModal(false);
    setUsedPaymentType("Nequi");
    await completeTrip();
    setShowSavePrompt(true);
  };

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  const savedNequi = savedMethods.find((m) => m.type === "NEQUI");
  const savedDaviPlata = savedMethods.find((m) => m.type === "DAVIPLATA");
  const savedCards = savedMethods.filter((m) => m.type === "CARD");

  const metaPhone = (m: SavedMethod) => {
    let meta = m.meta;
    if (typeof meta === "string") { try { meta = JSON.parse(meta); } catch (_) {} }
    return meta?.phone_number ?? "";
  };

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  if (processing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.processingText}>Procesando pago...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Amount header ── */}
        <View style={styles.amountHeader}>
          <Text style={styles.amountLabel}>Total a pagar</Text>
          <Text style={styles.amountValue}>{formatCOP(tripAmount)}</Text>
        </View>

        {/* ── Driver's chosen method banner ── */}
        {driverSelectedMethod ? (() => {
          const info = DRIVER_METHOD_LABELS[driverSelectedMethod.toLowerCase()];
          return info ? (
            <View style={[styles.driverBanner, { borderColor: info.color + "66" }]}>
              <Text style={styles.driverBannerTitle}>
                {info.emoji} El conductor eligió cobrar con{" "}
                <Text style={[styles.driverBannerMethod, { color: info.color }]}>{info.label}</Text>
              </Text>
              <Text style={styles.driverBannerSub}>
                Puedes pagar con {info.label} o elegir otro método de pago disponible.
              </Text>
            </View>
          ) : null;
        })() : null}

        <Text style={styles.sectionTitle}>¿Cómo quieres pagar?</Text>

        {/* ── Quick-pay: saved methods ── */}
        {!loading && savedMethods.length > 0 && (
          <>
            <Text style={styles.subTitle}>⚡ Guardados</Text>

            {savedNequi && (
              <TouchableOpacity
                style={[styles.methodRow, styles.savedRow]}
                onPress={() => handleChargeSaved(savedNequi)}
              >
                <Image
                  source={require("../../../../assets/neki_icon_img.png")}
                  style={styles.methodLogo}
                />
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>Nequi</Text>
                  <Text style={styles.methodSub}>{metaPhone(savedNequi) || "Guardado"}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}

            {savedDaviPlata && (
              <TouchableOpacity
                style={[styles.methodRow, styles.savedRow]}
                onPress={() => handleChargeSaved(savedDaviPlata)}
              >
                <Image
                  source={require("../../../../assets/davi_icon.png")}
                  style={styles.methodLogo}
                />
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>DaviPlata</Text>
                  <Text style={styles.methodSub}>{metaPhone(savedDaviPlata) || "Guardado"}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}

            {savedCards.map((card) => {
              let meta = card.meta;
              if (typeof meta === "string") { try { meta = JSON.parse(meta); } catch (_) {} }
              const last4 = meta?.public_data?.last_four ?? meta?.last_four ?? "****";
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.methodRow, styles.savedRow]}
                  onPress={() => handleChargeSaved(card)}
                >
                  <Text style={styles.methodEmoji}>💳</Text>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>Tarjeta</Text>
                    <Text style={styles.methodSub}>•••• {last4}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />
            <Text style={styles.subTitle}>Otras opciones</Text>
          </>
        )}

        {/* ── CASH ── */}
        {(() => {
          const isSuggested = driverSelectedMethod.toLowerCase() === "efectivo";
          return (
            <TouchableOpacity
              style={[styles.methodRow, styles.cashRow, isSuggested && styles.suggestedRow]}
              onPress={handleCash}
            >
              <Image source={require("../../../../assets/chas_icon_img.jpg")} style={styles.methodLogo} />
              <View style={styles.methodInfo}>
                <View style={styles.methodNameRow}>
                  <Text style={styles.methodName}>Efectivo</Text>
                  {isSuggested && <View style={styles.suggestedBadge}><Text style={styles.suggestedBadgeText}>Sugerido ✓</Text></View>}
                </View>
                <Text style={styles.methodSub}>El conductor recibe el dinero</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })()}

        {/* ── NEQUI (new) ── */}
        {!savedNequi && (() => {
          const isSuggested = driverSelectedMethod.toLowerCase() === "nequi";
          return (
            <TouchableOpacity
              style={[styles.methodRow, isSuggested && styles.suggestedRow]}
              onPress={handleNequiNew}
            >
              <Image source={require("../../../../assets/neki_icon_img.png")} style={styles.methodLogo} />
              <View style={styles.methodInfo}>
                <View style={styles.methodNameRow}>
                  <Text style={styles.methodName}>Nequi</Text>
                  {isSuggested && <View style={styles.suggestedBadge}><Text style={styles.suggestedBadgeText}>Sugerido ✓</Text></View>}
                </View>
                <Text style={styles.methodSub}>Paga desde tu app Nequi</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })()}

        {/* ── DAVIPLATA (no saved) ── informational ── */}
        {!savedDaviPlata && (
          <View style={styles.methodRow}>
            <Image
              source={require("../../../../assets/davi_icon.png")}
              style={styles.methodLogo}
            />
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>DaviPlata</Text>
              <Text style={styles.methodSub}>Dile al conductor tu número</Text>
            </View>
          </View>
        )}

        {/* ── PSE ── informational ── */}
        <View style={styles.methodRow}>
          <Image
            source={require("../../../../assets/logo_pse_img.png")}
            style={styles.methodLogo}
          />
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>PSE</Text>
            <Text style={styles.methodSub}>Transferencia bancaria</Text>
          </View>
        </View>

        <Text style={styles.hint}>
          💡 Después de pagar te preguntaremos si quieres guardar el método para la próxima vez.
        </Text>

      </ScrollView>

      {/* Nequi WebView flow */}
      <NequiPaymentModal
        visible={showNequiModal}
        onClose={() => setShowNequiModal(false)}
        userPhone={userPhone}
        onSuccess={onNequiSuccess}
      />

      {/* Save method prompt */}
      <Modal visible={showSavePrompt} transparent animationType="fade">
        <View style={styles.promptOverlay}>
          <View style={styles.promptBox}>
            <Text style={styles.promptTitle}>¿Guardar método de pago?</Text>
            <Text style={styles.promptBody}>
              ¿Quieres guardar <Text style={{ fontWeight: "700", color: COLORS.primary }}>{usedPaymentType}</Text> para pagar más rápido la próxima vez?
            </Text>
            <TouchableOpacity
              style={styles.promptBtnPrimary}
              onPress={() => {
                setShowSavePrompt(false);
                setSuccessMessage("✅ Método guardado para próximos pagos");
                setShowSuccessModal(true);
              }}
            >
              <Text style={styles.promptBtnPrimaryText}>Sí, guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.promptBtnSecondary}
              onPress={() => {
                setShowSavePrompt(false);
                onPaymentSuccess?.();
              }}
            >
              <Text style={styles.promptBtnSecondaryText}>No, gracias</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => {
          setShowSuccessModal(false);
          setTimeout(() => onPaymentSuccess?.(), 500);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 20,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 44) + 12,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: 16,
  },
  processingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },

  /* amount header */
  amountHeader: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primary + "33",
  },
  amountLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  amountValue: {
    color: COLORS.primary,
    fontSize: 34,
    fontWeight: "900",
  },

  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  subTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.backgroundMedium,
    marginVertical: 16,
  },

  /* method rows */
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    gap: 12,
  },
  savedRow: {
    borderColor: COLORS.primary + "55",
  },
  cashRow: {
    borderColor: "#4CAF5055",
  },
  methodLogo: {
    width: 36,
    height: 36,
    resizeMode: "contain",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  methodEmoji: {
    fontSize: 28,
    width: 36,
    textAlign: "center",
  },
  methodInfo: {
    flex: 1,
    gap: 2,
  },
  methodName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  methodSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  chevron: {
    color: COLORS.textSecondary,
    fontSize: 22,
    fontWeight: "300",
  },

  hint: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  /* driver banner */
  driverBanner: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  driverBannerTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  driverBannerMethod: {
    fontWeight: "800",
  },
  driverBannerSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  /* suggested method highlight */
  suggestedRow: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  methodNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  suggestedBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  suggestedBadgeText: {
    color: COLORS.textDark,
    fontSize: 10,
    fontWeight: "700",
  },

  /* save prompt */
  promptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 24,
  },
  promptBox: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  promptTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  promptBody: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  promptBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  promptBtnPrimaryText: {
    color: COLORS.textDark,
    fontWeight: "700",
    fontSize: 16,
  },
  promptBtnSecondary: {
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  promptBtnSecondaryText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 16,
  },
});

export default PaymentMethodsList;
