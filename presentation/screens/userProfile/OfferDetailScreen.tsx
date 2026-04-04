import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
} from "react-native";
import COLORS from "../../utils/colors";
import {
  watchVideo,
  redeemOfferPoints,
  Offer,
  TelecomCompany,
} from "./Biviconnectapi";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigator/MainStackNavigator";

interface Props extends StackScreenProps<RootStackParamList, "OfferDetailScreen"> { }

interface OfferDetailScreenProps {
  offer: Offer;
  onBack: () => void;
  userPhone: string;
  telecomCompanyNit: string;
  company?: TelecomCompany;
}

export default function OfferDetailScreen({
  offer,
  onBack,
  userPhone,
  telecomCompanyNit,
  company,
}: OfferDetailScreenProps) {
  // ===== ESTADOS =====
  const [loading, setLoading] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [canRedeem, setCanRedeem] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [successAnimation] = useState(new Animated.Value(0));

  // ===== EFECTO: Simular visualización automática cuando llega al 90% =====
  useEffect(() => {
    if (videoProgress >= 90 && !isWatched) {
      // Auto-complete cuando alcanza 90%
      console.log("📺 Video al 90%, listo para completar");
    }
  }, [videoProgress, isWatched]);

  // ===== MANEJAR VISUALIZACIÓN DE VIDEO =====
  const handleWatchVideo = async () => {
    if (videoProgress < 90) {
      Alert.alert("⚠️ Aviso", "Debes ver al menos el 90% del video");
      return;
    }

    try {
      setLoading(true);

      console.log("🎥 Registrando video visto:", {
        userPhone,
        offerId: offer.id,
        duration: videoProgress,
      });

      // ✅ LLAMAR API: watchVideo
      const result = await watchVideo(userPhone, offer.id, videoProgress);

      if (result.success) {
        console.log("✅ Video registrado exitosamente:", result.data);

        // ✅ Guardar el historyId retornado por el backend
        setHistoryId(result.data.id || result.data.historyId);
        setIsWatched(true);
        setCanRedeem(true);

        // Animación de éxito
        animateSuccess();

        Alert.alert(
          "✅ ¡Video Visto!",
          `Has visto "${offer.title}"\n\n+${result.data.rewardPoints} puntos ganados`,
          [{ text: "OK", onPress: () => {} }]
        );
      } else {
        console.error("❌ Error:", result.error);
        Alert.alert("❌ Error", result.error || "Error registrando video");
      }
    } catch (error: any) {
      console.error("❌ Error en handleWatchVideo:", error.message);
      Alert.alert("❌ Error", error.message || "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  // ===== MANEJAR REDENCIÓN DE PUNTOS =====
  const handleRedeem = async () => {
    if (!historyId) {
      Alert.alert("❌ Error", "No hay video para redimir");
      console.error("❌ historyId es null:", { historyId });
      return;
    }

    if (!telecomCompanyNit) {
      Alert.alert("❌ Error", "No se encontró el NIT de la empresa");
      return;
    }

    try {
      setRedeemLoading(true);

      console.log("💰 Redimiendo puntos:", {
        userPhone,
        historyId,
        telecomCompanyNit,
      });

      // ✅ LLAMAR API: redeemOfferPoints
      const result = await redeemOfferPoints(
        userPhone,
        historyId,
        telecomCompanyNit
      );

      if (result.success) {
        console.log("✅ Puntos redimidos exitosamente:", result.data);

        Alert.alert(
          "✅ ¡Redención Exitosa!",
          `Se canjearon ${result.data.pointsRedeemed} puntos\n\n¡Gracias por participar!`,
          [
            {
              text: "OK",
              onPress: () => {
                setShowRedeemModal(false);
                // Volver a la pantalla anterior
                setTimeout(() => {
                  onBack();
                }, 500);
              },
            },
          ]
        );
      } else {
        console.error("❌ Error redimiendo:", result.error);
        Alert.alert("❌ Error", result.error || "Error redimiendo puntos");
      }
    } catch (error: any) {
      console.error("❌ Error en handleRedeem:", error.message);
      Alert.alert("❌ Error", error.message || "Error redimiendo puntos");
    } finally {
      setRedeemLoading(false);
    }
  };

  // ===== ANIMACIÓN DE ÉXITO =====
  const animateSuccess = () => {
    Animated.sequence([
      Animated.timing(successAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(successAnimation, {
        toValue: 0,
        duration: 300,
        delay: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ===== FUNCIONES AUXILIARES =====
  const getOfferDescription = () => {
    return (
      offer.fullDescription || offer.fullDescription || offer.description || ""
    );
  };

  const rewardPoints = offer.reward_points || 0;

  return (
    <View style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Video</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ===== ICONO Y TÍTULO ===== */}
        <View style={styles.iconSection}>
          <Text style={styles.icon}>{offer.icon || "🎥"}</Text>
          <Text style={styles.offerTitle}>{offer.title}</Text>
        </View>

        {/* ===== DESCRIPCIÓN ===== */}
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionTitle}>Descripción</Text>
          <Text style={styles.descriptionText}>{getOfferDescription()}</Text>
        </View>

        {/* ===== DETALLES ===== */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📺 Tipo</Text>
            <Text style={styles.detailValue}>Video</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏱️ Duración</Text>
            <Text style={styles.detailValue}>{offer.duration}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>💰 Puntos</Text>
            <Text style={styles.rewardValue}>+{rewardPoints} puntos</Text>
          </View>

          {offer.companyName && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>🏢 Empresa</Text>
                <Text style={styles.detailValue}>{offer.companyName}</Text>
              </View>
            </>
          )}
        </View>

        {/* ===== SECCIÓN DE VIDEO ===== */}
        <View style={styles.videoSection}>
          <Text style={styles.videoTitle}>📹 Progreso del Video</Text>

          {/* Barra de progreso */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(videoProgress, 100)}%` },
              ]}
            />
          </View>

          {/* Texto de progreso */}
          <Text style={styles.progressText}>
            {Math.round(videoProgress)}% completado
          </Text>

          {/* Controles del video */}
          <View style={styles.videoControls}>
            <TouchableOpacity
              style={styles.progressButton}
              onPress={() => setVideoProgress(Math.min(videoProgress + 25, 100))}
              disabled={isWatched || videoProgress >= 100}
            >
              <Text style={styles.progressButtonText}>
                ▶ Avanzar 25%
              </Text>
            </TouchableOpacity>

            {/* Indicador de listo */}
            {videoProgress >= 90 && !isWatched && (
              <Text style={styles.readyText}>✅ Listo para completar</Text>
            )}

            {isWatched && (
              <Text style={styles.completedReadyText}>
                ✅ Video completado
              </Text>
            )}
          </View>
        </View>

        {/* ===== ESTADO DE VIDEO VISTO ===== */}
        {isWatched && (
          <View style={styles.completedSection}>
            <Text style={styles.completedIcon}>✅</Text>
            <Text style={styles.completedTitle}>¡Video Visto!</Text>
            <Text style={styles.completedText}>
              Has ganado {rewardPoints} puntos
            </Text>
          </View>
        )}

        {/* ===== INFORMACIÓN DE EMPRESA ===== */}
        {company && (
          <View style={styles.companyBanner}>
            <Text style={styles.companyBannerText}>📱 {company.name}</Text>
            <Text style={styles.companyBannerSubtext}>
              {company.country} • {company.currencySymbol}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ===== BOTONES DE ACCIÓN ===== */}
      <View style={styles.actionButtons}>
        {!isWatched ? (
          <TouchableOpacity
            style={[
              styles.button,
              (loading || videoProgress < 90) && styles.buttonDisabled,
            ]}
            onPress={handleWatchVideo}
            disabled={loading || videoProgress < 90}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                ✅ Completar Video ({Math.round(videoProgress)}%)
              </Text>
            )}
          </TouchableOpacity>
        ) : canRedeem ? (
          <TouchableOpacity
            style={[styles.button, styles.redeemButton]}
            onPress={() => setShowRedeemModal(true)}
            disabled={redeemLoading}
          >
            <Text style={styles.buttonText}>
              💰 Canjear {rewardPoints} Puntos
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ===== MODAL DE REDENCIÓN ===== */}
      <Modal
        visible={showRedeemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRedeemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💰 Canjear Puntos</Text>

            {/* Información del video */}
            <View style={styles.modalInfo}>
              <Text style={styles.modalLabel}>Video</Text>
              <Text style={styles.modalValue}>{offer.title}</Text>
            </View>

            {/* Puntos a canjear */}
            <View style={styles.modalInfo}>
              <Text style={styles.modalLabel}>Puntos a Canjear</Text>
              <Text style={[styles.modalValue, styles.modalPoints]}>
                +{rewardPoints} puntos
              </Text>
            </View>

            {/* Empresa */}
            {company && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalLabel}>Empresa</Text>
                <Text style={styles.modalValue}>{company.name}</Text>
              </View>
            )}

            {/* Advertencia */}
            <Text style={styles.modalWarning}>
              ⚠️ Esta acción no puede deshacerse
            </Text>

            {/* Botones del modal */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRedeemModal(false)}
                disabled={redeemLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  redeemLoading && styles.buttonDisabled,
                ]}
                onPress={handleRedeem}
                disabled={redeemLoading}
              >
                {redeemLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    ✓ Confirmar Canje
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  iconSection: {
    paddingVertical: 30,
    alignItems: "center",
  },
  icon: {
    fontSize: 80,
    marginBottom: 16,
  },
  offerTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  descriptionSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  descriptionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  descriptionText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  detailsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  detailLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  detailValue: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  rewardValue: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  videoSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
  },
  videoTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    textAlign: "center",
  },
  videoControls: {
    alignItems: "center",
    gap: 8,
  },
  progressButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  progressButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  readyText: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "600",
  },
  completedReadyText: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "600",
  },
  completedSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  completedIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  completedTitle: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  completedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  companyBanner: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "rgba(233, 30, 99, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  companyBannerText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  companyBannerSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.background,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  redeemButton: {
    backgroundColor: "#4CAF50",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInfo: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  modalLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  modalValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  modalPoints: {
    color: COLORS.primary,
  },
  modalWarning: {
    color: "#FF6B6B",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundLight,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 13,
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
});