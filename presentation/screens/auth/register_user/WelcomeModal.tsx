import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    StatusBar,
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
    title = '¡Bienvenido',
    subtitle = 'Cliente UBERO!',
    buttonText = 'OK',
    onClose,
    icon = 'car',
}: Props) {

    const getIcon = () => {
        switch (icon) {
            case 'car':
                return '🚗';
            case 'moto':
                return '🏍️';
            case 'user':
                return '👤';
            case 'check':
                return '✓';
            case 'warning':
                return '⚠️';
            default:
                return '🚗';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={false} // ✅ Cambiado a false para ocupar toda la pantalla
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent // ✅ Para que cubra el status bar
        >
            {/* ✅ Ocultar status bar */}
            <StatusBar hidden />
            
            {/* ✅ Contenedor principal que ocupa todo */}
            <View style={styles.fullScreen}>
                {/* Header amarillo con logo */}
                <View style={styles.header}>
                    <Image
                        source={require('../../../../assets/logo.png')}
                        style={styles.logo}
                    />
                    <Image
                        source={require('../../../../assets/moto_icon.png')}
                        style={styles.moto}
                    />
                </View>

                {/* Overlay oscuro */}
                <View style={styles.overlay}>
                    {/* Modal blanco */}
                    <View style={styles.container}>
                        <Image
                            source={require('../../../../assets/modal_car_icon.png')}
                            style={styles.auto}
                        />

                        {/* Título */}
                        <Text style={styles.title}>{title}</Text>

                        {/* Subtítulo */}
                        <Text style={styles.subtitle}>{subtitle}</Text>

                        {/* Botón OK */}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>{buttonText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        backgroundColor: '#FFCC28',
        paddingTop: 50, 
        paddingBottom: 0,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    auto: {
        width: 60,
        height: 60,
        marginBottom: 0,
    },
    logo: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 10,
    },
    moto: {
        width: 70,
        height: 60,
        position: 'absolute',
        left: 20,
        bottom: -6,
    },
    overlay: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    container: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 30,
        width: '100%',
        maxHeight: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        marginBottom: 50,
        height: '70%',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#000',
        textAlign: 'center',
        width: "90%",
        marginBottom: 60,
        lineHeight: 60,
        letterSpacing: 1,
    },
    button: {
          display:'none',
        backgroundColor: '#FFCC28',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 8,
        minWidth: 120,
        shadowColor: '#FFCC28',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {      
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
});