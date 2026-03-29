import { API_BASE_URL } from "../API/API";

export const getTimeAndDistance = async (service: string) => {
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/time-and-distance?service=${encodeURIComponent(service)}`
    );

    if (!response.ok) {
      throw new Error('Error al obtener time and distance');
    }

    const data = await response.json();
    //console.log(data,"holas_resultados");
    
    return data;
  } catch (error) {
    console.error('❌ Error en getTimeAndDistance:', error);
    return null;
  }
};
