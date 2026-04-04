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

interface Answer {
  questionId: number;
  answer: any;
}

export default function SurveyDetailScreen({ route, navigation }: Props) {
  const { survey: initialSurvey } = route.params;
  const [survey, setSurvey] = useState(initialSurvey);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
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
        await loadSurveyData(phone);
        checkIfCompleted(phone);
      } else {
        setDataLoading(false);
      }
    };
    getUserData();
    console.log("holas_mis_datos_45");
    
  }, []);

  const loadSurveyData = async (phone: string) => {
    try {
      const surveysRes = await getSurveys(phone);
      if (surveysRes.success && surveysRes.data) {
        const foundSurvey = surveysRes.data.find((s:any) => s.id === initialSurvey.id);
        if (foundSurvey) {
            console.log(foundSurvey,"holas_survey");
            
          setSurvey(foundSurvey);

          // Inicializar respuestas
          if (foundSurvey.questions) {
            const initialAnswers = foundSurvey.questions.map((q: any) => ({
              questionId: q.id,
              answer: q.type === 'yes_no' ? false : (q.type === 'text' ? '' : null),
            }));
            setAnswers(initialAnswers);
          }
        }
      }
    } catch (error) {
      console.error('Error loading survey data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const checkIfCompleted = async (phone: string) => {
    const history = await getUserSurveyHistory(phone);
    if (history.success && history.data) {
      const alreadyCompleted = history.data.some((h: any) => h.surveyId === survey.id);
      setCompleted(alreadyCompleted);
    }
  };

  const handleAnswerChange = (questionId: number, answer: any) => {
    setAnswers(prev =>
      prev.map(a => a.questionId === questionId ? { ...a, answer } : a)
    );
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

  const isFormValid = () => {
    if (!survey.questions) return true;
    return survey.questions.every((q: any) => {
      const answer = answers.find(a => a.questionId === q.id)?.answer;
      if (q.required) {
        if (q.type === 'text') return answer && answer.trim().length > 0;
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
      const formattedAnswers = answers.map(a => ({
        questionId: a.questionId,
        answer: a.answer,
      }));

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
      setErrorMessage(error.message);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (question: any) => {
    const currentAnswer = answers.find(a => a.questionId === question.id)?.answer;

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
              <Text style={styles.yesNoText}>Sí</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                currentAnswer === false && styles.yesNoButtonActive,
              ]}
              onPress={() => handleYesNo(question.id, false)}
            >
              <Text style={styles.yesNoText}>No</Text>
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{survey.icon}</Text>
        <Text style={styles.title}>{survey.title}</Text>
        <Text style={styles.reward}>🎁 {survey.reward_points} MB</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>{survey.description}</Text>
        
        {survey.fullDescription && (
          <Text style={styles.fullDescription}>{survey.fullDescription}</Text>
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
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  required: {
    color: 'red',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  ratingButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonActive: {
    backgroundColor: COLORS.primary,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  ratingTextActive: {
    color: COLORS.textDark,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextActive: {
    color: COLORS.textDark,
    fontWeight: '600',
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  yesNoButtonActive: {
    backgroundColor: COLORS.primary,
  },
  yesNoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
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