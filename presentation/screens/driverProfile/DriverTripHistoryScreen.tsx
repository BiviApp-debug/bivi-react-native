import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import { dataContext } from '../../context/Authcontext';
import { getInvoiceTravelsPricesConductor } from '../../utils/getInvoiceTravelsPricesConductor';
import { getRatingByUser } from '../../utils/HandleRatings';
import { getUserByPhone } from '../../utils/getUserByPhone';
import {
  extractDistanceKmFromTravel,
  firstName,
  formatDistanceLine,
  paymentLineDriver,
  serviceTypeLine,
  unwrapProfile,
} from '../../utils/historyDisplayHelpers';
import COLORS from '../../utils/colors';
import { getDriverByPhone } from '../../utils/getDriverByPhone';
import { getPercentageByVehicle } from '../../utils/getPercentageByVehicle';

interface Props extends StackScreenProps<RootStackParamList, 'DriverTripHistoryScreen'> {}

interface TripItem {
  id: number;
  clientid: string;
  user: string;
  datosViaje: string;
  tarifa: string;
  oferta: string;
  contraoferta: string;
  status: string;
  tipoServicio: string;
  created_at?: string;
  fecha_creacion?: string;
  metodo_pago?: string;
  clientRating?: number | null;
  _clientPhoto?: string | null;
  _clientName?: string;
}

const SERVICE_ICONS: Record<string, string> = {
  moto: '🏍️',
  carro: '🚗',
  domicilio: '📦',
};

const formatCOP = (value: string | number) => {
  if (!value) return '$0';
  const n = parseInt(String(value).replace(/\D/g, ''), 10);
  if (isNaN(n)) return '$0';
  return `$${n.toLocaleString('es-CO')}`;
};

const getAmount = (trip: TripItem): number => {
  const parse = (v: string) => parseInt((v || '').replace(/\D/g, ''), 10) || 0;
  return parse(trip.contraoferta) || parse(trip.oferta) || parse(trip.tarifa);
};

// UTC para coincidir con lo que guarda el servidor (toISOString)
const getFechaLocal = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const renderStars = (rating: number | null | undefined) => {
  if (rating == null) return <Text style={styles.noRating}>Sin calificación</Text>;
  const full  = Math.floor(rating);
  const empty = 5 - Math.ceil(rating);
  return (
    <View style={styles.starsRow}>
      {Array(full).fill(null).map((_, i) => (
        <Text key={`f${i}`} style={styles.starFull}>★</Text>
      ))}
      {rating % 1 >= 0.4 && <Text style={styles.starFull}>½</Text>}
      {Array(empty).fill(null).map((_, i) => (
        <Text key={`e${i}`} style={styles.starEmpty}>★</Text>
      ))}
      <Text style={styles.ratingNum}>{Number(rating).toFixed(1)}</Text>
    </View>
  );
};

export default function DriverTripHistoryScreen({ navigation }: Props) {
  const { authResponse } = useContext(dataContext);
  const [trips, setTrips]         = useState<TripItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalNetEarnings, setTotalNetEarnings] = useState(0);
  const [discountPct, setDiscountPct] = useState<number>(0);

  const getBreakdown = useCallback((trip: TripItem) => {
    const gross = getAmount(trip);
    const discount = Math.ceil((gross * discountPct) / 100);
    const net = Math.max(gross - discount, 0);
    return { gross, discount, net };
  }, [discountPct]);

  const loadHistory = useCallback(async () => {
    try {
      const fecha = getFechaLocal();
      const json  = await getInvoiceTravelsPricesConductor(authResponse.usuario.phone, fecha);
      const data: TripItem[] = json?.data ?? [];

      // Enrich each trip with the client's current rating
      const enriched = await Promise.all(
        data.map(async (trip) => {
          let clientRating: number | null = null;
          let _clientPhoto: string | null = null;
          let _clientName = String(trip.user || '').trim() || 'Cliente';
          try {
            const ratingData = await getRatingByUser(trip.clientid);
            clientRating = ratingData?.rating ? parseFloat(String(ratingData.rating)) : null;
          } catch (_) {
            clientRating = null;
          }
          const cp = String(trip.clientid || '').trim();
          if (cp) {
            try {
              const raw = await getUserByPhone(cp);
              const u = unwrapProfile(raw);
              if (u) {
                const full = [u.name, u.lastName].filter(Boolean).join(' ').trim();
                if (full) _clientName = String(full);
                const sp = u.selfiePhoto ?? u.photo;
                _clientPhoto = typeof sp === 'string' ? sp : null;
              }
            } catch (_) {}
          }
          return {
            ...trip,
            clientRating,
            _clientPhoto,
            _clientName,
          };
        }),
      );

      setTrips(enriched.reverse()); // most recent first
      setTotalEarnings(enriched.reduce((acc, t) => acc + getAmount(t), 0));
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authResponse.usuario.phone]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const loadPct = async () => {
      try {
        const d = await getDriverByPhone(authResponse.usuario.phone);
        const vehicleType = d?.vehicleType;
        if (!vehicleType) return;
        const p = await getPercentageByVehicle(vehicleType);
        const pct = Number(p?.data?.[0]?.percentaje);
        if (Number.isFinite(pct) && pct > 0) setDiscountPct(pct);
      } catch (_) {}
    };
    void loadPct();
  }, [authResponse.usuario.phone]);

  useEffect(() => {
    const gross = trips.reduce((acc, t) => acc + getBreakdown(t).gross, 0);
    const net = trips.reduce((acc, t) => acc + getBreakdown(t).net, 0);
    setTotalEarnings(gross);
    setTotalNetEarnings(net);
  }, [trips, getBreakdown]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const renderTrip = ({ item, index }: { item: TripItem; index: number }) => {
    const { gross, discount, net } = getBreakdown(item);
    const icon = SERVICE_ICONS[item.tipoServicio] ?? '🚗';
    const timeSrc = item.created_at || item.fecha_creacion;
    const time = timeSrc
      ? new Date(timeSrc).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      : null;
    const km = extractDistanceKmFromTravel(item as unknown as Record<string, unknown>);
    const distLine = formatDistanceLine(km);
    const payLine = paymentLineDriver(item.status, item.metodo_pago);
    const svc = serviceTypeLine(item.tipoServicio);
    const clientFirst = firstName(item._clientName || item.user || 'Cliente');

    return (
      <View style={styles.tripCard}>
        <View style={styles.tripHeader}>
          <View style={styles.avatarRing}>
            {item._clientPhoto ? (
              <Image source={{ uri: item._clientPhoto }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPh}>
                <Text style={styles.tripIcon}>{icon}</Text>
              </View>
            )}
          </View>
          <View style={styles.tripMeta}>
            <Text style={styles.tripClient} numberOfLines={2}>
              Llevaste a {clientFirst}
            </Text>
            <Text style={styles.tripThanks} numberOfLines={1}>
              Gracias por completar este servicio
            </Text>
            <Text style={styles.tripSub} numberOfLines={2}>
              {[distLine, svc, time].filter(Boolean).join(' · ')}
            </Text>
            {!!payLine && <Text style={styles.payLine}>{payLine}</Text>}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLine}>
                Cobró: <Text style={styles.breakdownValue}>{formatCOP(gross)}</Text>
              </Text>
              <Text style={styles.breakdownLine}>
                Descuento por uso de app: <Text style={styles.breakdownValue}>{formatCOP(discount)}</Text>
              </Text>
              <Text style={styles.breakdownNet}>
                Ganancia neta: {formatCOP(net)}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Cliente: </Text>
              {renderStars(item.clientRating)}
            </View>
          </View>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>#{trips.length - index}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Historial de hoy</Text>
          <Text style={styles.headerDate}>{getFechaLocal()}</Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      {/* Summary banner */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{trips.length}</Text>
          <Text style={styles.summaryLabel}>Viajes</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text
            style={styles.summaryValueMoney}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatCOP(totalEarnings)}
          </Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text
            style={styles.summaryValueMoney}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatCOP(totalNetEarnings)}
          </Text>
          <Text style={styles.summaryLabel}>Total ganancia</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTrip}
          contentContainerStyle={trips.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Sin viajes hoy</Text>
              <Text style={styles.emptySubtitle}>
                Los viajes que completes aparecerán aquí.{'\n'}
                Jala hacia abajo para actualizar.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundMedium,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  summaryValueMoney: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    maxWidth: '100%',
    textAlign: 'center',
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.backgroundMedium,
    marginHorizontal: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyInner: {
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  /** Misma tarjeta que el historial en perfil (modo cliente) */
  tripCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    position: 'relative',
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingRight: 36,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundMedium,
    marginRight: 12,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPh: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundMedium,
  },
  tripIcon: {
    fontSize: 24,
  },
  tripMeta: {
    flex: 1,
    minWidth: 0,
  },
  tripClient: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  tripThanks: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tripSub: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  payLine: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  breakdownBox: {
    marginTop: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  breakdownLine: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  breakdownValue: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  breakdownNet: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  ratingLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  starFull: {
    color: COLORS.primary,
    fontSize: 14,
  },
  starEmpty: {
    color: COLORS.border,
    fontSize: 14,
  },
  ratingNum: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  noRating: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  badge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
});
