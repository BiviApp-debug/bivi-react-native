import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  AppState,
  Vibration,
} from 'react-native';
import MapView, { Marker, Region, LatLng, Polyline, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';
import polyline from '@mapbox/polyline';
import RoundedButton from '../../../components/RoundedButton';
import { postDriverLocation, pushDriverCoordsToServer } from '../../../utils/postDriverLocation';
import { dataContext } from '../../../context/Authcontext';
import { getDriverPosition } from '../../../utils/getDriverPosition';
import { useOnlineTimer } from '../../../utils/useOnlineTimer';
import { io } from 'socket.io-client';
import { LocationSubscription } from 'expo-location';
import { API_BASE_URL } from '../../../API/API';
import GetAllClients from '../../../utils/GetAllClients';
import { connectSocket } from '../../../utils/Conections';
import COLORS, { getColorWithOpacity } from '../../../utils/colors';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigator/MainStackNavigator';
import { updateDriverActiveStatus } from '../../auth/login_driver/loginFunctions';
import { getRatingByUser, updateRating } from '../../../utils/HandleRatings';
import { fetchSubscriptionStatus } from '../../../utils/VerifySuscription';
import { Audio } from 'expo-av';
import SubscriptionModalPatch from '../../auth/login_driver/SubscriptionModalPatch';
import { getInvoiceTravelsCount } from '../../../utils/getInvoiceTravelsCount';
import { getInvoiceTravelsSum } from '../../../utils/getInvoiceTravelsSum';
import formatToCOP from '../../../utils/formatCop';
import { getInvoiceTravelsPrices } from '../../../utils/getInvoiceTravelsPrices';
import { getInvoiceTravelsPricesConductor } from '../../../utils/getInvoiceTravelsPricesConductor';
import { getInvoiceTravelsMonth } from '../../../utils/getInvoiceTravelsMonth';
import { getInvoiceTravelsMonthPayed } from '../../../utils/getInvoiceTravelsMonthPayed';
import { createDriverPayment } from '../../../utils/createDriverPayment';
import ConfirmPaymentModal from '../ConfirmPaymentModal';
import { getDriverPaymentMonth } from '../../../utils/getDriverPaymentMonth';
import { getDriverByPhone } from '../../../utils/getDriverByPhone';
import { getPercentageByVehicle } from '../../../utils/getPercentageByVehicle';
import { getDriverSubscription } from '../../../utils/getDriverSubscription';
import { updateDriverSubscriptionValue } from '../../../utils/updateDriverSubscriptionValue';
import * as Notifications from 'expo-notifications';
import ErrorModal from '../../../components/ErrorModal';
import SuccessModal from '../../../components/SuccessModal';
// 1. IMPORTACIÓN NUEVA
import { Ionicons } from '@expo/vector-icons';
import { GoogleMapsApiKeytsx } from '../../../../data/sources/remote/api/GoogleMapsApiKey';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveTravelsByConductor } from '../../../utils/getActiveTravels';

const MAP_CONFIG = {
  DEBOUNCE_DELAY: 100,           // Delay suavizado (ajusta 50-200ms)
  ANIMATION_DURATION: 300,       // Duración de animaciones
  MIN_MOVEMENT_THRESHOLD: 0.00005, // Umbral de movimiento mínimo
};

/** Fracción fija de la pantalla: al hacer zoom/pan no debe crecer (antes escondía Conectar / Ocultar mapa). */
const DRIVER_MAP_HEIGHT_FRAC = 0.52;

/** Misma idea que ClientSearchMap: evita computeRoutes duplicado si GPS/destino no cambian (~11 m). */
const DRIVER_ROUTES_CACHE_MS = 4 * 60 * 1000;
/** Colapsa ráfagas por socket / re-renders antes de llamar a Routes API. */
const DRIVER_DIRECTIONS_DEBOUNCE_MS = 320;

function driverRouteCacheKey(
  stage: "pickup" | "destination",
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
) {
  const oLat = origin.latitude.toFixed(4);
  const oLon = origin.longitude.toFixed(4);
  const dLat = destination.latitude.toFixed(4);
  const dLon = destination.longitude.toFixed(4);
  return `${stage}|${oLat},${oLon}|${dLat},${dLon}`;
}

/** Rumbo en grados [0,360) desde punto a punto (fallback si GPS no da heading). */
function bearingBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

// 2. COMPONENTE DE ANIMACIÓN NUEVO
function DriverWaitingAnimation() {
  const pulse = React.useRef(new Animated.Value(1)).current;
  const ring = React.useRef(new Animated.Value(0.4)).current;
  const iconBounce = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.98, duration: 700, useNativeDriver: true }),
      ]),
      { iterations: -1 }
    );
    const r = Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0.25, duration: 1000, useNativeDriver: true }),
      ]),
      { iterations: -1 }
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(iconBounce, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(iconBounce, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]),
      { iterations: -1 }
    );
    p.start(); r.start(); b.start();
    return () => { p.stop(); r.stop(); b.stop(); };
  }, []);

  const translateY = iconBounce.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={driverWaitingStyles.container}>
      <View style={driverWaitingStyles.iconWrap}>
        <Animated.View style={[driverWaitingStyles.ring, { opacity: ring }]} />
        <Animated.View style={[driverWaitingStyles.iconCircle, { transform: [{ scale: pulse }] }]}>
          <Animated.View style={{ transform: [{ translateY }] }}>
            <Ionicons name="navigate" size={40} color={COLORS.primary} />
          </Animated.View>
        </Animated.View>
      </View>
      <Text style={driverWaitingStyles.title}>¡Listo para recibir viajes!</Text>
      <Text style={driverWaitingStyles.sub}>Estás conectado. Un cliente te buscará pronto.</Text>
    </View>
  );
}

// 3. ESTILOS DE ANIMACIÓN NUEVOS
const driverWaitingStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  iconWrap: { position: 'relative', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: COLORS.primary },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 195, 0, 0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary },
  title: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  sub: { fontSize: 13, color: '#999', textAlign: 'center' },
});


const mapStyleUberos = [
{ "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "landscape", "elementType": "geometry.fill", "stylers": [{ "color": "#000000" }] },
  { "featureType": "landscape.man_made", "elementType": "geometry.fill", "stylers": [{ "color": "#333333" }] },
  { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [{ "color": "#444444" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#212121" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#2C2C2C" }] },
  { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{ "color": "#102015" }] }
];

// ✅ SOCKET SOLO EN EL COMPONENTE PADRE
const socket = io(`${API_BASE_URL}`, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 500,
  reconnectionDelayMax: 2000,
  timeout: 5000,
  forceNew: false,
  perMessageDeflate: true,
});


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Centro aproximado (Colombia) solo si no hay GPS; permite usar la app y corregir con watch. */
const FALLBACK_DRIVER_REGION: Region = {
  latitude: 4.60971,
  longitude: -74.08175,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const DRIVER_LOCATION_TIMEOUT_MS = 18000;

/**
 * `getCurrentPositionAsync` puede no resolver nunca con GPS lento o modo "solo dispositivo" en Android.
 * Prioriza última posición conocida, intenta fix rápido con baja precisión y corta por tiempo.
 */
async function resolveDriverCoordinates(): Promise<LocationObject> {
  const recent = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 45,
  });
  if (recent) {
    return recent;
  }

  if (Platform.OS === "android") {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      /* ignorar: no debe bloquear el arranque */
    }
  }

  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      }),
      new Promise<LocationObject>((_, reject) => {
        setTimeout(() => reject(new Error("LOCATION_TIMEOUT")), DRIVER_LOCATION_TIMEOUT_MS);
      }),
    ]);
  } catch {
    const stale = await Location.getLastKnownPositionAsync({
      maxAge: 1000 * 60 * 60 * 24 * 14,
    });
    if (stale) {
      return stale;
    }
    try {
      return await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Lowest,
        }),
        new Promise<LocationObject>((_, reject) => {
          setTimeout(() => reject(new Error("LOCATION_TIMEOUT_2")), 12000);
        }),
      ]);
    } catch {
      throw new Error("NO_LOCATION");
    }
  }
}

interface Props extends StackScreenProps<RootStackParamList, "DriverSearchMap"> { }

export default function DriverSearchMap({ navigation }: Props) {
  const [location, setLocation] = useState<Region | undefined>(undefined);
  const [selectedPlace, setSelectedPlace] = useState<any>(undefined);
  const [finalCordinates, setFinalCordinates] = useState<LatLng | undefined>(undefined);
  const [routeCoords, setRouteCoords] = useState<LatLng[] | undefined>([]);
  const [showRoute, setShowRoute] = useState<boolean>(false);

  const [originPlace, setOriginPlace] = useState<LatLng | undefined>(undefined);
  const [input, setInput] = useState('');
  const [inputOrigin, setInputOrigin] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [totalInvoices, setTotalInvoices] = useState<string>("0");
  const [totalMonthInvoices, setTotalMonthInvoices] = useState<string>("0");
  const [totalSummary, setTotalSummary] = useState<number>(0);
  const [ActiveTravels, setActiveTravels] = useState<any>([]);
  /** Fase del viaje aceptado: ruta al cliente vs ruta al destino (alineado con AcceptedTravelCard / sockets). */
  const [tripRouteStage, setTripRouteStage] = useState<"pickup" | "destination">("pickup");
  /** True solo si la polilínea va realmente al destino (hay `ubicacionDestino` válida). */
  const [mapNavLegIsDestination, setMapNavLegIsDestination] = useState(false);
  const [distanceTracking, setDistanceTraking] = useState<any>({});
  const [startNewTravels, setStartNewTravels] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);
  /** Modo “como GPS”: seguir posición, inclinar mapa y alinear rumbo. */
  const [navFollowEnabled, setNavFollowEnabled] = useState(true);
  const [userIsActivate, setUserIsActivate] = useState<boolean>(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [radarRadius, setRadarRadius] = useState(150);
  const [radarOpacity, setRadarOpacity] = useState(0.6);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<number>(0);

  // ============================================
  // REFS - MAP SMOOTHNESS
  // ============================================
  const mapRef = useRef<MapView>(null);
  const processedInvoiceKeysRef = useRef<Set<string>>(new Set());
  /** Permite enfocar la cámara tras `getDirections` aunque esa función esté declarada antes que el snap. */
  const snapCameraToNavigationPoseRef = useRef<
    ((coords: LocationObject["coords"]) => void) | null
  >(null);
  const regionChangeTimer = useRef<NodeJS.Timeout | null>(null);
  const lastRegion = useRef<Region | null>(null);
  const isAnimating = useRef(false);
  const lastRouteContextKey = useRef<string | null>(null);
  const directionsAbortRef = useRef<AbortController | null>(null);
  const driverRoutesCacheRef = useRef<Record<string, { coords: LatLng[]; timestamp: number }>>({});
  const activeTripNavRef = useRef(false);
  const mapFollowUserRef = useRef(true);
  const lastNavCameraAtRef = useRef(0);
  const lastGpsForBearingRef = useRef<{ lat: number; lng: number } | null>(null);

  const onTripStageChange = React.useCallback((stage: "pickup" | "destination") => {
    setTripRouteStage((prev) => (prev === stage ? prev : stage));
  }, []);

  /** ACEPTED / PICKUP = ir a recoger al cliente. ONWAY+ = llevar al destino final (alineado con AcceptedTravelCard). */
  const inferStageFromStatus = React.useCallback((status?: string): "pickup" | "destination" => {
    const normalized = String(status || "").toUpperCase().trim();
    return normalized === "ONWAY" ||
      normalized === "NEEDTOPAY" ||
      normalized === "FINISH"
      ? "destination"
      : "pickup";
  }, []);

  const syncActiveTravelFromBackend = React.useCallback(async () => {
    try {
      const conductorPhone = authResponse?.usuario?.phone;
      if (!conductorPhone) return;

      const response: any = await getActiveTravelsByConductor(conductorPhone);
      const active = Array.isArray(response?.data) ? response.data : [];

      if (active.length > 0) {
        const current = active[0];
        setActiveTravels([current]);
        setStartNewTravels(true);
        setTripRouteStage(inferStageFromStatus(current?.status));
      } else {
        setActiveTravels([]);
        setStartNewTravels(false);
      }
    } catch (error) {
      console.error("Error sincronizando viaje activo del conductor:", error);
    }
  }, [authResponse?.usuario?.phone, inferStageFromStatus]);

  // ============================================
  // REFS - GPS CACHE (evita llamadas lentas en cada viaje)
  // ============================================
  const cachedDriverCoordsRef = useRef<any>(null);
  const gpsWatchRef = useRef<any>(null);
  const driverPhoneForPostRef = useRef<string | undefined>(undefined);
  const lastDriverPostAtRef = useRef(0);

  // ============================================
  // REFS - SONIDOS PRECARGADOS (evita carga en cada notificación)
  // ============================================
  const soundMotoRef = useRef<any>(null);
  const soundCarRef = useRef<any>(null);
  const soundDomiRef = useRef<any>(null);

  const [cashPayment, setCashPayment] = useState<string>("0");
  const [clientPayment, setClientPayment] = useState<string>("0");

  const [userRating, setUserRating] = useState("");
  const { formattedTime } = useOnlineTimer();

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);


  const [misCobros, setMisCobros] = useState<number>(0);
  const [misPagos, setMisPagos] = useState<number>(0);
  const [driverPaymentsHistory, setDriverPaymentsHistory] = useState<any[]>([]);
  const [appDiscountPct, setAppDiscountPct] = useState<number>(0);

  const { authResponse, setAuthResponse } = useContext(dataContext)

  const parseMoney = (value: unknown): number => {
    const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  function getTodayUTCKey() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const getWithdrawalStats = () => {
    const isWithdrawal = (r: any) =>
      String(r?.status || "").toLowerCase().trim() === "pagado" ||
      String(r?.status || "").toLowerCase().trim() === "cobrado";

    const normalizeDay = (raw: any) => {
      const dt = new Date(raw || Date.now());
      if (Number.isNaN(dt.getTime())) return "";
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const d = String(dt.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const now = new Date();
    const weekday = (now.getUTCDay() + 6) % 7; // lunes = 0
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - weekday));
    const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (6 - weekday), 23, 59, 59));
    const todayKey = getTodayUTCKey();

    let todayCount = 0;
    let weekCount = 0;
    let todayAmount = 0;
    for (const r of driverPaymentsHistory) {
      if (!isWithdrawal(r)) continue;
      const created = new Date(r?.created_at || r?.createdAt || r?.fecha || Date.now());
      if (Number.isNaN(created.getTime())) continue;
      if (created >= monday && created <= sunday) weekCount += 1;
      if (normalizeDay(created) === todayKey) {
        todayCount += 1;
        todayAmount += parseMoney(r?.monto);
      }
    }
    return { todayCount, weekCount, todayAmount };
  };

  const extractTripAmount = (invoice: any): number => {
    return (
      parseMoney(invoice?.contraoferta) ||
      parseMoney(invoice?.oferta) ||
      parseMoney(invoice?.tarifa) ||
      parseMoney(invoice?.monto) ||
      0
    );
  };

  const applyPlanDiscountForInvoice = async (invoice: any) => {
    try {
      const driverPhone = authResponse?.usuario?.phone;
      if (!driverPhone) return;

      const status = String(invoice?.status || "").toUpperCase().trim();
      // PAYED_DRIVER se descuenta justo cuando se crea la factura en Waitingpaymentmodal.
      // Aquí procesamos solo pagos por app (PAYED_CLIENT).
      if (status !== "PAYED_CLIENT") return;

      const normalizePhone = (raw: unknown) => String(raw || "").replace(/\D/g, "");
      const conductor = normalizePhone(invoice?.conductor);
      const me = normalizePhone(driverPhone);
      if (conductor && me && conductor !== me) return;

      const uniqueKey = `${invoice?.id ?? invoice?.travelid ?? ""}-${status}-${invoice?.createdAt ?? invoice?.updatedAt ?? ""}`;
      if (processedInvoiceKeysRef.current.has(uniqueKey)) return;
      processedInvoiceKeysRef.current.add(uniqueKey);

      const subscription = await getDriverSubscription(driverPhone);
      if (!subscription?.isActive) return;

      const driverData = await getDriverByPhone(driverPhone);
      const vehicleType =
        driverData?.vehicleType ||
        driverData?.data?.vehicleType ||
        authResponse?.usuario?.vehicleType;
      if (!vehicleType) return;

      const percentResp = await getPercentageByVehicle(vehicleType);
      const percentage = Number(percentResp?.data?.[0]?.percentaje);
      if (!Number.isFinite(percentage) || percentage <= 0) return;

      let tripAmount = extractTripAmount(invoice);
      if (tripAmount <= 0) {
        // Fallback: algunos eventos de socket no traen monto; tomamos el último viaje del día.
        const fecha = getFechaLocal();
        const invoiceToday = await getInvoiceTravelsPricesConductor(driverPhone, fecha);
        const list = Array.isArray(invoiceToday?.data) ? invoiceToday.data : [];
        if (list.length > 0) {
          const byId = list.find((t: any) => String(t?.id) === String(invoice?.id));
          const candidate = byId || list[list.length - 1];
          tripAmount = extractTripAmount(candidate);
        }
      }
      if (tripAmount <= 0) return;

      const currentPlanValue = Number(subscription?.value || 0);
      const discount = Math.ceil((tripAmount * percentage) / 100);
      const nextPlanValue = Math.max(currentPlanValue - discount, 0);

      await updateDriverSubscriptionValue(driverPhone, nextPlanValue.toFixed(2));
      setSubscriptionData(Number(nextPlanValue.toFixed(0)));
      refreshEarnings();
    } catch (e) {
      console.warn("No se pudo aplicar descuento del plan:", e);
    }
  };

  useEffect(() => {
    driverPhoneForPostRef.current = authResponse?.usuario?.phone;
  }, [authResponse?.usuario?.phone]);

  // ✅ Efecto del radar
  useEffect(() => {
    const MIN_RADIUS = 150;
    const MAX_RADIUS = 400;

    const interval = setInterval(() => {
      setRadarRadius((prevRadius) => {
        let nextRadius = prevRadius + 6;

        const progress =
          (nextRadius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);

        const nextOpacity = Math.max(0, 0.6 * (1 - progress));
        setRadarOpacity(nextOpacity);

        if (nextRadius >= MAX_RADIUS) {
          setRadarOpacity(0.6);
          return MIN_RADIUS;
        }

        return nextRadius;
      });
    }, 70);


    (async () => {
      await loadProfilePhoto();
    })()

    return () => {
      clearInterval(interval);

      // 🚀 Limpiar timer de región
      if (regionChangeTimer.current) {
        clearTimeout(regionChangeTimer.current);
      }
    };


  }, []);


  const loadProfilePhoto = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/driver-profile-photo/${authResponse.usuario.phone}`
      );

      if (response.ok) {
        const data = await response.json();
       console.log(data, "user_data_123");

        setProfilePhotoUrl(data.data.profilePhoto);
      }
    } catch (error) {
      // console.log('No se encontró foto de perfil');
    }
  };

  const requestNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage("Necesitas habilitar las notificaciones para recibir alertas de nuevos viajes");
        setShowErrorModal(true);
        //Alert.alert('Permiso denegado', 'Necesitas habilitar las notificaciones para recibir alertas de nuevos viajes');
      }
    } catch (error) {
      console.warn("No se pudieron inicializar notificaciones en este entorno:", error);
    }
  };

  // ── Validación de sesión cada 15 min cuando el app vuelve a foreground ──
  useEffect(() => {
    const SESSION_CHECK_INTERVAL_MS = 15 * 60 * 1000;
    let lastCheckTime = Date.now();

    const handleAppStateChange = async (nextState: string) => {
      if (nextState !== 'active') return;
      if (Date.now() - lastCheckTime < SESSION_CHECK_INTERVAL_MS) return;

      lastCheckTime = Date.now();
      try {
        const stored = await AsyncStorage.getItem('savedPhone');
        if (!stored || !stored.includes('[storage-driver]')) return;

        const [storedPhone, storedPassword] = stored.split('[storage-driver]');
        const res = await fetch(`${API_BASE_URL}/loginDriver`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: storedPhone, password: storedPassword }),
        });

        if (!res.ok) {
          await AsyncStorage.removeItem('savedPhone');
          setAuthResponse(null);
          navigation.navigate('DriverLoginScreen');
          return;
        }
        await syncActiveTravelFromBackend();
      } catch (_) {}
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [navigation, setAuthResponse, syncActiveTravelFromBackend]);

  useEffect(() => {
    connectSocket(authResponse.usuario.phone)
    requestNotificationPermissions();
  }, [])

  useEffect(() => {
    syncActiveTravelFromBackend();
  }, [syncActiveTravelFromBackend]);



  let locationSubscription: LocationSubscription | null = null;

  const stopRealTimeLocation = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
  }


  const playNotificationSoundMotocycle = async () => {
    try {
      if (soundMotoRef.current) {
        await soundMotoRef.current.replayAsync();
      }
    } catch (error) {
      console.error('❌ Error al reproducir sonido moto:', error);
    }
  };

  const playNotificationSoundDomi = async () => {
    try {
      if (soundDomiRef.current) {
        await soundDomiRef.current.replayAsync();
      }
    } catch (error) {
      console.error('❌ Error al reproducir sonido domicilio:', error);
    }
  };

  const playNotificationSoundCar = async () => {
    try {
      if (soundCarRef.current) {
        await soundCarRef.current.replayAsync();
      }
    } catch (error) {
      console.error('❌ Error al reproducir sonido carro:', error);
    }
  };

  useEffect(() => {
    (async () => {
      if (authResponse?.usuario) {
        if (authResponse?.message === "Login exitoso") {

          if (authResponse?.usuario.role == "driver_role") {
            await postDriverLocation(authResponse?.usuario?.phone)
          } else if (authResponse?.usuario?.role == "user_client") {
            stopRealTimeLocation()
            let obtanin_all_drivers = await getDriverPosition();
            setDrivers(obtanin_all_drivers);
          }
        }
      } else {
        navigation.navigate('DriverLoginScreen')
      }
    })();
  }, [authResponse])



  const ObtainName = async () => { };

  const ObtainOrigin = async () => { };

  const fetchPlaces = async (input: string) => { };

  const fetchPlaceDetails = async (placeId: string) => { };

  const fitDriverRouteToMap = React.useCallback((origin: LatLng, final: LatLng, coords: LatLng[]) => {
    requestAnimationFrame(() => {
      if (!mapRef.current || coords.length === 0) return;
      const maxPts = 48;
      const step = Math.max(1, Math.ceil(coords.length / maxPts));
      const sampled = coords.filter((_, i) => i % step === 0);
      try {
        mapRef.current.fitToCoordinates(
          [...sampled, origin, final],
          {
            edgePadding: {
              top: Platform.OS === "ios" ? 88 : 72,
              right: 20,
              bottom: 200,
              left: 20,
            },
            animated: true,
          }
        );
        setTimeout(() => {
          if (!mapFollowUserRef.current) return;
          const c = cachedDriverCoordsRef.current;
          const snap = snapCameraToNavigationPoseRef.current;
          if (c && snap) snap(c);
        }, 720);
      } catch {
        /* noop */
      }
    });
  }, []);

  const getDirections = React.useCallback(async (
    origin: any,
    final: any,
    meta?: { stage: "pickup" | "destination" }
  ) => {
    if (!origin || !final) {
      console.warn("⚠️ getDirections: origen o destino undefined");
      return;
    }

    const stage = meta?.stage ?? "pickup";
    const cacheKey = driverRouteCacheKey(stage, origin, final);
    const cached = driverRoutesCacheRef.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < DRIVER_ROUTES_CACHE_MS) {
      setFinalCordinates(final);
      setRouteCoords(cached.coords);
      fitDriverRouteToMap(origin, final, cached.coords);
      return;
    }

    directionsAbortRef.current?.abort();
    const ac = new AbortController();
    directionsAbortRef.current = ac;

    setFinalCordinates(final);

    try {
      const res = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          signal: ac.signal,
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GoogleMapsApiKeytsx,
            "X-Goog-FieldMask":
              "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: origin.latitude,
                  longitude: origin.longitude,
                },
              },
            },
            destination: {
              location: {
                latLng: {
                  latitude: final.latitude,
                  longitude: final.longitude,
                },
              },
            },
            travelMode: "DRIVE",
            computeAlternativeRoutes: false,
            languageCode: "es",
          }),
        }
      );

      if (ac.signal.aborted) return;

      const json = await res.json();

      if (ac.signal.aborted) return;

      if (json?.routes?.length > 0) {
        const route = json.routes[0];

        const encodedPolyline = route.polyline.encodedPolyline;
        const points = polyline.decode(encodedPolyline);

        const coords = points.map((p: [number, number]) => ({
          latitude: p[0],
          longitude: p[1],
        }));

        driverRoutesCacheRef.current[cacheKey] = {
          coords,
          timestamp: Date.now(),
        };
        const keys = Object.keys(driverRoutesCacheRef.current);
        if (keys.length > 10) {
          keys
            .sort(
              (a, b) =>
                driverRoutesCacheRef.current[a].timestamp -
                driverRoutesCacheRef.current[b].timestamp
            )
            .slice(0, keys.length - 10)
            .forEach((k) => delete driverRoutesCacheRef.current[k]);
        }

        setRouteCoords(coords);
        fitDriverRouteToMap(origin, final, coords);
      } else {
        setRouteCoords([]);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setRouteCoords([]);
    }
  }, [fitDriverRouteToMap]);


  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      // Precargar los 3 sonidos para reproducción instantánea
      const [moto, car, domi] = await Promise.all([
        Audio.Sound.createAsync(require('../../../../assets/sonidomoto.mp3'), { volume: 1.0 }),
        Audio.Sound.createAsync(require('../../../../assets/sonidocarro.mp3'), { volume: 1.0 }),
        Audio.Sound.createAsync(require('../../../../assets/domiciluisaudio.mp3'), { volume: 1.0 }),
      ]);
      soundMotoRef.current = moto.sound;
      soundCarRef.current  = car.sound;
      soundDomiRef.current = domi.sound;
    } catch (error) {
      console.error('❌ Error configurando audio:', error);
    }
  };

  // ✅ SOCKET LISTENERS MEJORADOS CON CLEANUP
  useEffect(() => {
    // console.log('🔌 Socket ID en DriverSearchMap:', socket.id);
    // console.log('🔌 Socket conectado:', socket.connected);

    // ✅ Listener de conexión
    const handleConnect = () => {
      // console.log('✅ Socket conectado en DriverSearchMap');
    };

    const handleDisconnect = () => {
     //  console.log('❌ Socket desconectado en DriverSearchMap');
    };

    const handleTravelFinish = (finishTravel: any) => {
      if (!finishTravel) return;

      // Normalizar por si el backend/socket manda casing distinto o con espacios.
      const finishStatus =
        String(
          finishTravel?.status ??
            finishTravel?.data?.status ??
            finishTravel?.estado ??
            ""
        )
          .toUpperCase()
          .trim();

      // Cuando el pago está en proceso (NEEDTOPAY), NO desmontar GetAllClients.
      // El modal de cobro y calificación viven dentro de GetAllClients y se pierden si se desmonta.
      if (finishStatus === "NEEDTOPAY" || finishStatus === "FINISH") {
        refreshEarnings();
        return;
      }

      setActiveTravels([]);
      setStartNewTravels(false);
      refreshEarnings();
      syncActiveTravelFromBackend();
    };

    // ✅ LISTENER MEJORADO DE new_travel
    const handleNewTravel = async (newTravel: any) => {
      try {
        // ✅ Reproducir sonido y notificación solo si está online
        if (isOnline && newTravel && authResponse.usuario.phone) {
          if (newTravel?.tipoServicio == "carro") {
            await playNotificationSoundCar();
          } else if (newTravel?.tipoServicio == "moto") {
            await playNotificationSoundMotocycle();
          } else if (newTravel?.tipoServicio == "domicilio") {
            await playNotificationSoundDomi()
          }

          await Notifications.scheduleNotificationAsync({
            content: {
              title: newTravel?.tipoServicio == "carro" ? "🚗 ¡Nuevo viaje disponible!" : newTravel?.tipoServicio == "moto" ? "🏍️ ¡Nuevo viaje disponible!" : "🍔 ¡Nuevo domicilio disponible!",
              body: `Cliente: ${newTravel.user || 'Usuario'}\nDestino: ${newTravel.datosViaje || 'No especificado'}\nArriendo: ${newTravel.oferta || 'No especificado'}`,
              data: {
                travelData: newTravel,
                screen: 'DriverSearchMap'
              },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null,
          });

          setStartNewTravels(true);
        }
      } catch (error) {
        console.warn("Notificación omitida para evitar cierre inesperado:", error);
      }
    };

    const handleNewActiveTravels = (newOffer: any) => {
      // console.log('🚀 Viaje activo recibido:', newOffer);
      setActiveTravels([newOffer]);
      setTripRouteStage("pickup");
    };

    // ✅ Registrar listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(`travel_finish${authResponse.usuario.phone}`, handleTravelFinish);
    socket.on('new_travel', handleNewTravel);
    socket.on('new_active_travels', handleNewActiveTravels);
    socket.on(`invoice_travels${authResponse.usuario.phone}`, applyPlanDiscountForInvoice);

    // ✅ CLEANUP - Limpiar listeners
    return () => {
      //console.log('🧹 Limpiando listeners de DriverSearchMap');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off(`travel_finish${authResponse.usuario.phone}`, handleTravelFinish);
      socket.off('new_travel', handleNewTravel);
      socket.off('new_active_travels', handleNewActiveTravels);
      socket.off(`invoice_travels${authResponse.usuario.phone}`, applyPlanDiscountForInvoice);
    };
  }, [authResponse, isOnline]); // ✅ Dependencias correctas

  // ✅ Efecto de inicialización
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setErrorMessage(
            "Activa el permiso de ubicación en ajustes del dispositivo para usar el mapa como conductor."
          );
          setShowErrorModal(true);
          setLocation({ ...FALLBACK_DRIVER_REGION });
          return;
        }

        let loc: LocationObject;
        try {
          loc = await resolveDriverCoordinates();
        } catch {
          setErrorMessage(
            "GPS muy lento o sin señal. Activa ubicación de alta precisión y sal al exterior; el mapa se centrará en Colombia hasta tener señal."
          );
          setShowErrorModal(true);
          loc = {
            coords: {
              latitude: FALLBACK_DRIVER_REGION.latitude,
              longitude: FALLBACK_DRIVER_REGION.longitude,
              altitude: null,
              accuracy: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as LocationObject;
        }

        cachedDriverCoordsRef.current = loc.coords;

        setLocation({
          latitude: loc.coords.latitude + 0.0015,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.005105,
          longitudeDelta: 0.005105,
        });

        if (originPlace === undefined) {
          setShowRoute(true);
          setOriginPlace({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        } else {
          setShowRoute(false);
        }

        try {
          const phone = authResponse?.usuario?.phone;
          if (phone) {
            const myRatings = await getRatingByUser(phone);
            if (myRatings != null && typeof myRatings === "object" && "rating" in myRatings) {
              setUserRating(String((myRatings as { rating?: string }).rating ?? ""));
            }
          }
        } catch {
          /* no bloquear el mapa por el API de ratings */
        }
      } catch (error) {
        console.error("Error al obtener la ubicación:", error);
        setErrorMessage("No se pudo obtener la ubicación.");
        setShowErrorModal(true);
        setLocation({ ...FALLBACK_DRIVER_REGION });
      }
    })();

    setupAudio();

    return () => {
      soundMotoRef.current?.unloadAsync();
      soundCarRef.current?.unloadAsync();
      soundDomiRef.current?.unloadAsync();
    };
  }, []);

  const activeTravelKey =
    ActiveTravels?.[0]?.id != null
      ? `id:${ActiveTravels[0].id}`
      : ActiveTravels?.[0]?.clientid != null
        ? `c:${ActiveTravels[0].clientid}`
        : "";

  useEffect(() => {
    if (!activeTravelKey) return;
    setNavFollowEnabled(true);
    mapFollowUserRef.current = true;
  }, [activeTravelKey]);

  const tripLenForGps = ActiveTravels?.length ?? 0;

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      activeTripNavRef.current = tripLenForGps > 0;
      const tripOn = tripLenForGps > 0;
      const timeInterval = tripOn ? 900 : 3500;
      const distanceInterval = tripOn ? 6 : 12;

      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval,
            distanceInterval,
          },
          (pos) => {
            cachedDriverCoordsRef.current = pos.coords;
            const hasTrip = activeTripNavRef.current;

            const phone = driverPhoneForPostRef.current;
            if (phone) {
              const nowPost = Date.now();
              const minGap = hasTrip ? 2800 : 3200;
              if (nowPost - lastDriverPostAtRef.current >= minGap) {
                lastDriverPostAtRef.current = nowPost;
                pushDriverCoordsToServer(phone, pos.coords).catch(() => {});
              }
            }

            if (hasTrip && mapFollowUserRef.current && mapRef.current) {
              const nowCam = Date.now();
              if (nowCam - lastNavCameraAtRef.current < 400) return;
              lastNavCameraAtRef.current = nowCam;

              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              let heading = pos.coords.heading;
              if (
                heading == null ||
                Number.isNaN(heading) ||
                heading < 0
              ) {
                const prev = lastGpsForBearingRef.current;
                heading = prev
                  ? bearingBetween(prev.lat, prev.lng, lat, lng)
                  : 0;
              }
              lastGpsForBearingRef.current = { lat, lng };

              try {
                mapRef.current.animateCamera(
                  {
                    center: { latitude: lat, longitude: lng },
                    pitch: 55,
                    heading,
                    zoom: 18,
                  },
                  { duration: 420 }
                );
              } catch {
                /* noop */
              }
            }
          }
        );
        if (!cancelled) {
          gpsWatchRef.current = subscription;
        } else {
          subscription?.remove();
        }
      } catch (watchErr) {
        console.warn("watchPositionAsync (conductor):", watchErr);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
      gpsWatchRef.current = null;
    };
  }, [tripLenForGps]);

  useEffect(() => {
    activeTripNavRef.current = (ActiveTravels?.length ?? 0) > 0;
  }, [ActiveTravels?.length]);

  useEffect(() => {
    if (!ActiveTravels || ActiveTravels.length === 0) {
      lastRouteContextKey.current = null;
      setMapNavLegIsDestination(false);
      setRouteCoords([]);
      directionsAbortRef.current?.abort();
      return;
    }

    let cancelled = false;
    const debounceTimer = setTimeout(() => {
      void (async () => {
        const parsePickupLatLng = (t: any): LatLng | null => {
          try {
            const raw =
              t?.datosRecogida != null && t.datosRecogida !== ""
                ? t.datosRecogida
                : t?.ubicacionCliente;
            const parsed = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
            if (parsed?.latitude != null && parsed?.longitude != null) {
              return {
                latitude: Number(parsed.latitude),
                longitude: Number(parsed.longitude),
              };
            }
          } catch (_) {}
          return null;
        };

        const parseDestLatLng = (t: any): LatLng | null => {
          try {
            const raw = t?.ubicacionDestino;
            const parsed = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
            if (parsed?.latitude != null && parsed?.longitude != null) {
              return {
                latitude: Number(parsed.latitude),
                longitude: Number(parsed.longitude),
              };
            }
          } catch (_) {}
          return null;
        };

        if (cancelled) return;

        try {
          const activeTravel = ActiveTravels[0];
          const travelKey = String(activeTravel.id ?? activeTravel.clientid ?? "");
          const routeKey = `${travelKey}_${tripRouteStage}`;

          if (lastRouteContextKey.current === routeKey) {
            return;
          }
          lastRouteContextKey.current = routeKey;

          const pickupLatLng = parsePickupLatLng(activeTravel);
          const destLatLng = parseDestLatLng(activeTravel);

          if (!activeTravel.ubicacionConductor && !pickupLatLng && !destLatLng) {
            console.error("Faltan datos de ubicación en el viaje activo");
            return;
          }

          let driverCoords: LatLng;
          const cache = cachedDriverCoordsRef.current;
          if (
            cache &&
            typeof cache.latitude === "number" &&
            typeof cache.longitude === "number"
          ) {
            driverCoords = { latitude: cache.latitude, longitude: cache.longitude };
          } else {
            try {
              const conductorLocation = await resolveDriverCoordinates();
              driverCoords = {
                latitude: conductorLocation.coords.latitude,
                longitude: conductorLocation.coords.longitude,
              };
            } catch {
              console.error("No se pudo obtener la posición del conductor para la ruta activa");
              return;
            }
          }

          if (cancelled) return;

          let targetCoords: LatLng | null = null;
          let legToDestination = false;

          if (tripRouteStage === "destination" && destLatLng) {
            targetCoords = destLatLng;
            legToDestination = true;
          } else if (pickupLatLng) {
            targetCoords = pickupLatLng;
          } else if (destLatLng) {
            targetCoords = destLatLng;
            legToDestination = true;
            console.warn("Viaje activo: sin recogida, usando solo destino");
          }

          if (!targetCoords) {
            console.error("No hay coordenadas de ruta (recogida/destino)");
            return;
          }

          if (tripRouteStage === "destination" && !destLatLng && pickupLatLng) {
            console.warn("Sin ubicacionDestino; se mantiene ruta a recogida");
            targetCoords = pickupLatLng;
            legToDestination = false;
          }

          setMapNavLegIsDestination(legToDestination);

          setOriginPlace(driverCoords);
          setSelectedPlace(targetCoords);
          setFinalCordinates(targetCoords);

          await getDirections(driverCoords, targetCoords, { stage: tripRouteStage });
        } catch (error) {
          console.error("Error procesando viaje activo:", error);
        }
      })();
    }, DRIVER_DIRECTIONS_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      directionsAbortRef.current?.abort();
    };
  }, [ActiveTravels, tripRouteStage, getDirections]);


  // ============================================
  // 🚀 SMOOTH MAP HANDLERS
  // ============================================

  /**
   * Animar cámara del mapa con máxima suavidad
   */
  const smoothAnimateToRegion = React.useCallback((newRegion: Region) => {
    if (!mapRef.current || isAnimating.current) return;

    isAnimating.current = true;

    mapRef.current.animateCamera(
      {
        center: {
          latitude: newRegion.latitude,
          longitude: newRegion.longitude,
        },
        zoom: Math.log2(360 / newRegion.latitudeDelta),
      },
      { duration: MAP_CONFIG.ANIMATION_DURATION }
    );

    setTimeout(() => {
      isAnimating.current = false;
    }, MAP_CONFIG.ANIMATION_DURATION);
  }, []);

  /**
   * Handler optimizado para cambios de región con debounce
   */
  const handleRegionChange = React.useCallback((region: Region) => {
    return;
    // Verificar si el movimiento es significativo
    if (lastRegion.current) {
      const latDiff = Math.abs(region.latitude - lastRegion.current.latitude);
      const lonDiff = Math.abs(region.longitude - lastRegion.current.longitude);

      // Ignorar movimientos microscópicos
      if (latDiff < MAP_CONFIG.MIN_MOVEMENT_THRESHOLD &&
        lonDiff < MAP_CONFIG.MIN_MOVEMENT_THRESHOLD) {
        return;
      }
    }

    lastRegion.current = region;

    // Debounce optimizado
    if (regionChangeTimer.current) {
      clearTimeout(regionChangeTimer.current);
    }

    regionChangeTimer.current = setTimeout(() => {
      setSelectedPlace({
        latitude: region.latitude,
        longitude: region.longitude,
      });
    }, MAP_CONFIG.DEBOUNCE_DELAY);
  }, []);

  /**
   * Pan en el mapa: modo interactivo y, con viaje activo, desactiva seguimiento GPS hasta "Seguir GPS".
   */
  const handleDriverMapPanDrag = React.useCallback(() => {
    isAnimating.current = false;
    if (!ActiveTravels?.length) return;
    if (mapFollowUserRef.current) {
      mapFollowUserRef.current = false;
      setNavFollowEnabled(false);
    }
  }, [ActiveTravels?.length]);

  const snapCameraToNavigationPose = React.useCallback(
    (coords: LocationObject["coords"]) => {
      if (!mapRef.current) return;
      const lat = coords.latitude;
      const lng = coords.longitude;
      let heading = coords.heading;
      if (heading == null || Number.isNaN(heading) || heading < 0) {
        const prev = lastGpsForBearingRef.current;
        heading = prev
          ? bearingBetween(prev.lat, prev.lng, lat, lng)
          : 0;
      }
      lastGpsForBearingRef.current = { lat, lng };
      lastNavCameraAtRef.current = Date.now();
      try {
        mapRef.current.animateCamera(
          {
            center: { latitude: lat, longitude: lng },
            pitch: 55,
            heading,
            zoom: 18,
          },
          { duration: 360 }
        );
      } catch {
        /* noop */
      }
    },
    []
  );

  const handleResumeNavFollow = React.useCallback(async () => {
    mapFollowUserRef.current = true;
    setNavFollowEnabled(true);
    try {
      Vibration.vibrate(Platform.OS === "ios" ? 12 : 45);
    } catch {
      /* noop */
    }
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      cachedDriverCoordsRef.current = pos.coords;
      snapCameraToNavigationPose(pos.coords);
    } catch {
      const c = cachedDriverCoordsRef.current;
      if (c) snapCameraToNavigationPose(c);
    }
  }, [snapCameraToNavigationPose]);

  useEffect(() => {
    snapCameraToNavigationPoseRef.current = snapCameraToNavigationPose;
  }, [snapCameraToNavigationPose]);

  /** Encuadra toda la ruta + objetivo (como “vista previa”); pausa el seguimiento hasta pulsar Mi ubicación. */
  const handleFitRouteOverview = React.useCallback(() => {
    if (!mapRef.current || !routeCoords || routeCoords.length === 0) return;
    mapFollowUserRef.current = false;
    setNavFollowEnabled(false);
    try {
      Vibration.vibrate(Platform.OS === "ios" ? 8 : 25);
    } catch {
      /* noop */
    }
    try {
      const maxPts = 56;
      const step = Math.max(1, Math.ceil(routeCoords.length / maxPts));
      const sampled = routeCoords.filter((_, i) => i % step === 0);
      const pts: LatLng[] = [...sampled];
      const c = cachedDriverCoordsRef.current;
      if (c) pts.push({ latitude: c.latitude, longitude: c.longitude });
      if (finalCordinates)
        pts.push({
          latitude: finalCordinates.latitude,
          longitude: finalCordinates.longitude,
        });
      mapRef.current.fitToCoordinates(pts, {
        edgePadding: {
          top: Platform.OS === "ios" ? 96 : 80,
          right: 18,
          bottom: 220,
          left: 18,
        },
        animated: true,
      });
    } catch {
      /* noop */
    }
  }, [routeCoords, finalCordinates]);

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    const { todayCount, weekCount } = getWithdrawalStats();
    const grossMonth = Number(totalMonthInvoices) || 0;
    const appDiscountMonth = Math.ceil((grossMonth * appDiscountPct) / 100);
    const netMonthProfit = Math.max(grossMonth - appDiscountMonth, 0);
    const withdrawable = Math.max(netMonthProfit - misPagos, 0);

    if (todayCount >= 1) {
      setModalVisible(false);
      setErrorMessage("Solo puedes retirar una vez por día.");
      setShowErrorModal(true);
      return;
    }
    if (weekCount >= 2) {
      setModalVisible(false);
      setErrorMessage("Solo puedes retirar dos veces por semana.");
      setShowErrorModal(true);
      return;
    }
    if (withdrawable <= 0) {
      setModalVisible(false);
      setErrorMessage("No tienes ganancias pendientes por retirar.");
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    const status = "Pagado";

    const result = await createDriverPayment(
      formatToCOP(withdrawable.toString()),
      status,
      authResponse.usuario.phone
    );

    setLoading(false);
    setModalVisible(false);

    if (result.success) {
      setMisPagos((prev) => prev + withdrawable);
      setSuccessMessage(`✅ Retiraste tus ganancias correctamente`);
      setShowSuccessModal(true);
      //Alert.alert('Éxito', 'Pago registrado correctamente');
    } else {
      setErrorMessage(result.message);
      setShowErrorModal(true);
      //Alert.alert('Error', result.message);
    }
  };

  const toggleOnlineStatus = async () => {
    const response = await fetchSubscriptionStatus(authResponse.usuario.phone)
    // console.log("mis_registros_3", response.value);

    if (Math.round(response.value) < 1000) {
      setIsOnline(false);
      setUserIsActivate(false)
      setShowSubscriptionModal(true)
    } else {
      setIsOnline(!isOnline)
      setUserIsActivate(true)
      setShowSubscriptionModal(false)
    }
  }

  // UTC para coincidir con lo que guarda el servidor (toISOString)
  const getFechaLocal = () => {
    const now = new Date();
    const year  = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day   = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const refreshEarnings = async () => {
    try {
      const fecha = getFechaLocal();

      const [conductorToday, totalMonth, ratingData, driverPayed, driverPayment] =
        await Promise.allSettled([
          getInvoiceTravelsPricesConductor(authResponse.usuario.phone, fecha),
          getInvoiceTravelsMonth(authResponse.usuario.phone, fecha),
          getRatingByUser(authResponse.usuario.phone),
          getInvoiceTravelsMonthPayed(authResponse.usuario.phone, fecha),
          getDriverPaymentMonth(authResponse.usuario.phone, fecha),
        ]);

      if (conductorToday.status === 'fulfilled' && conductorToday.value?.data) {
        setTotalInvoices(conductorToday.value.count ?? conductorToday.value.data.length);
        setTotalSummary(calcularIngresoReal(conductorToday.value.data));
      }

      if (totalMonth.status === 'fulfilled' && totalMonth.value?.data) {
        setTotalMonthInvoices(calcularIngresoReal(totalMonth.value.data).toString());
      }

      if (ratingData.status === 'fulfilled') {
        setUserRating(ratingData.value?.rating);
      }

      if (driverPayed.status === 'fulfilled' && driverPayed.value?.data) {
        setCashPayment(calcularIngresoRealPorStatus(driverPayed.value.data, "PAYED_DRIVER").toString());
        setClientPayment(calcularIngresoRealPorStatus(driverPayed.value.data, "PAYED_CLIENT").toString());
      }

      if (driverPayment.status === 'fulfilled' && driverPayment.value?.data) {
        setDriverPaymentsHistory(driverPayment.value.data);
        setMisCobros(calcularMontoPorStatus(driverPayment.value.data, "Cobrado"));
        setMisPagos(calcularMontoPorStatus(driverPayment.value.data, "Pagado"));
      }

      const vehicleType = authResponse?.usuario?.vehicleType;
      if (vehicleType) {
        const pctResp = await getPercentageByVehicle(vehicleType);
        const pct = Number(pctResp?.data?.[0]?.percentaje);
        setAppDiscountPct(Number.isFinite(pct) && pct > 0 ? pct : 0);
      }

      const subscriptionData = await fetchSubscriptionStatus(authResponse.usuario.phone);
      setSubscriptionData(subscriptionData.value.toFixed(0));
    } catch (_) {}
  };

  useEffect(() => {
    refreshEarnings();
  }, [isOnline])

  useEffect(() => {
    updateDriverActiveStatus(authResponse.usuario.phone, isOnline.toString())
  }, [isOnline]);

  const calcularMontoPorStatus = (data: any[], status: string) => {
    const limpiarValor = (valor: string | null) => {
      if (!valor) return 0;
      const limpio = valor.replace(/[$\s.]/g, '');
      return parseFloat(limpio) || 0;
    };

    const datosFiltrados = data.filter((item) => item.status === status);

    let total = 0;
    datosFiltrados.forEach((item) => {
      const montoNum = limpiarValor(item.monto);
      total += montoNum;
    });

    return total;
  };

  const calcularIngresoReal = (data: any[]) => {
    const limpiarValor = (valor: string | null) => {
      if (!valor) return 0;
      const limpio = valor.replace(/[$\s.]/g, '');
      return parseFloat(limpio) || 0;
    };

    const ingresosPorViaje = data.map((item, index) => {
      const tarifaNum = limpiarValor(item.tarifa);
      const ofertaNum = limpiarValor(item.oferta);
      const contraofertaNum = limpiarValor(item.contraoferta);

      let ingresoViaje = 0;

      if (contraofertaNum > 0) {
         ingresoViaje = contraofertaNum;
      } else if (ofertaNum > 0) {
        ingresoViaje = ofertaNum;
      } else {
        ingresoViaje = tarifaNum;
      }

      return ingresoViaje;
    });

    let total = 0;
    ingresosPorViaje.forEach((ingreso) => {
      total += ingreso;
    });

    return total;
  };

  const calcularIngresoRealPorStatus = (data: any[], status: string) => {
    const limpiarValor = (valor: string | null) => {
      if (!valor) return 0;
      const limpio = valor.replace(/[$\s.]/g, '');
      return parseFloat(limpio) || 0;
    };

    const datosFiltrados = data.filter((item) => item.status === status);

    const ingresosPorViaje = datosFiltrados.map((item) => {
      const tarifaNum = limpiarValor(item.tarifa);
      const ofertaNum = limpiarValor(item.oferta);
      const contraofertaNum = limpiarValor(item.contraoferta);

      let ingresoViaje = 0;

      if (contraofertaNum > 0) {
        ingresoViaje = contraofertaNum;
      } else if (ofertaNum > 0) {
        ingresoViaje = ofertaNum;
      } else {
        ingresoViaje = tarifaNum;
      }

      return ingresoViaje;
    });

    let total = 0;
    ingresosPorViaje.forEach((ingreso) => {
      total += ingreso;
    });

    return total;
  };

  const sendCancelTravel = async () => {
    try {
      const userRatings = await getRatingByUser(authResponse?.usuario?.phone);
      if (userRatings?.rating) {
        const updated = await updateRating(
          authResponse?.usuario?.phone,
          (parseInt(userRatings.rating) / 1.004).toFixed(2).toString()
        );
        if (updated) {
          const myRatings = await getRatingByUser(authResponse.usuario.phone);
          setUserRating(myRatings?.rating);
        }
      }
    } catch (_) {}
    // Actualizar ganancias y estadísticas del día al volver al inicio
    refreshEarnings();
    // Siempre volver al estado "listo para recibir viajes"
    setStartNewTravels(false);
  }

  useEffect(()=>{
    console.log(profilePhotoUrl,"holas_datas");
    
  },[profilePhotoUrl])

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
        <ActivityIndicator size="large" color="#FFC300" />
      </View>
    );
  }

  const grossMonth = Number(totalMonthInvoices) || 0;
  const appDiscountMonth = Math.ceil((grossMonth * appDiscountPct) / 100);
  const netMonthProfit = Math.max(grossMonth - appDiscountMonth, 0);
  const withdrawableEarnings = Math.max(netMonthProfit - misPagos, 0);

  return (
    <View style={styles.container}>

      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>

<View style={styles.headerBalance}>
          {profilePhotoUrl ?

            <Image
              width={20}
              height={20}
              style={styles.user_img_profile}
              source={{ uri: profilePhotoUrl }}
            />
            :
            <Image
              width={20}
              height={20}
              style={styles.user_img_profile}
              source={require("../../../../assets/UserCircle.png")}
            />
          }

          <Text style={styles.logoText}>{authResponse.usuario.name}</Text>
          </View>
          <View style={styles.statusContainer}>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('DriverProfileScreen')}
            style={styles.user_button}
          >
            {authResponse?.usuario.vehicleType == "carro" && (
              <Image
                style={styles.user_img}
                source={require("../../../../assets/profile_icon_car.png")}
              />
            )}
            {authResponse?.usuario.vehicleType == "moto" && (
              <Image
                style={styles.user_img}
                source={require("../../../../assets/prifile_motocicle.png")}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userRating ?? 0}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalInvoices}</Text>
            <Text style={styles.statLabel}>Viajes de hoy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatToCOP(subscriptionData.toString())}</Text>
            <Text style={styles.statLabel}>Saldo de tu plan</Text>
          </View>
        </View>
      </View>

      <View
        style={{
          width: '100%',
          position: 'absolute',
          height: showMap ? '50%' : '78%',
          bottom: 0,
          backgroundColor: "transparent",
          zIndex: 14,
          elevation: 14,
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.blackbuton}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 180 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flex: 1, width: '100%' }}>
                {!startNewTravels ? (
                  <View style={styles.earningsCard}>
                    {/* 4. IMPLEMENTACIÓN DE LA ANIMACIÓN EN JSX */}
                    {isOnline && userIsActivate ? (
                       <DriverWaitingAnimation />
                    ) : null}

                    <View style={styles.quickActionsRow}>
                      <TouchableOpacity style={styles.quickActionItem}>
                        <View style={styles.quickActionIcon}>
                          <Text style={styles.earningStatNumber}>{userRating ?? 0}</Text>
                        </View>
                        <Text style={styles.quickActionText}>Calificación</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => navigation.navigate('DriverTripHistoryScreen')}
                        style={styles.quickActionItem}>
                        <View style={styles.quickActionIcon}>
                          <Text style={styles.earningStatNumber}>{totalInvoices}</Text>
                        </View>
                        <Text style={styles.quickActionText}>Viajes</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.quickActionItem}>
                        <View style={styles.quickActionIcon}>
                          <Text style={styles.earningStatNumber}>{formattedTime}</Text>
                        </View>
                        <Text style={styles.quickActionText}>En Linea</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.quickActionsRow}>
                      <TouchableOpacity style={styles.quickActionItem}>
                        <View style={styles.quickActionIcon}>
                          <Text style={styles.earningStatNumber}>{formatToCOP(totalMonthInvoices)}</Text>
                        </View>
                        <Text style={styles.quickActionText}>Ganancias del mes</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => navigation.navigate('DriverTripHistoryScreen')}
                        style={styles.quickActionItem}>
                        <View style={styles.quickActionIcon}>
                          <Text style={styles.earningStatNumber}>{formatToCOP(totalSummary.toString())}</Text>
                        </View>
                        <Text style={styles.quickActionText}>Ganancias hoy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {startNewTravels && userIsActivate ? (
                  <View style={styles.clientsContainer}>
                    <View style={{ display: isOnline ? 'flex' : 'none' }}>
                      {/* ✅ PASAR SOCKET COMO PROP */}
                      <GetAllClients
                        userData={authResponse}
                        updateLocation={distanceTracking}
                        onCancelTravel={sendCancelTravel}
                        socket={socket}
                        cachedDriverCoordsRef={cachedDriverCoordsRef}
                        onTripStageChange={onTripStageChange}
                      />
                    </View>

                    <View style={[styles.earningsCard, { display: isOnline ? 'none' : 'flex' }]}>
                      <View style={styles.quickActionsRow}>
                        <TouchableOpacity style={styles.quickActionItem}>
                          <View style={styles.quickActionIcon}>
                            <Text style={styles.earningStatNumber}>{userRating ?? 0}</Text>
                          </View>
                          <Text style={styles.quickActionText}>Calificación</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => navigation.navigate('DriverTripHistoryScreen')}
                          style={styles.quickActionItem}>
                          <View style={styles.quickActionIcon}>
                            <Text style={styles.earningStatNumber}>{totalInvoices}</Text>
                          </View>
                          <Text style={styles.quickActionText}>Viajes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickActionItem}>
                          <View style={styles.quickActionIcon}>
                            <Text style={styles.earningStatNumber}>{formattedTime}</Text>
                          </View>
                          <Text style={styles.quickActionText}>En Linea</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.quickActionsRow}>
                        <TouchableOpacity style={styles.quickActionItem}>
                          <View style={styles.quickActionIcon}>
                            <Text style={styles.earningStatNumber}>$45.500</Text>
                          </View>
                          <Text style={styles.quickActionText}>Ganancias totales</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => navigation.navigate('DriverTripHistoryScreen')}
                          style={styles.quickActionItem}>
                          <View style={styles.quickActionIcon}>
                            <Text style={styles.earningStatNumber}>{formatToCOP(totalSummary.toString())}</Text>
                          </View>
                          <Text style={styles.quickActionText}>Ganancias hoy</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.quickActionsContainer, { display: isOnline ? 'none' : 'flex' }]}>
                      <Text style={styles.sectionTitle}>Saldo</Text>
                      <View style={styles.quickActionsRow}>
                        <TouchableOpacity style={styles.quickActionItem}>
                          <View style={styles.quickActionIcon}>
                            <Text style={styles.earningStatNumber}>{formatToCOP(cashPayment)}</Text>
                          </View>
                          <Text style={styles.quickActionText}>Cobros en Efectivo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickActionItem}>
                          <View style={styles.quickActionIcon}>
                            <Text style={styles.earningStatNumber}>{formatToCOP(clientPayment)}</Text>
                          </View>
                          <Text style={styles.quickActionText}>Cobros en Linea</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <RoundedButton
                          text={`Retirar ${formatToCOP(withdrawableEarnings.toString())}`}
                          onPress={() => setModalVisible(true)}
                          color={COLORS.primary}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <SubscriptionModalPatch
                    visible={showSubscriptionModal}
                    userPhone={authResponse.usuario.phone}
                    userPassword={authResponse.usuario.password}
                    onClose={() => {
                      setShowSubscriptionModal(false);
                      // Refresca saldo del plan inmediatamente después del pago/aprobación.
                      refreshEarnings();
                    }}
                  />
                )}

                {!startNewTravels ? (
                  <View style={styles.quickActionsContainer}>
                    <View style={styles.quickActionsRow}>
                      <TouchableOpacity style={styles.quickActionItem}>
                        <View style={styles.quickActionIcon}>
                          <Text style={styles.earningStatNumber}>{formatToCOP(cashPayment)}</Text>
                        </View>
                        <Text style={styles.quickActionText}>Cobros en Efectivo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.quickActionItem}>
                        <View style={styles.quickActionIcon}>
                          <Text style={styles.earningStatNumber}>{formatToCOP(clientPayment)}</Text>
                        </View>
                        <Text style={styles.quickActionText}>Cobros en Linea</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <RoundedButton
                        text={`Retirar ${formatToCOP(withdrawableEarnings.toString())}`}
                        onPress={() => setModalVisible(true)}
                        color={COLORS.primary}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
          <View style={styles.fixedButtonContainer}>
            <View style={styles.buttonRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <RoundedButton
                  text={isOnline ? "Desconectado" : "Conectado"}
                  onPress={toggleOnlineStatus}
                  color={isOnline ? COLORS.error : COLORS.success}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <RoundedButton
                  text={showMap ? "Ocultar Mapa" : "Mostrar Mapa"}
                  onPress={() => setShowMap(!showMap)}
                  color={COLORS.primary}
                />
              </View>
            </View>
          </View>

        </KeyboardAvoidingView>
      </View>

      <View
        style={{
          width: '100%',
          position: 'absolute',
          top: 0,
          zIndex: 3,
          elevation: 3,
        }}
      >
        {showMap && (
          <>
          <MapView
            ref={mapRef} // 🎯 NUEVO: Ref para control
            style={{
              width: '100%',
              flex: 1,
              height: Dimensions.get('window').height * DRIVER_MAP_HEIGHT_FRAC,
            }}
            region={
              ActiveTravels && ActiveTravels.length > 0
                ? undefined
                : location ?? FALLBACK_DRIVER_REGION
            }
            showsUserLocation
            showsCompass={ActiveTravels && ActiveTravels.length > 0}
            onPanDrag={handleDriverMapPanDrag}
            onMapReady={() => console.log("Mapa cargado")}
            customMapStyle={mapStyleUberos}
            provider={PROVIDER_GOOGLE}

            // 🎨 NUEVAS: Propiedades de suavizado MÁXIMO
            scrollEnabled={true}
            zoomEnabled={true}
            rotateEnabled={true}
            pitchEnabled={true}
            scrollDuringRotateOrZoomEnabled={true}
            moveOnMarkerPress={false}
            loadingEnabled={true}
            loadingIndicatorColor={COLORS.primary}
            loadingBackgroundColor={COLORS.background}
            maxZoomLevel={20}
            minZoomLevel={3}
            zoomTapEnabled={true}
            zoomControlEnabled={false}
            renderToHardwareTextureAndroid={true}
            mapPadding={{
              top: 10,
              right: 10,
              bottom: 10,
              left: 10,
            }}
            compassOffset={{ x: -20, y: 60 }}
            toolbarEnabled={false}

          >
            {/* Ruta hacia el objetivo actual (recogida o destino final) */}
            {routeCoords && routeCoords.length > 0 && ActiveTravels && ActiveTravels.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeWidth={3}
                strokeColor={COLORS.primary}
              />
            )}

            {/* Radar solo sin viaje activo (esperando solicitudes) */}
            {originPlace && (!ActiveTravels || ActiveTravels.length === 0) && (
              <Circle
                center={originPlace as any}
                radius={radarRadius}
                strokeColor={`rgba(255, 204, 40, ${radarOpacity})`}
                fillColor={`rgba(255, 204, 40, ${radarOpacity * 0.4})`}
                strokeWidth={3}
              />
            )}

            {/*
              Un solo pin durante el viaje: a dónde ir ahora (recogida → cliente, luego → destino).
              La posición del conductor es la de Google (showsUserLocation); sin pins extra.
            */}
            {finalCordinates && ActiveTravels && ActiveTravels.length > 0 && (
              <Marker
                coordinate={finalCordinates}
                title={
                  mapNavLegIsDestination
                    ? "Destino"
                    : "Recogida del cliente"
                }
                description={
                  mapNavLegIsDestination
                    ? ActiveTravels[0]?.datosViaje
                      ? String(ActiveTravels[0].datosViaje).replace(/^"|"$/g, "")
                      : "Llevar al cliente aquí"
                    : "Ve a recoger al cliente aquí"
                }
                pinColor="green"
              >
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 30 }}>{mapNavLegIsDestination ? "🏁" : "📍"}</Text>
                </View>
              </Marker>
            )}

            {/* Otros conductores: solo cuando no hay viaje activo (evita ruido visual) */}
            {(!ActiveTravels || ActiveTravels.length === 0) &&
              drivers &&
              drivers.map((driver: any) => {
                let position;
                try {
                  position = JSON.parse(driver.position);
                } catch (error) {
                  console.error('Error al parsear posición:', driver.user, error);
                  return null;
                }
                return (
                  <Marker
                    key={driver.id}
                    coordinate={{
                      latitude: position.latitude,
                      longitude: position.longitude,
                    }}
                    title={`Conductor: ${driver.user}`}
                  >
                    <View style={{ width: 80, height: 80 }}>
                      <Image
                        style={{ width: 30, height: 30, resizeMode: 'cover' }}
                        source={require('../../../../assets/pin_map.png')}
                      />
                    </View>
                  </Marker>
                );
              })}
          </MapView>
          </>
        )}
      </View>

      {showMap && (
        <View style={styles.mapHudOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.mapCloseFab}
            onPress={() => setShowMap(false)}
            activeOpacity={0.88}
          >
            <Ionicons name="chevron-down-circle" size={24} color="#fff" />
            <Text style={styles.mapCloseFabText}>Ocultar mapa</Text>
          </TouchableOpacity>
          {ActiveTravels && ActiveTravels.length > 0 && (
            <View style={styles.mapHudFabColumn} pointerEvents="box-none">
              {routeCoords && routeCoords.length > 0 && (
                <TouchableOpacity
                  style={styles.mapRouteOverviewFab}
                  onPress={handleFitRouteOverview}
                  activeOpacity={0.88}
                >
                  <Ionicons name="map-outline" size={22} color="#fff" />
                  <Text style={styles.mapRouteOverviewFabText}>Ver ruta</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.mapMyLocationFab,
                  navFollowEnabled ? styles.mapMyLocationFabActive : null,
                ]}
                onPress={handleResumeNavFollow}
                activeOpacity={0.88}
              >
                <Ionicons
                  name={navFollowEnabled ? "navigate" : "locate-outline"}
                  size={22}
                  color="#fff"
                />
                <Text style={styles.mapMyLocationFabText}>
                  {navFollowEnabled ? "GPS activo" : "Mi ubicación"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/*{showMap && (
        <Image
          style={{
            position: 'absolute',
            height: 50,
            width: 50,
            top: '35%',
            left: '50%',
            marginLeft: -25,
            marginTop: -25,
            zIndex: 10
          }}
          source={require('../../../../assets/piker.png')}
        />
      )}*/}

      <ConfirmPaymentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmPayment}
        monto={formatToCOP(withdrawableEarnings.toString())}
        loading={loading}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    marginBottom: 16,
  },
  radarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  radarCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    zIndex: 18,
    elevation: 18,
    width: '100%',
    backgroundColor: "#FFCC28",
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 30,
    marginBottom: 16,
  },
  headerBalance: {
     flexDirection: 'row',
     gap: 16,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  logoText: {
    color: 'black',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  resultsList: {
    position: 'absolute',
    top: 180,
    zIndex: 2,
    width: '95%',
    alignSelf: 'center',
    backgroundColor: COLORS.backgroundLight,
    maxHeight: 200,
    borderRadius: 10,
  },
  item: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundMedium,
  },
  itemText: {
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  blackbuton: {
    position: "relative",
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 120,
  },
  user_button: {
    position: "relative",
    width: 75,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 75,
    zIndex: 10000,
    elevation: 1,
  },
  user_img: {
    top: 0,
    left: 0,
    display: 'flex',
    zIndex: 10000,
    elevation: 1,
    margin: 'auto',
  },
  user_img_profile: {
    borderRadius: 40,
    top: 0,
    left: 0,
    width: 50,
    display: 'flex',
    height: 50,
    zIndex: 10000,
    elevation: 1,
    backgroundColor: "black"
  },
  earningsCard: {
    backgroundColor: "#201F1FEB",
    borderRadius: 16,
    padding: 15,
    gap: 10,
    marginTop: 30,
    marginBottom: 10,
  },
  earningsHeader: {
    marginBottom: 16,
  },
  earningsTitle: {
    fontSize: 16,
    color: "white",
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: "white",
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  earningStat: {
    alignItems: 'center',
  },
  earningStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  earningStatLabel: {
    fontSize: 12,
    color: 'white',
  },
  clientsContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 0,
  },
  sectionTitleRoutes: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 0,
  },
  quickActionsContainer: {
    marginBottom: 20,
    backgroundColor: '#201F1FEB',
    padding: 20,
    gap: 10,
    borderRadius: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    backgroundColor: '#4d4d4dff',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 3,
    minHeight: 80,
  },
  quickActionIcon: {
    width: 90,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    textAlign: 'center',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundMedium,
    zIndex: 20,
    elevation: 20,
  },
  mapHudOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 22,
    elevation: 22,
  },
  mapCloseFab: {
    position: 'absolute',
    top: Platform.OS === "ios" ? 118 : 96,
    right: 12,
    zIndex: 40,
    elevation: 40,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  mapCloseFabText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapHudFabColumn: {
    position: "absolute",
    right: 12,
    bottom: 168,
    zIndex: 35,
    alignItems: "flex-end",
  },
  mapRouteOverviewFab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 22,
    marginBottom: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  mapRouteOverviewFabText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 8,
  },
  mapMyLocationFab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  mapMyLocationFabActive: {
    backgroundColor: "#2e7d32",
    borderColor: "rgba(255,255,255,0.5)",
  },
  mapMyLocationFabText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 8,
    maxWidth: 120,
  },
});