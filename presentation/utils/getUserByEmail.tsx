import { API_BASE_URL } from "../API/API";

export const getUserByEmail = async (email:any) => {
  try {
    const res = await fetch(`${API_BASE_URL}/getuserByMail/${email}`, {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error en fetch:", error);
    return null;
  }
};
