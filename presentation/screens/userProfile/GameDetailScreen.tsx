import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import COLORS from '../../utils/colors';
import {
  GameQuestion,
  generateFakeAnswersWithAI,
  getGameDetail,
  getUserGameHistory,
  playGame,
} from './Biviconnectapi';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { dataContext } from '../../context/Authcontext';
import { connectSocket } from '../../utils/Conections';

type Props = StackScreenProps<RootStackParamList, 'GameDetailScreen'>;

type QuizOption = {
  id: string;
  value: string;
};

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

export default function GameDetailScreen({ route, navigation }: Readonly<Props>) {
  const { game: initialGame } = route.params;
  const { authResponse } = useContext(dataContext);

  const [game, setGame] = useState(initialGame);
  const [userPhone, setUserPhone] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [questionOptions, setQuestionOptions] = useState<Record<number, QuizOption[]>>({});
  const [generatingOptions, setGeneratingOptions] = useState(false);

  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [earnedMegas, setEarnedMegas] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showWrongAnswers, setShowWrongAnswers] = useState(false);
  const [wrongAnswersData, setWrongAnswersData] = useState<
    Array<{ question: GameQuestion; correctAnswer: string; userAnswer: string }>
  >([]);

  const questions = useMemo(() => (Array.isArray(game?.questions) ? game.questions : []), [game]);
  const answers = useMemo(() => (Array.isArray(game?.answers) ? game.answers : []), [game]);
  const totalQuestions = questions.length;
  const rewardPerQuestion = useMemo(() => {
    if (!totalQuestions) return 0;
    return Number(game?.reward_points || 0) / totalQuestions;
  }, [game?.reward_points, totalQuestions]);
  const canRedeem = score >= 80;

  useEffect(() => {
    if (authResponse?.usuario?.phone) {
      setUserPhone(authResponse.usuario.phone);
    }
     connectSocket(authResponse.usuario.phone)
  }, [authResponse]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const phone = authResponse?.usuario?.phone || '';
        if (!phone) {
          setDataLoading(false);
          return;
        }

        setUserPhone(phone);

        const gameDetailRes = await getGameDetail(initialGame.id);
        if (gameDetailRes.success && gameDetailRes.data) {
          setGame(gameDetailRes.data);
        }

        const history = await getUserGameHistory(phone);
        if (history.success && history.data) {
          const alreadyPlayed = history.data.some((h: any) => h.gameId === initialGame.id);
          setCompleted(alreadyPlayed);
        }
      } catch (error: any) {
        setErrorMessage(error?.message || 'Error cargando juego');
        setShowError(true);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [authResponse?.usuario?.phone, initialGame.id]);

  const getCorrectAnswerForQuestion = (questionId: number): string => {
    const found = answers.find((a) => a.id === questionId);
    return found?.correctAnswer || '';
  };

  const buildOptionsForQuestion = async (question: GameQuestion): Promise<QuizOption[]> => {
    const correctAnswer = getCorrectAnswerForQuestion(question.id);
    const existingOptions = Array.isArray(question.options) ? question.options : [];

    let baseOptions = existingOptions.filter((o) => o !== correctAnswer);

    if (baseOptions.length < 3) {
      const aiRes = await generateFakeAnswersWithAI({
        question: question.question,
        correctAnswer,
        language: 'es',
        count: 3,
      });

      if (aiRes.success && aiRes.data.length > 0) {
        baseOptions = Array.from(new Set([...baseOptions, ...aiRes.data.filter((x: string) => x !== correctAnswer)]));
      }
    }

    const finalOptions = shuffle(Array.from(new Set([correctAnswer, ...baseOptions])).slice(0, 4));

    return finalOptions.map((value, index) => ({
      id: `${question.id}_${index}`,
      value,
    }));
  };

  const prepareQuiz = async () => {
    if (completed) {
      setErrorMessage('Ya completaste este juego');
      setShowError(true);
      return;
    }

    if (!questions.length) {
      setErrorMessage('Este juego no tiene preguntas configuradas');
      setShowError(true);
      return;
    }

    setGeneratingOptions(true);

    try {
      const optionsByQuestion: Record<number, QuizOption[]> = {};

      for (const q of questions) {
        optionsByQuestion[q.id] = await buildOptionsForQuestion(q);
      }

      setQuestionOptions(optionsByQuestion);
      setSelectedAnswers({});
      setCurrentQuestionIndex(0);
      setShowQuiz(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Error preparando preguntas');
      setShowError(true);
    } finally {
      setGeneratingOptions(false);
    }
  };

  const handleSelectOption = (questionId: number, value: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitGame = async () => {
    if (!userPhone) {
      setErrorMessage('No se encontró tu información');
      setShowError(true);
      return;
    }

    const total = questions.length;
    let correct = 0;
    const wrongAnswers: Array<{ question: GameQuestion; correctAnswer: string; userAnswer: string }> = [];

    questions.forEach((q) => {
      const correctAnswer = getCorrectAnswerForQuestion(q.id);
      const selected = selectedAnswers[q.id];
      
      if (selected === correctAnswer) {
        correct++;
      } else {
        wrongAnswers.push({
          question: q,
          correctAnswer,
          userAnswer: selected || 'No respondida',
        });
      }
    });

    const finalScore = total > 0 ? Math.round((correct / total) * 100) : 0;
    const totalEarnedMegas = Number((correct * rewardPerQuestion).toFixed(2));

    setScore(finalScore);
    setCorrectAnswersCount(correct);
    setEarnedMegas(totalEarnedMegas);
    setWrongAnswersData(wrongAnswers);
    setShowQuiz(false);
    setShowWrongAnswers(true);

    if (finalScore < 80) {
      setErrorMessage('Necesitas completar al menos el 80% de respuestas correctas para redimir puntos.');
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setShowWrongAnswers(false);
    setShowQuiz(true);
  };

  const handleConfirmWrongAnswers = async () => {
    setLoading(true);
    try {
      const result = await playGame(userPhone, game.id, score, Number(game.duration || 0));
      if (result.success) {
        setCompleted(true);
        setShowWrongAnswers(false);
        setShowSuccess(true);
        setTimeout(() => navigation.goBack(), 2000);
      } else {
        setErrorMessage(result.error || 'Error al registrar el juego');
        setShowError(true);
        setShowWrongAnswers(false);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Error al completar juego');
      setShowError(true);
      setShowWrongAnswers(false);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando juego...</Text>
      </View>
    );
  }

  if (showWrongAnswers) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => setShowWrongAnswers(false)} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Respuestas Incorrectas</Text>
            <View style={{ width: 50 }} />
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.gameCard}>
            <Text style={styles.scoreInfoText}>Puntaje: {score}%</Text>
            <Text style={styles.metaSummaryText}>Aciertos: {correctAnswersCount}/{totalQuestions}</Text>
            <Text style={styles.metaSummaryText}>Megas por pregunta: {rewardPerQuestion.toFixed(2)} MB</Text>
            <Text style={styles.metaSummaryText}>Megas ganados: {earnedMegas.toFixed(2)} MB</Text>
            <Text style={[styles.thresholdMessage, canRedeem ? styles.thresholdSuccess : styles.thresholdWarning]}>
              {canRedeem
                ? 'Cumpliste el 80% minimo. Puedes redimir tus puntos.'
                : 'No alcanzaste el 80% minimo. No puedes redimir puntos en este intento.'}
            </Text>
            <Text style={styles.wrongAnswersTitle}>
              {wrongAnswersData.length ? 'Preguntas incorrectas:' : 'No tuviste respuestas incorrectas'}
            </Text>

            {wrongAnswersData.map((item, index) => (
              <View key={`${game.id}_wrong_${item.question.id}_${index}`} style={styles.wrongAnswerCard}>
                <Text style={styles.wrongQuestionText}>{index + 1}. {item.question.question}</Text>
                
                <View style={styles.answerComparisonContainer}>
                  <View style={styles.answerItem}>
                    <Text style={styles.answerLabel}>Tu respuesta:</Text>
                    <Text style={[styles.answerValue, styles.wrongAnswerValue]}>
                      {item.userAnswer}
                    </Text>
                  </View>

                  <View style={styles.answerItem}>
                    <Text style={styles.answerLabel}>Respuesta correcta:</Text>
                    <Text style={[styles.answerValue, styles.correctAnswerValue]}>
                      {item.correctAnswer}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {canRedeem ? (
              <TouchableOpacity
                style={[styles.playButton, loading && styles.disabledButton]}
                disabled={loading}
                onPress={handleConfirmWrongAnswers}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.playButtonText}>✓ Confirmar y Redimir {earnedMegas.toFixed(2)} MB</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.retryModalActions}>
                <TouchableOpacity
                  style={[styles.retryButton, styles.retryButtonCancel]}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.retryButtonText}>Salir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.retryButton, styles.retryButtonRetry]}
                  onPress={handleRetry}
                >
                  <Text style={[styles.retryButtonText, styles.retryButtonRetryText]}>
                    🔄 Otra vez
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        <ErrorModal visible={showError} message={errorMessage} onClose={() => setShowError(false)} />
      </View>
    );
  }

  if (showQuiz) {
    const currentQuestion = questions[currentQuestionIndex];
    const options = questionOptions[currentQuestion.id] || [];
    const selected = selectedAnswers[currentQuestion.id];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => setShowQuiz(false)} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{game.title}</Text>
            <View style={{ width: 50 }} />
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.gameCard}>
            <Text style={styles.progressText}>
              Pregunta {currentQuestionIndex + 1} de {questions.length}
            </Text>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionButton, selected === option.value && styles.optionButtonActive]}
                onPress={() => handleSelectOption(currentQuestion.id, option.value)}
              >
                <Text style={[styles.optionText, selected === option.value && styles.optionTextActive]}>
                  {option.value}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.quizActionsRow}>
              <TouchableOpacity
                style={[styles.navButton, currentQuestionIndex === 0 && styles.disabledButton]}
                disabled={currentQuestionIndex === 0}
                onPress={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
              >
                <Text style={styles.navButtonText}>Anterior</Text>
              </TouchableOpacity>

              {isLastQuestion ? (
                <TouchableOpacity
                  style={[styles.navButton, (!selected || loading) && styles.disabledButton]}
                  disabled={!selected || loading}
                  onPress={handleSubmitGame}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.navButtonText}>Finalizar</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.navButton, !selected && styles.disabledButton]}
                  disabled={!selected}
                  onPress={() => setCurrentQuestionIndex((prev) => prev + 1)}
                >
                  <Text style={styles.navButtonText}>Siguiente</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        <ErrorModal visible={showError} message={errorMessage} onClose={() => setShowError(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles del Juego</Text>
          <View style={{ width: 50 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.gameCard}>
          <Text style={styles.gameTitle}>{game.title}</Text>
          <Text style={styles.gameDescription}>{game.description}</Text>
          <Text style={styles.metaText}>Preguntas: {questions.length}</Text>
          <Text style={styles.metaText}>Recompensa: {game.reward_points} MB</Text>
          <Text style={styles.metaText}>Valor por pregunta: {rewardPerQuestion.toFixed(2)} MB</Text>
          <Text style={styles.metaText}>Minimo para redimir: 80%</Text>

          <TouchableOpacity
            style={[styles.playButton, (completed || generatingOptions) && styles.disabledButton]}
            disabled={completed || generatingOptions}
            onPress={prepareQuiz}
          >
            {generatingOptions ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.playButtonText}>{completed ? '✓ Juego completado' : '🎮 Iniciar quiz'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        message={`¡Juego completado! Ganaste ${earnedMegas.toFixed(2)} MB (Puntaje: ${score}%)`}
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
  gameCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gameTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  gameDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  playButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
  },
  playButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  optionButton: {
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
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
  quizActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  navButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#bbb',
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
  scoreInfoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  metaSummaryText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    textAlign: 'center',
  },
  thresholdMessage: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  thresholdSuccess: {
    backgroundColor: '#e6f9e6',
    color: '#2f9e44',
  },
  thresholdWarning: {
    backgroundColor: '#fff3cd',
    color: '#a15c00',
  },
  wrongAnswersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  wrongAnswerCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  wrongQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  answerComparisonContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  answerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  answerLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 5,
  },
  answerValue: {
    fontSize: 13,
    fontWeight: '600',
    padding: 8,
    borderRadius: 6,
  },
  wrongAnswerValue: {
    backgroundColor: '#ffe0e0',
    color: '#c92a2a',
  },
  correctAnswerValue: {
    backgroundColor: '#e6f9e6',
    color: '#2f9e44',
  },
  retryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    maxWidth: '90%',
  },
  retryModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  retryModalMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  retryModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonCancel: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  retryButtonRetry: {
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  retryButtonRetryText: {
    color: 'white',
  },
});