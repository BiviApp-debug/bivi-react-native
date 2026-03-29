import { API_BASE_URL } from "../API/API";

export const fetchMessages = async (clientId: string, driverId: string) => {
  try {
    // ✅ Enviar como query params
    const response = await fetch(
      `${API_BASE_URL}/api/messages?clientId=${clientId}&driver=${driverId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      }
    );

    if (!response.ok) {
      throw new Error("Error consultando mensajes");
    }

    const data = await response.json();
    console.log("las_datas",data);
    
    // ✅ Retornar solo el array de mensajes
    return data.messages || [];
    

  } catch (error) {
    console.log("Error trayendo mensajes:", error);
    return [];
  }
};