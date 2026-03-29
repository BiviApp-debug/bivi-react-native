import { Image, View, Text, Alert, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import RoundedButton from '../../../components/RoundedButton';
import DefaultTextInputUser from '../../../components/DefaultTextInputUser';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigator/MainStackNavigator';
import styles from './Styles';
import React, { useContext, useEffect, useState } from 'react';
import validatePhone from '../../../utils/PhoneValidator';
import { saveMessageToFirestore } from './loginFunctions';
import { dataContext } from '../../../context/Authcontext';
import { API_BASE_URL } from '../../../API/API';
import YellowRoundedButton from '../../../components/YellowRoundedButton';
import { getUpdates } from '../../../utils/getUpdatePlans';
import ResetPasswordModalUser from '../../../utils/ResetPasswordModalUser';
import { loadSavedPhone } from '../../../utils/SavedPhoneFunctios';
import DefaultTextInputUserLogin from '../../../components/DefaultTextInputUserLogin';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ErrorModal from '../../../components/ErrorModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessModal from '../../../components/SuccessModal';

interface Props extends StackScreenProps<RootStackParamList, "UserLoginScreen"> { };

export default function UserLoginScreen({ navigation, route }: Props) {

    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showUpdateButon, SetshowUpdateButon] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [loadingPayment, setLoadingPayment] = useState(false);
    const [showScreen, setShowScreen] = useState(false);

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const [loadingStatus, setLoadingStatus] = useState("Iniciando...")

    const { authResponse, setAuthResponse } = useContext(dataContext)

    useEffect(() => {
        if (authResponse.message === "Login exitoso") {
            navigation.replace('ClientHomeScreen')
        }
    }, [authResponse])

    useEffect(() => {
        (async () => {
            try {
                setLoadingStatus("Conectando con el servidor...");

                // Agregar timeout para detectar servidor lento
                const timeout = setTimeout(() => {
                    setLoadingStatus("El servidor está despertando, esto puede tomar 30-60 segundos...");
                }, 5000);

                let ActivateUpdate = await getUpdates();
                clearTimeout(timeout);

                if (ActivateUpdate) {
                    if (ActivateUpdate[0].updateapp == "true") {
                        SetshowUpdateButon(ActivateUpdate[0].updateapp)
                    }
                }

                setLoadingStatus("Verificando credenciales guardadas...");
                let getStorage = await loadSavedPhone();
                console.log(getStorage,"holas_stoage");
                
                if (getStorage && getStorage.includes("[storage-client]")) {
                    setLoadingStatus("Iniciando sesión automáticamente...");
                    setLoadingPayment(true);
                    let myStorage = getStorage.split("[storage-client]");
                    let login_response = await saveMessageToFirestore(myStorage[0], myStorage[1]);
                    setLoadingPayment(false);

                    if (login_response && !login_response.__loginError) {
                        setAuthResponse(login_response);
                    } else {
                        await AsyncStorage.removeItem('savedPhone');
                        const serverMsg = login_response?.message;
                        if (isActiveSessionError(serverMsg)) {
                            setErrorMessage(
                                "Ya tienes una sesión iniciada en otro celular. Cierra sesión en ese dispositivo o restablece tu contraseña para volver a entrar aquí."
                            );
                        } else {
                            setErrorMessage(
                                "Tu contraseña fue cambiada recientemente.\nPor favor inicia sesión con tu nueva contraseña."
                            );
                        }
                        setShowErrorModal(true);
                        setShowScreen(true);
                    }
                } else {
                    await AsyncStorage.removeItem('savedPhone');
                    setShowScreen(true);
                }
            } catch (error) {
                console.error("Error en carga inicial:", error);
                setErrorMessage("Error al conectar con el servidor. Por favor intenta de nuevo.");
                setShowErrorModal(true);
                setShowScreen(true); // Mostrar pantalla de login de todas formas
            }
        })()
    }, [])

    const isActiveSessionError = (msg: string | null | undefined): boolean => {
        if (!msg) return false;
        const lower = msg.toLowerCase();
        return lower.includes('active session') || lower.includes('sesión activa') ||
            lower.includes('session') && lower.includes('active') ||
            lower.includes('already') || lower.includes('ya hay');
    };

    const handleLogin = async () => {
        if (phone === "" || password == "") {
            setLoadingPayment(false)
            setErrorMessage("El numero y el password no pueden estar vacios");
            setShowErrorModal(true);
            return;
        }
        
        if (!validatePhone(phone)) {
            setErrorMessage("El numero no es valido");
            setShowErrorModal(true);
            setLoadingPayment(false)
            return;
        }

        try {
            setLoadingPayment(true);
            
            let login_response = await saveMessageToFirestore(phone, password);
            console.log(login_response,"hols_Datos_estimados")
            if (login_response && !login_response.__loginError) {
                setAuthResponse(login_response);
            } else {
                setLoadingPayment(false);
                const serverMsg = login_response?.message;
                if (isActiveSessionError(serverMsg)) {
                    setErrorMessage(
                        "Ya tienes una sesión iniciada en otro celular. Cierra sesión en ese dispositivo o restablece tu contraseña para volver a entrar aquí."
                    );
                } else {
                    setErrorMessage(serverMsg || "Credenciales incorrectas. Por favor verifica.");
                }
                setShowErrorModal(true);
                
            }
        } catch (error) {
            setLoadingPayment(false);
            setErrorMessage("Error al loguear usuario " + error);
            setShowErrorModal(true);
            return;
        }
    }

    if (!showScreen) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>
                    {loadingStatus}
                </Text>
                {loadingStatus.includes("despertando") && (
                    <Text style={styles.title}>
                        Los servidores gratuitos se duermen tras inactividad.{"\n"}
                        La próxima vez será más rápido.
                    </Text>
                )}
            </View>
        )
    }

    return (
        <KeyboardAwareScrollView
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
            extraScrollHeight={Platform.OS === 'android' ? 50 : 0}
        >
            <View style={styles.container}>
                {/* Header con fondo púrpura */}
                <View style={styles.headerPurple}>
                    <Image
                        source={require("../../../../assets/bivi-bee-mascot.png")}
                        style={styles.logoHeader}
                    />
                    <Text style={styles.headerTitle}>Bienvenido de vuelta</Text>
                    <Text style={styles.headerSubtitle}>Consumer Intelligence</Text>
                </View>

                {/* Contenedor del formulario */}
                <View style={styles.formContainer}>
                    
                    {/* Campo de Teléfono */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Número de Teléfono</Text>
                        <DefaultTextInputUser
                            icon={require("../../../../assets/phone.png")}
                            placeholder='3001234567'
                            onChangeText={text => setPhone(text)}
                            value={phone}
                            keyBoarType='numeric'
                            secureText={false}
                        />
                    </View>

                    {/* Campo de Contraseña */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Contraseña</Text>
                        <DefaultTextInputUserLogin
                            icon={require("../../../../assets/candado.png")}
                            placeholder='••••••••'
                            onChangeText={text => setPassword(text)}
                            value={password}
                            keyBoarType='default'
                            secureText={true}
                        />
                    </View>

                    {/* Botón Login */}
                    {showUpdateButon ? (
                        <RoundedButton
                            text="Actualizar"
                            onPress={() => SetshowUpdateButon(false)}
                            color='#E91E63'
                        />
                    ) : (
                        <RoundedButton
                            text={loadingPayment ? "Cargando..." : "Entrar a BIVI"}
                            onPress={() => {
                                handleLogin();
                            }}
                            color='#E91E63'
                        />
                    )}

                    {/* Recuperar contraseña */}
                    <TouchableOpacity 
                        style={styles.forgotPasswordContainer}
                        onPress={() => setShowResetModal(true)}
                    >
                        <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>

                    {/* Registro */}
                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>¿No tienes cuenta?</Text>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('UserRegisterScreen')}
                            style={styles.registerButton}
                        >
                            <Text style={styles.registerButtonText}>Regístrate gratis</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Modales */}
                <ResetPasswordModalUser
                    visible={showResetModal}
                    onClose={() => setShowResetModal(false)}
                    onSuccess={async (resetPhone, resetPassword) => {
                        setShowResetModal(false);
                        setLoadingPayment(true);
                        try {
                            const login_response = await saveMessageToFirestore(resetPhone, resetPassword);
                            if (login_response && !login_response.__loginError) {
                                setAuthResponse(login_response);
                            } else {
                                const serverMsg = login_response?.message;
                                if (isActiveSessionError(serverMsg)) {
                                    setErrorMessage(
                                        "Contraseña actualizada. Si tenías sesión en otro celular, vuelve a intentar en este dispositivo."
                                    );
                                } else {
                                    setErrorMessage("Contraseña actualizada. Por favor inicia sesión manualmente.");
                                }
                                setShowErrorModal(true);
                            }
                        } catch (_) {
                            setErrorMessage("Contraseña actualizada. Por favor inicia sesión manualmente.");
                            setShowErrorModal(true);
                        } finally {
                            setLoadingPayment(false);
                        }
                    }}
                />
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
            </View>
        </KeyboardAwareScrollView>
    )
}