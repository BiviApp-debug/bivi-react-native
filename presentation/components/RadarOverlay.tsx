import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

export const RadarOverlay = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación de pulso (ondas expansivas)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animación de escaneo (giro)
    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Fade in inicial
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const rotate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[radarStyles.container, { opacity: fadeAnim }]}>
      {/* Círculos concéntricos fijos */}
      <View style={radarStyles.circle1} />
      <View style={radarStyles.circle2} />
      <View style={radarStyles.circle3} />

      {/* Ondas expansivas */}
      {[0, 0.33, 0.66].map((delay, i) => (
        <Animated.View
          key={i}
          style={[
            radarStyles.pulse,
            {
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1.5],
                  }),
                },
              ],
              opacity: pulseAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.8, 0.4, 0],
              }),
            },
          ]}
        />
      ))}

      {/* Scanner giratorio (línea de barrido) */}
      <Animated.View style={[radarStyles.scannerContainer, { transform: [{ rotate }] }]}>
        <View style={radarStyles.scanLine} />
      </Animated.View>

      {/* Punto central */}
      <View style={radarStyles.centerDot}>
        <View style={radarStyles.centerDotInner} />
      </View>
    </Animated.View>
  );
};

const radarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
  
    width: 250,
    height: 250,

   
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  
    alignSelf: 'center',
  },
  
  // Círculos concéntricos
  circle1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 195, 0, 0.3)',
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 195, 0, 0.2)',
  },
  circle3: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 195, 0, 0.15)',
  },
  
  // Ondas expansivas
  pulse: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#FFC300',
    backgroundColor: '#ffc4006c',
  },
  
  // Scanner giratorio
  scannerContainer: {
    position: 'absolute',
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    position: 'absolute',
    width: 110,
    height: 2,
    backgroundColor: '#FFC300',
    right: '50%',
    shadowColor: '#FFC300',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  
  // Punto central
  centerDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFC300',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFC300',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  centerDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
});