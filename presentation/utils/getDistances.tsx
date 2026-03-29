import { GoogleMapsApiKeytsx } from "../../data/sources/remote/api/GoogleMapsApiKey";

const MATRIX_CACHE_MS = 6 * 60 * 1000;
const matrixCache: Record<string, { row: any; t: number }> = {};

function matrixCacheKey(origin: any, destination: any): string | null {
  const oLat = origin?.latitude;
  const oLon = origin?.longitude;
  const dLat = destination?.latitude;
  const dLon = destination?.longitude;
  if (
    typeof oLat !== "number" ||
    typeof oLon !== "number" ||
    typeof dLat !== "number" ||
    typeof dLon !== "number"
  ) {
    return null;
  }
  return `${oLat.toFixed(4)},${oLon.toFixed(4)}|${dLat.toFixed(4)},${dLon.toFixed(4)}`;
}

function pruneMatrixCache() {
  const keys = Object.keys(matrixCache);
  if (keys.length <= 24) return;
  keys
    .sort((a, b) => matrixCache[a].t - matrixCache[b].t)
    .slice(0, keys.length - 20)
    .forEach((k) => delete matrixCache[k]);
}

export const getDistances = async (origin: any, destination: any) => {
  try {
    const key = matrixCacheKey(origin, destination);
    if (key) {
      const hit = matrixCache[key];
      if (hit && Date.now() - hit.t < MATRIX_CACHE_MS) {
        return hit.row;
      }
    }

    const response = await fetch(
      "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GoogleMapsApiKeytsx,
          "X-Goog-FieldMask":
            "originIndex,destinationIndex,duration,distanceMeters,status,condition",
        },
        body: JSON.stringify({
          origins: [
            {
              waypoint: {
                location: {
                  latLng: {
                    latitude: origin.latitude,
                    longitude: origin.longitude,
                  },
                },
              },
            },
          ],
          destinations: [
            {
              waypoint: {
                location: {
                  latLng: {
                    latitude: destination.latitude,
                    longitude: destination.longitude,
                  },
                },
              },
            },
          ],
          travelMode: "DRIVE",
        }),
      }
    );

    const data = await response.json();
    const row = data[0];
    if (key && row) {
      matrixCache[key] = { row, t: Date.now() };
      pruneMatrixCache();
    }
    return row;
  } catch (error) {
    console.error("❌ Error al consultar Distance Matrix:", error);
  }
};
