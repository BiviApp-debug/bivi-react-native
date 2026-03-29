// src/screens/SplashScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Text, Image } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import { loadSavedPhone } from '../../utils/SavedPhoneFunctios';
import { AnimatedBee } from './AnimatedBee'; // Ajusta la ruta según tu estructura

interface Props extends StackScreenProps<RootStackParamList, "SplashScreen"> { };

const SplashScreen = ({ navigation, route }: Props) => {
  const [animationState, setAnimationState] = useState('idle');
  const [progress, setProgress] = useState('Iniciando...');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simular estados de carga
        setAnimationState('loading');
        setProgress('Conectando...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        setAnimationState('processing');
        setProgress('Verificando sesión...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        setAnimationState('waiting');
        setProgress('Preparando aplicación...');
        
        // Verificar si hay sesión guardada
        let getStorage = await loadSavedPhone();
        await new Promise(resolve => setTimeout(resolve, 1000));

        setAnimationState('completed');
        setProgress('¡Bienvenido!');
        await new Promise(resolve => setTimeout(resolve, 800));

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
      {/* Fondo con gradiente (opcional) */}
      <View style={styles.background}>
        <View style={styles.gradientOverlay} />
      </View>

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.headerSection}>
          <Text style={styles.brandText}>BIVI CONNECT</Text>
          <Text style={styles.taglineText}>Consumer Intelligence</Text>
        </View>

        {/* Sección de animación */}
        <View style={styles.animationSection}>
          <AnimatedBee
            state={animationState}
            size={120}
            showLabel={false}
            imageSrc={require("../../../assets/bivi-bee-mascot.png")}
          />
          
          <Text style={styles.progressText}>{progress}</Text>
        </View>

        {/* Indicador de progreso */}
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar,
              {
                width: animationState === 'idle' 
                  ? '25%' 
                  : animationState === 'loading' 
                  ? '50%'
                  : animationState === 'processing'
                  ? '75%'
                  : animationState === 'waiting'
                  ? '85%'
                  : '100%'
              }
            ]}
          />
        </View>
      </View>

      {/* Footer opcional */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Versión 1.0</Text>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  // ===== CONTENEDOR PRINCIPAL =====
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ===== BACKGROUND =====
  background: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },

  gradientOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(107, 45, 122, 0.03)',
  },

  // ===== CONTENIDO PRINCIPAL =====
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // ===== SECCIÓN HEADER =====
  headerSection: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },

  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },

  brandText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6B2D7A',
    letterSpacing: 2,
  },

  taglineText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999999',
    letterSpacing: 0.5,
  },

  // ===== SECCIÓN DE ANIMACIÓN =====
  animationSection: {
    alignItems: 'center',
    gap: 24,
    flex: 1,
    justifyContent: 'center',
  },

  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B2D7A',
    textAlign: 'center',
    minHeight: 24,
  },

  // ===== PROGRESS BAR =====
  progressBarContainer: {
    width: '100%',
    maxWidth: 300,
    height: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 40,
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderRadius: 2,
  },

  // ===== FOOTER =====
  footer: {
    paddingBottom: 30,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '500',
  },
});