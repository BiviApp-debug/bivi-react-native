import {
  Image, View, Text, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView, Modal,
  ActivityIndicator, TextInput, FlatList
} from 'react-native';
import RoundedButton from '../../../components/RoundedButton';
import DefaultTextInput from '../../../components/DefaultTextInput';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigator/MainStackNavigator';
import styles from './Styles';
import { useContext, useState, useRef, useEffect, useCallback } from 'react';
import validatePhone from '../../../utils/PhoneValidator';
import validateEmail from '../../../utils/EmailValidator';
import React from 'react';
import { API_BASE_URL } from '../../../API/API';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataContext } from '../../../context/Authcontext';
import DefaultTextInputDriverBlack from '../../../components/DefaultTextInputDriverBlack';
import DefaultTextInputDriverBlackPassword from '../../../components/DefaultTextInputDriverBlackPassword';
import ErrorModal from '../../../components/ErrorModal';
import SuccessModal from '../../../components/SuccessModal';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getCountries } from '../../../utils/getCountries';
import DefaultTextInputUserCountry from '../../../components/DefaultTextInputUserCountry';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { enviarSMS } from '../../../utils/EnviarSMS';
import { saveMessageToFirestore } from './RegisterFunctions';
import WelcomeModal from './WelcomeModal';
import LocationPicker from './LocationPicker';
import TelecomCompanySelector from './Telecomcompanyselector';

interface Props extends StackScreenProps<RootStackParamList, "UserRegisterScreen"> { }

interface CountryCode {
  name: string;
  code: string;
  iso: string;
  coin: string;
}

interface TelecomCompany {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  isoCode: string;
  nit: string;
  currency: string;
  currencySymbol: string;
}

interface UserRegistrationForm {
  phone: string;
  countryCode: string;
  countryName: string;
  countryIsoCode: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  location: string;
  preferences: {
    favoriteColors: string[];
    favoriteGenres: string[];
    favoriteActivities: string[];
  };
  documentUrl?: string;
  documentType?: string;
  telecomCompanyNit?: string;
  telecomCompanyName?: string;
}

interface PhotoUrls {
  documentPhoto: string;
}

interface UploadingState {
  document: boolean;
}

const PREFERENCES_OPTIONS = {
  colors: [
    'Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja',
    'Púrpura', 'Rosa', 'Blanco', 'Negro', 'Gris'
  ],
  genres: [
    'Pop', 'Rock', 'Hip-Hop', 'Reggaeton', 'Salsa',
    'Trap', 'Bachata', 'Cumbia', 'Electrónica', 'Jazz'
  ],
  activities: [
    'Leer', 'Deporte', 'Videojuegos', 'Películas', 'Música',
    'Viajes', 'Gastronomía', 'Redes Sociales', 'Fotografía', 'Dibujar'
  ]
};

const STORAGE_KEY = 'user_registration_form';
const PHOTOS_STORAGE_KEY = 'user_photos_';
const VERIFICATION_CODE_TIMEOUT = 120; // 2 minutos

// ✅ Mapeo de país a código ISO
const COUNTRY_TO_ISO: { [key: string]: string } = {
  'Colombia': 'CO',
  'Perú': 'PE',
  'Ecuador': 'EC',
  'Venezuela': 'VE',
  'República Dominicana': 'DO',
  'Costa Rica': 'CR',
  'El Salvador': 'SV',
  'Honduras': 'HN',
  'Nicaragua': 'NI',
  'Panamá': 'PA',
  'Argentina': 'AR',
  'Chile': 'CL',
  'México': 'MX',
  'Brasil': 'BR',
  'Paraguay': 'PY',
  'Uruguay': 'UY',
  'Bolivia': 'BO',
};

export default function UserRegisterScreen({ navigation, route }: Props) {

  // ===== ESTADOS PRINCIPAL =====
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<UserRegistrationForm>({
    phone: '',
    countryCode: '+57',
    countryName: 'Colombia',
    countryIsoCode: 'CO',
    name: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    location: '',
    preferences: {
      favoriteColors: [],
      favoriteGenres: [],
      favoriteActivities: []
    }
  });

  const [selectedTelecomCompany, setSelectedTelecomCompany] = useState<TelecomCompany | null>(null);

  const [photoUrls, setPhotoUrls] = useState<PhotoUrls>({
    documentPhoto: "",
  });

  const [uploadingState, setUploadingState] = useState<UploadingState>({
    document: false,
  });

  const [age, setAge] = useState<number>(0);
  const [isMinor, setIsMinor] = useState(false);

  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<CountryCode[]>([]);
  const [searchCountry, setSearchCountry] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 18);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  // ===== VERIFICACIÓN =====
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [codeAttempts, setCodeAttempts] = useState(0);
  const [verificationTimeLeft, setVerificationTimeLeft] = useState(VERIFICATION_CODE_TIMEOUT);
  const [canResendCode, setCanResendCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { setAuthResponse } = useContext(dataContext);
  const isMountedRef = useRef(true);
  const verificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== CICLO DE VIDA =====
  useEffect(() => {
    loadCountries();
    loadSavedForm();
    
    return () => {
      isMountedRef.current = false;
      if (verificationTimerRef.current) {
        clearInterval(verificationTimerRef.current);
      }
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showVerificationModal && verificationTimeLeft > 0) {
      verificationTimerRef.current = setTimeout(() => {
        setVerificationTimeLeft(prev => prev - 1);
      }, 1000);

      return () => {
        if (verificationTimerRef.current) {
          clearTimeout(verificationTimerRef.current);
        }
      };
    } else if (verificationTimeLeft === 0 && showVerificationModal) {
      setCanResendCode(true);
    }
  }, [showVerificationModal, verificationTimeLeft]);

  // ===== CARGAR PAÍSES =====
  const loadCountries = async () => {
    try {
      const allCountries = await getCountries();
      if (allCountries?.rows) {
        const formatted: CountryCode[] = allCountries.rows.map((row: any) => ({
          name: row[0],
          code: row[1],
          iso: row[2],
          coin: row[3],
        }));
        setCountryCodes(formatted);
        setFilteredCountries(formatted);
      }
    } catch (error) {
      console.error('Error cargando países:', error);
    }
  };

  // ===== BÚSQUEDA DE PAÍSES =====
  const handleSearchCountry = (text: string) => {
    setSearchCountry(text);
    if (text.trim() === '') {
      setFilteredCountries(countryCodes);
    } else {
      const filtered = countryCodes.filter(country =>
        country.name.toLowerCase().includes(text.toLowerCase()) ||
        country.code.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  };

  // ===== SELECCIONAR PAÍS =====
  const handleSelectCountry = (country: CountryCode) => {
    updateFormData('countryCode', country.code);
    updateFormData('countryName', country.name);
    updateFormData('countryIsoCode', country.iso);
    setShowCountryModal(false);
    setSearchCountry('');
    setSelectedTelecomCompany(null);
  };

  // ===== FUNCIONES DE PERSISTENCIA =====
  const loadSavedForm = async () => {
    try {
      const savedForm = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedForm) {
        const parsed = JSON.parse(savedForm);
        setFormData(parsed);
      }

      const docPhoto = await AsyncStorage.getItem(`${PHOTOS_STORAGE_KEY}document`);
      if (docPhoto) {
        setPhotoUrls({ documentPhoto: docPhoto });
      }
    } catch (error) {
      console.error('Error cargando formulario:', error);
    }
  };

  const saveForm = useCallback(async (data: UserRegistrationForm) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error guardando formulario:', error);
    }
  }, []);

  const clearForm = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(`${PHOTOS_STORAGE_KEY}document`);
      setFormData({
        phone: '',
        countryCode: '+57',
        countryName: 'Colombia',
        countryIsoCode: 'CO',
        name: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: '',
        location: '',
        preferences: {
          favoriteColors: [],
          favoriteGenres: [],
          favoriteActivities: []
        }
      });
      setPhotoUrls({ documentPhoto: '' });
      setSelectedTelecomCompany(null);
    } catch (error) {
      console.error('Error limpiando formulario:', error);
    }
  };

  // ===== ACTUALIZAR DATOS =====
  const updateFormData = useCallback((key: keyof UserRegistrationForm, value: any) => {
    setFormData(prevData => {
      const updated = { ...prevData, [key]: value };
      
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (_) {}
      }, 800);
      
      return updated;
    });
  }, []);

  const updatePhotoUrl = useCallback(async (value: string) => {
    setPhotoUrls({ documentPhoto: value });
    await AsyncStorage.setItem(`${PHOTOS_STORAGE_KEY}document`, value);
  }, []);

  const setUploadingFlag = useCallback((value: boolean) => {
    setUploadingState({ document: value });
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  }, []);

  // ===== FUNCIONES DE VALIDACIÓN =====

  const calculateAge = (dateString: string): number | null => {
    try {
      const [year, month, day] = dateString.split('-');
      const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    } catch (error) {
      return null;
    }
  };

  const handleConfirmDate = () => {
    const dateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const calculatedAge = calculateAge(dateString);

    if (calculatedAge !== null && calculatedAge >= 8 && calculatedAge <= 100) {
      updateFormData('dateOfBirth', dateString);
      setAge(calculatedAge);
      setIsMinor(calculatedAge < 18);
      setShowDatePicker(false);
    } else {
      showError('Debes tener entre 8 y 100 años');
    }
  };

  const validateStep1 = (): boolean => {
    if (!formData.countryCode.trim()) {
      showError('Selecciona un país');
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
    if (!selectedTelecomCompany) {
      showError('Selecciona una empresa de telefonía');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.name.trim()) {
      showError('El nombre no puede estar vacío');
      return false;
    }
    if (!formData.lastName.trim()) {
      showError('El apellido no puede estar vacío');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!formData.email.trim()) {
      showError('El email no puede estar vacío');
      return false;
    }
    if (!validateEmail(formData.email)) {
      showError('El email no es válido');
      return false;
    }
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
    return true;
  };

  const validateStep4 = (): boolean => {
    if (!formData.dateOfBirth) {
      showError('La fecha de nacimiento es requerida');
      return false;
    }
    if (!formData.location.trim()) {
      showError('La ubicación es requerida');
      return false;
    }
    if (age === null) {
      showError('Fecha de nacimiento inválida');
      return false;
    }
    return true;
  };

  const validateStep5 = (): boolean => {
    if (formData.preferences.favoriteColors.length === 0) {
      showError('Selecciona al menos un color favorito');
      return false;
    }
    if (formData.preferences.favoriteGenres.length === 0) {
      showError('Selecciona al menos un género favorito');
      return false;
    }
    if (formData.preferences.favoriteActivities.length === 0) {
      showError('Selecciona al menos una actividad favorita');
      return false;
    }
    return true;
  };

  const validateStep6 = (): boolean => {
    if (isMinor && !photoUrls.documentPhoto) {
      showError('Debes cargar un documento de identidad');
      return false;
    }
    return true;
  };

  // ===== UPLOAD A S3 =====
  const uploadFileToS3 = useCallback(async (file: any): Promise<boolean> => {
    try {
      if (!file?.uri) {
        showError("Archivo inválido o no seleccionado.");
        return false;
      }

      setUploadingFlag(true);

      let fileSize = file.size || 0;
      
      if (fileSize > 5 * 1024 * 1024 && fileSize > 0) {
        showError("El archivo no puede superar 5MB.");
        setUploadingFlag(false);
        return false;
      }

      const mime = file.mimeType || "image/jpeg";
      const extension = file.name?.split(".").pop() || "jpg";
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

      const response = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, filetype: mime }),
      });

      if (!response.ok) throw new Error("Error generando presigned URL");

      const data = await response.json();
      const url = data?.url;
      if (!url) throw new Error("URL presigned vacía");

      const uploadResult = await FileSystem.uploadAsync(url, file.uri, {
        httpMethod: "PUT",
        headers: { "Content-Type": mime },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (uploadResult.status !== 200 && uploadResult.status !== 201) {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

      const publicUrl = url.split("?")[0];
      await updatePhotoUrl(publicUrl);
      
      setUploadingFlag(false);
      return true;

    } catch (error: any) {
      console.error('Error en upload:', error);
      showError(error?.message || "No se pudo subir el archivo.");
      setUploadingFlag(false);
      return false;
    }
  }, [showError, setUploadingFlag, updatePhotoUrl]);

  const handleDocumentUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const selected = result.assets[0];
      await uploadFileToS3(selected);
    } catch (error) {
      console.error('Error al seleccionar archivo:', error);
      showError("No se pudo seleccionar el archivo.");
    }
  }, [uploadFileToS3, showError]);

  // ===== MANEJADORES DE NAVEGACIÓN =====

  const handleContinue = async () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4);
    } else if (currentStep === 4 && validateStep4()) {
      setCurrentStep(5);
    } else if (currentStep === 5 && validateStep5()) {
      setCurrentStep(isMinor ? 6 : 7);
    } else if (currentStep === 6 && validateStep6()) {
      await handleRegister();
    } else if (currentStep === 7) {
      await handleRegister();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.pop();
    }
  };

  // ===== REGISTRO - GENERAR CÓDIGO Y ENVIAR SMS =====

  const generarCodigoVerificacion = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  const handleRegister = async () => {
    try {
      setIsProcessing(true);

      const fullPhone = `${formData.countryCode}${formData.phone}`.replace(/\s/g, '');

      console.log('📱 Generando código de verificación...');
      
      // Generar código
      const codigo = generarCodigoVerificacion();
      setVerificationCode(codigo);

      // Enviar SMS
      try {
        const smsResponse = await enviarSMS(fullPhone, codigo);
        console.log('✅ SMS enviado:', smsResponse);
      } catch (smsError: any) {
        throw new Error(`Error al enviar SMS: ${smsError?.message || smsError}`);
      }

      if (!isMountedRef.current) return;

      setIsProcessing(false);
      setShowVerificationModal(true);
      setVerificationTimeLeft(VERIFICATION_CODE_TIMEOUT);
      setCanResendCode(false);
      setCodeAttempts(0);
      setInputCode('');

    } catch (error: any) {
      if (!isMountedRef.current) return;

      console.error('❌ Error en registro:', error);
      showError(error.message || 'Error al enviar código');
      setIsProcessing(false);
    }
  };

  // ===== VERIFICACIÓN - GUARDAR EN SERVIDOR =====

  const handleResendCode = async () => {
    if (!canResendCode) {
      showError('Espera a que expire el tiempo antes de reenviar');
      return;
    }

    setCanResendCode(false);
    setVerificationTimeLeft(VERIFICATION_CODE_TIMEOUT);
    setCodeAttempts(0);
    setInputCode('');

    try {
      const fullPhone = `${formData.countryCode}${formData.phone}`.replace(/\s/g, '');
      const codigo = generarCodigoVerificacion();
      setVerificationCode(codigo);

      await enviarSMS(fullPhone, codigo);
      showError('✅ Código reenviado exitosamente');

    } catch (error: any) {
      showError('Error al reenviar código: ' + error.message);
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
      const newAttempts = codeAttempts + 1;
      setCodeAttempts(newAttempts);

      if (newAttempts >= 5) {
        setShowVerificationModal(false);
        showError('Demasiados intentos fallidos. Vuelve a solicitar un código.');
        setIsProcessing(false);
        return;
      }

      showError(`Código incorrecto. Intento ${newAttempts}/5`);
      return;
    }

    try {
      setIsProcessing(true);

      // Guardar usuario en Firestore
      const fullPhone = `${formData.countryCode}${formData.phone}`.replace(/\s/g, '');
      
      await saveMessageToFirestore(
        formData.name,
        formData.lastName,
        formData.email,
        formData.password,
        fullPhone,
        formData.dateOfBirth,
        age,
          isMinor ? 'cedula' : undefined,
        `${formData.countryName}, ${formData.location}`,
        formData.preferences,
        photoUrls.documentPhoto,
        "document",
        selectedTelecomCompany?.nit,
        selectedTelecomCompany?.name
      );

      if (!isMountedRef.current) return;

      await clearForm();
      setShowVerificationModal(false);
      setIsProcessing(false);

      // Mostrar modal de bienvenida
      setShowSuccess(true);

      // Auto-login después de 2 segundos
      setTimeout(() => {
        setAuthResponse({
          success: true,
          user: {
            phone: fullPhone,
            email: formData.email,
            name: formData.name,
            lastName: formData.lastName
          }
        });

        navigation.reset({
          index: 0,
          routes: [{ name: 'UserLoginScreen' }]
        });
      }, 2000);

    } catch (error: any) {
      if (!isMountedRef.current) return;

      console.error('Error en verificación:', error);
      showError(error.message || 'Error al completar registro');
      setIsProcessing(false);
    }
  };

  const togglePreference = (category: 'favoriteColors' | 'favoriteGenres' | 'favoriteActivities', value: string) => {
    const current = formData.preferences[category];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];

    updateFormData('preferences', {
      ...formData.preferences,
      [category]: updated
    });
  };

  // ===== RENDERIZADO DE PASOS =====

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 1 DE {isMinor ? '6' : '5'}</Text>
        <Text style={styles.stepTitle}>Tu teléfono</Text>
        <Text style={styles.stepSubtitle}>Será tu identidad en la plataforma</Text>
      </View>

      <View style={styles.inputsContainer}>
        {/* ✅ NUEVO: Selector de Empresa con isoCode */}
       

        <View>
          <Text style={styles.inputLabel}>País</Text>
          <TouchableOpacity
            onPress={() => setShowCountryModal(true)}
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: '#f9f9f9',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text style={{ fontSize: 16, color: '#333', fontWeight: '500' }}>
              {formData.countryName} ({formData.countryCode})
            </Text>
            <Text style={{ fontSize: 18 }}>▼</Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text style={styles.inputLabel}>Teléfono</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: '#f9f9f9',
              minWidth: 60,
              justifyContent: 'center'
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                {formData.countryCode}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <DefaultTextInputUserCountry
                icon={require("../../../../assets/profile_phone.png")}
                placeholder='000 000 0000'
                onChangeText={text => updateFormData('phone', text)}
                value={formData.phone}
                keyBoarType='numeric'
                secureText={false}
              />
            </View>
          </View>
        </View>

         <TelecomCompanySelector
          selectedCompany={selectedTelecomCompany}
          selectedCountryIsoCode={formData.countryIsoCode}
          onSelectCompany={(company) => {
            setSelectedTelecomCompany(company);
            updateFormData('telecomCompanyNit', company.nit);
            updateFormData('telecomCompanyName', company.name);
          }}
        />
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text="Continuar"
          onPress={handleContinue}
          color='#E91E63'
        />
      </View>

      <Modal visible={showCountryModal} transparent animationType="fade">
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 20
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxHeight: '80%'
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
              Selecciona un país
            </Text>

            <TextInput
              placeholder='Buscar país...'
              value={searchCountry}
              onChangeText={handleSearchCountry}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 12,
                fontSize: 14
              }}
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectCountry(item)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f0f0f0'
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#333' }}>
                    {item.name} ({item.code})
                  </Text>
                </TouchableOpacity>
              )}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            />

            <TouchableOpacity
              onPress={() => setShowCountryModal(false)}
              style={{
                marginTop: 16,
                paddingVertical: 12,
                backgroundColor: '#E91E63',
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 2 DE {isMinor ? '6' : '5'}</Text>
        <Text style={styles.stepTitle}>Tu nombre</Text>
        <Text style={styles.stepSubtitle}>Así te conoceremos en la comunidad</Text>
      </View>

      <View style={styles.inputsContainer}>
        <DefaultTextInputDriverBlack
          icon={require("../../../../assets/profile_icon_2.png")}
          placeholder='Nombre'
          onChangeText={text => updateFormData('name', text)}
          value={formData.name}
          keyBoarType='default'
          secureText={false}
        />
        <DefaultTextInputDriverBlack
          icon={require("../../../../assets/profile_icon_2.png")}
          placeholder='Apellido'
          onChangeText={text => updateFormData('lastName', text)}
          value={formData.lastName}
          keyBoarType='default'
          secureText={false}
        />
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text="Continuar"
          onPress={handleContinue}
          color='#E91E63'
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 3 DE {isMinor ? '6' : '5'}</Text>
        <Text style={styles.stepTitle}>Crea tu cuenta</Text>
        <Text style={styles.stepSubtitle}>Email y contraseña segura</Text>
      </View>

      <View style={styles.inputsContainer}>
        <DefaultTextInputDriverBlack
          icon={require("../../../../assets/profile_mail.png")}
          placeholder='tu@email.com'
          onChangeText={text => updateFormData('email', text)}
          value={formData.email}
          keyBoarType='email-address'
          secureText={false}
        />
        <DefaultTextInputDriverBlackPassword
          icon={require("../../../../assets/profile_key.png")}
          placeholder='Mínimo 6 caracteres'
          onChangeText={text => updateFormData('password', text)}
          value={formData.password}
          keyBoarType='numeric'
          secureText={true}
        />
        <DefaultTextInputDriverBlackPassword
          icon={require("../../../../assets/profile_key.png")}
          placeholder='Confirmar contraseña'
          onChangeText={text => updateFormData('confirmPassword', text)}
          value={formData.confirmPassword}
          keyBoarType='numeric'
          secureText={true}
        />
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text="Continuar"
          onPress={handleContinue}
          color='#E91E63'
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 4 DE {isMinor ? '6' : '5'}</Text>
        <Text style={styles.stepTitle}>Cuéntanos más</Text>
        <Text style={styles.stepSubtitle}>Tu edad y ubicación</Text>
      </View>

      <View style={styles.inputsContainer}>
        <View>
          <Text style={styles.inputLabel}>Fecha de nacimiento</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              backgroundColor: '#f9f9f9',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text style={{ fontSize: 16, color: formData.dateOfBirth ? '#333' : '#999', fontWeight: '500' }}>
              {formData.dateOfBirth ? formData.dateOfBirth : 'Selecciona tu fecha de nacimiento'}
            </Text>
            <Text style={{ fontSize: 18 }}>📅</Text>
          </TouchableOpacity>
          {age !== null && (
            <Text style={styles.helperText}>
              {isMinor ? `⚠️ Eres menor de edad (${age} años)` : `✅ Tienes ${age} años`}
            </Text>
          )}
        </View>

        <LocationPicker
          selectedLocation={formData.location}
          selectedCountry={formData.countryName}
          onSelectLocation={(location, country) => {
            updateFormData('location', location);
            updateFormData('countryName', country);
          }}
        />
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text="Continuar"
          onPress={handleContinue}
          color='#E91E63'
        />
      </View>

      {/* Modal DatePicker */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <View style={{
            width: 350,
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
              Fecha de nacimiento
            </Text>

            {/* Año */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Año</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                overflow: 'hidden',
                height: 150
              }}>
                <ScrollView
                  snapToInterval={40}
                  decelerationRate="fast"
                >
                  {Array.from({ length: 100 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <TouchableOpacity
                        key={year}
                        onPress={() => setSelectedYear(year)}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          backgroundColor: selectedYear === year ? '#E91E63' : 'white'
                        }}
                      >
                        <Text style={{
                          fontSize: 16,
                          fontWeight: selectedYear === year ? '700' : '500',
                          color: selectedYear === year ? 'white' : '#333',
                          textAlign: 'center'
                        }}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Mes */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Mes</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                overflow: 'hidden',
                height: 150
              }}>
                <ScrollView
                  contentContainerStyle={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: 8,
                    justifyContent: 'space-between'
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthName = new Date(2000, i, 1).toLocaleString('es-ES', { month: 'short' });
                    return (
                      <TouchableOpacity
                        key={month}
                        onPress={() => setSelectedMonth(month)}
                        style={{
                          width: '30%',
                          paddingVertical: 12,
                          borderRadius: 8,
                          backgroundColor: selectedMonth === month ? '#E91E63' : '#f0f0f0',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Text style={{
                          fontSize: 12,
                          fontWeight: selectedMonth === month ? '700' : '500',
                          color: selectedMonth === month ? 'white' : '#333',
                        }}>
                          {monthName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Día */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Día</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                overflow: 'hidden',
                height: 150
              }}>
                <ScrollView
                  contentContainerStyle={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 6,
                    padding: 8,
                    justifyContent: 'space-between'
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => setSelectedDay(day)}
                        style={{
                          width: '13%',
                          aspectRatio: 1,
                          borderRadius: 8,
                          backgroundColor: selectedDay === day ? '#E91E63' : '#f0f0f0',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingBottom: 10
                        }}
                      >
                        <Text style={{
                          fontSize: 11,
                          fontWeight: selectedDay === day ? '700' : '500',
                          color: selectedDay === day ? 'white' : '#333',
                        }}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <RoundedButton
                text="Confirmar"
                onPress={handleConfirmDate}
                color='#E91E63'
              />
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#f0f0f0',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#333', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderStep5 = () => (
    <ScrollView style={{ flex: 1 }}>
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>PASO 5 DE {isMinor ? '6' : '5'}</Text>
          <Text style={styles.stepTitle}>Tus preferencias</Text>
          <Text style={styles.stepSubtitle}>Personaliza tu experiencia</Text>
        </View>

        <View style={styles.inputsContainer}>
          <View>
            <Text style={styles.preferenceTitle}>Colores Favoritos</Text>
            <View style={styles.preferencesGrid}>
              {PREFERENCES_OPTIONS.colors.map(color => (
                <TouchableOpacity
                  key={color}
                  onPress={() => togglePreference('favoriteColors', color)}
                  style={[
                    styles.preferenceTag,
                    formData.preferences.favoriteColors.includes(color) && styles.preferenceTagSelected
                  ]}
                >
                  <Text style={[
                    styles.preferenceTagText,
                    formData.preferences.favoriteColors.includes(color) && styles.preferenceTagTextSelected
                  ]}>
                    {color}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.preferenceTitle}>Géneros Musicales</Text>
            <View style={styles.preferencesGrid}>
              {PREFERENCES_OPTIONS.genres.map(genre => (
                <TouchableOpacity
                  key={genre}
                  onPress={() => togglePreference('favoriteGenres', genre)}
                  style={[
                    styles.preferenceTag,
                    formData.preferences.favoriteGenres.includes(genre) && styles.preferenceTagSelected
                  ]}
                >
                  <Text style={[
                    styles.preferenceTagText,
                    formData.preferences.favoriteGenres.includes(genre) && styles.preferenceTagTextSelected
                  ]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.preferenceTitle}>Actividades</Text>
            <View style={styles.preferencesGrid}>
              {PREFERENCES_OPTIONS.activities.map(activity => (
                <TouchableOpacity
                  key={activity}
                  onPress={() => togglePreference('favoriteActivities', activity)}
                  style={[
                    styles.preferenceTag,
                    formData.preferences.favoriteActivities.includes(activity) && styles.preferenceTagSelected
                  ]}
                >
                  <Text style={[
                    styles.preferenceTagText,
                    formData.preferences.favoriteActivities.includes(activity) && styles.preferenceTagTextSelected
                  ]}>
                    {activity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.stepFooter}>
          <RoundedButton
            text="Continuar"
            onPress={handleContinue}
            color='#E91E63'
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 6 DE 6</Text>
        <Text style={styles.stepTitle}>Documento de identidad</Text>
        <Text style={styles.stepSubtitle}>Requerido por ser menor de edad</Text>
      </View>

      <View style={styles.inputsContainer}>
        {uploadingState.document ? (
          <View style={{ marginVertical: 10 }}>
            <ActivityIndicator size="large" color="#E91E63" />
            <Text style={{ color: "black", textAlign: 'center', marginTop: 8 }}>Subiendo documento...</Text>
          </View>
        ) : photoUrls.documentPhoto ? (
          <TouchableOpacity
            style={{
              backgroundColor: '#E8F5E9',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#4CAF50'
            }}
            onPress={handleDocumentUpload}
          >
            <Text style={{ color: '#2E7D32', fontWeight: '600' }}>✅ DOCUMENTO CARGADO - EDITAR</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleDocumentUpload}
            style={{
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: '#E91E63',
              borderRadius: 12,
              padding: 24,
              alignItems: 'center'
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📄</Text>
            <Text style={{ color: '#333', fontWeight: '600' }}>Selecciona un documento</Text>
            <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              Cédula, pasaporte o acta de nacimiento
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text={isProcessing ? "Registrando..." : "Completar Registro"}
          onPress={handleContinue}
          color={isProcessing ? '#ccc' : '#E91E63'}
        />
      </View>
    </View>
  );

  const renderStep7 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>PASO 5 DE 5</Text>
        <Text style={styles.stepTitle}>¡Casi listo!</Text>
        <Text style={styles.stepSubtitle}>Confirma tus datos</Text>
      </View>

      <View style={styles.inputsContainer}>
        <View style={{ backgroundColor: '#F5F5F5', padding: 16, borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Nombre</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{formData.name} {formData.lastName}</Text>

          <Text style={{ fontSize: 12, color: '#999', marginBottom: 4, marginTop: 12 }}>Email</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{formData.email}</Text>

          <Text style={{ fontSize: 12, color: '#999', marginBottom: 4, marginTop: 12 }}>Teléfono</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{formData.countryCode} {formData.phone}</Text>

          <Text style={{ fontSize: 12, color: '#999', marginBottom: 4, marginTop: 12 }}>País</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{formData.countryName}</Text>

          <Text style={{ fontSize: 12, color: '#999', marginBottom: 4, marginTop: 12 }}>Empresa de Telefonía</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{selectedTelecomCompany?.name || 'No seleccionada'}</Text>

          <Text style={{ fontSize: 12, color: '#999', marginBottom: 4, marginTop: 12 }}>Edad</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{age} años</Text>

          <Text style={{ fontSize: 12, color: '#999', marginBottom: 4, marginTop: 12 }}>Ubicación</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{formData.location}</Text>
        </View>
      </View>

      <View style={styles.stepFooter}>
        <RoundedButton
          text={isProcessing ? "Registrando..." : "Crear Cuenta"}
          onPress={handleContinue}
          color={isProcessing ? '#ccc' : '#E91E63'}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAwareScrollView 
      behavior={Platform.OS === "ios" ? 'padding' : 'height'} 
      style={{ flex: 1 }}
      enableOnAndroid
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <View style={styles.headerPurple}>
          <TouchableOpacity onPress={handleBack} style={styles.back_button}>
            <Image style={styles.back_img} source={require("../../../../assets/profile_flecha.png")} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BIVI CONNECT</Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              {
                width: `${(currentStep / (isMinor ? 6 : 5)) * 100}%`
              }
            ]} />
          </View>
        </View>

        <View style={styles.stepsWrapper}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
          {currentStep === 7 && renderStep7()}
        </View>
      </View>

      {/* Modal de Verificación */}
      <Modal visible={showVerificationModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verifica tu teléfono</Text>
            <Text style={styles.modalText}>
              Ingresa el código de 6 dígitos que enviamos a {formData.countryCode} {formData.phone}
            </Text>

            <View style={{
              backgroundColor: '#FFF3E0',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#FF9800'
            }}>
              <Text style={{ color: '#E65100', fontWeight: '600' }}>
                ⏱️ Tiempo restante: {Math.floor(verificationTimeLeft / 60)}:{String(verificationTimeLeft % 60).padStart(2, '0')}
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
                opacity: isProcessing ? 0.6 : 1
              }}
            />

            <View style={styles.modalButtons}>
              {isProcessing ? (
                <ActivityIndicator size="large" color="#E91E63" />
              ) : (
                <>
                  <RoundedButton
                    text="Confirmar"
                    onPress={handleVerifyCode}
                    color='#E91E63'
                  />
                  
                  <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={!canResendCode}
                    style={{ marginTop: 12, opacity: canResendCode ? 1 : 0.5 }}
                  >
                    <Text style={{ 
                      color: '#E91E63', 
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      {canResendCode ? '🔄 Reenviar código' : 'Esperando tiempo...'}
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

      <WelcomeModal
        visible={showSuccess}
        title=""
        subtitle="¡Bienvenido a BIVI CONNECT!"
        buttonText="Continuar"
        icon="check"
        onClose={() => setShowSuccess(false)}
      />

      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </KeyboardAwareScrollView>
  );
}