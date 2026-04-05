import React, { useEffect, useState } from "react";
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
  getUserAnalytics,
  getUserRedemptions,
  redeemMissionPoints,
  redeemOfferPoints,
} from "./Biviconnectapi";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigator/MainStackNavigator";



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
  type: "mission" | "video";
  title: string;
  icon: string;
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
  }, [userPhone]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const [analyticsResult, redemptionsResult] = await Promise.all([
        getUserAnalytics(userPhone),
        getUserRedemptions(userPhone),
      ]);

      if (analyticsResult.success && analyticsResult.data) {
        setSummary(analyticsResult.data.summary);
        setHistory(analyticsResult.data.history || []);
      }

      if (redemptionsResult.success) {
        setRedemptions(redemptionsResult.data || []);
      }
    } catch (error) {
      console.error("Error cargando analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
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
                        {summary.missionsCompleted}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownPoints}>
                    +{summary.pointsFromMissions}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownIcon}>🎬</Text>
                    <View>
                      <Text style={styles.breakdownLabel}>
                        Videos Vistos
                      </Text>
                      <Text style={styles.breakdownCount}>
                        {summary.videosWatched}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownPoints}>
                    +{summary.pointsFromVideos}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownIcon}>💸</Text>
                    <View>
                      <Text style={styles.breakdownLabel}>
                        Total Canjeado
                      </Text>
                      <Text style={styles.breakdownCount}>
                        Redenciones
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownPoints}>
                    -{summary.totalRedeemed}
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
              history.map((item, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyIcon}>{item.icon}</Text>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyTitle}>
                        {item.title}
                      </Text>
                      <Text style={styles.historyType}>
                        {item.type === "mission"
                          ? "📋 Misión"
                          : "🎬 Video"}
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
            {redemptions && redemptions.length > 0 ? (
              redemptions.map((item, index) => (
                <View key={index} style={styles.redeemCard}>
                  <View style={styles.redeemHeader}>
                    <View style={styles.redeemInfo}>
                      <Text style={styles.redeemLabel}>
                        {item.redemptionType === "mission"
                          ? "📋 Misión"
                          : item.redemptionType === "video"
                          ? "🎬 Video"
                          : item.redemptionType === "survey"
                          ? "📊 Encuesta"
                          : "🎮 Juego"}
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
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
  },
});