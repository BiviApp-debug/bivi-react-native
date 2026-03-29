import { Alert } from 'react-native';
import { API_BASE_URL } from '../../../API/API';
import { createRating } from '../../../utils/HandleRatings';
export const saveMessageToFirestore = async (
  userName: string,
  userLastName: string,
  userMail: string,
  userPassword: string,
  userPhone: string,
  userToken: string
) => {
  let userRole= "user_client"
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userName,
        lastName: userLastName,
        email: userMail,
        password: userPassword,
        phone: userPhone,
        token: userToken,
        role: userRole
      }),
    });

    const data = await response.json();

    if (response.ok) {
      //console.log('✅ Usuario registrado correctamente:', data);
       let ratings = await createRating("5",userPhone)
       if(ratings){
     
       }
    } else {
      console.error('❌ Error en el registro:', data.error);
      //Alert.alert('Error de registro', data.error || 'Intente nuevamente.');
    }
  } catch (err) {
    console.error('❌ Error de red al registrar:', err);
    //Alert.alert('Error de red', 'No se pudo conectar con el servidor.');
  }
};
