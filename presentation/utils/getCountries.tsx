 import { API_BASE_URL } from '../API/API'
 export const getCountries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/countries`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error cargando países:", error);
    }
  };