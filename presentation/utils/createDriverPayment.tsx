import { API_BASE_URL } from "../API/API";

export const createDriverPayment = async (
  monto: string,
  status: string,
  conductor: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/driverPaymentFinish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        monto,
        status,
        conductor
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Error registrando el pago',
      };
    }

    return {
      success: true,
      message: result.message,
      id: result.id,
      data: result.data,
    };

  } catch (error) {
    console.error('❌ Error en createDriverPayment:', error);
    return {
      success: false,
      message: 'Error de conexión',
    };
  }
};