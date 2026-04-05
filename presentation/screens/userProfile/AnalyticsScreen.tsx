import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import COLORS from "../../utils/colors";
import {
  getGames,
  getMissions,
  getSurveys,
  getUserAnalytics,
  getUserGameHistory,
  getUserMissionHistory,
  getUserRedemptions,
  getUserSurveyHistory,
} from "./Biviconnectapi";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigator/MainStackNavigator";
import { dataContext } from "../../context/Authcontext";



interface AnalyticsSummary {
  totalPoints: number;
  totalRedeemed: number;
  pointsRemaining: number;
  missionsCompleted: number;
  videosWatched: number;
  pointsFromMissions: number;
  pointsFromVideos: number;
}

interface ActivityItem {
  id: string;
  type: "mission" | "survey" | "game";
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
  const [activeTab, setActiveTab] = useState<"summary" | "history" | "redeem">(
    "summary"
  );

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
      const [missionHistoryRes, surveyHistoryRes, gameHistoryRes, missionsRes, surveysRes, gamesRes] = await Promise.all([
        getUserMissionHistory(resolvedPhone),
        getUserSurveyHistory(resolvedPhone),
        getUserGameHistory(resolvedPhone),
        getMissions(resolvedPhone),
        getSurveys(resolvedPhone),
        getGames(resolvedPhone),
      ]);

      const missionMap = asMapById(missionsRes?.success ? missionsRes.data : []);
      const surveyMap = asMapById(surveysRes?.success ? surveysRes.data : []);
      const gameMap = asMapById(gamesRes?.success ? gamesRes.data : []);

      const missionItems: ActivityItem[] = (missionHistoryRes?.success ? missionHistoryRes.data : []).map((h: any, index: number) => {
        const missionId = String(h?.missionId ?? h?.itemId ?? h?.id ?? `m-${index}`);
        const mission = missionMap[missionId];
        return {
          id: String(h?.id ?? `mission-${missionId}-${index}`),
          type: "mission",
          title: mission?.title || h?.missionTitle || `Mision ${missionId}`,
          points: getPointsValue(h),
          date: getCompletedDate(h),
        };
      });

      const surveyItems: ActivityItem[] = (surveyHistoryRes?.success ? surveyHistoryRes.data : []).map((h: any, index: number) => {
        const surveyId = String(h?.surveyId ?? h?.itemId ?? h?.id ?? `s-${index}`);
        const survey = surveyMap[surveyId];
        return {
          id: String(h?.id ?? `survey-${surveyId}-${index}`),
          type: "survey",
          title: survey?.title || h?.surveyTitle || `Encuesta ${surveyId}`,
          points: getPointsValue(h),
          date: getCompletedDate(h),
        };
      });

      const gameItems: ActivityItem[] = (gameHistoryRes?.success ? gameHistoryRes.data : []).map((h: any, index: number) => {
        const gameId = String(h?.gameId ?? h?.itemId ?? h?.id ?? `g-${index}`);
        const game = gameMap[gameId];
        return {
          id: String(h?.id ?? `game-${gameId}-${index}`),
          type: "game",
          title: game?.title || h?.gameTitle || `Juego ${gameId}`,
          points: getPointsValue(h),
          date: getCompletedDate(h),
        };
      });

      const merged = [...missionItems, ...surveyItems, ...gameItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setHistory(merged);
    } catch (error) {
      console.error("Error cargando historial por teléfono:", error);
    }
  };

  const handleRedeemAllPoints = () => {
    if (!summary || summary.pointsRemaining <= 0) {
      Alert.alert("Sin puntos", "No tienes puntos disponibles para canjear.");
      return;
    }

    Alert.alert(
      "Canjear todos los puntos",
      `Vas a solicitar el canje de ${summary.pointsRemaining} puntos.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            Alert.alert(
              "Solicitud enviada",
              "Tu solicitud de canje total fue registrada."
            );
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

  const asMapById = (items: any[] | undefined): Record<string, any> => {
    if (!Array.isArray(items)) return {};
    return items.reduce((acc: Record<string, any>, item: any) => {
      if (item?.id !== undefined && item?.id !== null) {
        acc[String(item.id)] = item;
      }
      return acc;
    }, {});
  };

  const historyTypeMeta: Record<ActivityItem["type"], { label: string; icon: string }> = {
    mission: { label: "📋 Misión", icon: "🎯" },
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
                  {summary.totalPoints}
                </Text>
                <Text style={styles.largeLabel}>Puntos Totales</Text>
                <Text style={styles.largeSubtitle}>
                  {telecomCompany?.currencySymbol || "RD$"}
                </Text>
              </View>
            </View>

            {/* Cards de Estadísticas */}
            <View style={styles.statsGrid}>
              {/* Ganados */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📈</Text>
                <Text style={styles.statNumber}>
                  {summary.pointsFromMissions + summary.pointsFromVideos}
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
                    summary.videosWatched}
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
                Moneda: {telecomCompany?.currencySymbol}
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
                (!summary || summary.pointsRemaining <= 0) && styles.redeemAllButtonDisabled,
              ]}
              disabled={!summary || summary.pointsRemaining <= 0}
              onPress={handleRedeemAllPoints}
            >
              <Text style={styles.redeemAllButtonText}>
                Canjear todos los puntos ({summary?.pointsRemaining || 0})
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
                      {item.pointsRedeemed} RD$
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