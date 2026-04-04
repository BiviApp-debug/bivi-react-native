import React, { useState } from "react";
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
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigator/MainStackNavigator";
import { Mission, completeMission } from "./Biviconnectapi";

interface Props extends StackScreenProps<RootStackParamList, "MisionesScreen"> { }

interface MisionesScreenProps {
  onBack: () => void;
  onSelectOffer: (offer: any) => void;
  missions?: Mission[];
  userPhone?: string;
  telecomCompanyNit?: string;
}

export default function MisionesScreen({
  onBack,
  onSelectOffer,
  missions = [],
  userPhone = "",
  telecomCompanyNit = "",
}: MisionesScreenProps) {
  const [loadingMissionId, setLoadingMissionId] = useState<string | null>(null);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);

  const handleCompleteMission = async (mission: Mission) => {
    if (!userPhone) {
      Alert.alert("Error", "No se encontró el teléfono del usuario");
      return;
    }

    try {
      setLoadingMissionId(mission.id);

      const result = await completeMission(userPhone, mission.id);

      if (result.success) {
        setCompletedMissions([...completedMissions, mission.id]);

        Alert.alert(
          "¡Éxito!",
          `Has completado "${mission.title}".\nGanaste ${result.data.rewardPoints} puntos`,
          [{ text: "OK" }]
        );

        setTimeout(() => {
          onSelectOffer(mission);
        }, 500);

      } else {
        Alert.alert("Error", result.error || "No se pudo completar la misión");
      }
    } catch (error: any) {
      Alert.alert("Error", "Algo salió mal al completar la misión");
    } finally {
      setLoadingMissionId(null);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Misiones</Text>
        <View style={{ width: 50 }} />
      </View>

      {missions && missions.length > 0 ? (
        <ScrollView style={styles.screenContent} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📋 {missions.length} Misiones Disponibles</Text>
            <Text style={styles.summarySubtitle}>Completa misiones y gana puntos</Text>
          </View>

          {missions.map((mission) => {
            const isCompleted = completedMissions.includes(mission.id);
            const isLoading = loadingMissionId === mission.id;

            return (
              <View key={mission.id} style={styles.missionCard}>
                <View style={styles.missionLeftContent}>
                  <View style={styles.missionIcon}>
                    <Text style={styles.missionIconText}>{mission.icon}</Text>
                  </View>
                  <View style={styles.missionTextContent}>
                    <Text style={styles.missionTitle}>{mission.title}</Text>
                    <Text style={styles.missionDescription}>
                      {mission.description}
                    </Text>
                    <View style={styles.missionMeta}>
                      <Text style={styles.missionType}>
                        {mission.type === "task"
                          ? "📌 Tarea"
                          : mission.type === "survey"
                          ? "📝 Encuesta"
                          : "📋 Formulario"}
                      </Text>
                      <Text style={styles.missionDuration}>
                        ⏱️ {mission.duration}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.missionRightContent}>
                  <View style={styles.missionRewardBox}>
                    <Text style={styles.missionReward}>+{mission.reward_points}</Text>
                    <Text style={styles.missionRewardUnit}>pts</Text>
                  </View>

                  {isCompleted ? (
                    <TouchableOpacity style={styles.buttonCompleted} disabled>
                      <Text style={styles.buttonCompletedText}>✓ Completada</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.buttonComplete, isLoading && styles.buttonLoading]}
                      onPress={() => handleCompleteMission(mission)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.buttonCompleteText}>Hacer</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          <View style={{ height: 50 }} />
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Sin misiones disponibles</Text>
          <Text style={styles.emptySubtitle}>
            No hay misiones asignadas para tu empresa
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onBack}>
            <Text style={styles.emptyButtonText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      )}
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
  summaryCard: {
    backgroundColor: "rgba(233, 30, 99, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  summaryTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  summarySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  missionCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  missionLeftContent: {
    flex: 1,
    flexDirection: "row",
    marginRight: 12,
  },
  missionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(233, 30, 99, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  missionIconText: {
    fontSize: 24,
  },
  missionTextContent: {
    flex: 1,
  },
  missionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  missionDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  missionMeta: {
    flexDirection: "row",
    gap: 8,
  },
  missionType: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  missionDuration: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  missionRightContent: {
    alignItems: "center",
    gap: 8,
  },
  missionRewardBox: {
    backgroundColor: "rgba(233, 30, 99, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  missionReward: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  missionRewardUnit: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  buttonComplete: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  buttonCompleteText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  buttonCompleted: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  buttonCompletedText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  buttonLoading: {
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});