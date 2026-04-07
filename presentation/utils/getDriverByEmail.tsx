import { API_BASE_URL } from '../API/API'

export const getDriverByEmail = async (email:string) => {
  try {
    // Endpoint actual de empresa
    let response = await fetch(`${API_BASE_URL}/companyMail/${email}`);

    // Fallback para compatibilidad con endpoint legacy
    if (!response.ok) {
      response = await fetch(`${API_BASE_URL}/driverMail/${email}`);
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;

  } catch (err) {
    console.log("Request error:", err);
    return null;
  }
};
