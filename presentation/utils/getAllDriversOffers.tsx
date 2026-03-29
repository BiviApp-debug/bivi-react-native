import { API_BASE_URL } from '../API/API'

export const getAllDriversOffers = async (user_app: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/allOffers?username=${user_app}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error('Error al obtener ofertas');

    const data = await res.json();
    return data; 
  } catch (err) {
    console.error('Error en getAllDriversOffers:', err);
    return [];
  }
};
