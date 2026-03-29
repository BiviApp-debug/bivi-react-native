import { API_BASE_URL } from "../API/API";

export const getUserByPhone = async (phone:any) => {
  try {
    const res = await fetch(`${API_BASE_URL}/getuserByPhone/${phone}`, {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();
    console.log(data,"las_datas");
    
    return data;

  } catch (error) {
    console.error("Error en fetch:", error);
    return null;
  }
};
