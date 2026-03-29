import { API_BASE_URL } from "../API/API";

export const handleCreateTravel = async (clienID:string,locClient:any,locDriver:any,service:string,user:string,travel:string,price:string,travelData:any,selectedPlace:any) => {
  
  const data = {
    clientid:clienID.toString(),
    ubicacionCliente: JSON.stringify(locClient),
    ubicacionConductor: JSON.stringify(locDriver),
    ubicacionDestino: JSON.stringify(selectedPlace),
    tipoServicio: service,
    user: user,
    viaje: travel,
    tarifa: price,
    oferta: price,
    contraoferta: "",
    datosViaje: JSON.stringify(travelData),
    datosRecogida: JSON.stringify(locClient),
    conductor:""
  };

  try {
    //console.log(data,"holas_obligatorios");
    
    const response = await fetch(`${API_BASE_URL}/api/travels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      console.log('Respuesta Nuevo Viaje:', json);
      return true
    } catch (parseError) {
      console.error('La respuesta no fue JSON:', text);
      return false
    }
  } catch (error) {
    console.error('Error al crear viaje:', error);
    return false
  }
};


// services/activeTravelsBackup.js

export const getActiveTravelsBackUp = async (clientId:string) => {
   try {
    if (!clientId) {
      throw new Error('clientId es requerido');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/activeTravelsBackUp/${clientId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // No hay viaje activo (404)
    if (response.status === 404) {
      return {
        success: false,
        data: null,
        message: 'No hay viajes activos',
      };
    }

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();
    // result = { success: true, data: { ... } }

    return result;

  } catch (error) {
    console.error('❌ Error fetch activeTravelBackUp:', error);
    return {
      success: false,
      data: null,
      error: "",
    };
  }
};



export const getTravelsBackup = async (clientId:string) => {
  try {
    if (!clientId) {
      throw new Error('clientId es requerido');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/travelsbackup/${clientId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    // result = { success, count, data }
    return result;

  } catch (error) {
    console.error('❌ Error fetch travelsBackup:', error);
    return {
      success: false,
      data: null,
      error:"",
    };
  }
};



export const handleCreateTravelBackUp = async (clienID:string,locClient:any,locDriver:any,service:string,user:string,travel:string,price:string,travelData:any,selectedPlace:any) => {
  //console.log(locClient,selectedPlace,"holas_datas_user_2");
  
  const data = {
    clientid:clienID.toString(),
    ubicacionCliente: JSON.stringify(locClient),
    ubicacionConductor: JSON.stringify(locDriver),
    ubicacionDestino: JSON.stringify(selectedPlace),
    tipoServicio: service,
    user: user,
    viaje: travel,
    tarifa: price,
    oferta: price,
    contraoferta: "",
    datosViaje: JSON.stringify(travelData),
    datosRecogida: JSON.stringify(locClient),
    conductor:""
  };

  try {
    //console.log(data,"holas_obligatorios_2");
    
    const response = await fetch(`${API_BASE_URL}/api/travelsbackup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      console.log('Respuesta Nuevo Viaje:', json);
      return true
    } catch (parseError) {
      console.error('La respuesta no fue JSON:', text);
      return false
    }
  } catch (error) {
    console.error('Error al crear viaje:', error);
    return false
  }
};

export const HandleDeleteTravels = async (clienID:string) => {

fetch(`${API_BASE_URL}/api/travels/${clienID}`, {
  method: 'DELETE'
})
  .then(res => res.json())
  .then(data => console.log(data,"DELETE_'TRAVELS'"))
  .catch(err => console.error(err));
return "complete"
}

