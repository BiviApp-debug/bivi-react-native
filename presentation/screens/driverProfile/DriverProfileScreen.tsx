import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  Modal,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dataContext } from "../../context/Authcontext";
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import COLORS from "../../utils/colors";
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdvertisingCarousel from "../../components/AdvertisingCarousel";
import { getRatingByUser } from "../../utils/HandleRatings";
import ProfilePhotoUploader from "./ProfilePhotoUploader";
import { API_BASE_URL } from "../../API/API";
import ErrorModal from "../../components/ErrorModal";
import SuccessModal from "../../components/SuccessModal";
import { logoutDriver, logoutUser } from "../../utils/Logout";
import HistoryModal from "./HistoryModal";
import formatToCOP from "../../utils/formatCop";
import { getInvoiceTravelsPricesConductor } from "../../utils/getInvoiceTravelsPricesConductor";
import { getDriverPaymentMonth } from "../../utils/getDriverPaymentMonth";
import { getInvoiceTravelsMonth } from "../../utils/getInvoiceTravelsMonth";
import { getPercentageByVehicle } from "../../utils/getPercentageByVehicle";

interface Props extends StackScreenProps<RootStackParamList, "DriverProfileScreen"> { }

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

type DriverPaymentHistoryItem = {
  id?: number | string;
  monto?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  fecha?: string;
  date?: string;
  updated_at?: string;
  updatedAt?: string;
};

type PayoutStats = {
  todayTrips: number;
  weekTrips: number;
  monthTrips: number;
  grossToday: number;
  grossWeek: number;
  grossMonth: number;
  netToday: number;
  netWeek: number;
  netMonth: number;
};

export default function DriverProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPersonalInformation, setShowPersonalInformation] = useState(false);
  const [userRating, setUserRating] = useState("");

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const { authResponse, removeAuthSession, setAuthResponse } = useContext(dataContext);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDriver, setIsDriver] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPayoutHistoryModal, setShowPayoutHistoryModal] = useState(false);
  const [showNotifInfoModal, setShowNotifInfoModal] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<DriverPaymentHistoryItem[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutStats, setPayoutStats] = useState<PayoutStats | null>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  const [todayEarnings, setTodayEarnings] = useState<string>("—");
  const [todayTripCount, setTodayTripCount] = useState<string>("—");

  const loadTodayStats = useCallback(async () => {
    const phone = authResponse?.usuario?.phone;
    if (!phone) return;
    const now = new Date();
    const fecha = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    try {
      const json = await getInvoiceTravelsPricesConductor(phone, fecha);
      const data: any[] = json?.data ?? [];
      const parseAmt = (t: any) => {
        const p = (s: string) => parseInt(String(s || "").replace(/\D/g, ""), 10) || 0;
        return p(t.contraoferta) || p(t.oferta) || p(t.tarifa);
      };
      const total = data.reduce((acc, t) => acc + parseAmt(t), 0);
      setTodayTripCount(String(data.length));
      setTodayEarnings(total > 0 ? formatToCOP(String(total)) : formatToCOP("0"));
    } catch (_) {
      setTodayEarnings("—");
      setTodayTripCount("—");
    }
  }, [authResponse?.usuario?.phone]);

  useFocusEffect(
    useCallback(() => {
      void loadTodayStats();
      return () => {
        setShowPersonalInformation(false);
        setShowNotifInfoModal(false);
        setShowHistoryModal(false);
        setShowPayoutHistoryModal(false);
      };
    }, [loadTodayStats])
  );

  useEffect(() => {
    setProfile(authResponse.usuario);

    (async () => {
      try {
        const myRatings = await getRatingByUser(authResponse.usuario.phone);
        setUserRating(myRatings?.rating != null ? String(myRatings.rating) : "—");
      } catch (_) {
        setUserRating("—");
      }
      await loadProfilePhoto();
    })();
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

  const loadProfilePhoto = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/driver-profile-photo/${authResponse.usuario.phone}`
      );

      if (response.ok) {
        const data = await response.json();
        setProfilePhotoUrl(data.data.profilePhoto);
      }

    } catch (error) {
      // console.log('No se encontró foto de perfil');
    }
    return true
  };

  const handlePhotoUploaded = (url: string) => {
    setProfilePhotoUrl(url);
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
        setIsDriver(true)
      }else{
        await logoutUser(authResponse?.usuario?.phone)
        setIsDriver(false)
      }

      navigation.replace('UserLoginScreen');

    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setErrorMessage("Error al cerrar sesión");
      setShowErrorModal(true);
    }
  };

  useEffect(()=>{
    if(authResponse?.usuario?.role === "driver_role"){ 
      setIsDriver(true)
    }else{
      setIsDriver(false)
    }
  },[isDriver])

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
    navigation.navigate('UserLoginScreen')
  }

  useEffect(() => {
    if (profile) {
      setLoading(false);
    }
  }, [profile]);

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

  const getFechaLocal = () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const openPayoutHistory = async () => {
    const phone = authResponse?.usuario?.phone;
    if (!phone) return;
    setPayoutLoading(true);
    setShowPayoutHistoryModal(true);
    try {
      const fecha = getFechaLocal();
      const [payRes, monthRes, pctRes] = await Promise.all([
        getDriverPaymentMonth(phone, fecha),
        getInvoiceTravelsMonth(phone, fecha),
        getPercentageByVehicle(authResponse?.usuario?.vehicleType || ""),
      ]);

      const rows = Array.isArray(payRes?.data) ? payRes.data : [];
      setPayoutHistory(rows);

      const monthTravels = Array.isArray(monthRes?.data) ? monthRes.data : [];
      const pct = Number(pctRes?.data?.[0]?.percentaje);
      const appPct = Number.isFinite(pct) && pct > 0 ? pct : 0;

      const parseAmt = (t: any) => {
        const p = (s: string) => parseInt(String(s || "").replace(/\D/g, ""), 10) || 0;
        return p(t.contraoferta) || p(t.oferta) || p(t.tarifa);
      };
      const toUTCDate = (v: any) => {
        const d = new Date(v || Date.now());
        return Number.isNaN(d.getTime()) ? null : d;
      };
      const now = new Date();
      const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
      const weekDay = (now.getUTCDay() + 6) % 7;
      const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - weekDay));
      const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (6 - weekDay), 23, 59, 59));

      let todayTrips = 0, weekTrips = 0, monthTrips = monthTravels.length;
      let grossToday = 0, grossWeek = 0, grossMonth = 0;

      monthTravels.forEach((t: any) => {
        const d = toUTCDate(t.created_at || t.fecha_creacion || t.fecha);
        const amount = parseAmt(t);
        grossMonth += amount;
        if (!d) return;
        const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        if (k === todayKey) {
          todayTrips += 1;
          grossToday += amount;
        }
        if (d >= monday && d <= sunday) {
          weekTrips += 1;
          grossWeek += amount;
        }
      });

      const netToday = Math.max(grossToday - Math.ceil((grossToday * appPct) / 100), 0);
      const netWeek = Math.max(grossWeek - Math.ceil((grossWeek * appPct) / 100), 0);
      const netMonth = Math.max(grossMonth - Math.ceil((grossMonth * appPct) / 100), 0);

      setPayoutStats({
        todayTrips,
        weekTrips,
        monthTrips,
        grossToday,
        grossWeek,
        grossMonth,
        netToday,
        netWeek,
        netMonth,
      });
    } catch (_) {
      setPayoutHistory([]);
      setPayoutStats(null);
    } finally {
      setPayoutLoading(false);
    }
  };

  const formatPayoutDate = (item: DriverPaymentHistoryItem) => {
    const raw =
      item.createdAt ||
      item.created_at ||
      item.updatedAt ||
      item.updated_at ||
      item.date ||
      item.fecha;
    if (!raw) return "Sin fecha";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);
    return date.toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    <View style={styles.container}>
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
            <ProfilePhotoUploader
              phone={authResponse.usuario.phone}
              currentPhoto={profilePhotoUrl}
              onPhotoUploaded={handlePhotoUploaded}
              isDriver={isDriver}
            />
            <View style={styles.photoUploadCOntainer}>
              <View style={styles.driverBadge}>
                <Text style={styles.driverBadgeText}>CONDUCTOR</Text>
              </View>
              <Text style={styles.userName}>
                Hola, {profile.name.split(" ")[0]}
              </Text>
              <Text style={styles.userRole}>Panel profesional · MotoUberos</Text>
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

        {/* Estadísticas del usuario */}
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
            <Text style={styles.statNumber}>{userRating ?? "—"}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumberCompact} numberOfLines={1} adjustsFontSizeToFit>
              {todayEarnings}
            </Text>
            <Text style={styles.statLabel}>Ganancias hoy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{todayTripCount}</Text>
            <Text style={styles.statLabel}>Viajes hoy</Text>
          </View>
        </Animated.View>

        {/* Configuración conductor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu cuenta</Text>
          <Text style={styles.sectionSubtitle}>
            Accesos rápidos · todo en un vistazo
          </Text>

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
            <TouchableOpacity
              style={styles.driverMenuRow}
              onPress={() => setShowHistoryModal(true)}
              activeOpacity={0.88}
            >
              <View style={styles.driverIconCircle}>
                <Ionicons name="calendar-outline" size={22} color={COLORS.textDark} />
              </View>
              <View style={styles.driverMenuTexts}>
                <Text style={styles.driverMenuTitle}>Historial de viajes</Text>
                <Text style={styles.driverMenuHint}>Por fecha y detalle de cobros</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.driverMenuRow}
              onPress={() => navigation.navigate("DriverTripHistoryScreen" as never)}
              activeOpacity={0.88}
            >
              <View style={styles.driverIconCircle}>
                <Ionicons name="flash-outline" size={22} color={COLORS.textDark} />
              </View>
              <View style={styles.driverMenuTexts}>
                <Text style={styles.driverMenuTitle}>Historial de hoy</Text>
                <Text style={styles.driverMenuHint}>Viajes y ganancias del día</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.driverMenuRow}
              onPress={openPayoutHistory}
              activeOpacity={0.88}
            >
              <View style={styles.driverIconCircle}>
                <Ionicons name="wallet-outline" size={22} color={COLORS.textDark} />
              </View>
              <View style={styles.driverMenuTexts}>
                <Text style={styles.driverMenuTitle}>Historial de retiros</Text>
                <Text style={styles.driverMenuHint}>Registro de tus cobros retirados</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </TouchableOpacity>

            <View style={styles.menuAccentDivider} />

            <TouchableOpacity
              style={styles.driverMenuRow}
              onPress={() => setShowNotifInfoModal(true)}
              activeOpacity={0.88}
            >
              <View style={styles.driverIconCircle}>
                <Ionicons name="notifications-outline" size={22} color={COLORS.textDark} />
              </View>
              <View style={styles.driverMenuTexts}>
                <Text style={styles.driverMenuTitle}>Notificaciones</Text>
                <Text style={styles.driverMenuHint}>Cómo recibir avisos del servicio</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </TouchableOpacity>

            <View style={styles.menuAccentDivider} />

            <TouchableOpacity
              style={styles.driverMenuRow}
              onPress={() => setShowPersonalInformation((v) => !v)}
              activeOpacity={0.88}
            >
              <View style={styles.driverIconCircle}>
                <Ionicons name="person-circle-outline" size={22} color={COLORS.textDark} />
              </View>
              <View style={styles.driverMenuTexts}>
                <Text style={styles.driverMenuTitle}>Información personal</Text>
                <Text style={styles.driverMenuHint}>Email, teléfono y tipo de cuenta</Text>
              </View>
              <Ionicons
                name={showPersonalInformation ? "chevron-up" : "chevron-down"}
                size={22}
                color={COLORS.primary}
              />
            </TouchableOpacity>

            {showPersonalInformation && (
              <View style={styles.personalInfoShell}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.textPrimary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{profile.email}</Text>
                  </View>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="call-outline" size={20} color={COLORS.textPrimary} />
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
          </Animated.View>
        </View>

        <Animated.View style={[styles.section, { opacity: footerAnim }]}>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleLogout}
          >
            <Text style={styles.emergencyButtonText}> Modo Cliente</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.section, { opacity: footerAnim }]}>
          <TouchableOpacity
            style={styles.logoutButtonStyle}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>
              Cerrar Sesión</Text>
            <Image
              source={require("../../../assets/SignOut.png")}
            />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Publicidad para ti</Text>
          <AdvertisingCarousel />
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

      <Modal
        visible={showNotifInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifInfoModal(false)}
      >
        <View style={styles.splashModalOverlay}>
          <View style={styles.splashModalCard}>
            <View style={styles.splashModalIconWrap}>
              <Ionicons name="notifications" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.splashModalTitle}>Notificaciones</Text>
            <Text style={styles.splashModalBody}>
              Activa las notificaciones de MotoUberos en los ajustes del teléfono para no perderte
              solicitudes, mensajes ni el estado de tus viajes.
            </Text>
            <TouchableOpacity
              style={styles.splashModalPrimaryBtn}
              onPress={() => {
                Linking.openSettings().catch(() => {});
              }}
            >
              <Text style={styles.splashModalPrimaryBtnText}>Abrir ajustes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.splashModalSecondaryBtn}
              onPress={() => setShowNotifInfoModal(false)}
            >
              <Text style={styles.splashModalSecondaryBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPayoutHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPayoutHistoryModal(false)}
      >
        <View style={styles.splashModalOverlay}>
          <View style={styles.splashModalCard}>
            <View style={styles.splashModalIconWrap}>
              <Ionicons name="wallet" size={34} color={COLORS.primary} />
            </View>
            <Text style={styles.splashModalTitle}>Historial de retiros</Text>
            <Text style={styles.splashModalBody}>
              Aquí ves los retiros registrados de tus ganancias.
            </Text>

            {!!payoutStats && (
              <View style={styles.payoutStatsWrap}>
                <View style={styles.payoutStatsRow}>
                  <View style={styles.payoutStatCard}>
                    <Text style={styles.payoutStatTitle}>Hoy</Text>
                    <Text style={styles.payoutStatLine}>Viajes: {payoutStats.todayTrips}</Text>
                    <Text style={styles.payoutStatLine}>Total: {formatToCOP(String(payoutStats.grossToday))}</Text>
                    <Text style={styles.payoutStatStrong}>Ganancia: {formatToCOP(String(payoutStats.netToday))}</Text>
                  </View>
                  <View style={styles.payoutStatCard}>
                    <Text style={styles.payoutStatTitle}>Semana</Text>
                    <Text style={styles.payoutStatLine}>Viajes: {payoutStats.weekTrips}</Text>
                    <Text style={styles.payoutStatLine}>Total: {formatToCOP(String(payoutStats.grossWeek))}</Text>
                    <Text style={styles.payoutStatStrong}>Ganancia: {formatToCOP(String(payoutStats.netWeek))}</Text>
                  </View>
                </View>
                <View style={styles.payoutStatCard}>
                  <Text style={styles.payoutStatTitle}>Mes</Text>
                  <Text style={styles.payoutStatLine}>Viajes: {payoutStats.monthTrips}</Text>
                  <Text style={styles.payoutStatLine}>Total: {formatToCOP(String(payoutStats.grossMonth))}</Text>
                  <Text style={styles.payoutStatStrong}>Ganancia: {formatToCOP(String(payoutStats.netMonth))}</Text>
                </View>
              </View>
            )}

            <ScrollView style={styles.payoutList} showsVerticalScrollIndicator={false}>
              {payoutLoading ? (
                <Text style={styles.payoutEmptyText}>Cargando historial...</Text>
              ) : payoutHistory.length ? (
                payoutHistory.map((item, index) => (
                  <View key={String(item.id ?? index)} style={styles.payoutRow}>
                    <View style={styles.payoutLeft}>
                      <Text style={styles.payoutAmount}>{item.monto || "$0"}</Text>
                      <Text style={styles.payoutDate}>{formatPayoutDate(item)}</Text>
                    </View>
                    <Text style={styles.payoutStatus}>{item.status || "Registrado"}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.payoutEmptyText}>No hay retiros registrados.</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.splashModalPrimaryBtn}
              onPress={() => setShowPayoutHistoryModal(false)}
            >
              <Text style={styles.splashModalPrimaryBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        userPhone={authResponse.usuario.phone}
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
  },
  logoutButtonText: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: "white",
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
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
  photoUploadCOntainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
    maxWidth: '78%',
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
  statNumberCompact: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
    maxWidth: '100%',
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
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'left',
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  driverBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  driverBadgeText: {
    color: COLORS.textDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
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

  // Menú de configuración (conductor)
  menuCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 195, 0, 0.35)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  driverMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  driverIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  driverMenuTexts: {
    flex: 1,
    minWidth: 0,
  },
  driverMenuTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  driverMenuHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  menuAccentDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 195, 0, 0.2)',
    marginVertical: 4,
    marginLeft: 58,
  },
  personalInfoShell: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentSubmenuShell: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 195, 0, 0.45)',
  },
  paymentSubmenuIntro: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 17,
  },
  paymentPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentPickRowStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 4,
    opacity: 0.95,
  },
  paymentPickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentPickIconAlt: {
    backgroundColor: COLORS.primaryLight,
  },
  splashModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  splashModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 195, 0, 0.5)',
  },
  splashModalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  splashModalEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  splashModalTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  splashModalBody: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  splashModalFine: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  splashModalPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  splashModalPrimaryBtnText: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: '800',
  },
  splashModalSecondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  splashModalSecondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  payoutList: {
    maxHeight: 260,
    marginBottom: 14,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  payoutLeft: {
    flex: 1,
    paddingRight: 12,
  },
  payoutAmount: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  payoutDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  payoutStatus: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  payoutEmptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  payoutStatsWrap: {
    marginBottom: 12,
    gap: 8,
  },
  payoutStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payoutStatCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  payoutStatTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  payoutStatLine: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  payoutStatStrong: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
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