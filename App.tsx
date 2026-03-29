import { NavigationContainer } from "@react-navigation/native";
import { MainStackNavigator } from "./presentation/navigator/MainStackNavigator";
import React, { useEffect } from "react";
import { ChatNotificationProvider } from "./presentation/context/ChatNotificationContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initServerKeepAlive, destroyServerKeepAlive } from "./presentation/utils/ServerKeepAlive";

export default function App() {

  if (typeof window !== 'undefined') {
    (window as any).crypto = {
      getRandomValues: (arr: Uint8Array) => {
        if (arr instanceof Uint8Array) {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
        }
        return arr;
      }
    };
  }

  useEffect(() => {
    initServerKeepAlive();
    return () => destroyServerKeepAlive();
  }, []);

  return (
    <SafeAreaProvider>
      <ChatNotificationProvider>
        <NavigationContainer>
          <MainStackNavigator />
        </NavigationContainer>
      </ChatNotificationProvider>
    </SafeAreaProvider>
  );
}
