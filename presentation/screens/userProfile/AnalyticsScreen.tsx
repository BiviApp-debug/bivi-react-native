import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📊 Mis Estadísticas</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
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
            Redenciones
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                    <View style={styles.historyInfo}>
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
  tabsContainer: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "rgba(233, 30, 99, 0.1)",
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  loadingText: {
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  largeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  largeNumber: {
    color: "white",
    fontSize: 48,
    fontWeight: "bold",
  },
  largeLabel: {
    color: "white",
    fontSize: 16,
    marginTop: 8,
  },
  largeSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statNumber: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  breakdownSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  breakdownTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  breakdownCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  breakdownIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  breakdownLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  breakdownCount: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  breakdownPoints: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  companyInfoCard: {
    marginHorizontal: 16,
    marginBottom: 30,
    backgroundColor: "rgba(233, 30, 99, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  companyInfoTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  companyInfoText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  historySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  historyCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  historyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  historyType: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  historyDate: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  historyPoints: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  redeemSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  redeemCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  redeemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  redeemInfo: {
    flex: 1,
  },
  redeemLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  redeemStatus: {
    color: "#4CAF50",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  redeemDate: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  redeemPoints: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});