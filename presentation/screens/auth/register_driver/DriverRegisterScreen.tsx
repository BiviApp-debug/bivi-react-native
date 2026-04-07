import {
  Image,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import RoundedButton from '../../../components/RoundedButton';
import RoundedButtonBlack from '../../../components/RoundedButtonBlack';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigator/MainStackNavigator';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import validatePhone from '../../../utils/PhoneValidator';
import validateEmail from '../../../utils/EmailValidator';
import { API_BASE_URL } from '../../../API/API';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DefaultTextInputDriverBlack from '../../../components/DefaultTextInputDriverBlack';
import DefaultTextInputDriverBlackPassword from '../../../components/DefaultTextInputDriverBlackPassword';
import ErrorModal from '../../../components/ErrorModal';
import SuccessModal from '../../../components/SuccessModal';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { enviarSMS } from '../../../utils/EnviarSMS';
import { saveDriverToFirestore } from './RegisterFunctions';
import { getDriverByPhone } from '../../../utils/getDriverByPhone';
import { getDriverByEmail } from '../../../utils/getDriverByEmail';
import { getCountries } from '../../../utils/getCountries';
import DefaultTextInputUserCountry from '../../../components/DefaultTextInputUserCountry';

const styles = require('./Styles').default;

interface Props extends StackScreenProps<RootStackParamList, 'DriverRegisterScreen'> {}

interface CompanyRegistrationForm {
  countryCode: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  cedula: string;
  password: string;
  confirmPassword: string;
}

interface PhotoUrls {
  documentPhoto: string;
  selfiePhoto: string;
}

interface UploadingState {
  document: boolean;
  selfie: boolean;
}

interface TelecomCompany {
  id: string;
  name: string;
  nit: string;
  country: string;
}

interface CountryCode {
  name: string;
  code: string;
  iso: string;
  coin: string;
}

const STORAGE_KEY = 'company_registration_form';
const PHOTOS_STORAGE_KEY = 'company_photos_';
const VERIFICATION_CODE_TIMEOUT = 120;

export default function DriverRegisterScreen({ navigation }: Readonly<Props>) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CompanyRegistrationForm>({
    countryCode: '+57',
    name: '',
    lastName: '',
    email: '',
    phone: '',
    cedula: '',
    password: '',
    confirmPassword: '',
  });

  const [photoUrls, setPhotoUrls] = useState<PhotoUrls>({
    documentPhoto: '',
    selfiePhoto: '',
  });

  const [uploadingState, setUploadingState] = useState<UploadingState>({
    document: false,
    selfie: false,
  });

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationTimeLeft, setVerificationTimeLeft] = useState(VERIFICATION_CODE_TIMEOUT);
  const [canResendCode, setCanResendCode] = useState(false);
  const [codeAttempts, setCodeAttempts] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [telecomCompanies, setTelecomCompanies] = useState<TelecomCompany[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);

  const isMountedRef = useRef(true);
  const verificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSavedForm();
    loadTelecomCompanies();
    loadCountryCodes();

    return () => {
      isMountedRef.current = false;
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
      }
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  const loadTelecomCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await fetch(`${API_BASE_URL}/api/telecom-companies`);
      if (!response.ok) {
        throw new Error('No se pudieron cargar las compañías de telefonía');
      }

      const result = await response.json();
      const companies = Array.isArray(result?.data) ? result.data : [];
      setTelecomCompanies(companies);
    } catch (error: any) {
      console.error('Error cargando compañías:', error);
      showError(error?.message || 'Error cargando compañías de telefonía');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadCountryCodes = async () => {
    try {
      const allCountries = await getCountries();
      if (allCountries?.rows) {
        const formatted = allCountries.rows.map((row: any) => ({
          name: row[0],
          code: row[1],
          iso: row[2],
          coin: row[3],
        }));
        setCountryCodes(formatted);
      }
    } catch (error) {
      console.error('Error cargando indicativos:', error);
    }
  };

  useEffect(() => {
    if (showVerificationModal && verificationTimeLeft > 0) {
      verificationTimerRef.current = setTimeout(() => {
        setVerificationTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (showVerificationModal && verificationTimeLeft === 0) {
      setCanResendCode(true);
    }

    return () => {
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
      }
    };
  }, [showVerificationModal, verificationTimeLeft]);

  const loadSavedForm = async () => {
    try {
      const savedForm = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedForm) {
        setFormData(JSON.parse(savedForm));
      }

      const documentPhoto = await AsyncStorage.getItem(`${PHOTOS_STORAGE_KEY}document`);
      const selfiePhoto = await AsyncStorage.getItem(`${PHOTOS_STORAGE_KEY}selfie`);

      setPhotoUrls({
        documentPhoto: documentPhoto || '',
        selfiePhoto: selfiePhoto || '',
      });
    } catch (error) {
      console.error('Error cargando formulario empresa:', error);
    }
  };

  const clearForm = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(`${PHOTOS_STORAGE_KEY}document`);
      await AsyncStorage.removeItem(`${PHOTOS_STORAGE_KEY}selfie`);
      setFormData({
        countryCode: '+57',
        name: '',
        lastName: '',
        email: '',
        phone: '',
        cedula: '',
        password: '',
        confirmPassword: '',
      });
      setPhotoUrls({ documentPhoto: '', selfiePhoto: '' });
    } catch (error) {
      console.error('Error limpiando formulario empresa:', error);
    }
  };

  const updateFormData = useCallback((key: keyof CompanyRegistrationForm, value: string) => {
    setFormData((prevData) => {
      const updated = { ...prevData, [key]: value };

      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }

      saveDebounceRef.current = setTimeout(async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          console.error('Error guardando formulario empresa:', error);
        }
      }, 800);

      return updated;
    });
  }, []);

  const updatePhotoUrl = useCallback(async (key: keyof PhotoUrls, value: string) => {
    setPhotoUrls((prev) => ({ ...prev, [key]: value }));
    await AsyncStorage.setItem(`${PHOTOS_STORAGE_KEY}${key.replace('Photo', '')}`, value);
  }, []);

  const setUploadingFlag = useCallback((key: keyof UploadingState, value: boolean) => {
    setUploadingState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  }, []);

  const validateStep1 = (): boolean => {
    if (!formData.name.trim()) {
      showError('El nombre no puede estar vacío');
      return false;
    }
    if (!formData.lastName.trim()) {
      showError('El apellido no puede estar vacío');
      return false;
    }
    if (!formData.email.trim()) {
      showError('El correo no puede estar vacío');
      return false;
    }
    if (!validateEmail(formData.email)) {
      showError('El correo no es válido');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.countryCode.trim()) {
      showError('Debes seleccionar un indicativo');
      return false;
    }
    if (!formData.phone.trim()) {
      showError('El teléfono no puede estar vacío');
      return false;
    }
    if (!validatePhone(formData.phone)) {
      showError('El número de teléfono no es válido');
      return false;
    }
    if (!formData.cedula.trim()) {
      showError('Debes seleccionar una compañía de telefonía');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!formData.password) {
      showError('La contraseña no puede estar vacía');
      return false;
    }
    if (formData.password.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (formData.confirmPassword !== formData.password) {
      showError('Las contraseñas no coinciden');
      return false;
    }
    if (!photoUrls.documentPhoto) {
      showError('Debes cargar el certificado de constitución');
      return false;
    }
    if (!photoUrls.selfiePhoto) {
      showError('Debes cargar el documento del representante legal');
      return false;
    }
    return true;
  };

  const uploadFileToS3 = useCallback(async (
    file: DocumentPicker.DocumentPickerAsset,
    photoKey: keyof PhotoUrls,
    uploadKey: keyof UploadingState,
  ): Promise<boolean> => {
    try {
      if (!file?.uri) {
        showError('Archivo inválido o no seleccionado.');
        return false;
      }

      setUploadingFlag(uploadKey, true);

      const mime = file.mimeType || 'image/jpeg';
      const extension = file.name?.split('.').pop() || 'jpg';
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;

      const response = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, filetype: mime }),
      });

      if (!response.ok) {
        throw new Error('Error generando presigned URL');
      }

      const data = await response.json();
      const url = data?.url;
      if (!url) {
        throw new Error('URL presigned vacía');
      }

      const uploadResult = await FileSystem.uploadAsync(url, file.uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': mime },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (uploadResult.status !== 200 && uploadResult.status !== 201) {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

      const publicUrl = url.split('?')[0];
      await updatePhotoUrl(photoKey, publicUrl);
      setUploadingFlag(uploadKey, false);
      return true;
    } catch (error: any) {
      console.error('Error en upload empresa:', error);
      showError(error?.message || 'No se pudo subir el archivo.');
      setUploadingFlag(uploadKey, false);
      return false;
    }
  }, [setUploadingFlag, showError, updatePhotoUrl]);

  const handleFilePick = useCallback(async (
    photoKey: keyof PhotoUrls,
    uploadKey: keyof UploadingState,
    fileTypes: string[] = ['image/*', 'application/pdf'],
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: fileTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      await uploadFileToS3(result.assets[0], photoKey, uploadKey);
    } catch (error) {
      console.error('Error al seleccionar archivo empresa:', error);
      showError('No se pudo seleccionar el archivo.');
    }
  }, [showError, uploadFileToS3]);

  const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleContinue = async () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3 && validateStep3()) {
      await handleRegister();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      return;
    }
    navigation.pop();
  };

  const handleRegister = async () => {
    try {
      setIsProcessing(true);
      const fullPhone = `${formData.countryCode}${formData.phone}`.replaceAll(' ', '');

      const [phoneExists, emailExists] = await Promise.all([
        getDriverByPhone(fullPhone),
        getDriverByEmail(formData.email),
      ]);

      if (phoneExists) {
        showError('El número ya está registrado');
        setIsProcessing(false);
        return;
      }

      if (emailExists) {
        showError('El correo ya está registrado');
        setIsProcessing(false);
        return;
      }

      const code = generateVerificationCode();
      setVerificationCode(code);
      await enviarSMS(fullPhone, code);

      if (!isMountedRef.current) {
        return;
      }

      setIsProcessing(false);
      setShowVerificationModal(true);
      setVerificationTimeLeft(VERIFICATION_CODE_TIMEOUT);
      setCanResendCode(false);
      setCodeAttempts(0);
      setInputCode('');
    } catch (error: any) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('Error en registro empresa:', error);
      showError(error?.message || 'Error al enviar código');
      setIsProcessing(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResendCode) {
      showError('Espera a que expire el tiempo antes de reenviar');
      return;
    }

    try {
      const fullPhone = `${formData.countryCode}${formData.phone}`.replaceAll(' ', '');
      const code = generateVerificationCode();
      setVerificationCode(code);
      setCanResendCode(false);
      setVerificationTimeLeft(VERIFICATION_CODE_TIMEOUT);
      setCodeAttempts(0);
      setInputCode('');
      await enviarSMS(fullPhone, code);
      setSuccessMessage('Código reenviado exitosamente');
      setShowSuccessModal(true);
    } catch (error: any) {
      showError(`Error al reenviar código: ${error?.message || error}`);
      setCanResendCode(true);
    }
  };

  const handleVerifyCode = async () => {
    if (!inputCode.trim()) {
      showError('Ingresa el código de 6 dígitos');
      return;
    }

    if (inputCode.length !== 6) {
      showError('El código debe tener 6 dígitos');
      return;
    }

    if (inputCode !== verificationCode) {
      const attempts = codeAttempts + 1;
      setCodeAttempts(attempts);

      if (attempts >= 5) {
        setShowVerificationModal(false);
        showError('Demasiados intentos fallidos. Vuelve a solicitar un código.');
        return;
      }

      showError(`Código incorrecto. Intento ${attempts}/5`);
      return;
    }

    try {
      setIsProcessing(true);
      const fullPhone = `${formData.countryCode}${formData.phone}`.replaceAll(' ', '');

      const result = await saveDriverToFirestore(
        formData.name,
        formData.lastName,
        formData.email,
        fullPhone,
        formData.cedula,
        photoUrls.documentPhoto,
        photoUrls.selfiePhoto,
        formData.password,
      );

      if (!result.success) {
        showError(result.error || 'Error al completar registro');
        setIsProcessing(false);
        return;
      }

      await clearForm();

      if (!isMountedRef.current) {
        return;
      }

      setShowVerificationModal(false);
      setIsProcessing(false);
      setSuccessMessage('Empresa registrada exitosamente');
      setShowSuccessModal(true);

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'DriverLoginScreen' }],
        });
      }, 1200);
    } catch (error: any) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('Error verificando empresa:', error);
      showError(error?.message || 'Error al completar registro');
      setIsProcessing(false);
    }
  };

  const renderUploadButton = (
    label: string,
    photoKey: keyof PhotoUrls,
    uploadKey: keyof UploadingState,
  ) => {
    if (uploadingState[uploadKey]) {
      return (
        <View style={{ marginVertical: 10 }}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={{ color: 'black', textAlign: 'center', marginTop: 8 }}>Subiendo {label}...</Text>
        </View>
      );
    }

    if (photoUrls[photoKey]) {
      return (
        <TouchableOpacity
          style={{
            backgroundColor: '#E8F5E9',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#4CAF50',
          }}
          onPress={() => handleFilePick(photoKey, uploadKey)}
        >
          <Text style={{ color: '#2E7D32', fontWeight: '600' }}>✅ {label} CARGADO - EDITAR</Text>
        </TouchableOpacity>
      );
    }

    return (
      <RoundedButtonBlack
        color={'black'}
        text={`CARGAR ${label}`}
        icon={require('../../../../assets/upload_icon.png')}
        onPress={() => handleFilePick(photoKey, uploadKey)}
      />
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 1 DE 3</Text>
        <Text style={styles.stepTitle}>Datos de contacto</Text>
        <Text style={styles.stepSubtitle}>Persona responsable de la cuenta empresarial</Text>
      </View>

      <View style={styles.inputsContainer}>
        <DefaultTextInputDriverBlack
          icon={require('../../../../assets/profile_icon_2.png')}
          placeholder='Nombre'
          onChangeText={(text) => updateFormData('name', text)}
          value={formData.name}
          keyBoarType='default'
          secureText={false}
        />
        <DefaultTextInputDriverBlack
          icon={require('../../../../assets/profile_icon_2.png')}
          placeholder='Apellido'
          onChangeText={(text) => updateFormData('lastName', text)}
          value={formData.lastName}
          keyBoarType='default'
          secureText={false}
        />
        <DefaultTextInputDriverBlack
          icon={require('../../../../assets/profile_mail.png')}
          placeholder='correo@empresa.com'
          onChangeText={(text) => updateFormData('email', text)}
          value={formData.email}
          keyBoarType='email-address'
          secureText={false}
        />
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton text='Continuar' onPress={handleContinue} color='#E91E63' />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 2 DE 3</Text>
        <Text style={styles.stepTitle}>Datos de empresa</Text>
        <Text style={styles.stepSubtitle}>Identificación fiscal y contacto principal</Text>
      </View>

      <View style={styles.inputsContainer}>
        <View>
          <Text style={styles.inputLabel}>Teléfono</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowCodes(true)}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: '#f9f9f9',
                minWidth: 70,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                {formData.countryCode}
              </Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <DefaultTextInputUserCountry
                icon={require('../../../../assets/profile_phone.png')}
                placeholder='000 000 0000'
                onChangeText={(text) => updateFormData('phone', text)}
                value={formData.phone}
                keyBoarType='numeric'
                secureText={false}
              />
            </View>
          </View>
        </View>
        <View>
          <Text style={styles.inputLabel}>Compañía de telefonía</Text>
          <TouchableOpacity
            onPress={() => setShowCompanyModal(true)}
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: '#f9f9f9',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, color: '#333', fontWeight: '500', flex: 1 }}>
              {formData.cedula
                ? `${telecomCompanies.find((company) => company.nit === formData.cedula)?.name || 'Compañía seleccionada'} (NIT: ${formData.cedula})`
                : 'Selecciona una compañía'}
            </Text>
            <Text style={{ fontSize: 18 }}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton text='Continuar' onPress={handleContinue} color='#E91E63' />
      </View>

      <Modal visible={showCompanyModal} transparent animationType='fade'>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona una compañía</Text>
            <Text style={styles.modalText}>Al seleccionar la compañía, se captura su NIT automáticamente.</Text>

            {loadingCompanies ? (
              <ActivityIndicator size='large' color='#E91E63' />
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {telecomCompanies.map((company) => (
                  <TouchableOpacity
                    key={company.id}
                    onPress={() => {
                      updateFormData('cedula', company.nit);
                      setShowCompanyModal(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#f0f0f0',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>{company.name}</Text>
                    <Text style={{ fontSize: 12, color: '#666' }}>NIT: {company.nit} - {company.country}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity onPress={() => setShowCompanyModal(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#999', textAlign: 'center' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCodes} transparent animationType='fade'>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona indicativo</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {countryCodes.map((item, index) => (
                <TouchableOpacity
                  key={`${item.code}-${index}`}
                  onPress={() => {
                    updateFormData('countryCode', item.code);
                    setShowCodes(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f0f0f0',
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#333' }}>
                    {item.name} ({item.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowCodes(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#999', textAlign: 'center' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 3 DE 3</Text>
        <Text style={styles.stepTitle}>Seguridad y documentos</Text>
        <Text style={styles.stepSubtitle}>Completa tu acceso y sube los documentos requeridos</Text>
      </View>

      <View style={styles.inputsContainer}>
        <DefaultTextInputDriverBlackPassword
          icon={require('../../../../assets/profile_key.png')}
          placeholder='Mínimo 6 caracteres'
          onChangeText={(text) => updateFormData('password', text)}
          value={formData.password}
          keyBoarType='numeric'
          secureText={true}
        />
        <DefaultTextInputDriverBlackPassword
          icon={require('../../../../assets/profile_key.png')}
          placeholder='Confirmar contraseña'
          onChangeText={(text) => updateFormData('confirmPassword', text)}
          value={formData.confirmPassword}
          keyBoarType='numeric'
          secureText={true}
        />

        <View>
          <Text style={styles.inputLabel}>Certificado de constitución</Text>
          {renderUploadButton('CERTIFICADO DE CONSTITUCIÓN', 'documentPhoto', 'document')}
        </View>

        <View>
          <Text style={styles.inputLabel}>Representante legal</Text>
          {renderUploadButton('REPRESENTANTE LEGAL', 'selfiePhoto', 'selfie')}
        </View>
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text={isProcessing ? 'Enviando código...' : 'Crear Cuenta'}
          onPress={handleContinue}
          color={isProcessing ? '#ccc' : '#E91E63'}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      enableOnAndroid
      keyboardShouldPersistTaps='handled'
      extraScrollHeight={Platform.OS === 'android' ? 50 : 0}
    >
      <View style={styles.container}>
        <View style={styles.headerPurple}>
          <TouchableOpacity onPress={handleBack} style={styles.back_button}>
            <Image style={styles.back_img} source={require('../../../../assets/profile_flecha.png')} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BIVI CONNECT EMPRESAS</Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${(currentStep / 3) * 100}%` },
            ]} />
          </View>
        </View>

        <View style={styles.stepsWrapper}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </View>
      </View>

      <Modal visible={showVerificationModal} transparent animationType='fade'>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verifica tu teléfono</Text>
            <Text style={styles.modalText}>
              Ingresa el código de 6 dígitos que enviamos a {formData.countryCode}{formData.phone}
            </Text>

            <View style={{
              backgroundColor: '#FFF3E0',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#FF9800',
            }}>
              <Text style={{ color: '#E65100', fontWeight: '600' }}>
                Tiempo restante: {Math.floor(verificationTimeLeft / 60)}:{String(verificationTimeLeft % 60).padStart(2, '0')}
              </Text>
              {codeAttempts > 0 && (
                <Text style={{ color: '#E65100', fontSize: 12, marginTop: 4 }}>
                  Intentos fallidos: {codeAttempts}/5
                </Text>
              )}
            </View>

            <TextInput
              placeholder='000000'
              keyboardType='numeric'
              maxLength={6}
              value={inputCode}
              onChangeText={setInputCode}
              editable={!isProcessing}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                fontSize: 18,
                textAlign: 'center',
                letterSpacing: 4,
                marginBottom: 16,
                opacity: isProcessing ? 0.6 : 1,
              }}
            />

            <View style={styles.modalButtons}>
              {isProcessing ? (
                <ActivityIndicator size='large' color='#E91E63' />
              ) : (
                <>
                  <RoundedButton text='Confirmar' onPress={handleVerifyCode} color='#E91E63' />
                  <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={!canResendCode}
                    style={{ marginTop: 12, opacity: canResendCode ? 1 : 0.5 }}
                  >
                    <Text style={{ color: '#E91E63', textAlign: 'center', fontWeight: '600' }}>
                      {canResendCode ? 'Reenviar código' : 'Esperando tiempo...'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowVerificationModal(false)} style={{ marginTop: 12 }}>
                    <Text style={{ color: '#999', textAlign: 'center' }}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

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
    </KeyboardAwareScrollView>
  );
}
