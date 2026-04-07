import { API_BASE_URL } from '../API/API'

export const getDriverByPhone = async (phone:string) => {
  try {
    // Primero consultamos el perfil de empresa registrado.
    let response = await fetch(`${API_BASE_URL}/companyPhone/${phone}`);

    // Fallback para compatibilidad con backends antiguos.
    if (!response.ok) {
      response = await fetch(`${API_BASE_URL}/loginCompany/${phone}`);
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
