import { API_BASE_URL } from "../API/API";

export const updatePaymentMethod = async (clientId:string, paymentMethod:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payment-method`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        paymentMethod,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      console.log("❌ Error al guardar:", data.error);
      return null;
    }

    console.log("✅ Registro creado o actualizado:", data);
    return data;

  } catch (err) {
    console.error("⚠️ Error haciendo fetch:", err);
    return null;
  }
};
