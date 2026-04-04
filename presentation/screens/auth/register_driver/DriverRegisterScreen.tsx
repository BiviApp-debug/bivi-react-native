import { Modal, Image, View, Text, TouchableOpacity, Platform, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import RoundedButton from '../../../components/RoundedButton';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigator/MainStackNavigator';
import styles from './Styles';
import validatePhone from '../../../utils/PhoneValidator';
import validateEmail from '../../../utils/EmailValidator';
import { saveDriverToFirestore } from './RegisterFunctions';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../../API/API';
import RNPickerSelect from 'react-native-picker-select';
import { enviarSMS } from '../../../utils/EnviarSMS';
import { getDriverByPhone } from '../../../utils/getDriverByPhone';
import { getDriverByEmail } from '../../../utils/getDriverByEmail';
import DefaultTextInputWhite from '../../../components/DefaultTextInputWhite';
import YellowRoundedButton from '../../../components/YellowRoundedButton';
import RoundedButtonBlack from '../../../components/RoundedButtonBlack';
import DefaultTextInputWhitePassword from '../../../components/DefaultTextInputWhitePassword';
import ErrorModal from '../../../components/ErrorModal';
import SuccessModal from '../../../components/SuccessModal';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface Props extends StackScreenProps<RootStackParamList, "DriverRegisterScreen"> { };

interface FormData {
  name: string;
  lastName: string;
  mail: string;
  phone: string;
  cartId: string;
  cartModel: string;
  cartBrand: string;
  idDriver: string;
  licenseNumber: string;
  password: string;
  confirmPassword: string;
  vehicleType: string;
}

interface PhotoUrls {
  documentPhoto: string;
  tecnoPhoto: string;
  licensePhoto: string;
  selfiePhoto: string;
  vehiclePhoto: string;
}

interface UploadingState {
  document: boolean;
  tecno: boolean;
  license: boolean;
  selfie: boolean;
  vehicle: boolean;
}

const STORAGE_KEY = 'driver_registration_data';
const PHOTOS_STORAGE_KEY = 'driver_photos_';

export default function DriverRegisterScreen({ navigation, route }: Props) {
  // ============================================
  // ESTADOS PRINCIPAL
  // ============================================
  const [formData, setFormData] = useState<FormData>({
    name: "",
    lastName: "",
    mail: "",
    phone: "",
    cartId: "",
    cartModel: "",
    cartBrand: "",
    idDriver: "",
    licenseNumber: "",
    password: "",
    confirmPassword: "",
    vehicleType: "",
  });

  const [photoUrls, setPhotoUrls] = useState<PhotoUrls>({
    documentPhoto: "",
    tecnoPhoto: "",
    licensePhoto: "",
    selfiePhoto: "",
    vehiclePhoto: "",
  });

  const [uploadingState, setUploadingState] = useState<UploadingState>({
    document: false,
    tecno: false,
    license: false,
    selfie: false,
    vehicle: false,
  });

  // Estados modales
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSavingLocally, setIsSavingLocally] = useState(false);

  // Estados temporales
  const verificationCodeRef = useRef("");
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // ============================================
  // CARGAR DATOS GUARDADOS AL INICIAR
  // ============================================
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedForm = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedForm) {
        console.log("📦 Datos del formulario encontrados, cargando...");
        setFormData(JSON.parse(savedForm));
      }

      // Cargar URLs de fotos guardadas
      const photos: PhotoUrls = {
        documentPhoto: await AsyncStorage.getItem(`${PHOTOS_STORAGE_KEY}document`) || "",
        tecnoPhoto: await AsyncStorage.getItem(`${PHOTOS_STORAGE_KEY}tecno`) || "",
        licensePhoto: await AsyncStorage.getItem(`${PHOTOS_STORAGE_KEY}license`) || "",
        selfiePhoto: await AsyncStorage.getItem(`${PHOTOS_STORAGE_KEY}selfie`) || "",
        vehiclePhoto: await AsyncStorage.getItem(`${PHOTOS_STORAGE_KEY}vehicle`) || "",
      };
      setPhotoUrls(photos);
      console.log("✅ Fotos cargadas desde almacenamiento local");
    } catch (error) {
      console.error("⚠️ Error cargando datos guardados:", error);
    }
  };

  // ============================================
  // GUARDAR DATOS LOCALMENTE
  // ============================================
  const saveDataLocally = async () => {
    try {
      setIsSavingLocally(true);
      
      // Guardar formulario
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      
      // Guardar cada foto por separado
      await Promise.all([
        photoUrls.documentPhoto ? AsyncStorage.setItem(`${PHOTOS_STORAGE_KEY}document`, photoUrls.documentPhoto) : Promise.resolve(),
        photoUrls.tecnoPhoto ? AsyncStorage.setItem(`${PHOTOS_STORAGE_KEY}tecno`, photoUrls.tecnoPhoto) : Promise.resolve(),
        photoUrls.licensePhoto ? AsyncStorage.setItem(`${PHOTOS_STORAGE_KEY}license`, photoUrls.licensePhoto) : Promise.resolve(),
        photoUrls.selfiePhoto ? AsyncStorage.setItem(`${PHOTOS_STORAGE_KEY}selfie`, photoUrls.selfiePhoto) : Promise.resolve(),
        photoUrls.vehiclePhoto ? AsyncStorage.setItem(`${PHOTOS_STORAGE_KEY}vehicle`, photoUrls.vehiclePhoto) : Promise.resolve(),
      ]);

      console.log("✅ Datos guardados localmente");
      setIsSavingLocally(false);
      return true;
    } catch (error) {
      console.error("❌ Error guardando datos:", error);
      setIsSavingLocally(false);
      return false;
    }
  };

  // ============================================
  // LIMPIAR DATOS GUARDADOS
  // ============================================
  const clearSavedData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(`${PHOTOS_STORAGE_KEY}document`);
      await AsyncStorage.removeItem(`${PHOTOS_STORAGE_KEY}tecno`);
      await AsyncStorage.removeItem(`${PHOTOS_STORAGE_KEY}license`);
      await AsyncStorage.removeItem(`${PHOTOS_STORAGE_KEY}selfie`);
      await AsyncStorage.removeItem(`${PHOTOS_STORAGE_KEY}vehicle`);
      console.log("✅ Datos locales limpiados");
    } catch (error) {
      console.error("⚠️ Error limpiando datos:", error);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const updateFormData = useCallback((key: keyof FormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [key]: value };
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (_) {}
      }, 800);
      return updated;
    });
  }, []);

  const updatePhotoUrl = useCallback(async (key: keyof PhotoUrls, value: string) => {
    setPhotoUrls(prev => ({ ...prev, [key]: value }));
    // Guardar inmediatamente
    await AsyncStorage.setItem(`${PHOTOS_STORAGE_KEY}${key.replace('Photo', '')}`, value);
  }, []);

  const setUploadingFlag = useCallback((key: keyof UploadingState, value: boolean) => {
    setUploadingState(prev => ({ ...prev, [key]: value }));
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  }, []);

  const hideError = useCallback(() => {
    setShowErrorModal(false);
    setErrorMessage("");
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  }, []);

  // ============================================
  // CLEANUP AL DESMONTAR
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, []);

  // ============================================
  // UPLOAD A S3 - CON LIMPIEZA DE MEMORIA
  // ============================================
  const uploadFileToS3 = useCallback(async (
    file: any,
    photoKey: keyof PhotoUrls,
    uploadKey: keyof UploadingState
  ): Promise<boolean> => {
    try {
      if (!file?.uri) {
        showError("Archivo inválido o no seleccionado.");
        return false;
      }

      setUploadingFlag(uploadKey, true);

      // Obtener tamaño
      let fileSize = file.size || 0;
      if (fileSize === 0 && file.uri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(file.uri);
          fileSize = fileInfo.size || 0;
        } catch (e) {
          console.warn('⚠️ No se pudo obtener tamaño');
        }
      }

      // Validar tamaño (5MB)
      if (fileSize > 5 * 1024 * 1024) {
        showError("El archivo no puede superar 5MB.");
        setUploadingFlag(uploadKey, false);
        return false;
      }

      const mime = file.mimeType || "image/jpeg";
      const extension = file.name?.split(".").pop() || "jpg";
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

      // Obtener URL firmada
      const response = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, filetype: mime }),
      });

      if (!response.ok) throw new Error("Error generando presigned URL");

      const data = await response.json();
      const url = data?.url;
      if (!url) throw new Error("URL presigned vacía");

      // Subir
      const uploadResult = await FileSystem.uploadAsync(url, file.uri, {
        httpMethod: "PUT",
        headers: { "Content-Type": mime },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (uploadResult.status !== 200 && uploadResult.status !== 201) {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

      const publicUrl = url.split("?")[0];
      
      // ✅ GUARDAR URL INMEDIATAMENTE EN ASYNCSTORAGE
      await updatePhotoUrl(photoKey, publicUrl);
      
      console.log(`✅ ${photoKey} guardado en S3 y AsyncStorage`);
      setUploadingFlag(uploadKey, false);
      return true;

    } catch (error: any) {
      console.error('❌ Error en upload:', error);
      showError(error?.message || "No se pudo subir el archivo.");
      setUploadingFlag(uploadKey, false);
      return false;
    }
  }, [showError, setUploadingFlag, updatePhotoUrl]);

  // ============================================
  // MANEJO DE ARCHIVOS
  // ============================================

  const handleFilePick = useCallback(async (
    photoKey: keyof PhotoUrls,
    uploadKey: keyof UploadingState,
    fileTypes: string[] = ['image/*', 'application/pdf']
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: fileTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const selected = result.assets[0];
      await uploadFileToS3(selected, photoKey, uploadKey);
    } catch (error) {
      console.error('❌ Error al seleccionar archivo:', error);
      showError("No se pudo seleccionar el archivo.");
    }
  }, [uploadFileToS3, showError]);

  // ============================================
  // VALIDACIONES
  // ============================================

  const validateForm = useCallback((): boolean => {
    if (!formData.name.trim()) {
      showError("El campo de nombre no puede estar vacío.");
      return false;
    }
    if (!formData.lastName.trim()) {
      showError("El campo de apellido no puede estar vacío.");
      return false;
    }
    if (!formData.mail.trim()) {
      showError("El campo de correo no puede estar vacío.");
      return false;
    }
    if (!formData.phone.trim()) {
      showError("El télefono no puede estar vacío.");
      return false;
    }
    if (!formData.cartId.trim() || !formData.cartBrand.trim() || !formData.cartModel.trim() || !formData.licenseNumber.trim()) {
      showError("Faltan campos del auto.");
      return false;
    }
    if (!formData.password) {
      showError("El campo de contraseña no puede estar vacío.");
      return false;
    }
    if (!formData.confirmPassword) {
      showError("El campo de confirma tu contraseña no puede estar vacío.");
      return false;
    }

    try {
      if (!validatePhone(formData.phone)) {
        showError("El número no es válido.");
        return false;
      }
    } catch (e) {
      console.warn("⚠️ Error en validación de teléfono");
    }

    try {
      if (!validateEmail(formData.mail)) {
        showError("El email no es válido.");
        return false;
      }
    } catch (e) {
      console.warn("⚠️ Error en validación de email");
    }

    if (formData.password.length < 5) {
      showError("La contraseña debe tener al menos 5 caracteres.");
      return false;
    }
    if (formData.confirmPassword !== formData.password) {
      showError("Las contraseñas no coinciden.");
      return false;
    }
    if (!photoUrls.documentPhoto || !photoUrls.licensePhoto || !photoUrls.selfiePhoto || !photoUrls.vehiclePhoto || !photoUrls.tecnoPhoto) {
      showError("Falta una foto por cargar.");
      return false;
    }

    return true;
  }, [formData, photoUrls, showError]);

  // ============================================
  // REGISTRO - DOS FASES
  // ============================================

  const handleRegister = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setIsRegistering(true);

      // ✅ FASE 1: GUARDAR TODO LOCALMENTE PRIMERO
      console.log("📦 FASE 1: Guardando datos localmente...");
      const localSaved = await saveDataLocally();
      if (!localSaved) {
        showError("Error al guardar datos localmente");
        setIsRegistering(false);
        return;
      }

      console.log("✅ Datos guardados localmente");

      // ✅ FASE 2: GENERAR CÓDIGO Y ENVIAR SMS
      console.log("📱 FASE 2: Generando código de verificación...");
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      verificationCodeRef.current = codigo;

      // Verificar teléfono y email
      try {
        const [phoneExists, emailExists] = await Promise.all([
          getDriverByPhone(formData.phone),
          getDriverByEmail(formData.mail)
        ]);

        if (phoneExists) {
          showError("El Numero ya esta registrado.");
          setIsRegistering(false);
          return;
        }
        if (emailExists) {
          showError("El Correo ya esta registrado.");
          setIsRegistering(false);
          return;
        }
      } catch (e) {
        console.warn("⚠️ Error verificando duplicados");
      }

      // Enviar SMS
      try {
        await enviarSMS(formData.phone, codigo);
        console.log("✅ SMS enviado");
      } catch (smsError: any) {
        showError(`Error al enviar código: ${smsError?.message || smsError}`);
        setIsRegistering(false);
        return;
      }

      setIsRegistering(false);
      setShowVerificationModal(true);

    } catch (error: any) {
      console.error("❌ Error en handleRegister:", error);
      showError(`Error durante el registro: ${error?.message || error}`);
      setIsRegistering(false);
    }
  }, [formData, photoUrls, validateForm, showError]);

  // ============================================
  // VERIFICACIÓN - GUARDAR EN SERVIDOR
  // ============================================

  const handleVerifyCode = useCallback(async () => {
    if (!inputCode.trim()) {
      showError("Ingresa el código de verificación");
      return;
    }

    if (inputCode !== verificationCodeRef.current) {
      showError("El código ingresado es incorrecto");
      return;
    }

    try {
      setIsRegistering(true);

      const result = await saveDriverToFirestore(
        formData.name,
        formData.lastName,
        formData.mail,
        formData.phone,
        formData.cartId,
        formData.cartModel,
        formData.cartBrand,
        formData.vehicleType,
        formData.idDriver,
        formData.licenseNumber,
        photoUrls.documentPhoto,
        photoUrls.licensePhoto,
        photoUrls.selfiePhoto,
        photoUrls.vehiclePhoto,
        photoUrls.tecnoPhoto,
        formData.password,
      );

      if (!result.success) {
        if (isMountedRef.current) {
          showError(result.error || "Error al completar el registro");
          setIsRegistering(false);
        }
        return;
      }

      // Limpiar AsyncStorage (no necesita que el componente esté montado)
      await clearSavedData();
      verificationCodeRef.current = "";

      // Solo actualizar estado si el componente sigue montado
      if (!isMountedRef.current) return;

      setShowVerificationModal(false);
      setIsRegistering(false);
      setOtpDigits(['', '', '', '', '', '']);
      setInputCode("");
      setFormData({
        name: "", lastName: "", mail: "", phone: "", cartId: "",
        cartModel: "", cartBrand: "", idDriver: "", licenseNumber: "",
        password: "", confirmPassword: "", vehicleType: "",
      });
      setPhotoUrls({
        documentPhoto: "", tecnoPhoto: "", licensePhoto: "",
        selfiePhoto: "", vehiclePhoto: "",
      });

      // Navegar PRIMERO, luego mostrar éxito en la nueva pantalla
      navigation.navigate('UserLoginScreen')

    } catch (error: any) {
      console.error("❌ Error en handleVerifyCode:", error);
      if (isMountedRef.current) {
        showError(`Error al completar el registro: ${error?.message || error}`);
        setIsRegistering(false);
      }
    }
  }, [inputCode, formData, photoUrls, showError, navigation]);

  // ============================================
  // COMPONENTE FOTO
  // ============================================

  const PhotoUploadButton = ({ label, photoKey, uploadKey, fileTypes }: {
    label: string;
    photoKey: keyof PhotoUrls;
    uploadKey: keyof UploadingState;
    fileTypes?: string[];
  }) => {
    const isUploading = uploadingState[uploadKey];
    const hasPhoto = !!photoUrls[photoKey];

    if (isUploading) {
      return (
        <View style={{ marginVertical: 10 }}>
          <ActivityIndicator size="large" color="#ad7f00ff" />
          <Text style={{ color: "white", textAlign: 'center' }}>Subiendo {label}...</Text>
        </View>
      );
    }

    if (hasPhoto) {
      return (
        <TouchableOpacity
          style={styles.changeData}
          onPress={() => handleFilePick(photoKey, uploadKey, fileTypes)}
        >
          <Text style={styles.changeDataText}>✅ {label} CARGADO - EDITAR</Text>
        </TouchableOpacity>
      );
    }

    return (
      <RoundedButtonBlack
        color={"black"}
        text={`CARGAR ${label}`}
        icon={require("../../../../assets/upload_icon.png")}
        onPress={() => handleFilePick(photoKey, uploadKey, fileTypes)}
      />
    );
  };

  // ============================================
  // RENDER
  // ============================================

  const handleOtpChange = useCallback((text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => { if (i < 6) newDigits[i] = d; });
      setOtpDigits(newDigits);
      const joined = newDigits.join('');
      setInputCode(joined);
      const nextIndex = Math.min(digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }
    const newDigits = [...otpDigits];
    newDigits[index] = cleaned.slice(-1);
    setOtpDigits(newDigits);
    setInputCode(newDigits.join(''));
    if (cleaned && index < 5) otpRefs.current[index + 1]?.focus();
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

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.textLogin}>¡Bienvenido Conductor UBERO!</Text>
        <Text style={styles.subtitleLogin}>Comencemos creando tu perfil de Conductor</Text>

        <KeyboardAwareScrollView
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container_scroll}
          extraScrollHeight={Platform.OS === 'android' ? 50 : 0}
        >
          <DefaultTextInputWhite
            icon={require("../../../../assets/name.png")}
            placeholder='Nombre'
            onChangeText={text => updateFormData('name', text)}
            value={formData.name}
            keyBoarType='default'
            secureText={false}
          />
          <DefaultTextInputWhite
            icon={require("../../../../assets/lastname.png")}
            placeholder='Apellido'
            onChangeText={text => updateFormData('lastName', text)}
            value={formData.lastName}
            keyBoarType='default'
            secureText={false}
          />
          <DefaultTextInputWhite
            icon={require("../../../../assets/mail.png")}
            placeholder='Correo Electrónico'
            onChangeText={text => updateFormData('mail', text)}
            value={formData.mail}
            keyBoarType='email-address'
            secureText={false}
          />
          <DefaultTextInputWhite
            icon={require("../../../../assets/phone.png")}
            placeholder='Número de Teléfono'
            onChangeText={text => updateFormData('phone', text)}
            value={formData.phone}
            keyBoarType='numeric'
            secureText={false}
          />
          <DefaultTextInputWhite
            icon={require("../../../../assets/cedula.png")}
            placeholder='Cédula'
            onChangeText={text => updateFormData('idDriver', text)}
            value={formData.idDriver}
            keyBoarType='numeric'
            secureText={false}
          />
          <DefaultTextInputWhite
            icon={require("../../../../assets/licencia.png")}
            placeholder='Número de Licencia'
            onChangeText={text => updateFormData('licenseNumber', text)}
            value={formData.licenseNumber}
            keyBoarType='default'
            secureText={false}
          />
          <DefaultTextInputWhite
            icon={require("../../../../assets/placa.png")}
            placeholder='Placa del vehículo'
            onChangeText={text => updateFormData('cartId', text)}
            value={formData.cartId}
            keyBoarType='default'
            secureText={false}
          />
          <DefaultTextInputWhite
            icon={require("../../../../assets/marca.png")}
            placeholder='Marca Vehículo'
            onChangeText={text => updateFormData('cartBrand', text)}
            value={formData.cartBrand}
            keyBoarType='default'
            secureText={false}
          />

          <View style={styles.selectContainer}>
            <Image
              style={styles.icon_mail}
              source={require("../../../../assets/type.png")}
            />
            <RNPickerSelect
              onValueChange={(value) => updateFormData('vehicleType', value)}
              placeholder={{ label: 'Tipo de Vehículo', value: '', color: 'black' }}
              items={[
                { label: 'Moto', value: 'moto' },
                { label: 'Carro', value: 'carro' },
              ]}
              style={{
                inputIOS: styles.input,
                inputAndroid: styles.input,
              }}
            />
          </View>

          <DefaultTextInputWhite
            icon={require("../../../../assets/model.png")}
            placeholder='Modelo Vehículo'
            onChangeText={text => updateFormData('cartModel', text)}
            value={formData.cartModel}
            keyBoarType='numeric'
            secureText={false}
          />
          <DefaultTextInputWhitePassword
            icon={require("../../../../assets/candado.png")}
            placeholder='Contraseña'
            onChangeText={text => updateFormData('password', text)}
            value={formData.password}
            keyBoarType='default'
            secureText={true}
          />
          <DefaultTextInputWhitePassword
            icon={require("../../../../assets/candado.png")}
            placeholder='Confirmar Contraseña'
            onChangeText={text => updateFormData('confirmPassword', text)}
            value={formData.confirmPassword}
            keyBoarType='default'
            secureText={true}
          />

          {/* FOTOS */}
          <PhotoUploadButton label="CEDULA" photoKey="documentPhoto" uploadKey="document" />
          <PhotoUploadButton label="TECNO" photoKey="tecnoPhoto" uploadKey="tecno" />
          <PhotoUploadButton label="SOAT" photoKey="licensePhoto" uploadKey="license" />
          <PhotoUploadButton label="TARJETA PROPIEDAD" photoKey="selfiePhoto" uploadKey="selfie" fileTypes={['image/*']} />
          <PhotoUploadButton label="ANTECEDENTES" photoKey="vehiclePhoto" uploadKey="vehicle" fileTypes={['image/*']} />

          <YellowRoundedButton
            text={isRegistering ? "Procesando..." : "Crear Cuenta"}
            onPress={handleRegister}
            color={isRegistering ? '#cccccc' : '#FFCC28'}
            width={118}
            height={38}
          />
        </KeyboardAwareScrollView>

        <TouchableOpacity
          onPress={() => navigation.pop()}
          style={styles.back_button}
        >
          <Image
            style={styles.back_img}
            source={require("../../../../assets/back_black.png")}
          />
        </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Verificación de Teléfono</Text>
            <Text style={styles.modalText}>
              Ingresa el código de 6 dígitos que enviamos a tu número
            </Text>

            {/* Cajas OTP con soporte de pegar y autofill SMS */}
            <View style={otpStyles.otpRow}>
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => { otpRefs.current[index] = ref; }}
                  style={[otpStyles.otpBox, digit ? otpStyles.otpBoxFilled : null]}
                  value={digit}
                  onChangeText={text => handleOtpChange(text, index)}
                  onKeyPress={e => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                  textContentType="oneTimeCode"
                  autoComplete={index === 0 ? "sms-otp" : "off"}
                  caretHidden={true}
                />
              ))}
            </View>
            <Text style={otpStyles.otpHint}>
              El código se completará automáticamente si lo recibes por SMS
            </Text>

            <View style={styles.modalButtons}>
              <RoundedButton
                text={isRegistering ? "Verificando..." : "Verificar"}
                onPress={handleVerifyCode}
                color='white'
              />
              <TouchableOpacity
                onPress={() => setShowVerificationModal(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modales */}
      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={hideError}
      />
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </View>
  );
}

import { StyleSheet as RNStyleSheet } from 'react-native';
const otpStyles = RNStyleSheet.create({
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
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
    marginBottom: 16,
    lineHeight: 16,
  },
});