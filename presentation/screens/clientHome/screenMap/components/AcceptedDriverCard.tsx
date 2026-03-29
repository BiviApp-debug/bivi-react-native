import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import DistanceProgressBar from "../DistanceProgressBar";
import COLORS from "../../../../utils/colors";
import { getRatingByUser } from "../../../../utils/HandleRatings";
import { Ionicons } from '@expo/vector-icons';

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  driver: any;
  captureFinalLocation: string;
  /** Dirección donde el cliente espera al vehículo */
  pickupAddress?: string;
  /** Tipo de servicio del viaje (mismo valor que pidió el cliente) */
  tripTipoServicio?: string;
  serviceInMeters: number;
  serviceInKilometers: number;
  totalServiceInMeters: number;
  totalServiceInKilometers: number;
  onWayTravel: boolean;
  onChatPress: () => void;
  onCallPress?: () => void;
  getVehicleIcon: (type: string) => string;
  unreadChatCount?: number;
}

const normalizeVehicleKind = (
  driverType: string | undefined,
  tripTipo: string | undefined
): "moto" | "carro" | "domicilio" => {
  const raw = String(driverType || tripTipo || "")
    .toLowerCase()
    .trim();
  if (
    raw === "moto" ||
    raw === "motorcycle" ||
    raw === "motocicleta"
  ) {
    return "moto";
  }
  if (
    raw === "domicilio" ||
    raw === "delivery" ||
    raw === "envio" ||
    raw === "envío"
  ) {
    return "domicilio";
  }
  if (
    raw === "carro" ||
    raw === "auto" ||
    raw === "car" ||
    raw === "automóvil" ||
    raw === "automovil"
  ) {
    return "carro";
  }
  return "carro";
};

const vehicleKindLabel = (k: "moto" | "carro" | "domicilio") => {
  if (k === "moto") return "Moto";
  if (k === "domicilio") return "Domicilio";
  return "Carro";
};

export default function AcceptedDriverCard({
  driver,
  captureFinalLocation,
  pickupAddress,
  tripTipoServicio,
  serviceInMeters,
  serviceInKilometers,
  totalServiceInMeters,
  totalServiceInKilometers,
  onWayTravel,
  onChatPress,
  onCallPress,
  getVehicleIcon,
  unreadChatCount = 0,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [driverRatings, setDriverRatings] = useState(false);
  const vehicleKind = normalizeVehicleKind(driver?.vehicleType, tripTipoServicio);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };

  //console.log(unreadChatCount,"holas_driver_2444");
  

  useEffect(() => {
    (async () => {
      let userRatings = await getRatingByUser(driver.phone);
      if (userRatings) {
        setDriverRatings(userRatings?.rating);
      }
    })();
  }, [driver]);

  return (
    <View style={styles.container}>
      {/* Tarjeta superior - Detalles del arrendamiento */}
      <View style={styles.topCard}>
        <View style={styles.topContent}>
          <Text style={styles.subtitle}>Detalles del arrendamiento</Text>
          <Text style={styles.miniLabel}>Te recogen aquí</Text>
          <Text style={styles.pickupText} numberOfLines={2}>
            {pickupAddress?.trim() || "Obteniendo punto de recogida…"}
          </Text>
          <Text style={[styles.miniLabel, { marginTop: 10 }]}>Destino</Text>
          <Text style={styles.secondaryTripText} numberOfLines={2}>
            {captureFinalLocation || "—"}
          </Text>
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#FFC300" />
            <Text style={styles.statusText}>Efectivo</Text>
          </View>
        </View>
          <TouchableOpacity style={styles.menuButton} onPress={toggle}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFC300" />
          </TouchableOpacity>
      </View>
       {/* Contenido expandible */}
        {open && (
          <View style={styles.expandableContent}>
            <View style={styles.divider} />

            <View style={styles.tripRow}>
              <View style={[styles.tripDotGreen, { backgroundColor: "#4CAF50" }]} />
              <View style={styles.tripInfo}>
                <Text style={styles.tripLabel}>Recogida (vehículo va hacia aquí)</Text>
                <Text style={styles.tripValue} numberOfLines={3}>
                  {pickupAddress?.trim() || "—"}
                </Text>
              </View>
            </View>

            <View style={styles.tripRow}>
              <View style={styles.tripDotGreen} />
              <View style={styles.tripInfo}>
                <Text style={styles.tripLabel}>Destino</Text>
                <Text style={styles.tripValue} numberOfLines={2}>
                  {captureFinalLocation || "No especificado"}
                </Text>
              </View>
            </View>

            <View style={styles.etaContainer}>
              <View style={styles.etaContent}>
                 <Text style={styles.etaLabel}>
                  {onWayTravel
                    ? "Distancia al destino"
                    : "Distancia del conductor"}
                </Text>
                {(serviceInMeters > 0 || serviceInKilometers > 0) && (
                  <Text style={styles.etaTime}>
                    {serviceInKilometers < 1
                      ? `${Math.round(serviceInMeters)} m`
                      : `${Math.round(serviceInKilometers)} km`}
                  </Text>
                )}
               
              </View>

              <DistanceProgressBar
                distance={
                  serviceInKilometers < 1
                    ? Math.round(serviceInMeters)
                    : Math.round(serviceInKilometers)
                }
                totalDistance={
                  totalServiceInKilometers < 1
                    ? Math.round(totalServiceInMeters)
                    : Math.round(totalServiceInKilometers)
                }
              />
            </View>

            <Text style={styles.infoText}>
              💡 El conductor puede ver tu ubicación en tiempo real
            </Text>
          </View>
        )}

      {/* Tarjeta principal - Información del conductor */}
      <View style={styles.mainCard}>
        <View style={styles.driverSection}>
          {/* Imagen del conductor con rating */}
          <View style={styles.driverImageContainer}>
            <View style={styles.goldBorder}>
              {driver.documentPhoto ? (
                <Image
                  style={styles.driverImage}
                  source={{ uri: driver.documentPhoto }}
                />
              ) : (
                <View style={styles.driverImagePlaceholder}>
                  <Text style={styles.driverImagePlaceholderText}>
                    {driver.name?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFC300" />
              <Text style={styles.ratingText}>{driverRatings || "N/A"}</Text>
            </View>
          </View>

          {/* Imagen del vehículo */}
          <View style={styles.vehicleImageContainer}>
            {vehicleKind === "carro" ? (
              <Image
                style={styles.vehicleImage}
                source={require("../../../../../assets/car.png")}
              />
            ) : (
              <Image
                style={styles.vehicleImage}
                source={require("../../../../../assets/moto.png")}
              />
            )}
          </View>

          {/* Información del vehículo */}
          <View style={styles.vehicleInfo}>
            <View style={styles.vehicleTypeRow}>
              <Text style={styles.vehicleTypeEmoji}>
                {getVehicleIcon(vehicleKind)}
              </Text>
              <Text style={styles.vehicleTypeLabel}>
                {vehicleKindLabel(vehicleKind)}
              </Text>
            </View>
            <Text style={styles.vehiclePlate}>{driver.carId}</Text>
            <Text style={styles.vehicleModel}>
              {driver.carBrand} {driver.carModel}
            </Text>
          </View>
        </View>

        {/* Nombre del conductor y viajes */}
        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>
            {(driver?.name ?? "").split(" ")[0] || "?"}{" "}
            {(driver?.lastName ?? "").split(" ")[0] || ""}
          </Text>
          <View style={styles.statusBadgeActive}>
            <View style={styles.statusDot} />
            <Text style={styles.statusActiveText}>En camino</Text>
          </View>
        </View>

        {/* Botones de acción */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.messageButton} onPress={onChatPress}>
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

          <TouchableOpacity style={styles.callButton} onPress={onCallPress || onChatPress}>
            <Ionicons name="call" size={22} color="#000" />
          </TouchableOpacity>       
        </View>

       
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    gap: 12,
  },
  // Tarjeta superior
  topCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  topContent: {
    flex: 1,
  },
  subtitle: {
    color: "#888",
    fontSize: 16,
    marginBottom: 4,
    fontWeight: "500",
  },
  pickupText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 4,
  },
  miniLabel: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  secondaryTripText: {
    color: "#CCC",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "#FFC300",
    fontSize: 14,
    fontWeight: "600",
  },
  topMenuButton: {
    padding: 4,
  },
  mainCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },

  driverSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  driverImageContainer: {
    position: "relative",
    marginRight: 12,
  },
  goldBorder: {
    borderWidth: 3,
    borderColor: "#FFC300",
    borderRadius: 32,
    padding: 2,
    backgroundColor: "#000",
    shadowColor: "#FFC300",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  driverImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  driverImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFC300",
    alignItems: "center",
    justifyContent: "center",
  },
  driverImagePlaceholderText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  ratingBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#000",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 2,
    borderColor: "#FFC300",
  },
  ratingText: {
    color: "#FFC300",
    fontSize: 11,
    fontWeight: "700",
  },

  vehicleImageContainer: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleImage: {
    width: 100,
    height: 60,
    resizeMode: "contain",
  },

  vehicleInfo: {
    flex: 1,
    justifyContent: "center",
  },
  vehicleTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  vehicleTypeEmoji: {
    fontSize: 22,
  },
  vehicleTypeLabel: {
    color: "#FFC300",
    fontSize: 16,
    fontWeight: "700",
  },
  vehiclePlate: {
    color: "#FFC300",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: 1,
  },
  vehicleModel: {
    color: "#AAA",
    fontSize: 14,
    fontWeight: "500",
  },

  driverDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A3A",
  },
  driverName: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  statusBadgeActive: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFC300",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFC300",
    marginRight: 6,
  },
  statusActiveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFC300",
  },

  actionButtons: {
    flexDirection: "row",
    gap: 8,
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
    backgroundColor: "#3A3A3A",
    borderRadius: 12,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },

  // Contenido expandible
  expandableContent: {
    marginTop: 0,
    padding: 16,
     borderRadius: 16,
      borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  divider: {
    height: 1,
  },
  tripRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  tripDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFC300",
    marginTop: 6,
    marginRight: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripLabel: {
    fontSize: 16,
    color: "#888",
    marginBottom: 4,
    fontWeight: "500",
  },
  tripValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
    lineHeight: 20,
  },

  etaContainer: {
    marginBottom: 0,
  },
  etaContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 0,
  },
  etaTime: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFC300",
    marginBottom: 4,
  },
  etaLabel: {
    fontSize: 16,
    color: "#888",
    fontWeight: "500",
  },

  infoText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
});