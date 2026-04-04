import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
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
    <ScrollView style={styles.container}>
      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando misión...</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.icon}>{mission.icon}</Text>
            <Text style={styles.title}>{mission.title}</Text>
            <Text style={styles.reward}>🎁 {mission.reward_points} MB</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>{mission.description}</Text>
            
            {mission.fullDescription && (
              <Text style={styles.fullDescription}>{mission.fullDescription}</Text>
            )}

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>⏱️ Duración: {mission.duration}</Text>
              <Text style={styles.infoText}>📋 Tipo: {mission.type}</Text>
            </View>

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
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  reward: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  fullDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: 'bold',
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
    color: COLORS.textSecondary,
  },
});