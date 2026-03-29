import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../../API/API';
import COLORS from '../../utils/colors';
import ErrorModal from '../../components/ErrorModal';
import SuccessModal from '../../components/SuccessModal';

interface ProfilePhotoUploaderProps {
  phone: string;
  currentPhoto?: string | null;
  onPhotoUploaded: (url: string) => void;
  isDriver?: boolean; // ✅ Nuevo prop para distinguir entre driver y client
}

export default function ProfilePhotoUploader({
  phone,
  currentPhoto,
  onPhotoUploaded,
  isDriver  // ✅ Por defecto es cliente
}: ProfilePhotoUploaderProps) {

 console.log('📸 ProfilePhotoUploader:', { phone, currentPhoto, isDriver });
  
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // ✅ Actualizar cuando cambia currentPhoto
  useEffect(() => {
    // console.log('🔄 Actualizando foto desde props:', currentPhoto);
    setPhotoUrl(currentPhoto || null);
  }, [currentPhoto]);

  const uploadFileToS3 = async (file: any): Promise<string | null> => {
    try {
      if (!file || !file.uri) {
        setErrorMessage("Archivo inválido");
        setShowErrorModal(true);
        return null;
      }

      // console.log('📤 Iniciando upload:', file);
      setUploading(true);

      // 1. Construir filename y mime
      const extensionFromUri = file.uri?.split('.').pop()?.split('?')[0];
      const extension = file.name?.split(".").pop() ||
        file.mimeType?.split("/")?.[1] ||
        extensionFromUri ||
        "jpg";

      const mime = file.mimeType || `image/${extension === "jpg" ? "jpeg" : extension}`;
      const filename = `profile_${phone}_${Date.now()}.${extension}`;

      // console.log('📋 Archivo:', { filename, mime });

      // 2. Pedir URL firmada
      const response = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, filetype: mime }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error generando URL:', errorText);
        throw new Error("Error generando presigned URL");
      }

      const { url, publicUrl } = await response.json();
      // console.log('✅ URL generada:', publicUrl);

      // 3. Convertir a blob
      const fileData = await fetch(file.uri);
      const blob = await fileData.blob();

     // console.log('📦 Blob creado:', blob.size, 'bytes');

      // 4. Subir a S3
      const upload = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": mime },
        body: blob,
      });

      if (!upload.ok) {
        const errorText = await upload.text();
        console.error("❌ ERROR AWS:", errorText);
        throw new Error("Fallo la subida a S3");
      }

      // console.log('✅ Archivo subido a S3');

      // 5. Obtener URL pública (usar la que nos devolvió el backend)
      const finalPublicUrl = publicUrl || url.split("?")[0];

      // 6. Guardar en base de datos
      await savePhotoToDatabase(finalPublicUrl);

      return finalPublicUrl;

    } catch (error: any) {
      console.error("❌ Error al subir:", error);
      setErrorMessage(error.message || "No se pudo subir el archivo");
      setShowErrorModal(true);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const savePhotoToDatabase = async (photoUrl: string) => {
    try {
      // console.log('💾 Guardando en BD:', photoUrl);

      // ✅ Usar endpoint correcto según el tipo de usuario
      const endpoint = isDriver 
        ? `${API_BASE_URL}/api/driver-profile-photo`
        : `${API_BASE_URL}/api/client-profile-photo`;

     // console.log('🔗 Endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, profilePhoto: photoUrl })
      });

      const data = await response.json();
     // console.log('📊 Respuesta BD:', data);

      if (response.ok) {
        // console.log('✅ Foto guardada en BD');
        setPhotoUrl(photoUrl);
        onPhotoUploaded(photoUrl); // ✅ Notificar al padre
      } else {
        throw new Error(data.error || 'Error guardando foto');
      }
    } catch (error: any) {
      console.error('❌ Error guardando en BD:', error);
      throw error;
    }
  };

  const handleSelectPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage("Necesitamos permiso para acceder a tus fotos");
        setShowErrorModal(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        console.log('❌ Usuario canceló');
        return;
      }

      const selected = result.assets[0];
      const selectedFile = {
        uri: selected.uri,
        name: selected.fileName || `profile_${phone}_${Date.now()}.jpg`,
        size: selected.fileSize,
        mimeType: selected.mimeType || "image/jpeg",
      };

        // Verificar tamaño (máximo 5MB)
        if (selectedFile.size && selectedFile.size > 5 * 1024 * 1024) {
          setErrorMessage("La imagen no debe superar 5MB");
          setShowErrorModal(true);
          return;
        }

        const uploadedUrl = await uploadFileToS3(selectedFile);

        if (uploadedUrl) {
          setSuccessMessage(`✅ Foto de perfil actualizada`);
          setShowSuccessModal(true);
          console.log('✅ Upload completo:', uploadedUrl);
        }
    } catch (error) {
      console.error('❌ Error seleccionando foto:', error);
      setErrorMessage("No se pudo seleccionar la imagen");
      setShowErrorModal(true);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleSelectPhoto}
      disabled={uploading}
    >
      {uploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Subiendo...</Text>
        </View>
      ) : (
        <>
          {photoUrl ? (
            <>
              <Image
                source={{ uri: photoUrl }}
                style={styles.profileImage}
                onError={(error) => {
                  console.error('❌ Error cargando imagen:', error);
                  setPhotoUrl(null); // ✅ Si falla, mostrar placeholder
                }}
                onLoad={() => console.log('✅ Imagen cargada')}
              />
              <View style={styles.editBadge}>
                <Text style={styles.editIcon}>📷</Text>
              </View>
            </>
          ) : (
            <>
              <Image
                source={require("../../../assets/UserCircle.png")}
                style={styles.profileImage}
              />
              <View style={styles.editBadge}>
                <Text style={styles.editIcon}>📷</Text>
              </View>
            </>
          )}
        </>
      )}
      
      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  profileImage: {
    width: 60, // ✅ Aumentado de 50 a 90
    height: 60,
    borderRadius: 45,
    borderWidth: 3, // ✅ Agregado borde
    borderColor: COLORS.primary,
  },
  loadingContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.backgroundMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  editBadge: {
    position: 'absolute',
    bottom: -5, // ✅ Ajustado posición
    right: -5,
    width: 32, // ✅ Aumentado de 28 a 32
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3, // ✅ Aumentado de 2 a 3
    borderColor: 'white',
  },
  editIcon: {
    fontSize: 16, // ✅ Aumentado de 14 a 16
  },
});