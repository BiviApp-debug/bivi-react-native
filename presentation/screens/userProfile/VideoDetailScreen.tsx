import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import COLORS from '../../utils/colors';
import { watchVideo, getUserOfferHistory } from './Biviconnectapi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { Video, ResizeMode, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { dataContext } from '../../context/Authcontext';

type Props = StackScreenProps<RootStackParamList, 'VideoDetailScreen'>;

export default function VideoDetailScreen({ route, navigation }: Props) {
  const { offer } = route.params;
  const [loading, setLoading] = useState(false);
  const [watched, setWatched] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const videoRef = useRef(null);

  const { authResponse } = useContext(dataContext);

  useEffect(() => {
    setUserPhone(authResponse?.usuario?.phone || "")
  }, [authResponse])

  useEffect(() => {
    const getUserData = async () => {
      const phone = await AsyncStorage.getItem('userPhone');
      if (phone) setUserPhone(phone);
      checkIfWatched(phone || '');
    };
    getUserData();
  }, []);

  const checkIfWatched = async (phone: string) => {
    const history = await getUserOfferHistory(phone);
    if (history.success && history.data) {
      const alreadyWatched = history.data.some((h: any) => h.offerId === offer.id);
      setWatched(alreadyWatched);
    }
  };

  const handleVideoComplete = async () => {
    if (watched) {
      Alert.alert('Ya visto', 'Ya completaste este video');
      return;
    }

    if (!userPhone) {
      setErrorMessage('No se encontró tu información');
      setShowError(true);
      return;
    }

    setLoading(true);

    try {
      const result = await watchVideo(userPhone, offer.id, 0);

      if (result.success) {
        setWatched(true);
        setShowSuccess(true);
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        setErrorMessage(result.error || 'Error al registrar el video');
        setShowError(true);
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {offer.video_url ? (
          <Video
            ref={videoRef}
            source={{ uri: offer.video_url }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
              // Check if video finished playing
              if (status.isLoaded && (status as AVPlaybackStatusSuccess).didJustFinish && !watched) {
                handleVideoComplete();
              }
            }}
          />
        ) : (
          <View style={styles.noVideoContainer}>
            <Text style={styles.noVideoText}>📺 Video no disponible</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>{offer.icon}</Text>
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.company}>{offer.companyName}</Text>
        <Text style={styles.description}>{offer.description}</Text>

        {offer.fullDescription && (
          <Text style={styles.fullDescription}>{offer.fullDescription}</Text>
        )}

        <View style={styles.rewardCard}>
          <Text style={styles.rewardText}>🎁 Recompensa: {offer.reward_points} MB</Text>
          <Text style={styles.durationText}>⏱️ Duración: {offer.duration}</Text>
        </View>

        {!watched && !loading && (
          <TouchableOpacity
            style={styles.watchButton}
            onPress={() => {
              if (videoRef.current) {
                (videoRef.current as any).playAsync();
              }
            }}
          >
            <Text style={styles.watchButtonText}>▶ Ver video</Text>
          </TouchableOpacity>
        )}

        {loading && (
          <ActivityIndicator size="large" color={COLORS.primary} />
        )}

        {watched && !loading && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓ Video completado</Text>
          </View>
        )}
      </View>

      <SuccessModal
        visible={showSuccess}
        message={`¡Video completado! Ganaste ${offer.reward_points} MB`}
        onClose={() => setShowSuccess(false)}
      />

      <ErrorModal
        visible={showError}
        message={errorMessage}
        onClose={() => setShowError(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  videoContainer: {
    height: 250,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  noVideoText: {
    color: 'white',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  company: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  fullDescription: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  rewardCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  watchButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  watchButtonText: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  completedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});