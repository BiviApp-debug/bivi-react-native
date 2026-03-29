// socket.ts
import { io } from "socket.io-client";
import { API_BASE_URL } from "../API/API";


// función para crear socket con username
export const connectSocket = (username: string) => {
  const socket = io(API_BASE_URL, {
    transports: ["websocket"], // asegura comunicación estable
    query: { username },       // <--- aquí pasamos el username al backend
  });

  socket.on("connect", () => {
    //console.log("🔌 Conectado al servidor con id:", socket.id);
  });

  socket.on("disconnect", () => {
    //console.log("❌ Desconectado del servidor");
  });

  return socket;
};
