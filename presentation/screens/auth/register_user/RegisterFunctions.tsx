import { API_BASE_URL } from "../../../API/API";

type RegisterUserPayload = {
  userName: string;
  userLastName: string;
  userMail: string;
  userPassword: string;
  userPhone: string;
  dateOfBirth?: string;
  age?: number;
  isMinor?: boolean;
  location?: string;
  preferences?: {
    favoriteColors: string[];
    favoriteGenres: string[];
    favoriteActivities: string[];
  };
  documentUrl?: string;
  documentType?: string;
  gender?: string;
  telecomCompanyNit?: string;
  telecomCompanyName?: string;
};

export const saveMessageToFirestore = async (payload: RegisterUserPayload): Promise<any> => {
  try {
    console.log('💾 Guardando usuario en servidor...');

    const response = await fetch(`${API_BASE_URL}/api/userRegister`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: payload.userName,
        lastName: payload.userLastName,
        email: payload.userMail,
        password: payload.userPassword,
        phone: payload.userPhone,
        dateOfBirth: payload.dateOfBirth || null,
        age: payload.age || null,
        isMinor: !!payload.isMinor,
        location: payload.location || null,
        preferences: payload.preferences ? JSON.stringify(payload.preferences) : null,
        documentUrl: payload.documentUrl || null,
        documentType: payload.documentType || null,
        gender: payload.gender || null,
        telecomCompanyNit: payload.telecomCompanyNit || null,
        telecomCompanyName: payload.telecomCompanyName || null
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error en respuesta del servidor:', data);
      throw new Error(data?.message || data?.error || 'Error al registrar usuario');
    }

    console.log('✅ Usuario guardado correctamente:', data);
    return data;

  } catch (error: any) {
    console.error('❌ Error guardando usuario:', error);
    throw error;
  }
};