import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  TextInput,
} from "react-native";

import COLORS from "./colors";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  item: any;
  isEditing: boolean;
  offerValue: string;
  onEdit: () => void;
  onChangeOffer: (value: string) => void;
  onConfirmEdit: () => void;
  onAccept: (item: any) => void;
  onOffer: (item: any) => void;
  onChat?: (item: any) => void;
  onReject?: (item: any) => void;
  deliveryData?: any;
  travelOptions?: any;
}

const SERVICE_ICONS: Record<string, string> = {
  moto: "🏍️",
  carro: "🚗",
  domicilio: "📦",
};

const renderPackageSize = (weightRange?: string) => {
  switch (weightRange) {
    case "small":      return "📦 Pequeño";
    case "medium":     return "📦📦 Mediano";
    case "large":      return "📦📦📦 Grande";
    case "extra-large":return "🚚 Extra Grande";
    default:           return "--";
  }
};

export const formatCOP = (value: number | string) => {
  if (value === "" || value === null || value === undefined) return "";
  const cleaned = String(value).replace(/\D/g, "");
  if (cleaned === "") return "";
  return Number(cleaned).toLocaleString("es-CO");
};

export const convertDurationToMinutes = (duration: string): number => {
  const seconds = parseInt(duration.replace(/\D/g, ""));
  return Math.ceil(seconds / 60);
};

const normalizeAddrLine = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function metersBetweenCard(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export default function TravelCard({
  item,
  deliveryData,
  travelOptions,
  onAccept,
  onOffer,
  onChat,
  onReject,
  isEditing,
  offerValue,
  onEdit,
  onChangeOffer,
  onConfirmEdit,
}: Readonly<Props>) {
  const [expanded, setExpanded] = useState(false);
  const [localOfferValue, setLocalOfferValue] = useState("");

  React.useEffect(() => {
    if (isEditing) {
      const cleanValue = String(offerValue).replace(/\D/g, "");
      setLocalOfferValue(cleanValue);
    }
  }, [isEditing]);

  const handleOfferChange = (text: string) => {
    const numbers = text.replace(/\D/g, "");
    setLocalOfferValue(numbers);
    onChangeOffer(numbers);
  };

  const formatNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  const serviceIcon = SERVICE_ICONS[item.tipoServicio] ?? "🚗";
  const isDomicilio = item.tipoServicio === "domicilio";

  const pickupMin =
    item?.distanciaUsuario?.duration != null
      ? convertDurationToMinutes(item.distanciaUsuario.duration)
      : null;
  const pickupKm =
    item?.distanciaUsuario?.distanceMeters != null
      ? (item.distanciaUsuario.distanceMeters / 1000).toFixed(1)
      : null;

  // Destination address — datosViaje puede ser JSON-stringified o texto plano
  const parseAddress = (raw: any): string => {
    if (!raw) return "--";
    let val = raw;
    if (typeof val === "string") {
      try { val = JSON.parse(val); } catch (_) {}
    }
    if (typeof val !== "string") return "--";
    return val.replace(/^"|"$/g, "").trim();
  };
  const destination = parseAddress(item.datosViaje);

  // Pickup address — stored in datosRecogida.address (added when client creates trip)
  const pickupAddress = (() => {
    try {
      const parsed = JSON.parse(item.datosRecogida);
      return parsed?.address ? String(parsed.address).trim() : null;
    } catch (_) { return null; }
  })();

  const pickupCoordsForCard = (() => {
    try {
      const parsed = JSON.parse(item.datosRecogida);
      if (parsed?.latitude != null && parsed?.longitude != null) {
        return { lat: Number(parsed.latitude), lng: Number(parsed.longitude) };
      }
    } catch (_) {}
    return null;
  })();

  const destCoordsForCard = (() => {
    try {
      const raw = item?.ubicacionDestino;
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (p?.latitude != null && p?.longitude != null) {
        return { lat: Number(p.latitude), lng: Number(p.longitude) };
      }
    } catch (_) {}
    return null;
  })();

  let destinationDisplay = destination;
  if (destCoordsForCard && (destination === "--" || !destination)) {
    destinationDisplay = `Ubicación en mapa: ${destCoordsForCard.lat.toFixed(5)}, ${destCoordsForCard.lng.toFixed(5)}`;
  } else if (
    destination !== "--" &&
    pickupAddress &&
    normalizeAddrLine(destination) === normalizeAddrLine(pickupAddress) &&
    pickupCoordsForCard &&
    destCoordsForCard
  ) {
    const m = metersBetweenCard(pickupCoordsForCard, destCoordsForCard);
    if (m > 120) {
      destinationDisplay = `Destino en mapa (~${(m / 1000).toFixed(1)} km): ${destCoordsForCard.lat.toFixed(5)}, ${destCoordsForCard.lng.toFixed(5)}`;
    }
  }

  // ── Stars renderer ──
  const renderStars = (rating: number | null) => {
    if (rating === null) return null;
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.4 ? 1 : 0;
    const empty = 5 - full - half;
    return (
      <View style={styles.starsRow}>
        {Array(full).fill(null).map((_, i) => (
          <Text key={`f${i}`} style={styles.starFull}>★</Text>
        ))}
        {half === 1 && <Text style={styles.starHalf}>½</Text>}
        {Array(empty).fill(null).map((_, i) => (
          <Text key={`e${i}`} style={styles.starEmpty}>★</Text>
        ))}
        <Text style={styles.ratingNumber}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* ── TOP ROW: avatar · name+rating · price ── */}
      <View style={styles.topRow}>

        {/* Client photo */}
        <View style={styles.avatarWrap}>
          {item.clientPhoto ? (
            <Image
              source={{ uri: item.clientPhoto }}
              style={styles.avatarImg}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.serviceIcon}>{serviceIcon}</Text>
            </View>
          )}
        </View>

        {/* Name + stars */}
        <View style={styles.nameBlock}>
          <Text style={styles.clientName} numberOfLines={1}>
            {item.user}
          </Text>
          {renderStars(item.clientRating)}
        </View>

        <Text style={styles.price}>
          ${formatCOP(item.oferta || item.tarifa)}
        </Text>
      </View>

      {/* ── PICKUP ROW: time · km ── */}
      {(pickupMin !== null || pickupKm !== null) && (
        <View style={styles.infoRow}>
          <Text style={styles.infoChip}>
            {pickupMin !== null ? `⏱ ~${pickupMin} min` : ""}
            {pickupMin !== null && pickupKm !== null ? "  ·  " : ""}
            {pickupKm !== null ? `📍 ${pickupKm} km de ti` : ""}
          </Text>
        </View>
      )}

      {/* ── PICKUP ROW (recogida) ── */}
      {pickupAddress && (
        <View style={styles.destinationRow}>
          <Text style={styles.destLabel}>🟢</Text>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabelText}>Recoge en</Text>
            <Text style={styles.destText} numberOfLines={1}>{pickupAddress}</Text>
          </View>
        </View>
      )}

      {/* ── DESTINATION ROW (a dónde va el cliente) ── */}
      <View style={styles.destinationRow}>
        <Text style={styles.destLabel}>🏁</Text>
        <View style={styles.addressBlock}>
          <Text style={styles.addressLabelText}>Va hacia</Text>
          <Text style={styles.destText} numberOfLines={2}>{destinationDisplay}</Text>
        </View>
      </View>

      {/* ── ACTION ROW: accept · reject · more ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.acceptBtn, isDomicilio && styles.domiAcceptBtn]}
          onPress={() => onAccept(item)}
          activeOpacity={0.85}
        >
          <Text style={styles.acceptText}>
            {isDomicilio ? "✓ Tomar domicilio" : "✓ Tomar viaje"}
          </Text>
        </TouchableOpacity>

        {onReject && (
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onReject(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectText}>✕</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.moreBtn}
          onPress={toggleExpand}
          activeOpacity={0.8}
        >
          <Text style={styles.moreText}>{expanded ? "▲" : "▼"}</Text>
        </TouchableOpacity>
      </View>

      {item.tipoServicio === "domicilio" && onChat && (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => onChat(item)}
        >
          <Text style={styles.chatButtonText}>Chatear con el cliente</Text>
        </TouchableOpacity>
      )}

      {/* ── EXPANDED DETAILS ── */}
      {expanded && (
        <View style={styles.details}>
          {/* Pickup full address */}
          {pickupAddress && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>🟢 Dirección de recogida</Text>
              <Text style={styles.detailValue}>{pickupAddress}</Text>
            </View>
          )}
          {/* Destination full address */}
          {destinationDisplay !== "--" && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>🏁 Destino completo</Text>
              <Text style={styles.detailValue}>{destinationDisplay}</Text>
            </View>
          )}

          {/* Offer / fare editor */}
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>💰 Oferta</Text>
            {!isEditing ? (
              <View style={styles.offerRow}>
                <Text style={styles.offerValue}>
                  ${formatCOP(offerValue || item.tarifa)}
                </Text>
                <TouchableOpacity style={styles.editIconBtn} onPress={onEdit}>
                  <Image
                    source={require("../../assets/edit_vector.png")}
                    style={{ width: 16, height: 16 }}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.fareInput}
                  value={formatNumber(localOfferValue)}
                  placeholder="Ingresa tu oferta"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  onChangeText={handleOfferChange}
                />
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={onConfirmEdit}
                >
                  <Text style={styles.confirmText}>✓ Confirmar</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.offerBtn}
              onPress={() => onOffer(item)}
            >
              <Text style={styles.offerBtnText}>Enviar oferta</Text>
            </TouchableOpacity>
          </View>

          {/* Delivery extras */}
          {isDomicilio && deliveryData && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>📦 Envío</Text>
              <Text style={styles.detailValue}>
                {renderPackageSize(deliveryData.weightRange)}
              </Text>
              {deliveryData.description ? (
                <Text style={styles.detailValue}>
                  {deliveryData.description}
                </Text>
              ) : null}
              {deliveryData.recipientName ? (
                <Text style={styles.detailValue}>
                  Destinatario: {deliveryData.recipientName}
                </Text>
              ) : null}
              {deliveryData.recipientPhone ? (
                <Text style={styles.detailValue}>
                  Tel: {deliveryData.recipientPhone}
                </Text>
              ) : null}
              {deliveryData.specialInstructions ? (
                <Text style={styles.detailValue}>
                  📝 {deliveryData.specialInstructions}
                </Text>
              ) : null}
            </View>
          )}

          {/* Car extras */}
          {item.tipoServicio === "carro" && travelOptions && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>🚗 Extras del viaje</Text>
              {travelOptions.hasPet === "true" && (
                <Text style={styles.detailValue}>🐾 Mascota</Text>
              )}
              {travelOptions.objects === "true" && (
                <Text style={styles.detailValue}>📦 Equipaje pesado</Text>
              )}
              {travelOptions.pasajers === "true" && (
                <Text style={styles.detailValue}>👥 +4 personas</Text>
              )}
              {travelOptions.comments ? (
                <Text style={styles.detailValue}>
                  💬 {travelOptions.comments}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141414",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },

  /* top row */
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFCC28",
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceIcon: {
    fontSize: 22,
  },
  nameBlock: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  clientName: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  starFull: {
    color: "#FFCC28",
    fontSize: 13,
  },
  starHalf: {
    color: "#FFCC28",
    fontSize: 13,
  },
  starEmpty: {
    color: "#444",
    fontSize: 13,
  },
  ratingNumber: {
    color: "#FFCC28",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 3,
  },
  price: {
    color: "#FFCC28",
    fontSize: 20,
    fontWeight: "900",
  },

  /* info row */
  infoRow: {
    marginBottom: 6,
  },
  infoChip: {
    color: "#AAA",
    fontSize: 13,
    fontWeight: "500",
  },

  /* destination row */
  destinationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 6,
  },
  destLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  addressBlock: {
    flex: 1,
    gap: 1,
  },
  addressLabelText: {
    color: "#777",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  destText: {
    color: "#DDD",
    fontSize: 13,
    fontWeight: "500",
  },

  /* action row */
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#FFCC28",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  domiAcceptBtn: {
    backgroundColor: "#ff9900",
  },
  acceptText: {
    fontWeight: "900",
    fontSize: 15,
    color: "#111",
  },
  rejectBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  rejectText: {
    color: "#FF4444",
    fontSize: 18,
    fontWeight: "700",
  },
  moreBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    color: "#AAA",
    fontSize: 16,
  },

  /* expanded details */
  details: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
    paddingTop: 12,
    gap: 12,
  },
  detailBlock: {
    gap: 4,
  },
  detailLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    color: "#CCC",
    fontSize: 14,
    lineHeight: 20,
  },

  /* offer section */
  offerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offerValue: {
    flex: 1,
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  editIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#1B1B1B",
  },
  fareInput: {
    width: "100%",
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#FFF",
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: 4,
  },
  confirmBtn: {
    backgroundColor: "#2A2A2A",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 8,
  },
  confirmText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  offerBtn: {
    marginTop: 8,
    backgroundColor: "#1B1B1B",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFCC28",
  },
  offerBtnText: {
    color: "#FFCC28",
    fontWeight: "700",
    fontSize: 14,
  },
  chatButton: {
    backgroundColor: "#1A73E8",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 10,
    marginTop: 8,
  },
  chatButtonText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 15,
  },
});
