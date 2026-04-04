// src/screens/SplashScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import { loadSavedPhone } from '../../utils/SavedPhoneFunctios';
import { AnimatedBee } from './AnimatedBee';

interface Props extends StackScreenProps<RootStackParamList, "SplashScreen"> { };

const SplashScreen = ({ navigation, route }: Props) => {
  const [animationState, setAnimationState] = useState('idle');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Pequeña pausa para que se vea la animación
        await new Promise(resolve => setTimeout(resolve, 2000));

        setAnimationState('completed');
        await new Promise(resolve => setTimeout(resolve, 800));

        // Verificar si hay sesión guardada
        let getStorage = await loadSavedPhone();
        
        // Navegar según si hay sesión guardada
        if (getStorage?.includes("[storage-driver]")) {
          navigation.replace('DriverLoginScreen');
        } else {
          navigation.replace('UserLoginScreen');
        }
      } catch (error) {
        console.error('Error en splash:', error);
        navigation.replace('UserLoginScreen');
      }
    };

    initializeApp();
  }, []);

  return (
    <View style={styles.container}>
      {/* Fondo superior púrpura */}
      <View style={styles.topGradient} />

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Sección de animación - Centrada */}
        <View style={styles.animationSection}>
          <AnimatedBee
            state={animationState}
            size={180}
            showLabel={false}
            imageSrc={require("../../../assets/bivi-bee-mascot.png")}
          />
        </View>

        {/* Sección de branding - Inferior */}
        <View style={styles.brandingSection}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandText}>BIVI</Text>
            <Text style={styles.connectText}>CONNECT</Text>
          </View>
          <Text style={styles.taglineText}>Consumer Intelligence Platform</Text>
          
          {/* Línea decorativa */}
          <View style={styles.decorativeLine} />
        </View>
      </View>

      {/* Fondo inferior magenta */}
      <View style={styles.bottomGradient} />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  // ===== CONTENEDOR PRINCIPAL =====
  container: {
    flex: 1,
    backgroundColor: '#E91E63',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ===== FONDOS PARA SIMULAR GRADIENTE =====
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#6B2D7A',
  },

  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#E91E63',
  },

  // ===== CONTENIDO PRINCIPAL =====
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    zIndex: 10,
  },

  // ===== SECCIÓN DE ANIMACIÓN (CENTRADA) =====
  animationSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  // ===== SECCIÓN DE BRANDING (INFERIOR) =====
  brandingSection: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  brandContainer: {
    alignItems: 'center',
  },

  brandText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
    lineHeight: 52,
  },

  connectText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 4,
  },

  taglineText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ===== LÍNEA DECORATIVA =====
  decorativeLine: {
    width: 80,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 1,
    marginTop: 8,
  },
});