import { API_BASE_URL } from "../API/API";

export const HandleActiveTravelsBackup = async (clienID:string,locClient:any,locDriver:any,selectedPlace:any,service:string,user:string,travel:string,price:string,oferta:string,travelData:any,contraoferta:any,conductor:any) => {
  console.log(selectedPlace,locDriver,locClient,"holas_datas_activeTravels_backUp");
  
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
    const response = await fetch(`${API_BASE_URL}/api/activeTravelsBackUp`, {
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



