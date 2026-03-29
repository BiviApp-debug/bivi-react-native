/**
 * Helpers para historial de viajes (conductor y cliente): distancia, pago, primer nombre.
 */

/** Algunos endpoints devuelven el perfil en `{ data: { ... } }`. */
export function unwrapProfile(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== "object") return null;
  const r = res as Record<string, unknown>;
  if (r.data && typeof r.data === "object") {
    return r.data as Record<string, unknown>;
  }
  return r;
}

export function firstName(displayName: string): string {
  const t = (displayName || "").trim();
  if (!t) return "—";
  return t.split(/\s+/)[0];
}

/** Kilómetros aproximados del viaje si el backend guardó distancias en la factura. */
export function extractDistanceKmFromTravel(t: Record<string, unknown>): number | null {
  const fromMeters = (raw: unknown): number | null => {
    if (raw == null) return null;
    if (typeof raw === "number" && !isNaN(raw)) {
      return raw > 500 ? raw / 1000 : raw;
    }
    if (typeof raw === "object" && raw !== null && "distanceMeters" in raw) {
      const n = Number((raw as { distanceMeters?: unknown }).distanceMeters);
      return !isNaN(n) && n > 0 ? n / 1000 : null;
    }
    return null;
  };

  const dest =
    fromMeters(t.distanciaDestino) ??
    (typeof t.distancia_destino === "number" ? (t.distancia_destino as number) / 1000 : null);
  const pickup =
    fromMeters(t.distanciaUsuario) ??
    (typeof t.distancia_usuario === "number" ? (t.distancia_usuario as number) / 1000 : null);

  const km = dest && dest > 0 ? dest : pickup && pickup > 0 ? pickup : null;
  if (km == null || km <= 0) return null;
  return Math.round(km * 10) / 10;
}

export function formatDistanceLine(km: number | null): string | null {
  if (km == null) return null;
  if (km < 0.05) return null;
  const s = km >= 10 ? km.toFixed(0) : km.toFixed(1).replace(/\.0$/, "");
  return `≈ ${s} km`;
}

const METHOD_LABELS: [string, string][] = [
  ["efectivo", "Efectivo"],
  ["nequi", "Nequi"],
  ["daviplata", "Daviplata"],
  ["tarjeta", "Tarjeta"],
  ["pse", "PSE"],
];

export function paymentLineDriver(status: string, metodoPago?: string | null): string {
  const st = (status || "").toUpperCase().trim();
  const m = (metodoPago || "").toLowerCase().trim();

  const resolveClientPaymentMethod = () => {
    if (m.includes("efectivo")) return "Cliente pagó en efectivo";
    if (m.includes("pse")) return "Cliente pagó por PSE";
    if (m.includes("tarjeta")) return "Cliente pagó con tarjeta";
    if (m.includes("transfer")) return "Cliente pagó por transferencia";
    if (m.includes("nequi")) return "Cliente pagó por transferencia";
    if (m.includes("daviplata")) return "Cliente pagó por transferencia";
    return "Cliente pagó por la app";
  };

  if (st === "PAYED_CLIENT") return resolveClientPaymentMethod();

  if (st === "PAYED_DRIVER") {
    if (m.includes("efectivo")) return "Cliente pagó en efectivo";
    if (m.includes("transfer")) return "Cliente pagó por transferencia";
    if (m.includes("nequi")) return "Cliente pagó por transferencia";
    if (m.includes("daviplata")) return "Cliente pagó por transferencia";
    if (m.includes("tarjeta")) return "Cliente pagó con tarjeta";
    if (m.includes("pse")) return "Cliente pagó por PSE";
    return "Cliente pagó en efectivo";
  }

  if (st === "INVOICED") return "Facturado";

  return "";
}

export function paymentLineClient(status: string, metodoPago?: string | null): string {
  const st = (status || "").toUpperCase().trim();
  const m = (metodoPago || "").toLowerCase().trim();

  if (st === "PAYED_DRIVER") return "Pagaste en efectivo (o con el conductor)";

  if (st === "PAYED_CLIENT") {
    for (const [key, label] of METHOD_LABELS) {
      if (m.includes(key)) return `Pagaste · ${label}`;
    }
    return "Pagaste · app digital";
  }

  if (st === "INVOICED") return "Registrado";

  return "";
}

export function serviceTypeLine(tipo: string): string {
  switch ((tipo || "").toLowerCase()) {
    case "moto":
      return "Moto";
    case "carro":
    case "auto":
      return "Auto";
    case "domicilio":
      return "Domicilio";
    default:
      return tipo || "Servicio";
  }
}
