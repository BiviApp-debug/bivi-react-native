import { API_BASE_URL } from '../API/API'

export const patchCancelTravel = async (user:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activeTravels/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("PATCH error:", error);
    return null;
  }
};


export const patchPickUpTravelDriver = async (user:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activeTravelsDriver/pickup`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("PATCH error:", error);
    return null;
  }
};


export const patchPickUpTravelUser = async (user:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activeTravelsClient/pickup`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("PATCH error:", error);
    return null;
  }
};




export const patchOnWayUser = async (user:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activeTravelsClient/onWay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("PATCH error:", error);
    return null;
  }
};


export const patchNeedPaymentUser = async (user: string, metodo_pago?: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activeTravelsClient/endTravel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, ...(metodo_pago ? { metodo_pago } : {}) })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("PATCH error:", error);
    return null;
  }
};

export const patchFinishUser = async (user:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activeTravelsClient/finish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("PATCH error:", error);
    return null;
  }
};