import { API_BASE_URL } from "../API/API";

export const sendMessageToServer = async (
  msg: string, 
  clientId: string, 
  driver: string,
  sender: "user" | "driver",
  messageType: "text" | "image" = "text",
  mediaUrl?: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg,
        clientId,
        driver,
        sender,
        messageType,
        mediaUrl
      }),
    });

    const data = await response.json();
    return data;

  } catch (error) {
    console.error("Error enviando mensaje:", error);
    return { success: false };
  }
};