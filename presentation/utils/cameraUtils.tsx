import { API_BASE_URL } from "../API/API";
import * as ImagePicker from 'expo-image-picker';

/**
 * Toma una foto con la cámara y retorna el objeto completo
 */
export const takePhotoWithBase64 = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      
      alert('Se necesitan permisos de cámara para tomar fotos');
      return null;
    }

    console.log('📷 Abriendo cámara...');

    // Abrir cámara CON base64
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // ✅ Reducir de 0.7 a 0.5 (calidad más baja = archivo más pequeño)
      base64: true,
    });

    if (result.canceled || !result.assets[0]) {
      console.log('❌ Usuario canceló la foto');
      return null;
    }

    const photo = result.assets[0];

    if (!photo.base64) {
      console.error('❌ No se obtuvo base64 de la foto');
      return null;
    }

    console.log('✅ Foto tomada exitosamente');
    console.log(`   URI: ${photo.uri}`);
    console.log(`   Base64 length: ${photo.base64.length}`);
    console.log(`   Tamaño aprox: ${(photo.base64.length / 1024 / 1024).toFixed(2)} MB`);

    return photo;

  } catch (error) {
    console.error('❌ Error abriendo cámara:', error);
    alert('Error al abrir la cámara');
    return null;
  }
};

/**
 * Sube una imagen a AWS S3 usando base64
 */
export const uploadImageToS3 = async (base64: string): Promise<string | null> => {
  try {
    console.log('📤 Iniciando upload a S3...');
    console.log(`   Base64 length: ${base64.length}`);

    const fileName = `chat_${Date.now()}.jpg`;
    const fileType = 'image/jpeg';

    const response = await fetch(`${API_BASE_URL}/upload-file-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: fileName,
        filetype: fileType,
        fileData: base64,
      }),
    });

    console.log(`   Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error respuesta S3:', errorText);
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.url) {
      console.error('❌ Respuesta sin URL:', data);
      throw new Error('El servidor no devolvió una URL');
    }

    console.log('✅ Imagen subida exitosamente a S3');
    console.log(`   URL: ${data.url}`);

    return data.url;

  } catch (error) {
    console.error('❌ Error subiendo imagen a S3:', error);
    throw error;
  }
};