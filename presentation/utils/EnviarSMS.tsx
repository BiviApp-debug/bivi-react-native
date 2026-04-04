import { API_BASE_URL } from "../API/API";

export const enviarSMS = async (telefono: string, codigo: string) => {

 
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: telefono, message: "Bienvenido a Bivi Connect, tu codigo es " + codigo }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error enviando SMS");

    console.log("✅ SMS enviado correctamente:", data);
    return true;
  } catch (error) {
    console.error("❌ Error al enviar SMS:", error);
    throw error;
  }
};

