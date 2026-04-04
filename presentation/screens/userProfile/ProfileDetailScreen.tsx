import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import COLORS from "../../utils/colors";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigator/MainStackNavigator";
import { TelecomCompany, UserData } from "./Biviconnectapi";

interface Props extends StackScreenProps<RootStackParamList, "ProfileDetailScreen"> { }

export default function ProfileDetailScreen({ route, navigation }: Props) {
  const { profile, profilePhotoUrl, company } = route.params;

  const handleBack = () => {
    navigation.goBack();
  };
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const getInitials = () => {
    const firstName = profile?.name ? profile.name[0] : "";
    const lastName = profile?.lastName ? profile.lastName[0] : "";
    return (firstName + lastName).toUpperCase();
  };

  const userEmail = profile?.email || "No especificado";
  const userPhone = profile?.phone || "No especificado";
  const userRole = profile?.role === "user_client" ? "Usuario" : "Conductor";
  const companyName = company?.name || "Sin empresa";
  const companyNit = company?.nit || "N/A";
  const companyCountry = company?.country || "N/A";
  const companyCurrency = company?.currency || "N/A";
  const companySymbol = company?.currencySymbol || "";

  const getLocation = () => {
    if (company?.country) {
      return company.country;
    }
    return profile?.location || "Ubicación no especificada";
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backButton}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Mi Perfil</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.screenContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileDetailCard}>
          <View style={styles.avatarContainer}>
            {profilePhotoUrl ? (
              <Text style={styles.avatarText}>📷</Text>
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.profileName}>
            {profile?.name} {profile?.lastName}
          </Text>
          <Text style={styles.profileSubtext}>{getLocation()}</Text>

          <View style={styles.profileStats}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>
                {profile?.age || "—"}
              </Text>
              <Text style={styles.profileStatLabel}>años</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>
                {profile?.isMinor ? "Menor" : "Mayor"}
              </Text>
              <Text style={styles.profileStatLabel}>edad</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>
                {profile?.verified ? "✓" : "✗"}
              </Text>
              <Text style={styles.profileStatLabel}>verificado</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              Alert.alert("Info", "La edición de perfil está en desarrollo")
            }
          >
            <Text style={styles.editButtonText}>✏️ Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {company && (
          <View style={styles.companySection}>
            <Text style={styles.sectionTitle}>📱 Tu Operador</Text>

            <View style={styles.companyCard}>
              <View style={styles.companyIconContainer}>
                <Text style={styles.companyIcon}>📶</Text>
              </View>

              <View style={styles.companyContent}>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.companyCountry}>{companyCountry}</Text>
              </View>

              {company.logo && (
                <Text style={styles.companyLogo}>{company.logo}</Text>
              )}
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>NIT</Text>
                <Text style={styles.detailValue}>{companyNit}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Moneda</Text>
                <Text style={styles.detailValue}>
                  {companyCurrency} {companySymbol}
                </Text>
              </View>

              {company.supportPhone && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Soporte</Text>
                  <Text style={styles.detailValue}>{company.supportPhone}</Text>
                </View>
              )}

              {company.website && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Web</Text>
                  <Text style={styles.detailValue}>{company.website}</Text>
                </View>
              )}
            </View>

            {company.description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionTitle}>Acerca de</Text>
                <Text style={styles.descriptionText}>{company.description}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>📋 Información de Cuenta</Text>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>✉️</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userEmail}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>📞</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{userPhone}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>👤</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tipo de Cuenta</Text>
              <Text style={styles.infoValue}>{userRole}</Text>
            </View>
          </View>

          {profile?.location && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📍</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ubicación</Text>
                <Text style={styles.infoValue}>{profile.location}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert("Info", "Cambiar contraseña - En desarrollo")
            }
          >
            <Text style={styles.actionButtonIcon}>🔐</Text>
            <Text style={styles.actionButtonText}>Cambiar contraseña</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert("Info", "Ver actividad - En desarrollo")
            }
          >
            <Text style={styles.actionButtonIcon}>📊</Text>
            <Text style={styles.actionButtonText}>Ver mi actividad</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert("Info", "Configuración - En desarrollo")
            }
          >
            <Text style={styles.actionButtonIcon}>⚙️</Text>
            <Text style={styles.actionButtonText}>Configuración</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  screenTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileDetailCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  profileSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  profileStatItem: {
    alignItems: "center",
  },
  profileStatValue: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  profileStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  companySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  companyCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  companyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(233, 30, 99, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  companyIcon: {
    fontSize: 24,
  },
  companyContent: {
    flex: 1,
  },
  companyName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  companyCountry: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  companyLogo: {
    fontSize: 24,
  },
  detailsGrid: {
    marginBottom: 12,
    gap: 8,
  },
  detailItem: {
    backgroundColor: "rgba(233, 30, 99, 0.05)",
    borderRadius: 12,
    padding: 12,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  detailValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  descriptionBox: {
    backgroundColor: "rgba(233, 30, 99, 0.1)",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  descriptionTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  descriptionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoItem: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(233, 30, 99, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  actionsSection: {
    marginBottom: 16,
    gap: 8,
  },
  actionButton: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  actionButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
});