import { API_BASE_URL } from "../API/API";

/**
 * Guarda las opciones de viaje del usuario
 * @param payload - Objeto con las opciones del viaje
 * @returns Respuesta del servidor
 */
export const saveTravelOptions = async (payload: any) => {
  try {
    console.log('🔗 URL:', `${API_BASE_URL}/travel-options`);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(
      `${API_BASE_URL}/travel-options`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      }
    );

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    // Leer el cuerpo de la respuesta
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    if (!response.ok) {
      let errorMessage = 'Error guardando travel options';
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorData.message || errorMessage;
        console.error('❌ Error del servidor:', errorData);
      } catch (e) {
        console.error('❌ Respuesta no JSON:', responseText);
      }

      throw new Error(errorMessage);
    }

    // Parsear la respuesta exitosa
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.warn('⚠️ Respuesta exitosa pero no es JSON');
      return { success: true };
    }

  } catch (error: any) {
    console.error('❌ saveTravelOptions error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
};

/**
 * Obtiene las opciones de viaje guardadas del usuario
 * @param clientId - ID del cliente (teléfono)
 * @returns Opciones de viaje del usuario
 */
export const getTravelOptions = async (clientId: string) => {
  try {
    console.log('🔗 URL:', `${API_BASE_URL}/travel-options/${clientId}`);

    const response = await fetch(
      `${API_BASE_URL}/travel-options/${clientId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      }
    );

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    if (!response.ok) {
      let errorMessage = 'Error obteniendo travel options';
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorData.message || errorMessage;
        console.error('❌ Error del servidor:', errorData);
      } catch (e) {
        console.error('❌ Respuesta no JSON:', responseText);
      }

      throw new Error(errorMessage);
    }

    try {
      const data = JSON.parse(responseText);
      console.log('✅ Travel options obtenidas:', data);
      return data;
    } catch (e) {
      console.error('❌ Error parseando respuesta');
      return null;
    }

  } catch (error: any) {
    console.error('❌ getTravelOptions error:', error);
    console.error('❌ Error message:', error.message);
    throw error;
  }
};

