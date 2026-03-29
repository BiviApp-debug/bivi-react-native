import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform, Alert, Modal } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import COLORS from "./colors";
import formatToCOP from "./formatCop";

interface Props {
  item: any;
  getServiceIcon: (type: string) => string;
  startPickupPoint: boolean;
  onWayTravel: boolean;
  cancelService: () => void;
  pickUpHandle: (clientid: string) => void;
  startFinalTravel: (clientid: string) => void;
  finishButton: boolean;
  onFinishTravel: (clientid: string) => void;
}

function normalizeAddressLine(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function metersBetween(
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

export default function AcceptedTravelCard({
  item,
  getServiceIcon,
  startPickupPoint,
  onWayTravel,
  cancelService,
  pickUpHandle,
  startFinalTravel,
  finishButton,
  onFinishTravel,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [finishConfirmVisible, setFinishConfirmVisible] = useState(false);

  // Dirección de recogida legible (texto) desde datosRecogida.address
  const getPickupAddress = (): string => {
    try {
      const rec = item?.datosRecogida ?? item?.ubicacionCliente;
      const parsed = typeof rec === "string" ? JSON.parse(rec || "{}") : rec;
      if (parsed?.address) return String(parsed.address);
    } catch (_) {}
    return "";
  };

  // Dirección de destino legible desde datosViaje
  const getDestinationAddress = (): string => {
    try {
      let val = item?.datosViaje;
      if (typeof val === "string") {
        try { val = JSON.parse(val); } catch (_) {}
      }
      if (typeof val === "string") return val.replace(/^"|"$/g, "").trim();
    } catch (_) {}
    return "";
  };

  const getDestinationCoords = (): { lat: number; lng: number } | null => {
    try {
      const raw = item?.ubicacionDestino;
      const parsed = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
      if (parsed?.latitude != null && parsed?.longitude != null) {
        return { lat: Number(parsed.latitude), lng: Number(parsed.longitude) };
      }
    } catch (_) {}
    return null;
  };

  // Función para obtener coordenadas de recogida
  const getPickupCoords = (): { lat: number; lng: number } | null => {
    try {
      const rec = item?.datosRecogida ?? item?.ubicacionCliente;
      const parsed = typeof rec === "string" ? JSON.parse(rec || "{}") : rec;
      if (parsed?.latitude != null && parsed?.longitude != null) {
        return { lat: parsed.latitude, lng: parsed.longitude };
      }
    } catch (_) {}
    return null;
  };

  /** Si el texto de destino repite la recogida pero el pin del mapa está lejos, mostrar coords (datos guardados mal o geocoding genérico). */
  const getDestinationDisplay = (): string => {
    const pickupText = getPickupAddress();
    const destText = getDestinationAddress();
    const p = getPickupCoords();
    const d = getDestinationCoords();
    if (d && !destText) {
      return `Ubicación en mapa: ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}`;
    }
    if (
      destText &&
      pickupText &&
      normalizeAddressLine(destText) === normalizeAddressLine(pickupText) &&
      p &&
      d
    ) {
      const m = metersBetween(p, d);
      if (m > 120) {
        const km = (m / 1000).toFixed(1);
        return `Destino en mapa (~${km} km de la recogida): ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}`;
      }
    }
    return destText;
  };

  const openInMaps = (app: "google" | "waze", target: "pickup" | "destination") => {
    const coords =
      target === "pickup" ? getPickupCoords() : getDestinationCoords();
    if (!coords) {
      Alert.alert(
        "Error",
        target === "pickup"
          ? "No se pudo obtener la ubicación de recogida."
          : "No hay coordenadas de destino para este viaje."
      );
      return;
    }
    const { lat, lng } = coords;
    if (app === "waze") {
      const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
      Linking.openURL(url).catch(() =>
        Linking.openURL(`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`)
      );
    } else {
      const url = Platform.select({
        ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      });
      Linking.openURL(url!).catch(() =>
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`)
      );
    }
  };

  // Determinar la tarifa a mostrar
  const getFare = () => {
    if (item.contraoferta !== "") return item.contraoferta;
    if (item.oferta !== "") return item.oferta;
    return item.tarifa;
  };

  return (
    <View style={styles.container}>
      {/* Tarjeta superior - Info del servicio */}
      <TouchableOpacity
        style={styles.topCard}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <View style={styles.serviceInfo}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{getServiceIcon(item.tipoServicio)}</Text>
            </View>
            
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{item.user}</Text>
              <Text style={styles.serviceType}>{item.tipoServicio}</Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {item.viaje === "ACEPTED" ? "Aceptado" : "Oferta"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.expandButton}>
          <Ionicons 
            name={open ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#FFC300" 
          />
        </View>
      </TouchableOpacity>

      {/* Contenido expandible */}
      {open && (
        <View style={styles.mainCard}>
          {/* Información de ruta */}
          <View style={styles.routeSection}>

            {/* Fila de recogida */}
            <View style={styles.routeRow}>
              <Text style={styles.routeDotGreen}>🟢</Text>
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Punto de recogida</Text>
                <Text style={styles.routeText} numberOfLines={2}>
                  {getPickupAddress() || "Ubicación del cliente"}
                </Text>
              </View>
            </View>

            {/* Fila de destino */}
            <View style={styles.routeRow}>
              <Text style={styles.routeDotFlag}>🏁</Text>
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeText} numberOfLines={3}>
                  {getDestinationDisplay() || "--"}
                </Text>
              </View>
            </View>

            <View style={styles.distanceRow}>
              <Ionicons name="navigate" size={16} color="#888" />
              <Text style={styles.distanceText}>
                Distancia: {" "}
                <Text style={styles.distanceValue}>
                  {item?.distanciaUsuario?.distanceMeters
                    ? `${(item.distanciaUsuario.distanceMeters / 1000).toFixed(1)} km`
                    : item?.distanciaDestino?.distanceMeters
                      ? `${(item.distanciaDestino.distanceMeters / 1000).toFixed(1)} km`
                      : "--"}
                </Text>
              </Text>
            </View>
          </View>

          {/* Tarifa */}
          <View style={styles.fareSection}>
            <Text style={styles.fareLabel}>Tarifa aceptada</Text>
            <Text style={styles.fareAmount}>{formatToCOP(getFare())}</Text>
          </View>

          {/* Navegación en dos etapas (recogida / destino), estilo apps tipo InDrive */}
          <Text style={styles.navSectionLabel}>Ir a la recogida</Text>
          <View style={styles.navButtonsRow}>
            <TouchableOpacity style={styles.navButton} onPress={() => openInMaps("waze", "pickup")}>
              <Ionicons name="navigate" size={20} color="#33CCFF" />
              <Text style={styles.navButtonText}>Waze</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => openInMaps("google", "pickup")}>
              <Ionicons name="map" size={20} color="#4285F4" />
              <Text style={styles.navButtonText}>Google Maps</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.navSectionLabel}>Ir al destino</Text>
          <View style={styles.navButtonsRow}>
            <TouchableOpacity style={styles.navButton} onPress={() => openInMaps("waze", "destination")}>
              <Ionicons name="flag" size={20} color="#33CCFF" />
              <Text style={styles.navButtonText}>Waze</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => openInMaps("google", "destination")}>
              <Ionicons name="flag" size={20} color="#4285F4" />
              <Text style={styles.navButtonText}>Google Maps</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Botones de acción */}
          <View style={styles.actionsSection}>
            {startPickupPoint && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => pickUpHandle(item.clientid)}
              >
                <Ionicons name="play-circle" size={20} color="#000" />
                <Text style={styles.primaryButtonText}>{item.tipoServicio == "domicilio" ? "Iniciar Domicilio" :"Iniciar Recogida"}</Text>
              </TouchableOpacity>
            )}

            {onWayTravel && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => startFinalTravel(item.clientid)}
              >
                <Ionicons name="navigate-circle" size={20} color="#000" />
                <Text style={styles.primaryButtonText}>{item.tipoServicio == "domicilio" ? "Llevar Domicilio" :"Iniciar Viaje"}</Text>
              </TouchableOpacity>
            )}

            {finishButton && (
              <>
                <TouchableOpacity
                  style={styles.finishTripButton}
                  onPress={() => setFinishConfirmVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-done-circle-outline" size={22} color="#FFC300" />
                  <Text style={styles.finishTripButtonText}>
                    {item.tipoServicio === "domicilio" ? "Finalizar domicilio" : "Finalizar viaje"}
                  </Text>
                </TouchableOpacity>

                <Modal
                  visible={finishConfirmVisible}
                  transparent
                  animationType="fade"
                  statusBarTranslucent
                  onRequestClose={() => setFinishConfirmVisible(false)}
                >
                  <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                      <Text style={styles.confirmTitle}>
                        {item.tipoServicio === "domicilio"
                          ? "¿Seguro que deseas finalizar el domicilio?"
                          : "¿Seguro que deseas finalizar el viaje?"}
                      </Text>
                      <Text style={styles.confirmSubtitle}>
                        Confirma solo cuando hayas llegado al destino y vayas a pasar al cobro con el
                        cliente. Si aún vas en camino, pulsa «No».
                      </Text>
                      <View style={styles.confirmActions}>
                        <TouchableOpacity
                          style={styles.confirmBtnSecondary}
                          onPress={() => setFinishConfirmVisible(false)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.confirmBtnSecondaryText}>No</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.confirmBtnPrimary}
                          onPress={() => {
                            setFinishConfirmVisible(false);
                            onFinishTravel(item.clientid);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.confirmBtnPrimaryText}>Sí, finalizar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              </>
            )}

            {!finishButton && (
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={cancelService}
              >
                <Ionicons name="close-circle-outline" size={20} color="#FFC300" />
                <Text style={styles.cancelText}>Cancelar Viaje</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 12,
  },

  // Tarjeta superior
  topCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 12,
  },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2A2A2A",
    borderWidth: 2,
    borderColor: "#FFC300",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 24,
  },
  clientInfo: {
    justifyContent: "center",
  },
  clientName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 2,
  },
  serviceType: {
    fontSize: 14,
    color: "#AAA",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  statusContainer: {
    alignItems: "flex-end",
    marginTop: 20
  },
  statusBadge: {
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
  statusText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#FFC300",
  },
  expandButton: {
    padding: 4,
  },

  // Tarjeta principal expandible
  mainCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },

  // Sección de ruta
  routeSection: {
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFC300",
    marginTop: 6,
    marginRight: 12,
  },
  routeDotGreen: {
    fontSize: 14,
    marginTop: 4,
    marginRight: 10,
  },
  routeDotFlag: {
    fontSize: 14,
    marginTop: 4,
    marginRight: 10,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 16,
    color: "#888",
    marginBottom: 4,
    fontWeight: "500",
  },
  routeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
    lineHeight: 20,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 22,
  },
  distanceText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  distanceValue: {
    color: "#FFC300",
    fontWeight: "700",
  },

  // Sección de tarifa
  fareSection: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  fareLabel: {
    fontSize: 13,
    color: "#888",
    marginBottom: 6,
    fontWeight: "500",
  },
  fareAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFC300",
    letterSpacing: 0.5,
  },

  navSectionLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  // Botones de navegación
  navButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 0,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#333",
  },
  navButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#2A2A2A",
    marginBottom: 16,
  },

  // Botones de acción
  actionsSection: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#FFC300",
    borderRadius: 12,
    paddingVertical: 14,
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
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  cancelButton: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFC300",
  },

  /** Botón de finalizar: estilo distinto al amarillo sólido de recogida/inicio para evitar toques por error */
  finishTripButton: {
    backgroundColor: "#141414",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#FFC300",
    marginTop: 4,
  },
  finishTripButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFC300",
  },

  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 26,
  },
  confirmSubtitle: {
    fontSize: 15,
    color: "#AAA",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 22,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
  },
  confirmBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnSecondaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#CCC",
  },
  confirmBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FFC300",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnPrimaryText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
  },
});