import { API_BASE_URL } from "../API/API";

export const getTravelOptions = async (clientId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/travel-options/${clientId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error obteniendo travel options');
    }

    return await response.json();
  } catch (error) {
    console.error('getTravelOptions error:', error);
    return null;
  }
};


