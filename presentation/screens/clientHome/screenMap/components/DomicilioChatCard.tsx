import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../../../utils/colors';
import formatToCOP from '../../../../utils/formatCop';
import { API_BASE_URL } from '../../../../API/API';
import { getRatingByUser } from '../../../../utils/HandleRatings';
import { getDriverByPhone } from '../../../../utils/getDriverByPhone';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  offer: any;
  onAccept: () => void;
  onChat: () => void;
  onCancel: () => void;
  unreadCount: number;
}

function hasContraoferta(offer: any): boolean {
  const c = offer?.contraoferta;
  if (c === null || c === undefined) return false;
  const s = String(c).trim();
  return s !== '' && s !== '0';
}

export default function DomicilioChatCard({
  offer,
  onAccept,
  onChat,
  onCancel,
  unreadCount,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [userRating, setUserRating] = useState('');
  const [cardDriverInformation, setCardDriverinformation] = useState<any>(null);

  const negotiated = hasContraoferta(offer);
  const displayPrice = negotiated ? offer.contraoferta : offer.oferta;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };

  useEffect(() => {
    (async () => {
      const myRatings = await getRatingByUser(offer.conductor);
      setUserRating(myRatings.rating);
      const driverInformation = await getDriverByPhone(offer.conductor);
      setCardDriverinformation(driverInformation);
    })();
  }, [offer.conductor]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/driver-profile-photo/${offer.conductor}`
        );
        if (response.ok) {
          const data = await response.json();
          setProfilePhotoUrl(data.data.profilePhoto);
        }
      } catch {
        setProfilePhotoUrl(null);
      }
    })();
  }, [offer.conductor]);

  const nameLine =
    cardDriverInformation?.name && cardDriverInformation?.lastName
      ? `${cardDriverInformation.name.split(' ')[0]} ${cardDriverInformation.lastName.split(' ')[0]}`
      : offer.conductor;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {profilePhotoUrl ? (
          <Image source={{ uri: profilePhotoUrl }} style={styles.profileImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{nameLine}</Text>
          <Text style={styles.badge}>📦 Domicilio</Text>
          <Text style={styles.statNumber}>⭐ {userRating}</Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Tarifa base</Text>
          <Text style={styles.price}>{formatToCOP(displayPrice)}</Text>
        </View>
      </View>

      {!negotiated && (
        <Text style={styles.hint}>
          Acuerda por chat qué comprar, dónde y el precio final. Cuando el domiciliario envíe el
          precio, aparecerá aquí para aceptar.
        </Text>
      )}

      {negotiated && (
        <View style={styles.negotiatedBox}>
          <Text style={styles.negotiatedLabel}>Precio acordado por el domiciliario</Text>
          <Text style={styles.negotiatedPrice}>
            ${formatToCOP(String(offer.contraoferta))}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.chatBtn} onPress={onChat} activeOpacity={0.85}>
        <View style={styles.chatRow}>
          <Ionicons name="chatbubble" size={20} color="#FFF" />
          {unreadCount > 0 && (
            <View style={styles.badgeUnread}>
              <Text style={styles.badgeUnreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
          <Text style={styles.chatBtnText}>  Chat con el domiciliario</Text>
        </View>
      </TouchableOpacity>

      {negotiated && (
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
          <Text style={styles.acceptBtnText}>✓ Aceptar domicilio</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.85}>
        <Text style={styles.cancelBtnText}>Cancelar solicitud</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={toggle}>
        <Text style={styles.toggleText}>{open ? 'Ver menos' : 'Ver más'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.label}>Oferta inicial</Text>
            <Text style={styles.value}>{formatToCOP(offer.oferta)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contraoferta</Text>
            <Text style={styles.value}>
              {offer.contraoferta ? formatToCOP(offer.contraoferta) : '—'}
            </Text>
          </View>
          <View style={styles.destination}>
            <View style={styles.dot} />
            <Text style={styles.destinationText} numberOfLines={4}>
              {typeof offer.datosViaje === 'string'
                ? offer.datosViaje
                : JSON.stringify(offer.datosViaje || {})}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF990044',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18 },
  profileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    backgroundColor: COLORS.backgroundMedium,
  },
  headerInfo: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  badge: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  statNumber: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  priceBox: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  priceLabel: { fontSize: 10, color: COLORS.textSecondary },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
    lineHeight: 18,
  },
  negotiatedBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  negotiatedLabel: {
    fontSize: 12,
    color: '#86EFAC',
    marginBottom: 4,
  },
  negotiatedPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4ADE80',
  },
  chatBtn: {
    marginTop: 12,
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  badgeUnread: {
    marginLeft: 8,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeUnreadText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  acceptBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: COLORS.textDark,
    fontWeight: '900',
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#FF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  toggleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  details: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { fontSize: 12, color: COLORS.textSecondary },
  value: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  destinationText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
  },
});
