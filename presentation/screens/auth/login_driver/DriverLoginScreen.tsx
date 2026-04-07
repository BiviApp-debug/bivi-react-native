import { Image, View, Text, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import RoundedButton from '../../../components/RoundedButton';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigator/MainStackNavigator';
import styles from './Styles';
import React, { useContext, useEffect, useState } from 'react';
import validatePhone from '../../../utils/PhoneValidator';
import { saveMessageToFirestore } from './loginFunctions';
import { dataContext } from '../../../context/Authcontext';
import SubscriptionModal from './SubscriptionModal';
import { getDriverByPhone } from '../../../utils/getDriverByPhone';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../../API/API';
import { fetchSubscriptionStatus } from '../../../utils/VerifySuscription';
import { getUpdates } from '../../../utils/getUpdatePlans';
import ResetPasswordModalDriver from '../../../utils/ResetPasswordModalDriver';
import { loadSavedPhone } from '../../../utils/SavedPhoneFunctios';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ErrorModal from '../../../components/ErrorModal';
import SuccessModal from '../../../components/SuccessModal';
import AsyncStorage from '@react-native-async-storage/async-storage'
import DefaultTextInputUserLogin from '../../../components/DefaultTextInputUserLogin';
import DefaultTextInputUserCountry from '../../../components/DefaultTextInputUserCountry';
import { getCountries } from '../../../utils/getCountries';

const socket = io(`${API_BASE_URL}`, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
}); // 

interface Props extends StackScreenProps<RootStackParamList, "DriverLoginScreen"> { };

export default function DriverLoginScreen({ navigation }: Readonly<Props>) {


  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showUpdateButon, setShowUpdateButon] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [showScreen, setShowScreen] = useState(false);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [loadingStatus, setLoadingStatus] = useState("Iniciando...")
  const [selectedCode, setSelectedCode] = useState('+57');
  const [showCodes, setShowCodes] = useState(false);
  const [countryCodes, setCountryCodes] = useState<any[]>([]);

  const { authResponse, setAuthResponse } = useContext(dataContext)

  useEffect(() => {
    if (authResponse.message === "Login exitoso") {
       navigation.navigate("DriverHomeScreen", {
                screen: "DriverProfileScreen",
            });
     
    }
  }, [authResponse])





  function generarTokenBase64Legible(longitud = 32) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < longitud; i++) {
      const randomIndex = Math.floor(Math.random() * caracteres.length);
      resultado += caracteres[randomIndex];
    }
    return btoa(resultado);
  }


  useEffect(() => {
    socket.on("payment_success", (data) => {
      //console.log(data,"las_datas");
    });

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
        
     /*     if (ActivateUpdate[0].updateapp == "true") {
            SetshowUpdateButon(ActivateUpdate[0].updateapp)
          }*/
        }

        setLoadingStatus("Verificando credenciales guardadas...");
        let getStorage = await loadSavedPhone();

        if (getStorage && getStorage.includes("[storage-driver]")) {
          setLoadingStatus("Iniciando sesión automáticamente...");
          setLoadingPayment(true);
          let myStorage = getStorage.split("[storage-driver]");
          let login_response = await saveMessageToFirestore(myStorage[0], myStorage[1]);
          setLoadingPayment(false);

          if (login_response && !login_response.__loginError) {
            setAuthResponse(login_response);
          } else {
            await AsyncStorage.removeItem('savedPhone');
            setErrorMessage(
              "Tu contraseña fue cambiada recientemente.\nPor favor inicia sesión con tu nueva contraseña."
            );
            setShowErrorModal(true);
            setShowScreen(true);
          }
        } else {
          await AsyncStorage.removeItem('savedPhone');
          setShowScreen(true);
        }

        const allcodes = await getCountries();
        if (allcodes?.rows) {
          const formatted = allcodes.rows.map((row: any) => ({
            name: row[0],
            code: row[1],
            iso: row[2],
            coin: row[3],
          }));
          setCountryCodes(formatted);
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

  const loginWithForceLogout = async (p: string, pwd: string): Promise<any> => {
    // Política de sesión única: NO cerrar automáticamente el otro dispositivo.
    // Si backend reporta sesión activa, mostramos el mensaje y bloqueamos este login.
    return await saveMessageToFirestore(p, pwd);
  };

  const handleLogin = async () => {
    try {
      const normalizedPhone = phone.trim();
      const fullPhone = `${selectedCode}${normalizedPhone}`.replaceAll(' ', '');
      const login_response = await loginWithForceLogout(fullPhone, password);
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
          setErrorMessage(serverMsg || "Credenciales incorrectas. Por favor verifica tu número de teléfono y contraseña.");
        }
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage("Error al loguear conductor " + error);
      setShowErrorModal(true);
      return;
    }
  }

  const handleSubscriptionVerified = async () => {
    const normalizedPhone = phone.trim();
    const fullPhone = `${selectedCode}${normalizedPhone}`.replaceAll(' ', '');
    const normalizedPassword = password.trim();
    setLoadingPayment(true)
    let authRegisterConfirmation = await getDriverByPhone(fullPhone)
    //console.log(authRegisterConfirmation, "holas_datas_67");

    if (normalizedPhone === "" || normalizedPassword === "") {

      setLoadingPayment(false)
      setErrorMessage("El numero y el password no pueden estar vacios");
      setShowErrorModal(true);
      //Alert.alert("Error", "El numero y el password no pueden estar vacios")
      return;
    }
    if (!validatePhone(normalizedPhone)) {
      setErrorMessage("El numero no es valido");
      setShowErrorModal(true);
      setLoadingPayment(false)
      //Alert.alert("Error", "El numero no es valido")

      return;
    }

    if (!authRegisterConfirmation) {
      setLoadingPayment(false);
      setErrorMessage("El usuario no Existe.");
      setShowErrorModal(true);
      return;
    }

    if (authRegisterConfirmation.status == "pendiente") {

      setSuccessMessage("Estamos verificando sus datos");
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
      //Alert.alert("✅", "Estamos verificando sus datos")
      setLoadingPayment(false)
      return;
    }



    try {
      let verifyRegister = await getDriverByPhone(fullPhone);
      //const response = await fetchSubscriptionStatus(fullPhone);
      //console.log(response, "holas_datas_2");

      if (verifyRegister) {


       /*  if (!response.isActive) {
          setShowSubscriptionModal(true)
          setLoadingPayment(false)
        } else { */
          const login_response = await loginWithForceLogout(fullPhone, normalizedPassword);
          if (login_response && !login_response.__loginError) {
            setAuthResponse(login_response);
          } else {
            const serverMsg = login_response?.message;
            if (isActiveSessionError(serverMsg)) {
              setErrorMessage(
                "Ya tienes una sesión iniciada en otro celular. Cierra sesión en ese dispositivo o restablece tu contraseña para volver a entrar aquí."
              );
            } else {
              setErrorMessage(serverMsg || "Credenciales incorrectas. Verifica número y contraseña.");
            }
            setShowErrorModal(true);
          }
          setLoadingPayment(false);
        /*}*/
      } else {
        setLoadingPayment(false);
        setErrorMessage("El usuario no existe debes registrarte");
        setShowErrorModal(true);
        //Alert.alert("Error", "El usuario no existe debes registrarte")
        return;
      }
    } catch (error) {
      setLoadingPayment(false)
      setShowSubscriptionModal(false);
      setErrorMessage("No pudimos validar tu suscripción en este momento. Intenta nuevamente.");
      setShowErrorModal(true);
    }
  };



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
        <View style={styles.headerPurple}>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('UserLoginScreen')
            }}
            style={styles.driverIconButton}
          >
            <Image
              source={require('../../../../assets/UserCircle.png')}
              style={styles.userSwitchIcon}
            />
          </TouchableOpacity>

          <Image
            source={require("../../../../assets/bivi-bee-mascot.png")}
            style={styles.logoHeader}
          />
          <Text style={styles.headerTitle}>Acceso para Empresas</Text>
          <Text style={styles.headerSubtitle}>BIVI CONNECT - Redención de Megas</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity style={styles.tabActive}>
              <Text style={styles.tabActiveText}>Login Empresa</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputsSection}>
            <Text style={styles.inputLabel}>Teléfono</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setShowCodes(true)}>
                <Text style={{ fontWeight: 'normal', marginRight: 8 }}>
                  {selectedCode}
                </Text>
              </TouchableOpacity>
              <DefaultTextInputUserCountry
                icon={require("../../../../assets/phone.png")}
                placeholder='000 000 0000'
                onChangeText={text => setPhone(text)}
                value={phone}
                keyBoarType='numeric'
                secureText={false}
              />
            </View>

            <Modal visible={showCodes} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <ScrollView>
                    {countryCodes.map((item: any, index: any) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setSelectedCode(item.code);
                          setShowCodes(false);
                        }}
                        style={styles.countryItem}
                      >
                        <Text style={styles.countryText}>
                          {item.name} ({item.code})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity onPress={() => setShowCodes(false)}>
                    <Text style={styles.closeText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <Text style={styles.inputLabel}>Contraseña</Text>
            <DefaultTextInputUserLogin
              icon={require("../../../../assets/candado.png")}
               placeholder='••••••••'
                            onChangeText={text => setPassword(text)}
                            value={password}
                            keyBoarType='numeric'
                            secureText={true}
            />
          </View>

          <TouchableOpacity onPress={() => setShowResetModal(true)}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {showUpdateButon ? (
            <RoundedButton
              text="Actualizar"
              onPress={() => setShowUpdateButon(false)}
              color='#E91E63'
            />
          ) : (
            <RoundedButton
              text={loadingPayment ? "Cargando" : "Entrar a BIVI"}
              onPress={() => {
                handleSubscriptionVerified();
              }}
              color='#E91E63'
            />
          )}

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿Sin cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('DriverRegisterScreen')}>
              <Text style={styles.registerLink}>Registra tu empresa</Text>
            </TouchableOpacity>
          </View>
        </View>
        <SubscriptionModal
          visible={showSubscriptionModal}
          userPhone={`${selectedCode}${phone}`.replaceAll(' ', '')}
          userPassword={password}

          onClose={() => setShowSubscriptionModal(false)}
        />
        <ResetPasswordModalDriver
          visible={showResetModal}
          onClose={() => setShowResetModal(false)}
          onSuccess={async (resetPhone, resetPassword) => {
            setShowResetModal(false);
            setLoadingPayment(true);
            try {
              const login_response = await saveMessageToFirestore(resetPhone, resetPassword);
              if (login_response) {
                setAuthResponse(login_response);
              } else {
                setErrorMessage("Contraseña actualizada. Por favor inicia sesión manualmente.");
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

