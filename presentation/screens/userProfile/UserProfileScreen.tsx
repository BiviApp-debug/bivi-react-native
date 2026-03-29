import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Animated,
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
import AdvertisingCarousel from "../../components/AdvertisingCarousel";
import { getRatingByUser } from "../../utils/HandleRatings";
import ClientProfilePhotoUploader from "./ClientProfilePhotoUploader";
import ErrorModal from "../../components/ErrorModal";
import SuccessModal from "../../components/SuccessModal";
import { logoutDriver, logoutUser } from "../../utils/Logout";
import HistoryModal from "./HistoryModal"; // 🔥 IMPORT

interface Props extends StackScreenProps<RootStackParamList, "UserProfileScreen"> { }

type UserProfile = {
  id: number;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  photo: string;
};

export default function UserProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCardModal, setShowCardModal] = useState(false);
  const [showNequi, setShowNequi] = useState(false);
  const [hasCard, setHasCard] = useState(false);

  const [showPaymentsOptions, setShowPaymentsOptions] = useState(false);
  const [showPersonalInformation, setShowPersonalInformation] = useState(false);

  const [showDaviPlata, setShowDaviPlata] = useState(false);
  const [userRating, setUserRating] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false); // 🔥 NEW
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  const { authResponse, removeAuthSession, setAuthResponse } = useContext(dataContext);


  useEffect(() => {
    if (profile) {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    setProfile(authResponse.usuario);

    (async () => {
      let myRatings = await getRatingByUser(authResponse.usuario.phone)
      setUserRating(myRatings.rating)
      await loadClientProfilePhoto();
    })()
  }, []);

  useEffect(() => {
    Animated.stagger(90, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, cardAnim, footerAnim]);

  const loadClientProfilePhoto = async () => {
    try {
      console.log('🔍 Cargando foto de perfil del cliente...');

      const response = await fetch(
        `${API_BASE_URL}/api/client-profile-photo/${authResponse.usuario.phone}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Foto de perfil encontrada:', data.data.profilePhoto);
        setProfilePhotoUrl(data.data.profilePhoto);
      } else {
        console.log('ℹ️ No se encontró foto de perfil para este cliente');
        setProfilePhotoUrl(null);
      }
    } catch (error) {
      console.error('❌ Error cargando foto de perfil:', error);
      setProfilePhotoUrl(null);
    }
  };


  const handlePhotoUploaded = (url: string) => {
    console.log('✅ Foto subida exitosamente:', url);
    setProfilePhotoUrl(url);
  };

  useEffect(() => {
    if (authResponse?.usuario?.phone) {

    }
  }, [authResponse]);


  const ChangeAccount = async () => {
    setAuthResponse({
      message: "",
      usuario: {
        id: 0,
        name: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        role: "",
        photo: ""
      }
    })
    navigation.navigate('DriverLoginScreen')
  }

  const handleCardSaved = () => {
    setSuccessMessage(`✅Tu método de pago ha sido guardado`);
    setShowSuccessModal(true);
    setTimeout(() => {
      setHasCard(true);
    }, 2000);
  };


  const handleLogout = async () => {
    try {
      // Eliminar el teléfono guardado del storage
      await AsyncStorage.removeItem('savedPhone');

      // Limpiar el estado de autenticación
      setAuthResponse({
        message: "",
        usuario: {
          id: 0,
          name: "",
          lastName: "",
          email: "",
          phone: "",
          password: "",
          role: "",
          photo: ""
        }
      });

      if(authResponse?.usuario?.role === "driver_role"){
        await logoutDriver(authResponse?.usuario?.phone)
      }else{
        await logoutUser(authResponse?.usuario?.phone)
      }

      navigation.replace('UserLoginScreen');

    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setErrorMessage("Hubo un problema al cerrar sesión");
      setShowErrorModal(true);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'driver_role':
        return 'Conductor';
      case 'user_client':
        return 'Usuario';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'driver_role':
        return '🚗';
      case 'user_client':
        return '👤';
      default:
        return '👤';
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>No se encontró el perfil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container_app}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {/* Header con gradiente */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.profileImageContainer}>

            <ClientProfilePhotoUploader
              phone={authResponse.usuario.phone}
              currentPhoto={profilePhotoUrl}
              onPhotoUploaded={handlePhotoUploaded}
              size={50}
            />
            <View>
              <Text style={styles.userName}>Hola {profile.name.split(" ")[0]} {profile.lastName.split(" ")[0]}</Text>
              <Text style={styles.userRatings}>⭐⭐⭐⭐⭐</Text>
              <Text style={styles.userRole}>Tu perfil esta optimizado para ti</Text>
            </View>

          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.goBack()}>
            <Image
              source={require("../../../assets/close_hide.png")}
              style={[
                styles.hideWindow,
                { transform: [{ rotate: '90deg' }] }
              ]}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: cardAnim,
              transform: [
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userRating}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>156</Text>
            <Text style={styles.statLabel}>Viajes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>2.1k</Text>
            <Text style={styles.statLabel}>Puntos</Text>
          </View>
        </Animated.View>

        {/* Configuración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu cuenta</Text>

          <Animated.View
            style={[
              styles.menuCard,
              {
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* 🔥 NUEVO: Botón de Historial funcional */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setShowHistoryModal(true)}
            >
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>📋</Text>
              </View>
              <Text style={styles.menuText}>Historial</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>🔔</Text>
              </View>
              <Text style={styles.menuText}>Notificaciones</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}
              onPress={() => setShowPersonalInformation(!showPersonalInformation)}
            >
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>🔒</Text>
              </View>
              <Text style={styles.menuText}>Información</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {showPersonalInformation && (
              <View style={{ marginLeft: 10, marginTop: 0 }}>

                {/* Personal */}
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoIconText}>📧</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{profile.email}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoIconText}>📱</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Teléfono</Text>
                    <Text style={styles.infoValue}>{profile.phone}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoIconText}>{getRoleIcon(profile.role)}</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Tipo de cuenta</Text>
                    <Text style={styles.infoValue}>{getRoleDisplayName(profile.role)}</Text>
                  </View>
                </View>

              </View>
            )}

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowPaymentsOptions(!showPaymentsOptions)}
            >
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>💳</Text>
              </View>

              <Text style={styles.menuText}>Métodos de pago</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>


            {/* SUBMENÚ DE MÉTODOS DE PAGO */}
            {showPaymentsOptions && (
              <View style={{ marginLeft: 10, marginTop: 0 }}>

                {/* TARJETA */}
                <TouchableOpacity
                  style={styles.paymentMethodButton}
                  onPress={() => setShowCardModal(true)}
                >
                  <View style={styles.paymentMethodIcon}>
                    <Text style={{ fontSize: 24 }}>💳</Text>
                  </View>

                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>
                      {hasCard ? "Método de pago guardado" : "Agregar método de pago"}
                    </Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      {hasCard ? "Tarjeta registrada" : "Agrega una tarjeta de crédito"}
                    </Text>
                  </View>

                  <Text style={styles.paymentMethodArrow}>›</Text>
                </TouchableOpacity>


                {/* NEQUI */}
                <TouchableOpacity
                  style={styles.paymentMethodButton}
                  onPress={() => setShowNequi(true)}
                >
                  <View style={styles.paymentMethodIcon}>
                    <Text style={{ fontSize: 24 }}>N</Text>
                  </View>

                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>Nequi</Text>
                    <Text style={styles.paymentMethodSubtitle}>Pagar con Nequi</Text>
                  </View>

                  <Text style={styles.paymentMethodArrow}>›</Text>
                </TouchableOpacity>


                {/* DAVIPLATA */}
                <TouchableOpacity
                  style={styles.paymentMethodButton}
                  onPress={() => setShowDaviPlata(true)}
                >
                  <View style={styles.paymentMethodIcon}>
                    <Text style={{ fontSize: 24 }}>🔴</Text>
                  </View>

                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>DaviPlata</Text>
                    <Text style={styles.paymentMethodSubtitle}>Pagar con DaviPlata</Text>
                  </View>

                  <Text style={styles.paymentMethodArrow}>›</Text>
                </TouchableOpacity>


                {/* EFECTIVO */}
                <TouchableOpacity style={styles.paymentMethodButton}>
                  <View style={styles.paymentMethodIcon}>
                    <Text style={{ fontSize: 24 }}>💵</Text>
                  </View>

                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>Efectivo</Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      Paga tu arriendo con efectivo
                    </Text>
                  </View>

                  <Text style={styles.paymentMethodArrow}>›</Text>
                </TouchableOpacity>

              </View>
            )}


            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>📞</Text>
              </View>
              <Text style={styles.menuText}>Ciudad a Ciudad</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.View style={[styles.section, { opacity: footerAnim }]}>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.emergencyButton}>
            <Text style={styles.emergencyButtonText}> Modo Conductor</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={[styles.section, { opacity: footerAnim }]}>
          <TouchableOpacity
            style={styles.logoutButtonStyle}
            onPress={handleLogout}
          >
            <Image
              source={require("../../../assets/SignOut.png")}

            />
            <Text style={styles.logoutButtonText}>
              Cerrar Sesión</Text>

          </TouchableOpacity>
        </Animated.View>

        <View style={styles.section}>
          <View style={styles.adsTitleRow}>
            <Text style={styles.sectionTitle}>Publicidad para ti</Text>
            <Text style={styles.adsBadge}>Destacado</Text>
          </View>
          <Text style={styles.adsSubtitle}>
            Promociones activas y novedades para ti
          </Text>
          <AdvertisingCarousel featured />
        </View>

        <View style={styles.section}>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              MotoUberos v2.1.0{'\n'}
              © 2025 MotoUberos Inc.
            </Text>
          </View>
        </View>

        {/* Espacio extra para el scroll */}
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* 🔥 NUEVO: History Modal */}
      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        userPhone={authResponse.usuario.phone}
      />

      <CreditCardModal
        visible={showCardModal}
        onClose={() => setShowCardModal(false)}
        userPhone={authResponse.usuario.phone}
        onCardSaved={handleCardSaved}
      />

      <DaviPlataPaymentModal
        visible={showDaviPlata}
        onClose={() => setShowDaviPlata(false)}
        userPhone={authResponse.usuario.phone}
        onSuccess={(source) => {
          console.log("DaviPlata guardado:", source);
        }}
      />

      <NequiPaymentModal
        visible={showNequi}
        onClose={() => setShowNequi(false)}
        userPhone={authResponse.usuario.phone}
        onSuccess={(source) => {
          console.log("Método guardado:", source);
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

const styles = StyleSheet.create({
  logoutButtonStyle: {
    backgroundColor: COLORS.error || '#FF3B30',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  logoutButtonText: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: "white",
    fontSize: 16,
    fontWeight: '600',
  },
  container_app: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  vehicleImage: {
    width: 80,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  hideWindow: {
    position: "absolute",
    right: 5
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
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  paymentMethodArrow: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginVertical: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
  header: {
    backgroundColor: COLORS.backgroundLight,
    paddingTop: 48,
    paddingHorizontal: 14,
    paddingBottom: 18,
    paddingLeft: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
    paddingTop: 0,
  },

  backButton: {
    padding: 8,
  },

  backIcon: {
    width: 24,
    height: 24,
  },

  logoutButton: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'flex-start',
    marginBottom: 'auto'

  },

  logoutText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Foto de perfil
  profileImageContainer: {
    position: 'relative',
    marginBottom: 8,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 'auto'
  },

  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.backgroundMedium,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  user_img: {
    borderRadius: 40,
    top: 0,
    left: 0,
    width: 90,
    display: 'flex',
    height: 90,
    zIndex: 10000,
    elevation: 1,
  },
  profileImagePlaceholderText: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: 'bold',
  },

  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.backgroundLight,
  },

  roleBadgeText: {
    fontSize: 16,
  },

  userName: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userRatings: {
    gap: 4
  },
  userRole: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  // Estadísticas
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  // Secciones
  section: {
    marginTop: 12,
    marginBottom: 2,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'left'
  },
  adsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adsBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.textDark,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  adsSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  // Tarjeta de información
  infoCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  infoIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  infoIconText: {
    fontSize: 20,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },

  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },

  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },

  // Menú de configuración
  menuCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },

  menuIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  menuIconText: {
    fontSize: 20,
  },

  menuText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },

  menuArrow: {
    color: COLORS.textSecondary,
    fontSize: 20,
  },

  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },
  // Botón de emergencia
  emergencyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  emergencyButtonText: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: '700',
  },
  // Acerca de
  aboutCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aboutText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 25,
  },
});