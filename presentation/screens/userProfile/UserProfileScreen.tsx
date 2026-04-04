import React, { useContext, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  StatusBar,
  Alert,
} from "react-native";
import { API_BASE_URL } from "../../API/API";
import { dataContext } from "../../context/Authcontext";
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import COLORS from "../../utils/colors";
import NequiPaymentModal from "../clientHome/screenMap/NequiPaymentModal";
import CreditCardModal from "../clientHome/screenMap/CreditCardModal";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DaviPlataPaymentModal from "../clientHome/screenMap/DaviPlataPaymentModal";
import ErrorModal from "../../components/ErrorModal";
import SuccessModal from "../../components/SuccessModal";
import { logoutDriver, logoutUser } from "../../utils/Logout";
import HistoryModal from "./HistoryModal";

// ===== IMPORTAR LOS COMPONENTES =====
import HomeScreen from "./HomeScreen";
import MisionesScreen from "./MisionesScreen";
import OfferDetailScreen from "./OfferDetailScreen";
import ProfileDetailScreen from "./ProfileDetailScreen";
import { connectSocket } from "../../utils/Conections";

// ===== IMPORTAR TIPOS Y FUNCIÓN DE CARGA =====
import { UserData, TelecomCompany, Mission, Offer } from "./Biviconnectapi";
import { loadCompleteUserData } from "./Loadcompleteuserdata";

interface Props extends StackScreenProps<RootStackParamList, "UserProfileScreen"> { }

type ScreenType = 'home' | 'missions' | 'offer-detail' | 'analytics' | 'profile';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function UserProfileScreen({ navigation }: Props) {
  // ===== ESTADOS DE DATOS =====
  const [user, setUser] = useState<UserData | null>(null);
  const [company, setCompany] = useState<TelecomCompany | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // ===== ESTADOS DE UI =====
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  // ===== ESTADOS DE MODALES =====
  const [showCardModal, setShowCardModal] = useState(false);
  const [showNequi, setShowNequi] = useState(false);
  const [showDaviPlata, setShowDaviPlata] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // ===== CONTEXTO =====
  const { authResponse, removeAuthSession, setAuthResponse } = useContext(dataContext);

  // ===== OTROS ESTADOS =====
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [hasCard, setHasCard] = useState(false);

  // ============================================
  // EFECTO: Cargar datos completos del usuario
  // ============================================

  useEffect(() => {
    const initializeUserData = async () => {
      try {
        setLoading(true);

        // Validar que tenemos el teléfono del usuario
        if (!authResponse?.usuario?.phone) {
          console.error('❌ No hay teléfono disponible en authResponse');
          setErrorMessage('No se encontró el teléfono del usuario');
          setShowErrorModal(true);
          setLoading(false);
          return;
        }

        const userPhone = authResponse.usuario.phone;

        console.log('🔄 Iniciando carga de datos para:', userPhone);

        // ===== LLAMAR AL SERVICIO COMPLETO =====
        const response = await loadCompleteUserData(userPhone);

        if (!response.success) {
          throw new Error(response.error || 'Error desconocido');
        }

        // ===== GUARDAR TODOS LOS DATOS =====
        if (response.user) {
          setUser(response.user);
          console.log('✅ Usuario cargado:', response.user.name);
        }

        if (response.company) {
          setCompany(response.company);
          console.log('✅ Empresa cargada:', response.company.name);
        }

        if (response.missions && response.missions.length > 0) {
          setMissions(response.missions);
          console.log('✅ Misiones cargadas:', response.missions.length);
        }

        if (response.offers && response.offers.length > 0) {
          setOffers(response.offers);
          console.log('✅ Ofertas cargadas:', response.offers.length);
        }

        // Mostrar advertencia si hay
        if (response.warning) {
          console.warn('⚠️', response.warning);
          setSuccessMessage(response.warning);
          setShowSuccessModal(true);
        }

        // Cargar foto de perfil
        await loadClientProfilePhoto(userPhone);

        // Conectar socket
        connectSocket(userPhone);

      } catch (error: any) {
        console.error('❌ Error inicializando datos:', error.message);
        setErrorMessage(error.message || 'Error al cargar los datos del usuario');
        setShowErrorModal(true);
      } finally {
        setLoading(false);
      }
    };

    initializeUserData();

  }, [authResponse?.usuario?.phone]);

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================

  const loadClientProfilePhoto = async (phone: string) => {
    try {
      console.log('📸 Cargando foto de perfil...');

      const response = await fetch(
        `${API_BASE_URL}/api/client-profile-photo/${phone}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Foto encontrada');
        setProfilePhotoUrl(data.data.profilePhoto);
      } else {
        console.log('ℹ️ Sin foto de perfil');
        setProfilePhotoUrl(null);
      }
    } catch (error) {
      console.error('❌ Error cargando foto:', error);
      setProfilePhotoUrl(null);
    }
  };

  const handlePhotoUploaded = (url: string) => {
    console.log('✅ Foto subida:', url);
    setProfilePhotoUrl(url);
  };

  const handleCardSaved = () => {
    setSuccessMessage('✅ Tu método de pago ha sido guardado');
    setShowSuccessModal(true);
    setTimeout(() => {
      setHasCard(true);
    }, 2000);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('savedPhone');

      const defaultUser = {
        id: 0,
        name: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        role: "",
        photo: ""
      };

      setAuthResponse({
        message: "",
        usuario: defaultUser
      });

      if (authResponse?.usuario?.role === "driver_role") {
        await logoutDriver(authResponse?.usuario?.phone);
      } else {
        await logoutUser(authResponse?.usuario?.phone);
      }

      navigation.replace('UserLoginScreen');

    } catch (error) {
      console.error('❌ Error en logout:', error);
      setErrorMessage("Hubo un problema al cerrar sesión");
      setShowErrorModal(true);
    }
  };

  // ============================================
  // RENDERIZADO
  // ============================================

  // Loading State
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil y datos...</Text>
      </View>
    );
  }

  // Error State
  if (!user) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>No se encontró el perfil</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main Screen
  return (
    <View style={styles.container_app}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* ===== PANTALLA 1: HOME ===== */}
      {currentScreen === 'home' && (
        <HomeScreen
          profile={{
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            password: "",
            role: user.role,
            photo: profilePhotoUrl || "",
          }}
          userRating="0"
          profilePhotoUrl={profilePhotoUrl}
          authResponse={authResponse}
          onPhotoUploaded={handlePhotoUploaded}
          onNavigate={(screen: ScreenType) => setCurrentScreen(screen)}
          onSelectOffer={(offer: Offer) => {
            setSelectedOffer(offer);
            setCurrentScreen('offer-detail');
          }}
          onLogout={handleLogout}
          navigation={navigation}
          company={company}
          missions={missions}
          offers={offers}
        />
      )}

      {/* ===== PANTALLA 2: MISIONES ===== */}
      {currentScreen === 'missions' && (
        <MisionesScreen
          onBack={() => setCurrentScreen('home')}
          onSelectOffer={(offer: Offer) => {
            setSelectedOffer(offer);
            setCurrentScreen('offer-detail');
          }}
          missions={missions}
          userPhone={user.phone}
          telecomCompanyNit={company?.nit || ""}
        />
      )}

      {/* ===== PANTALLA 3: DETALLE DE OFERTA ===== */}
      {currentScreen === 'offer-detail' && selectedOffer && (
        <OfferDetailScreen
          offer={selectedOffer}
          onBack={() => setCurrentScreen('missions')}
          userPhone={user.phone}
          telecomCompanyNit={company?.nit || ""}
        />
      )}

      {/* ===== PANTALLA 4: ANALYTICS ===== */}
      {currentScreen === 'analytics' && (
        <AnalyticsScreen
          onBack={() => setCurrentScreen('home')}
          userPhone={user.phone}
        />
      )}

      {/* ===== PANTALLA 5: PERFIL ===== */}
      {currentScreen === 'profile' && (
        <ProfileDetailScreen
          onBack={() => setCurrentScreen('home')}
          profile={{
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            password: "",
            role: user.role,
            photo: profilePhotoUrl || "",
          }}
          profilePhotoUrl={profilePhotoUrl}
          company={company}
        />
      )}

      {/* ===== MODALES ===== */}
      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        userPhone={user.phone}
      />

      <CreditCardModal
        visible={showCardModal}
        onClose={() => setShowCardModal(false)}
        userPhone={user.phone}
        onCardSaved={handleCardSaved}
      />

      <DaviPlataPaymentModal
        visible={showDaviPlata}
        onClose={() => setShowDaviPlata(false)}
        userPhone={user.phone}
        onSuccess={(source) => {
          console.log("✅ DaviPlata guardado:", source);
        }}
      />

      <NequiPaymentModal
        visible={showNequi}
        onClose={() => setShowNequi(false)}
        userPhone={user.phone}
        onSuccess={(source) => {
          console.log("✅ Nequi guardado:", source);
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
  );
}

// ============================================
// COMPONENTE PLACEHOLDER: AnalyticsScreen
// ============================================
// Reemplaza esto con tu componente real

function AnalyticsScreen({ onBack, userPhone }: any) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Analytics Screen</Text>
      <TouchableOpacity onPress={onBack}>
        <Text style={{ color: COLORS.primary, marginTop: 20 }}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container_app: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
});