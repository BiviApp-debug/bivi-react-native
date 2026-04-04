import React, { useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    StatusBar,
    Animated,
} from 'react-native';

interface Props {
    visible: boolean;
    title?: string;
    subtitle?: string;
    buttonText?: string;
    onClose: () => void;
    icon?: 'car' | 'moto' | 'user' | 'check' | 'warning';
}

export default function WelcomeModal({
    visible,
    title = '¡Bienvenido a',
    subtitle = 'BIVI CONNECT!',
    buttonText = 'Continuar',
    onClose,
    icon = 'check',
}: Props) {
    const scaleAnim = new Animated.Value(0);

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            scaleAnim.setValue(0);
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <StatusBar barStyle="light-content" hidden={false} />
            
            {/* Fondo oscuro */}
            <View style={styles.fullScreen}>
                {/* Overlay oscuro */}
                <View style={styles.overlay}>
                    {/* Modal animado */}
                    <Animated.View
                        style={[
                            styles.container,
                            {
                                transform: [{ scale: scaleAnim }],
                            },
                        ]}
                    >
                        {/* Decoración superior - círculos */}
                        <View style={styles.decorationTop}>
                            <View style={[styles.circle, styles.circleLarge]} />
                            <View style={[styles.circle, styles.circleSmall]} />
                        </View>

                        {/* Logo de la abeja BIVI */}
                        <Image
                            source={require('../../../../assets/bivi-bee-mascot.png')}
                            style={styles.beeImage}
                            resizeMode="contain"
                        />

                        {/* Título */}
                        <Text style={styles.title}>{title}</Text>

                        {/* Subtítulo */}
                        <Text style={styles.subtitle}>{subtitle}</Text>

                        {/* Texto de bienvenida */}
                        <Text style={styles.welcomeText}>
                            Estamos emocionados de tenerte con nosotros. 🎉
                        </Text>

                        {/* Botón */}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>{buttonText}</Text>
                        </TouchableOpacity>

                        {/* Decoración inferior - línea */}
                        <View style={styles.decorationBottom} />
                    </Animated.View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        padding: 40,
        width: '100%',
        maxWidth: 350,
        alignItems: 'center',
        shadowColor: '#E91E63',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
    },
    decorationTop: {
        position: 'absolute',
        top: -30,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    circle: {
        borderRadius: 50,
    },
    circleLarge: {
        width: 60,
        height: 60,
        backgroundColor: '#E91E63',
        opacity: 0.2,
    },
    circleSmall: {
        width: 40,
        height: 40,
        backgroundColor: '#9C27B0',
        opacity: 0.15,
    },
    beeImage: {
        width: 120,
        height: 120,
        marginBottom: 20,
        marginTop: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666666',
        textAlign: 'center',
        marginBottom: 0,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#E91E63',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 40,
        letterSpacing: 1,
    },
    welcomeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#999999',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    button: {
        backgroundColor: '#E91E63',
        paddingVertical: 14,
        paddingHorizontal: 50,
        borderRadius: 12,
        minWidth: 200,
        shadowColor: '#E91E63',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    decorationBottom: {
        marginTop: 20,
        width: 50,
        height: 4,
        backgroundColor: '#E91E63',
        borderRadius: 2,
        opacity: 0.3,
    },
});