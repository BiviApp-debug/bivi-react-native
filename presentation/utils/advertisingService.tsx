import { API_BASE_URL } from '../API/API';

export const getAdvertising = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/advertising`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error obteniendo advertising');
    }

    return await response.json();
  } catch (error) {
    console.error('getAdvertising error:', error);
    return [];
  }
};
