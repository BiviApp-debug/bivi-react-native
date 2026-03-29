import { API_BASE_URL } from '../API/API';

export const createInvoiceTravel = async (travelData:any, typeService:any) => {
    console.log(travelData,"holas_datas_factura");
    
  try {
    const response = await fetch(`${API_BASE_URL}/api/invoiceTravels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientid: travelData.clientid,
        ubicacionCliente: travelData.ubicacionCliente,
        ubicacionConductor: travelData.ubicacionConductor || null,
        ubicacionDestino: travelData.ubicacionDestino || null,
        tipoServicio: travelData.tipoServicio,
        user: travelData.user,
        viaje: travelData.viaje,
        tarifa: travelData.tarifa,
        oferta: travelData.oferta || null,
        contraoferta: travelData.contraoferta || null,
        datosViaje: travelData.datosViaje,
        datosRecogida: travelData.datosRecogida || null,
        conductor: travelData.conductor || null,
        metodo_pago: travelData.metodo_pago || null,
        status: typeService == "conductor" ? "PAYED_DRIVER" : "PAYED_CLIENT"
      })
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Factura creada:', data);
    return data;

  } catch (error) {
    console.error('Error al crear la factura de viaje:', error);
    throw error;
  }
};

