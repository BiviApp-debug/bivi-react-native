import { API_BASE_URL } from "../API/API"

export const getPercentageByVehicle = async (vehicle:string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/tablePercentage/${vehicle}`
    )

    if (!response.ok) {
      throw new Error('Error al obtener el porcentaje')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}
