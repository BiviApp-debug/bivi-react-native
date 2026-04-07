import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigator/MainStackNavigator";
import COLORS from "../../utils/colors";
import { dataContext } from "../../context/Authcontext";
import ErrorModal from "../../components/ErrorModal";
import { logoutDriver, logoutUser } from "../../utils/Logout";
import { connectSocket } from "../../utils/Conections";
import { API_BASE_URL } from "../../API/API";
import { getTelecomCompanies, getUserAnalytics } from "../userProfile/Biviconnectapi";

type Props = StackScreenProps<RootStackParamList, "DriverProfileScreen">;

type AggregatedAnalytics = {
  totalUsers: number;
  totalPoints: number;
  totalRedeemed: number;
  pointsRemaining: number;
  pointsFromMissions: number;
  pointsFromVideos: number;
  pointsFromSurveys: number;
  pointsFromGames: number;
  missionsCompleted: number;
  videosWatched: number;
  surveysCompleted: number;
  gamesPlayed: number;
};

type CompanyUser = {
  id?: number | string;
  phone?: string;
  telecomCompanyNit?: string;
  role?: string;
};

const emptyAggregated: AggregatedAnalytics = {
  totalUsers: 0,
  totalPoints: 0,
  totalRedeemed: 0,
  pointsRemaining: 0,
  pointsFromMissions: 0,
  pointsFromVideos: 0,
  pointsFromSurveys: 0,
  pointsFromGames: 0,
  missionsCompleted: 0,
  videosWatched: 0,
  surveysCompleted: 0,
  gamesPlayed: 0,
};

const normalizeNit = (value?: string | null) =>
  (value || "").toString().trim().toLowerCase();

const extractCompanyNit = (user: any): string => {
  return (
    user?.telecomCompanyNit ||
    user?.nit ||
    user?.companyNit ||
    user?.cedula ||
    ""
  );
};

const getArrayFromUnknown = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.users)) return payload.users;
  return [];
};

async function fetchAllUsers(): Promise<CompanyUser[]> {
  const urls = [
    `${API_BASE_URL}/api/userRegister`,
    `${API_BASE_URL}/api/users`,
    `${API_BASE_URL}/users`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) continue;
      const data = await response.json();
      const users = getArrayFromUnknown(data);
      if (users.length > 0) {
        return users.map((u: any) => ({
          id: u?.id,
          phone: u?.phone,
          telecomCompanyNit: u?.telecomCompanyNit,
          role: u?.role,
        }));
      }
    } catch {
      // Probar el siguiente endpoint
    }
  }

  return [];
}

export default function DriverProfileScreen({ navigation }: Readonly<Props>) {
  const insets = useSafeAreaInsets();
  const { authResponse, setAuthResponse } = useContext(dataContext);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [aggregated, setAggregated] = useState<AggregatedAnalytics>(emptyAggregated);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const brandNit = useMemo(
    () => normalizeNit(extractCompanyNit(authResponse?.usuario)),
    [authResponse?.usuario]
  );

  const loadAggregatedStats = useCallback(async () => {
    const loggedPhone = authResponse?.usuario?.phone;
    if (!loggedPhone) {
        return;
      setErrorMessage("No se encontró el teléfono de la marca.");
      setShowErrorModal(true);
      return;
    }

    setLoading(true);

    try {
      connectSocket(loggedPhone);

      // Cargar metadatos de empresa para perfil
      const [companyByPhoneRes, telecomCompaniesRes, allUsers] = await Promise.all([
        fetch(`${API_BASE_URL}/companyPhone/${loggedPhone}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        getTelecomCompanies(),
        fetchAllUsers(),
      ]);

      const nitFromCompany = normalizeNit(extractCompanyNit(companyByPhoneRes));
      const currentNit = nitFromCompany || brandNit;

      if (!currentNit) {
        setErrorMessage("No se encontró el NIT de la marca para calcular estadísticas.");
        setShowErrorModal(true);
        setAggregated(emptyAggregated);
        return;
      }

      const companyCatalog = telecomCompaniesRes.success ? telecomCompaniesRes.data || [] : [];
      const telecomCompany = companyCatalog.find((c: any) => normalizeNit(c?.nit) === currentNit) || null;
      const baseCompanyInfo = companyByPhoneRes || authResponse?.usuario;
      setCompanyInfo({ ...baseCompanyInfo, telecomCompany: telecomCompany || null, nit: currentNit });

      const usersByNit = allUsers.filter((u) => normalizeNit(u?.telecomCompanyNit) === currentNit && !!u.phone);

      if (usersByNit.length === 0) {
        // Fallback seguro: al menos mostrar analytics de la cuenta actual de marca.
        const ownAnalytics = await getUserAnalytics(loggedPhone);
        const summary = ownAnalytics?.success ? ownAnalytics?.data?.summary || {} : {};
        setAggregated({
          totalUsers: 0,
          totalPoints: Number(summary.totalPoints || 0),
          totalRedeemed: Number(summary.totalRedeemed || 0),
          pointsRemaining: Number(summary.pointsRemaining || 0),
          pointsFromMissions: Number(summary.pointsFromMissions || 0),
          pointsFromVideos: Number(summary.pointsFromVideos || 0),
          pointsFromSurveys: Number(summary.pointsFromSurveys || 0),
          pointsFromGames: Number(summary.pointsFromGames || 0),
          missionsCompleted: Number(summary.missionsCompleted || 0),
          videosWatched: Number(summary.videosWatched || 0),
          surveysCompleted: Number(summary.surveysCompleted || 0),
          gamesPlayed: Number(summary.gamesPlayed || 0),
        });
        return;
      }

      const analyticsResults = await Promise.allSettled(
        usersByNit.map((u) => getUserAnalytics(String(u.phone)))
      );

      const totals = analyticsResults.reduce((acc, result) => {
        if (result.status !== "fulfilled") return acc;
        const api = result.value;
        if (!api?.success) return acc;
        const summary = api?.data?.summary || {};

        acc.totalPoints += Number(summary.totalPoints || 0);
        acc.totalRedeemed += Number(summary.totalRedeemed || 0);
        acc.pointsRemaining += Number(summary.pointsRemaining || 0);
        acc.pointsFromMissions += Number(summary.pointsFromMissions || 0);
        acc.pointsFromVideos += Number(summary.pointsFromVideos || 0);
        acc.pointsFromSurveys += Number(summary.pointsFromSurveys || 0);
        acc.pointsFromGames += Number(summary.pointsFromGames || 0);
        acc.missionsCompleted += Number(summary.missionsCompleted || 0);
        acc.videosWatched += Number(summary.videosWatched || 0);
        acc.surveysCompleted += Number(summary.surveysCompleted || 0);
        acc.gamesPlayed += Number(summary.gamesPlayed || 0);
        return acc;
      }, { ...emptyAggregated, totalUsers: usersByNit.length });

      setAggregated(totals);
    } catch (error: any) {
      setErrorMessage(error?.message || "Error cargando estadísticas de marca");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }, [authResponse?.usuario, brandNit]);

  useFocusEffect(
    useCallback(() => {
      loadAggregatedStats();
    }, [loadAggregatedStats])
  );

  useEffect(() => {
    loadAggregatedStats();
  }, [loadAggregatedStats]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("savedPhone");
      setAuthResponse({
        message: "",
        usuario: {
          id: 0,
          name: "",
          lastName: "",
          email: "",
          phone: "",
          password: "",
          role: "",
          photo: "",
        },
      });

      if (authResponse?.usuario?.role === "driver_role" || authResponse?.usuario?.role === "user_company") {
        await logoutDriver(authResponse?.usuario?.phone);
      } else {
        await logoutUser(authResponse?.usuario?.phone);
      }

      navigation.replace("DriverLoginScreen");
    } catch {
      Alert.alert("Error", "No se pudo cerrar sesión.");
    }
  };

  const goToProfilePage = () => {
    navigation.navigate("BrandProfileDetailScreen", {
      profile: companyInfo || authResponse?.usuario,
      company: companyInfo?.telecomCompany || null,
    });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando estadísticas de la marca...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={handleLogout} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Panel de Marca</Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={styles.brandName}>{authResponse?.usuario?.name || "Marca"}</Text>
          <Text style={styles.brandNit}>NIT: {companyInfo?.nit || brandNit || "N/A"}</Text>

          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>Puntos redimidos (usuarios de tu NIT)</Text>
            <Text style={styles.pointsValue}>{aggregated.totalRedeemed.toLocaleString()} MB</Text>
            <Text style={styles.pointsSub}>Usuarios vinculados: {aggregated.totalUsers}</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{aggregated.missionsCompleted}</Text>
              <Text style={styles.summaryLabel}>Misiones hechas</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{aggregated.videosWatched}</Text>
              <Text style={styles.summaryLabel}>Videos vistos</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{aggregated.surveysCompleted}</Text>
              <Text style={styles.summaryLabel}>Encuestas</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{aggregated.gamesPlayed}</Text>
              <Text style={styles.summaryLabel}>Juegos</Text>
            </View>
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Resumen agregado por NIT</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Puntos ganados</Text>
            <Text style={styles.breakdownValue}>{aggregated.totalPoints.toLocaleString()} MB</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Puntos redimidos</Text>
            <Text style={styles.breakdownValue}>{aggregated.totalRedeemed.toLocaleString()} MB</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Puntos disponibles</Text>
            <Text style={styles.breakdownValue}>{aggregated.pointsRemaining.toLocaleString()} MB</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Ganados por misiones</Text>
            <Text style={styles.breakdownValue}>{aggregated.pointsFromMissions.toLocaleString()} MB</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Ganados por videos</Text>
            <Text style={styles.breakdownValue}>{aggregated.pointsFromVideos.toLocaleString()} MB</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Ganados por encuestas</Text>
            <Text style={styles.breakdownValue}>{aggregated.pointsFromSurveys.toLocaleString()} MB</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Ganados por juegos</Text>
            <Text style={styles.breakdownValue}>{aggregated.pointsFromGames.toLocaleString()} MB</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}> 
        <TouchableOpacity style={styles.actionButton} onPress={goToProfilePage}>
          <Text style={styles.actionButtonText}>Perfil de marca</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
          <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F1FF",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    color: COLORS.primary,
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
  },
  headerTitle: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },
  brandName: {
    color: "white",
    fontWeight: "700",
    fontSize: 22,
  },
  brandNit: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
  },
  pointsCard: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  pointsLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
  },
  pointsValue: {
    color: "white",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4,
  },
  pointsSub: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 6,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 12,
    alignItems: "center",
  },
  summaryNumber: {
    color: "white",
    fontWeight: "800",
    fontSize: 18,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    fontSize: 12,
  },
  breakdownCard: {
    backgroundColor: "white",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  breakdownLabel: {
    color: "#666",
    fontSize: 13,
  },
  breakdownValue: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  bottomActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "white",
    borderTopColor: "#eee",
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "#f4f4f4",
    alignItems: "center",
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#444",
  },
  logoutButton: {
    backgroundColor: "#ffe6ea",
  },
  logoutButtonText: {
    color: COLORS.error,
  },
});
