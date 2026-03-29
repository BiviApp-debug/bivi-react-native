import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    TextInput,
    ScrollView,
} from 'react-native';
import COLORS from '../../utils/colors';
import { getRatingByUser, createRating, updateRating } from '../../utils/HandleRatings';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TripRatingModalProps {
    visible: boolean;
    driverName: string;
    driverPhoto?: string;
    tripId: string;
    driverCelPhone: string;
    onClose: () => void;
    onSubmitRating: (rating: number) => void;
}

export default function TripRatingModal({
    visible,
    driverName,
    driverPhoto,
    tripId,
    driverCelPhone,
    onClose,
    onSubmitRating,
}: TripRatingModalProps) {
    const [rating, setRating] = useState(0);
    const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
    const [comment, setComment] = useState('');
    const [showIssues, setShowIssues] = useState(false);

    const issues = [
        { id: 'cleanliness', label: 'Limpieza', icon: '🧹' },
        { id: 'navigation', label: 'Navegación', icon: '🗺️' },
        { id: 'price', label: 'Precio', icon: '💰' },
        { id: 'pickup', label: 'Recogida', icon: '📍' },
        { id: 'route', label: 'Ruta', icon: '🛣️' },
        { id: 'driving', label: 'Conducción', icon: '🚗' },
        { id: 'service', label: 'Servicio', icon: '⭐' },
        { id: 'other', label: 'Otro', icon: '📝' },
    ];

    const handleRatingPress = (value: number) => {
        setRating(value);
        // Si la calificación es menor a 5, mostrar opciones de problemas
        if (value < 5) {
            setShowIssues(true);
        } else {
            setShowIssues(false);
            setSelectedIssues([]);
        }
    };

    const toggleIssue = (issueId: string) => {
        if (selectedIssues.includes(issueId)) {
            setSelectedIssues(selectedIssues.filter(id => id !== issueId));
        } else {
            setSelectedIssues([...selectedIssues, issueId]);
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) return;

        try {
            const userRatings = await getRatingByUser(driverCelPhone);
            const existingRating = Number(userRatings?.rating);
            const newRating = existingRating > 0
                ? ((existingRating + Number(rating)) / 2).toFixed(2)
                : Number(rating).toFixed(2);

            if (existingRating > 0) {
                await updateRating(driverCelPhone, newRating.toString());
            } else {
                await createRating(newRating.toString(), driverCelPhone);
            }
        } catch (_) {
            // silently fail — no bloquear el flujo
        } finally {
            await AsyncStorage.setItem('updateRatings', "false");
        }

        onSubmitRating(rating);
        resetModal();
        onClose();
    };

    const resetModal = () => {
        setRating(0);
        setSelectedIssues([]);
        setComment('');
        setShowIssues(false);
    };

    const getRatingMessage = () => {
        if (rating === 0) return 'Califica tu viaje';
        if (rating === 5) return '¡Excelente!';
        if (rating === 4) return 'Bien, pero tuvo un problema';
        if (rating === 3) return 'Aceptable';
        if (rating === 2) return 'Mal servicio';
        return 'Muy mal';
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>¿Cómo estuvo tu viaje?</Text>
                        </View>

                        {/* Driver Info */}
                        <View style={styles.driverSection}>
                            <View style={styles.driverAvatar}>
                                {driverPhoto ? (
                                    <Image source={{ uri: driverPhoto }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={styles.avatarIcon}>👤</Text>
                                )}
                            </View>
                            <Text style={styles.driverName}>{driverName}</Text>
                        </View>

                        {/* Rating Stars */}
                        <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => handleRatingPress(star)}
                                    style={styles.starButton}
                                >
                                    <Text style={[
                                        styles.star,
                                        star <= rating && styles.starFilled
                                    ]}>
                                        ★
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.ratingMessage}>{getRatingMessage()}</Text>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    rating === 0 && styles.submitButtonDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={rating === 0}
                            >
                                <Text style={styles.submitButtonText}>Enviar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.skipButton}
                                onPress={() => {
                                    resetModal();
                                    onClose();
                                }}
                            >
                                <Text style={styles.skipButtonText}>Omitir</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    driverSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    driverAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 3,
        borderColor: COLORS.backgroundMedium,
    },
    avatarImage: {
        width: 74,
        height: 74,
        borderRadius: 37,
    },
    avatarIcon: {
        fontSize: 40,
    },
    driverName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    starButton: {
        padding: 4,
    },
    star: {
        fontSize: 48,
        color: COLORS.backgroundMedium,
    },
    starFilled: {
        color: COLORS.primary,
    },
    ratingMessage: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: '500',
    },
    issuesSection: {
        marginBottom: 24,
    },
    issuesTitle: {
        fontSize: 14,
        color: COLORS.error,
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: '500',
    },
    issuesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    issueButton: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundLight,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        minWidth: 100,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    issueButtonSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.backgroundMedium,
    },
    issueIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    issueLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    issueLabelSelected: {
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    commentSection: {
        marginBottom: 24,
    },
    commentTitle: {
        fontSize: 14,
        color: COLORS.textPrimary,
        marginBottom: 12,
        fontWeight: '500',
    },
    commentInput: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: 12,
        padding: 16,
        color: COLORS.textPrimary,
        fontSize: 14,
        minHeight: 100,
        borderWidth: 1,
        borderColor: COLORS.backgroundMedium,
    },
    actionButtons: {
        gap: 12,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    skipButton: {
        backgroundColor: 'transparent',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.backgroundMedium,
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
});