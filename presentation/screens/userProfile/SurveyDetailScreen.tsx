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
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import COLORS from '../../utils/colors';
import { completeSurvey, getUserSurveyHistory, getSurveys } from './Biviconnectapi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { dataContext } from '../../context/Authcontext';

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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{survey.icon}</Text>
        <Text style={styles.title}>{survey.title}</Text>
        <Text style={styles.reward}>🎁 {survey.reward_points} MB</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>{survey.description}</Text>
        
        {(survey.fullDescription || survey.full_description) && (
          <Text style={styles.fullDescription}>{survey.fullDescription || survey.full_description}</Text>
        )}

        <View style={styles.questionsContainer}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  icon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  reward: {
    fontSize: 16,
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
    marginBottom: 12,
  },
  fullDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  questionsContainer: {
    marginBottom: 24,
  },
  questionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    color: '#fff',
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
    color: '#fff',
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
    color: '#fff',
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
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
