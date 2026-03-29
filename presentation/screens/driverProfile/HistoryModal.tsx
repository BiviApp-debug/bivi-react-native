import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import COLORS from '../../utils/colors';
import { getInvoiceTravelsPricesConductor } from '../../utils/getInvoiceTravelsPricesConductor';
import formatToCOP from '../../utils/formatCop';
import { getUserByPhone } from '../../utils/getUserByPhone';
import { getDriverByPhone } from '../../utils/getDriverByPhone';
import { getPercentageByVehicle } from '../../utils/getPercentageByVehicle';
import {
  extractDistanceKmFromTravel,
  firstName,
  formatDistanceLine,
  paymentLineDriver,
  serviceTypeLine,
  unwrapProfile,
} from '../../utils/historyDisplayHelpers';

interface HistoryTravel {
  id: number;
  user: string;
  tipoServicio: string;
  datosViaje: string;
  tarifa: string;
  oferta: string;
  contraoferta: string;
  conductor: string;
  fecha_creacion: string;
  status: string;
  clientid?: string;
  metodo_pago?: string;
  created_at?: string;
}

type EnrichedTravel = HistoryTravel & {
  _counterpartPhoto: string | null;
  _counterpartName: string;
};

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  userPhone: string;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ visible, onClose, userPhone }) => {
  const [travels, setTravels] = useState<EnrichedTravel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [discountPct, setDiscountPct] = useState<number>(0);

  // UTC para coincidir con lo que guarda el servidor (toISOString)
  const getFechaLocal = () => {
    const now = new Date();
    const year  = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day   = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 🔥 Inicializar con fecha de hoy cuando el modal se abre
  useEffect(() => {
    if (visible && !selectedDate) {
      const todayDate = getFechaLocal();
      setSelectedDate(todayDate);
    }
  }, [visible]);

  // 🔥 Cargar historial cuando cambia la fecha seleccionada
  useEffect(() => {
    if (visible && selectedDate) {
      loadHistory();
    }
  }, [visible, selectedDate]);

  useEffect(() => {
    const loadPct = async () => {
      try {
        const d = await getDriverByPhone(userPhone);
        const vehicleType = d?.vehicleType;
        if (!vehicleType) return;
        const p = await getPercentageByVehicle(vehicleType);
        const pct = Number(p?.data?.[0]?.percentaje);
        if (Number.isFinite(pct) && pct > 0) setDiscountPct(pct);
      } catch (_) {}
    };
    if (visible) void loadPct();
  }, [visible, userPhone]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      console.log(`📅 Cargando historial para: ${userPhone} - ${selectedDate}`);
      
      const response = await getInvoiceTravelsPricesConductor(userPhone, selectedDate);
      
      if (response.success && response.data) {
        console.log(`✅ Se encontraron ${response.data.length} viajes`);
        const raw: HistoryTravel[] = response.data;
        const enriched: EnrichedTravel[] = await Promise.all(
          raw.map(async (item) => {
            const clientPhone = String(
              item.clientid ?? (item as unknown as { client_id?: string }).client_id ?? ''
            ).trim();
            let _counterpartPhoto: string | null = null;
            let _counterpartName = String(item.user || '').trim() || 'Cliente';
            if (clientPhone) {
              try {
                const raw = await getUserByPhone(clientPhone);
                const u = unwrapProfile(raw);
                if (u) {
                  const full = [u.name, u.lastName].filter(Boolean).join(' ').trim();
                  if (full) _counterpartName = String(full);
                  const sp = u.selfiePhoto ?? u.photo;
                  _counterpartPhoto = typeof sp === 'string' ? sp : null;
                }
              } catch (_) {}
            }
            return { ...item, _counterpartPhoto, _counterpartName };
          })
        );
        setTravels(enriched);
      } else {
        console.log('📭 Sin viajes para esta fecha');
        setTravels([]);
      }
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
      setTravels([]);
    } finally {
      setLoading(false);
    }
  };

  const getPriceFromTravel = (travel: EnrichedTravel): number => {
    const cleanPrice = (value: string | null) => {
      if (!value) return 0;
      const clean = value.replace(/[$\s.]/g, '');
      return parseFloat(clean) || 0;
    };

    const contraofertaNum = cleanPrice(travel.contraoferta);
    const ofertaNum = cleanPrice(travel.oferta);
    const tarifaNum = cleanPrice(travel.tarifa);

    if (contraofertaNum > 0) return contraofertaNum;
    if (ofertaNum > 0) return ofertaNum;
    return tarifaNum;
  };

  const getServiceIcon = (tipoServicio: string) => {
    switch (tipoServicio) {
      case 'carro':
        return '🚗';
      case 'moto':
        return '🏍️';
      case 'domicilio':
        return '🍔';
      default:
        return '🚕';
    }
  };

  const getTripBreakdown = (travel: EnrichedTravel) => {
    const gross = getPriceFromTravel(travel);
    const discount = Math.ceil((gross * discountPct) / 100);
    const net = Math.max(gross - discount, 0);
    return { gross, discount, net };
  };

  const renderTravelItem = ({ item }: { item: EnrichedTravel }) => {
    const { gross, discount, net } = getTripBreakdown(item);
    const dateSrc = item.fecha_creacion || item.created_at || Date.now();
    const date = new Date(dateSrc);
    const timeString = date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const km = extractDistanceKmFromTravel(item as unknown as Record<string, unknown>);
    const distLine = formatDistanceLine(km);
    const payLine = paymentLineDriver(item.status, item.metodo_pago);
    const svc = serviceTypeLine(item.tipoServicio);
    const clientFirst = firstName(item._counterpartName);

    return (
      <View style={styles.travelCard}>
        <View style={styles.travelHeader}>
          <View style={styles.avatarRing}>
            {item._counterpartPhoto ? (
              <Image source={{ uri: item._counterpartPhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.travelIcon}>{getServiceIcon(item.tipoServicio)}</Text>
              </View>
            )}
          </View>

          <View style={styles.travelInfo}>
            <Text style={styles.travelTitle} numberOfLines={2}>
              Llevaste a {clientFirst}
            </Text>
            <Text style={styles.travelThanks} numberOfLines={1}>
              Gracias por completar este servicio
            </Text>
            <Text style={styles.travelMeta} numberOfLines={1}>
              {[distLine, svc, timeString].filter(Boolean).join(' · ')}
            </Text>
            {!!payLine && <Text style={styles.paymentInfo}>{payLine}</Text>}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownLine}>
                Cobró: <Text style={styles.breakdownValue}>{formatToCOP(String(gross))}</Text>
              </Text>
              <Text style={styles.breakdownLine}>
                Descuento por uso de app: <Text style={styles.breakdownValue}>{formatToCOP(String(discount))}</Text>
              </Text>
              <Text style={styles.breakdownNet}>
                Ganancia neta: {formatToCOP(String(net))}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const handleDateChange = (days: number) => {
    // Trabajar siempre en UTC para que las fechas coincidan con el servidor
    const [y, m, d] = selectedDate.split('-').map(Number);
    const currentDate = new Date(Date.UTC(y, m - 1, d));
    currentDate.setUTCDate(currentDate.getUTCDate() + days);

    const year  = currentDate.getUTCFullYear();
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
    const day   = String(currentDate.getUTCDate()).padStart(2, '0');

    setSelectedDate(`${year}-${month}-${day}`);
  };

  const totalAmount = travels.reduce((sum, travel) => sum + getTripBreakdown(travel).gross, 0);
  const totalNet = travels.reduce((sum, travel) => sum + getTripBreakdown(travel).net, 0);

  // 🔥 Formatear la fecha para mostrar
  const displayDate = selectedDate ? new Date(selectedDate).toLocaleDateString('es-CO', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Viajes</Text>
          <View style={styles.spacer} />
        </View>

        {/* Date Navigation */}
        <View style={styles.dateContainer}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => handleDateChange(-1)}
          >
            <Text style={styles.dateButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>
              {displayDate}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => handleDateChange(1)}
          >
            <Text style={styles.dateButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {travels.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Viajes</Text>
              <Text style={styles.summaryValue}>{travels.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text
                style={styles.summaryValueMoney}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatToCOP(totalAmount.toString())}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total ganancia</Text>
              <Text
                style={styles.summaryValueMoney}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatToCOP(totalNet.toString())}
              </Text>
            </View>
          </View>
        )}

        {/* Travel List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        ) : travels.length > 0 ? (
          <FlatList
            data={travels}
            renderItem={renderTravelItem}
            keyExtractor={(item) => `${item.id}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Sin viajes</Text>
            <Text style={styles.emptySubtitle}>
              No hay viajes registrados para esta fecha
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundMedium,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    color: COLORS.textPrimary,
  },
  spacer: {
    width: 40,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.backgroundLight,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  dateButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  dateButtonText: {
    fontSize: 20,
    color: 'black',
    fontWeight: 'bold',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  summaryValueMoney: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    maxWidth: '100%',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.backgroundMedium,
    marginHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  travelCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  travelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundMedium,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: COLORS.backgroundMedium,
  },
  travelIcon: {
    fontSize: 24,
  },
  travelInfo: {
    flex: 1,
    minWidth: 0,
  },
  travelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  travelThanks: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  travelMeta: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  paymentInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '600',
  },
  breakdownBox: {
    marginTop: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textPrimary,
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default HistoryModal;