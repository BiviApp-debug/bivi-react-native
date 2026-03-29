import { API_BASE_URL } from "../API/API";
export const getInvoiceTravelsCount = async (clientId: string, fecha: string) => {
  try {
    if (!clientId || !fecha) {
      throw new Error('clientId y fecha son requeridos');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/invoiceTravels/count/${clientId}/${fecha}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData, success: false };
    }

    const result = await response.json();
    console.log('✅ Viajes count:', result);
    
    return result;  // ← Retorna el objeto completo con 'total'
  } catch (error) {
    console.error('❌ Error fetch invoiceTravels count:', error);
    return {
      success: false,
      total: 0,
      message: 'Error de conexión',
    };
  }
};