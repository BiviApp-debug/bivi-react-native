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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import { API_BASE_URL } from '../../API/API';
import { io } from 'socket.io-client';
import { dataContext } from '../../context/Authcontext';
import { useChatNotification } from '../../context/ChatNotificationContext';
import { useIsFocused } from '@react-navigation/native';
import { getActiveTravelsByConductor } from '../../utils/getActiveTravels';
import { fetchMessages } from '../../utils/fetchMessages';
import { sendMessageToServer } from '../../utils/sendMessage';
import { takePhotoWithBase64, uploadImageToS3 } from '../../utils/cameraUtils';
import ErrorModal from '../../components/ErrorModal';

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

interface Props extends StackScreenProps<RootStackParamList, "DriverChatScreen"> { }

export default function DriverChatScreen({ navigation }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [userPhoto, setUserPhoto] = useState('');
    const [userName, setUserName] = useState('');
    const [clientId, setClientId] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const { authResponse } = useContext(dataContext);
    const { clearUnread, incrementUnread, playNotificationSound } = useChatNotification();
    const isFocused = useIsFocused();

    const flatListRef = useRef<FlatList>(null);

    // Mensajes rápidos para el conductor
    const quickMessages = [
        '¡Ya voy en camino! 🚗',
        'Llegando en 5 minutos ⏱️',
        '¿Dónde te encuentras exactamente? 📍',
        'Estoy afuera, te espero 👋',
    ];

    // ============================================================
    // INICIALIZACIÓN - Cargar viaje activo, cliente y foto
    // ============================================================
    useEffect(() => {
        (async () => {
            try {
                const response = await getActiveTravelsByConductor(authResponse?.usuario?.phone);
                // console.log('📍 Driver response:', response);
                
                if (response?.data?.length > 0) {
                    const travel = response.data[0];
                    const clientPhone = travel.clientid || '';
                    setClientId(clientPhone);
                    setUserName(travel.user || 'Pasajero');
                    
                    // Cargar historial de mensajes
                    if (clientPhone && authResponse?.usuario?.phone) {
                        loadMessages(clientPhone, authResponse.usuario.phone);
                    }
                    
                    // Cargar foto del cliente
                    if (clientPhone) {
                        const photoRes = await fetch(`${API_BASE_URL}/api/client-profile-photo/${clientPhone}`);
                        if (photoRes.ok) {
                            const data = await photoRes.json();
                            if (data?.data?.profilePhoto) {
                                setUserPhoto(data.data.profilePhoto);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('❌ Error cargando datos del chat:', e);
            }
        })();
    }, [authResponse?.usuario?.phone]);

    // ============================================================
    // GET HISTORIAL DE MENSAJES
    // ============================================================
    const loadMessages = async (client: string, driverPhone: string) => {
        try {
            const data = await fetchMessages(client, driverPhone);
            // console.log("📨 Mensajes cargados:", data);

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

                setMessages(formattedMessages);
            }
        } catch (error) {
            console.error('❌ Error cargando mensajes:', error);
        }
    };

    // ============================================================
    // LIMPIAR NOTIFICACIÓN AL ENTRAR AL CHAT
    // ============================================================
    useEffect(() => {
        if (isFocused) {
            // console.log('👀 Chat enfocado - limpiando contador');
            clearUnread();
        }
    }, [isFocused, clearUnread]);

    // ============================================================
    // SOCKET: Escuchar mensajes entrantes del pasajero
    // ============================================================
    useEffect(() => {
        const driverPhone = authResponse?.usuario?.phone;
        if (!clientId || !driverPhone) return;

        const channel = `chat_message${clientId}_${driverPhone}`;
        // console.log('🔌 Conectado al canal:', channel);

        socket.on(channel, (message) => {
           // console.log("🔥 LLEGÓ SOCKET:", message);

            const cleanText =
                typeof message.text === "string"
                    ? message.text
                    : message.text?.text ?? "";

            const messageId = message.id?.toString();

            // ✅ Verificar si ya existe este mensaje
            setMessages((prev) => {
                const existingIndex = prev.findIndex(msg => msg.id === messageId);

                if (existingIndex !== -1) {
                    // console.log('⚠️ Mensaje ya existe, no duplicar');
                    return prev;
                }

                // Si es mi mensaje (driver), buscar y actualizar el temporal
                if (message.sender === 'driver') {
                    const tempIndex = prev.findIndex(
                        msg => msg.status === 'sending' &&
                            msg.messageType === message.messageType
                    );

                    if (tempIndex !== -1) {
                        // console.log('🔄 Actualizando mensaje temporal');
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

                // Mensaje del pasajero, agregarlo
               //  console.log('➕ Agregando mensaje nuevo del pasajero');
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

            // ✅ INCREMENTAR CONTADOR SI NO ESTÁ ENFOCADO Y ES MENSAJE DEL PASAJERO
            if (!isFocused && message.sender === 'user') {
                // console.log('🔔 Incrementando contador de no leídos');
                incrementUnread();
                playNotificationSound();
            }

            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });

        return () => {
            socket.off(channel);
           // console.log('🔌 Desconectado del canal:', channel);
        };
    }, [clientId, authResponse?.usuario?.phone, isFocused, incrementUnread, playNotificationSound]);

    // ============================================================
    // ENVIAR MENSAJE DE TEXTO
    // ============================================================
    const sendMessage = async (text?: string) => {
        const messageText = (text || inputText.trim()).trim();
        if (messageText === '' || !clientId) return;

        const tempId = Date.now().toString();
        const tempMessage: Message = {
            id: tempId,
            text: messageText,
            sender: 'driver',
            timestamp: new Date(),
            status: 'sending',
            messageType: 'text',
        };

        setMessages((prev) => [...prev, tempMessage]);
        setInputText('');

        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        try {
            const response = await sendMessageToServer(
                messageText,
                clientId,
                authResponse.usuario.phone,
                'driver'
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
           // console.log('🎬 Iniciando proceso de tomar foto...');
            setIsUploading(true);

            const photo = await takePhotoWithBase64();

            if (!photo || !photo.base64) {
                // console.log('⚠️ No se obtuvo foto');
                setIsUploading(false);
                return;
            }

            const tempId = Date.now().toString();

            const tempMessage: Message = {
                id: tempId,
                text: '📷 Subiendo imagen...',
                sender: 'driver',
                timestamp: new Date(),
                status: 'sending',
                messageType: 'image',
                mediaUrl: photo.uri
            };

            setMessages(prev => [...prev, tempMessage]);

            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

           // console.log('☁️ Subiendo a S3...');
            const s3Url = await uploadImageToS3(photo.base64);

            if (!s3Url) {
                throw new Error('No se obtuvo URL de S3');
            }

            // console.log('✅ URL de S3 obtenida:', s3Url);

            const response = await sendMessageToServer(
                'Imagen',
                clientId,
                authResponse.usuario.phone,
                'driver',
                'image',
                s3Url
            );

            if (!response.success) {
                throw new Error('Error enviando mensaje');
            }

           // console.log('✅ Mensaje enviado exitosamente, ID:', response.id);

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
           // console.log('🎉 Proceso completado exitosamente');

        } catch (error) {
            const err = error as Error;
            console.error('❌ Error en handleTakePhoto:', error);
            setErrorMessage("Error al enviar la foto");
            setShowErrorModal(true);

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
       
        const isDriver = item.sender === 'driver';

        return (
            <View
                style={[
                    styles.messageBubble,
                    isDriver ? styles.driverBubble : styles.userBubble,
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
                    <Text style={[styles.messageText, isDriver && styles.driverText]}>
                        {item.text}
                    </Text>
                )}

                <View style={styles.messageFooter}>
                    <Text style={[styles.timestamp, isDriver && styles.driverTimestamp]}>
                        {item.timestamp.toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                    {isDriver && (
                        <Ionicons
                            name={
                                item.status === 'sent'
                                    ? 'checkmark-done'
                                    : item.status === 'sending'
                                        ? 'time-outline'
                                        : 'alert-circle'
                            }
                            size={14}
                            color={
                                item.status === 'error'
                                    ? 'red'
                                    : item.status === 'sent'
                                        ? '#4A90E2'
                                        : '#fff'
                            }
                            style={{ marginLeft: 4 }}
                        />
                    )}
                </View>
            </View>
        );
    };

    // ============================================================
    // LLAMADA TELEFÓNICA
    // ============================================================
    const handleCall = async () => {
        if (!clientId) return;
        try {
            await fetch(`${API_BASE_URL}/call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneA: clientId,
                    phoneB: authResponse?.usuario?.phone,
                }),
            });
        } catch (e) {
            // console.log('Error al iniciar llamada:', e);
        }
    };

    return (
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
                        <Ionicons name="arrow-back" size={26} color="#fff" />
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
                            <Text style={styles.userStatus}>Pasajero</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.phoneButton}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        onPress={handleCall}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="call" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Mensajes rápidos */}
                <View style={styles.quickMessagesContainer}>
                    <FlatList
                        horizontal
                        data={quickMessages}
                        keyExtractor={(item, index) => index.toString()}
                        showsHorizontalScrollIndicator={false}
                        extraData={quickMessages}
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

                {/* Área de mensajes */}
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

                {/* Input */}
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
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#1A1A1A',
    },
    keyboardView: {
        flex: 1,
        backgroundColor: '#0D0D0D',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        paddingVertical: 12,
        paddingHorizontal: 14,
        minHeight: 56,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
            },
            android: { elevation: 4 },
        }),
    },
    backButton: {
        marginRight: 10,
        padding: 4,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    avatarPlaceholder: {
        backgroundColor: '#FFB800',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    userStatus: {
        fontSize: 12,
        color: '#BBB',
        marginTop: 2,
    },
    phoneButton: {
        padding: 8,
    },
    quickMessagesContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingVertical: 12,
    },
    quickMessagesList: {
        paddingHorizontal: 12,
        alignItems: 'center',
        paddingRight: 12,
    },
    quickMessageButton: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    quickMessageText: {
        fontSize: 14,
        color: '#333',
    },
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
        paddingHorizontal: 40,
    },
    messageBubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    driverBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#1A1A1A',
        borderBottomRightRadius: 4,
    },
    userBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    messageText: {
        fontSize: 15,
        color: '#000',
        lineHeight: 20,
    },
    driverText: {
        color: '#fff',
    },
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
        justifyContent: 'flex-end',
    },
    timestamp: {
        fontSize: 11,
        color: '#666',
    },
    driverTimestamp: {
        color: '#BBB',
    },
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
    sendButtonDisabled: {
        backgroundColor: '#D0D0D0',
    },
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