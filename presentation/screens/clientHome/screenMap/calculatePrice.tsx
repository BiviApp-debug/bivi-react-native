// calculatePrice.ts - Nueva versión dinámica

import { API_BASE_URL } from "../../../API/API";

export const calcularTarifaDinamica = async (
  tiempo_minutos: number,
  distancia_metros: number,
  tipo_vehiculo: string
): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/calculate-fare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vehicleType: tipo_vehiculo,
        distanceMeters: distancia_metros,
        durationMinutes: tiempo_minutos
      })
    });

    if (!response.ok) {
      throw new Error('Error calculando tarifa');
    }

    const data = await response.json();
    return data.fare;

  } catch (error) {
    console.error('Error en calcularTarifaDinamica:', error);
    // Fallback a cálculo local si falla el servidor
    return calcularTarifaLocal(tiempo_minutos, distancia_metros, tipo_vehiculo);
  }
};

// Función local de respaldo
const calcularTarifaLocal = (
  tiempo: number,
  distancia: number,
  tipo_vehiculo: string
): number => {
  const distancia_km = distancia / 1000;
  const vehiculo = tipo_vehiculo.toUpperCase();

  // Precios por defecto en caso de fallo del servidor
  if (vehiculo === 'MOTO' || vehiculo === 'DOMICILIO') {
    if (distancia_km < 1) return 4500;
    if (distancia_km < 3) return 5500;
    if (distancia_km < 5) return 6500;
    if (distancia_km < 7) return 6500;
    if (distancia_km <= 10) return 7500;
    if (distancia_km < 15) return Math.round((distancia_km * 1000) + (tiempo * 100));
    return Math.round((distancia_km * 1000 * 2) + (tiempo * 100));
  } else if (vehiculo === 'CARRO') {
    if (distancia_km < 1) return 7500;
    if (distancia_km < 2) return 8000;
    if (distancia_km < 5) return 8500;
    if (distancia_km < 7) return 9500;
    if (distancia_km <= 10) return 10500;
    if (distancia_km < 15) return Math.round((distancia_km * 1200) + (tiempo * 150));
    if (distancia_km <= 42) return Math.round((distancia_km * 1200 * 2) + (tiempo * 150));
    return Math.round((distancia_km * 1200) + (tiempo * 150));
  }

  return 0;
};

export default calcularTarifaDinamica;