import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../../API/API';
import COLORS from '../../utils/colors';
import ErrorModal from '../../components/ErrorModal';
import SuccessModal from '../../components/SuccessModal';

interface ClientProfilePhotoUploaderProps {
  phone: string;
  currentPhoto?: string | null;
  onPhotoUploaded: (url: string) => void;
  size?: number;
}

export default function ClientProfilePhotoUploader({
  phone,
  currentPhoto,
  onPhotoUploaded,
  size = 90
}: ClientProfilePhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentPhoto || "");

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setPhotoUrl(currentPhoto || "");
  }, [currentPhoto]);

  const uploadClientPhotoToS3 = async (file: any): Promise<string | null> => {
    try {
      if (!file || !file.uri) {
        setErrorMessage("Archivo inválido");
        setShowErrorModal(true);
        //Alert.alert("Error", "Archivo inválido");
        return null;
      }

      console.log("📤 Iniciando subida de foto del cliente...");
      setUploading(true);

      // 1. Obtener extensión y mime type
      const extensionFromUri = file.uri?.split('.').pop()?.split('?')[0];
      const extension = file.name?.split(".").pop() ||
        file.mimeType?.split("/")?.[1] ||
        extensionFromUri ||
        "jpg";

      const mime = file.mimeType || `image/${extension === "jpg" ? "jpeg" : extension}`;
      const filename = `client_profile_${phone}_${Date.now()}.${extension}`;

      console.log("📋 Archivo:", {
        name: file.name,
        size: file.size,
        mime: mime,
        generatedFilename: filename
      });

      // 2. Solicitar URL firmada a S3
      const response = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, filetype: mime }),
      });

      if (!response.ok) {
        throw new Error("Error generando URL firmada de S3");
      }

      const { url } = await response.json();
      console.log("✅ URL firmada obtenida");

      // 3. Convertir archivo a blob
      const fileData = await fetch(file.uri);
      const blob = await fileData.blob();

      console.log("📦 Blob creado, tamaño:", blob.size);

      // 4. Subir a S3
      const uploadResponse = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": mime },
        body: blob,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.log("❌ ERROR AWS:", errorText);
        throw new Error("Error subiendo archivo a S3");
      }

      console.log("✅ Archivo subido a S3");

      // 5. Obtener URL pública
      const publicUrl = url.split("?")[0];
      console.log("🌐 URL pública:", publicUrl);

      // 6. Guardar en base de datos
      await savePhotoToDatabase(publicUrl);

      return publicUrl;

    } catch (error: any) {
      console.error("❌ Error en uploadClientPhotoToS3:", error);
      setErrorMessage("No se pudo subir la foto de perfil");
      setShowErrorModal(true);
      /*Alert.alert(
        "Error",
        error.message || "No se pudo subir la foto de perfil"
      );*/
      return null;
    } finally {
      setUploading(false);
    }
  };

  const savePhotoToDatabase = async (photoUrl: string) => {
    try {
      console.log("💾 Guardando en base de datos...");

      const response = await fetch(`${API_BASE_URL}/api/client-profile-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          profilePhoto: photoUrl
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Foto guardada en BD:', data.action);
        setPhotoUrl(photoUrl);
        onPhotoUploaded(photoUrl);
        setSuccessMessage('Foto de perfil actualizada correctamente');
        setShowSuccessModal(true);

        //Alert.alert('¡Éxito!', 'Foto de perfil actualizada correctamente');
      } else {
        throw new Error(data.error || 'Error guardando foto en BD');
      }
    } catch (error: any) {
      console.error('❌ Error guardando en BD:', error);
      throw error;
    }
  };

  const handleSelectPhoto = async () => {
    try {
      console.log("🖼️ Abriendo selector de imágenes con recorte...");

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
        console.log("❌ Selección cancelada");
        return;
      }

      const selected = result.assets[0];
      const selectedFile = {
        uri: selected.uri,
        name: selected.fileName || `client_profile_${phone}_${Date.now()}.jpg`,
        size: selected.fileSize,
        mimeType: selected.mimeType || "image/jpeg",
      };

        console.log("📸 Archivo seleccionado:", {
          name: selected.name,
          size: selected.size,
          type: selected.mimeType
        });

        // Validar tamaño (máximo 5MB)
        if (selectedFile.size && selectedFile.size > 5 * 1024 * 1024) {
          setErrorMessage("La imagen no debe superar 5MB. Por favor selecciona una imagen más pequeña.");
          setShowErrorModal(true);
          /*Alert.alert(
            'Imagen muy grande',
            'La imagen no debe superar 5MB. Por favor selecciona una imagen más pequeña.'
          );*/
          return;
        }

        // Validar que sea una imagen
        if (!selectedFile.mimeType?.startsWith('image/')) {
          setErrorMessage("Por favor selecciona una imagen válida");
          setShowErrorModal(true);
          //Alert.alert('Error', 'Por favor selecciona una imagen válida');
          return;
        }

        const uploadedUrl = await uploadClientPhotoToS3(selectedFile);

        if (!uploadedUrl) {
          console.log("❌ No se pudo subir la imagen");
        }
    } catch (error) {
      console.error('❌ Error en handleSelectPhoto:', error);
      setErrorMessage("No se pudo seleccionar la imagen");
      setShowErrorModal(true);
      //Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleSelectPhoto}
      disabled={uploading}
      activeOpacity={0.7}
    >
      {uploading ? (
        <View style={[styles.loadingContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Subiendo...</Text>
        </View>
      ) : (
        <>
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={[styles.profileImage, { width: size, height: size, borderRadius: size / 2 }]}
            />
          ) : (
            <Image
              source={require("../../../assets/UserCircle.png")}
              style={[styles.profileImage, { width: size, height: size, borderRadius: size / 2 }]}
            />
          )}

          <View style={styles.editBadge}>
            <Text style={styles.editIcon}>📷</Text>
          </View>
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
    resizeMode: 'cover',
  },
  loadingContainer: {
    backgroundColor: COLORS.backgroundMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  editIcon: {
    fontSize: 14,
  },
});