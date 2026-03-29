import { Image, View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, ActivityIndicator, Animated } from 'react-native';
import RoundedButton from '../../../components/RoundedButton';
import DefaultTextInput from '../../../components/DefaultTextInput';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigator/MainStackNavigator';
import styles from './Styles';
import { useContext, useState, useRef } from 'react';
import validatePhone from '../../../utils/PhoneValidator';
import validateEmail from '../../../utils/EmailValidator';
import { saveMessageToFirestore } from './RegisterFunctions';
import { saveMessageToFirestore as validateLogin } from '../login_user/loginFunctions';
import React from 'react';
import KeyboardAwareView from '../../animatedControl/KeyboardAwareView';

import { enviarSMS } from '../../../utils/EnviarSMS';
import { SendMail } from '../../../utils/SendMail';
import { getUserByPhone } from '../../../utils/getUserByPhone';
import { getUserByEmail } from '../../../utils/getUserByEmail';
import { dataContext } from '../../../context/Authcontext';
import WelcomeModal from './WelcomeModal';
import DefaultTextInputDriverBlack from '../../../components/DefaultTextInputDriverBlack';
import YellowRoundedButton from '../../../components/YellowRoundedButton';
import CheckboxTerminos from '../../../utils/CheckboxTerminos';
import DefaultTextInputValidate from '../../../components/DefaultTextInputValidate';
import DefaultTextInputDriverBlackPassword from '../../../components/DefaultTextInputDriverBlackPassword';
import ErrorModal from '../../../components/ErrorModal';
import SuccessModal from '../../../components/SuccessModal';

interface Props extends StackScreenProps<RootStackParamList, "UserRegisterScreen"> { };

export default function UserRegisterScreen({ navigation, route }: Props) {

  // ===== DATOS DEL FORMULARIO =====
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ===== CONTROL DEL CARRUSEL =====
  const [currentStep, setCurrentStep] = useState(1); // Paso 1, 2, 3
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ===== VERIFICACIÓN =====
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [userToken, setUserToken] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const { authResponse, setAuthResponse } = useContext(dataContext)
  const [aceptoTerminos, setAceptoTerminos] = useState(false)

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [isRegistering, setIsRegistering] = useState(false);

  // ===== FUNCIONES =====

  function generarTokenBase64Legible(longitud = 32) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < longitud; i++) {
      const randomIndex = Math.floor(Math.random() * caracteres.length);
      resultado += caracteres[randomIndex];
    }
    return btoa(resultado);
  }

  const generarCodigoVerificacion = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  const goToNextStep = () => {
    Animated.timing(slideAnim, {
      toValue: currentStep,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setCurrentStep(currentStep + 1);
  }

  const goToPrevStep = () => {
    if (currentStep > 1) {
      Animated.timing(slideAnim, {
        toValue: currentStep - 2,
        duration: 300,
        useNativeDriver: false,
      }).start();
      setCurrentStep(currentStep - 1);
    } else {
      navigation.pop();
    }
  }

  // ===== VALIDACIONES POR PASO =====

  const validateStep1 = () => {
    if (phone === "") {
      setErrorMessage("El campo de teléfono no puede estar vacío");
      setShowErrorModal(true);
      return false;
    }
    if (!validatePhone(phone)) {
      setErrorMessage("El número no es válido");
      setShowErrorModal(true);
      return false;
    }
    return true;
  }

  const validateStep2 = () => {
    if (name === "") {
      setErrorMessage("El nombre no puede estar vacío");
      setShowErrorModal(true);
      return false;
    }
    if (lastName === "") {
      setErrorMessage("El apellido no puede estar vacío");
      setShowErrorModal(true);
      return false;
    }
    return true;
  }

  const validateStep3 = () => {
    if (mail === "") {
      setErrorMessage("El correo no puede estar vacío");
      setShowErrorModal(true);
      return false;
    }
    if (!validateEmail(mail)) {
      setErrorMessage("El email no es válido");
      setShowErrorModal(true);
      return false;
    }
    if (password === "") {
      setErrorMessage("La contraseña no puede estar vacía");
      setShowErrorModal(true);
      return false;
    }
    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres");
      setShowErrorModal(true);
      return false;
    }
    if (confirmPassword === "") {
      setErrorMessage("Confirma tu contraseña");
      setShowErrorModal(true);
      return false;
    }
    if (confirmPassword !== password) {
      setErrorMessage("Las contraseñas no coinciden");
      setShowErrorModal(true);
      return false;
    }
    if (!aceptoTerminos) {
      setErrorMessage("Debes aceptar los términos y condiciones");
      setShowErrorModal(true);
      return false;
    }
    return true;
  }

  // ===== MANEJADORES DE PASOS =====

  const handleStep1Continue = async () => {
    if (!validateStep1()) return;

    try {
      setIsRegistering(true);
      let verifyUserbyPhone = await getUserByPhone(phone);

      if (verifyUserbyPhone) {
        setErrorMessage("El número ya está registrado");
        setShowErrorModal(true);
        setIsRegistering(false);
        return;
      }

      setIsRegistering(false);
      goToNextStep();
    } catch (error) {
      setIsRegistering(false);
      setErrorMessage("Error: " + error);
      setShowErrorModal(true);
    }
  }

  const handleStep2Continue = () => {
    if (!validateStep2()) return;
    goToNextStep();
  }

  const handleStep3Continue = async () => {
    if (!validateStep3()) return;

    try {
      setIsRegistering(true);

      let verifyUserbyEmail = await getUserByEmail(mail);
      if (verifyUserbyEmail) {
        setErrorMessage("El correo ya está registrado");
        setShowErrorModal(true);
        setIsRegistering(false);
        return;
      }

      // Generar código de verificación
      const codigo = generarCodigoVerificacion();
      setVerificationCode(codigo);

      // Enviar SMS
      const response = await enviarSMS(phone, codigo);
      console.log(response, "status_sms");

      setIsRegistering(false);
      setShowVerificationModal(true);

    } catch (error) {
      setIsRegistering(false);
      setErrorMessage("Error al enviar código: " + error);
      setShowErrorModal(true);
    }
  }

  const handleVerifyCode = async () => {
    if (inputCode === "") {
      setErrorMessage("Ingresa el código de verificación");
      setShowErrorModal(true);
      return;
    }

    if (inputCode !== verificationCode) {
      setErrorMessage("El código ingresado es incorrecto");
      setShowErrorModal(true);
      return;
    }

    try {
      setIsRegistering(true);
      const token = generarTokenBase64Legible();
      await saveMessageToFirestore(name, lastName, mail, password, phone, token)

      setShowVerificationModal(false);
      setIsRegistering(false);

      (async () => {
        setShowSuccess(true)
        setTimeout(() => {
          handleLogin(phone, password)
        }, 2000);
      })()
    } catch (error) {
      setIsRegistering(false);
      setErrorMessage("Error al completar el registro: " + error);
      setShowErrorModal(true);
    }
  }

  const handleLogin = async (validPhone: string, validPassword: string) => {
    try {
      let login_response = await validateLogin(validPhone, validPassword);
      if (login_response) {
        setAuthResponse(login_response)
      }
    } catch (error) {
      setErrorMessage("Error al loguear usuario " + error);
      setShowErrorModal(true);
    }
  }

  // ===== RENDERIZADO DE PASOS =====

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 1 DE 4</Text>
        <Text style={styles.stepTitle}>Tu número es tu identidad</Text>
        <Text style={styles.stepSubtitle}>Será esencial para verificar que eres real</Text>
      </View>

      <View style={styles.inputsContainer}>
        <Text style={styles.inputLabel}>Teléfono</Text>
        <DefaultTextInputDriverBlack
          icon={require("../../../../assets/profile_phone.png")}
          placeholder='+1 800 000 0000'
          onChangeText={text => setPhone(text)}
          value={phone}
          keyBoarType='numeric'
          secureText={false}
        />
        <Text style={styles.helperText}>Nunca compartiremos tu número sin permiso.</Text>
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text={isRegistering ? "Verificando..." : "Continuar"}
          onPress={handleStep1Continue}
          color='#E91E63'
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 2 DE 4</Text>
        <Text style={styles.stepTitle}>Cuéntanos de ti</Text>
        <Text style={styles.stepSubtitle}>Personalizamos tus oportunidades según tu perfil</Text>
      </View>

      <View style={styles.inputsContainer}>
        <View>
          <Text style={styles.inputLabel}>Nombre completo</Text>
          <DefaultTextInputDriverBlack
            icon={require("../../../../assets/profile_icon_2.png")}
            placeholder='María García'
            onChangeText={text => setName(text)}
            value={name}
            keyBoarType='default'
            secureText={false}
          />
        </View>

        <View>
          <Text style={styles.inputLabel}>Apellido</Text>
          <DefaultTextInputDriverBlack
            icon={require("../../../../assets/profile_icon_2.png")}
            placeholder='García'
            onChangeText={text => setLastName(text)}
            value={lastName}
            keyBoarType='default'
            secureText={false}
          />
        </View>
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text="Continuar"
          onPress={handleStep2Continue}
          color='#E91E63'
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 3 DE 4</Text>
        <Text style={styles.stepTitle}>Crea tu cuenta</Text>
        <Text style={styles.stepSubtitle}>Email y contraseña para acceder siempre</Text>
      </View>

      <View style={styles.inputsContainer}>
        <View>
          <Text style={styles.inputLabel}>Email</Text>
          <DefaultTextInputDriverBlack
            icon={require("../../../../assets/profile_mail.png")}
            placeholder='tu@email.com'
            onChangeText={text => setMail(text)}
            value={mail}
            keyBoarType='email-address'
            secureText={false}
          />
        </View>

        <View>
          <Text style={styles.inputLabel}>Contraseña</Text>
          <DefaultTextInputDriverBlackPassword
            icon={require("../../../../assets/profile_key.png")}
            placeholder='Mínimo 6 caracteres'
            onChangeText={text => setPassword(text)}
            value={password}
            keyBoarType='default'
            secureText={true}
          />
        </View>

        <View>
          <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
          <DefaultTextInputDriverBlackPassword
            icon={require("../../../../assets/profile_key.png")}
            placeholder='Mínimo 6 caracteres'
            onChangeText={text => setConfirmPassword(text)}
            value={confirmPassword}
            keyBoarType='default'
            secureText={true}
          />
        </View>

        <CheckboxTerminos
          onChange={(value: any) => setAceptoTerminos(value)}
        />
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text={isRegistering ? "Procesando..." : "Crear Cuenta"}
          onPress={handleStep3Continue}
          color='#E91E63'
        />
      </View>
    </View>
  );

  // ===== RENDER PRINCIPAL =====

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        {/* Header Púrpura */}
        <View style={styles.headerPurple}>
           <TouchableOpacity
                onPress={() => navigation.pop()}
                style={styles.back_button}
              >
                <Image
                  style={styles.back_img}
                  source={require("../../../../assets/profile_flecha.png")}
                />
              </TouchableOpacity>
          <Text style={styles.headerTitle}>BIVI CONNECT</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStep / 4) * 100}%` }]} />
          </View>
        </View>

        {/* Contenedor de pasos */}
        <View style={styles.stepsWrapper}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </View>
      </View>

      {/* Modal de Verificación */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verificación tu Teléfono</Text>
            <Image
              source={require("../../../../assets/verify_icon.png")}
              style={styles.imageCheckIcon}
            />
            <Text style={styles.modalText}>
              Ingresa el código de 6 dígitos que enviamos a tu teléfono
            </Text>

            <DefaultTextInputValidate
              icon={require("../../../../assets/chat_icon.png")}
              placeholder=''
              onChangeText={text => setInputCode(text)}
              value={inputCode}
              keyBoarType='numeric'
              secureText={false}
            />

            <View style={styles.modalButtons}>
              {isRegistering ? (
                <View style={{ alignItems: 'center', marginVertical: 10 }}>
                  <ActivityIndicator size="large" color="#E91E63" />
                  <Text style={{ color: "#333", marginTop: 10 }}>
                    Verificando...
                  </Text>
                </View>
              ) : (
                <>
                  <RoundedButton
                    text="Confirmar"
                    onPress={handleVerifyCode}
                    color='#E91E63'
                  />
                  <TouchableOpacity 
                    onPress={() => setShowVerificationModal(false)}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <WelcomeModal
        visible={showSuccess}
        title=""
        subtitle="¡Bienvenido Cliente UBERO!"
        buttonText="Continuar"
        icon="check"
        onClose={() => setShowSuccess(false)}
      />
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </KeyboardAvoidingView>
  );
}