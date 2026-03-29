import { API_BASE_URL } from "../API/API";

export const createDeliveryData = async (
  clientId: string,
  weightRange: 'small' | 'medium' | 'large' | 'extra-large' | 'food',
  description: string,
  travelId?: string | null,
  itemValue?: string,
  recipientName?: string,
  recipientPhone?: string,
  specialInstructions?: string
) => {
  console.log(
    clientId,
    weightRange,
    description,
    travelId,
    itemValue,
    recipientName,
    recipientPhone,
    specialInstructions,
    "holas_mis_datos_delivery"
  );
    
  try {
    const response = await fetch(`${API_BASE_URL}/api/delivery/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        travelId: travelId || null,
        weightRange,
        description,
        itemValue: itemValue || null,
        recipientName: recipientName || null,
        recipientPhone: recipientPhone || null,
        specialInstructions: specialInstructions || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Error del servidor:", error);
      throw new Error(error.error || "Error guardando envío");
    }

    const data = await response.json();
    
    if (data.isUpdate) {
      console.log("📝 Envío actualizado:", data);
    } else {
      console.log("✅ Envío creado:", data);
    }
    
    return data;
  } catch (error) {
    console.log("❌ Error guardando envío:", error);
    return null;
  }
};