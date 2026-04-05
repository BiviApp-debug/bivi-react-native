import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import COLORS from '../../utils/colors';
import { completeSurvey, getUserSurveyHistory, getSurveys } from './Biviconnectapi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { dataContext } from '../../context/Authcontext';
import { connectSocket } from '../../utils/Conections';

type Props = StackScreenProps<RootStackParamList, 'SurveyDetailScreen'>;

interface SurveyDetailScreenProps extends Readonly<Props> {}

export default function SurveyDetailScreen({ route, navigation }: Readonly<Props>) {
  const { survey: initialSurvey } = route.params;
  const [survey, setSurvey] = useState(initialSurvey);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userPhone, setUserPhone] = useState('');

  const { authResponse } = useContext(dataContext);
  
  useEffect(() => {
    if (authResponse?.usuario?.phone) {
      setUserPhone(authResponse.usuario.phone);
    }
     connectSocket(authResponse.usuario.phone)
  }, [authResponse]);

  useEffect(() => {
    const getUserData = async () => {
      try {
        let phone = userPhone;
        if (!phone) {
          phone = await AsyncStorage.getItem('userPhone') || '';
          if (phone) {
            setUserPhone(phone);
          }
        }
        if (phone) {
          await loadSurveyData(phone);
          await checkIfCompleted(phone);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    getUserData();
  }, [userPhone]);

  const loadSurveyData = async (phone: string) => {
    try {
      const surveysRes = await getSurveys(phone);
      if (surveysRes.success && surveysRes.data) {
        const foundSurvey = surveysRes.data.find((s: any) => s.id === initialSurvey.id);
        if (foundSurvey) {
          setSurvey(foundSurvey);

          // Inicializar respuestas como objeto para mejor mapeo
          if (foundSurvey.questions) {
            const initialAnswers: Record<number, any> = {};
            foundSurvey.questions.forEach((q: any) => {
              const defaultValue = getDefaultAnswerValue(q.type);
              initialAnswers[q.id] = defaultValue;
            });
            setAnswers(initialAnswers);
          }
        }
      }
    } catch (error) {
      console.error('Error loading survey data:', error);
    }
  };

  const checkIfCompleted = async (phone: string) => {
    try {
      const history = await getUserSurveyHistory(phone);
      if (history.success && history.data) {
        const alreadyCompleted = history.data.some((h: any) => h.surveyId === initialSurvey.id);
        setCompleted(alreadyCompleted);
      }
    } catch (error) {
      console.error('Error checking completion:', error);
    }
  };

  const handleAnswerChange = (questionId: number, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleRating = (questionId: number, rating: number) => {
    handleAnswerChange(questionId, rating);
  };

  const handleMultipleChoice = (questionId: number, option: string) => {
    handleAnswerChange(questionId, option);
  };

  const handleYesNo = (questionId: number, value: boolean) => {
    handleAnswerChange(questionId, value);
  };

  const handleText = (questionId: number, text: string) => {
    handleAnswerChange(questionId, text);
  };

  const getDefaultAnswerValue = (type: string): any => {
    if (type === 'yes_no') return null;
    if (type === 'text') return '';
    return null;
  };

  const isFormValid = () => {
    if (!survey.questions) return true;
    return survey.questions.every((q: any) => {
      const answer = answers[q.id];
      if (q.required) {
        if (q.type === 'text') return answer?.trim?.()?.length > 0;
        if (q.type === 'yes_no') return answer !== null && answer !== undefined;
        return answer !== null && answer !== undefined;
      }
      return true;
    });
  };

  const handleSubmitSurvey = async () => {
    if (completed) {
      Alert.alert('Completada', 'Ya completaste esta encuesta');
      return;
    }

    if (!userPhone) {
      setErrorMessage('No se encontró tu información');
      setShowError(true);
      return;
    }

    if (!isFormValid()) {
      setErrorMessage('Por favor responde todas las preguntas requeridas');
      setShowError(true);
      return;
    }

    setLoading(true);

    try {
      // Convertir objeto de respuestas al formato requerido
      const formattedAnswers = survey.questions?.map((q: any) => ({
        questionId: q.id,
        questionText: q.question,
        answer: answers[q.id],
        type: q.type,
      })) || [];

      console.log('📝 Enviando respuestas de encuesta:', {
        userPhone,
        surveyId: survey.id,
        telecomCompanyNit: survey.telecomCompanyNit,
        answersCount: formattedAnswers.length
      });

      const result = await completeSurvey(userPhone, survey.id, formattedAnswers);

      if (result.success) {
        setCompleted(true);
        setShowSuccess(true);
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        setErrorMessage(result.error || 'Error al completar la encuesta');
        setShowError(true);
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      setErrorMessage(error.message);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (question: any) => {
    const currentAnswer = answers[question.id];

    switch (question.type) {
      case 'rating':
        return (
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map(rating => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  currentAnswer === rating && styles.ratingButtonActive,
                ]}
                onPress={() => handleRating(question.id, rating)}
              >
                <Text
                  style={[
                    styles.ratingText,
                    currentAnswer === rating && styles.ratingTextActive,
                  ]}
                >
                  {rating}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'multiple_choice':
        return (
          <View>
            {question.options?.map((option: string) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  currentAnswer === option && styles.optionButtonActive,
                ]}
                onPress={() => handleMultipleChoice(question.id, option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    currentAnswer === option && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'yes_no':
        return (
          <View style={styles.yesNoContainer}>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                currentAnswer === true && styles.yesNoButtonActive,
              ]}
              onPress={() => handleYesNo(question.id, true)}
            >
              <Text
                style={[
                  styles.yesNoText,
                  currentAnswer === true && styles.yesNoTextActive,
                ]}
              >
                Sí
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                currentAnswer === false && styles.yesNoButtonActive,
              ]}
              onPress={() => handleYesNo(question.id, false)}
            >
              <Text
                style={[
                  styles.yesNoText,
                  currentAnswer === false && styles.yesNoTextActive,
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            placeholder="Escribe tu respuesta..."
            value={currentAnswer || ''}
            onChangeText={(text) => handleText(question.id, text)}
            multiline
          />
        );

      default:
        return null;
    }
  };

  if (dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando encuesta...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles de la Encuesta</Text>
          <View style={{ width: 50 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {completed && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedBannerIcon}>✓</Text>
            <View style={styles.completedBannerContent}>
              <Text style={styles.completedBannerTitle}>Esta tarea ya fue completada</Text>
              <Text style={styles.completedBannerText}>
                Ya registramos esta encuesta en tu historial de actividades.
              </Text>
            </View>
          </View>
        )}

        {/* SURVEY INFO CARD */}
        <View style={styles.surveyCard}>
          <View style={styles.surveyHeader}>
            <Text style={styles.surveyIcon}>{survey.icon}</Text>
            <View style={styles.surveyInfo}>
              <Text style={styles.surveyTitle}>{survey.title}</Text>
              <Text style={styles.surveyReward}>🎁 {survey.reward_points} MB</Text>
            </View>
          </View>

          <Text style={styles.surveyDescription}>{survey.description}</Text>

          {(survey.fullDescription || survey.full_description) && (
            <Text style={styles.surveyFullDescription}>{survey.fullDescription || survey.full_description}</Text>
          )}
        </View>

        {/* QUESTIONS CARD */}
        <View style={styles.questionsCard}>
          <Text style={styles.questionsTitle}>Preguntas:</Text>

          {survey.questions?.map((question: any, index: number) => (
            <View key={question.id} style={styles.questionCard}>
              <Text style={styles.questionText}>
                {index + 1}. {question.question}
                {question.required && <Text style={styles.required}> *</Text>}
              </Text>
              {renderQuestion(question)}
            </View>
          ))}
        </View>

        {/* ACTION CARD */}
        <View style={styles.actionCard}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (completed || loading) && styles.disabledButton,
            ]}
            onPress={handleSubmitSurvey}
            disabled={completed || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                {completed ? '✓ Encuesta completada' : 'Enviar respuestas'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        message={`¡Encuesta completada! Ganaste ${survey.reward_points} MB`}
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
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b7ebc6',
  },
  completedBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16a34a',
    color: 'white',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 20,
    fontWeight: '800',
    marginRight: 12,
    overflow: 'hidden',
  },
  completedBannerContent: {
    flex: 1,
  },
  completedBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  completedBannerText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#2f6b45',
  },
  surveyCard: {
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
  surveyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  surveyIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  surveyInfo: {
    flex: 1,
  },
  surveyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  surveyReward: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  surveyDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 15,
  },
  surveyFullDescription: {
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
    marginBottom: 20,
  },
  questionsCard: {
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
  questionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  required: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  actionCard: {
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
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F1FF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  ratingTextActive: {
    color: 'white',
    fontWeight: '800',
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  optionTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  yesNoButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  yesNoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  yesNoTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 8,
    fontFamily: 'System',
  },
});
