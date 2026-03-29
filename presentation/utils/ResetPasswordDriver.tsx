import { API_BASE_URL } from '../API/API';

export const  updatePasswordDriver =  async(phone:string, newPassword:string) => {
  const res = await fetch(`${API_BASE_URL}/api/update-password-driver`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, newPassword })
  });

  const data = await res.json();
  console.log(data);

  return data
}
