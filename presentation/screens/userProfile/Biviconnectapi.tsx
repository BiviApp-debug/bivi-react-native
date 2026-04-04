import { API_BASE_URL } from "../../API/API";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================
// ⚠️ CORRECCIONES PRINCIPALES:
// 1. Backend solo tiene /api/missions, /api/offers (sin filtrado por usuario en URL)
// 2. Hay que pasar telecomCompanyNit en req.body
// 3. Las APIs de user-missions/complete, user-offers/watch-video SÍ existen
// 4. Agregar APIs faltantes del backend
// ============================================

// ============================================
// 👤 USUARIO
// ============================================

/**
 * Obtener usuario por ID
 */
export const getUserById = async (userId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error obteniendo usuario');
    }

    const data = await response.json();
    return data.user;

  } catch (error: any) {
    console.error('❌ Error en getUserById:', error.message);
    throw error;
  }
};

/**
 * Obtener usuario por teléfono
 */
export const getUserByPhone = async (phone: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/getuserByPhone/${phone}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Usuario no encontrado');
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error('❌ Error en getUserByPhone:', error.message);
    return null;
  }
};

/**
 * Obtener usuario por email
 */
export const getUserByEmail = async (email: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/getuserByMail/${email}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Usuario no encontrado');
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error('❌ Error en getUserByEmail:', error.message);
    return null;
  }
};

/**
 * Actualizar preferencias del usuario
 */
export const updateUserPreferences = async (
  userId: string,
  preferences: any
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/user/${userId}/preferences`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Preferencias actualizadas');
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en updateUserPreferences:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 🔐 AUTENTICACIÓN
// ============================================

/**
 * Enviar código de verificación por SMS
 */
export const sendVerificationCode = async (phone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/send-verification-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Código enviado');
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en sendVerificationCode:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Verificar código SMS
 */
export const verifyCode = async (phone: string, code: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, code }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Código verificado');
      return { success: true, verified: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en verifyCode:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Registrar nuevo usuario
 */
export const registerUser = async (userData: {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth: string;
  age: number;
  isMinor: boolean;
  documentUrl?: string;
  documentType?: string;
  location?: string;
  preferences?: any;
  telecomCompanyNit?: string;
  telecomCompanyName?: string;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/userRegister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Usuario registrado');
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en registerUser:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Login de usuario
 */
export const loginUser = async (phone: string, password: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, password }),
    });

    const data = await response.json();

    if (response.ok && data.message) {
      console.log('✅ Login exitoso');
      await AsyncStorage.setItem('access_token', data.token);
      await AsyncStorage.setItem('userPhone', phone);
      return { success: true, token: data.token, usuario: data.usuario };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en loginUser:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Logout de usuario
 */
export const logoutUser = async (phone: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });

    if (response.ok) {
      console.log('✅ Logout exitoso');
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('userPhone');
      return { success: true };
    } else {
      const data = await response.json();
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en logoutUser:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Resetear contraseña
 */
export const resetPassword = async (phone: string, newPassword: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, newPassword }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Contraseña reseteada');
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en resetPassword:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📱 EMPRESAS DE TELEFONÍA
// ============================================

/**
 * Obtener todas las empresas de telefonía
 */
export const getTelecomCompanies = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/telecom-companies`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Empresas de telefonía obtenidas');
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en getTelecomCompanies:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener empresas de telefonía por país
 */
export const getTelecomCompaniesByCountry = async (isoCode: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/telecom-companies/country/${isoCode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Empresas para ${isoCode} obtenidas`);
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en getTelecomCompaniesByCountry:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener detalle de una empresa de telefonía
 */
export const getTelecomCompanyDetail = async (companyId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/telecom-companies/${companyId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Detalle de empresa obtenido');
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en getTelecomCompanyDetail:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📋 MISIONES ✅ NUEVO
// ============================================

/**
 * Obtener todas las misiones disponibles
 */
export const getMissions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/missions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.data.length} misiones obtenidas`);
      return {
        success: true,
        data: data.data.map((mission: any) => ({
          ...mission,
          reward_points: mission.reward_points,
        })),
      };
    }
    return { success: false, error: data.error, data: [] };
  } catch (err: any) {
    console.error('❌ Error en getMissions:', err);
    return { success: false, error: err.message, data: [] };
  }
};

/**
 * Obtener detalle de una misión
 */
export const getMissionDetail = async (missionId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/missions/${missionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Misión ${missionId} obtenida`);
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    console.error('❌ Error en getMissionDetail:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Completar una misión
 */
export const completeMission = async (
  userPhone: string,
  missionId: string
) => {
  try {
    if (!userPhone || !missionId) {
      return { success: false, error: 'Faltan datos' };
    }

    console.log(`✅ Completando misión ${missionId} para ${userPhone}`);

    const response = await fetch(`${API_BASE_URL}/api/user-missions/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPhone: userPhone.trim(),
        missionId: missionId.trim(),
        completedAt: new Date().toISOString(),
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(
        `✅ Misión completada. Puntos: ${data.data.rewardPoints}`
      );
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    console.error('❌ Error en completeMission:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Obtener historial de misiones del usuario
 */
export const getUserMissionHistory = async (userPhone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/user-missions/history/${userPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.data.length} misiones en historial`);
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error, data: [] };
  } catch (error: any) {
    console.error('❌ Error en getUserMissionHistory:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Redimir puntos de una misión
 */
export const redeemMissionPoints = async (
  userPhone: string,
  historyId: string,
  telecomCompanyNit: string
) => {
  try {
    if (!userPhone || !historyId) {
      return { success: false, error: 'Faltan datos' };
    }

    console.log(`💰 Redimiendo misión ${historyId} para ${userPhone}`);

    const response = await fetch(`${API_BASE_URL}/api/user-missions/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPhone: userPhone.trim(),
        historyId: historyId.trim(),
        telecomCompanyNit,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ Misión redimida. Puntos: ${data.pointsRedeemed}`);
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    console.error('❌ Error en redeemMissionPoints:', err);
    return { success: false, error: err.message };
  }
};

// ============================================
// 📺 OFERTAS / VIDEOS ✅ NUEVO
// ============================================

/**
 * Obtener todas las ofertas disponibles
 */
export const getOffers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/offers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.data.length} videos obtenidos`);
      return {
        success: true,
        data: data.data.map((offer: any) => ({
          ...offer,
          reward_points: offer.reward_points,
        })),
      };
    }
    return { success: false, error: data.error, data: [] };
  } catch (err: any) {
    console.error('❌ Error en getOffers:', err);
    return { success: false, error: err.message, data: [] };
  }
};

/**
 * Obtener detalle de una oferta
 */
export const getOfferDetail = async (offerId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Oferta ${offerId} obtenida`);
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    console.error('❌ Error en getOfferDetail:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Registrar video visto
 */
export const watchVideo = async (
  userPhone: string,
  offerId: string,
  duration: number = 0
) => {
  try {
    if (!userPhone || !offerId) {
      return { success: false, error: 'Faltan datos' };
    }

    console.log(`🎥 Registrando video ${offerId} para ${userPhone}`);

    const response = await fetch(
      `${API_BASE_URL}/api/user-offers/watch-video`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhone: userPhone.trim(),
          offerId: offerId.trim(),
          watchedAt: new Date().toISOString(),
          duration: duration || 0,
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(
        `✅ Video registrado. Puntos: ${data.data.rewardPoints}`
      );
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    console.error('❌ Error en watchVideo:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Obtener historial de videos del usuario
 */
export const getUserOfferHistory = async (userPhone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/user-offers/history/${userPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.data.length} videos en historial`);
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error, data: [] };
  } catch (error: any) {
    console.error('❌ Error en getUserOfferHistory:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Redimir puntos de un video
 */
export const redeemOfferPoints = async (
  userPhone: string,
  historyId: string,
  telecomCompanyNit: string
) => {
  try {
    if (!userPhone || !historyId) {
      return { success: false, error: 'Faltan datos' };
    }

    console.log(`💰 Redimiendo video ${historyId} para ${userPhone}`);

    const response = await fetch(`${API_BASE_URL}/api/user-offers/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPhone: userPhone.trim(),
        historyId: historyId.trim(),
        telecomCompanyNit,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ Video redimido. Puntos: ${data.pointsRedeemed}`);
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    console.error('❌ Error en redeemOfferPoints:', err);
    return { success: false, error: err.message };
  }
};

// ============================================
// 📊 ANALYTICS Y HISTORIAL ✅ NUEVO
// ============================================

/**
 * Obtener analytics del usuario
 */
export const getUserAnalytics = async (userPhone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/user-analytics/${userPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Analytics obtenidos');
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    console.error('❌ Error en getUserAnalytics:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Obtener historial completo del usuario
 */
export const getUserHistory = async (userPhone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/user-history/${userPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.data.length} eventos en historial`);
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error, data: [] };
  } catch (err: any) {
    console.error('❌ Error en getUserHistory:', err);
    return { success: false, error: err.message, data: [] };
  }
};

/**
 * Obtener resumen de redenciones del usuario
 */
export const getUserRedemptions = async (userPhone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/user-redemptions/${userPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      return { success: true, totalRedeemed: data.totalRedeemed, data: data.data };
    }
    return { success: false, error: data.error, data: [] };
  } catch (err: any) {
    console.error('❌ Error en getUserRedemptions:', err);
    return { success: false, error: err.message, data: [] };
  }
};

/**
 * Obtener resumen de redenciones pendientes
 */
export const getRedemptionsSummary = async (userPhone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/user-redemptions-summary/${userPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.pendingRedemptions };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    console.error('❌ Error en getRedemptionsSummary:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Obtener gráfico de actividad por día
 */
export const getUserActivityChart = async (userPhone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/user-activity-chart/${userPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    console.error('❌ Error en getUserActivityChart:', err);
    return { success: false, error: err.message };
  }
};

// ============================================
// 💳 MÉTODOS DE PAGO
// ============================================

/**
 * Guardar método de pago
 */
export const savePaymentMethod = async (
  clientId: string,
  paymentMethod: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payment-method`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientId, paymentMethod }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Método de pago guardado');
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en savePaymentMethod:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener métodos de pago del usuario
 */
export const getPaymentMethods = async (userPhone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/payment-methods/${userPhone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.payment_methods.length} métodos encontrados`);
      return { success: true, data: data.payment_methods };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en getPaymentMethods:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📸 FOTO DE PERFIL
// ============================================

/**
 * Subir foto de perfil del cliente
 */
export const uploadClientProfilePhoto = async (
  phone: string,
  profilePhoto: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/client-profile-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, profilePhoto }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Foto de perfil guardada');
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en uploadClientProfilePhoto:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener foto de perfil del cliente
 */
export const getClientProfilePhoto = async (phone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/client-profile-photo/${phone}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error: any) {
    console.error('❌ Error en getClientProfilePhoto:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Eliminar foto de perfil del cliente
 */
export const deleteClientProfilePhoto = async (phone: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/client-profile-photo/${phone}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Foto de perfil eliminada');
      return { success: true };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error: any) {
    console.error('❌ Error en deleteClientProfilePhoto:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📧 EMAIL Y SMS
// ============================================

/**
 * Enviar email
 */
export const sendEmail = async (
  to: string,
  subject: string,
  text: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, text }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Email enviado');
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en sendEmail:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar SMS
 */
export const sendSMS = async (to: string, message: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, message }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ SMS enviado');
      return { success: true, sid: data.sid };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en sendSMS:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📊 RATING
// ============================================

/**
 * Obtener rating del usuario
 */
export const getUserRating = async (phone: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ratings/${phone}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, rating: data.rating };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error: any) {
    console.error('❌ Error en getUserRating:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Crear rating
 */
export const createRating = async (phone: string, rating: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: phone, rating }),
    });

    const data = await response.json();

    if (response.ok && data.message) {
      console.log('✅ Rating creado');
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en createRating:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Actualizar rating
 */
export const updateRating = async (phone: string, rating: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ratings/${phone}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating }),
    });

    const data = await response.json();

    if (response.ok && data.message) {
      console.log('✅ Rating actualizado');
      return { success: true };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error: any) {
    console.error('❌ Error en updateRating:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 🏠 DELIVERY DATA
// ============================================

/**
 * Crear o actualizar datos de envío
 */
export const createDeliveryData = async (deliveryData: {
  clientId: string;
  travelId?: string;
  weightRange: string;
  description: string;
  itemValue?: number;
  recipientName?: string;
  recipientPhone?: string;
  specialInstructions?: string;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/delivery/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deliveryData),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Datos de envío guardados');
      return { success: true, deliveryId: data.deliveryId, data: data.data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en createDeliveryData:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 🛣️ TRAVEL OPTIONS
// ============================================

/**
 * Guardar opciones de viaje
 */
export const saveTravelOptions = async (clientId: string, options: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/travel-options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        ...options,
      }),
    });

    const data = await response.json();

    if (data.message) {
      console.log('✅ Opciones de viaje guardadas');
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en saveTravelOptions:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener opciones de viaje
 */
export const getTravelOptions = async (clientId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/travel-options/${clientId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.clientId) {
      return { success: true, data };
    } else {
      return { success: false, error: 'No encontrado' };
    }
  } catch (error: any) {
    console.error('❌ Error en getTravelOptions:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 🚗 POSICIONES / UBICACIONES
// ============================================

/**
 * Actualizar posición del usuario
 */
export const updateUserPosition = async (
  username: string,
  position: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/userposition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, position }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en updateUserPosition:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Actualizar posición del conductor
 */
export const updateDriverPosition = async (
  username: string,
  position: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/driverposition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, position }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en updateDriverPosition:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener todas las posiciones de conductores
 */
export const getDriverPositions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/driverpositions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en getDriverPositions:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 💬 MENSAJES
// ============================================

/**
 * Obtener mensajes entre cliente y conductor
 */
export const getMessages = async (clientId: string, driver: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/messages?clientId=${clientId}&driver=${driver}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      return { success: true, messages: data.messages };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en getMessages:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar mensaje
 */
export const sendMessage = async (
  clientId: string,
  driver: string,
  sender: string,
  msg: string,
  messageType: string = 'text',
  mediaUrl?: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msg,
        clientId,
        driver,
        sender,
        messageType,
        mediaUrl: mediaUrl || null,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, messageId: data.id };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en sendMessage:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📍 UTILIDADES
// ============================================

/**
 * Obtener países disponibles
 */
export const getCountries = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/countries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return { success: true, data: data.rows || [] };
  } catch (error: any) {
    console.error('❌ Error en getCountries:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Calcular tarifa de viaje
 */
export const calculateFare = async (
  vehicleType: string,
  distanceMeters: number,
  durationMinutes: number
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/calculate-fare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vehicleType,
        distanceMeters,
        durationMinutes,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, fare: data.fare };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en calculateFare:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Verificar estado del servidor
 */
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return { success: data.status === 'ok', data };
  } catch (error: any) {
    console.error('❌ Error en checkHealth:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 🎯 TIPOS DE DATOS / INTERFACES ✅ NUEVO
// ============================================

export interface Mission {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  reward_points: number;
  duration: string;
  type: "survey" | "task" | "form";
  icon: string;
  imageUrl?: string;
  status: "active" | "inactive";
  telecomCompanyNit?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  reward_points: number;
  duration: string;
  type: "video" | "survey" | "promotional";
  icon: string;
  videoUrl?: string;
  companyName: string;
  imageUrl?: string;
  status: "active" | "inactive";
  telecomCompanyNit?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TelecomCompany {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  isoCode: string;
  nit: string;
  active: boolean;
  currency: string;
  currencySymbol: string;
  logo?: string;
  phoneFormat?: string;
  minPhoneLength?: number;
  maxPhoneLength?: number;
  description?: string;
  website?: string;
  supportPhone?: string;
  email?: string;
}

export interface UserData {
  id: number;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  age: number;
  isMinor: boolean;
  role: string;
  verified: boolean;
  telecomCompanyNit?: string;
  telecomCompanyName?: string;
  location?: string;
  [key: string]: any;
}