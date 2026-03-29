import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AnimatedBee } from "./AnimatedBee";

export const BeeOverlay = ({
  state = "loading",
  size = 80,
  message,
  visible = true,
}: any) => {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.overlay}
    >
      <AnimatedBee state={state} size={size} />

      {message && (
        <Text style={styles.message}>
          {message}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(245,243,255,0.92)",
  },
  message: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
});