import { API_BASE_URL } from "../API/API";

export const getInvoiceTravelsSum = async (clientId:string, fecha:string) => {
  try {
    if (!clientId || !fecha) {
      throw new Error('clientId y fecha son requeridos');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/invoiceTravels/sum/${clientId}/${fecha}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    // ⛔ Error desde backend
    if (!response.ok) {
      return {
        success: false,
        totals: {
          total_tarifa: 0,
          total_oferta: 0,
          total_contraoferta: 0,
        },
        message: result.error || 'Error consultando sumatoria',
      };
    }

    // ✅ OK
    return {
      success: true,
      totals: result.totals,
      fecha: result.fecha,
      clientid: result.clientid,
    };

  } catch (error) {
    console.error('❌ Error fetch invoiceTravels sum:', error);
    return {
      success: false,
      totals: {
        total_tarifa: 0,
        total_oferta: 0,
        total_contraoferta: 0,
      },
      message: 'Error de conexión',
    };
  }
};
