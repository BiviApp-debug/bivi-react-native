import { API_BASE_URL } from "../API/API";

export const getDriverPaymentMonth = async (conductor: string, fecha: string) => {
  try {
    if (!conductor || !fecha) {
      throw new Error('conductor y fecha son requeridos');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/driverPayment/month/${conductor}/${fecha}`,
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
        message: result.error || 'Error consultando pagos del mes',
      };
    }

    return {
      success: true,
      data: result.data,
      count: result.count,
      yearMonth: result.yearMonth,
      fecha: result.fecha,
      conductor: result.conductor,
    };

  } catch (error) {
    console.error('❌ Error fetch driver payment month:', error);
    return {
      success: false,
      data: [],
      count: 0,
      message: 'Error de conexión',
    };
  }
};