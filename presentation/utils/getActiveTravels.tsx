import { API_BASE_URL } from '../API/API'

export const getActiveTravelsByClient = async (clientid: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activeTravels/${clientid}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("GET activeTravels error:", error);
    return null;
  }
};

export const getActiveTravelsByConductor = async (conductor: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activeTravels/conductor/${conductor}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    });

    if (!response.ok) {
      throw new Error("Error consultando viajes activos");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error trayendo viajes activos:", error);
    return null;
  }
};
