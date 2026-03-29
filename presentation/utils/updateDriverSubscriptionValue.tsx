import { API_BASE_URL } from "../API/API";

export const updateDriverSubscriptionValue = async (user:any, value:any) => {
  console.log(user, value,"calculos_data_2");
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/driver-subscription/value`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user,
          value,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error updating subscription')
    }

    return data
  } catch (error) {
    console.error('Update subscription error:', error)
    throw error
  }
}
