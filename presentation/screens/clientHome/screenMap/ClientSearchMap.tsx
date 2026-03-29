import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Keyboard,
  BackHandler,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
  Modal,
  AppState
} from 'react-native';
import { wp, hp, normalize, moderateScale } from './responsive';
import MapView, { Marker, Region, LatLng, Polyline, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import polyline from '@mapbox/polyline';
import RoundedButton from '../../../components/RoundedButton';
import { dataContext } from '../../../context/Authcontext';
import { useChatNotification } from '../../../context/ChatNotificationContext';
import { getDriverPosition } from '../../../utils/getDriverPosition';
import { getDistances } from '../../../utils/getDistances';
import { getTimeAndDistance } from '../../../utils/getDistanceValue';
import { io } from 'socket.io-client';
import { LocationSubscription } from 'expo-location';
import { getUserLocation } from '../../../utils/getUserLocation';
import { getActiveTravelsBackUp, getTravelsBackup, handleCreateTravel, handleCreateTravelBackUp, HandleDeleteTravels } from '../../../utils/HandleTravel';
import { API_BASE_URL } from '../../../API/API';
import { HandleDeleteOffers } from '../../../utils/HandleOffers';
import { connectSocket } from '../../../utils/Conections';
import { HandleCreateactiveTravels, HandleDeleteActiveTravels } from '../../../utils/HandleActiveTravels';
import COLORS from '../../../utils/colors';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigator/MainStackNavigator';
import { useFocusEffect } from '@react-navigation/native';
import TripRatingModal from '../../animatedControl/TripRatingModal';
import CreditCardModal from './CreditCardModal';
import NequiPaymentModal from './NequiPaymentModal';
import { getDriverByPhone } from '../../../utils/getDriverByPhone';
import { getActiveTravelsByClient } from '../../../utils/getActiveTravels';
import DistanceProgressBar from './DistanceProgressBar';
import { getTravelByClientId } from '../../../utils/getTravelByClientId';
import { getAllDriversOffers } from '../../../utils/getAllDriversOffers';
import { patchNeedPaymentUser, patchOnWayUser, patchPickUpTravelUser } from '../../../utils/PatchActiveTravel';
import PaymentMethodsList from './PaymentMethodsList';
import RoundedButtonFlex from '../../../components/RoundedButtonFlex';
import PaymentMethodsModal from './PaymentMethodsModal';
import DeliveryModal from './DeliveryModal';
import TripOptionsModal from './TripOptionsModalProps';
import { createInvoiceTravel } from '../../../utils/createInvoiceTravel';
import { getDriverSubscription } from '../../../utils/getDriverSubscription';
import AcceptedDriverCard from './components/AcceptedDriverCard';
import DriverOfferCard from './components/DriverOfferCard';
import DomicilioChatCard from './components/DomicilioChatCard';
import calcularTarifa, { calcularTarifaDinamica } from './calculatePrice';
import { getRatingByUser, updateRating } from '../../../utils/HandleRatings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import formatToCOP from '../../../utils/formatCop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ErrorModal from '../../../components/ErrorModal';
import SuccessModal from '../../../components/SuccessModal';
import { GoogleMapsApiKeytsx } from '../../../../data/sources/remote/api/GoogleMapsApiKey';


const MAP_CONFIG = {
  DEBOUNCE_DELAY: 160,            // Delay suavizado (ajusta 50-200ms)
  ANIMATION_DURATION: 300,        // Duración de animaciones
  MIN_MOVEMENT_THRESHOLD: 0.00005, // Umbral de movimiento mínimo
};

// ============================================
// ✅ NUEVAS CONSTANTES PARA OPTIMIZACIÓN DE GOOGLE APIS
// ============================================
const GEOCODE_CACHE_TIME = 6 * 60 * 1000; // Caché reverse geocode (menos repetición al mismo pin)
const MIN_DISTANCE_FOR_GEOCODE = 95; // Metros mínimos entre geocodificaciones al arrastrar el mapa
const GEOCODE_COOLDOWN_MS = 3200; // Evita ráfagas al soltar el mapa varias veces seguidas
const PLACES_MIN_CHARS = 3; // Evita consultar Places con inputs muy cortos
const PLACES_COOLDOWN_MS = 1200; // Límite de frecuencia entre consultas Places
const PLACES_CACHE_TIME = 5 * 60 * 1000; // Autocomplete repetido en la misma sesión
const ROUTES_CACHE_TIME = 5 * 60 * 1000; // Reutiliza rutas repetidas por 5 minutos
/** Mínimo entre recálculos de la ruta conductor → recogida (cliente en vivo). */
const PICKUP_POLYLINE_MIN_INTERVAL_MS = 13000;
/** Si el conductor se movió al menos esto (metros), se redibuja la línea aunque no haya pasado el intervalo. */
const PICKUP_POLYLINE_MIN_MOVE_METERS = 95;
/** Polling de posición del conductor durante viaje asignado. */
const DRIVER_POSITION_POLL_MS = 12000;
/** Heurística “~1 min” sin Routes API: línea recta conductor → recogida (ciudad ~30–40 km/h ⇒ ~500–700 m). */
const NEAR_PICKUP_HAVERSINE_MAX_M = 580;
/** Evita disparar con GPS pegado al punto o ruido. */
const NEAR_PICKUP_HAVERSINE_MIN_M = 35;

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Punto A (recogida) aunque `originPlace` venga como objeto o array legacy. */
function getClientPickupPoint(origin: unknown): LatLng | null {
  if (origin == null) return null;
  if (Array.isArray(origin)) {
    const p = origin[0] as { latitude?: number; longitude?: number } | undefined;
    if (p && typeof p.latitude === "number" && typeof p.longitude === "number") {
      return { latitude: p.latitude, longitude: p.longitude };
    }
    return null;
  }
  const o = origin as { latitude?: number; longitude?: number };
  if (typeof o.latitude === "number" && typeof o.longitude === "number") {
    return { latitude: o.latitude, longitude: o.longitude };
  }
  return null;
}

/**
 * Fase “conductor hacia el punto de recogida”: línea amarilla debe seguir al vehículo.
 * ACEPTED/PICKUP = aún no va al destino final; ONWAY+ = igual que mapa conductor (solo ruta azul).
 */
function shouldRedrawPickupApproachPolyline(status: unknown): boolean {
  const s = String(status ?? "").toUpperCase().trim();
  return s === "ACEPTED" || s === "ACCEPTED" || s === "PICKUP";
}

/** Backend/socket a veces envía distinto casing o espacios. */
function normalizeTravelStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/** Normaliza el campo duration de Routes API v2 (string "123s" u objeto { seconds }) */
const normalizeRoutesApiDuration = (duration: unknown): string => {
  if (duration == null) return '0s';
  if (typeof duration === 'string') return duration;
  if (typeof duration === 'object' && duration !== null && 'seconds' in duration) {
    const s = (duration as { seconds?: string | number }).seconds;
    if (s != null) return `${s}s`;
  }
  return '0s';
};

// ============================================
// SOCKET CONFIGURATION
// ============================================
const socket = io(`${API_BASE_URL}`, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// ============================================
// MAP STYLES (Modo Dark 3D)
// ============================================
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

// ============================================
// HELPER: Extrae la dirección más específica de los resultados de geocodificación.
// Estrategia principal: parsear el formatted_address (que SÍ suele contener el barrio)
// cuando address_components no lo etiqueta como "neighborhood".
// Ej: "Cl. 16, Ebenezer, Fusagasugá, Cundinamarca, Colombia" → "Calle 16, Ebenezer"
// ============================================
const STREET_PREFIXES = /^(cl\b|cll?\b|calle|cr\b|cra?\b|carrera|kr\b|dg\b|diagonal|tv\b|transv\b|transversal|av\b|avda?\b|avenida|v[íi]a\b|vda\b|vereda|\d)/i;

const extractReadableAddress = (geocodeResults: any): string => {
  const COLOMBIAN_STREET_LINE_REGEX =
    /^(?:cl\.?|cll\.?|calle\b|cr\.?|kra?\.?|carrera\b|kr\.?|dg\.?|diagonal\b|tv\.?|transv\.?|transversal\b|av\.?|avenida\b|v[íi]a\b|vda\.?|vereda\b)/i;

  const normalizeComparable = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const CO_DEPT_AND_COUNTRY = new Set(
    [
      'Colombia',
      'Amazonas',
      'Antioquia',
      'Arauca',
      'Atlántico',
      'Bolívar',
      'Boyacá',
      'Caldas',
      'Caquetá',
      'Casanare',
      'Cauca',
      'Cesar',
      'Chocó',
      'Córdoba',
      'Cundinamarca',
      'Guainía',
      'Guaviare',
      'Huila',
      'La Guajira',
      'Magdalena',
      'Meta',
      'Nariño',
      'Norte de Santander',
      'Putumayo',
      'Quindío',
      'Risaralda',
      'San Andrés y Providencia',
      'Santander',
      'Sucre',
      'Tolima',
      'Valle del Cauca',
      'Vaupés',
      'Vichada',
      'Bogotá D.C.',
      'Bogotá, D.C.',
      'Distrito Capital',
      'Distrito Capital de Bogotá',
    ].map((n) => normalizeComparable(n))
  );

  const isDeptOrCountryTail = (part: string) =>
    CO_DEPT_AND_COUNTRY.has(normalizeComparable(part));

  const neighborhoodAlreadyInStreet = (street: string, hood: string) => {
    const a = normalizeComparable(street);
    const b = normalizeComparable(hood);
    return a.includes(b) || b.includes(a);
  };

  const collectFromAllResults = (results: any[]) => {
    let route = '';
    let streetNum = '';
    let neighborhood = '';
    let city = '';
    let cityFromLocality = '';

    const tryNeighborhood = (comp: any) => {
      const t = comp.types || [];
      if (t.includes('neighborhood') && !neighborhood) neighborhood = comp.long_name;
      else if (t.includes('sublocality_level_1') && !neighborhood)
        neighborhood = comp.long_name;
      else if (t.includes('sublocality_level_2') && !neighborhood)
        neighborhood = comp.long_name;
      else if (t.includes('administrative_area_level_3') && !neighborhood)
        neighborhood = comp.long_name;
      else if (
        t.includes('sublocality') &&
        !t.includes('sublocality_level_3') &&
        !t.includes('sublocality_level_4') &&
        !t.includes('sublocality_level_5') &&
        !neighborhood
      )
        neighborhood = comp.long_name;
    };

    for (const r of results) {
      for (const comp of r.address_components || []) {
        const t = comp.types || [];
        if (t.includes('route') && !route) route = comp.long_name;
        if (t.includes('street_number') && !streetNum) streetNum = comp.long_name;
        if (t.includes('locality') && !cityFromLocality)
          cityFromLocality = comp.long_name;
        tryNeighborhood(comp);
      }
    }

    for (const r of results) {
      for (const comp of r.address_components || []) {
        const t = comp.types || [];
        if (t.includes('administrative_area_level_2') && !city) {
          city = comp.long_name;
          break;
        }
      }
      if (city) break;
    }
    if (!city) city = cityFromLocality;

    return { route, streetNum, neighborhoodFromComp: neighborhood, city };
  };

  const scoreFormattedCandidate = (
    formatted: string,
    cityName: string,
    routeVal: string
  ): number => {
    let fmtClean = formatted.trim();
    fmtClean = fmtClean.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}\s*/i, '').trim();
    let parts = fmtClean
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);
    while (parts.length && isDeptOrCountryTail(parts[parts.length - 1])) {
      parts.pop();
    }
    if (!parts.length) return -1;
    const p0 = parts[0].trim();
    let score = parts.length * 10 + Math.min(parts.join(',').length / 8, 40);
    if (COLOMBIAN_STREET_LINE_REGEX.test(p0)) score += 80;
    if (routeVal && p0.toLowerCase().includes(routeVal.toLowerCase()))
      score += 25;
    const last = parts[parts.length - 1];
    if (
      cityName &&
      last &&
      normalizeComparable(last) === normalizeComparable(cityName)
    )
      score += 15;
    if (parts.length >= 3) score += 35;
    else if (parts.length === 2) score += 20;
    return score;
  }

  const extractNeighborhoodFromParts = (
    parts: string[],
    cityName: string,
    streetLine: string
  ): string => {
    if (parts.length >= 3) {
      const candidate = parts[parts.length - 2];
      if (!candidate) return '';
      if (
        cityName &&
        normalizeComparable(candidate) === normalizeComparable(cityName)
      )
        return '';
      if (streetLine && candidate.trim() === streetLine.trim()) return '';
      if (COLOMBIAN_STREET_LINE_REGEX.test(candidate.trim())) return '';
      return candidate;
    }
    if (parts.length === 2 && cityName) {
      const a = parts[0].trim();
      const b = parts[1].trim();
      if (normalizeComparable(b) !== normalizeComparable(cityName)) return '';
      if (!a || COLOMBIAN_STREET_LINE_REGEX.test(a)) return '';
      return a;
    }
    return '';
  };

  const parseFormattedToStreetAndHood = (
    formatted: string,
    cityName: string,
    routeVal: string,
    streetNumVal: string
  ): { finalStreet: string; neighborhoodFromFormatted: string } => {
    let finalStreet = '';
    let neighborhoodFromFormatted = '';
    if (!formatted) return { finalStreet, neighborhoodFromFormatted };

    let fmtClean = formatted.trim();
    fmtClean = fmtClean.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}\s*/i, '').trim();

    let parts = fmtClean
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);

    while (parts.length && isDeptOrCountryTail(parts[parts.length - 1])) {
      parts.pop();
    }

    if (!parts.length) return { finalStreet, neighborhoodFromFormatted };

    const p0 = parts[0].trim();
    if (COLOMBIAN_STREET_LINE_REGEX.test(p0)) {
      finalStreet = parts[0];
      neighborhoodFromFormatted = extractNeighborhoodFromParts(
        parts,
        cityName,
        finalStreet
      );
    } else if (routeVal) {
      finalStreet = streetNumVal ? `${routeVal} #${streetNumVal}` : routeVal;
      neighborhoodFromFormatted = extractNeighborhoodFromParts(
        parts,
        cityName,
        finalStreet
      );
    } else {
      const firstNonCity =
        parts.find(
          (p: string) =>
            !cityName ||
            normalizeComparable(p) !== normalizeComparable(cityName)
        ) || parts[0];
      finalStreet = firstNonCity || '';
      neighborhoodFromFormatted = extractNeighborhoodFromParts(
        parts,
        cityName,
        finalStreet
      );
    }

    return { finalStreet, neighborhoodFromFormatted };
  };

  const results: any[] = Array.isArray(geocodeResults)
    ? geocodeResults
    : [geocodeResults];

  if (!results.length) return 'Ubicación desconocida';

  const { route, streetNum, neighborhoodFromComp, city } =
    collectFromAllResults(results);

  let bestFormatted = '';
  let bestFormattedScore = -1;
  for (const r of results) {
    const fmt = r.formatted_address;
    if (!fmt) continue;
    const s = scoreFormattedCandidate(fmt, city, route);
    if (s > bestFormattedScore) {
      bestFormattedScore = s;
      bestFormatted = fmt;
    }
  }
  if (!bestFormatted) bestFormatted = results[0]?.formatted_address || '';

  let { finalStreet, neighborhoodFromFormatted } = parseFormattedToStreetAndHood(
    bestFormatted,
    city,
    route,
    streetNum
  );

  if (
    city &&
    finalStreet &&
    normalizeComparable(finalStreet) === normalizeComparable(city) &&
    results.length > 1
  ) {
    for (const r of results) {
      if (r.formatted_address === bestFormatted) continue;
      const alt = parseFormattedToStreetAndHood(
        r.formatted_address || '',
        city,
        route,
        streetNum
      );
      if (
        alt.finalStreet &&
        normalizeComparable(alt.finalStreet) !== normalizeComparable(city)
      ) {
        finalStreet = alt.finalStreet;
        if (alt.neighborhoodFromFormatted) {
          neighborhoodFromFormatted = alt.neighborhoodFromFormatted;
        }
        break;
      }
    }
  }

  if (!finalStreet && route) {
    finalStreet = streetNum ? `${route} #${streetNum}` : route;
  }

  const neighborhood =
    neighborhoodFromComp.trim() || neighborhoodFromFormatted.trim();

  let out = finalStreet.trim();

  if (neighborhood && !neighborhoodAlreadyInStreet(out, neighborhood)) {
    if (!out) {
      out = city ? `${neighborhood}, ${city}` : neighborhood;
    } else if (city && normalizeComparable(out) === normalizeComparable(city)) {
      out = `${neighborhood}, ${city}`;
    } else {
      out = `${out}, ${neighborhood}`;
    }
  }

  if (
    city &&
    out &&
    normalizeComparable(out) === normalizeComparable(city) &&
    !neighborhood
  ) {
    for (const r of results) {
      const fmt = r.formatted_address;
      if (!fmt) continue;
      let fmtClean = fmt.trim();
      fmtClean = fmtClean
        .replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}\s*/i, '')
        .trim();
      let parts = fmtClean
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean);
      while (parts.length && isDeptOrCountryTail(parts[parts.length - 1])) {
        parts.pop();
      }
      const hoodGuess = extractNeighborhoodFromParts(
        parts,
        city,
        ''
      );
      if (
        hoodGuess &&
        normalizeComparable(hoodGuess) !== normalizeComparable(city)
      ) {
        out = `${hoodGuess}, ${city}`;
        break;
      }
    }
  }

  return out || city || 'Ubicación desconocida';
};

// ============================================
// INTERFACE
// ============================================
interface Props extends StackScreenProps<RootStackParamList, "ClientSearchMap"> { };

export default function ClientSearchMap({ navigation }: Props) {

  // ============================================
  // CONSTANTS
  // ============================================
  const { authResponse } = useContext(dataContext);
  const { unreadCount: unreadChatCount, incrementUnread, playNotificationSound, clearUnread } = useChatNotification();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;

  // ============================================
  // REFS
  // ============================================
  const mapRef = useRef<MapView>(null);
  const isTyping = useRef(false);
  const regionChangeTimer = useRef<NodeJS.Timeout | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastRegion = useRef<Region | null>(null);
  const isAnimating = useRef(false);
  /** Texto y coords del destino al confirmar el lugar (evita que el campo de búsqueda se pise antes de pedir el vehículo). */
  const confirmedDestinationRef = useRef<{
    label: string;
    coords: { latitude: number; longitude: number } | null;
  }>({ label: '', coords: null });
  const initialPitchAppliedRef = useRef(false);

  const AnimatedValue = useRef(new Animated.Value(0)).current;
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  let locationSubscription: LocationSubscription | null = null;

  // ============================================
  // ✅ NUEVOS REFS PARA CACHÉ Y SESSION TOKENS (OPTIMIZACIÓN)
  // ============================================
  const geocodeCache = useRef<{
    [key: string]: { address: string; timestamp: number }
  }>({});
  const placesCache = useRef<{
    [key: string]: { results: any[]; timestamp: number }
  }>({});
  const routesCache = useRef<{
    [key: string]: {
      coords: LatLng[];
      distanceMeters?: number;
      duration?: string;
      timestamp: number;
    }
  }>({});
  const sessionTokenRef = useRef<string | null>(null);
  const lastGeocodedPosition = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastGeocodeRequestAt = useRef<number>(0);
  const lastPlacesQueryRef = useRef<string>('');
  /** Ref al TextInput de búsqueda para quitar el foco programáticamente tras seleccionar un lugar. */
  const searchInputRef = useRef<any>(null);
  /** Timer del debounce del reverse geocode (arrastre del pin). */
  const geocodeDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** AbortController del request de reverse geocode en vuelo. */
  const geocodeAbortControllerRef = useRef<AbortController | null>(null);
  const lastPlacesRequestAt = useRef<number>(0);
  /** Evita repetir ObtainOrigin si `originPlace` cambia de referencia pero las coords son iguales. */
  const prevOriginGeocodeKeyRef = useRef<string>('');
  /** Ref sincronizado con `takingPayment` para listeners de socket (evita cierre obsoleto). */
  const takingPaymentRef = useRef(false);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // ============================================
  // STATE - Map & Location
  // ============================================
  const [location, setLocation] = useState<Region | undefined>(undefined);
  const [selectedPlace, setSelectedPlace] = useState<any>(undefined);
  const [finalCordinates, setFinalCordinates] = useState<LatLng | undefined>(undefined);
  const [originPlace, setOriginPlace] = useState<LatLng[] | undefined>(undefined);
  const [routeCoords, setRouteCoords] = useState<LatLng[] | undefined>([]);
  const [pickOfPoint, setPickOfPoint] = useState<LatLng | undefined>(undefined);
  /** Fuerza remount de la Polyline amarilla en iOS cuando a veces no redibuja con solo nuevas coords. */
  const [pickupPolylineVersion, setPickupPolylineVersion] = useState(0);
  const [driverPosition, setDriverPosition] = useState<LatLng | undefined>(undefined);
  const [userPosition, setUserPosition] = useState<any>([]);
  const [updateLocation, setUpdateLocation] = useState<any[]>([]);
  const [isScreenReady, setIsScreenReady] = useState<boolean>(true);
  const [showRoute, setShowRoute] = useState<boolean>(false);
  const [isInteractive, setisInteractive] = useState<boolean>(false);

  // ============================================
  // STATE - Drivers & Vehicles
  // ============================================
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driverOfffer, setDriverOffer] = useState<any[]>([]);
  const [driverDataAcepted, setDriverDataAcepted] = useState<any[]>([]);
  const [captureDriverData, setCaptureDriverData] = useState<any>([]);
  const [driverHeadings, setDriverHeadings] = useState<{
    [key: string]: {
      heading: number;
      position: { latitude: number; longitude: number }
    }
  }>({});
  /** Conductor asignado: posición en vivo (mapa + ruta hacia el cliente). */
  const [assignedDriverLive, setAssignedDriverLive] = useState<{
    latitude: number;
    longitude: number;
    heading: number;
  } | null>(null);
  const lastAssignedDriverForBearingRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastPickupPolylineAtRef = useRef(0);
  /** Última posición del conductor usada para trazar la polilínea amarilla (evita cuelgues por solo-tiempo). */
  const lastPickupPolylineDriverPosRef = useRef<{ lat: number; lng: number } | null>(
    null
  );
  /** Una sola notificación local por viaje (sin Google: solo haversine a punto de recogida). */
  const nearPickupTripKeyRef = useRef<string>("");
  const nearPickupNotificationSentRef = useRef(false);
  const onWayTravelRef = useRef(false);
  const originPlaceRef = useRef<typeof originPlace>(undefined);
  const [selectMyTravel, setSelectMyTravel] = useState<string>("carro");
  const [changeVehicle, setChangeVehicle] = useState<boolean>(false);
  const [imgVehicleUrl, setImgVehicleUrl] = useState<string>("");

  // ============================================
  // STATE - Input & Search
  // ============================================
  const [input, setInput] = useState('');
  const [inputOrigin, setInputOrigin] = useState('');

  const [offerInput, setOfferInput] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [inputError, setInputError] = useState<boolean>(false);

  // ============================================
  // STATE - Travel & Service
  // ============================================
  const [startTravel, setStartTravel] = useState(false);
  const [waitDrive, setWaitDrive] = useState<boolean>(false);
  const [onWayTravel, setOnwayTravel] = useState(false);
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [saveTransport, setSaveTransport] = useState("");
  const [captureFinalLocation, setCaptureFinalLocation] = useState("");

  useEffect(() => {
    onWayTravelRef.current = onWayTravel;
  }, [onWayTravel]);

  useEffect(() => {
    originPlaceRef.current = originPlace;
  }, [originPlace]);

  const captureDriverDataRef = useRef<any>([]);
  useEffect(() => {
    captureDriverDataRef.current = captureDriverData;
  }, [captureDriverData]);

  useEffect(() => {
    const raw = captureDriverData;
    const row = Array.isArray(raw) ? raw[0] : raw;
    if (!row?.conductor) {
      nearPickupTripKeyRef.current = "";
      nearPickupNotificationSentRef.current = false;
      return;
    }
    const k =
      row.id != null ? `id:${row.id}` : `c:${row.clientid}:${row.conductor}`;
    if (k !== nearPickupTripKeyRef.current) {
      nearPickupTripKeyRef.current = k;
      nearPickupNotificationSentRef.current = false;
    }
  }, [captureDriverData]);

  // ============================================
  // STATE - Distance & Price
  // ============================================
  const [distanceCost, setDistanceCost] = useState<string>("0");
  const [clientPrice, setClientPrice] = useState("");
  const [rawValue, setRawValue] = useState('');
  const [timeDistance, setTimeDistance] = useState<number>(0);
  const [distanceTrick, setDistanceTrick] = useState<number>(0);
  const [serviceInMeters, setServiceInMeters] = useState(0);
  const [serviceInKilometers, setServiceInKilometers] = useState(0);
  const [totalServiceInMeters, setTotalServiceInMeters] = useState(0);
  const [totalServiceInKilometers, setTotalServiceInKilometers] = useState(0);

  // ============================================
  // STATE - Payment
  // ============================================
  const [takingPayment, setTakingPayment] = useState(false);
  const [capturePaymentData, setCapturePaymentData] = useState<any>([]);
  const [paymentWindow, setPaymentWindow] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'efectivo' | 'nequi' | 'tarjeta' | 'pse' | 'daviplata'>('efectivo');
  const [hasCard, setHasCard] = useState(false);
  const [showNequi, setShowNequi] = useState(false);
  const [finishPayment, setFinishPayment] = useState<any>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  // ============================================
  // STATE - UI & Modals
  // ============================================
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [currentSection, setCurrentSection] = useState<any>(1);
  const [openfixmenu, setOpenFixMenu] = useState(true);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryData, setDeliveryData] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRateButton, setShowRateButton] = useState(false);

  const [originAddress, setOriginAddress] = useState('');

  // ============================================
  // STATE - Rating
  // ============================================
  const [rateDriverName, setRateDriverName] = useState("");
  const [rateDriverPhone, setRateDriverPhone] = useState("");
  const [rateDriverPhoto, setRateDriverPhoto] = useState("");

  useEffect(() => {
    takingPaymentRef.current = takingPayment;
  }, [takingPayment]);

  /** Viaje recién terminado: sirve tras pago para abrir calificación aunque `finishPayment` sea null. */
  const lastFinishedTripForRatingRef = useRef<any>(null);

  const applyFinishedTripState = async (tripData: any) => {
    if (!tripData) return;

    lastFinishedTripForRatingRef.current = tripData;
    setFinishPayment(tripData);
    setCaptureDriverData(tripData);
    setCapturePaymentData(tripData);
    setTakingPayment(true);
    await AsyncStorage.setItem('updateRatings', "true");
    setShowRateButton(true);
    setStartTravel(false);
    setWaitDrive(false);
    setOnwayTravel(false);
    setKeyboardVisible(false);
    setisInteractive(false);
    setResults([]);

    if (tripData.conductor) {
      const driverData = await getDriverByPhone(tripData.conductor);
      if (driverData) {
        setRateDriverName(driverData.name + " " + driverData.lastName);
        setRateDriverPhoto(driverData.selfiePhoto);
        setRateDriverPhone(tripData.conductor);
      }
    }
  };

  // ============================================
  // STATE - Radar Animation
  // ============================================
  const [radarRadius, setRadarRadius] = useState(150);
  const [radarOpacity, setRadarOpacity] = useState(0.6);


  // ============================================
  // ✅ NUEVAS FUNCIONES AUXILIARES PARA OPTIMIZACIÓN
  // ============================================

  const generateSessionToken = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const getCachedGeocode = (lat: number, lon: number): string | null => {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`; // Redondear a ~10m de precisión
    const cached = geocodeCache.current[key];

    if (cached && Date.now() - cached.timestamp < GEOCODE_CACHE_TIME) {
      return cached.address;
    }
    return null;
  };

  const getRouteCacheKey = (
    mode: 'trip' | 'pickup',
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ) => {
    const oLat = origin.latitude.toFixed(4);
    const oLon = origin.longitude.toFixed(4);
    const dLat = destination.latitude.toFixed(4);
    const dLon = destination.longitude.toFixed(4);
    return `${mode}|${oLat},${oLon}|${dLat},${dLon}`;
  };

  const setCachedGeocode = (lat: number, lon: number, address: string) => {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    geocodeCache.current[key] = { address, timestamp: Date.now() };
    const keys = Object.keys(geocodeCache.current);
    if (keys.length > 48) {
      keys
        .sort(
          (a, b) =>
            geocodeCache.current[a].timestamp - geocodeCache.current[b].timestamp
        )
        .slice(0, keys.length - 40)
        .forEach((k) => delete geocodeCache.current[k]);
    }
  };

  const pruneRoutesCacheStore = () => {
    const c = routesCache.current;
    const keys = Object.keys(c);
    if (keys.length <= 14) return;
    keys
      .sort((a, b) => c[a].timestamp - c[b].timestamp)
      .slice(0, keys.length - 12)
      .forEach((k) => delete c[k]);
  };


  // ============================================
  // 🚀 HANDLER - Logo Press
  // ============================================
  const handleLogoPress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage("Se necesita permiso de ubicación para detectar tu posición.");
        setShowErrorModal(true);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Use the same offset calculation as fetchPlaceDetails so the user's coords
      // sit directly under the visual pin (fixed at ~33% height)
      const screenHeight = Dimensions.get('window').height;
      const pointerYScreen = screenHeight * 0.33 - 20;
      const mapHeight = isKeyboardVisible
        ? screenHeight * 0.18
        : isInteractive
          ? screenHeight * 0.99
          : screenHeight * 0.55;
      const pointerYPercentOfMap = Math.max(0, Math.min(1, pointerYScreen / mapHeight));
      const offsetPercent = 0.5 - pointerYPercentOfMap;
      const targetDelta = 0.005;
      const verticalAdjustment = 0;

      const latitudeOffset = offsetPercent * targetDelta * verticalAdjustment;

      const targetLatitude = loc.coords.latitude;

      const newRegion: Region = {
        latitude: targetLatitude - latitudeOffset,
        longitude: loc.coords.longitude,
        latitudeDelta: targetDelta,
        longitudeDelta: targetDelta,
      };

      isAnimating.current = true;
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 500);
      }
      setTimeout(() => {
        isAnimating.current = false;
      }, 800);

      setLocation(newRegion);
      setOriginPlace({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setResults([]);
      setShowRoute(true);

      // ✅ OPTIMIZACIÓN: Verificar caché primero antes de hacer reverse geocode
      const cachedAddress = getCachedGeocode(loc.coords.latitude, loc.coords.longitude);
      if (cachedAddress) {
        setInput(cachedAddress);
        return;
      }

      // Reverse geocode to update input field immediately
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.coords.latitude},${loc.coords.longitude}&key=${GoogleMapsApiKeytsx}&language=es`
        );
        const json = await response.json();
        if (json.results && json.results[0]) {
          const address = extractReadableAddress(json.results);
          setInput(address);
          // ✅ OPTIMIZACIÓN: Guardar en caché
          setCachedGeocode(loc.coords.latitude, loc.coords.longitude, address);
          lastGeocodedPosition.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      } catch (geocodeError) {
        console.error('Error obteniendo dirección (reverse geocode):', geocodeError);
      }
    } catch (error) {
      setErrorMessage("Error al detectar tu ubicación: " + error);
      setShowErrorModal(true);
      console.error('Error al obtener la ubicación:', error);
    }
  };


  // ============================================
  // 🚀 SMOOTH MAP HANDLERS (SIN MODIFICAR - CORRECCIÓN MANUAL)
  // ============================================

  const smoothAnimateToRegion = useCallback((newRegion: Region) => {
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

  const handleRegionChange = useCallback((region: Region) => {
    // ✅ OPTIMIZACIÓN: Solo actualizar visuales, NO hacer geocoding

    if (lastRegion.current) {
      const latDiff = Math.abs(region.latitude - lastRegion.current.latitude);
      const lonDiff = Math.abs(region.longitude - lastRegion.current.longitude);

      // Si el movimiento es muy pequeño, ignorar
      if (latDiff < MAP_CONFIG.MIN_MOVEMENT_THRESHOLD &&
        lonDiff < MAP_CONFIG.MIN_MOVEMENT_THRESHOLD) {
        return;
      }
    }

    lastRegion.current = region;

    // ✅ IMPORTANTE: Esta función SOLO actualiza el pin visual
    // NO debe hacer llamadas a Google APIs
    if (regionChangeTimer.current) {
      clearTimeout(regionChangeTimer.current);
    }

    regionChangeTimer.current = setTimeout(() => {
      // ✅ Solo actualizar la posición del pin, sin geocoding
      setSelectedPlace({
        latitude: region.latitude,
        longitude: region.longitude,
      });
    }, MAP_CONFIG.DEBOUNCE_DELAY);
  }, []);

  const handlePanDragStart = useCallback(() => {
    toogleView(true);
    isAnimating.current = false;
    // Cerrar lista de sugerencias y quitar foco al arrastrar el mapa
    setResults([]);
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    isTyping.current = false;
  }, []);

  const handleRegionChangeComplete = useCallback((region: Region) => {

    console.log(Dimensions.get('window').height,"Tamaño_de_pantalla");
    
    

    toogleView(false);
    lastRegion.current = region;

    setSelectedPlace({
      latitude: region.latitude,
      longitude: region.longitude,
    });

    // Si el usuario está escribiendo o el mapa se mueve solo, NO hacer geocoding
    if (isTyping.current || isAnimating.current) {
      return;
    }

    // ✅ OPTIMIZACIÓN 1: Verificar caché primero
    const cachedAddress = getCachedGeocode(region.latitude, region.longitude);
    if (cachedAddress) {
      setInput(cachedAddress);
      return; // ⬅️ NO LLAMA A GOOGLE - AHORRO 100%
    }

    // Evitar ráfagas de geocode cuando el usuario mueve el mapa continuamente
    const now = Date.now();
    if (now - lastGeocodeRequestAt.current < GEOCODE_COOLDOWN_MS) {
      return;
    }

    // ✅ OPTIMIZACIÓN 2: Verificar distancia mínima desde última geocodificación
    if (lastGeocodedPosition.current) {
      const distance = calculateDistance(
        lastGeocodedPosition.current.latitude,
        lastGeocodedPosition.current.longitude,
        region.latitude,
        region.longitude
      );

      if (distance < MIN_DISTANCE_FOR_GEOCODE) {
        // No hacer geocoding si te moviste menos de 50 metros
        return; // ⬅️ NO LLAMA A GOOGLE - AHORRO ~70%
      }
    }

    // Cancelar cualquier request anterior antes de iniciar uno nuevo
    if (geocodeDebounceTimerRef.current) {
      clearTimeout(geocodeDebounceTimerRef.current);
      geocodeDebounceTimerRef.current = null;
    }
    if (geocodeAbortControllerRef.current) {
      geocodeAbortControllerRef.current.abort();
      geocodeAbortControllerRef.current = null;
    }

    // Debounce 1200 ms: esperar a que el usuario deje de arrastrar el mapa
    geocodeDebounceTimerRef.current = setTimeout(async () => {
      if (isTyping.current) return;

      const ac = new AbortController();
      geocodeAbortControllerRef.current = ac;

      /**
       * Elimina sufijos innecesarios que añade Nominatim ("city", "town", "village",
       * "municipality") y recorta espacios sobrantes.
       */
      const cleanSuffix = (s: string | undefined): string =>
        (s ?? "")
          .replace(/\b(city|ciudad|town|pueblo|village|vereda|municipality|municipio|department|departamento|county|district|distrito)\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();

      /**
       * Ensambla "[Calle/Barrio], [Ciudad]" a partir de los campos del objeto address
       * de Nominatim. Si el texto supera 55 caracteres y hay calle + ciudad, simplifica.
       */
      const buildAddress = (a: any, displayName: string): string => {
        const road    = cleanSuffix(a.road ?? a.pedestrian ?? a.footway ?? a.path ?? a.cycleway);
        const barrio  = cleanSuffix(a.neighbourhood ?? a.suburb ?? a.city_district);
        const ciudad  = cleanSuffix(a.city ?? a.town ?? a.village ?? a.municipality ?? a.county);
        const num     = a.house_number ?? "";

        const left: string[] = [];
        if (road) left.push(num ? `${road} ${num}` : road);
        if (barrio && barrio !== road) left.push(barrio);
        if (ciudad) left.push(ciudad);

        if (left.length === 0) {
          return cleanSuffix(displayName.split(",").slice(0, 3).join(",").trim());
        }

        const full = left.filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
        // Simplificar si es muy largo y tenemos calle + ciudad
        if (full.length > 55 && road && ciudad) {
          return `${num ? `${road} ${num}` : road}, ${ciudad}`;
        }
        return full;
      };

      let address: string | null = null;

      // ── Nominatim (gratis) ──────────────────────────────────────────────
      try {
        lastGeocodeRequestAt.current = Date.now();
        const url =
          `https://nominatim.openstreetmap.org/reverse` +
          `?lat=${region.latitude}&lon=${region.longitude}` +
          `&format=json&addressdetails=1&accept-language=es`;

        const res = await fetch(url, {
          headers: { "User-Agent": "MotoUberos/1.0 (motouberos.app)" },
          signal: ac.signal,
        });
        const json = await res.json();
        if (json?.address) {
          address = buildAddress(json.address, json.display_name ?? "") || null;
        }
      } catch {
        // Nominatim falló o fue abortado → usar Google de respaldo
      }

      // ── Google Geocoding (respaldo si Nominatim no respondió) ──────────
      if (!address && !ac.signal.aborted) {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json` +
            `?latlng=${region.latitude},${region.longitude}&key=${GoogleMapsApiKeytsx}&language=es`
          );
          const json = await res.json();
          if (json.results?.[0]) {
            address = extractReadableAddress(json.results);
          }
        } catch (err) {
          console.error("Error obteniendo dirección (Google fallback):", err);
        }
      }

      if (address && !ac.signal.aborted && !isTyping.current) {
        setInput(address);
        setCachedGeocode(region.latitude, region.longitude, address);
        lastGeocodedPosition.current = {
          latitude: region.latitude,
          longitude: region.longitude,
        };
      }
    }, 1200);

  }, []);

  const checkAndSyncTravelStatus = async () => {
    try {
      if (!authResponse?.usuario?.phone) {
        console.warn('⚠️ No hay usuario autenticado');
        return;
      }

      // console.log('🔍 Verificando estado del viaje activo...');

      const takeCurrentTravel: any = await getActiveTravelsByClient(authResponse.usuario.phone);

      if (!takeCurrentTravel || !takeCurrentTravel.data || takeCurrentTravel.data.length === 0) {
        // console.log('ℹ️ No hay viajes activos');
        setWaitDrive(false);
        setStartTravel(false);
        setOnwayTravel(false);
        setTakingPayment(false);
        setDriverDataAcepted([]);
        setCaptureDriverData([]);
        setAssignedDriverLive(null);
        lastAssignedDriverForBearingRef.current = null;
        return;
      }

      const currentTravel = takeCurrentTravel.data[0];
      const status = normalizeTravelStatus(currentTravel.status);

      //  console.log('📊 Estado actual del viaje:', status);
      //console.log('📦 Datos del viaje:', currentTravel);

      if (status === "NUEVO") {
        // console.log('🆕 Estado: Nuevo - Esperando conductor');
        setWaitDrive(true);
        setStartTravel(true);
        setOnwayTravel(false);
        setTakingPayment(false);
        setOpenFixMenu(false);
        setCaptureDriverData(currentTravel);

        if (currentTravel.ubicacionDestino) {
          try {
            const destino = JSON.parse(currentTravel.ubicacionDestino);
            setFinalCordinates(destino);
            const op = getClientPickupPoint(originPlace as unknown);
            if (op) await getDirections(op, destino);
          } catch (error) {
            console.error('❌ Error parseando ubicación destino:', error);
          }
        }
      }
      else if (status === "ACEPTED") {
        // console.log('✅ Estado: ACEPTED - Conductor aceptado');
        setWaitDrive(false);
        setStartTravel(true);
        setOnwayTravel(false);
        setTakingPayment(false);
        setOpenFixMenu(false);
        setCaptureDriverData(currentTravel);

        if (currentTravel.conductor) {
          const driverData = await getDriverByPhone(currentTravel.conductor);
          if (driverData) {
            setDriverDataAcepted([driverData]);
            //console.log('👤 Datos del conductor cargados:', driverData.name);
          }
        }

        if (currentTravel.ubicacionConductor) {
          try {
            const driverLocation = JSON.parse(currentTravel.ubicacionConductor);
            const driverCoords = {
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude
            };
            setDriverPosition(driverCoords);
            await pickupPoint(originPlace, driverCoords);

            const loc = await Location.getCurrentPositionAsync({});
            getDistanceFromCoords(
              loc.coords.latitude,
              loc.coords.longitude,
              driverLocation.latitude,
              driverLocation.longitude
            );
          } catch (error) {
            console.error('❌ Error procesando ubicación del conductor:', error);
          }
        }
      }
      else if (status === "PICKUP") {
        //console.log('🚗 Estado: PICKUP - Conductor en punto de recogida');
        setWaitDrive(false);
        setStartTravel(true);
        setOnwayTravel(true);
        setTakingPayment(false);
        setOpenFixMenu(false);
        setCaptureDriverData(currentTravel);

        if (currentTravel.conductor && driverDataAcepted.length === 0) {
          const driverData = await getDriverByPhone(currentTravel.conductor);
          if (driverData) {
            setDriverDataAcepted([driverData]);
          }
        }

        if (currentTravel.ubicacionDestino) {
          try {
            const loc = await Location.getCurrentPositionAsync({});
            const destino = JSON.parse(currentTravel.ubicacionDestino);

            getDistanceFromCoords(
              loc.coords.latitude,
              loc.coords.longitude,
              destino.latitude,
              destino.longitude
            );

            setUpdateLocation(currentTravel);
          } catch (error) {
            console.error('❌ Error calculando distancia al destino:', error);
          }
        }
      }
      else if (status === "ONWAY") {
        //  console.log('🛣️ Estado: ONWAY - Viaje en curso');
        setWaitDrive(false);
        setStartTravel(true);
        setOnwayTravel(true);
        setPickOfPoint([] as any);
        lastPickupPolylineDriverPosRef.current = null;
        lastPickupPolylineAtRef.current = 0;
        setTakingPayment(false);
        setOpenFixMenu(false);
        setCaptureDriverData(currentTravel);

        if (currentTravel.conductor && driverDataAcepted.length === 0) {
          const driverData = await getDriverByPhone(currentTravel.conductor);
          if (driverData) {
            setDriverDataAcepted([driverData]);
          }
        }

        if (currentTravel.ubicacionDestino) {
          try {
            const loc = await Location.getCurrentPositionAsync({});
            const destino = JSON.parse(currentTravel.ubicacionDestino);

            const distanceResult = getDistanceFromCoords(
              loc.coords.latitude,
              loc.coords.longitude,
              destino.latitude,
              destino.longitude
            );

            if (distanceResult && distanceResult[0].meters < 700) {
              // console.log('📍 Cerca del destino, verificando estado de pago...');
              const verifyResponse: any = await getActiveTravelsByClient(authResponse.usuario.phone);
              if (verifyResponse.data[0].status === "ONWAY") {
                await patchNeedPaymentUser(authResponse.usuario.phone);
              }
            }

            setUpdateLocation(currentTravel);
          } catch (error) {
            console.error('❌ Error en cálculo de distancia:', error);
          }
        }
      }
      else if (status === "NEEDTOPAY") {
        // console.log('💳 Estado: NEEDTOPAY - Esperando pago');
        setWaitDrive(false);
        setStartTravel(true);
        setOnwayTravel(true);
        setPickOfPoint([] as any);
        lastPickupPolylineDriverPosRef.current = null;
        lastPickupPolylineAtRef.current = 0;
        setOpenFixMenu(false);
        setCaptureDriverData(currentTravel);
        setCapturePaymentData(currentTravel);
        setTakingPayment(true);

        if (currentTravel.conductor && driverDataAcepted.length === 0) {
          const driverData = await getDriverByPhone(currentTravel.conductor);
          if (driverData) {
            setDriverDataAcepted([driverData]);
          }
        }
      }
      else if (status === "FINISH") {
        // console.log('🏁 Estado: FINISH - Viaje finalizado');
        await applyFinishedTripState(currentTravel);
      }
      else if (status === "PAYED_DRIVER") {
        // console.log('💰 Estado: PAYED_DRIVER - Pago completado');
        await AsyncStorage.setItem('updateRatings', "true");
        lastFinishedTripForRatingRef.current = currentTravel;
        setShowRateButton(true);
        setisInteractive(false);
        setKeyboardVisible(false);
        if (currentTravel.conductor) {
          const driverData = await getDriverByPhone(currentTravel.conductor);
          if (driverData) {
            setRateDriverName(`${driverData.name} ${driverData.lastName}`.trim());
            setRateDriverPhoto(driverData.selfiePhoto);
            setRateDriverPhone(currentTravel.conductor);
          }
        }
        setTimeout(() => {
          void (async () => {
            await cancelService();
            const pending = await AsyncStorage.getItem('updateRatings');
            if (pending === 'true') {
              setShowRatingModal(true);
            }
          })();
        }, 2000);
      }
      else if (status === "CANCELLED") {
        //console.log('❌ Estado: CANCELLED - Viaje cancelado');
        setCaptureDriverData(currentTravel);
        if (currentTravel.tipoServicio) {
          const oferta = currentTravel.oferta !== "" ? currentTravel.oferta : currentTravel.tarifa;
          await ReChagedService(currentTravel);
        }
      }
      else {
        console.warn('⚠️ Estado desconocido:', status);
        // console.log('📦 Datos del viaje:', currentTravel);
      }

    } catch (error) {
      console.error('❌ Error en checkAndSyncTravelStatus:', error);
    }
  };

  const initializeTravelStatus = async () => {
    // console.log('🚀 Inicializando estado del viaje...');
    await checkAndSyncTravelStatus();
  };

  // ============================================
  // USEEFFECT - MANEJO DEL BOTÓN ATRÁS (BACKHANDLER)
  // ============================================
  useEffect(() => {
    const backAction = () => {
      // 1. Prioridad: Cerrar modales si están abiertos
      if (showOptionsModal) {
        setShowOptionsModal(false);
        return true;
      }
      if (showDeliveryModal) {
        setShowDeliveryModal(false);
        return true;
      }
      if (showRatingModal) {
        setShowRatingModal(false);
        return true;
      }
      if (showErrorModal) {
        setShowErrorModal(false);
        return true;
      }
      if (showSuccessModal) {
        setShowSuccessModal(false);
        return true;
      }

      // 2. Funcionalidad solicitada: Retorno de sección 2 a 1 con limpieza
      if (currentSection === 2) {
        goToSection(1);

        // Limpieza de estados como en el código 2
        setWaitDrive(false);
        setStartTravel(false);
        setDriverOffer([]);
        setOpenFixMenu(true);
        setRouteCoords([]);
        setDriverDataAcepted([]);
        setTakingPayment(false);
        setIsLoadingService(false);
        setPickOfPoint([]);

        return true; // Detiene el comportamiento por defecto
      }

      // 3. Manejo de teclado
      if (isKeyboardVisible) {
        Keyboard.dismiss();
        return true;
      }

      // Dejar pasar si no se cumple nada
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [
    currentSection,
    showOptionsModal,
    showDeliveryModal,
    showRatingModal,
    showErrorModal,
    showSuccessModal,
    isKeyboardVisible
  ]);


  // ============================================
  // USEEFFECT - VALIDACIÓN DE SESIÓN (AppState)
  // Cuando el app vuelve a foreground, revalida que
  // las credenciales guardadas sean aún válidas.
  // Si fueron cambiadas desde otro dispositivo, fuerza logout.
  // ============================================
  useEffect(() => {
    const SESSION_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutos
    let lastCheckTime = Date.now();

    const handleAppStateChange = async (nextState: string) => {
      if (nextState !== 'active') return;
      if (Date.now() - lastCheckTime < SESSION_CHECK_INTERVAL_MS) return;

      lastCheckTime = Date.now();
      try {
        const stored = await AsyncStorage.getItem('savedPhone');
        if (!stored || !stored.includes('[storage-client]')) return;

        const [storedPhone, storedPassword] = stored.split('[storage-client]');
        const res = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: storedPhone, password: storedPassword }),
        });

        if (!res.ok) {
          // Credenciales rechazadas — sesión revocada (contraseña cambiada desde otro dispositivo)
          await AsyncStorage.removeItem('savedPhone');
          setAuthResponse(null);
          navigation.replace('UserLoginScreen');
        }
      } catch (_) {
        // Error de red — no forzamos logout, puede ser problema temporal
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // ============================================
  // USEEFFECT - INICIALIZACIÓN PRINCIPAL
  // ============================================
  useEffect(() => {

    if (authResponse?.usuario?.phone) {
      connectSocket(authResponse.usuario.phone);
    }

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        Animated.timing(keyboardHeight, {
          toValue: -e.endCoordinates.height,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    const MIN_RADIUS = 150;
    const MAX_RADIUS = 400;

    const radarInterval = setInterval(() => {
      setRadarRadius((prevRadius) => {
        let nextRadius = prevRadius + 6;

        const progress = (nextRadius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
        const nextOpacity = Math.max(0, 0.6 * (1 - progress));
        setRadarOpacity(nextOpacity);

        if (nextRadius >= MAX_RADIUS) {
          setRadarOpacity(0.6);
          return MIN_RADIUS;
        }

        return nextRadius;
      });
    }, 70);


    const loadClientProfilePhoto = async () => {
      try {
        //console.log('🔍 Cargando foto de perfil del cliente...');

        const response = await fetch(
          `${API_BASE_URL}/api/client-profile-photo/${authResponse.usuario.phone}`
        );

        if (response.ok) {
          const data = await response.json();
          //console.log('✅ Foto de perfil encontrada:', data.data.profilePhoto);
          setProfilePhotoUrl(data.data.profilePhoto);
        } else {
          //console.log('ℹ️ No se encontró foto de perfil para este cliente');
          setProfilePhotoUrl(null);
        }
      } catch (error) {
        console.error('❌ Error cargando foto de perfil:', error);
        setProfilePhotoUrl(null);
      }
    };


    const loadRatingData = async () => {
      if (authResponse?.usuario?.phone) {
        try {
          let showRateData = await getActiveTravelsBackUp(authResponse.usuario.phone);
          if (showRateData?.data?.conductor) {
            setRateDriverPhone(showRateData.data.conductor);

            let driverData = await getDriverByPhone(showRateData.data.conductor);
            if (driverData) {
              setRateDriverName(driverData.name + " " + driverData.lastName);
              setRateDriverPhoto(driverData.selfiePhoto);
            }

            let respondeRate = await AsyncStorage.getItem('updateRatings');
            if (respondeRate === "true") {
              setShowRateButton(true);
            }
          }
        } catch (error) {
          console.error('❌ Error cargando datos de rating:', error);
        }
      }
    };

    loadRatingData();
    (async () => {
      await loadClientProfilePhoto();
    })()

    const setupLocationTracking = async () => {
      if (authResponse?.usuario) {
        if (authResponse.message === "Login exitoso") {
          if (authResponse?.usuario?.role === "driver_role") {
            stopRealTimeLocation();
          } else if (authResponse?.usuario?.role === "user_client") {
            startWatchingLocation();
          }
        }
      } else {
        navigation.navigate('UserLoginScreen');
      }
    };

    setupLocationTracking();

    if (authResponse?.usuario?.phone && isScreenReady) {
      //initializeTravelStatus();
    }


    socket.on(`travel_cancelled${authResponse?.usuario?.phone}`, (cancelTravel) => {
      //console.log("📢 El conductor canceló", cancelTravel);
      setCaptureDriverData([cancelTravel]);
      if (cancelTravel.status === "CANCELLED") {
        ReChagedService(cancelTravel);
      }
    });

    socket.on("new_offer", (newOffer) => {
      //console.log("📢 Nueva oferta recibida:", newOffer);
      setDriverOffer((prev) => {
        const exists = prev.some((offer) => offer.id === newOffer.id);
        if (exists) {
          return prev.map((offer) =>
            offer.id === newOffer.id ? newOffer : offer
          );
        }
        return [...prev, newOffer];
      });
    });

    socket.on("offer_deleted", (data) => {
      setDriverOffer((prev) => prev.filter((o) => o.clientid !== data.user));
    });

    socket.on('new_active_travels', (newOffer) => {
      // console.log(newOffer, "holas_newtravel_cliente");
      setCaptureDriverData(newOffer);
      setWaitDrive(false);
    });

    socket.on(`travel_pickup${authResponse?.usuario?.phone}`, (pickuptravel) => {
      obtanintAllUpdateDistanceTravel(pickuptravel);
    });

    socket.on(`travel_finish${authResponse?.usuario?.phone}`, (finishTravel) => {
      // console.log(finishTravel, `travel_finish${authResponse?.usuario?.phone}`);
      if (normalizeTravelStatus(finishTravel?.status) === "FINISH") {
        void applyFinishedTripState(finishTravel);
      }
    });

    socket.on(`invoice_travels${authResponse?.usuario?.phone}`, (invoiceTravels) => {
      // console.log(invoiceTravels, `invoice_travels${authResponse?.usuario?.phone}`);
      if (normalizeTravelStatus(invoiceTravels?.status) !== "PAYED_DRIVER") return;

      void (async () => {
        await AsyncStorage.setItem("updateRatings", "true");
        lastFinishedTripForRatingRef.current = invoiceTravels;
        setShowRateButton(true);
        setisInteractive(false);
        setKeyboardVisible(false);

        const cond =
          invoiceTravels?.conductor ??
          invoiceTravels?.data?.conductor ??
          (() => {
            const raw = captureDriverDataRef.current;
            const row = Array.isArray(raw) ? raw[0] : raw;
            return row?.conductor;
          })();

        if (cond) {
          try {
            const driverData = await getDriverByPhone(cond);
            if (driverData) {
              setRateDriverName(`${driverData.name} ${driverData.lastName}`.trim());
              setRateDriverPhoto(driverData.selfiePhoto);
              setRateDriverPhone(cond);
            }
          } catch {
            /* noop */
          }
        }

        await cancelService();

        const pending = await AsyncStorage.getItem("updateRatings");
        if (pending === "true") {
          setShowRatingModal(true);
        }
      })();
    });

    socket.on(`travel_payment${authResponse?.usuario?.phone}`, (travelOnway) => {
      // console.log(travelOnway, `travel_payment${authResponse?.usuario?.phone}`);
      setCapturePaymentData(travelOnway);
      setCaptureDriverData(travelOnway);
      if (!takingPaymentRef.current) {
        setTakingPayment(true);
      }
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      clearInterval(radarInterval);

      if (regionChangeTimer.current) {
        clearTimeout(regionChangeTimer.current);
      }

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      socket.off(`travel_cancelled${authResponse?.usuario?.phone}`);
      socket.off("new_offer");
      socket.off("offer_deleted");
      socket.off('new_active_travels');
      socket.off(`travel_pickup${authResponse?.usuario?.phone}`);
      socket.off(`travel_finish${authResponse?.usuario?.phone}`);
      socket.off(`invoice_travels${authResponse?.usuario?.phone}`);
      socket.off(`travel_payment${authResponse?.usuario?.phone}`);
    };
  }, [authResponse?.usuario?.phone]);

  // ============================================
  // ✅ NUEVO: SOCKET LISTENER PARA NOTIFICACIONES DE CHAT
  // ============================================
  useEffect(() => {
    const clientId = authResponse?.usuario?.phone;
    const driver = captureDriverData?.conductor;

    if (!clientId || !driver || captureDriverData?.status !== 'ACEPTED') {
      return;
    }

    const channel = `chat_message${clientId}_${driver}`;
    //console.log('🔔 Escuchando notificaciones en canal:', channel);

    const handler = (msg: any) => {
      // console.log('📬 Mensaje recibido en ClientSearchMap:', msg);

      if (msg?.sender === 'driver') {
        // console.log('🔔 Incrementando contador - mensaje del conductor');
        incrementUnread();
        playNotificationSound();
      }
    };

    socket.on(channel, handler);

    return () => {
      socket.off(channel, handler);
      // console.log('🔕 Desconectado del canal de notificaciones:', channel);
    };
  }, [
    captureDriverData?.conductor,
    captureDriverData?.clientid,
    captureDriverData?.status,
    authResponse?.usuario?.phone,
    incrementUnread,
    playNotificationSound
  ]);

  useEffect(() => {
    if (!driverOfffer || driverOfffer.length === 0 || selectMyTravel !== "domicilio") return;
    const clientId = authResponse?.usuario?.phone;
    if (!clientId) return;
    const subs: { channel: string; handler: (msg: any) => void }[] = [];
    driverOfffer.forEach((offer: any) => {
      if (offer.conductor) {
        const channel = `chat_message${clientId}_${offer.conductor}`;
        const handler = (msg: any) => {
          if (msg?.sender === "driver") {
            incrementUnread();
            playNotificationSound();
          }
        };
        socket.on(channel, handler);
        subs.push({ channel, handler });
      }
    });
    return () => {
      subs.forEach(({ channel, handler }) => socket.off(channel, handler));
    };
  }, [
    driverOfffer,
    selectMyTravel,
    authResponse?.usuario?.phone,
    incrementUnread,
    playNotificationSound,
  ]);

  useFocusEffect(
    React.useCallback(() => {
      AnimatedValue.setValue(0);
      setisInteractive(false);
      setIsScreenReady(true);
    }, [])
  );

  useEffect(() => {
    if (!isScreenReady) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage("Se necesita permiso de ubicación para mostrar el mapa.");
          setShowErrorModal(true);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation((prev) => prev ?? {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        if (originPlace === undefined) {
          setShowRoute(true);
          setOriginPlace({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });

          handleLogoPress();

        } else {
          setShowRoute(false);
        }
      } catch (error) {
        setErrorMessage("Error al obtener la ubicación:" + error);
        setShowErrorModal(true);
        console.error('Error al obtener la ubicación:', error);
      }
    })();
  }, [isScreenReady]);

  // Aplica la inclinación cuando se carga la ubicación inicial
  useEffect(() => {
    if (!location || initialPitchAppliedRef.current) return;
    initialPitchAppliedRef.current = true;
    isAnimating.current = true;
    const t = setTimeout(() => {
      mapRef.current?.animateCamera(
        {
          center: { latitude: location.latitude, longitude: location.longitude },
          zoom: Math.log2(360 / (location.latitudeDelta ?? 0.02)),
          pitch: 52, // Inclinación 3D
        },
        { duration: 0 }
      );
      setTimeout(() => { isAnimating.current = false; }, 400);
    }, 300);
    return () => clearTimeout(t);
  }, [location]);


  useEffect(() => {
    const pt = getClientPickupPoint(originPlace as unknown);
    if (!pt) {
      prevOriginGeocodeKeyRef.current = "";
      return;
    }
    const key = `${pt.latitude.toFixed(5)},${pt.longitude.toFixed(5)}`;
    if (prevOriginGeocodeKeyRef.current === key) return;
    prevOriginGeocodeKeyRef.current = key;
    void ObtainOrigin();
  }, [originPlace]);

  useEffect(() => {
    const conductor = captureDriverData?.conductor;
    if (!conductor) return;

    const phoneKey = String(conductor).trim();
    const digits = phoneKey.replace(/\D/g, "");

    const handler = (data: any) => {
      if (data?.position) {
        obtanintAllUpdateDistancePickUp(data);
      }
    };

    const matchesEventUser = (data: any) => {
      const u = data?.username ?? data?.user ?? data?.conductor ?? data?.phone;
      if (u == null) return false;
      const ud = String(u).replace(/\D/g, "");
      return ud === digits && ud.length > 0;
    };

    const onGenericDriverPosition = (data: any) => {
      if (matchesEventUser(data)) handler(data);
    };

    const specificEvent = `driverPositionUpdate${phoneKey}`;
    socket.on(specificEvent, handler);
    socket.on("driverPositionUpdate", onGenericDriverPosition);

    return () => {
      socket.off(specificEvent, handler);
      socket.off("driverPositionUpdate", onGenericDriverPosition);
    };
  }, [captureDriverData?.conductor]);

  useEffect(() => {
    (async () => {
      let obtanin_all_drivers = await getDriverPosition();

      const normalizeKey = (d: any) => String(d?.user ?? d?.id ?? "").trim();
      const normalizeVehicleType = (v: any) => String(v ?? "").toLowerCase().trim();

      const driversWithVehicle = await Promise.all(
        obtanin_all_drivers.map(async (driver: any) => {
          const data = await getDriverByPhone(driver.user);

          let currentPosition;
          try {
            currentPosition = JSON.parse(driver.position);
          } catch (error) {
            console.error('Error parsing position:', error);
            return {
              ...driver,
              vehicleType: data?.vehicleType,
              heading: 0
            };
          }

          const previousData = driverHeadings[driver.user];
          let heading = 0;

          if (previousData?.position) {
            const distance = Math.sqrt(
              Math.pow(currentPosition.latitude - previousData.position.latitude, 2) +
              Math.pow(currentPosition.longitude - previousData.position.longitude, 2)
            );

            if (distance > 0.00001) {
              heading = calculateBearing(
                previousData.position.latitude,
                previousData.position.longitude,
                currentPosition.latitude,
                currentPosition.longitude
              );
            } else {
              heading = previousData.heading;
            }
          } else {
            heading = 0;
          }

          setDriverHeadings(prev => ({
            ...prev,
            [driver.user]: {
              heading,
              position: currentPosition
            }
          }));

          return {
            ...driver,
            vehicleType: data?.vehicleType,
            heading
          };
        })
      );

      // Deduplicar por conductor (el backend a veces puede devolver el mismo `user` repetido)
      const uniqueDriversWithVehicle = (() => {
        const m = new Map<string, any>();
        driversWithVehicle.forEach((d: any) => {
          const key = normalizeKey(d);
          if (!key) return;
          m.set(key, d);
        });
        return Array.from(m.values());
      })();

      const uniqueAllDrivers = (() => {
        const m = new Map<string, any>();
        (obtanin_all_drivers ?? []).forEach((d: any) => {
          const key = normalizeKey(d);
          if (!key) return;
          m.set(key, d);
        });
        return Array.from(m.values());
      })();

      const normalizedSelect = normalizeVehicleType(selectMyTravel);
      const filteredDrivers = uniqueDriversWithVehicle.filter(
        (d: any) => normalizeVehicleType(d?.vehicleType) === normalizedSelect
      );

      setDrivers(
        normalizedSelect === "carro" || normalizedSelect === "moto"
          ? filteredDrivers
          : uniqueAllDrivers
      );
    })();
  }, [changeVehicle]);

  useEffect(() => {
    (async () => {
      if (!captureDriverData?.conductor) return;

      const response = await getDriverByPhone(captureDriverData.conductor);
      if (response) {
        setDriverDataAcepted([response]);
      }

      if (!captureDriverData?.ubicacionConductor) return;

      try {
        const driverLocation = JSON.parse(captureDriverData.ubicacionConductor);
        const driverCoords = {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
        };

        setDriverPosition(driverCoords);
        setAssignedDriverLive((prev) => ({
          ...driverCoords,
          heading: prev?.heading ?? 0,
        }));
        lastAssignedDriverForBearingRef.current = driverCoords;

        const op = originPlace as { latitude?: number; longitude?: number } | undefined;
        if (op && typeof op.latitude === "number" && typeof op.longitude === "number") {
          pickupPoint(op, driverCoords);
        }

        const loc = await Location.getCurrentPositionAsync({});

        getDistanceFromCoords(
          loc.coords.latitude,
          loc.coords.longitude,
          driverCoords.latitude,
          driverCoords.longitude
        );
      } catch (e) {
        console.error("Error procesando ubicación del conductor (sync):", e);
      }
    })();
  }, [captureDriverData]);

  useEffect(() => {
    if (Math.round(serviceInMeters) < 700 && !onWayTravel) {
      patchPickUpTravelUser(authResponse?.usuario?.phone);
    }

    (async () => {
      if (onWayTravel && !takingPayment) {
        let destinationMeters = Number.POSITIVE_INFINITY;
        try {
          const destinationRaw = captureDriverDataRef.current?.ubicacionDestino;
          if (destinationRaw) {
            const destination =
              typeof destinationRaw === "string" ? JSON.parse(destinationRaw) : destinationRaw;
            const dLat = Number(destination?.latitude);
            const dLng = Number(destination?.longitude);
            if (Number.isFinite(dLat) && Number.isFinite(dLng)) {
              const loc = await Location.getCurrentPositionAsync({});
              const R = 6371;
              const dLatRad = (dLat - loc.coords.latitude) * Math.PI / 180;
              const dLonRad = (dLng - loc.coords.longitude) * Math.PI / 180;
              const a =
                Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
                Math.cos(loc.coords.latitude * Math.PI / 180) *
                Math.cos(dLat * Math.PI / 180) *
                Math.sin(dLonRad / 2) * Math.sin(dLonRad / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              destinationMeters = R * c * 1000;
              setTotalServiceInMeters(destinationMeters);
            }
          }
        } catch (_) {
          // Si no se puede leer destino, evitamos disparar pago automático.
          return;
        }

        // Solo pasar a pago cuando realmente está cerca del destino final.
        if (Math.round(destinationMeters) < 180) {
        let verifyResponse: any = await getActiveTravelsByClient(authResponse?.usuario?.phone);
          if (verifyResponse.data[0].status === "ONWAY" && verifyResponse.data[0].status !== "NEEDTOPAY") {
            await patchNeedPaymentUser(authResponse?.usuario?.phone);
          }
        }
      }
    })();
  }, [serviceInMeters, onWayTravel, takingPayment]);

  const calculateBearing = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  const getDistanceFromCoords = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceKm = R * c;
    const distanceMeters = distanceKm * 1000;

    setServiceInKilometers(distanceKm);
    setServiceInMeters(distanceMeters);

    return [{ "meters": distanceMeters, "kilometers": distanceKm }];
  };

  const getTotalDistanceFromCoords = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceKm = R * c;
    const distanceMeters = distanceKm * 1000;

    setTotalServiceInKilometers(distanceKm);
    setTotalServiceInMeters(distanceMeters);

    return [{ "meters": distanceMeters, "kilometers": distanceKm }];
  };

  // ✅ FUNCIÓN calculateDistance YA EXISTE (usada en handleRegionChangeComplete)
  // No es necesario duplicarla

  const roundToNearest100 = (num: number): number => {
    return Math.ceil(num / 100) * 100;
  };

  const formatNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const startWatchingLocation = async () => {
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 4000,
        distanceInterval: 10,
      },
      (location) => {
        const ubicacion_usuario = getUserLocation(authResponse.usuario.phone);
        if (!ubicacion_usuario) return;
        setUserPosition(location);
      }
    );
  };

  const stopRealTimeLocation = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
  };

  /** Notificación local: distancia haversine conductor → recogida (no añade llamadas a Google). */
  const notifyDriverNearPickupIfNeeded = (driverLat: number, driverLong: number) => {
    if (nearPickupNotificationSentRef.current) return;
    const raw = captureDriverDataRef.current;
    const row = Array.isArray(raw) ? raw[0] : raw;
    if (!row?.conductor) return;
    if (!shouldRedrawPickupApproachPolyline(row.status)) return;
    const op = getClientPickupPoint(originPlaceRef.current);
    if (!op) return;
    const m = haversineMeters(driverLat, driverLong, op.latitude, op.longitude);
    if (m > NEAR_PICKUP_HAVERSINE_MAX_M || m < NEAR_PICKUP_HAVERSINE_MIN_M) return;
    nearPickupNotificationSentRef.current = true;
    void (async () => {
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (perm.status !== "granted") {
          const req = await Notifications.requestPermissionsAsync();
          if (req.status !== "granted") return;
        }
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Tu conductor está cerca",
            body: "En aproximadamente un minuto puede llegar a tu punto de recogida.",
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      } catch {
        /* sin permiso o entorno sin notificaciones */
      }
    })();
  };

  const obtanintAllUpdateDistancePickUp = (data: any) => {
    if (captureDriverDataRef.current?.conductor) {
      (async () => {
        const loc = await Location.getCurrentPositionAsync({});
        let parsedPosition: { latitude: number; longitude: number };
        try {
          parsedPosition = JSON.parse(data.position);
        } catch {
          return;
        }

        const driverLat = parsedPosition.latitude;
        const driverLong = parsedPosition.longitude;
        const clientLat = loc.coords.latitude;
        const clientLon = loc.coords.longitude;

        const prev = lastAssignedDriverForBearingRef.current;
        let heading = 0;
        if (prev) {
          const dist = Math.sqrt(
            Math.pow(driverLat - prev.latitude, 2) +
            Math.pow(driverLong - prev.longitude, 2)
          );
          if (dist > 0.00001) {
            heading = calculateBearing(
              prev.latitude,
              prev.longitude,
              driverLat,
              driverLong
            );
          }
        }
        lastAssignedDriverForBearingRef.current = {
          latitude: driverLat,
          longitude: driverLong,
        };
        setAssignedDriverLive({
          latitude: driverLat,
          longitude: driverLong,
          heading,
        });
        setDriverPosition({ latitude: driverLat, longitude: driverLong });
        notifyDriverNearPickupIfNeeded(driverLat, driverLong);

        const calculatepiskup = await getDistanceFromCoords(
          clientLat,
          clientLon,
          driverLat,
          driverLong
        );

        if (calculatepiskup) {
          setUpdateLocation(data);
        }

        const op = getClientPickupPoint(originPlaceRef.current);
        const now = Date.now();
        const tripStatus = captureDriverDataRef.current?.status;
        if (op && shouldRedrawPickupApproachPolyline(tripStatus)) {
          const prevP = lastPickupPolylineDriverPosRef.current;
          const movedEnough =
            !prevP ||
            haversineMeters(driverLat, driverLong, prevP.lat, prevP.lng) >=
              PICKUP_POLYLINE_MIN_MOVE_METERS;
          const timeOk =
            now - lastPickupPolylineAtRef.current >= PICKUP_POLYLINE_MIN_INTERVAL_MS;
          if (movedEnough || timeOk) {
            lastPickupPolylineAtRef.current = now;
            lastPickupPolylineDriverPosRef.current = {
              lat: driverLat,
              lng: driverLong,
            };
            pickupPoint(
              op,
              { latitude: driverLat, longitude: driverLong },
              { bypassCache: true }
            );
          }
        }
      })();
    }
  };

  /** Si el socket no emite con el nombre esperado, el API de posiciones sigue actualizándose (conductor hace POST). */
  useEffect(() => {
    const conductor = captureDriverData?.conductor;
    const st = String(captureDriverData?.status || "");
    if (
      !conductor ||
      !["ACEPTED", "PICKUP", "ONWAY", "NEEDTOPAY"].includes(st)
    ) {
      return;
    }
    const normalizedConductor = String(conductor).trim();
    let cancelled = false;

    const applyFromCoords = (lat: number, lng: number) => {
      const driverLat = lat;
      const driverLong = lng;
      const prev = lastAssignedDriverForBearingRef.current;
      let heading = 0;
      if (prev) {
        const dist = Math.sqrt(
          Math.pow(driverLat - prev.latitude, 2) +
          Math.pow(driverLong - prev.longitude, 2)
        );
        if (dist > 0.00001) {
          heading = calculateBearing(
            prev.latitude,
            prev.longitude,
            driverLat,
            driverLong
          );
        }
      }
      lastAssignedDriverForBearingRef.current = {
        latitude: driverLat,
        longitude: driverLong,
      };
      setAssignedDriverLive({
        latitude: driverLat,
        longitude: driverLong,
        heading,
      });
      setDriverPosition({ latitude: driverLat, longitude: driverLong });
      notifyDriverNearPickupIfNeeded(driverLat, driverLong);
    };

    const tick = async () => {
      if (cancelled) return;
      try {
        const list = await getDriverPosition();
        if (!Array.isArray(list)) return;
        const row = list.find(
          (d: any) => String(d?.user ?? "").trim() === normalizedConductor
        );
        if (!row?.position) return;
        const parsed = JSON.parse(row.position);
        if (parsed?.latitude == null || parsed?.longitude == null) return;
        const dLat = Number(parsed.latitude);
        const dLng = Number(parsed.longitude);
        applyFromCoords(dLat, dLng);

        const op = getClientPickupPoint(originPlaceRef.current);
        const now = Date.now();
        const tripStatus = captureDriverDataRef.current?.status;
        if (op && shouldRedrawPickupApproachPolyline(tripStatus)) {
          const prevP = lastPickupPolylineDriverPosRef.current;
          const movedEnough =
            !prevP ||
            haversineMeters(dLat, dLng, prevP.lat, prevP.lng) >=
              PICKUP_POLYLINE_MIN_MOVE_METERS;
          const timeOk =
            now - lastPickupPolylineAtRef.current >= PICKUP_POLYLINE_MIN_INTERVAL_MS;
          if (movedEnough || timeOk) {
            lastPickupPolylineAtRef.current = now;
            lastPickupPolylineDriverPosRef.current = { lat: dLat, lng: dLng };
            pickupPoint(
              op,
              { latitude: dLat, longitude: dLng },
              { bypassCache: true }
            );
          }
        }
      } catch {
        /* ignore */
      }
    };

    tick();
    const id = setInterval(tick, DRIVER_POSITION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [captureDriverData?.conductor, captureDriverData?.status]);

  const obtanintAllUpdateDistanceTravel = (data: any) => {
    // console.log("iniciar_viaje_1", data);

    if (data?.conductor && data?.status === "PICKUP") {
      (async () => {
        const loc = await Location.getCurrentPositionAsync({});
        const parsedPosition = JSON.parse(data.ubicacionDestino);

        let travelLat = parsedPosition.latitude;
        let travelLong = parsedPosition.longitude;
        let clientLat = loc.coords.latitude;
        let clientLon = loc.coords.longitude;

        let calculateOnWay = await getDistanceFromCoords(
          clientLat,
          clientLon,
          travelLat,
          travelLong
        );

        if (calculateOnWay) {
          setUpdateLocation(data);
          setOnwayTravel(true);
        }
      })();
    }
  };

  const ObtainName = async () => {
    if (
      !selectedPlace ||
      typeof selectedPlace.latitude !== "number" ||
      typeof selectedPlace.longitude !== "number"
    ) {
      return;
    }

    const cachedAddress = getCachedGeocode(selectedPlace.latitude, selectedPlace.longitude);
    if (cachedAddress) {
      setInput(cachedAddress);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${selectedPlace.latitude},${selectedPlace.longitude}&key=${GoogleMapsApiKeytsx}&language=es`
      );
      const json = await response.json();
      if (!json.results?.[0]) return;
      const address = extractReadableAddress(json.results);
      setInput(address);
      setCachedGeocode(selectedPlace.latitude, selectedPlace.longitude, address);
      lastGeocodedPosition.current = {
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
      };
    } catch (e) {
      console.error("Error ObtainName (geocode):", e);
    }
  };

  const ObtainOrigin = async () => {
    const pt = getClientPickupPoint(originPlace as unknown);
    if (!pt) return;

    const cachedAddress = getCachedGeocode(pt.latitude, pt.longitude);
    if (cachedAddress) {
      setOriginAddress(cachedAddress);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pt.latitude},${pt.longitude}&key=${GoogleMapsApiKeytsx}&language=es`
      );
      const json = await response.json();

      if (json.results && json.results[0]) {
        const address = extractReadableAddress(json.results);
        setOriginAddress(address);
        setCachedGeocode(pt.latitude, pt.longitude, address);
        lastGeocodedPosition.current = {
          latitude: pt.latitude,
          longitude: pt.longitude,
        };
      }
    } catch (error) {
      console.error('Error obteniendo dirección de origen:', error);
    }
  };


  // Función auxiliar para calcular distancia entre dos coordenadas (sin modificar estado)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Retorna distancia en metros
  };

  // ============================================
  // ✅ OPTIMIZADO - fetchPlaces (CON SESSION TOKENS)
  // ============================================
  const fetchPlaces = async (input: string) => {
    const normalizedInput = input.trim();
    if (!normalizedInput) {
      setResults([]);
      sessionTokenRef.current = null;
      return;
    }

    // Evita cobro por ruido: consultas con texto muy corto casi no aportan valor
    if (normalizedInput.length < PLACES_MIN_CHARS) {
      setResults([]);
      return;
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken();
    }

    // Evita consultas repetidas exactas en ráfaga
    const now = Date.now();
    if (
      normalizedInput.toLowerCase() === lastPlacesQueryRef.current.toLowerCase() &&
      now - lastPlacesRequestAt.current < PLACES_COOLDOWN_MS
    ) {
      return;
    }

    const cacheKey = normalizedInput.toLowerCase();
    const cachedPlaces = placesCache.current[cacheKey];
    if (cachedPlaces && now - cachedPlaces.timestamp < PLACES_CACHE_TIME) {
      setResults(cachedPlaces.results);
      lastPlacesQueryRef.current = normalizedInput;
      return;
    }

    try {
      const origin = originPlace as unknown as { latitude?: number; longitude?: number } | undefined;
      const userLat =
        location?.latitude ??
        origin?.latitude ??
        4.7110;
      const userLon =
        location?.longitude ??
        origin?.longitude ??
        -74.0721;

      const sessionToken = encodeURIComponent(sessionTokenRef.current);
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(normalizedInput)}` +
        `&language=es&key=${GoogleMapsApiKeytsx}&components=country:co&location=${userLat},${userLon}&radius=5000` +
        `&sessiontoken=${sessionToken}`;

      lastPlacesRequestAt.current = now;
      lastPlacesQueryRef.current = normalizedInput;
      const response = await fetch(url);
      const json = await response.json();

      if (json.status === "OK" && json.predictions) {
        const predictions = json.predictions.map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
        }));
        setResults(predictions);
        placesCache.current[cacheKey] = { results: predictions, timestamp: Date.now() };
        const pk = Object.keys(placesCache.current);
        if (pk.length > 36) {
          pk
            .sort(
              (a, b) =>
                placesCache.current[a].timestamp - placesCache.current[b].timestamp
            )
            .slice(0, pk.length - 30)
            .forEach((k) => delete placesCache.current[k]);
        }
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      setResults([]);
    }
  };

  // ============================================
  // ✅ fetchPlaceDetails
  // ============================================
  const fetchPlaceDetails = async (placeId: string, description?: string) => {
    isAnimating.current = true;
    // Cerrar teclado, quitar foco y limpiar lista para que el pin pueda reverse-geocodificar después
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    isTyping.current = false;
    setResults([]);
    const chosenText = description || '';
    setInput(chosenText);

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${GoogleMapsApiKeytsx}&language=es`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status === "OK" && json.results[0]) {
        const loc = json.results[0].geometry.location;
        const coords = {
          latitude: loc.lat,
          longitude: loc.lng
        };

        setSelectedPlace(coords);
        setFinalCordinates(coords);
        setCachedGeocode(coords.latitude, coords.longitude, chosenText);

        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 500);
        }

        setShowRoute(true);
        sessionTokenRef.current = null;
      }

      setTimeout(() => {
        isAnimating.current = false;
      }, 800);
    } catch (error) {
      console.error('Error:', error);
      isAnimating.current = false;
    }
  };

  const getDirections = async (
    origin: any,
    final: any
  ): Promise<{ distanceMeters: number; duration: string } | undefined> => {
    const originLL =
      getClientPickupPoint(origin) ??
      (origin &&
      typeof origin.latitude === "number" &&
      typeof origin.longitude === "number"
        ? { latitude: origin.latitude, longitude: origin.longitude }
        : null);
    const finalLL =
      getClientPickupPoint(final) ??
      (final &&
      typeof final.latitude === "number" &&
      typeof final.longitude === "number"
        ? { latitude: final.latitude, longitude: final.longitude }
        : null);
    if (!originLL || !finalLL) return undefined;

    setFinalCordinates(finalLL);
    setLocation({
      latitude: finalLL.latitude + 0.0055,
      longitude: finalLL.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    // No llamar ObtainName() aquí: fetchPlaceDetails ya guardó el texto en
    // caché y setInput(). Llamarlo con estado desactualizado sobreescribiría
    // la dirección correcta con la del punto de origen.

    const routeKey = getRouteCacheKey('trip', originLL, finalLL);
    const cachedRoute = routesCache.current[routeKey];
    if (cachedRoute && Date.now() - cachedRoute.timestamp < ROUTES_CACHE_TIME) {
      setRouteCoords(cachedRoute.coords);
      if (cachedRoute.distanceMeters != null && cachedRoute.duration != null) {
        return {
          distanceMeters: cachedRoute.distanceMeters,
          duration: cachedRoute.duration
        };
      }
    }

    try {
      const res = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GoogleMapsApiKeytsx,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: originLL.latitude,
                  longitude: originLL.longitude
                }
              }
            },
            destination: {
              location: {
                latLng: {
                  latitude: finalLL.latitude,
                  longitude: finalLL.longitude
                }
              }
            },
            travelMode: 'DRIVE',
            computeAlternativeRoutes: false,
            languageCode: 'es'
          })
        }
      );

      const json = await res.json();
      // console.log('Respuesta Routes API:', json);

      if (json.routes && json.routes.length > 0) {
        const route = json.routes[0];
        const encodedPolyline = route.polyline.encodedPolyline;
        const distanceMeters = Number(route.distanceMeters ?? 0);
        const duration = normalizeRoutesApiDuration(route.duration);

        const points = polyline.decode(encodedPolyline);
        const coords = points.map((point: [number, number]) => ({
          latitude: point[0],
          longitude: point[1],
        }));

        setRouteCoords(coords);
        routesCache.current[routeKey] = {
          coords,
          distanceMeters,
          duration,
          timestamp: Date.now()
        };
        pruneRoutesCacheStore();
        return { distanceMeters, duration };
      } else {
        console.warn('No se encontró ruta', json);
        setRouteCoords([]);
      }
    } catch (error) {
      console.error('Error en Routes API:', error);
      setRouteCoords([]);
    }
    return undefined;
  };

  const pickupPoint = async (
    origin: any,
    final: any,
    opts?: { bypassCache?: boolean }
  ) => {
    const originPt = getClientPickupPoint(origin);
    if (
      !originPt ||
      !final ||
      typeof final.latitude !== "number" ||
      typeof final.longitude !== "number"
    ) {
      return;
    }

    const routeKey = getRouteCacheKey('pickup', final, originPt);
    if (!opts?.bypassCache) {
      const cachedRoute = routesCache.current[routeKey];
      if (cachedRoute && Date.now() - cachedRoute.timestamp < ROUTES_CACHE_TIME) {
        setPickOfPoint(cachedRoute.coords as any);
        setPickupPolylineVersion((v) => v + 1);
        return;
      }
    }

    try {
      const res = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GoogleMapsApiKeytsx,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: final.latitude,
                  longitude: final.longitude
                }
              }
            },
            destination: {
              location: {
                latLng: {
                  latitude: originPt.latitude,
                  longitude: originPt.longitude
                }
              }
            },
            travelMode: 'DRIVE',
            computeAlternativeRoutes: false,
            languageCode: 'es'
          })
        }
      );

      const json = await res.json();

      if (json.routes && json.routes.length > 0) {
        const route = json.routes[0];
        const encodedPolyline = route.polyline.encodedPolyline;

        const points = polyline.decode(encodedPolyline);
        const coords = points.map((point: [number, number]) => ({
          latitude: point[0],
          longitude: point[1],
        }));

        setPickOfPoint(coords as any);
        setPickupPolylineVersion((v) => v + 1);
        routesCache.current[routeKey] = {
          coords,
          timestamp: Date.now()
        };
        pruneRoutesCacheStore();
      } else {
        console.warn('No se encontró ruta');
        setPickOfPoint([] as any);
        setPickupPolylineVersion((v) => v + 1);
      }
    } catch (error) {
      console.error('Error en pickup point:', error);
      setPickOfPoint([] as any);
      setPickupPolylineVersion((v) => v + 1);
    }
  };

  const goToSection = useCallback((section: 1 | 2) => {
    setCurrentSection(section);
    Animated.spring(slideAnimation, {
      toValue: section === 1 ? 0 : 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnimation]);

  /**
   * Al volver del chat (UserChatScreen en el stack raíz), el mapa puede remontarse y perder estado en memoria.
   * Los sockets no reenvían `new_offer` ya existentes: rehidratamos ofertas y backup del viaje desde la API.
   */
  useFocusEffect(
    React.useCallback(() => {
      const phone = authResponse?.usuario?.phone;
      if (!phone) return undefined;

      let cancelled = false;

      (async () => {
        try {
          const activeRes: any = await getActiveTravelsByClient(phone);
          const st = String(activeRes?.data?.[0]?.status ?? "").toUpperCase();
          if (
            st &&
            ["ACEPTED", "PICKUP", "ONWAY", "NEEDTOPAY", "FINISH"].includes(st)
          ) {
            return;
          }

          const offersRaw = await getAllDriversOffers(phone);
          if (cancelled) return;

          const list = Array.isArray(offersRaw?.data)
            ? offersRaw.data
            : Array.isArray(offersRaw)
              ? offersRaw
              : [];

          if (list.length === 0) return;

          setDriverOffer(list);
          setWaitDrive(true);
          setOpenFixMenu(false);

          const backup = await getTravelByClientId(phone);
          if (cancelled) return;

          const row = backup?.data?.[0];
          if (!row) {
            setStartTravel(true);
            goToSection(2);
            return;
          }

          const tipo = String(row.tipoServicio || "");
          if (tipo) setSelectMyTravel(tipo);

          try {
            const uc =
              typeof row.ubicacionCliente === "string"
                ? JSON.parse(row.ubicacionCliente || "{}")
                : row.ubicacionCliente;
            if (uc?.latitude != null && uc?.longitude != null) {
              setOriginPlace({
                latitude: Number(uc.latitude),
                longitude: Number(uc.longitude),
              } as any);
            }
          } catch {
            /* noop */
          }

          try {
            const ud =
              typeof row.ubicacionDestino === "string"
                ? JSON.parse(row.ubicacionDestino || "{}")
                : row.ubicacionDestino;
            if (ud?.latitude != null && ud?.longitude != null) {
              setFinalCordinates({
                latitude: Number(ud.latitude),
                longitude: Number(ud.longitude),
              });
            }
          } catch {
            /* noop */
          }

          let travelLabel = "";
          try {
            const dv = row.datosViaje;
            if (dv != null) {
              const parsed = typeof dv === "string" ? JSON.parse(dv) : dv;
              travelLabel =
                typeof parsed === "string"
                  ? parsed
                  : String(
                      (parsed &&
                        typeof parsed === "object" &&
                        "description" in parsed &&
                        (parsed as { description?: string }).description) ||
                        parsed ||
                        ""
                    );
            }
          } catch {
            travelLabel = row.datosViaje != null ? String(row.datosViaje) : "";
          }
          if (travelLabel) {
            setCaptureFinalLocation(travelLabel);
            setInput(travelLabel);
          }

          setStartTravel(true);
          if (tipo) setSaveTransport(tipo);
          goToSection(2);
        } catch (e) {
          console.warn("restorePendingOffersOnFocus:", e);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [authResponse?.usuario?.phone, goToSection])
  );

  /** Domicilio: tras llenar el modal, el CTA principal dice «Buscar domiciliario» (sigue confirmando destino en mapa hasta tener ruta). */
  const domicilioMapPrimaryLabel = () => {
    if (selectMyTravel !== 'domicilio' || !deliveryData) return 'Confirmar Destino';
    if ((routeCoords?.length ?? 0) > 0 && startTravel) return 'Ajustar Ubicacion';
    return 'Buscar domiciliario';
  };

  const toogleView = (isInteractiveWithMap: boolean) => {
    setisInteractive(isInteractiveWithMap);
    Animated.timing(AnimatedValue, {
      toValue: isInteractiveWithMap ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType?.toLowerCase()) {
      case 'moto': return '🏍️';
      case 'auto':
      case 'carro': return '🚗';
      case 'domicilio': return '📦';
      default: return '🚕';
    }
  };

  const getVehicleImage = (vehicleType: string) => {
    switch (vehicleType?.toLowerCase()) {
      case 'moto':
        return require('../../../../assets/motoparagps.png');
      case 'carro':
        return require('../../../../assets/carroparagps.png');
      case 'domicilio':
        return require('../../../../assets/motoparagps.png');
      default:
        return require('../../../../assets/carroparagps.png');
    }
  };

  const getWeightIcon = (weightRange: string) => {
    switch (weightRange) {
      case 'small': return '📦';
      case 'medium': return '📦📦';
      case 'large': return '📦📦📦';
      case 'extra-large': return '🚚';
      default: return '📦';
    }
  };

  const getWeightLabel = (weightRange: string) => {
    switch (weightRange) {
      case 'small': return 'Pequeño (hasta 2kg)';
      case 'medium': return 'Mediano (2-10kg)';
      case 'large': return 'Grande (10-25kg)';
      case 'extra-large': return 'Extra Grande (+25kg)';
      default: return 'No especificado';
    }
  };

  const comfirmPlace = async () => {
    // ✅ Verificar si ya hay una solicitud en curso
    if (isLoadingService) return;
    setIsLoadingService(true);

    try {
      let deleteBeforeOffers = await HandleDeleteOffers(authResponse?.usuario?.phone);
      let deleteBeforeTravels = await HandleDeleteTravels(authResponse?.usuario?.phone);
      let deleteBeforeActiveTravels = await HandleDeleteActiveTravels(authResponse?.usuario?.phone);

      if (deleteBeforeOffers && deleteBeforeTravels && deleteBeforeActiveTravels) {

        const originForRoute = getClientPickupPoint(originPlace as unknown);
        if (
          !originForRoute ||
          !selectedPlace ||
          typeof selectedPlace.latitude !== "number" ||
          typeof selectedPlace.longitude !== "number"
        ) {
          setErrorMessage("Selecciona un punto de recogida y un destino válidos en el mapa.");
          setShowErrorModal(true);
          return;
        }

        // ── Cotización gratuita con Haversine ×1.35 (sin Google Routes) ──────────
        // Google Routes solo se usará al confirmar el viaje (WaitService).
        const straightMeters = haversineMeters(
          originForRoute.latitude, originForRoute.longitude,
          selectedPlace.latitude, selectedPlace.longitude
        );
        const estimatedMeters = Math.round(straightMeters * 1.35);
        // Velocidad promedio urbana ~30 km/h → tiempo estimado en segundos
        const estimatedSeconds = Math.round((estimatedMeters / 1000 / 30) * 3600);

        const calculate_price = await getTimeAndDistance(
          selectMyTravel === "domicilio" ? "moto" : selectMyTravel
        );

        if (calculate_price) {
          let drive_distance = estimatedMeters / 100;
          let drive_time = estimatedSeconds / 60;

          let finalcost = await calcularTarifaDinamica(
            estimatedSeconds / 60,
            estimatedMeters,
            selectMyTravel
          );

          setDistanceCost(formatToCOP(roundToNearest100(finalcost).toString()));
          setTimeDistance(Math.ceil(drive_time));
          setDistanceTrick(drive_distance);
          setStartTravel(true);
          setCaptureFinalLocation(input);
          const destPin = selectedPlace;
          confirmedDestinationRef.current = {
            label: (input || '').trim(),
            coords:
              destPin &&
              typeof destPin.latitude === 'number' &&
              typeof destPin.longitude === 'number'
                ? { latitude: destPin.latitude, longitude: destPin.longitude }
                : null,
          };
          setOpenFixMenu(false);

          handleLogoPress();
          goToSection(2);
        }
      }
    } finally {
      setIsLoadingService(false);
    }

    return true;
  };

  const WaitService = async (typeVehicle: string, ofertaEnviada?: string) => {
    if (isLoadingService) return;
    setIsLoadingService(true);

    setSaveTransport(typeVehicle);
    await HandleDeleteOffers(authResponse?.usuario?.phone);
    let handleDeleteData = await HandleDeleteTravels(authResponse?.usuario?.phone);

    if (authResponse?.usuario?.phone && handleDeleteData) {
      let getBackup = await getTravelByClientId(authResponse?.usuario?.phone);

      const parseCoordsLoose = (raw: any): { latitude: number; longitude: number } | null => {
        if (!raw) return null;
        try {
          const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (p?.latitude != null && p?.longitude != null) {
            return { latitude: Number(p.latitude), longitude: Number(p.longitude) };
          }
        } catch (_) {}
        return null;
      };

      /** Texto destino: nunca depender solo de `input` (el mapa lo puede sobrescribir tras confirmar). */
      const destinationLabel =
        (confirmedDestinationRef.current.label && confirmedDestinationRef.current.label.trim()) ||
        (captureFinalLocation && captureFinalLocation.trim()) ||
        (input && input.trim()) ||
        '';

      const destinationCoords =
        confirmedDestinationRef.current.coords ||
        finalCordinates ||
        parseCoordsLoose(getBackup?.data?.[0]?.ubicacionDestino);

      if (typeVehicle) {
        let VerifyOffer = ofertaEnviada ? ofertaEnviada : distanceCost;

        //  console.log(getBackup, authResponse?.usuario?.phone, "holas_back_up_2");

        // Enriquecer coordenadas de recogida con el texto de dirección para que el conductor lo vea
        const pickupWithAddress = originPlace
          ? { ...originPlace, address: originAddress || '' }
          : (getBackup.data[0].ubicacionCliente ?? originPlace);

        let result = await handleCreateTravel(
          authResponse?.usuario?.phone,
          pickupWithAddress,
          pickupWithAddress,
          typeVehicle,
          authResponse?.usuario?.name,
          "Nuevo",
          VerifyOffer,
          destinationLabel,
          destinationCoords ?? getBackup.data[0].ubicacionDestino
        );

        if (result) {
          let response = await handleCreateTravelBackUp(
            authResponse?.usuario?.phone,
            pickupWithAddress,
            pickupWithAddress,
            typeVehicle,
            authResponse?.usuario?.name,
            "Nuevo",
            VerifyOffer,
            destinationLabel,
            destinationCoords
          );
          if (response) {
            setWaitDrive(true);
          }
          return;
        }
      } else {
        const row = getBackup.data[0];
        const transformData = {
          ...row,
          ubicacionCliente: JSON.parse(row.ubicacionCliente || "{}"),
          ubicacionConductor: row.ubicacionConductor ? JSON.parse(row.ubicacionConductor) : null,
          ubicacionDestino: row.ubicacionDestino ? JSON.parse(row.ubicacionDestino) : null,
          datosViaje: row.datosViaje ? JSON.parse(row.datosViaje) : null,
          datosRecogida: row.datosRecogida ? JSON.parse(row.datosRecogida) : null,
        };

        const origen = originPlace || transformData.ubicacionCliente;
        const destino = destinationCoords || transformData.ubicacionDestino;
        const vehicle = typeVehicle || transformData.tipoServicio;
        const cost = distanceCost || transformData.tarifa;
        const lugar =
          destinationLabel ||
          transformData.datosViaje;

        let response = await handleCreateTravel(
          authResponse.usuario.phone,
          origen,
          destino,
          vehicle,
          authResponse.usuario.name,
          "Nuevo",
          cost,
          lugar,
          destino
        );
        if (response) {
          setWaitDrive(true);
        }
      }
    }
    return true;
  };

  const NewService = async (item: any, status = "ACEPTED") => {
    let deleteTravelsOffers = await HandleDeleteOffers(authResponse?.usuario?.phone);
    let deleteTravelsTable = await HandleDeleteTravels(authResponse?.usuario?.phone);

    if (deleteTravelsOffers && deleteTravelsTable) {
      let result = await HandleCreateactiveTravels(
        item?.clientid,
        item?.ubicacionCliente,
        item?.ubicacionConductor,
        item?.ubicacionDestino,
        item?.tipoServicio,
        item?.user,
        status,
        item?.tarifa,
        item?.oferta,
        item?.datosViaje,
        item.contraoferta,
        item.conductor
      );

      let response = await getDriverByPhone(item.conductor);

      if (result) {
        setWaitDrive(false);
        const driverLocation = JSON.parse(item.ubicacionConductor);
        const driverCoords = {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude
        };
        setDriverPosition(driverCoords);
        setAssignedDriverLive({ ...driverCoords, heading: 0 });
        lastAssignedDriverForBearingRef.current = driverCoords;
        const op = originPlace as { latitude?: number; longitude?: number } | undefined;
        if (op && typeof op.latitude === "number" && typeof op.longitude === "number") {
          pickupPoint(op, driverCoords);
        }
      }

      if (response) {
        // console.log(response, "holas_conductor_acepted");
        setDriverDataAcepted([response]);
      }
    }
  };

  const ReChagedService = async (data: any) => {
    let step1 = await cancelServicebyDriver();
    if (step1) {
      let res = await WaitService(data.tipoServicio, data.oferta !== "" ? data.oferta : data.tarifa);
      if (res) {
        return true;
      }
    }
  };

  const cancelService = async () => {

    await HandleDeleteTravels(authResponse?.usuario?.phone);
    await HandleDeleteOffers(authResponse?.usuario?.phone);

    let userRatings = await getRatingByUser(authResponse?.usuario?.phone);
    if (userRatings) {
      updateRating(
        authResponse?.usuario?.phone,
        (parseInt(userRatings?.rating) / 1.004).toFixed(2).toString()
      );
    }

    setWaitDrive(false);
    setStartTravel(false);
    setOnwayTravel(false);
    setDriverOffer([]);
    setOpenFixMenu(true);
    setRouteCoords([]);
    setDriverDataAcepted([]);
    setTakingPayment(false);
    setisInteractive(false);
    setKeyboardVisible(false);
    goToSection(1);
    setIsLoadingService(false);
    setPickOfPoint([]);
    setAssignedDriverLive(null);
    lastAssignedDriverForBearingRef.current = null;
    lastPickupPolylineDriverPosRef.current = null;
    lastPickupPolylineAtRef.current = 0;
    setCurrentSection(3);
    return true;
  };

  const cancelServicebyDriver = async () => {
    await HandleDeleteTravels(authResponse?.usuario?.phone);
    await HandleDeleteOffers(authResponse?.usuario?.phone);

    setWaitDrive(true);
    setStartTravel(false);
    setOpenFixMenu(false);
    setRouteCoords([]);
    setDriverOffer([]);
    setCurrentSection(3);
    setPickOfPoint([]);
    setDriverDataAcepted([]);
    setAssignedDriverLive(null);
    lastAssignedDriverForBearingRef.current = null;
    lastPickupPolylineDriverPosRef.current = null;
    lastPickupPolylineAtRef.current = 0;
    return true;
  };

  const HandletotalInvoice = async () => {
    if (!authResponse.usuario.phone) return;

    try {
      // finishPayment puede ser null si completeTrip() ya creó la factura
      if (finishPayment) {
        const createInvoice = await createInvoiceTravel(finishPayment, "client");
        if (createInvoice?.data) {
          await Promise.allSettled([
            HandleDeleteActiveTravels(authResponse.usuario.phone),
            HandleDeleteOffers(authResponse.usuario.phone),
            HandleDeleteTravels(authResponse.usuario.phone),
          ]);
        }
      }
    } catch (error) {
      console.error('Error al crear factura:', error);
    } finally {
      // Siempre resetear el mapa; await garantiza que el cleanup
      // termine ANTES de que la UI vuelva al mapa y el cliente
      // pueda pedir otro viaje, evitando borrar el nuevo travel.
      await cancelService();
      setisInteractive(false);
      setKeyboardVisible(false);
      try {
        const pending = await AsyncStorage.getItem("updateRatings");
        const trip = lastFinishedTripForRatingRef.current;
        const raw = trip != null && (Array.isArray(trip) ? trip[0] : trip);
        if (pending === "true" && raw?.conductor) {
          setShowRateButton(true);
          setShowRatingModal(true);
        }
      } catch {
        /* noop */
      }
    }
  };

  const handleOptionsConfirm = (options: any) => {
    // console.log('Opciones seleccionadas:', options);
  };

  const handleSelectPaymentMethod = (method: 'efectivo' | 'nequi' | 'tarjeta' | 'pse' | 'daviplata') => {
    setSelectedPaymentMethod(method);
    // console.log('Método de pago seleccionado:', method);

    switch (method) {
      case 'efectivo':
        // console.log('💵 Pago en efectivo');
        break;
      case 'nequi':
        // console.log('📱 Pago con Nequi');
        setShowNequi(true);
        break;
      case 'tarjeta':
        // console.log('💳 Pago con tarjeta');
        break;
    }
  };

  const handleSubmitRating = async (_rating: number) => {
    // Siempre ocultar el botón y limpiar el estado del viaje tras calificar
    setShowRateButton(false);
    setShowRatingModal(false);
    lastFinishedTripForRatingRef.current = null;
    await AsyncStorage.setItem('updateRatings', "false");
    // Limpiar completamente el estado del mapa para volver al inicio
    await cancelService();
  };

  const handleDeliveryConfirm = (data: any) => {
    // console.log('📦 Datos del envío:', data);
    setDeliveryData(data);
    setShowDeliveryModal(false);

    console.log(`
    🎯 Nuevo servicio de envío:
    - Tamaño: ${data.weightRange}
    - Descripción: ${data.description}
    - Valor: ${data.itemValue || 'No declarado'}
    - Destinatario: ${data.recipientName || 'No especificado'}
    - Teléfono: ${data.recipientPhone || 'No especificado'}
    - Instrucciones: ${data.specialInstructions || 'Ninguna'}
  `);
  };

  if (!location || !isScreenReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: COLORS.textPrimary }}>Obteniendo ubicación...</Text>
        <ActivityIndicator size="large" color="#FFC300" />
      </View>
    );
  }

  /** Con viaje ya asignado solo mostramos al conductor del viaje; los del listado `/driverpositions` suelen duplicar icono en la recogida. */
  const suppressNearbyDriverMarkers =
    !!captureDriverData?.conductor &&
    ["ACEPTED", "PICKUP", "ONWAY", "NEEDTOPAY"].includes(
      String(captureDriverData?.status ?? "")
    );

  return (
    <View style={styles.container}>

      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Profile Button - floating over map */}
      {!(isInteractive || isKeyboardVisible) && (
        <View style={[styles.floatingHeader, { top: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UserProfileScreen')}
            style={styles.user_button}
          >
            {profilePhotoUrl ?
              <Image
                width={20}
                height={20}
                style={styles.user_img}
                source={{ uri: profilePhotoUrl }}
              />
              :
              <Image
                width={20}
                height={20}
                style={styles.user_img}
                source={require("../../../../assets/UserCircle.png")}
              />
            }
          </TouchableOpacity>

          {showRateButton && (
            <TouchableOpacity
              style={styles.ratingButton}
              onPress={() => setShowRatingModal(true)}
            >
              <Text style={styles.ratingButtonText}>⭐ Calificar viaje</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search Results */}
      {results.length > 0 && input !== "" ?
        <TouchableWithoutFeedback>
          <FlatList
            data={results.slice(0, 3)}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => fetchPlaceDetails(item.place_id, item.description)} style={styles.item}>
                <Text style={styles.itemText}>{item.description}</Text>
              </TouchableOpacity>
            )}
            style={[{ top: isKeyboardVisible ? 40 : 130 }, styles.resultsList]}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          />
        </TouchableWithoutFeedback>
        :
        null
      }

      {/* 🚀 BOTON FLOTANTE DE UBICACION ACTUAL (LOGO) */}
      <TouchableOpacity
        onPress={handleLogoPress}
        activeOpacity={0.7}
        style={[styles.logo_app, { display: isInteractive || isKeyboardVisible ? "none" : "flex" }]}
      >
        <Image
          style={{ width: 50, height: 50, borderRadius: 25 }}
          source={require("../../../../assets/logo_login.png")}
        />
      </TouchableOpacity>
 {/* Map */}
      <Animated.View
        style={{
          transform: [
            {
              scaleY: AnimatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1]
              })
            },
            {
              translateY: AnimatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0]
              })
            }
          ],
          width: '100%',
          position: 'absolute',
          top: 0
        }}
      >
        <MapView
          ref={mapRef}
          style={{
            width: '100%',
           
            position: 'relative',
            height: isKeyboardVisible
              ? Dimensions.get('window').height * 0.18
              : isInteractive
                ? Dimensions.get('window').height * 0.99
                : Dimensions.get('window').height > 810 ? Dimensions.get('window').height * 0.55 :  Dimensions.get('window').height * 0.55 ,
          }}
          region={location}
          showsUserLocation
          showsBuildings={true}
          customMapStyle={mapStyleUberos}
          provider={PROVIDER_GOOGLE}
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
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
          compassOffset={{ x: -1000, y: -1000 }}
          toolbarEnabled={false}
          showsMyLocationButton={false}
          showsCompass={false}
          //onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPanDrag={handlePanDragStart}
        >
          {/* Radar Circle - SOLO SI ESTÁ ESPERANDO CONDUCTOR */}
          {originPlace && waitDrive && (
            <Circle
              center={originPlace as any}
              radius={radarRadius}
              strokeColor={`rgba(255, 204, 40, ${radarOpacity})`}
              fillColor={`rgba(255, 204, 40, ${radarOpacity * 0.4})`}
              strokeWidth={3}
            />
          )}
          {/* Amarillo: conductor → tu recogida (punto A); oculto en ONWAY por estado */}
          {shouldRedrawPickupApproachPolyline(captureDriverData?.status) &&
            Array.isArray(pickOfPoint) &&
            pickOfPoint.length > 0 && (
            <Polyline
              key={`pickup-polyline-v${pickupPolylineVersion}`}
              coordinates={pickOfPoint as LatLng[]}
              strokeWidth={5}
              strokeColor="#FFC300"
            />
          )}
          {/* Azul: ruta del viaje que elegiste (recogida → destino, punto B) */}
          {routeCoords?.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeWidth={4}
              strokeColor="#2196F3"
            />
          )}
          {/* Punto A · recogida (mismo amarillo temático; sin pin verde duplicado) */}
          {startTravel &&
            routeCoords &&
            routeCoords.length > 0 &&
            originPlace &&
            typeof (originPlace as unknown as LatLng).latitude === "number" &&
            typeof (originPlace as unknown as LatLng).longitude === "number" && (
              <Marker
                coordinate={originPlace as unknown as LatLng}
                title="Recogida (punto A)"
                description="Aquí te recogen"
                pinColor="#FFC300"
              />
            )}
          {/* Conductor asignado (siempre visible con ruta aproximada hacia ti) */}
          {assignedDriverLive &&
            captureDriverData?.conductor &&
            ["ACEPTED", "PICKUP", "ONWAY", "NEEDTOPAY"].includes(
              String(captureDriverData?.status || "")
            ) && (
              <Marker
                coordinate={{
                  latitude: assignedDriverLive.latitude,
                  longitude: assignedDriverLive.longitude,
                }}
                title="Tu conductor"
                description="Posición del vehículo"
                anchor={{ x: 0.5, y: 0.5 }}
                rotation={assignedDriverLive.heading}
                flat={true}
              >
                <View style={{ width: 80, height: 80 }}>
                  <Image
                    style={{ width: 35, height: 35 }}
                    source={getVehicleImage(
                      String(
                        driverDataAcepted?.[0]?.vehicleType ||
                          captureDriverData?.tipoServicio ||
                          selectMyTravel
                      )
                    )}
                  />
                </View>
              </Marker>
            )}
          {/* Conductores disponibles (lista API); ocultos con viaje asignado para no duplicar la moto del conductor en punto A. */}
          {!suppressNearbyDriverMarkers &&
            drivers &&
            drivers.map((driver: any) => {
              let position;
              try {
                position = JSON.parse(driver.position);
              } catch (error) {
                console.error('❌ Error al parsear la posición del conductor:', driver.user, error);
                return null;
              }
              const heading = driver.heading || 0;
              return (
                <Marker
                  key={driver.id}
                  coordinate={{
                    latitude: position.latitude,
                    longitude: position.longitude,
                  }}
                  title={`Conductor: ${driver.user}`}
                  anchor={{ x: 0.5, y: 0.5 }}
                  rotation={heading}
                  flat={true}
                >
                  <View style={{ width: 80, height: 80 }}>
                    <Image
                      style={{ width: 35, height: 35 }}
                      source={getVehicleImage(driver.vehicleType || selectMyTravel)}
                    />
                  </View>
                </Marker>
              );
            })}
          {/* Punto B · destino */}
          {routeCoords && routeCoords.length > 0 && (startTravel || onWayTravel || waitDrive) && (
            <Marker
              coordinate={routeCoords[routeCoords.length - 1]}
              title="Destino (punto B)"
              pinColor="#FFC300"
            />
          )}
        </MapView>
      </Animated.View>
      {/* Bottom Sheet */}
      <Animated.View
        style={{
          transform: [
            {
              translateY: AnimatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 220]
              })
            },
            {
              translateY: 0
            }
          ],
          width: '100%',
          position:"absolute",
          // Altura del panel inferior: `takingPayment` necesita más espacio (métodos de pago).
          height: isKeyboardVisible
            ? undefined
            : screenHeight * (isTablet ? 0.42 : takingPayment ? 0.62 : 0.48),
          top: isKeyboardVisible ? insets.top + Math.round(screenHeight * 0.16) : undefined,
          bottom: isKeyboardVisible ? undefined : 0,
          backgroundColor: COLORS.background,
        }}
      >

        <View style={styles.blackbuton}>
          {/* Logo */}

          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{
              paddingBottom: takingPayment ? Math.max(insets.bottom + 96, 104) : Math.max(insets.bottom + 72, 80),
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* Payment Methods (when taking payment) */}
            {takingPayment && (
              <>
                <TouchableOpacity style={styles.paymentMethodButton}>
                  <View style={styles.paymentMethodIcon}>
                    <Text style={{ fontSize: 24 }}>💳</Text>
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>
                      {hasCard ? 'Método de pago guardado' : 'Agregar método de pago'}
                    </Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      {hasCard ? 'Tarjeta registrada' : 'Agrega una tarjeta de crédito'}
                    </Text>
                  </View>
                  <Text style={styles.paymentMethodArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.paymentMethodButton}>
                  <View style={styles.paymentMethodIcon}>
                    <Text style={{ fontSize: 24 }}>N</Text>
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>Nequi</Text>
                    <Text style={styles.paymentMethodSubtitle}>Pagar con Nequi</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.paymentMethodButton}>
                  <View style={styles.paymentMethodIcon}>
                    <Text style={{ fontSize: 24 }}>💵</Text>
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>Efectivo</Text>
                    <Text style={styles.paymentMethodSubtitle}>Paga tu arriendo con efectivo</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {/* Accepted Driver Card */}
            {driverDataAcepted && captureDriverData?.status === "ACEPTED" && (
              <View style={styles.containerDriver}>
                {driverDataAcepted.map((driver: any, index: number) => (
                  <View key={driver.id || index} style={styles.mainCard}>
                    {captureDriverData.clientid == authResponse.usuario.phone ?


                      <AcceptedDriverCard
                        driver={driver}
                        captureFinalLocation={captureFinalLocation}
                        pickupAddress={originAddress}
                        tripTipoServicio={captureDriverData?.tipoServicio}
                        serviceInMeters={serviceInMeters}
                        serviceInKilometers={serviceInKilometers}
                        totalServiceInMeters={totalServiceInMeters}
                        totalServiceInKilometers={totalServiceInKilometers}
                        onWayTravel={onWayTravel}
                        onChatPress={() => {
                          clearUnread();
                          navigation.navigate('UserChatScreen');
                        }}
                        getVehicleIcon={getVehicleIcon}
                        unreadChatCount={unreadChatCount}
                      />

                      :
                      null



                    }

                  </View>
                ))}
              </View>
            )}
            {/* Waiting for Driver */}
            {waitDrive ? (
              <View style={{ width: '100%' }}>
                {driverOfffer.length > 0 ? (
                  <View style={{ width: '100%' }}>
                    <Text style={styles.title}>
                      {selectMyTravel === "domicilio" ? "Domiciliarios disponibles" : "Conductores disponibles"}
                    </Text>
                    {driverOfffer.map((item, index) =>
                      selectMyTravel === "domicilio" ? (
                        <DomicilioChatCard
                          key={`${item.id}-${index}`}
                          offer={item}
                          onAccept={() => NewService(item)}
                          onChat={() => {
                            clearUnread();
                            navigation.navigate("UserChatScreen", {
                              preAcceptClientId: authResponse.usuario.phone,
                              preAcceptDriverPhone: item.conductor,
                            });
                          }}
                          onCancel={cancelService}
                          unreadCount={unreadChatCount}
                        />
                      ) : (
                        <DriverOfferCard
                          key={`${item.id}-${index}`}
                          offer={item}
                          onAccept={() => NewService(item)}
                        />
                      )
                    )}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', padding: 60 }}>
                    <Text style={{ color: COLORS.textPrimary, fontSize: 16, marginBottom: 40 }}>
                      {selectMyTravel === "domicilio"
                        ? "Buscando domiciliario..."
                        : "Buscando conductor..."}
                    </Text>
                    {selectMyTravel === "domicilio" && (
                      <Text
                        style={{
                          color: "#FFB800",
                          fontSize: 13,
                          textAlign: "center",
                          marginBottom: 20,
                        }}
                      >
                        El precio sugerido es aproximado. Primero debes hablar con el domiciliario por
                        chat para acordar el costo real.
                      </Text>
                    )}
                    <ActivityIndicator size="large" color="#FFC300" />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                      <View style={{ flex: 1 }}>
                        <RoundedButton
                          text={selectMyTravel === "domicilio" ? "Cancelar Domicilio" : "Cancelar Viaje"}
                          onPress={cancelService}
                          color={COLORS.error}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <View style={styles.slideWrapper}>
                  <Animated.View
                    style={[
                      styles.slideContainer,
                      {
                        transform: [
                          {
                            translateX: slideAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -Dimensions.get('window').width],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {/* Screen Part 1 - Vehicle Selection */}
                    <View style={[styles.screenPart1, { width: Dimensions.get('window').width * 0.95 }]}>
                      <View style={styles.suggestionsContainer}>
                        <View style={{ display: "flex", flexDirection: "column", width: "70%", backgroundColor: COLORS.background, rowGap: 6, justifyContent: 'flex-start' }}>
                          <View style={styles.suggestionsRow}>
                            <TouchableOpacity
                              onPress={() => {
                                setChangeVehicle(!changeVehicle);
                                setSelectMyTravel("carro");
                              }}
                              style={[
                                styles.suggestionItem,
                                selectMyTravel === "carro" && styles.suggestionItemSelected
                              ]}
                            >
                              <View style={styles.suggestionIcon}>
                                {selectMyTravel === "carro" && (
                                  <View style={styles.selectedBadge}>
                                    <Text style={styles.selectedBadgeText}>✓</Text>
                                  </View>
                                )}
                                <Image style={styles.imagenSuggestIconMoto} source={require('../../../../assets/travels_icon.png')} />
                              </View>
                              <Text style={styles.suggestionText}>Carro</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => {
                                setChangeVehicle(!changeVehicle);
                                setSelectMyTravel("moto");
                              }}
                              style={[
                                styles.suggestionItem,
                                selectMyTravel === "moto" && styles.suggestionItemSelected
                              ]}
                            >
                              <View style={styles.suggestionIcon}>
                                {selectMyTravel === "moto" && (
                                  <View style={styles.selectedBadge}>
                                    <Text style={styles.selectedBadgeText}>✓</Text>
                                  </View>
                                )}
                                <Image style={styles.imagenSuggestIconMoto} source={require('../../../../assets/motor_icon.png')} />
                              </View>
                              <Text style={styles.suggestionText}>Moto</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.recentDestinationsInside}>
                            <TouchableOpacity style={styles.recentItem}>
                              <View style={styles.recentIcon}>
                                <Image style={styles.gpsIcon} source={require('../../../../assets/gps_icon.png')} />
                              </View>
                              <View style={styles.recentTextContainer}>
                                <Text style={styles.recentTitle}>
                                  {originAddress ? originAddress.slice(0, 45).split(',')[0] : "Cl. 145 # 11-81"}
                                </Text>
                                <Text style={styles.recentSubtitle}>
                                  {originAddress && originAddress.includes(',')
                                    ? originAddress.split(',').slice(1).join(',').trim()
                                    : "Fusagasugá, Cundinamarca"}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.searchContainer}>
                            <Image style={styles.searchIcon} source={require('../../../../assets/lupa_white_icon.png')} />

                            <TextInput
                              ref={searchInputRef}
                              style={styles.inputToGo}
                              placeholder="¿A dónde vas?"
                              placeholderTextColor="#888888"
                              value={input}
                              onFocus={() => {
                                isTyping.current = true;
                              }}
                              onBlur={() => {
                                isTyping.current = false;
                              }}
                              onChangeText={(text) => {
                                setInput(text);

                                if (searchTimeout.current) {
                                  clearTimeout(searchTimeout.current);
                                }

                                searchTimeout.current = setTimeout(() => {
                                  fetchPlaces(text);
                                }, 700);
                              }}
                            />
                            <TouchableOpacity onPress={() => {
                              setInput("");
                              sessionTokenRef.current = null;
                              if (searchTimeout.current) clearTimeout(searchTimeout.current);
                              setResults([]);
                            }}>
                              <Image
                                style={styles.searchIcon}
                                source={require('../../../../assets/pencil_icon.png')}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            setSelectMyTravel("domicilio");
                            setShowDeliveryModal(true);
                            setChangeVehicle(!changeVehicle);
                          }}
                          style={[
                            styles.suggestionItem,
                            styles.suggestionItemDomi,
                            selectMyTravel === "domicilio" && styles.suggestionItemSelected
                          ]}
                        >
                          <View style={styles.suggestionIconDomi}>
                            {selectMyTravel === "domicilio" && (
                              <View style={styles.selectedBadgeDomi}>
                                <Text style={styles.selectedBadgeText}>✓</Text>
                              </View>
                            )}
                            <Image style={styles.imagenSuggestIconDomi} source={require('../../../../assets/domi_icon.png')} />
                          </View>
                          <Text style={[styles.suggestionText, styles.suggestionTextDomi]}>DOMI</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {/* Screen Part 2 - Price Selection */}
                    <View style={[styles.screenPart2, { width: Dimensions.get('window').width }]}>
                      {driverDataAcepted.length === 0 && (
                        <View>
                          <View style={styles.vehicleContainer}>
                            <View style={styles.vehicleRow}>
                              {selectMyTravel === "moto" && (
                                <TouchableOpacity
                                  onPress={() => WaitService("moto")}
                                  style={styles.vehicleButton}
                                >
                                  <View style={styles.vehicleBox}>
                                    <Image
                                      style={styles.vehicleImage}
                                      source={require('../../../../assets/moto.png')}
                                    />
                                    <Text style={styles.vehicleText}>Moto</Text>
                                    <Text style={styles.vehiclePrice}>{distanceCost}</Text>
                                    <Text style={styles.vehiclePrice}>{timeDistance} min</Text>
                                  </View>
                                </TouchableOpacity>
                              )}
                              {selectMyTravel === "carro" && (
                                <TouchableOpacity
                                  onPress={() => WaitService("carro")}
                                  style={styles.vehicleButton}
                                >
                                  <View style={styles.vehicleBox}>
                                    <Image
                                      style={styles.vehicleImage}
                                      source={require('../../../../assets/car.png')}
                                    />
                                    <Text style={styles.vehicleText}>Carro</Text>
                                    <Text style={styles.vehiclePrice}>{distanceCost}</Text>
                                    <Text style={styles.vehiclePrice}>{timeDistance} min</Text>
                                  </View>
                                </TouchableOpacity>
                              )}
                              {selectMyTravel === "domicilio" && (
                                <TouchableOpacity
                                  onPress={() => WaitService("domicilio")}
                                  style={styles.vehicleButton}
                                >
                                  <View style={styles.vehicleBox}>
                                    <Image
                                      style={styles.vehicleImage}
                                      source={require('../../../../assets/domicilio.png')}
                                    />
                                    <Text style={styles.vehicleText}>Domicilio</Text>
                                    <Text style={styles.vehiclePrice}>{distanceCost}</Text>
                                    <Text style={styles.vehiclePrice}>{timeDistance} min</Text>
                                  </View>
                                </TouchableOpacity>
                              )}
                              <View style={styles.paymentCard}>
                                <View style={[{ display: 'flex', flexDirection: 'row', gap: 10 }, styles.oferCard]}>
                                  <Text style={styles.paymentTitle}>Sugerido:</Text>
                                  <Text style={styles.paymentAmount}>{distanceCost}</Text>
                                </View>
                                <View style={[styles.InputOferContainer, { borderWidth: inputError ? 1 : 0, borderColor: inputError ? 'red' : "" }]}>
                                  <Image style={styles.searchIcon} source={require('../../../../assets/icon_dolar.png')} />
                                  <TextInput
                                    style={styles.inputToGo}
                                    placeholder="Ofrezca su tarifa"
                                    placeholderTextColor="#888888"
                                    keyboardType={'numeric'}
                                    value={formatNumber(clientPrice || offerInput)}
                                    onChangeText={(text) => {
                                      const numbers = text.replace(/\D/g, '');
                                      setClientPrice(numbers);
                                      if (parseInt(numbers) < (parseInt(distanceCost.replace(/\D/g, '')) * 0.89)) {
                                        setInputError(true);
                                      } else {
                                        setInputError(false);
                                      }
                                    }}
                                  />
                                </View>
                                <TouchableOpacity
                                  onPress={() => WaitService(selectMyTravel, clientPrice)}
                                  style={[
                                    {
                                      display: 'flex',
                                      gap: 10,
                                      pointerEvents: inputError || (clientPrice == "") ? "none" : "auto",
                                      backgroundColor: inputError || (clientPrice == "") ? "#ffc40060" : COLORS.primary
                                    },
                                    styles.oferCardButon
                                  ]}
                                >
                                  <Text style={styles.offerTtitle}>
                                    {inputError ? "Esperando..." : "Enviar Oferta"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                          <View style={styles.tripContainer}>
                            <View style={styles.tripColumn}>
                              <View style={styles.tripRow}>
                                <View style={[styles.tripDot, styles.originDot]} />
                                <View style={styles.tripTextContainer}>
                                  <Text style={styles.tripLabel}>Desde</Text>
                                  <Text style={styles.tripAddress} numberOfLines={3}>
                                    {originAddress || "Obteniendo ubicación..."}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <View style={styles.tripColumn}>
                              <View style={styles.tripRow}>
                                <View style={[styles.tripDot, styles.destinationDot]} />
                                <View style={styles.tripTextContainer}>
                                  <Text style={styles.tripLabel} numberOfLines={3}>Hasta</Text>
                                  <Text style={styles.tripAddress}>
                                    {input}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                </View>
              </View>
            )}
              {/* Fixed Bottom Buttons */}
        
          </ScrollView>
        
          {((!waitDrive && routeCoords && driverDataAcepted.length === 0) || openfixmenu) && !isKeyboardVisible && (
            <View style={[styles.fixedButtonContainer, { paddingBottom: Math.max(insets.bottom + 8, Platform.OS === 'android' ? 28 : 16) }]}>
              <TouchableOpacity
                onPress={() => setPaymentWindow(true)}
                style={styles.extra_icons_content}
              >
                <Text style={styles.text_icon}>Mis</Text>
                <Image style={styles.fastButon} source={require('../../../../assets/HandCoins.png')} />
                <Text style={styles.text_icon}>Pagos</Text>
              </TouchableOpacity>
              <View style={styles.fixContainer}>
                {currentSection === 1 ? (
                  <RoundedButtonFlex
                    text={domicilioMapPrimaryLabel()}
                    onPress={
                      selectMyTravel
                        ? comfirmPlace
                        : () => {
                          setErrorMessage("Selecciona Servicio");
                          setShowErrorModal(true);
                        }
                    }
                    color={COLORS.primary}
                  />
                ) : (
                  <>
                    <RoundedButtonFlex
                      text={domicilioMapPrimaryLabel()}
                      onPress={
                        selectMyTravel
                          ? comfirmPlace
                          : () => {
                            setErrorMessage("Selecciona un tipo de servicio");
                            setShowErrorModal(true);
                          }
                      }
                      color={COLORS.primary}
                    />
                    {startTravel && (
                      <RoundedButtonFlex
                        text= {selectMyTravel === "domicilio" ? "Buscar domiciliario" : "Buscar arrendatario"}
                        onPress={
                          selectMyTravel
                            ? () => WaitService(selectMyTravel)
                            : () => {
                              setErrorMessage("Selecciona Servicio");
                              setShowErrorModal(true);
                            }
                        }
                        color={COLORS.primary}
                      />
                    )}
                  </>
                )}
              </View>
              <TouchableOpacity
                style={styles.extra_icons_content}
                onPress={() => setShowOptionsModal(true)}
              >
                {(selectMyTravel === "carro" || selectMyTravel === "moto") && (
                  <>
                    <Text style={styles.text_icon}>Opciones</Text>
                    <Image style={styles.fastButon} source={require('../../../../assets/Gear.png')} />
                    <Text style={styles.text_icon}>Extras</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
      {/* Payment Methods Modal */}
      <PaymentMethodsModal
        visible={paymentWindow}
        onClose={() => setPaymentWindow(false)}
        onSelectMethod={handleSelectPaymentMethod}
        selectedMethod={selectedPaymentMethod}
      />
     

      {/* Map Pin Indicator - SE OCULTA EN VIAJE O AL BUSCAR */}
      {!startTravel && !waitDrive && !onWayTravel && !isKeyboardVisible && results.length === 0 && (
        <Animated.Image
          style={{
            position: 'absolute',
            height: 40,
            width: 40,
            left: '50%',
            marginLeft: -22,
            marginTop: -20,
            zIndex: 10,
            tintColor: '#FFC300',
            transform: [
              {
                translateY: AnimatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    Dimensions.get('window').height * 0.55 / 2 - 25,
                    Dimensions.get('window').height * 0.99 / 2 - 25
                  ]
                })
              }
            ]
          }}
          source={require('../../../../assets/piker.png')}
        />
      )}

      {/* 🎯 LETRERO DE DIRECCIÓN SOBRE EL PIKER */}
      {/* 🎯 LETRERO DE DIRECCIÓN SOBRE EL PIKER */}
      {!isInteractive && input && !startTravel && !waitDrive && !onWayTravel && !isKeyboardVisible && results.length === 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            alignItems: 'center',  // ✅ Esto centra el contenido
            zIndex: 10,
            transform: [
              {
                translateY: AnimatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    Dimensions.get('window').height * 0.55 / 2 - 95,
                    Dimensions.get('window').height * 0.99 / 2 - 95
                  ]
                })
              }
            ]
          }}
        >
          <View style={styles.addressBanner}>
            <View style={styles.addressBannerContent}>
              <Image
                style={styles.addressIcon}
                source={require('../../../../assets/gps_icon.png')}
              />
              <Text style={styles.addressText} numberOfLines={2} ellipsizeMode="tail">
                {input}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Rating Modal */}
      <TripRatingModal
        visible={showRatingModal}
        driverName={rateDriverName}
        driverCelPhone={rateDriverPhone}
        tripId={String(
          finishPayment?.id ??
            (Array.isArray(captureDriverData) ? captureDriverData[0]?.id : captureDriverData?.id) ??
            ""
        )}
        driverPhoto={rateDriverPhoto}
        onClose={() => setShowRatingModal(false)}
        onSubmitRating={handleSubmitRating}
      />

      {/* Payment List — rendered as Modal so it covers all floating elements */}
      <Modal
        visible={takingPayment}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <PaymentMethodsList
          paymentData={capturePaymentData}
          userPhone={authResponse.usuario.phone}
          onPaymentSuccess={HandletotalInvoice}
          driverSelectedMethod={capturePaymentData?.metodo_pago ?? ""}
        />
      </Modal>

      {/* Delivery Modal */}
      <DeliveryModal
        visible={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        onConfirm={handleDeliveryConfirm}
      />

      {/* Trip Options Modal */}
      <TripOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        onConfirm={handleOptionsConfirm}
        typeService={selectMyTravel}
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
    </View>
  );
}
// ============================================
// RADAR OVERLAY COMPONENT
// ============================================
const RadarOverlay = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  return (
    <View style={styles.radarOverlay}>
      <Animated.View
        style={[
          styles.radarCircle,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 0],
            }),
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 2],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  addressBanner: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    width: Dimensions.get('window').width * 0.82,
    maxWidth: Dimensions.get('window').width * 0.9,
    alignSelf: 'center',
  },
  addressBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  addressIcon: {
    width: 14,
    height: 14,
    tintColor: COLORS.primary,
    flexShrink: 0,
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  inputToGoContent: {
    top: 0,
    zIndex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: "black",
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 5,
    elevation: 4,
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 30) + 10,
    left: 10,
    right: 10,
    zIndex: 100,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 0,
  },
  logoText: {
    display: 'none',
  },
  user_button: {
    marginTop: 0,
    position: "relative",
    borderRadius: 40,
    width: 50,
    display: 'flex',
    height: 50,
    zIndex: 10000,
    elevation: 1,
  },
  logo_app: {
    position: "absolute",
    top:  Dimensions.get('window').height > 810 ? Dimensions.get('window').height * 0.45 : Dimensions.get('window').height * 0.44 ,
    left: 8,
    width: 50,
    height: 50,
    borderRadius: 25,
    zIndex: 100,
    elevation: 5
  },
  user_img: {
    borderRadius: 40,
    top: 0,
    left: 0,
    width: 50,
    display: 'flex',
    height: 50,
    zIndex: 10000,
    elevation: 1,
  },
  selectedBadge: {
    position: 'absolute',
    top: -5,
    right: -38,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "black",
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Posición del ✓ cuando DOMI está seleccionado: ajusta `top` / `right` aquí (mismo archivo, StyleSheet). */
  selectedBadgeDomi: {
    position: 'absolute',
    top: -6,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "black",
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  slideWrapper: {
    width: '100%',
    overflow: 'hidden'
  },
  slideContainer: {
    width: '200%',
    flexDirection: 'row',
    alignContent: 'center',
  },
  screenPart1: {
    display: 'flex',
    alignContent: 'center',
    justifyContent: 'center',
    
  },
  screenPart2: {
    display: 'flex',
    alignContent: 'center',
    justifyContent: 'center'
   
  },
  selectedBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: "white",
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
  ratingButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  container: {
    flex: 1,
    backgroundColor: "black"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  suggestionItemSelected: {
    backgroundColor: "#FFCC28",
    borderWidth: 4,
    borderColor: "white",
  },
  mainList: {
    position: 'absolute',
    top: 80,
  },
  input: {
    position: 'absolute',
    top: 20,
    zIndex: 1,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#2E2E2E',
    padding: 10,
    borderRadius: 8,
    elevation: 4,
    color: COLORS.textPrimary,
  },
  buttonsContainer: {
    flexDirection: "column",
    gap: 12,
    marginTop: 10,
    display: "flex",
  },
  labelInputContent: {
    width: '25%',
    alignSelf: 'center',
    backgroundColor: "#333333",
    padding: 8,
    borderRadius: 8,
    fontSize: 14,
    height: 50,
    fontWeight: "500",
    color: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444444",
  },
  titleInputContent: {
    width: '70%',
    height: 50,
    alignSelf: 'center',
    backgroundColor: "#333333",
    padding: 8,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "white",
    justifyContent: "center",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#444444",
  },
  titleInput: {
    color: COLORS.textPrimary,
    fontSize: 14,
    padding: 2,
  },
  labelInput: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  inputUSer: {
    display: 'none',
    zIndex: 1,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: COLORS.backgroundMedium,
    padding: 10,
    borderRadius: 8,
    height: 45,
    elevation: 4,
    color: COLORS.textPrimary,
  },
  scheduleButton: {
    backgroundColor: COLORS.backgroundMedium,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    marginLeft: 8,
  },
  searchContainer: {
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 1,
    marginBottom: 0,
    minHeight: 44,
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  fastButon: {
    width: 30,
    height: 30,
    margin: "auto"
  },
  gpsIcon: {
    width: 30,
    height: 30,
  },
  inputToGo: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    backgroundColor: 'transparent',
    height: 40,
    paddingVertical: 10,
  },
  InputOferContainer: {
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 0,
    marginTop: 6,
  },
  inputOfer: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    marginTop: 1,
    backgroundColor: 'transparent',
  },
  recentDestinations: {
    position: 'absolute',
    top: 170,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    zIndex: 2,
    paddingHorizontal: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    marginBottom: 0,
    marginTop: 4,
    borderRadius: 12,
    padding: 16,
  },
  recentIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recentTextContainer: {
    flex: 1,
  },
  recentTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  recentSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  recentSuggestion: {
    color: COLORS.success,
    fontSize: 12,
    marginTop: 2,
  },
  oferInput: {
    display: 'none',
    width: '90%',
    alignSelf: 'center',
    backgroundColor: COLORS.backgroundMedium,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444444',
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  resultsList: {
    position: 'absolute',
    zIndex: 9999,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.backgroundLight,
    maxHeight: 320,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
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
  map: {
    flex: 1,
  },
  piker: {
    position: 'absolute',
    height: 50,
    width: 50,
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -50,
    zIndex: 10,
  },
  blackbuton: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.background,
    elevation: 8,
    paddingHorizontal: '3%',
    marginTop: '0%',
    marginBottom: 0,
    bottom: 0,
    paddingTop: 1
  },
  tripColumn: {
    flex: 1,
  },
  tripRow: {
    width: "100%",
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  originDot: {
    backgroundColor: COLORS.success,
  },
  destinationDot: {
    backgroundColor: COLORS.error,
  },
  tripTextContainer: {
    flex: 1,
    marginRight: 2
  },
  tripLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  tripAddress: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleButton: {
    alignItems: "flex-start",
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
    minWidth: 80,
    width: 110,
    marginRight: "auto",
  },
  vehicleBox: {
    alignItems: "center",
    display: "flex",
  },
  vehicleButtonActive: {
    backgroundColor: COLORS.backgroundMedium,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  vehicleImage: {
    width: 80,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  vehicleText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  vehiclePrice: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
    marginBottom: 8,
    marginLeft: 0,
  },
  offerTtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
    textAlign: "center",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
    marginBottom: 16,
  },
  paymentButton: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  paymentButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestionsTitle: {
    color: COLORS.primaryLight,
    fontSize: 16,
  },
  seeAllText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  suggestionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestionItem: {
    alignItems: 'center',
    backgroundColor: "#FFCC28",
    borderRadius: 12,
    justifyContent: 'center',
    padding: 8,
    flex: 1,
    display: "flex",
    marginHorizontal: 4,
  },
  /** DOMI: misma fila que Carro/Moto pero botón alto; el contenido arranca arriba (como el diseño original). */
  suggestionItemDomi: {
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    paddingTop: 8,
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    marginBottom: 8,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  /** Contenedor más alto que Carro/Moto: el ícono DOMI es 60×60; el de 30×30 recortaba la imagen. */
  suggestionIconDomi: {
    width: 68,
    minHeight: 125,
    paddingTop: 57,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imagenSuggestIcon: {
    width: 40,
    height: 40,
  },
  imagenSuggestIconDomi: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  imagenSuggestIconMoto: {
    width: 45,
    height: 40,
  },
  suggestionText: {
    color: "black",
    fontSize: 16,
    fontWeight: "700",
    textAlign: 'center',
  },
  /** Solo DOMI: sube el texto ~0,5 cm hacia el ícono (ícono arriba, palabra debajo). */
  suggestionTextDomi: {
    marginTop: -19,
  },
  infoContainer: {
    paddingRight: 12,
  },
  driverText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  offerText: {
    color: COLORS.primary,
    fontSize: 14,
    marginBottom: 2,
  },
  buttonContainer: {
    flex: 0.3,
    alignItems: 'flex-end',
  },
  recentDestinationsInside: {
    width: '100%',
    marginBottom: 0,
  },
  fixContainer: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
    backgroundColor: COLORS.background,
    display: "flex",
    width: "70%",
    flexDirection: "column",
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundMedium,
  },
  fixedButtonContainer: {
    alignItems: "center",
    justifyContent: "space-between",
    left: 0,
    gap: 5,
    right: 0,
    zIndex: 10,
    elevation: 14,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 10,
    display: "flex",
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: 12,
    borderTopColor: COLORS.backgroundMedium,
  },
  text_icon: {
    color: "white",
    fontSize: 10,
    textAlign: "center"
  },
  extra_icons_content: {
    width: 50,
    gap: 5,
    justifyContent: 'center',
    flexDirection: "column",
    display: "flex",
    alignContent: "center",
    textAlign: "center"
  },
  paymentCard: {
    width: '65%',
    marginRight: "auto",
    marginTop: 0,
    marginBottom: 5,
  },
  oferCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingRight: 20,
    paddingLeft: 15,
    paddingTop: 5,
    height: 40,
    paddingBottom: 0,
  },
  oferCardButon: {
    borderRadius: 8,
    paddingRight: 20,
    paddingLeft: 15,
    paddingTop: 5,
    height: 40,
    paddingBottom: 0,
    marginTop: 10,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.background,
    width: '100%',
    marginTop: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: 'stretch',
  },
  vehicleContainer: {
    marginTop: 0,
    width: '100%',
    marginBottom: 10,
    paddingHorizontal: '1%',
    paddingLeft: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  tripContainer: {
    width: '90%',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'row',
    padding: 16,
    marginLeft: 25,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: COLORS.backgroundLight,
    padding: 0,
    marginBottom: 0,
    borderRadius: 0,
  },
  driverOfferCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  driverLabel: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.success + '20',
  },
  statusText: {
    fontSize: 12,
    color: COLORS.success,
  },
  offerDetails: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.backgroundMedium,
    padding: 12,
    borderRadius: 12,
  },
  destinationText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  actionSection: {
    marginTop: 8,
  },
  acceptOfferButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptOfferText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  searchingContainer: {
    width: '100%',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  searchingContent: {
    alignItems: 'center',
  },
  pulseContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulse: {
    position: 'absolute',
    borderRadius: 60,
    backgroundColor: COLORS.primary,
  },
  pulseOuter: {
    width: 120,
    height: 120,
    opacity: 0.2,
  },
  pulseMiddle: {
    width: 90,
    height: 90,
    opacity: 0.3,
  },
  pulseInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingIcon: {
    fontSize: 28,
  },
  searchingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  searchingSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  activityIndicator: {
    marginTop: 8,
  },
  mainCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  driverSection: {
    marginBottom: 16,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  driverImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  driverImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.backgroundMedium,
  },
  driverImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverImagePlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.backgroundLight,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  driverDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  vehicleIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  plateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  plateBox: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  plateText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  contactButtons: {
    gap: 8,
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonIcon: {
    fontSize: 20,
  },
  fareSection: {
    marginTop: 16,
  },
  fareDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareItem: {
    flex: 1,
  },
  fareLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  fareValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fareLabelSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  fareValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'right',
    textDecorationLine: 'line-through',
  },
  tripSection: {
    marginTop: 8,
  },
  tripDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    marginTop: 6,
    marginRight: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  etaContainer: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  etaContent: {
    alignItems: 'center',
  },
  etaTime: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  etaLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionButtons: {
    marginTop: 20,
  },
  chatButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  containerDriver: {
    marginTop: 0,
    marginBottom: 12,
  },
  logo_google_img: {
    width: 100,
    height: 100,
    top: 320,
    left: -30,
    position: "absolute"
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
  }
});
