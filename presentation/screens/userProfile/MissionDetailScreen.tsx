import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import COLORS from '../../utils/colors';
import { completeMission, getUserMissionHistory, getMissions } from './Biviconnectapi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { dataContext } from '../../context/Authcontext';

type Props = StackScreenProps<RootStackParamList, 'MissionDetailScreen'>;

export default function MissionDetailScreen({ route, navigation }: Props) {
  const { mission: initialMission } = route.params;
  const [mission, setMission] = useState(initialMission);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userPhone, setUserPhone] = useState('');

 const { authResponse } = useContext(dataContext);

  useEffect(()=>{
setUserPhone(authResponse?.usuario?.phone || "")
  },[authResponse])

  useEffect(() => {

    const getUserData = async () => {
      const phone = await AsyncStorage.getItem('userPhone');
      if (phone) {
        setUserPhone(phone);
        await loadMissionData(phone);
        checkIfCompleted(phone);
      } else {
        setDataLoading(false);
      }
    };
    getUserData();
  }, []);

  const loadMissionData = async (phone: string) => {
    try {
      const missionsRes = await getMissions(phone);
      if (missionsRes.success && missionsRes.data) {
        const foundMission = missionsRes.data.find((m: any) => m.id === initialMission.id);
        if (foundMission) {
          setMission(foundMission);
        }
      }
    } catch (error) {
      console.error('Error loading mission data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const checkIfCompleted = async (phone: string) => {
    const history = await getUserMissionHistory(phone);
    if (history.success && history.data) {
      const alreadyCompleted = history.data.some((h: any) => h.missionId === mission.id);
      setCompleted(alreadyCompleted);
    }
  };

  const handleCompleteMission = async () => {
    if (completed) {
      Alert.alert('Completada', 'Ya completaste esta misión');
      return;
    }

    if (!userPhone) {
      setErrorMessage('No se encontró tu información');
      setShowError(true);
      return;
    }

    setLoading(true);

    try {
      const result = await completeMission(userPhone, mission.id);

      if (result.success) {
        setCompleted(true);
        setShowSuccess(true);
        // Regresar después de 2 segundos
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        setErrorMessage(result.error || 'Error al completar la misión');
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
          <Text style={styles.headerTitle}>Detalles de Misión</Text>
          <View style={{ width: 50 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {dataLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando misión...</Text>
          </View>
        ) : (
          <>
            {/* MISSION CARD */}
            <View style={styles.missionCard}>
              <View style={styles.missionHeader}>
                <Text style={styles.missionIcon}>{mission.icon}</Text>
                <View style={styles.missionInfo}>
                  <Text style={styles.missionTitle}>{mission.title}</Text>
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardText}>🎁 {mission.reward_points} MB</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.missionDescription}>{mission.description}</Text>

              {mission.fullDescription && (
                <Text style={styles.missionFullDescription}>{mission.fullDescription}</Text>
              )}

              <View style={styles.missionDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>⏱️</Text>
                  <Text style={styles.detailText}>Duración: {mission.duration}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>📋</Text>
                  <Text style={styles.detailText}>Tipo: {mission.type}</Text>
                </View>
              </View>
            </View>

            {/* COMPLETE BUTTON */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.completeButton,
                  (completed || loading) && styles.disabledButton,
                ]}
                onPress={handleCompleteMission}
                disabled={completed || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.completeButtonText}>
                    {completed ? '✓ Completada' : 'Completar Misión'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        message={`¡Misión completada! Ganaste ${mission.reward_points} MB`}
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
  // HEADER
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // MISSION CARD
  missionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  missionIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  rewardBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  missionDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  missionFullDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  missionDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  // BUTTON CONTAINER
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
  },
});