import React, { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

export default function KeyboardAwareView({ children }: { children: React.ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      Animated.timing(translateY, {
        toValue: -e.endCoordinates.height / 2,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
