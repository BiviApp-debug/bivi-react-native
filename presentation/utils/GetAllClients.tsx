import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator, Animated, Modal } from 'react-native';
import { API_BASE_URL } from '../API/API';
import RoundedButton from '../components/RoundedButton';
import { postDriverLocalLocation, postDriverLocation } from './postDriverLocation';
import { TravelPoliCy } from './travelStatus';
import { handleCreateOffers, HandleDeleteOffers } from './HandleOffers';
import EditButon from '../components/EditButon';
import * as Location from 'expo-location';
import { LocationSubscription } from 'expo-location';
import COLORS from './colors';
import { HandleCreateactiveTravels, HandleDeleteActiveTravels } from './HandleActiveTravels';
import { handleCreateTravelBackUp, HandleDeleteTravels } from './HandleTravel';
import { getDriverPosition } from './getDriverPosition';
import { patchCancelTravel, patchFinishUser, patchNeedPaymentUser, patchOnWayUser, patchPickUpTravelDriver, patchPickUpTravelUser } from './PatchActiveTravel';
import { getActiveTravelsByClient, getActiveTravelsByConductor } from './getActiveTravels';
import { HandleActiveTravelsBackup } from './HandleActiveTravelsBackup';
import { getDeliveryByClient } from './getDeliveryByClient';
import { getRatingByUser, createRating, updateRating } from './HandleRatings';
import formatToCOP from './formatCop';
import { Ionicons } from '@expo/vector-icons';
import { getTravelOptions } from './getTravelOptions';
import WaitingPaymentModal from './Waitingpaymentmodal';
import TravelCard from './TravelCard';
import AcceptedTravelCard from './AcceptedTravelCard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
// 1. IMPORTACIÓN NUEVA
import { useChatNotification } from '../context/ChatNotificationContext';

type RootStackParamList = {
  UserChatScreen: { preAcceptClientId?: string; preAcceptDriverPhone?: string } | undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GetAllClientsProps {
  userData: any;
  updateLocation: any;
  onCancelTravel: () => void;
  socket: any;
  cachedDriverCoordsRef?: React.MutableRefObject<any>;
  /** Fase del viaje para el mapa del conductor: recogida vs ruta al destino (estilo InDrive). */
  onTripStageChange?: (stage: "pickup" | "destination") => void;
}

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

const haversineDistance = (origin: any, destination: any) => {
  const R = 6371000;
  const lat1 = origin.latitude * Math.PI / 180;
  const lat2 = destination.latitude * Math.PI / 180;
  const dLat = (destination.latitude - origin.latitude) * Math.PI / 180;
  const dLon = (destination.longitude - origin.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = R * c;
  // 25 km/h promedio en ciudad = 6.94 m/s
  return {
    distanceMeters,
    duration: `${Math.round(distanceMeters / 6.94)}s`,
    status: 'OK',
    condition: 'ROUTE_EXISTS',
  };
};

export default function GetAllClients({ userData, updateLocation, onCancelTravel, socket, cachedDriverCoordsRef, onTripStageChange }: GetAllClientsProps) {
  const navigation = useNavigation<NavigationProp>();
  
  // 2. HOOK DE NOTIFICACIONES NUEVO
  const { unreadCount: unreadChatCount, incrementUnread, playNotificationSound } = useChatNotification();

  // Estados principales (Del código antiguo)
  const [travels, setTravels] = useState<any>([]);
  const [ActiveTravels, setActiveTravels] = useState<any>([]);
  const [processedTravels, setProcessedTravels] = useState<any>([]);
  const [aceptedTravels, setAceptedTravels] = useState<any>([]);
  const [driverPosition, setDriverPosition] = useState<any>(null);
  const [changeOffer, setChangeOffer] = useState<string>("");
  const [travelPrice, setTravelPrice] = useState<string>("");
  const [editOffer, setEditOffer] = useState<number | null>(null);
  const [distanceTracking, setDistanceTraking] = useState<any>({});
  const [catchData, setCatchData] = useState({});
  const [serviceInMeters, setServiceInMeters] = useState(0);
  const [serviceInKilometers, setServiceInKilometers] = useState(0);

  const [startPickupPoint, SetStartPickupPoint] = useState<boolean>(false);
  const [takeTravel, setTakeTravel] = useState<boolean>(false);
  const [onWayTravel, setOnwayTravel] = useState(false);
  const [takingPayment, setTakingPayment] = useState(false);
  const [resetWindow, setResetWindow] = useState(false);

  const [confirmedOffers, setConfirmedOffers] = useState<any>("");
  const [ignoredTravelIds, setIgnoredTravelIds] = useState<Set<string>>(new Set());

  const [deliveryDataMap, setDeliveryDataMap] = useState<{ [key: string]: any }>({});
  const [travelOptionsMap, setTravelOptionsMap] = useState<any>({});
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [catchPayment, setCatchPayment] = useState("");
  const [catchClientName, setCathcClientName] = useState("");
  const [finishButton, setFinishButton] = useState(false)
  const [showchatDrive, setShowchatDrive] = useState(false)

  const finishButtonRef = useRef(finishButton);
  finishButtonRef.current = finishButton;
  const activeTravelRowRef = useRef<any>(null);
  activeTravelRowRef.current = ActiveTravels?.[0] ?? null;

  /** Misma regla que DriverSearchMap / AcceptedTravelCard: PICKUP = ir a recoger; ONWAY = ir al destino. */
  useEffect(() => {
    if (!ActiveTravels?.length) return;
    const status = String(ActiveTravels[0]?.status ?? "").toUpperCase().trim();
    const stage: "pickup" | "destination" =
      status === "ONWAY" || status === "NEEDTOPAY" || status === "FINISH"
        ? "destination"
        : "pickup";
    onTripStageChange?.(stage);
  }, [ActiveTravels, onTripStageChange]);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [pendingFinishPhone, setPendingFinishPhone] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("efectivo");

  // Rating del cliente después del viaje
  const [showClientRating, setShowClientRating] = useState(false);
  const [clientToRate, setClientToRate] = useState<string | null>(null);
  const [clientRatingStars, setClientRatingStars] = useState(0);
  
  const [isLoadingTravels, setIsLoadingTravels] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chattingDomicilio, setChattingDomicilio] = useState<any>(null);
  const [domicilioOfferPrice, setDomicilioOfferPrice] = useState<string>("");

  let locationSubscription: LocationSubscription | null = null;

  // ... (Toda tu lógica de getDistanceFromCoords, startWatchingLocation, etc. se mantiene igual)
  const getDistanceFromCoords = useCallback(async (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

    setServiceInMeters(distanceMeters);
    setServiceInKilometers(distanceKm);

    console.log("Distancias___6", distanceKm, distanceMeters);
    return [{ "meters": distanceMeters, "kilometers": distanceKm }];
  }, []);

  const startWatchingLocation = useCallback(async () => {
    if (!ActiveTravels || ActiveTravels.length === 0) return;

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      async (location) => {
        postDriverLocation(userData.usuario.phone);
        setDistanceTraking(location);

        const driverLat = location?.coords?.latitude;
        const driverLong = location?.coords?.longitude;
        const trip = activeTravelRowRef.current;
        if (!trip) return;
        const rawPickup = trip.datosRecogida ?? trip.ubicacionCliente;
        const rawDest = trip.ubicacionDestino;
        const chosen = finishButtonRef.current ? rawDest : rawPickup;
        const clienteCoords =
          typeof chosen === "string" ? JSON.parse(chosen || "{}") : chosen;

        const clientLat = clienteCoords.latitude;
        const clientLon = clienteCoords.longitude;

        const calculateDistance = await getDistanceFromCoords(clientLat, clientLon, driverLat, driverLong);
        if (calculateDistance) {
          SetStartPickupPoint(false);
        }
      }
    );
  }, [ActiveTravels, userData.usuario.phone, getDistanceFromCoords]);

  const loadDeliveryData = useCallback(async (clientIds: string[]) => {
    if (clientIds.length === 0) return;

    try {
      const deliveryPromises = clientIds.map(async (clientId) => {
        const result = await getDeliveryByClient(clientId);
        return { clientId, data: result?.data || null };
      });

      const results = await Promise.all(deliveryPromises);
      const deliveryMap: { [key: string]: any } = {};

      results.forEach(({ clientId, data }) => {
        deliveryMap[clientId] = data;
      });

      setDeliveryDataMap(deliveryMap);
    } catch (error) {
      console.error("Error loading delivery data:", error);
    }
  }, []);

  const loadTravelOptions = useCallback(async (clientIds: string[]) => {
    if (clientIds.length === 0) return;

    try {
      const travelPromises = clientIds.map(async (clientId) => {
        const result = await getTravelOptions(clientId);
        console.log(result, "holas_datas_integer");

        return { clientId, data: result || null };
      });

      const results = await Promise.all(travelPromises);
      const travelMap: { [key: string]: any } = {};

      results.forEach(({ clientId, data }) => {
        if (data) {
          travelMap[clientId] = data;
        }
      });

      console.log("🚗 Travel Options Map creado:", travelMap);
      setTravelOptionsMap(travelMap);
    } catch (error) {
      console.error("Error loading travel options:", error);
    }
  }, []);

  useEffect(() => {
    if (!socket) {
      console.error('❌ Socket no recibido en GetAllClients');
      return;
    }

    console.log('🔌 Socket ID en GetAllClients:', socket.id);
    console.log('🔌 Socket conectado en GetAllClients:', socket.connected);

    const syncCurrentActiveTravel = async () => {
      try {
        const response: any = await getActiveTravelsByConductor(userData.usuario.phone);
        const active = Array.isArray(response?.data) ? response.data : [];

        if (active.length === 0) {
          setActiveTravels([]);
          setOnwayTravel(false);
          SetStartPickupPoint(false);
          setFinishButton(false);
          return;
        }

        const current = active[0];
        const currentStatus = String(current?.status || "").toUpperCase();
        setActiveTravels([current]);

        if (currentStatus === "ACEPTED") {
          SetStartPickupPoint(true);
          setOnwayTravel(false);
          setFinishButton(false);
        } else if (currentStatus === "PICKUP" || currentStatus === "ONWAY") {
          SetStartPickupPoint(false);
          setOnwayTravel(true);
          setFinishButton(currentStatus === "ONWAY");
        } else if (currentStatus === "NEEDTOPAY" || currentStatus === "FINISH") {
          SetStartPickupPoint(false);
          setOnwayTravel(false);
          setFinishButton(true);
        }
      } catch (error) {
        console.error("Error sincronizando viaje activo al reabrir:", error);
      }
    };

    const fetchInitialTravels = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/travels`);
        const data = await res.json();
        setTravels(data);
        console.log("✅ Viajes iniciales cargados:", data);
        await syncCurrentActiveTravel();
      } catch (err) {
        console.error("❌ Error fetching travels:", err);
      }
    };

    const handleNewActiveTravels = (newOffer: any) => {
      console.log('🚀 new_active_travels recibido en GetAllClients:', newOffer);
      setActiveTravels([newOffer]);
      SetStartPickupPoint(true);
      setOnwayTravel(false);
      setFinishButton(false);
    };

    const handleTravelDeleted = ({ clientid }: any) => {
      console.log('🗑️ travel_deleted recibido:', clientid);
      setTravels((prev: any) => prev.filter((t: any) => t.clientid !== clientid));
    };

    const handleNewTravel = (newTravel: any) => {
      console.log("📨 new_travel recibido en GetAllClients:", newTravel);
      console.log("🚗 Tipo de vehículo del conductor:", userData.usuario.vehicleType);
      console.log("🚗 Tipo de servicio del viaje:", newTravel?.tipoServicio);

      if (userData.usuario.vehicleType !== newTravel?.tipoServicio && newTravel?.tipoServicio !== "domicilio") {
        console.log("❌ Tipo de servicio no coincide - viaje ignorado en GetAllClients");
        return;
      }

      console.log("✅ Viaje válido - agregando a la lista");
      
      setTakeTravel(false);
      SetStartPickupPoint(false);
      setTravels((prev: any) => {
        const exists = prev.some((t: any) => t.clientid === newTravel.clientid);
        if (exists) {
          console.log("⚠️ Viaje duplicado, no se agrega");
          return prev;
        }
        console.log("✅ Viaje agregado a la lista");
        return [newTravel, ...prev];
      });
    };

    const handleTravelPickup = () => {
      console.log(`📍 travel_pickup recibido para ${userData.usuario.phone}`);
      SetStartPickupPoint(false);
      setOnwayTravel(true);
    };

    const handleTravelWay = () => {
      console.log(`🛣️ travel_way recibido para ${userData.usuario.phone}`);
      SetStartPickupPoint(false);
      setOnwayTravel(true);
    };

    const handleTravelPayment = () => {
      console.log(`💰 travel_payment recibido para ${userData.usuario.phone}`);
      setIsWaiting(true);
      setAceptedTravels([]);
      SetStartPickupPoint(false);
      setOnwayTravel(false);
    };

    fetchInitialTravels();

    socket.on('new_active_travels', handleNewActiveTravels);
    socket.on('travel_deleted', handleTravelDeleted);
    socket.on('new_travel', handleNewTravel);
    socket.on(`travel_pickup${userData.usuario.phone}`, handleTravelPickup);
    socket.on(`travel_way${userData.usuario.phone}`, handleTravelWay);
    socket.on(`travel_payment${userData.usuario.phone}`, handleTravelPayment);

    return () => {
      console.log('🧹 Limpiando listeners de GetAllClients');
      socket.off('new_active_travels', handleNewActiveTravels);
      socket.off('travel_deleted', handleTravelDeleted);
      socket.off('new_travel', handleNewTravel);
      socket.off(`travel_pickup${userData.usuario.phone}`, handleTravelPickup);
      socket.off(`travel_way${userData.usuario.phone}`, handleTravelWay);
      socket.off(`travel_payment${userData.usuario.phone}`, handleTravelPayment);
    };
  }, [socket, userData.usuario.phone, userData.usuario.vehicleType]);

  // 3. LOGICA NUEVA: LISTENER PARA CHAT (Solo cuando hay un viaje activo)
  useEffect(() => {
    if (!socket || !showchatDrive || !ActiveTravels?.length) return;
    
    // Obtenemos los IDs necesarios para armar el canal
    const clientId = ActiveTravels[0]?.clientid;
    const driverPhone = userData?.usuario?.phone;
    
    if (!clientId || !driverPhone) return;
    
    // Canal específico de chat
    const channel = `chat_message${clientId}_${driverPhone}`;
    
    const handler = (msg: any) => {
      // Si el mensaje viene del usuario, notificamos
      if (msg?.sender === 'user') {
        incrementUnread();
        playNotificationSound();
      }
    };
    
    socket.on(channel, handler);
    return () => { socket.off(channel, handler); };
  }, [socket, showchatDrive, ActiveTravels, userData?.usuario?.phone, incrementUnread, playNotificationSound]);

  useEffect(() => {
    if (!socket || !chattingDomicilio) return;
    const clientId = chattingDomicilio.clientid;
    const driverPhone = userData?.usuario?.phone;
    if (!clientId || !driverPhone) return;
    const channel = `chat_message${clientId}_${driverPhone}`;
    const handler = (msg: any) => {
      if (msg?.sender === "user") {
        incrementUnread();
        playNotificationSound();
      }
    };
    socket.on(channel, handler);
    return () => { socket.off(channel, handler); };
  }, [socket, chattingDomicilio, userData?.usuario?.phone, incrementUnread, playNotificationSound]);

  useEffect(() => {
    
    const processTravels = async () => {
      if (!travels || travels.length === 0) {
        setProcessedTravels([]);
        return;
      }

      setIsLoadingTravels(true);

      try {
        // Usar cache GPS instantáneo si está disponible, evita HTTP call de ~2-5s
        const ubicacion_conductor =
          cachedDriverCoordsRef?.current ||
          driverPosition ||
          await postDriverLocalLocation(userData.usuario.phone);

        if (!ubicacion_conductor) {
          setIsLoadingTravels(false);
          return;
        }

        setDriverPosition(ubicacion_conductor);

        const relevantTravels = travels.filter((item: any) =>
          (item.tipoServicio === userData.usuario.vehicleType || item.tipoServicio === "domicilio") &&
          (item.status === "CREATED" || item.status === "ON_WAIT")
        );

        if (relevantTravels.length === 0) {
          setProcessedTravels([]);
          setIsLoadingTravels(false);
          return;
        }

        const results = await Promise.allSettled(
          relevantTravels.map(async (item: any) => {
            try {
              const distanciaUsuario = haversineDistance(
                ubicacion_conductor, JSON.parse(item.datosRecogida)
              );
              const distanciaDestino = haversineDistance(
                ubicacion_conductor, JSON.parse(item.ubicacionDestino)
              );

              // Fetch client profile photo and rating in parallel
              const [clientPhotoRes, clientRatingData] = await Promise.allSettled([
                fetch(`${API_BASE_URL}/api/client-profile-photo/${item.clientid}`).then(r => r.ok ? r.json() : null),
                getRatingByUser(item.clientid),
              ]);

              const clientPhoto =
                clientPhotoRes.status === 'fulfilled' && clientPhotoRes.value?.data?.profilePhoto
                  ? clientPhotoRes.value.data.profilePhoto
                  : null;

              const clientRating =
                clientRatingData.status === 'fulfilled' && clientRatingData.value?.rating
                  ? parseFloat(clientRatingData.value.rating)
                  : null;

              return { ...item, distanciaUsuario, distanciaDestino, clientPhoto, clientRating };
            } catch (error) {
              console.error(`Error processing travel ${item.clientid}:`, error);
              return null;
            }
          })
        );

        const successfulResults = results
          .filter((result): result is PromiseFulfilledResult<any> =>
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);

        const uniqueResults = Array.from(
          new Map(successfulResults.map((item: any) => [item.clientid, item])).values()
        );

        setProcessedTravels(uniqueResults);
        setTakeTravel(false);

      } catch (error) {
        console.error("Error in processTravels:", error);
      } finally {
        setIsLoadingTravels(false);
      }
    };

    processTravels();
  }, [travels, userData.usuario.vehicleType, userData.usuario.phone]);

  useEffect(() => {
    const processActiveTravels = async () => {
      if (!ActiveTravels || ActiveTravels.length === 0) {
        setAceptedTravels([]);
        return;
      }

      try {
        const ubicacion_conductor =
          cachedDriverCoordsRef?.current ||
          driverPosition ||
          await postDriverLocation(userData.usuario.phone);

        if (!ubicacion_conductor) return;

        setDriverPosition(ubicacion_conductor);

        const results = await Promise.allSettled(
          ActiveTravels.map(async (item: any) => {
            if (
              (item.tipoServicio === userData.usuario.vehicleType || item.tipoServicio === "domicilio") &&
              item.status === "ACEPTED"
            ) {
              const distanciaUsuario = haversineDistance(
                ubicacion_conductor, JSON.parse(item.datosRecogida)
              );
              const distanciaDestino = haversineDistance(
                ubicacion_conductor, JSON.parse(item.ubicacionDestino)
              );

              return { ...item, distanciaUsuario, distanciaDestino };
            }
            return null;
          })
        );

        const response = results
          .filter((result): result is PromiseFulfilledResult<any> =>
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);

        setAceptedTravels(response);
      } catch (error) {
        console.error("Error processing active travels:", error);
      }
    };

    processActiveTravels();
  }, [ActiveTravels, userData.usuario.vehicleType, userData.usuario.phone]);

  useEffect(() => {
    if (resetWindow) {
      console.log(resetWindow, "estados_isWaiting_efectivo_2");
      onCancelTravel();
    }
  }, [resetWindow]);

  useEffect(() => {
    if (aceptedTravels.length > 0 && chattingDomicilio && !takingPayment) {
      console.log("Domicilio aceptado - limpiando estados de negociacion");
      setChattingDomicilio(null);
      setDomicilioOfferPrice("");
      setTakeTravel(false);
    }
  }, [aceptedTravels, takingPayment, chattingDomicilio]);

  const WaitService = useCallback(async (item: any, status = "Nuevo", overrideOffer?: string) => {
    setIsProcessing(true);
    await HandleDeleteOffers(item?.clientid);
    await HandleDeleteTravels(item?.clientid);

    const offerToSend = overrideOffer ?? changeOffer;

    if (item?.clientid) {
      try {
        await handleCreateOffers(
          item?.clientid,
          item?.ubicacionCliente,
          JSON.stringify(driverPosition),
          item?.ubicacionDestino,
          item?.tipoServicio,
          item?.user,
          status,
          item?.tarifa,
          item?.oferta,
          offerToSend,
          userData.usuario.phone,
          item?.datosViaje
        );
        setTakeTravel(true);
        setShowchatDrive(true);
      } catch (error) {
        console.error("Error in WaitService:", error);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setIsProcessing(false);
    }
  }, [driverPosition, changeOffer, userData.usuario.phone]);

  const NewService = useCallback(async (item: any, status = "ACEPTED") => {
    setCatchData(item)

    setIsProcessing(true);

    try {
      const [deleteTravelsOffers, deleteTravelsTable, deleteActiveTravels] = await Promise.all([
        HandleDeleteOffers(item?.clientid),
        HandleDeleteTravels(item?.clientid),
        HandleDeleteActiveTravels(item?.clientid)
      ]);

      if (deleteTravelsOffers && deleteTravelsTable && deleteActiveTravels) {
        const [waitTravel] = await Promise.all([
          HandleCreateactiveTravels(
            item?.clientid,
            item?.ubicacionCliente,
            JSON.stringify(driverPosition),
            item?.ubicacionDestino,
            item?.tipoServicio,
            item?.user,
            status,
            item?.tarifa,
            item?.oferta,
            item?.datosViaje,
            changeOffer,
            userData.usuario.phone
          ),
          HandleActiveTravelsBackup(
            item?.clientid,
            item?.ubicacionCliente,
            JSON.stringify(driverPosition),
            item?.ubicacionDestino,
            item?.tipoServicio,
            item?.user,
            status,
            item?.tarifa,
            item?.oferta,
            item?.datosViaje,
            changeOffer,
            userData.usuario.phone
          ).catch(err => console.error("Backup error:", err))
        ]);

        if (waitTravel) {
          SetStartPickupPoint(true);
          setTakeTravel(false);
          setFinishButton(false);
          setCathcClientName(item?.clientid);
          setCatchPayment(item.contraoferta != "" ? item.contraoferta : item.oferta != "" ? item.oferta : item?.tarifa);
        }
        setShowchatDrive(true)
      }
    } catch (error) {
      console.error("Error in NewService:", error);
      alert("Error al tomar el viaje. Por favor intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  }, [driverPosition, changeOffer, userData.usuario.phone]);

  const cancelService = useCallback(async () => {
    try {
      let candelPath = await patchCancelTravel(userData?.usuario?.phone);
      if (onCancelTravel && candelPath) {
        onCancelTravel();
      }
    } catch (error) {
      console.error("Error canceling service:", error);
    }
  }, [userData?.usuario?.phone, onCancelTravel]);

  const getServiceIcon = useCallback((serviceType: string) => {
    switch (serviceType) {
      case 'moto': return '🏍️';
      case 'auto': return '🚗';
      case 'domicilio': return '📦';
      default: return '🚕';
    }
  }, []);

  const pickUpHandle = useCallback(async (clientPhone: string) => {
    try {
      const pickUpResponse = await patchPickUpTravelDriver(clientPhone);
      console.log(pickUpResponse, "status_pick_up");
      if (pickUpResponse) {
        startWatchingLocation();
      }
    } catch (error) {
      console.error("Error in pickUpHandle:", error);
    }
  }, [startWatchingLocation]);

  const finishTravel = async (clientPhone: string) => {
    // Show payment method picker before confirming end of trip
    setPendingFinishPhone(clientPhone);
    setShowPaymentPicker(true);
  };

  const confirmFinishTravel = async (clientPhone: string, metodo_pago?: string) => {
    try {
      const verifyResponse = await getActiveTravelsByClient(clientPhone);
      const tripData = verifyResponse?.data?.[0];
      const currentStatus = String(tripData?.status ?? "").toUpperCase().trim();

      let latestRow = tripData;

      if (currentStatus === "ONWAY") {
        await patchNeedPaymentUser(clientPhone, metodo_pago);
        const refetch = await getActiveTravelsByClient(clientPhone);
        latestRow = refetch?.data?.[0] || tripData;
        setCathcClientName(latestRow?.clientid ?? tripData?.clientid ?? clientPhone);
        setCatchPayment(
          latestRow?.contraoferta || latestRow?.oferta || latestRow?.tarifa ||
          tripData?.contraoferta || tripData?.oferta || tripData?.tarifa || ""
        );
      } else {
        setCathcClientName(tripData?.clientid ?? clientPhone);
        setCatchPayment(
          tripData?.contraoferta || tripData?.oferta || tripData?.tarifa || ""
        );
      }

      // Datos al día para la factura (evita payload incompleto o sin metodo_pago).
      setCatchData((prev: any) => ({
        ...(prev || {}),
        ...(latestRow || {}),
        metodo_pago:
          metodo_pago ??
          (latestRow as any)?.metodo_pago ??
          (tripData as any)?.metodo_pago ??
          prev?.metodo_pago,
      }));

      // Mostrar PRIMERO la calificación del cliente.
      // El WaitingPaymentModal se mostrará solo DESPUÉS de que el conductor califique o omita.
      // Dos Modales simultáneos en Android causa conflictos.
      setClientToRate(clientPhone);
      setClientRatingStars(0);
      setShowClientRating(true);

    } catch (error) {
      console.error("Error en confirmFinishTravel:", error);
    }
  };

  const startFinalTravel = useCallback(async (clientPhone: string) => {
    console.log(clientPhone, "client_phone_estados");

    try {
      const wayUserPhone = await patchOnWayUser(clientPhone);
      if (wayUserPhone) {
        const verifyResponse = await getActiveTravelsByClient(clientPhone);
        const startStatus = String(verifyResponse?.data?.[0]?.status ?? "").toUpperCase().trim();
        console.log(startStatus, "client_phone_estados_10");
        if (startStatus === "ONWAY") {
          console.log("iniciaste recorrido cliente");
          setFinishButton(true)
          setOnwayTravel(false)
        }
      }
    } catch (error) {
      console.error("Error in startFinal_Travels:", error);
    }
  }, []);

  useEffect(() => {
    if (Math.round(serviceInMeters) < 800 && !onWayTravel) {
      console.log("llegaste donde el cliente");
    }

    if (Math.round(serviceInMeters) < 800 && onWayTravel && startPickupPoint) {
      console.log("iniciaste viaje con el cliente");
    }
  }, [serviceInMeters, onWayTravel, startPickupPoint]);

  useEffect(() => {
    if (processedTravels.length === 0) return;

    const domicilioClientIds = processedTravels
      .filter((item: any) => item?.tipoServicio === "domicilio")
      .map((item: any) => item.clientid);

    const carClientIds = processedTravels
      .filter((item: any) => item?.tipoServicio === "carro")
      .map((item: any) => item.clientid);

    const motoClientIds = processedTravels
      .filter((item: any) => item?.tipoServicio === "moto")
      .map((item: any) => item.clientid);

    console.log(processedTravels, "holas_mot2");

    Promise.all([
      domicilioClientIds.length > 0 ? loadDeliveryData(domicilioClientIds) : Promise.resolve(),
      carClientIds.length > 0 ? loadTravelOptions(carClientIds) : Promise.resolve(),
      motoClientIds.length > 0 ? loadTravelOptions(motoClientIds) : Promise.resolve()
    ]).catch(err => console.error("Error loading additional data:", err));

  }, [processedTravels, loadDeliveryData, loadTravelOptions]);

  const closeAllTransaction = async () => {
    const clientPhone = catchClientName || processedTravels[0]?.clientid;
    if (!clientPhone) {
      console.error("closeAllTransaction: No se encontro telefono del cliente");
      setIsWaiting(false);
      setTakingPayment(false);
      setResetWindow(true);
      onCancelTravel();
      return;
    }
    try {
      const finishTransaction = await patchFinishUser(clientPhone);
      if (finishTransaction) {
        setIsWaiting(false);
        setTakingPayment(false);
        setResetWindow(true);
      }
    } catch (_) {
      setTakingPayment(false);
    }
    onCancelTravel();
  };

  if (isLoadingTravels && processedTravels.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <DriverWaitingAnimation />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando viajes disponibles...</Text>
      </View>
    );
  }
  if (isProcessing && !chattingDomicilio) {
    return (
      <View style={styles.loadingContainer}>
        <DriverWaitingAnimation />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Esperando Respuesta...</Text>
      </View>
    );
  }

  const acceptedTravelsFiltered = aceptedTravels.filter(
    (item: any) =>
      item?.distanciaUsuario?.distanceMeters !== undefined &&
      item.distanciaUsuario.distanceMeters < TravelPoliCy.minDistance
  );

  const processedTravelsFiltered = processedTravels.filter(
    (item: any) =>
      item?.distanciaUsuario?.distanceMeters !== undefined &&
      item.distanciaUsuario.distanceMeters < TravelPoliCy.minDistance &&
      !ignoredTravelIds.has(String(item.id))
  );

  const handleRejectTravel = (item: any) => {
    setIgnoredTravelIds((prev) => new Set(prev).add(String(item.id)));
  };
  

  return (
    <>
      <Text style={styles.sectionTitle}>Solicitudes de viaje</Text>
      <View style={styles.container}>
        {/* ✅ Reemplazado FlatList por map() para evitar anidamiento */}
        {processedTravels && !takeTravel && aceptedTravels.length == 0 ? (
          <View>
            {processedTravelsFiltered.map((item: any) => (
              <View key={item.id.toString()}>
                <TravelCard
                  item={item}
                  isEditing={editOffer === item.id}
                  offerValue={confirmedOffers[item.id] || changeOffer || String(item.oferta || item.tarifa)}
                  onEdit={() => {
                    setEditOffer(item.id);
                    setChangeOffer(confirmedOffers[item.id] || String(item.oferta || item.tarifa));
                  }}
                  onChangeOffer={setChangeOffer}
                  onConfirmEdit={() => {
                    if (changeOffer) {
                      setConfirmedOffers(changeOffer);
                    }
                    setEditOffer(null);
                  }}
                  onAccept={NewService}
                  onOffer={(item) => WaitService(item, "ON_WAIT")}
                  onChat={async (offerItem) => {
                    setChattingDomicilio(offerItem);
                    await WaitService(offerItem, "ON_WAIT");
                    navigation.navigate("UserChatScreen", {
                      preAcceptClientId: offerItem.clientid,
                      preAcceptDriverPhone: userData.usuario.phone,
                    });
                  }}
                  onReject={handleRejectTravel}
                  deliveryData={deliveryDataMap[item.clientid]}
                  travelOptions={travelOptionsMap[item.clientid]}
                />
              </View>
            ))}
          </View>
        ) : takeTravel && chattingDomicilio && aceptedTravels.length === 0 ? (
          <View style={styles.negotiationCard}>
            <View style={styles.negotiationHeader}>
              <Text style={styles.negotiationTitle}>Domicilio en negociacion</Text>
              <Text style={styles.negotiationClient}>{chattingDomicilio.user}</Text>
            </View>
            <Text style={styles.negotiationDesc}>
              Acuerda con el cliente que necesita, a donde ir y cuanto costara.
            </Text>

            <TouchableOpacity
              style={styles.negotiationChatBtn}
              onPress={() => {
                navigation.navigate("UserChatScreen", {
                  preAcceptClientId: chattingDomicilio.clientid,
                  preAcceptDriverPhone: userData.usuario.phone,
                });
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="chatbubble" size={18} color="#FFF" />
                {unreadChatCount > 0 && (
                  <View style={[styles.chatBadge, { marginLeft: 8 }]}>
                    <Text style={styles.chatBadgeText}>
                      {unreadChatCount > 99 ? "99+" : unreadChatCount}
                    </Text>
                  </View>
                )}
                <Text style={styles.negotiationChatBtnText}>  Continuar chat</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.negotiationPriceLabel}>Precio del domicilio:</Text>
            <TextInput
              style={styles.negotiationPriceInput}
              placeholder="Ej: 15000"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={domicilioOfferPrice}
              onChangeText={setDomicilioOfferPrice}
            />
            {domicilioOfferPrice !== "" && (
              <Text style={styles.negotiationPricePreview}>
                ${Number(domicilioOfferPrice).toLocaleString("es-CO")}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.negotiationAcceptBtn, !domicilioOfferPrice && { opacity: 0.5 }]}
              disabled={!domicilioOfferPrice}
              onPress={async () => {
                setChangeOffer(domicilioOfferPrice);
                await WaitService(chattingDomicilio, "ON_WAIT", domicilioOfferPrice);
              }}
            >
              <Text style={styles.negotiationAcceptBtnText}>Enviar precio al cliente</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.negotiationRejectBtn}
              onPress={async () => {
                await HandleDeleteOffers(chattingDomicilio?.clientid);
                setChattingDomicilio(null);
                setDomicilioOfferPrice("");
                setTakeTravel(false);
                setShowchatDrive(false);
                setChangeOffer("");
              }}
            >
              <Text style={styles.negotiationRejectBtnText}>No tomo el domicilio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View />
        )}

        {/* ✅ Reemplazado FlatList por map() */}
        {aceptedTravels && aceptedTravels.length > 0 && (
          <>
            {acceptedTravelsFiltered.map((item) => (
              <AcceptedTravelCard
                key={item.id.toString()}
                item={item}
                getServiceIcon={getServiceIcon}
                startPickupPoint={startPickupPoint}
                onWayTravel={onWayTravel}
                cancelService={cancelService}
                pickUpHandle={pickUpHandle}
                startFinalTravel={startFinalTravel}
                finishButton={finishButton}
                onFinishTravel={finishTravel}
              />
            ))}

            {showchatDrive && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() => navigation.navigate('UserChatScreen')}
                >
                  {/* 4. UI ACTUALIZADA: Botón con Badge de notificaciones */}
                  <View style={styles.chatIconWrapper}>
                    <Ionicons name="chatbubble" size={20} color="#000" />
                    {unreadChatCount > 0 && (
                      <View style={styles.chatBadge}>
                        <Text style={styles.chatBadgeText}>
                          {unreadChatCount > 99 ? '99+' : unreadChatCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.messageButtonText}>Envía un mensaje</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => navigation.navigate('UserChatScreen')}
                >
                  <Ionicons name="call" size={22} color="#000" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {takingPayment && (
          <WaitingPaymentModal
            visible={takingPayment}
            onClose={() => {
              closeAllTransaction()
            }}
            myData={catchData}
            clientName={catchClientName}
            amount={catchPayment}
            showCloseButton={true}
          />
        )}

        {/* ── Driver payment method picker ── */}
        {showPaymentPicker && pendingFinishPhone && (
          <DriverPaymentPicker
            clientPhone={pendingFinishPhone}
            selectedMethod={selectedPaymentMethod}
            onSelectMethod={setSelectedPaymentMethod}
            onConfirm={async () => {
              setShowPaymentPicker(false);
              await confirmFinishTravel(pendingFinishPhone, selectedPaymentMethod);
              setPendingFinishPhone(null);
            }}
            onCancel={() => {
              setShowPaymentPicker(false);
              setPendingFinishPhone(null);
            }}
          />
        )}

        {/* ── Rating del cliente por el conductor ── */}
        <Modal
          visible={showClientRating}
          transparent
          animationType="fade"
          onRequestClose={() => setShowClientRating(false)}
        >
          <View style={clientRatingStyles.overlay}>
            <View style={clientRatingStyles.box}>
              <Text style={clientRatingStyles.title}>⭐ Calificar cliente</Text>
              <Text style={clientRatingStyles.sub}>¿Cómo fue la experiencia con este cliente?</Text>
              <View style={clientRatingStyles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setClientRatingStars(star)}
                    style={{ padding: 6 }}
                  >
                    <Text style={[
                      clientRatingStyles.star,
                      { color: star <= clientRatingStars ? '#FFCC28' : '#444' }
                    ]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[clientRatingStyles.btn, clientRatingStars === 0 && { opacity: 0.4 }]}
                disabled={clientRatingStars === 0}
                onPress={async () => {
                  if (!clientToRate) return;
                  try {
                    const existing = await getRatingByUser(clientToRate);
                    const prev = parseFloat(existing?.rating ?? "0");
                    const newRating = prev > 0
                      ? ((prev + clientRatingStars) / 2).toFixed(2)
                      : clientRatingStars.toFixed(2);
                    if (prev > 0) {
                      await updateRating(clientToRate, newRating);
                    } else {
                      await createRating(newRating, clientToRate);
                    }
                  } catch (_) {}
                  setShowClientRating(false);
                  setClientToRate(null);
                  setClientRatingStars(0);
                  // Mostrar cobro DESPUÉS de calificar
                  setTakingPayment(true);
                }}
              >
                <Text style={clientRatingStyles.btnText}>Enviar calificación</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={clientRatingStyles.skip}
                onPress={() => {
                  setShowClientRating(false);
                  setClientToRate(null);
                  // Mostrar cobro DESPUÉS de omitir calificación
                  setTakingPayment(true);
                }}
              >
                <Text style={clientRatingStyles.skipText}>Omitir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Driver payment method picker (shown before ending trip)
// ──────────────────────────────────────────────────────────────
const PAYMENT_OPTIONS = [
  { id: "efectivo",  label: "Efectivo",  emoji: "💵", sub: "El cliente paga en cash" },
  { id: "nequi",     label: "Nequi",     emoji: "📱", sub: "Transferencia Nequi" },
  { id: "daviplata", label: "DaviPlata", emoji: "📲", sub: "Transferencia DaviPlata" },
  { id: "tarjeta",   label: "Tarjeta",   emoji: "💳", sub: "Pago con tarjeta" },
  { id: "pse",       label: "PSE",       emoji: "🏦", sub: "Transferencia bancaria" },
];

function DriverPaymentPicker({
  clientPhone,
  selectedMethod,
  onSelectMethod,
  onConfirm,
  onCancel,
}: {
  clientPhone: string;
  selectedMethod: string;
  onSelectMethod: (m: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible transparent animationType="slide">
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>¿Cómo cobra el viaje?</Text>
          <Text style={pickerStyles.sub}>Selecciona el método de pago que pedirás al cliente</Text>

          {PAYMENT_OPTIONS.map((opt) => {
            const active = selectedMethod === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[pickerStyles.option, active && pickerStyles.optionActive]}
                onPress={() => onSelectMethod(opt.id)}
              >
                <Text style={pickerStyles.optionEmoji}>{opt.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={pickerStyles.optionLabel}>{opt.label}</Text>
                  <Text style={pickerStyles.optionSub}>{opt.sub}</Text>
                </View>
                {active && <Text style={pickerStyles.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={pickerStyles.confirmBtn} onPress={onConfirm}>
            <Text style={pickerStyles.confirmText}>Finalizar viaje y cobrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pickerStyles.cancelBtn} onPress={onCancel}>
            <Text style={pickerStyles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#444",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  sub: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 12,
  },
  optionActive: {
    borderColor: "#FFCC28",
    backgroundColor: "#2A2A00",
  },
  optionEmoji: {
    fontSize: 24,
    width: 32,
    textAlign: "center",
  },
  optionLabel: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  optionSub: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  check: {
    color: "#FFCC28",
    fontSize: 18,
    fontWeight: "700",
  },
  confirmBtn: {
    backgroundColor: "#FFCC28",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  confirmText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "900",
  },
  cancelBtn: {
    backgroundColor: "#2A2A2A",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "600",
  },
});

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 0,
  },
  messageButton: {
    flex: 1,
    backgroundColor: "#FFC300",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#FFC300",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  messageButtonText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "700",
  },
  callButton: {
    backgroundColor: "#FFC300",
    borderRadius: 12,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFC300",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  menuButton: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3A3A3A",
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  container: {
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  // 5. ESTILOS NUEVOS PARA EL BADGE
  chatIconWrapper: {
    position: "relative",
  },
  chatBadge: {
    position: "absolute",
    top: -8,
    right: -10,
    backgroundColor: "#FF0000",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  negotiationCard: {
    backgroundColor: "#141414",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FF9900",
  },
  negotiationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  negotiationTitle: { color: "#FF9900", fontSize: 17, fontWeight: "800" },
  negotiationClient: { color: "#CCC", fontSize: 14 },
  negotiationDesc: {
    color: "#AAA",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  negotiationChatBtn: {
    backgroundColor: "#1A73E8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  negotiationChatBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  negotiationPriceLabel: { color: "#FFF", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  negotiationPriceInput: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: "#FFF",
    borderWidth: 1,
    borderColor: "#444",
    marginBottom: 6,
  },
  negotiationPricePreview: {
    color: "#FFCC28",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  negotiationAcceptBtn: {
    backgroundColor: "#FF9900",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  negotiationAcceptBtnText: { color: "#111", fontWeight: "900", fontSize: 16 },
  negotiationRejectBtn: {
    backgroundColor: "#333",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  negotiationRejectBtnText: { color: "#FF4444", fontWeight: "700", fontSize: 14 },
});

const clientRatingStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  box: {
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFCC2844",
    gap: 12,
  },
  title: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
  },
  sub: {
    color: "#AAA",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 8,
  },
  star: {
    fontSize: 40,
  },
  btn: {
    backgroundColor: "#FFCC28",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    width: "100%",
  },
  btnText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
  },
  skip: {
    paddingVertical: 8,
  },
  skipText: {
    color: "#777",
    fontSize: 14,
  },
});