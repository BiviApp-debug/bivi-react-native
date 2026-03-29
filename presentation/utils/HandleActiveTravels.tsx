import { API_BASE_URL } from "../API/API";

export const HandleCreateactiveTravels = async (clienID:string,locClient:any,locDriver:any,selectedPlace:any,service:string,user:string,travel:string,price:string,oferta:string,travelData:any,contraoferta:any,conductor:any) => {
  //console.log(selectedPlace,locDriver,locClient,"holas_datas_activeTravels");
  
  const data = {
    clientid:clienID.toString(),
    ubicacionCliente: locClient,
    ubicacionConductor: locDriver,
    ubicacionDestino: selectedPlace,
    tipoServicio: service,
    user: user,
    viaje: travel,
    tarifa: price,
    oferta: oferta,
    contraoferta: contraoferta,
    datosViaje: travelData,
    datosRecogida: locClient,
    conductor:conductor,
    status: travel
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/activeTravels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      //console.log('Respuesta:', json);
      return true
    } catch (parseError) {
      console.error('La respuesta no fue JSON:', text);
      return false
    }
  } catch (error) {
    console.error('Error al crear nuevo viaje:', error);
    return false
  }
};


export const HandleDeleteActiveTravels = async (user_app: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/activeTravels`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: user_app })
    });

    if (!res.ok) {
      throw new Error('Error eliminando nuevos viajes');
    }

    const data = await res.json();
    console.log("✅ Nuevo Viaje eliminadas:", data);
    return data;
  } catch (error) {
    console.error("❌ Error en HandleDeleteOffers:", error);
    return null;
  }
};



