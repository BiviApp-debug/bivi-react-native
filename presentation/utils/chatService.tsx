import { API_BASE_URL } from '../API/API';

export interface ChatMessage {
  id: number;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  isRead: boolean;
}

// Obtener historial de mensajes
export const getMessages = async (
  senderId: string, 
  receiverId: string
): Promise<ChatMessage[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chat/messages/${senderId}/${receiverId}`
    );
    
    const data = await response.json();
    
    if (data.success) {
      return data.messages;
    }
    return [];
    
  } catch (error) {
    console.error('❌ Error obteniendo mensajes:', error);
    return [];
  }
};

// Enviar mensaje
export const sendMessage = async (
  content: string,
  senderId: string,
  receiverId: string
): Promise<ChatMessage | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        senderId,
        receiverId,
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      return data.message;
    }
    return null;
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    return null;
  }
};

// Marcar mensajes como leídos
export const markAsRead = async (
  senderId: string,
  receiverId: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderId,
        receiverId,
      }),
    });

    const data = await response.json();
    return data.success;
    
  } catch (error) {
    console.error('❌ Error marcando como leído:', error);
    return false;
  }
};