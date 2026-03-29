import { Alert } from 'react-native';
import { API_BASE_URL } from '../../../API/API';
import { savePhone } from '../../../utils/SavedPhoneFunctios';

export const saveMessageToFirestore = async (
   
  phone: string,
  password: string
): Promise<any> => {
 
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        password,
      }),
    });

    const data = await response.json();

    if (response.ok) { 
      let myStorage = phone+"[storage-client]"+password;
      savePhone(myStorage)
      return data;
    } else {      
      const serverMessage = data?.error || data?.message || null;
      console.error('❌ Error login cliente:', serverMessage || data);
      return { __loginError: true, message: serverMessage };
    }
  } catch (error) {
    console.error('❌ Error de red:', error);
    return { __loginError: true, message: null };
  }

}
