import React, { useEffect } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

const STATES = {
  idle: "idle",
  loading: "loading",
  processing: "processing",
  waiting: "waiting",
  completed: "completed",
};

export const AnimatedBee = ({
  state = "idle",
  size = 264,
  showLabel = false,
  label,
  imageSrc,
}: any) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    switch (state) {
      case "idle":
        translateY.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 2000 }),
            withTiming(0, { duration: 2000 })
          ),
          -1
        );
        break;

      case "loading":
        translateY.value = withRepeat(
          withSequence(
            withTiming(-6),
            withTiming(6),
            withTiming(0)
          ),
          -1
        );
        translateX.value = withRepeat(
          withSequence(
            withTiming(5),
            withTiming(-5),
            withTiming(0)
          ),
          -1
        );
        break;

      case "processing":
        scale.value = withRepeat(
          withSequence(
            withTiming(1.06),
            withTiming(0.97),
            withTiming(1)
          ),
          -1
        );
        break;

      case "waiting":
        translateY.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 1400 }),
            withTiming(0, { duration: 1400 })
          ),
          -1
        );
        break;

      case "completed":
        translateY.value = withSequence(
          withTiming(-18),
          withTiming(-2),
          withTiming(-6),
          withTiming(0)
        );
        scale.value = withSequence(
          withTiming(1.1),
          withTiming(1),
          withTiming(1.03),
          withTiming(1)
        );
        break;
    }
  }, [state]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const getLabel = () => {
    if (label) return label;
    switch (state) {
      case "loading":
        return "Cargando…";
      case "processing":
        return "Procesando…";
      case "waiting":
        return "Esperando…";
      case "completed":
        return "¡Listo!";
      default:
        return "";
    }
  };

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View style={[animatedStyle]}>
        <Image
          source={imageSrc || require("../../../assets/bivi-bee-mascot.png")}
          style={{ width: size, height: size, resizeMode: "contain" }}
        />
      </Animated.View>

      {showLabel && (
        <Text style={styles.label}>
          {getLabel()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#6C5CE7",
  },
});