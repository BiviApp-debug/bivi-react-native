import { API_BASE_URL } from "../API/API";


export async function getUpdates() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/update-app`)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const data = await res.json()

    if (!data.success) {
      throw new Error(data.error || "Respuesta no exitosa")
    }

    return data.updates || []
  } catch (err) {
    console.error("❌ Error en getUpdates:", err)
    throw err
  }
}


