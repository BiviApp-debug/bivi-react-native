import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
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
      if (phone) setUserPhone(authResponse?.usuario?.phone || '');
      checkIfWatched(authResponse?.usuario?.phone || '');
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles del Video</Text>
          <View style={{ width: 50 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* VIDEO CARD */}
        <View style={styles.videoCard}>
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
        </View>

        {/* VIDEO INFO CARD */}
        <View style={styles.infoCard}>
          <View style={styles.videoHeader}>
            <Text style={styles.videoIcon}>{offer.icon}</Text>
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{offer.title}</Text>
              <Text style={styles.videoCompany}>{offer.companyName}</Text>
            </View>
          </View>

          <Text style={styles.videoDescription}>{offer.description}</Text>

          {offer.fullDescription && (
            <Text style={styles.videoFullDescription}>{offer.fullDescription}</Text>
          )}

          <View style={styles.rewardSection}>
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>🎁 {offer.reward_points} MB</Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>⏱️ {offer.duration}</Text>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.buttonContainer}>
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
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Procesando...</Text>
              </View>
            )}

            {watched && !loading && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>✓ Video completado</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

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
    backgroundColor: '#F4F1FF',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  videoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  videoIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  videoCompany: {
    fontSize: 16,
    color: '#666',
  },
  videoDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 15,
  },
  videoFullDescription: {
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
    marginBottom: 20,
  },
  rewardSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rewardBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rewardText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 14,
  },
  durationBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    color: '#EF6C00',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  watchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 10,
  },
  watchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.primary,
  },
  completedBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  completedText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 16,
  },
});