import { API_BASE_URL } from '../../../API/API';
import { savePhone } from '../../../utils/SavedPhoneFunctios';

export async function fetchWithRetry(url: string, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Reintento ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s antes de reintentar
    }
  }

  throw new Error('No se obtuvo respuesta del servidor');
}

export const saveMessageToFirestore = async (phone: string, password: string) => {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/loginCompany`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });

    const data = await response.json();

    if (response.ok) {
      const myStorage = phone + "[storage-driver]" + password;
      savePhone(myStorage);
      return data;
    } else {
      // Devolver el mensaje real del servidor para que la UI pueda mostrarlo
      const serverMessage = data?.error || data?.message || null;
      return { __loginError: true, message: serverMessage };
    }
  } catch (error) {
    console.error('❌ Error de red al iniciar sesión como conductor:', error);
    return { __loginError: true, message: null };
  }
}



export const updateDriverActiveStatus = async (phone:string , isActive:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/loginCompany/${phone}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ active: isActive}),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error al actualizar active:', data.error || data.message);
      throw new Error(data.error || 'Error al actualizar el estado');
    }

    return data;
  } catch (error) {
    const err = error as Error;
    console.error('⚠️ Error de red o servidor:', err.message);
    throw error;
  }
}


