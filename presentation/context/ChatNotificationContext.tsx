import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';

interface ChatNotificationContextType {
  unreadCount: number;
  incrementUnread: () => void;
  clearUnread: () => void;
  playNotificationSound: () => void;
}

const ChatNotificationContext = createContext<ChatNotificationContextType | null>(null);

export function ChatNotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
    }).catch(() => {});
  }, []);

  const incrementUnread = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const playNotificationSound = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 80, 40, 80]);
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/notification_chat.wav'),
        { shouldPlay: true, volume: 0.8, isLooping: false }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinishAndNotJustLooped) {
          sound.unloadAsync().catch(() => {});
        }
      });
      setTimeout(() => {
        sound.stopAsync().then(() => sound.unloadAsync()).catch(() => {});
      }, 200);
    } catch (error) {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(150);
      }
    }
  }, []);

  return (
    <ChatNotificationContext.Provider
      value={{ unreadCount, incrementUnread, clearUnread, playNotificationSound }}
    >
      {children}
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotification() {
  const context = useContext(ChatNotificationContext);
  if (!context) {
    return {
      unreadCount: 0,
      incrementUnread: () => {},
      clearUnread: () => {},
      playNotificationSound: () => {},
    };
  }
  return context;
}