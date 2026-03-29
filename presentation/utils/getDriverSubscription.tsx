import { API_BASE_URL } from '../API/API'

export const getDriverSubscription = async (phone:string) => {
 const response = await fetch(`${API_BASE_URL}/driverSubscription/${phone}`);
const data = await response.json();
console.log(data);
  return data
}
