import React from "react";
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../../../utils/colors";

const DistanceProgressBar = ({ distance, totalDistance }: any) => {
  const progress = Math.max(0, Math.min(1, distance / totalDistance));

  //console.log(distance, totalDistance, progress, 'HOLAAAAASoylaDistanciaPorMedir');

  const progressPercent = progress * 100;

  const getStatusLabel = () => {
    if (progressPercent < 30) return "En camino";
    if (progressPercent < 80) return "Avanzando";
    return "A punto de llegar";
  };

  const getBarColor = () => {
    if (progressPercent < 80) return COLORS.primary; 
    return "#4CAF50"; 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>{getStatusLabel()}</Text>
      {/* <Text style={styles.label}>
        Distancia total: {totalDistance.toFixed(1)} mtrs
      </Text> */}

      <View style={styles.progressBackground}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: getBarColor(),
            },
          ]}
        />
      </View>

      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 8,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },

  progressBackground: {
    height: 8,
    width: "100%",
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 8,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 8,
  },

  statusText: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
  },
});

export default DistanceProgressBar;
