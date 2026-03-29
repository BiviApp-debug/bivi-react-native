import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Image, // ⬅️ Asegúrate de importar Image
} from 'react-native';
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
}

export default function DriverOfferCard({ offer, onAccept }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [userRating, setUserRating] = useState("");
  const [cardDriverInformation, setCardDriverinformation] = useState<any>(null);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };

  const finalPrice = offer.contraoferta || offer.oferta;

  useEffect(()=>{
     (async () => {
          let myRatings = await getRatingByUser(offer.conductor)
          setUserRating(myRatings.rating)
          let driverInformation = await getDriverByPhone(offer.conductor);
          setCardDriverinformation(driverInformation)
          
     })()
  },[])

  const loadProfilePhoto = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/driver-profile-photo/${offer.conductor}`
      );

      if (response.ok) {
        const data = await response.json();
        setProfilePhotoUrl(data.data.profilePhoto);
      }
    } catch (error) {
      console.log('No se encontró foto de perfil');
    }
  };

  // ⬇️ Cargar la foto cuando se monta el componente
  useEffect(() => {
    loadProfilePhoto();
  }, [offer.conductor]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {profilePhotoUrl ? (
          <Image
            source={{ uri: profilePhotoUrl }} // ⬅️ Usar uri para URLs remotas
            style={styles.profileImage} // ⬅️ Añadir estilo
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={styles.name}>{cardDriverInformation?.name.split(" ")[0]} {cardDriverInformation?.lastName.split(" ")[0]}</Text>
          <Text style={styles.status}>Disponible</Text>
           <Text style={styles.statNumber}>{userRating}</Text>
        </View>

        <View style={styles.priceBox}>
          <Text style={styles.price}>{formatToCOP(finalPrice)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptText}>Aceptar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggle}>
          <Text style={styles.toggleText}>
            {open ? 'Ver menos' : 'Ver más'}
          </Text>
        </TouchableOpacity>
      </View>

      {open && (
        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.label}>Oferta inicial</Text>
            <Text style={styles.value}>{formatToCOP(offer.oferta)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Contraoferta</Text>
            <Text style={styles.value}>
              {formatToCOP(offer.contraoferta) || 'Ninguna'}
            </Text>
          </View>

          <View style={styles.destination}>
            <View style={styles.dot} />
            <Text style={styles.destinationText} numberOfLines={2}>
              {offer.datosViaje}
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
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statNumber: {
     color: COLORS.primary,
     fontSize: 24,
     fontWeight: 'bold',
     marginBottom: 4,
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
  avatarText: {
    fontSize: 18,
  },

  // ⬇️ Añadir estilo para la imagen de perfil
  profileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    backgroundColor: COLORS.backgroundLight, // Color de fondo mientras carga
  },

  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  status: {
    fontSize: 12,
    color: COLORS.success,
  },

  priceBox: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },

  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptText: {
    color: COLORS.textDark,
    fontWeight: '600',
  },

  toggleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

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