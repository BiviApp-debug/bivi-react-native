import { API_BASE_URL } from "../API/API";

export  const getTravelByClientId = async (clientid: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/travelsbackup/${clientid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    });

    if (!response.ok) {
      throw new Error("Error consultando viajes");
    }

    const data = await response.json();
    return data; 
  } catch (error) {
    console.log("Error trayendo viajes:", error);
    return null;
  }
};

