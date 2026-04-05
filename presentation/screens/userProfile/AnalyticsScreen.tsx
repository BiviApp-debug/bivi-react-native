import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  TextInput,
} from "react-native";
import COLORS from "../../utils/colors";
import {
  getUserAnalytics,
  getUserGameHistory,
  getUserMissionHistory,
  getUserOfferHistory,
  getUserRedemptions,
  getUserSurveyHistory,
  getUnifiedUserHistory,
  redeemGamePoints,
  redeemMissionPoints,
  redeemOfferPoints,
  redeemSurveyPoints,
} from "./Biviconnectapi";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigator/MainStackNavigator";
import { dataContext } from "../../context/Authcontext";
import { connectSocket } from "../../utils/Conections";



interface AnalyticsSummary {
  totalPoints: number;
  totalRedeemed: number;
  pointsRemaining: number;
  missionsCompleted: number;
  videosWatched: number;
  surveysCompleted: number;
  gamesPlayed: number;
  pointsFromMissions: number;
  pointsFromVideos: number;
  pointsFromSurveys: number;
  pointsFromGames: number;
}

interface ActivityItem {
  id: string;
  type: "mission" | "offer" | "survey" | "game";
  title: string;
  points: number;
  date: string;
}

interface RedemptionItem {
  id: string;
  pointsRedeemed: number;
  redemptionType: string;
  status: string;
  approvedAt?: string;
}

interface PendingRedeemItem {
  id: string;
  type: "mission" | "offer" | "survey" | "game";
  points: number;
  date: string;
}

type Props = StackScreenProps<RootStackParamList, 'AnalyticsScreen'>;

const AnalyticsScreen = ({ route, navigation }: Props) => {
  const { userPhone, telecomCompanyNit, telecomCompany } = route.params;
  const { authResponse } = useContext(dataContext);
  const authPhone = authResponse?.usuario?.phone || "";
  const resolvedPhone = authPhone || userPhone;
  const onBack = () => navigation.goBack();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRedeemingAll, setIsRedeemingAll] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "history" | "redeem">(
    "summary"
  );
  const resolvedTelecomNit =
    telecomCompanyNit || authResponse?.usuario?.telecomCompanyNit || "";

  useEffect(()=>{
     connectSocket(userPhone)
  },[])

  useEffect(() => {
    loadAnalytics();
  }, [resolvedPhone]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistoryByPhone();
    }
  }, [activeTab, resolvedPhone]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const [analyticsResult, redemptionsResult] = await Promise.all([
        getUserAnalytics(resolvedPhone),
        getUserRedemptions(resolvedPhone),
      ]);

      if (analyticsResult.success && analyticsResult.data) {
        setSummary(analyticsResult.data.summary);
        setHistory(analyticsResult.data.history || []);
      }

      if (redemptionsResult.success) {
        setRedemptions(redemptionsResult.data || []);
      }

      // Mantener el desglose alineado con el mismo historial unificado
      await loadHistoryByPhone();
    } catch (error) {
      console.error("Error cargando analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryByPhone = async () => {
    try {
      const unifiedHistoryRes = await getUnifiedUserHistory(resolvedPhone);
      setHistory(
        (unifiedHistoryRes?.success ? unifiedHistoryRes.data : []).map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          points: item.points,
          date: item.completedAt,
        }))
      );
    } catch (error) {
      console.error("Error cargando historial por teléfono:", error);
    }
  };

  const buildPendingRedeemItems = async (): Promise<PendingRedeemItem[]> => {
    const [missionHistoryRes, offerHistoryRes, surveyHistoryRes, gameHistoryRes] =
      await Promise.all([
        getUserMissionHistory(resolvedPhone),
        getUserOfferHistory(resolvedPhone),
        getUserSurveyHistory(resolvedPhone),
        getUserGameHistory(resolvedPhone),
      ]);

    const pendingMissions: PendingRedeemItem[] = (missionHistoryRes?.success ? missionHistoryRes.data : [])
      .filter((item: any) => !item?.redeemed && item?.id)
      .map((item: any) => ({
        id: String(item.id),
        type: "mission",
        points: getPointsValue(item),
        date: getCompletedDate(item),
      }));

    const pendingOffers: PendingRedeemItem[] = (offerHistoryRes?.success ? offerHistoryRes.data : [])
      .filter((item: any) => !item?.redeemed && item?.id)
      .map((item: any) => ({
        id: String(item.id),
        type: "offer",
        points: getPointsValue(item),
        date: getCompletedDate(item),
      }));

    const pendingSurveys: PendingRedeemItem[] = (surveyHistoryRes?.success ? surveyHistoryRes.data : [])
      .filter((item: any) => !item?.redeemed && item?.id)
      .map((item: any) => ({
        id: String(item.id),
        type: "survey",
        points: getPointsValue(item),
        date: getCompletedDate(item),
      }));

    const pendingGames: PendingRedeemItem[] = (gameHistoryRes?.success ? gameHistoryRes.data : [])
      .filter((item: any) => !item?.redeemed && item?.id)
      .map((item: any) => ({
        id: String(item.id),
        type: "game",
        points: getPointsValue(item),
        date: getCompletedDate(item),
      }));

    return [...pendingMissions, ...pendingOffers, ...pendingSurveys, ...pendingGames].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const openRedeemModal = () => {
    if (!summary || summary.pointsRemaining <= 0) {
      Alert.alert("Sin puntos", "No tienes puntos disponibles para canjear.");
      return;
    }

    if (!resolvedPhone || !resolvedTelecomNit || isRedeemingAll) {
      return;
    }

    setRedeemAmount(String(summary.pointsRemaining));
    setShowRedeemModal(true);
  };

  const handleRedeemAmountChange = (value: string) => {
    const digitsOnly = value.replaceAll(/\D/g, "");

    if (!digitsOnly) {
      setRedeemAmount("");
      return;
    }

    const parsedValue = Number(digitsOnly);
    const maxAvailable = Math.max(0, summary?.pointsRemaining || 0);

    if (!Number.isFinite(parsedValue)) {
      setRedeemAmount("");
      return;
    }

    setRedeemAmount(String(Math.min(parsedValue, maxAvailable)));
  };

  const handleRedeemAllPoints = async () => {
    const parsedAmount = Number(redeemAmount);

    if (!summary || summary.pointsRemaining <= 0) {
      Alert.alert("Sin puntos", "No tienes puntos disponibles para canjear.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Monto inválido", "Ingresa una cantidad válida de MB para redimir.");
      return;
    }

    if (parsedAmount > summary.pointsRemaining) {
      Alert.alert(
        "Monto excedido",
        `Solo tienes ${summary.pointsRemaining} MB disponibles para redimir.`
      );
      return;
    }

    if (!resolvedPhone || !resolvedTelecomNit) {
      Alert.alert(
        "Datos incompletos",
        "No se pudo identificar el teléfono o la empresa telefónica para registrar el canje."
      );
      return;
    }

    if (isRedeemingAll) {
      return;
    }

    Alert.alert(
      "Confirmar canje",
      `Vas a redimir ${parsedAmount} MB. El sistema usa actividades completas, por lo que el total procesado puede superar levemente ese valor.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setShowRedeemModal(false);
              setIsRedeemingAll(true);

              const pendingItems = await buildPendingRedeemItems();
              const itemsToRedeem: PendingRedeemItem[] = [];
              let accumulatedPoints = 0;

              for (const item of pendingItems) {
                if (accumulatedPoints >= parsedAmount) {
                  break;
                }

                itemsToRedeem.push(item);
                accumulatedPoints += item.points;
              }

              if (itemsToRedeem.length === 0) {
                Alert.alert("Sin historial", "No encontramos actividades pendientes por redimir.");
                return;
              }

              const redeemResults = await Promise.all(
                itemsToRedeem.map((item) => {
                  if (item.type === "mission") {
                    return redeemMissionPoints(resolvedPhone, item.id, resolvedTelecomNit);
                  }

                  if (item.type === "offer") {
                    return redeemOfferPoints(resolvedPhone, item.id, resolvedTelecomNit);
                  }

                  if (item.type === "survey") {
                    return redeemSurveyPoints(resolvedPhone, item.id, resolvedTelecomNit);
                  }

                  return redeemGamePoints(resolvedPhone, item.id, resolvedTelecomNit);
                })
              );

              const successfulRedemptions = redeemResults.filter((result) => result?.success);
              const failedRedemptions = redeemResults.filter((result) => !result?.success);
              const surveyFailures = itemsToRedeem.filter((item, index) => {
                return item.type === "survey" && !redeemResults[index]?.success;
              });

              await loadAnalytics();

              let message = `Se registraron ${successfulRedemptions.length} canjes.`;
              message += `\n\nMonto solicitado: ${parsedAmount} MB.`;
              message += `\nMonto procesado con actividades completas: ${itemsToRedeem.reduce((sum, item) => sum + item.points, 0)} MB.`;

              if (surveyFailures.length > 0) {
                message += `\n\n${surveyFailures.length} encuestas no se pudieron redimir. Verifica que el backend tenga /api/user-surveys/redeem.`;
              }

              if (failedRedemptions.length > 0) {
                message += `\n\n${failedRedemptions.length} canjes fallaron. Revisa el backend o los historiales ya redimidos.`;
              }

              if (successfulRedemptions.length === 0 && failedRedemptions.length === 0) {
                message = "No encontramos historiales pendientes por redimir.";
              }

              Alert.alert("Canje procesado", message);
            } catch (error) {
              console.error("Error canjeando todos los puntos:", error);
              Alert.alert(
                "Error",
                "No se pudo registrar el canje total de puntos."
              );
            } finally {
              setIsRedeemingAll(false);
            }
          },
        },
      ]
    );
  };

  const getRedemptionTypeLabel = (redemptionType: string) => {
    if (redemptionType === "mission") return "📋 Misión";
    if (redemptionType === "video") return "🎬 Video";
    if (redemptionType === "survey") return "📊 Encuesta";
    return "🎮 Juego";
  };

  const getPointsValue = (item: any): number => {
    const value =
      item?.pointsEarned ??
      item?.rewardPoints ??
      item?.pointsRedeemed ??
      item?.points ??
      item?.reward_points ??
      0;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getCompletedDate = (item: any): string => {
    return (
      item?.completedAt ||
      item?.playedAt ||
      item?.watchedAt ||
      item?.createdAt ||
      item?.created_at ||
      new Date().toISOString()
    );
  };

  const historyTypeMeta: Record<ActivityItem["type"], { label: string; icon: string }> = {
    mission: { label: "📋 Misión", icon: "🎯" },
    offer: { label: "🎥 Video", icon: "🎥" },
    survey: { label: "📝 Encuesta", icon: "📝" },
    game: { label: "🎮 Juego", icon: "🎮" },
  };

  const historyTotals = history.reduce(
    (acc, item) => {
      acc.totalActivities += 1;
      acc.totalPoints += item.points;

      if (item.type === "mission") {
        acc.missionCount += 1;
        acc.missionPoints += item.points;
      }

      if (item.type === "offer") {
        acc.offerCount += 1;
        acc.offerPoints += item.points;
      }

      if (item.type === "survey") {
        acc.surveyCount += 1;
        acc.surveyPoints += item.points;
      }

      if (item.type === "game") {
        acc.gameCount += 1;
        acc.gamePoints += item.points;
      }

      return acc;
    },
    {
      totalActivities: 0,
      totalPoints: 0,
      missionCount: 0,
      missionPoints: 0,
      offerCount: 0,
      offerPoints: 0,
      surveyCount: 0,
      surveyPoints: 0,
      gameCount: 0,
      gamePoints: 0,
    }
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingIcon}>📊</Text>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTitle}>Cargando estadisticas</Text>
          <Text style={styles.loadingSubtitle}>
            Estamos preparando tu resumen, historial y redenciones.
          </Text>

          <View style={styles.loadingDotsRow}>
            <View style={[styles.loadingDot, styles.loadingDotActive]} />
            <View style={styles.loadingDot} />
            <View style={styles.loadingDot} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 Mis Estadísticas</Text>
          <View style={{ width: 50 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TABS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "summary" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("summary")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "summary" && styles.activeTabText,
              ]}
            >
              Resumen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "history" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("history")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "history" && styles.activeTabText,
              ]}
            >
              Historial
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "redeem" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("redeem")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "redeem" && styles.activeTabText,
              ]}
            >
              Canjear
            </Text>
          </TouchableOpacity>
        </View>
        {/* RESUMEN */}
        {activeTab === "summary" && summary && (
          <>
            {/* Puntos Totales */}
            <View style={styles.summarySection}>
              <View style={styles.largeCard}>
                <Text style={styles.largeNumber}>
                  {summary.pointsRemaining}
                </Text>
                <Text style={styles.largeLabel}>MB Disponibles</Text>
                <Text style={styles.largeSubtitle}>
                  Ganados: {summary.totalPoints} MB • Canjeados: {summary.totalRedeemed} MB
                </Text>
              </View>
            </View>

            {/* Cards de Estadísticas */}
            <View style={styles.statsGrid}>
              {/* Ganados */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📈</Text>
                <Text style={styles.statNumber}>
                  {summary.pointsFromMissions + summary.pointsFromVideos + summary.pointsFromSurveys + summary.pointsFromGames}
                </Text>
                <Text style={styles.statLabel}>Ganados</Text>
              </View>

              {/* Redimidos */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>💰</Text>
                <Text style={styles.statNumber}>
                  {summary.totalRedeemed}
                </Text>
                <Text style={styles.statLabel}>Canjeados</Text>
              </View>

              {/* Disponibles */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🎁</Text>
                <Text style={styles.statNumber}>
                  {summary.pointsRemaining}
                </Text>
                <Text style={styles.statLabel}>Disponibles</Text>
              </View>

              {/* Actividades */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>✅</Text>
                <Text style={styles.statNumber}>
                  {summary.missionsCompleted +
                    summary.videosWatched +
                    summary.surveysCompleted +
                    summary.gamesPlayed}
                </Text>
                <Text style={styles.statLabel}>Actividades</Text>
              </View>
            </View>

            {/* Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>Desglose de Puntos</Text>

              <View style={styles.breakdownCard}>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownIcon}>📋</Text>
                    <View>
                      <Text style={styles.breakdownLabel}>
                        Misiones Completadas
                      </Text>
                      <Text style={styles.breakdownCount}>
                        {historyTotals.missionCount}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownPoints}>
                    +{historyTotals.missionPoints}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownIcon}>🎥</Text>
                    <View>
                      <Text style={styles.breakdownLabel}>
                        Videos Completados
                      </Text>
                      <Text style={styles.breakdownCount}>
                        {historyTotals.offerCount}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownPoints}>
                    +{historyTotals.offerPoints}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownIcon}>📝</Text>
                    <View>
                      <Text style={styles.breakdownLabel}>
                        Encuestas Completadas
                      </Text>
                      <Text style={styles.breakdownCount}>
                        {historyTotals.surveyCount}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownPoints}>
                    +{historyTotals.surveyPoints}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownIcon}>🎮</Text>
                    <View>
                      <Text style={styles.breakdownLabel}>
                        Juegos Completados
                      </Text>
                      <Text style={styles.breakdownCount}>
                        {historyTotals.gameCount}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownPoints}>
                    +{historyTotals.gamePoints}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownIcon}>⭐</Text>
                    <View>
                      <Text style={styles.breakdownLabel}>
                        Total del Historial
                      </Text>
                      <Text style={styles.breakdownCount}>
                        {historyTotals.totalActivities} actividades
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownPoints}>
                    +{historyTotals.totalPoints}
                  </Text>
                </View>
              </View>
            </View>

            {/* Empresa Info */}
            <View style={styles.companyInfoCard}>
              <Text style={styles.companyInfoTitle}>
                📱 {telecomCompany?.name}
              </Text>
              <Text style={styles.companyInfoText}>
                Unidad: MB
              </Text>
              <Text style={styles.companyInfoText}>
                NIT: {telecomCompanyNit}
              </Text>
            </View>
          </>
        )}

        {/* HISTORIAL */}
        {activeTab === "history" && (
          <View style={styles.historySection}>
            {history && history.length > 0 ? (
              history.map((item) => (
                <View
                  key={item.id}
                  style={styles.historyCard}
                >
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyIcon}>{historyTypeMeta[item.type].icon}</Text>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyTitle}>
                        {item.title}
                      </Text>
                      <Text style={styles.historyType}>
                        {historyTypeMeta[item.type].label}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.date).toLocaleDateString(
                          "es-CO"
                        )}
                      </Text>
                    </View>
                    <Text style={styles.historyPoints}>
                      +{item.points}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>
                  Sin actividades registradas
                </Text>
              </View>
            )}
          </View>
        )}

        {/* REDENCIONES */}
        {activeTab === "redeem" && (
          <View style={styles.redeemSection}>
            <TouchableOpacity
              style={[
                styles.redeemAllButton,
                (!summary || summary.pointsRemaining <= 0 || isRedeemingAll) && styles.redeemAllButtonDisabled,
              ]}
              disabled={!summary || summary.pointsRemaining <= 0 || isRedeemingAll}
              onPress={openRedeemModal}
            >
              <Text style={styles.redeemAllButtonText}>
                {isRedeemingAll
                  ? "Canjeando puntos..."
                  : `Canjear puntos (${summary?.pointsRemaining || 0})`}
              </Text>
            </TouchableOpacity>

            {redemptions && redemptions.length > 0 ? (
              redemptions.map((item) => (
                <View key={item.id} style={styles.redeemCard}>
                  <View style={styles.redeemHeader}>
                    <View style={styles.redeemInfo}>
                      <Text style={styles.redeemLabel}>
                        {getRedemptionTypeLabel(item.redemptionType)}
                      </Text>
                      <Text style={styles.redeemStatus}>
                        {item.status === "completed"
                          ? "✓ Completado"
                          : "⏳ Pendiente"}
                      </Text>
                      {item.approvedAt && (
                        <Text style={styles.redeemDate}>
                          {new Date(
                            item.approvedAt
                          ).toLocaleDateString("es-CO")}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.redeemPoints}>
                      {item.pointsRedeemed} MB
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎁</Text>
                <Text style={styles.emptyText}>
                  Sin redenciones registradas
                </Text>
              </View>
            )}
          </View>
        )}

        <Modal
          visible={showRedeemModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRedeemModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.redeemModalCard}>
              <Text style={styles.redeemModalTitle}>Canjear puntos</Text>
              <Text style={styles.redeemModalSubtitle}>
                Ingresa la cantidad de MB que quieres redimir. Disponible: {summary?.pointsRemaining || 0} MB.
              </Text>
              <TextInput
                style={styles.redeemInput}
                value={redeemAmount}
                onChangeText={handleRedeemAmountChange}
                placeholder="Ej: 120"
                placeholderTextColor="#9a9a9a"
                keyboardType="numeric"
                editable={!isRedeemingAll}
              />
              <Text style={styles.redeemHintText}>
                El sistema redime actividades completas. Por eso el total final puede quedar un poco por encima del monto solicitado.
              </Text>
              <View style={styles.redeemModalActions}>
                <TouchableOpacity
                  style={styles.redeemCancelButton}
                  onPress={() => setShowRedeemModal(false)}
                  disabled={isRedeemingAll}
                >
                  <Text style={styles.redeemCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.redeemConfirmButton}
                  onPress={handleRedeemAllPoints}
                  disabled={isRedeemingAll}
                >
                  <Text style={styles.redeemConfirmButtonText}>
                    {isRedeemingAll ? "Procesando..." : "Confirmar canje"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default AnalyticsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1FF',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tabsContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 5,
    marginBottom: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  summarySection: {
    marginBottom: 20,
  },
  largeCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  largeNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  largeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  largeSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  breakdownSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  breakdownCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#333',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  breakdownIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownCount: {
    fontSize: 14,
    color: '#666',
  },
  breakdownPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 12,
  },
  companyInfoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  companyInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  companyInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  historySection: {
    marginBottom: 20,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  redeemSection: {
    marginBottom: 20,
  },
  redeemAllButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  redeemAllButtonDisabled: {
    backgroundColor: '#bdbdbd',
  },
  redeemAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  redeemCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  redeemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  redeemItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  redeemInfo: {
    flex: 1,
  },
  redeemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  redeemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  redeemStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  redeemDate: {
    fontSize: 12,
    color: '#888',
  },
  redeemPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  redeemModalCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
  },
  redeemModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2f2f2f',
    marginBottom: 8,
  },
  redeemModalSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  redeemInput: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#2f2f2f',
    marginBottom: 12,
  },
  redeemHintText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7a7a7a',
    marginBottom: 18,
  },
  redeemModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  redeemCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginRight: 8,
  },
  redeemCancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '700',
  },
  redeemConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginLeft: 8,
  },
  redeemConfirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F1FF',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F1FF',
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  loadingIcon: {
    fontSize: 38,
    marginBottom: 10,
  },
  loadingTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: '700',
    color: '#2f2f2f',
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 6,
  },
  loadingDotsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d9d9d9',
    marginHorizontal: 4,
  },
  loadingDotActive: {
    backgroundColor: COLORS.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
  },
});