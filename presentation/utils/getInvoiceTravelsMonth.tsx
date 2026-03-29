import { API_BASE_URL } from "../API/API";

export const getInvoiceTravelsMonth = async (clientId: string, fecha: string) => {
  try {
    if (!clientId || !fecha) {
      throw new Error('clientId y fecha son requeridos');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/invoiceTravels/month/${clientId}/${fecha}`,
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
        ingresoRealMes: 0,
        message: result.error || 'Error consultando registros del mes',
      };
    }

    // Calcular ingreso real del mes
    const limpiarValor = (valor: string | null) => {
      if (!valor) return 0;
      const limpio = valor.replace(/[$\s.]/g, '');
      return parseFloat(limpio) || 0;
    };

    const ingresosPorViaje = result.data.map((item: any) => {
      const tarifaNum = limpiarValor(item.tarifa);
      const ofertaNum = limpiarValor(item.oferta);
      const contraofertaNum = limpiarValor(item.contraoferta);

      if (contraofertaNum > 0) {
        return contraofertaNum;
      } else if (ofertaNum > 0) {
        return ofertaNum;
      } else {
        return tarifaNum;
      }
    });

    let ingresoRealMes = 0;
    ingresosPorViaje.forEach((ingreso: number) => {
      ingresoRealMes += ingreso;
    });

    return {
      success: true,
      data: result.data,
      count: result.count,
      ingresoRealMes: ingresoRealMes,
      yearMonth: result.yearMonth,
      fecha: result.fecha,
      clientid: result.clientid,
    };

  } catch (error) {
    console.error('❌ Error fetch invoiceTravels month:', error);
    return {
      success: false,
      data: [],
      count: 0,
      ingresoRealMes: 0,
      message: 'Error de conexión',
    };
  }
};