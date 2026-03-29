import React, { useEffect, useState } from 'react';
import { View, TextInput, FlatList, Text, Button, StyleSheet } from 'react-native';
import io from 'socket.io-client';

const socket = io("http://TU_SERVIDOR:PUERTO"); // reemplaza por tu backend

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<string[]>([]);

  useEffect(() => {
    socket.on("message", (msg: string) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off("message");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("message", message);
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chatMessages}
        renderItem={({ item }) => <Text style={styles.message}>{item}</Text>}
        keyExtractor={(item, index) => index.toString()}
      />
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Escribe un mensaje"
      />
      <Button title="Enviar" onPress={sendMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  input: { borderWidth: 1, padding: 8, marginBottom: 10 },
  message: { padding: 5, backgroundColor: '#eee', marginVertical: 2 }
});
