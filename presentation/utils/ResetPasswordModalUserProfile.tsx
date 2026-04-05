import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
// Carga condicional: funciona sin rebuild (cuando no está compilado, OtpVerify es null)
let OtpVerify: any = null;
try { OtpVerify = require('react-native-otp-verify').default; } catch {}
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enviarSMS } from './EnviarSMS';
import { getUserByPhone } from './getUserByPhone';
import { ResetPasswordUSer } from './ResetPasswordUSer';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';
import * as Notifications from 'expo-notifications';

interface Props {
    phone: string;
    visible: boolean;
    onClose: () => void;
    onSuccess: (phone: string, newPassword: string) => void;
}

type Step = 'phone' | 'code' | 'password';
const OTP_FIELD_KEYS = ['otp-1', 'otp-2', 'otp-3', 'otp-4', 'otp-5', 'otp-6'] as const;

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function ResetPasswordModalUserProfile({
    phone,
    visible,
    onClose,
    onSuccess,
}: Readonly<Props>) {

    const [step, setStep] = useState<Step>('phone');
    const [verificationCode, setVerificationCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Estados para mostrar/ocultar contraseñas
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // OTP boxes (6 dígitos individuales)
    const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
    const otpRefs = useRef<(TextInput | null)[]>([]);

    const handleOtpChange = useCallback((text: string, index: number) => {
        // iOS/Android puede pegar los 6 dígitos de golpe en el primer campo
        const cleaned = text.replaceAll(/\D/g, '');
        if (cleaned.length > 1) {
            const digits = cleaned.slice(0, 6).split('');
            const newDigits = [...otpDigits];
            digits.forEach((d, i) => { if (i < 6) newDigits[i] = d; });
            setOtpDigits(newDigits);
            setInputCode(newDigits.join(''));
            const nextIndex = Math.min(digits.length, 5);
            otpRefs.current[nextIndex]?.focus();
            // Auto-verificar si se llenaron los 6
            if (newDigits.every(d => d !== '')) {
                setTimeout(() => handleVerifyCodeAuto(newDigits.join('')), 200);
            }
            return;
        }
        const newDigits = [...otpDigits];
        newDigits[index] = cleaned.slice(-1);
        setOtpDigits(newDigits);
        const code = newDigits.join('');
        setInputCode(code);
        if (cleaned && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
        if (newDigits.every(d => d !== '')) {
            setTimeout(() => handleVerifyCodeAuto(code), 200);
        }
    }, [otpDigits]);

    const handleOtpKeyPress = useCallback((e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
            const newDigits = [...otpDigits];
            newDigits[index - 1] = '';
            setOtpDigits(newDigits);
            setInputCode(newDigits.join(''));
            otpRefs.current[index - 1]?.focus();
        }
    }, [otpDigits]);

    const handleVerifyCodeAuto = useCallback((code: string) => {
        if (code !== verificationCode) {
            setErrorMessage("El código ingresado es incorrecto");
            setShowErrorModal(true);
            setOtpDigits(['', '', '', '', '', '']);
            setInputCode('');
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
            return;
        }
        setStep('password');
    }, [verificationCode]);

    // ── Android SMS User Consent: detecta el SMS automáticamente ──
    useEffect(() => {
        if (step !== 'code' || Platform.OS !== 'android') return;

        const fillFromSms = (message: string) => {
            const match = /\b\d{6}\b/.exec(message || '');
            if (!match) return;
            const digits = match[0].split('');
            setOtpDigits(digits);
            setInputCode(match[0]);
            setTimeout(() => handleVerifyCodeAuto(match[0]), 300);
        };

        // Inicia el listener solo si el módulo nativo está disponible
        if (OtpVerify?.getOtp) {
            OtpVerify.getOtp()
                .then(() => OtpVerify.addListener(fillFromSms))
                .catch(() => {});
        }

        return () => { OtpVerify?.removeListener?.(); };
    }, [step, handleVerifyCodeAuto]);

    const requestNotificationPermissions = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            console.log('⚠️ Permisos de notificación no concedidos');
        }
    };

    React.useEffect(() => {
        if (visible) {
            requestNotificationPermissions();
        }
    }, [visible]);

    // Generar código de 6 dígitos
    const generateCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Paso 1: Enviar código al teléfono
    const handleSendCode = async () => {
        if (!phone || phone.trim().length < 10) {
            setErrorMessage("Ingresa un número de teléfono válido");
            setShowErrorModal(true);
            return;
        }

        try {
            setLoading(true);

            let verifyUserbyPhone = await getUserByPhone(phone)

            if (verifyUserbyPhone) {
                const code = generateCode();
                setVerificationCode(code);

                const response = await enviarSMS(phone, code);

                if (response) {

                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: "📱 Código de Verificación Enviado",
                            body: `Tu código de 6 dígitos es ${code}.`,
                            data: {
                                screen: 'ResetPassword',
                                phone: phone
                            },
                            sound: true,
                            priority: Notifications.AndroidNotificationPriority.HIGH,
                        },
                        trigger: null,
                    });

                    setSuccessMessage("Revisa tu teléfono o en Spam");
                    setShowSuccessModal(true);
                    setStep('code');
                } else {
                    setErrorMessage("No se pudo enviar el código");
                    setShowErrorModal(true);
                }
            } else {
                setErrorMessage("No existe en la data");
                setShowErrorModal(true);
            }

        } catch (error) {
            setErrorMessage("Error sending code:" + error);
            setShowErrorModal(true);
            console.error('Error sending code:', error);
        } finally {
            setLoading(false);
        }
    };

    // Paso 3: Cambiar contraseña
    const handleResetPassword = async () => {
        if (newPassword.trim().length < 6) {
            setErrorMessage("La contraseña debe tener al menos 6 caracteres");
            setShowErrorModal(true);
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage("Las contraseñas no coinciden");
            setShowErrorModal(true);
            return;
        }

        try {
            setLoading(true);
          
            const result = await ResetPasswordUSer({
               phone,
                newPassword,
            });

            if (result.success) {
                setSuccessMessage(`✅ Contraseña actualizada`);
                await AsyncStorage.setItem('savedPhone', `${phone}[storage-client]${newPassword}`);
                setShowSuccessModal(true);
                setTimeout(() => {
                    handleClose();
                    onSuccess(phone, newPassword);
                }, 2000);
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            setErrorMessage("Ocurrió un error al cambiar la contraseña");
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    // Cerrar y resetear
    const handleClose = () => {
        setStep('phone');
        setVerificationCode('');
        setInputCode('');
        setOtpDigits(['', '', '', '', '', '']);
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        onClose();
    };

    // Renderizar contenido según el paso
    const renderStepContent = () => {
        switch (step) {
            case 'phone':
                return (
                    <>
                        <Text style={styles.stepTitle}>Recuperar Contraseña</Text>
                        <Text style={styles.stepDescription}>
                            Verificaremos tu número registrado
                        </Text>

                        <View style={styles.inputContainer}>
                            <Image
                                source={require('../../assets/profile_phone.png')}
                                style={styles.inputIcon}
                            />
                            <Text style={styles.readOnlyPhoneText}>{phone}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSendCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Enviar Código</Text>
                            )}
                        </TouchableOpacity>
                    </>
                );

            case 'code':
                return (
                    <>
                        <Text style={styles.stepTitle}>Verificación</Text>
                        <Text style={styles.stepDescription}>
                            Ingresa el código enviado al {'\n'}{phone}
                        </Text>

                        {/* 6 cajas OTP con auto-fill iOS/Android */}
                        <View style={styles.otpRow}>
                            {OTP_FIELD_KEYS.map((fieldKey, index) => (
                                <TextInput
                                    key={fieldKey}
                                    ref={ref => { otpRefs.current[index] = ref; }}
                                    style={[
                                        styles.otpBox,
                                        otpDigits[index] ? styles.otpBoxFilled : null,
                                    ]}
                                    value={otpDigits[index]}
                                    onChangeText={text => handleOtpChange(text, index)}
                                    onKeyPress={e => handleOtpKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    selectTextOnFocus
                                    // iOS: sugiere automáticamente el código del SMS
                                    textContentType="oneTimeCode"
                                    // Android: muestra sugerencia del SMS en teclado
                                    autoComplete={index === 0 ? "sms-otp" : "off"}
                                    caretHidden={true}
                                />
                            ))}
                        </View>

                        <Text style={styles.otpHint}>
                            El código se completará automáticamente si lo recibes por SMS
                        </Text>

                        <TouchableOpacity
                            style={[styles.button, inputCode.length < 6 && styles.buttonDisabled]}
                            onPress={() => handleVerifyCodeAuto(inputCode)}
                            disabled={inputCode.length < 6}
                        >
                            <Text style={styles.buttonText}>Verificar Código</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={handleSendCode}
                        >
                            <Text style={styles.resendText}>Reenviar código</Text>
                        </TouchableOpacity>
                    </>
                );

            case 'password':
                return (
                    <>
                        <Text style={styles.stepTitle}>Nueva Contraseña</Text>
                        <Text style={styles.stepDescription}>
                            Ingresa tu nueva contraseña
                        </Text>

                        <View style={styles.inputContainer}>
                            <Image
                                source={require('../../assets/profile_key.png')}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Nueva contraseña"
                                placeholderTextColor="#999"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                keyboardType={'numeric'}
                                secureTextEntry={!showNewPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowNewPassword(!showNewPassword)}
                                style={styles.eyeButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                                    size={22}
                                    color="#666"
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Image
                                source={require('../../assets/profile_key.png')}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirmar contraseña"
                                placeholderTextColor="#999"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                keyboardType={'numeric'}
                            />
                            <TouchableOpacity
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={styles.eyeButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                                    size={22}
                                    color="#666"
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Cambiar Contraseña</Text>
                            )}
                        </TouchableOpacity>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                            >
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Progress Indicator */}
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressDot, step === 'phone' && styles.progressDotActive]} />
                            <View style={[styles.progressLine, (step === 'code' || step === 'password') && styles.progressLineActive]} />
                            <View style={[styles.progressDot, (step === 'code' || step === 'password') && styles.progressDotActive]} />
                            <View style={[styles.progressLine, step === 'password' && styles.progressLineActive]} />
                            <View style={[styles.progressDot, step === 'password' && styles.progressDotActive]} />
                        </View>

                        {/* Step Content */}
                        <View style={styles.content}>
                            {renderStepContent()}
                        </View>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleClose}
                        >
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            <ErrorModal
                visible={showErrorModal}
                message={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />
            <SuccessModal
                visible={showSuccessModal}
                message={successMessage}
                onClose={() => setShowSuccessModal(false)}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    header: {
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    closeButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        fontSize: 24,
        color: '#666',
        fontWeight: '300',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#E0E0E0',
    },
    progressDotActive: {
        backgroundColor: '#E91E63',
        transform: [{ scale: 1.2 }],
    },
    progressLine: {
        width: 40,
        height: 2,
        backgroundColor: '#E0E0E0',
    },
    progressLineActive: {
        backgroundColor: '#E91E63',
    },
    content: {
        marginBottom: 20,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
        marginBottom: 8,
    },
    stepDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        position: 'relative',
    },
    inputIcon: {
        width: 20,
        height: 20,
        marginRight: 12,
        tintColor: '#666',
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#000',
        paddingRight: 40,
    },
    readOnlyPhoneText: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#000',
        fontWeight: '600',
    },
    eyeButton: {
        position: 'absolute',
        right: 16,
        padding: 8,
    },
    button: {
        backgroundColor: '#E91E63',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#E91E63',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: '#CCC',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 8,
    },
    otpBox: {
        flex: 1,
        height: 54,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        backgroundColor: '#F5F5F5',
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
    },
    otpBoxFilled: {
        borderColor: '#E91E63',
        backgroundColor: '#FFFDE7',
    },
    otpHint: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
        marginBottom: 20,
        lineHeight: 16,
    },
    resendButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    resendText: {
        color: '#2E86DE',
        fontSize: 14,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelText: {
        color: '#666',
        fontSize: 15,
        fontWeight: '500',
    },
});