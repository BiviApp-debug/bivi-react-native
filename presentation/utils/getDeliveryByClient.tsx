import { API_BASE_URL } from "../API/API";

export const getDeliveryByClient = async (clientId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/delivery/client/${clientId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    });

    if (!response.ok) {
      throw new Error("Error consultando envío");
    }

    const data = await response.json();
    console.log(data,"delivery_data");
    
    return data;
  } catch (error) {
    console.log("Error trayendo envío:", error);
    return null;
  }
};