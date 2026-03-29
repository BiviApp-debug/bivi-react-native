import { API_BASE_URL } from "../API/API";
export const SendMail = async (email:string, codigo:string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "Código de verificación",
        text: `Tu código es: ${codigo}`,
      }),
    })
    const data = await response.json()
    console.log("✅ Correo enviado:", data)
  } catch (error) {
    console.error("❌ Error al enviar correo:", error)
  }
}