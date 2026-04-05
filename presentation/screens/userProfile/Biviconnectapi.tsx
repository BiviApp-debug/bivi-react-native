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

/**
 * Actualizar perfil completo del usuario
 */
export const updateUserProfile = async (
  userId: string,
  updateData: {
    name?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    age?: number;
    isMinor?: boolean;
    documentUrl?: string;
    documentType?: string;
    location?: string;
    preferences?: any;
    gender?: string;
    interests?: any;
    telecomCompanyNit?: string;
    telecomCompanyName?: string;
  }
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Si no es JSON, usar el mensaje de status
      }
      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    if (data.success) {
      console.log('✅ Perfil actualizado:', data.updatedFields);
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error('❌ Error en updateUserProfile:', error.message);
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
 * Obtener todas las misiones disponibles filtradas por NIT del usuario
 */
export const getMissions = async (userPhone: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/missions?userPhone=${encodeURIComponent(userPhone)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ Respuesta no es JSON:', contentType);
      return { success: false, error: 'Error del servidor', data: [] };
    }

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.data.length} misiones obtenidas`);
      return {
        success: true,
        data: data.data.map((mission: any) => ({
          ...mission,
          reward_points: mission.reward_points,
          // Asegurar que preferences es un objeto
          preferences: mission.preferences ? 
            (typeof mission.preferences === 'string' ? JSON.parse(mission.preferences) : mission.preferences) 
            : null,
        })),
      };
    }
    return { success: false, error: data.error || 'Error desconocido', data: [] };
  } catch (err: any) {
    console.error('❌ Error en getMissions:', err.message);
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
    if (!userPhone) {
      console.warn('⚠️ getUserMissionHistory: userPhone vacío');
      return { success: true, data: [] };
    }

    const url = `${API_BASE_URL}/api/user-missions/history/${encodeURIComponent(userPhone)}`;
    console.log(`📜 Fetching: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Historial misiones ${response.status}`);
      return { success: true, data: [] };
    }

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data || [] };
    }
    return { success: true, data: [] };
  } catch (error: any) {
    console.error('❌ Error en getUserMissionHistory:', error.message);
    return { success: true, data: [] };
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
 * Obtener todas las ofertas disponibles filtradas por NIT del usuario
 */
export const getOffers = async (userPhone: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/offers?userPhone=${encodeURIComponent(userPhone)}`, {
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
    if (!userPhone) {
      console.warn('⚠️ getUserOfferHistory: userPhone vacío');
      return { success: true, data: [] };
    }

    const url = `${API_BASE_URL}/api/user-offers/history/${encodeURIComponent(userPhone)}`;
    console.log(`📜 Fetching: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
     headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`⚠️ Historial videos ${response.status}`);
      return { success: true, data: [] };
    }

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data || [] };
    }
    return { success: true, data: [] };
  } catch (error: any) {
    console.error('❌ Error en getUserOfferHistory:', error.message);
    return { success: true, data: [] };
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

/**
 * Obtener todas las encuestas disponibles filtradas por NIT del usuario
 */
export const getSurveys = async (userPhone: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/surveys?userPhone=${encodeURIComponent(userPhone)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Verificar status
    if (!response.ok) {
      console.error(`❌ Error HTTP ${response.status}: ${response.statusText}`);
      return { success: false, error: `Error ${response.status}`, data: [] };
    }

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Respuesta no es JSON:', text.substring(0, 200));
      return { success: false, error: 'Error del servidor', data: [] };
    }

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.data.length} encuestas obtenidas`);
      return {
        success: true,
        data: data.data.map((survey: any) => ({
          ...survey,
          reward_points: survey.reward_points,
          // Parsear questions si es string
          questions: survey.questions ? 
            (typeof survey.questions === 'string' ? JSON.parse(survey.questions) : survey.questions) 
            : [],
          // Parsear preferences si es string
          preferences: survey.preferences ? 
            (typeof survey.preferences === 'string' ? JSON.parse(survey.preferences) : survey.preferences) 
            : null,
        })),
      };
    }
    return { success: false, error: data.error || 'Error desconocido', data: [] };
  } catch (err: any) {
    console.error('❌ Error en getSurveys:', err.message);
    return { success: false, error: err.message, data: [] };
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

export type UnifiedActivityType = 'mission' | 'offer' | 'survey' | 'game';

export interface UnifiedHistoryItem {
  id: string;
  type: UnifiedActivityType;
  title: string;
  points: number;
  completedAt: string;
}

const getUnifiedHistoryPointsValue = (item: any): number => {
  const value =
    item?.pointsEarned ??
    item?.rewardPoints ??
    item?.pointsRedeemed ??
    item?.points ??
    item?.reward_points ??
    0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getUnifiedHistoryCompletedDate = (item: any): string => {
  return (
    item?.completedAt ||
    item?.playedAt ||
    item?.watchedAt ||
    item?.createdAt ||
    item?.created_at ||
    new Date().toISOString()
  );
};

const asUnifiedHistoryMapById = (items: any[] | undefined): Record<string, any> => {
  if (!Array.isArray(items)) return {};
  return items.reduce((acc: Record<string, any>, item: any) => {
    if (item?.id !== undefined && item?.id !== null) {
      acc[String(item.id)] = item;
    }
    return acc;
  }, {});
};

export const getUnifiedUserHistory = async (userPhone: string) => {
  try {
    if (!userPhone) {
      return { success: true, data: [] as UnifiedHistoryItem[] };
    }

    const [missionHistoryRes, offerHistoryRes, surveyHistoryRes, gameHistoryRes, missionsRes, offersRes, surveysRes, gamesRes] = await Promise.all([
      getUserMissionHistory(userPhone),
      getUserOfferHistory(userPhone),
      getUserSurveyHistory(userPhone),
      getUserGameHistory(userPhone),
      getMissions(userPhone),
      getOffers(userPhone),
      getSurveys(userPhone),
      getGames(userPhone),
    ]);

    const missionMap = asUnifiedHistoryMapById(missionsRes?.success ? missionsRes.data : []);
    const offerMap = asUnifiedHistoryMapById(offersRes?.success ? offersRes.data : []);
    const surveyMap = asUnifiedHistoryMapById(surveysRes?.success ? surveysRes.data : []);
    const gameMap = asUnifiedHistoryMapById(gamesRes?.success ? gamesRes.data : []);

    const missionItems: UnifiedHistoryItem[] = (missionHistoryRes?.success ? missionHistoryRes.data : []).map((history: any, index: number) => {
      const missionId = String(history?.missionId ?? history?.itemId ?? history?.id ?? `m-${index}`);
      const mission = missionMap[missionId];
      return {
        id: String(history?.id ?? `mission-${missionId}-${index}`),
        type: 'mission',
        title: mission?.title || history?.missionTitle || `Mision ${missionId}`,
        points: getUnifiedHistoryPointsValue(history),
        completedAt: getUnifiedHistoryCompletedDate(history),
      };
    });

    const offerItems: UnifiedHistoryItem[] = (offerHistoryRes?.success ? offerHistoryRes.data : []).map((history: any, index: number) => {
      const offerId = String(history?.offerId ?? history?.itemId ?? history?.id ?? `o-${index}`);
      const offer = offerMap[offerId];
      return {
        id: String(history?.id ?? `offer-${offerId}-${index}`),
        type: 'offer',
        title: offer?.title || history?.offerTitle || `Video ${offerId}`,
        points: getUnifiedHistoryPointsValue(history),
        completedAt: getUnifiedHistoryCompletedDate(history),
      };
    });

    const surveyItems: UnifiedHistoryItem[] = (surveyHistoryRes?.success ? surveyHistoryRes.data : []).map((history: any, index: number) => {
      const surveyId = String(history?.surveyId ?? history?.itemId ?? history?.id ?? `s-${index}`);
      const survey = surveyMap[surveyId];
      return {
        id: String(history?.id ?? `survey-${surveyId}-${index}`),
        type: 'survey',
        title: survey?.title || history?.surveyTitle || `Encuesta ${surveyId}`,
        points: getUnifiedHistoryPointsValue(history),
        completedAt: getUnifiedHistoryCompletedDate(history),
      };
    });

    const gameItems: UnifiedHistoryItem[] = (gameHistoryRes?.success ? gameHistoryRes.data : []).map((history: any, index: number) => {
      const gameId = String(history?.gameId ?? history?.itemId ?? history?.id ?? `g-${index}`);
      const game = gameMap[gameId];
      return {
        id: String(history?.id ?? `game-${gameId}-${index}`),
        type: 'game',
        title: game?.title || history?.gameTitle || `Juego ${gameId}`,
        points: getUnifiedHistoryPointsValue(history),
        completedAt: getUnifiedHistoryCompletedDate(history),
      };
    });

    const merged = [...missionItems, ...offerItems, ...surveyItems, ...gameItems].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    return { success: true, data: merged };
  } catch (err: any) {
    console.error('❌ Error en getUnifiedUserHistory:', err);
    return { success: false, error: err.message, data: [] as UnifiedHistoryItem[] };
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
    return { success: "ok"};
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
  preferences?: PreferencesData;
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
  video_url?: string;
  videoUrl?: string;
  companyName: string;
  imageUrl?: string;
  status: "active" | "inactive";
  telecomCompanyNit?: string;
  preferences?: PreferencesData;
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
  gender?: string;
  interests?: string[];
  location?: string;
  isMinor: boolean;
  role: string;
  verified: boolean;
  telecomCompanyNit?: string;
  telecomCompanyName?: string;
  [key: string]: any;
}

/**
 * Preferencias para filtrado de misiones, ofertas y encuestas ✅ NUEVO
 */
export interface PreferencesData {
  ageRange?: string[];
  gender?: string[];
  interests?: string[];
  minAge?: number;
  maxAge?: number;
  locations?: string[];
}

/**
 * Encuesta con preguntas ✅ NUEVO
 */
export interface Survey {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  full_description?: string;
  reward_points: number;
  reward?: string;
  duration: string;
  questions?: SurveyQuestion[];
  icon: string;
  status: "active" | "inactive";
  preferences?: PreferencesData;
  telecomCompanyNit?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Pregunta de encuesta ✅ NUEVO
 */
export interface SurveyQuestion {
  id: number;
  type: "rating" | "multiple_choice" | "yes_no" | "text";
  question: string;
  options?: string[];
  scale?: number;
  required: boolean;
}

/**
 * Helper function para verificar si un usuario aplica para preferences ✅ NUEVO
 */
export const userMatchesPreferences = (user: any, preferences?: PreferencesData): boolean => {
  if (!preferences) return true;

  // Verificar edad mínima
  if (preferences.minAge && user.age < preferences.minAge) return false;
  
  // Verificar edad máxima
  if (preferences.maxAge && user.age > preferences.maxAge) return false;

  // Verificar género
  if (preferences.gender && preferences.gender.length > 0) {
    if (user.gender && !preferences.gender.includes(user.gender)) return false;
  }

  // Verificar intereses
  if (preferences.interests && preferences.interests.length > 0 && user.interests && user.interests.length > 0) {
    const hasMatch = user.interests.some((interest:any) => preferences.interests?.includes(interest));
    if (!hasMatch) return false;
  }

  // Verificar ubicación
  if (preferences.locations && preferences.locations.length > 0) {
    if (user.location && !preferences.locations.includes(user.location)) return false;
  }

  return true;
};




// ============================================
// 🎮 GAMES ✅ NUEVO - AÑADIDO
// ============================================

const parseGameJsonArray = (value: any) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

/**
 * Obtener todos los juegos disponibles filtrados por NIT del usuario
 */
export const getGames = async (userPhone: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/games?userPhone=${encodeURIComponent(userPhone)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.data.length} juegos obtenidos`);
      return {
        success: true,
        data: data.data.map((game: any) => ({
          ...game,
          reward_points: game.reward_points,
          questions: parseGameJsonArray(game.questions),
          answers: parseGameJsonArray(game.answers),
        })),
      };
    }
    return { success: false, error: data.error, data: [] };
  } catch (err: any) {
    console.error('❌ Error en getGames:', err);
    return { success: false, error: err.message, data: [] };
  }
};

/**
 * Obtener detalle de un juego
 */
export const getGameDetail = async (gameId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/games/${gameId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Juego ${gameId} obtenido`);
      return {
        success: true,
        data: {
          ...data.data,
          questions: parseGameJsonArray(data.data?.questions),
          answers: parseGameJsonArray(data.data?.answers),
        },
      };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    console.error('❌ Error en getGameDetail:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Registrar juego jugado
 */
export const playGame = async (
  userPhone: string,
  gameId: string,
  score: number = 0,
  duration: number = 0
) => {
  try {
    if (!userPhone || !gameId) {
      return { success: false, error: 'Faltan datos' };
    }

    console.log(`🎮 Registrando juego ${gameId} para ${userPhone}`);

    const response = await fetch(`${API_BASE_URL}/api/user-games/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPhone: userPhone.trim(),
        gameId: gameId.trim(),
        score: score || 0,
        playedAt: new Date().toISOString(),
        duration: duration || 0,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ Juego registrado. Puntos: ${data.pointsEarned ?? 0}`);
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    console.error('❌ Error en playGame:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Obtener historial de juegos del usuario
 */
export const getUserGameHistory = async (userPhone: string) => {
  try {
    if (!userPhone) {
      return { success: true, data: [] };
    }

    const url = `${API_BASE_URL}/api/user-games/history/${encodeURIComponent(userPhone)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { success: true, data: [] };
    }

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data || [] };
    }
    return { success: true, data: [] };
  } catch (error: any) {
    console.error('❌ Error en getUserGameHistory:', error.message);
    return { success: true, data: [] };
  }
};

/**
 * Redimir puntos de un juego
 */
export const redeemGamePoints = async (
  userPhone: string,
  historyId: string,
  telecomCompanyNit: string
) => {
  try {
    if (!userPhone || !historyId) {
      return { success: false, error: 'Faltan datos' };
    }

    console.log(`💰 Redimiendo juego ${historyId} para ${userPhone}`);

    const response = await fetch(`${API_BASE_URL}/api/user-games/redeem`, {
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
      console.log(`✅ Juego redimido. Puntos: ${data.pointsRedeemed}`);
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    console.error('❌ Error en redeemGamePoints:', err);
    return { success: false, error: err.message };
  }
};

export const createGame = async (payload: {
  telecomCompanyNit: string;
  title: string;
  description?: string;
  fullDescription?: string;
  rewardPoints?: number;
  duration?: number;
  gameType?: string;
  icon?: string;
  gameUrl?: string;
  imageUrl?: string;
  questions?: GameQuestion[];
  answers?: GameAnswer[];
  preferences?: PreferencesData;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, data };
    }
    return { success: false, error: data.error || 'No se pudo crear el juego' };
  } catch (err: any) {
    console.error('❌ Error en createGame:', err);
    return { success: false, error: err.message };
  }
};

export const generateFakeAnswersWithAI = async (payload: {
  question: string;
  correctAnswer: string;
  language?: 'es' | 'en';
  count?: number;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/games/generate-fake-answers-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        data: Array.isArray(data.data) ? data.data : (data.data?.fakeAnswers || []),
      };
    }
    return { success: false, error: data.error || 'No se pudo generar respuestas con IA', data: [] };
  } catch (err: any) {
    console.error('❌ Error en generateFakeAnswersWithAI:', err);
    return { success: false, error: err.message, data: [] };
  }
};

// ============================================
// 🎯 TIPOS DE DATOS / INTERFACES - AÑADIR GAME
// ============================================

export interface Game {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  reward_points: number;
  duration: number;
  game_type: string;
  icon: string;
  game_url?: string;
  image_url?: string;
  questions?: GameQuestion[];
  answers?: GameAnswer[];
  status: "active" | "inactive";
  telecomCompanyNit?: string;
  preferences?: PreferencesData;
  createdAt?: string;
  updatedAt?: string;
}

export interface GameQuestion {
  id: number;
  type: "multiple_choice" | "text";
  question: string;
  options?: string[];
  required?: boolean;
}

export interface GameAnswer {
  id: number;
  correctAnswer: string;
}

// ============================================
// 📝 ENCUESTAS - COMPLETAR Y HISTORIAL
// ============================================

/**
 * Completar una encuesta
 */
export const completeSurvey = async (
  userPhone: string,
  surveyId: string,
  answers: any[]
) => {
  try {
    if (!userPhone || !surveyId) {
      return { success: false, error: 'Faltan datos' };
    }

    const response = await fetch(`${API_BASE_URL}/api/user-surveys/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPhone: userPhone.trim(),
        surveyId: surveyId.trim(),
        answers,
        completedAt: new Date().toISOString(),
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    console.error('❌ Error en completeSurvey:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Obtener historial de encuestas del usuario
 */
export const getUserSurveyHistory = async (userPhone: string) => {
  try {
    if (!userPhone) {
      return { success: true, data: [] };
    }

    const url = `${API_BASE_URL}/api/user-surveys/history/${encodeURIComponent(userPhone)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { success: true, data: [] };
    }

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data || [] };
    }
    return { success: true, data: [] };
  } catch (error: any) {
    console.error('❌ Error en getUserSurveyHistory:', error.message);
    return { success: true, data: [] };
  }
};

/**
 * Redimir puntos de una encuesta
 */
export const redeemSurveyPoints = async (
  userPhone: string,
  historyId: string,
  telecomCompanyNit: string
) => {
  try {
    if (!userPhone || !historyId) {
      return { success: false, error: 'Faltan datos' };
    }

    const response = await fetch(`${API_BASE_URL}/api/user-surveys/redeem`, {
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
      return { success: true, data };
    }

    return { success: false, error: data.error || 'No se pudo redimir la encuesta' };
  } catch (err: any) {
    console.error('❌ Error en redeemSurveyPoints:', err);
    return { success: false, error: err.message };
  }
};


// ============================================
// 📊 FUNCIONES DE SIMILITUD Y FILTRADO
// ============================================

/**
 * Calcula la similitud de coseno entre dos vectores de preferencias
 * @param userPrefs Preferencias del usuario
 * @param itemPrefs Preferencias del item (misión, video, encuesta, juego)
 * @returns Porcentaje de similitud (0-100)
 */
export const calculateCosineSimilarity = (
  userPrefs: any,
  itemPrefs: any
): number => {
  if (!itemPrefs) return 100; // Si no hay preferencias en el item, 100% compatible
  
  let totalWeight = 0;
  let matchWeight = 0;
  
  // 1. Verificar edad (peso: 25%)
  if (itemPrefs.minAge !== undefined && itemPrefs.maxAge !== undefined && userPrefs.age !== undefined) {
    totalWeight += 25;
    if (userPrefs.age >= itemPrefs.minAge && userPrefs.age <= itemPrefs.maxAge) {
      matchWeight += 25;
    }
  } else if (itemPrefs.minAge !== undefined && userPrefs.age !== undefined) {
    totalWeight += 25;
    if (userPrefs.age >= itemPrefs.minAge) matchWeight += 25;
  } else if (itemPrefs.maxAge !== undefined && userPrefs.age !== undefined) {
    totalWeight += 25;
    if (userPrefs.age <= itemPrefs.maxAge) matchWeight += 25;
  }
  
  // 2. Verificar género (peso: 20%)
  if (itemPrefs.gender && itemPrefs.gender.length > 0 && userPrefs.gender) {
    totalWeight += 20;
    if (itemPrefs.gender.includes(userPrefs.gender)) {
      matchWeight += 20;
    }
  }
  
  // 3. Verificar intereses (peso: 35%)
  if (itemPrefs.interests && itemPrefs.interests.length > 0 && userPrefs.interests && userPrefs.interests.length > 0) {
    totalWeight += 35;
    const commonInterests = userPrefs.interests.filter((interest:any) => 
      itemPrefs.interests?.includes(interest)
    );
    const interestMatchPercent = (commonInterests.length / Math.max(itemPrefs.interests.length, 1)) * 35;
    matchWeight += interestMatchPercent;
  }
  
  // 4. Verificar ubicación (peso: 20%)
  if (itemPrefs.locations && itemPrefs.locations.length > 0 && userPrefs.locations) {
    totalWeight += 20;
    if (itemPrefs.locations.includes(userPrefs.locations)) {
      matchWeight += 20;
    }
  }
  
  // Si no hay criterios de filtrado, 100% compatible
  if (totalWeight === 0) return 100;
  
  // Calcular porcentaje final
  const similarity = (matchWeight / totalWeight) * 100;
  return Math.round(similarity);
};

/**
 * Filtra items por similitud de coseno
 * @param items Lista de items (misiones, videos, encuestas, juegos)
 * @param user Usuario con sus preferencias
 * @param minSimilarity Porcentaje mínimo de similitud (default: 30)
 * @returns Items filtrados con su porcentaje de similitud
 */
export const filterItemsBySimilarity = <T extends { preferences?: PreferencesData; telecomCompanyNit?: string }>(
  items: T[],
  user: UserData,
  minSimilarity: number = 30
): (T & { similarity: number })[] => {
  if (!user) return items.map(item => ({ ...item, similarity: 100 }));
  
  const userPrefs: any = {
    age: user.age,
    gender: user.gender,
    interests: user.interests,
    location: user.location,
  };
  
  const filtered = items
    .filter(item => {
      // Verificar NIT
      if (item.telecomCompanyNit && item.telecomCompanyNit !== user.telecomCompanyNit) {
        return false;
      }
      return true;
    })
    .map(item => ({
      ...item,
      similarity: calculateCosineSimilarity(userPrefs, item.preferences || {}),
    }))
    .filter(item => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity);
  
  return filtered;
};

/**
 * Verifica si un item es compatible con el usuario por NIT y preferencias
 */
export const isItemCompatible = (
  user: UserData,
  item: { telecomCompanyNit?: string; preferences?: PreferencesData },
  minSimilarity: number = 30
): boolean => {
  if (!user) return false;
  
  // Verificar NIT
  if (item.telecomCompanyNit && item.telecomCompanyNit !== user.telecomCompanyNit) {
    return false;
  }
  
  // Verificar preferencias
  const userPrefs: any = {
    age: user.age,
    gender: user.gender,
    interests: user.interests,
    location: user.location,
  };
  
  const similarity = calculateCosineSimilarity(userPrefs, item.preferences || {});
  return similarity >= minSimilarity;
};