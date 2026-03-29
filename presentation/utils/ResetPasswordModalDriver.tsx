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
let OtpVerify: any = null;
try { OtpVerify = require('react-native-otp-verify').default; } catch (_) {}
import { Ionicons } from '@expo/vector-icons';
import { enviarSMS } from './EnviarSMS';
import { updatePasswordDriver } from './ResetPasswordDriver';
import { getDriverByPhone } from './getDriverByPhone';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';
import * as Notifications from 'expo-notifications';



interface Props {
    visible: boolean;
    onClose: () => void;
    onSuccess: (phone: string, newPassword: string) => void;
}

type Step = 'phone' | 'code' | 'password';


Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function ResetPasswordModalDriver({
    visible,
    onClose,
    onSuccess,
}: Props) {
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
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

    const applyOtpCode = useCallback((rawCode: string) => {
        const cleaned = (rawCode || '').replace(/\D/g, '').slice(0, 6);
        const digits = cleaned.split('');
        const paddedDigits = Array.from({ length: 6 }, (_, i) => digits[i] || '');
        setOtpDigits(paddedDigits);
        setInputCode(cleaned);

        if (cleaned.length === 6) {
            setTimeout(() => handleVerifyCodeAuto(cleaned), 150);
        } else {
            otpRefs.current[Math.min(cleaned.length, 5)]?.focus();
        }
    }, [handleVerifyCodeAuto]);

    const handleOtpChange = useCallback((text: string, index: number) => {
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length > 1) {
            applyOtpCode(cleaned);
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
    }, [otpDigits, applyOtpCode, handleVerifyCodeAuto]);

    const handleOtpKeyPress = useCallback((e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
            const newDigits = [...otpDigits];
            newDigits[index - 1] = '';
            setOtpDigits(newDigits);
            setInputCode(newDigits.join(''));
            otpRefs.current[index - 1]?.focus();
        }
    }, [otpDigits]);

    // ── Android SMS User Consent: detecta el SMS automáticamente ──
    useEffect(() => {
        if (step !== 'code' || Platform.OS !== 'android') return;

        const fillFromSms = (message: string) => {
            const match = message?.match(/\b\d{6}\b/);
            if (!match) return;
            applyOtpCode(match[0]);
        };

        if (OtpVerify?.getOtp) {
            OtpVerify.getOtp()
                .then(() => OtpVerify.addListener(fillFromSms))
                .catch(() => {});
        }

        return () => { OtpVerify?.removeListener?.(); };
    }, [step, handleVerifyCodeAuto, applyOtpCode]);

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
        if (phone.trim().length < 10) {
            setErrorMessage("Ingresa un número de teléfono válido");
            setShowErrorModal(true);
            return;
        }

        try {
            setLoading(true);

            let verifyUserbyPhone = await getDriverByPhone(phone)

            if (!verifyUserbyPhone) {
                setErrorMessage("No existe en la data");
                setShowErrorModal(true);
            } else {

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
                    setErrorMessage("No se pudo enviar el código'");
                    setShowErrorModal(true);
                }
            }


        } catch (error) {
            console.error('Error sending code:', error);
            setErrorMessage("Ocurrió un error al enviar el código");
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    // Paso 2: Verificar código
    const handleVerifyCode = () => {
        if (inputCode.trim() === '') {
            setErrorMessage("Ingresa el código de verificación");
            setShowErrorModal(true);
            return;
        }

        if (inputCode !== verificationCode) {
            setErrorMessage("El código ingresado es incorrecto");
            setShowErrorModal(true);
            return;
        }

        setStep('password');
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

            const result = await updatePasswordDriver(
                phone,
                newPassword,
            );

            if (result.message == "Contraseña actualizada correctamente") {
                setSuccessMessage(`✅ Contraseña actualizada`);
                await AsyncStorage.setItem('savedPhone', `${phone}[storage-driver]${newPassword}`);
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
        setPhone('');
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
                            Ingresa tu número de teléfono registrado
                        </Text>

                        <View style={styles.inputContainer}>
                            <Image
                                source={require('../../assets/profile_phone.png')}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Número de teléfono"
                                placeholderTextColor="#999"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
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

                        <View style={styles.pasteContainer}>
                            <TextInput
                                style={styles.pasteInput}
                                value={inputCode}
                                onChangeText={applyOtpCode}
                                placeholder="Pega aquí el código de 6 dígitos"
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                                textContentType="oneTimeCode"
                                autoComplete="sms-otp"
                                maxLength={6}
                                selectTextOnFocus
                            />
                        </View>

                        {/* 6 cajas OTP con auto-fill iOS/Android */}
                        <View style={styles.otpRow}>
                            {otpDigits.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={ref => { otpRefs.current[index] = ref; }}
                                    style={[
                                        styles.otpBox,
                                        digit ? styles.otpBoxFilled : null,
                                    ]}
                                    value={digit}
                                    onChangeText={text => handleOtpChange(text, index)}
                                    onKeyPress={e => handleOtpKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                    textContentType="oneTimeCode"
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
                                keyboardType={'default'}
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
                                keyboardType={'default'}
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
            </KeyboardAvoidingView>
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
        backgroundColor: '#FFCC28',
        transform: [{ scale: 1.2 }],
    },
    progressLine: {
        width: 40,
        height: 2,
        backgroundColor: '#E0E0E0',
    },
    progressLineActive: {
        backgroundColor: '#FFCC28',
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
    eyeButton: {
        position: 'absolute',
        right: 16,
        padding: 8,
    },
    button: {
        backgroundColor: '#FFCC28',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#FFCC28',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: '#CCC',
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 8,
    },
    pasteContainer: {
        marginBottom: 14,
    },
    pasteInput: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#000',
        textAlign: 'center',
        letterSpacing: 2,
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
        borderColor: '#FFCC28',
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