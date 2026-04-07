import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigator/MainStackNavigator";
import COLORS from "../../utils/colors";
import { dataContext } from "../../context/Authcontext";
import ResetPasswordModalDriver from "../../utils/ResetPasswordModalDriver";
import { saveMessageToFirestore } from "../auth/login_driver/loginFunctions";

type Props = StackScreenProps<RootStackParamList, "BrandProfileDetailScreen">;

const extractNit = (obj: any): string =>
  obj?.nit || obj?.telecomCompanyNit || obj?.cedula || obj?.companyNit || "N/A";

export default function BrandProfileDetailScreen({ route, navigation }: Readonly<Props>) {
  const { profile, company } = route.params;
  const { setAuthResponse } = useContext(dataContext);

  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetLoginLoading, setIsResetLoginLoading] = useState(false);

  const brandName = useMemo(() => {
    const name = profile?.name || "";
    const lastName = profile?.lastName || "";
    return `${name} ${lastName}`.trim() || "Marca";
  }, [profile]);

  const handleResetSuccess = async (resetPhone: string, resetPassword: string) => {
    setShowResetModal(false);
    setIsResetLoginLoading(true);
    try {
      const loginResponse = await saveMessageToFirestore(resetPhone, resetPassword);
      if (loginResponse && !loginResponse.__loginError) {
        setAuthResponse(loginResponse);
        Alert.alert("Exito", "Contrasena actualizada y sesion validada.");
      } else {
        Alert.alert(
          "Contrasena actualizada",
          "La contrasena se cambio correctamente. Si no ingresa, inicia sesion manualmente."
        );
      }
    } catch {
      Alert.alert(
        "Contrasena actualizada",
        "La contrasena fue actualizada, pero no se pudo validar el inicio de sesion automaticamente."
      );
    } finally {
      setIsResetLoginLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil de Marca</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(brandName[0] || "M").toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{brandName}</Text>
          <Text style={styles.profileSubtext}>Cuenta empresarial</Text>

          <View style={styles.profileStats}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{extractNit(profile)}</Text>
              <Text style={styles.profileStatLabel}>NIT</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{profile?.role || "user_company"}</Text>
              <Text style={styles.profileStatLabel}>rol</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{profile?.verified ? "Si" : "No"}</Text>
              <Text style={styles.profileStatLabel}>verificado</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informacion de Cuenta</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email || "No especificado"}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Telefono</Text>
            <Text style={styles.infoValue}>{profile?.phone || "No especificado"}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>NIT de marca</Text>
            <Text style={styles.infoValue}>{extractNit(profile)}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Operador Asociado</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Empresa</Text>
            <Text style={styles.infoValue}>{company?.name || "Sin empresa"}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Pais</Text>
            <Text style={styles.infoValue}>{company?.country || "N/A"}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>NIT</Text>
            <Text style={styles.infoValue}>{company?.nit || extractNit(profile)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Moneda</Text>
            <Text style={styles.infoValue}>{company?.currency || "N/A"} {company?.currencySymbol || ""}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Acciones</Text>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowResetModal(true)}>
            <Text style={styles.actionButtonText}>
              {isResetLoginLoading ? "Validando..." : "Cambiar contrasena"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("DriverProfileScreen")}
          >
            <Text style={styles.actionButtonText}>Volver al panel de marca</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ResetPasswordModalDriver
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSuccess={handleResetSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F1FF",
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
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 30,
    fontWeight: "700",
  },
  profileName: {
    color: "#333",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  profileSubtext: {
    color: "#666",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  profileStats: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  profileStatItem: {
    flex: 1,
    alignItems: "center",
  },
  profileStatValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  profileStatLabel: {
    color: "#666",
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    color: "#333",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  infoItem: {
    paddingVertical: 10,
    borderBottomColor: "#f0f0f0",
    borderBottomWidth: 1,
  },
  infoLabel: {
    color: "#666",
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    marginBottom: 8,
  },
  actionButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "700",
  },
});
