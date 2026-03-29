import { API_BASE_URL } from '../../../API/API';
import { createRating } from '../../../utils/HandleRatings';

export const saveDriverToFirestore = async (
  name: string,
  lastName: string,
  email: string,
  phone: string,
  carId: string,
  carModel: string,
  carBrand: string,
  vehicleType: string,
  cedula: string,
  licenseNumber: string,
  documentPhoto: string,
  licensePhoto: string,
  selfiePhoto: string,
  vehiclePhoto: string,
  tecnoPhoto: string,
  password: string,
): Promise<{ success: boolean; error?: string }> => {
  const role = "driver_role";

  try {
    const response = await fetch(`${API_BASE_URL}/driverRegister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, lastName, email, phone, carId, carModel, carBrand,
        vehicleType, cedula, licenseNumber, documentPhoto, licensePhoto,
        selfiePhoto, vehiclePhoto, tecnoPhoto, password, role,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      await createRating("5", phone);
      return { success: true };
    } else {
      console.error('❌ Error en el registro:', data.error);
      return { success: false, error: data.error || 'Error en el registro' };
    }
  } catch (error: any) {
    console.error('❌ Error al conectar con el servidor:', error);
    return { success: false, error: error?.message || 'No se pudo conectar con el servidor' };
  }
};
