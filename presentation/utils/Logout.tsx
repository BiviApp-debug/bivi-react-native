
import { API_BASE_URL } from '../API/API';

export const logoutUser = async (phone:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
      credentials: 'include' // 👈 Importante para cookies
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al cerrar sesión');
    }

    console.log('✅ Sesión cerrada:', data.message);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Error logout:', error);
    return { success: false, error: "" };
  }
};

// ============================================
// LOGOUT CONDUCTOR (DRIVER)
// ============================================

export const logoutDriver = async (phone:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/logoutDriver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
      credentials: 'include' // 👈 Importante para cookies
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al cerrar sesión');
    }

    console.log('✅ Sesión conductor cerrada:', data.message);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Error logout driver:', error);
    return { success: false, error: error.message };
  }
};