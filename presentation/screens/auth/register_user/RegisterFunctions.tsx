import { API_BASE_URL } from "../../../API/API";

export const saveMessageToFirestore = async (
  userName: string,
  userLastName: string,
  userMail: string,
  userPassword: string,
  userPhone: string,
  dateOfBirth?: string,
  age?: number,                        // ✅ NUEVO: Agregar age
  isMinor?: string,                    // ✅ NUEVO: Agregar isMinor
  location?: string,
  preferences?: {
    favoriteColors: string[];
    favoriteGenres: string[];
    favoriteActivities: string[];
  },
  documentUrl?: string,
  documentType?: string,
  telecomCompanyNit?: string,
  telecomCompanyName?: string
): Promise<any> => {
  try {
    console.log('💾 Guardando usuario en servidor...');

    const response = await fetch(`${API_BASE_URL}/api/userRegister`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userName,
        lastName: userLastName,
        email: userMail,
        password: userPassword,
        phone: userPhone,
        dateOfBirth: dateOfBirth || null,
        age: age || null,                      // ✅ Enviar age
        isMinor: isMinor || 0,                 // ✅ Enviar isMinor
        location: location || null,
        preferences: preferences ? JSON.stringify(preferences) : null,
        documentUrl: documentUrl || null,
        documentType: documentType || null,
        telecomCompanyNit: telecomCompanyNit || null,
        telecomCompanyName: telecomCompanyName || null
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