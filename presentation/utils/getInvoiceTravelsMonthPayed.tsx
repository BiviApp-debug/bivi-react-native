import { API_BASE_URL } from "../API/API";

export const getInvoiceTravelsMonthPayed = async (clientId: string, fecha: string) => {
  try {
    if (!clientId || !fecha) {
      throw new Error('clientId y fecha son requeridos');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/invoiceTravels/month/all/${clientId}/${fecha}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: [],
        count: 0,
        message: result.error || 'Error consultando viajes pagados del mes',
      };
    }

    return {
      success: true,
      data: result.data,
      count: result.count,
      yearMonth: result.yearMonth,
      fecha: result.fecha,
      clientid: result.clientid,
    };

  } catch (error) {
    console.error('❌ Error fetch viajes pagados del mes:', error);
    return {
      success: false,
      data: [],
      count: 0,
      message: 'Error de conexión',
    };
  }
};