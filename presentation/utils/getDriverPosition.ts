import { API_BASE_URL } from "../API/API";
export const getDriverPosition = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/driverpositions`);

    const data = await response.json();

    if (response.ok) {
      //console.log('📍 Posición del los conductores conductor:', data.data);
      return data.data; // contiene { id, user, position }
    } else {      
      console.warn('⚠️ Usuario no encontrado:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error de red al consultar posición:', error);
    return null;
  }
};
