// ============================================================
// ARCHIVO 1: UserChatScreen.tsx (CORREGIDO)
// ============================================================
import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import { dataContext } from '../../context/Authcontext';
import { useChatNotification } from '../../context/ChatNotificationContext';
import { useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../../API/API';
import { io } from 'socket.io-client';
import { getActiveTravelsByClient, getActiveTravelsByConductor } from '../../utils/getActiveTravels';
import { fetchMessages } from '../../utils/fetchMessages';
import { sendMessageToServer } from '../../utils/sendMessage';
import { takePhotoWithBase64, uploadImageToS3 } from '../../utils/cameraUtils';
import ErrorModal from '../../components/ErrorModal';
import COLORS from '../../utils/colors';

const socket = io(`${API_BASE_URL}`, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'driver';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'read' | 'error';
  messageType?: 'text' | 'image';
  mediaUrl?: string;
}

interface Props extends StackScreenProps<RootStackParamList, "UserChatScreen"> { }

export default function UserChatScreen({ navigation, route }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [userPhoto, setUserPhoto] = useState('');
  const [userName, setUserName] = useState('');
  const [driver, setDriver] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { authResponse } = useContext(dataContext);
  const { clearUnread, incrementUnread, playNotificationSound } = useChatNotification();
  const isFocused = useIsFocused();

  const quickMessages = authResponse.usuario.role === "driver_role"
    ? ["¡Ya voy en camino! 🚗", "Llegando en 5 min ⏱️", "¿Dónde te encuentras? 📍", "Estoy afuera 👋"]
    : ["Hola, ¿vas tarde? ⏰", "¿Dónde estás? 📍", "Ya te espero afuera 👋", "Gracias 🙏"];

  const preAcceptClientId = route?.params?.preAcceptClientId;
  const preAcceptDriverPhone = route?.params?.preAcceptDriverPhone;

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================
  useEffect(() => {
    (async () => {
      try {
        // Chat pre-aceptacion para domicilios
        if (preAcceptClientId && preAcceptDriverPhone) {
          setClientId(preAcceptClientId);
          setDriver(preAcceptDriverPhone);
          setUserName("Cliente (Domicilio)");
          loadMessages(preAcceptClientId, preAcceptDriverPhone);
          try {
            const photoRes = await fetch(
              `${API_BASE_URL}/api/client-profile-photo/${preAcceptClientId}`
            );
            if (photoRes.ok) {
              const d = await photoRes.json();
              if (d?.data?.profilePhoto) setUserPhoto(d.data.profilePhoto);
            }
          } catch (e) {
            console.log("No se encontro foto de perfil pre-accept");
          }
          return;
        }
        if (authResponse.usuario.role === "driver_role") {
          const verifyResponse = await getActiveTravelsByConductor(authResponse.usuario.phone);
          console.log('📍 Driver response:', verifyResponse);

          if (verifyResponse?.data && verifyResponse.data.length > 0) {
            const travel = verifyResponse.data[0];
            const cid = travel.clientid;
            setClientId(cid);
            setDriver(authResponse.usuario.phone);
            setUserName(travel.user || 'Pasajero');
            loadMessages(cid, authResponse.usuario.phone);
            const photoRes = await fetch(`${API_BASE_URL}/api/client-profile-photo/${cid}`);
            if (photoRes.ok) {
              const d = await photoRes.json();
              if (d?.data?.profilePhoto) setUserPhoto(d.data.profilePhoto);
            }
          }

        } else if (authResponse.usuario.role === "user_client") {
          const verifyResponse = await getActiveTravelsByClient(authResponse.usuario.phone);
          console.log('📍 Client response:', verifyResponse);

          if (verifyResponse?.data && verifyResponse.data.length > 0) {
            const travel = verifyResponse.data[0];
            const drv = travel.conductor;
            setClientId(authResponse.usuario.phone);
            setDriver(drv);
            setUserName('Conductor');
            loadMessages(authResponse.usuario.phone, drv);
            const photoRes = await fetch(`${API_BASE_URL}/api/driver-profile-photo/${drv}`);
            if (photoRes.ok) {
              const d = await photoRes.json();
              if (d?.data?.profilePhoto) setUserPhoto(d.data.profilePhoto);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error en inicialización:', error);
      }
    })();
  }, [
    preAcceptClientId,
    preAcceptDriverPhone,
    authResponse?.usuario?.phone,
    authResponse?.usuario?.role,
  ]);

  // ============================================================
  // GET HISTORIAL DE MENSAJES
  // ============================================================
  const loadMessages = async (user1: string, user2: string) => {
    console.log(user1,user2,"holas_datas_3456");
    
    
    try {
      const data = await fetchMessages(user1, user2);
      console.log("📨 Mensajes cargados:", data);

      if (data && data.length > 0) {
        const formattedMessages = data.map((m: any) => ({
          id: m.id.toString(),
          text: m.text,
          sender: m.sender as 'user' | 'driver',
          timestamp: new Date(m.timestamp),
          status: m.status || "sent",
          messageType: m.messageType || "text",
          mediaUrl: m.mediaUrl || null,
        }));
        console.log(data,"hola");
        

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('❌ Error cargando mensajes:', error);
    }
  };



  // ============================================================
  // SOCKET: Escuchar mensajes entrantes
  // ============================================================
  useEffect(() => {
    if (!clientId || !driver) return;

    const channel = `chat_message${clientId}_${driver}`;
    console.log('🔌 Conectado al canal:', channel);

    socket.on(channel, (message) => {
      console.log("🔥 LLEGÓ SOCKET:", message);

      const cleanText =
        typeof message.text === "string"
          ? message.text
          : message.text?.text ?? "";

      const messageId = message.id?.toString();
      const isDriver = authResponse.usuario.role === "driver_role";
      const myRole: 'user' | 'driver' = isDriver ? 'driver' : 'user';

      // ✅ Si es mi propio mensaje, solo actualizar el temporal
      setMessages((prev) => {
        // Verificar si ya existe este mensaje
        const existingIndex = prev.findIndex(msg => msg.id === messageId);

        if (existingIndex !== -1) {
          console.log('⚠️ Mensaje ya existe, no duplicar');
          return prev;
        }

        // Si es mi mensaje, buscar y actualizar el temporal
        if (message.sender === myRole) {
          const tempIndex = prev.findIndex(
            msg => msg.status === 'sending' &&
              msg.messageType === message.messageType
          );

          if (tempIndex !== -1) {
            console.log('🔄 Actualizando mensaje temporal');
            const updated = [...prev];
            updated[tempIndex] = {
              ...updated[tempIndex],
              id: messageId ?? Date.now().toString(),
              status: 'sent',
              mediaUrl: message.mediaUrl || updated[tempIndex].mediaUrl,
            };
            return updated;
          }
        }

        // Mensaje de otro usuario, agregarlo
        console.log('➕ Agregando mensaje nuevo');
        return [
          ...prev,
          {
            id: messageId ?? Date.now().toString(),
            text: cleanText,
            sender: message.sender,
            timestamp: new Date(message.timestamp),
            status: "sent",
            messageType: message.messageType || "text",
            mediaUrl: message.mediaUrl || null,
          }
        ];
      });

      // ✅ INCREMENTAR CONTADOR SI NO ESTÁ ENFOCADO Y ES MENSAJE DE OTRO
      if (!isFocused && message.sender !== myRole) {
        console.log('🔔 Incrementando contador de no leídos');
        incrementUnread();
        playNotificationSound();
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      socket.off(channel);
      console.log('🔌 Desconectado del canal:', channel);
    };
  }, [clientId, driver, authResponse.usuario.role, isFocused, incrementUnread, playNotificationSound]);

  // ✅ LIMPIAR CONTADOR AL ENTRAR AL CHAT
  useEffect(() => {
    if (isFocused) {
      console.log('👀 Chat enfocado - limpiando contador');
      clearUnread();
    }
  }, [isFocused, clearUnread]);


  // ============================================================
  // ENVIAR MENSAJE DE TEXTO
  // ============================================================

  const sendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (messageText === '') return;

    const tempId = Date.now().toString();
    const isDriver = authResponse.usuario.role === "driver_role";
    const messageSender: 'user' | 'driver' = isDriver ? 'driver' : 'user';

    const tempMessage: Message = {
      id: tempId,
      text: messageText,
      sender: messageSender,
      timestamp: new Date(),
      status: 'sending',
      messageType: 'text',
    };

    setMessages(prev => [...prev, tempMessage]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await sendMessageToServer(
        messageText,
        clientId,
        driver,
        messageSender
      );

      if (!response.success) throw new Error("Error al enviar");

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, id: response.id.toString(), status: "sent" }
            : msg
        )
      );

    } catch (error) {
      console.error("❌ Error enviando mensaje:", error);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, status: "error" }
            : msg
        )
      );
    }
  };

  // ============================================================
  // TOMAR FOTO Y ENVIAR
  // ============================================================
  const handleTakePhoto = async () => {
    try {
      console.log('🎬 Iniciando proceso de tomar foto...');
      setIsUploading(true);

      // 1. Tomar foto con base64
      const photo = await takePhotoWithBase64();

      if (!photo || !photo.base64) {
        console.log('⚠️ No se obtuvo foto');
        setIsUploading(false);
        return;
      }

      const tempId = Date.now().toString();
      const isDriver = authResponse.usuario.role === "driver_role";
      const messageSender: 'user' | 'driver' = isDriver ? 'driver' : 'user';

      console.log(`👤 Enviando como: ${messageSender}`);

      // 2. Crear mensaje temporal con preview local
      const tempMessage: Message = {
        id: tempId,
        text: '📷 Subiendo imagen...',
        sender: messageSender,
        timestamp: new Date(),
        status: 'sending',
        messageType: 'image',
        mediaUrl: photo.uri // Preview local
      };

      setMessages(prev => [...prev, tempMessage]);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // 3. Subir a S3
      console.log('☁️ Subiendo a S3...');
      const s3Url = await uploadImageToS3(photo.base64);

      if (!s3Url) {
        throw new Error('No se obtuvo URL de S3');
      }

      console.log('✅ URL de S3 obtenida:', s3Url);

      // 4. Enviar mensaje con URL de S3
      console.log('💬 Enviando mensaje al servidor...');
      const response = await sendMessageToServer(
        'Imagen',
        clientId,
        driver,
        messageSender,
        'image',
        s3Url
      );

      if (!response.success) {
        throw new Error('Error enviando mensaje');
      }

      console.log('✅ Mensaje enviado exitosamente, ID:', response.id);

      // 5. Actualizar mensaje con URL real de S3
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? {
              ...msg,
              id: response.id.toString(),
              status: 'sent',
              text: 'Imagen',
              mediaUrl: s3Url
            }
            : msg
        )
      );

      setIsUploading(false);
      console.log('🎉 Proceso completado exitosamente');

    } catch (error) {
      const err = error as Error;
      console.error('❌ Error en handleTakePhoto:', error);
      setErrorMessage("Error desconocido");
      setShowErrorModal(true);
      alert(`Error al enviar la foto: ${err?.message || 'Error desconocido'}`);

      // Marcar mensaje como error
      setMessages(prev =>
        prev.map(msg =>
          msg.status === 'sending' && msg.messageType === 'image'
            ? { ...msg, status: 'error', text: '❌ Error al enviar' }
            : msg
        )
      );

      setIsUploading(false);
    }
  };

  // ============================================================
  // RENDER MENSAJE
  // ============================================================
  const renderMessage = ({ item }: { item: Message }) => {
   
   const mySender: 'user' | 'driver' =
  authResponse.usuario.role === "driver_role" ? 'driver' : 'user';

const isMyMessage = item.sender === mySender;

    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
        ]}
      >
        {/* 🖼️ Si es imagen, mostrarla */}
        {item.messageType === 'image' && item.mediaUrl ? (
          <TouchableOpacity
            onPress={() => setFullScreenImage(item.mediaUrl!)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: item.mediaUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
            {item.status === 'sending' && (
              <View style={styles.imageOverlay}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.uploadingText}>Subiendo...</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.text}
          </Text>
        )}

        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, isMyMessage && styles.myTimestamp]}>
            {new Date(item.timestamp).toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>

          {isMyMessage && (
            <Ionicons
              name={
                item.status === 'sent'
                  ? 'checkmark-done'
                  : item.status === 'sending'
                    ? 'time-outline'
                    : 'alert-circle'
              }
              color={
                item.status === 'error'
                  ? 'red'
                  : item.status === 'sent'
                    ? '#4A90E2'
                    : '#ccc'
              }
              size={14}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>
    );
  };

  // ============================================================
  // UI
  // ============================================================
  const handleCall = async () => {
    const phoneNumber =
      authResponse.usuario.role === "driver_role"
        ? clientId
        : driver

    if (phoneNumber) {
      await makeCall(phoneNumber, authResponse.usuario.phone)
    }
  }


  const makeCall = async (phoneA: string, phoneB: string) => {
    const response = await fetch(`${API_BASE_URL}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneA, phoneB })
    })

    const data = await response.json()

    return data
  }



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.userInfo}>
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {userName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.userName} numberOfLines={1}>
                  {userName || 'Usuario'}
                </Text>
                <Text style={styles.userStatus}>
                  {authResponse.usuario.role === "driver_role" ? "Pasajero" : "Conductor"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={handleCall}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="call" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

        {/* Mensajes rápidos - visibles */}
        <View style={styles.quickMessagesContainer}>
          <FlatList
            horizontal
            data={quickMessages}
            extraData={quickMessages}
            keyExtractor={(item, index) => index.toString()}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.quickMessageButton}
                onPress={() => sendMessage(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickMessageText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.quickMessagesList}
          />
        </View>

        {/* Área de mensajes - scrollable */}
        <View style={styles.messagesArea}>
          <FlatList
            ref={flatListRef}
            data={messages}
            extraData={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && styles.messagesListEmpty
            ]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={56} color="#999" />
                <Text style={styles.emptyText}>
                  Usa los mensajes rápidos o escribe uno personalizado
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Input - siempre visible */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleTakePhoto}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            {isUploading ? (
              <ActivityIndicator color="#666" size="small" />
            ) : (
              <Ionicons name="camera" size={24} color="#666" />
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={true}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="send"
              size={22}
              color={inputText.trim() ? '#fff' : '#999'}
            />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* Modal para ver imagen en pantalla completa */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullScreenImage(null)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </SafeAreaView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1FF',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F1FF',
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#F4F1FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  backButton: {
    marginRight: 10,
    padding: 4,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  userStatus: { fontSize: 12, color: '#BBB', marginTop: 2 },
  phoneButton: { padding: 8 },
  quickMessagesContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 12,
  },
  quickMessagesList: { paddingHorizontal: 12, alignItems: 'center', paddingRight: 12 },
  quickMessageButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickMessageText: { fontSize: 14, color: '#333' },
  messagesArea: {
    flex: 1,
    minHeight: 100,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messagesListEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    minHeight: 200,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1A1A1A',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: { fontSize: 15, color: '#000', lineHeight: 20 },
  myMessageText: { color: '#fff' },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end'
  },
  timestamp: { fontSize: 11, color: '#666' },
  myTimestamp: { color: '#BBB' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    minHeight: 64,
  },
  cameraButton: {
    width: 48,
    height: 48,
    minWidth: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    paddingTop: 12,
    fontSize: 16,
    minHeight: 48,
    maxHeight: 100,
    marginRight: 10,
    color: '#000',
  },
  sendButton: {
    width: 48,
    height: 48,
    minWidth: 48,
    borderRadius: 24,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#D0D0D0' },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 12,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
});