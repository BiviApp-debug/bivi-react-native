import { API_BASE_URL } from '../API/API'

export const getDriverByPhone = async (phone:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/driverPhone/${phone}`);

    if (!response.ok) {
      const error = await response.json();
      //console.log("Error:", error);
      return null;
    }

    const data = await response.json();
    //console.log("Driver data:", data);
    return data;

  } catch (err) {
    console.log("Request error:", err);
    return null;
  }
};
