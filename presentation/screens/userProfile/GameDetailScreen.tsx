import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import COLORS from '../../utils/colors';
import { playGame, getUserGameHistory, getGames } from './Biviconnectapi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { WebView } from 'react-native-webview';
import { dataContext } from '../../context/Authcontext';

type Props = StackScreenProps<RootStackParamList, 'GameDetailScreen'>;

export default function GameDetailScreen({ route, navigation }: Props) {
    const { game: initialGame } = route.params;
    const [game, setGame] = useState(initialGame);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [showGame, setShowGame] = useState(false);
    const [score, setScore] = useState(0);

    const { authResponse } = useContext(dataContext);

    useEffect(() => {
        setUserPhone(authResponse?.usuario?.phone || "")
    }, [authResponse])

    useEffect(() => {
        const getUserData = async () => {
            const phone = await AsyncStorage.getItem('userPhone');
            if (phone) {
                setUserPhone(phone);
                await loadGameData(phone);
                checkIfPlayed(phone);
            } else {
                setDataLoading(false);
            }
        };
        getUserData();
    }, []);

    const loadGameData = async (phone: string) => {
        try {
            const gamesRes = await getGames(phone);
            if (gamesRes.success && gamesRes.data) {
                const foundGame = gamesRes.data.find((g: any) => g.id === initialGame.id);
                if (foundGame) {
                    setGame(foundGame);
                }
            }
        } catch (error) {
            console.error('Error loading game data:', error);
        } finally {
            setDataLoading(false);
        }
    };

    const checkIfPlayed = async (phone: string) => {
        const history = await getUserGameHistory(phone);
        if (history.success && history.data) {
            const alreadyPlayed = history.data.some((h: any) => h.gameId === game.id);
            setCompleted(alreadyPlayed);
        }
    };

    const handlePlayGame = () => {
        if (completed) {
            Alert.alert('Ya jugaste', 'Ya completaste este juego');
            return;
        }

        if (game.game_url) {
            setShowGame(true);
        } else {
            Alert.alert('Juego no disponible', 'El juego no está disponible en este momento');
        }
    };

    const handleGameComplete = async (finalScore: number = 0) => {
        if (!userPhone) {
            setErrorMessage('No se encontró tu información');
            setShowError(true);
            return;
        }

        setLoading(true);

        try {
            const result = await playGame(userPhone, game.id, finalScore, 0);

            if (result.success) {
                setCompleted(true);
                setShowGame(false);
                setShowSuccess(true);
                setTimeout(() => {
                    navigation.goBack();
                }, 2000);
            } else {
                setErrorMessage(result.error || 'Error al registrar el juego');
                setShowError(true);
            }
        } catch (error: any) {
            setErrorMessage(error.message);
            setShowError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'GAME_COMPLETE') {
                setScore(data.score || 0);
                handleGameComplete(data.score || 0);
            }
        } catch (e) {
            console.log('Error parsing message:', e);
        }
    };

    if (showGame) {
        return (
            <View style={styles.webViewContainer}>
                <View style={styles.webViewHeader}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowGame(false)}
                    >
                        <Text style={styles.closeButtonText}>✕ Cerrar</Text>
                    </TouchableOpacity>
                    <Text style={styles.gameTitle}>{game.title}</Text>
                </View>
                <WebView
                    source={{ uri: game.game_url! }}
                    style={styles.webView}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    onMessage={handleWebViewMessage}
                    onError={() => {
                        Alert.alert('Error', 'No se pudo cargar el juego');
                        setShowGame(false);
                    }}
                />
            </View>
        );
    }

    if (dataLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando juego...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.icon}>{game.icon}</Text>
                <Text style={styles.title}>{game.title}</Text>
                <Text style={styles.reward}>🎁 {game.reward_points} MB</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.description}>{game.description}</Text>

                {game.fullDescription && (
                    <Text style={styles.fullDescription}>{game.fullDescription}</Text>
                )}

                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>⏱️ Duración: {game.duration} minutos</Text>
                    <Text style={styles.infoText}>🎮 Tipo: {game.game_type}</Text>
                    {game.reward_points && (
                        <Text style={styles.rewardInfo}>💰 Recompensa: {game.reward_points} MB</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={[
                        styles.playButton,
                        (completed || loading) && styles.disabledButton,
                    ]}
                    onPress={handlePlayGame}
                    disabled={completed || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.playButtonText}>
                            {completed ? '✓ Juego completado' : '🎮 Jugar ahora'}
                        </Text>
                    )}
                </TouchableOpacity>

                {completed && !loading && (
                    <View style={styles.completedCard}>
                        <Text style={styles.completedCardText}>
                            ¡Completaste este juego!
                        </Text>
                        <Text style={styles.completedCardSubtext}>
                            Puntos obtenidos: {game.reward_points} MB
                        </Text>
                    </View>
                )}
            </View>

            <SuccessModal
                visible={showSuccess}
                message={`¡Juego completado! Ganaste ${game.reward_points} MB${score > 0 ? ` (Puntaje: ${score})` : ''}`}
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
    rewardInfo: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginTop: 8,
    },
    playButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    playButtonText: {
        color: COLORS.textDark,
        fontSize: 16,
        fontWeight: 'bold',
    },
    completedCard: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    completedCardText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    completedCardSubtext: {
        color: 'white',
        fontSize: 14,
        marginTop: 4,
    },
    webViewContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    webViewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: COLORS.primary,
    },
    closeButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    closeButtonText: {
        color: COLORS.textDark,
        fontSize: 14,
        fontWeight: 'bold',
    },
    gameTitle: {
        flex: 1,
        textAlign: 'center',
        color: COLORS.textDark,
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    webView: {
        flex: 1,
    },
});