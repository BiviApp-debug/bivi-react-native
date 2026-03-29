import {
  Image,
  StyleSheet,
  View,
  TextInput,
  KeyboardType,
  TouchableOpacity
} from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyBoarType?: KeyboardType;
  icon: any;
  secureText: boolean;
}

const DefaultTextInputUserLogin = ({
  placeholder,
  value,
  onChangeText,
  keyBoarType,
  icon,
  secureText
}: Props) => {

  const [secure, setSecure] = useState(secureText);

  return (
    <View style={styles.containterTextInput}>

      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor="#6e6e6ec4"
        onChangeText={onChangeText}
        keyboardType={keyBoarType || 'default'}
        value={value}
        secureTextEntry={secure}
      />

      {/* Ojito solo si es password */}
      {secureText && (
        <TouchableOpacity
          onPress={() => setSecure(!secure)}
          style={styles.eyeButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name={secure ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="black"
          />
        </TouchableOpacity>
      )}

    </View>
  );
};


const styles = StyleSheet.create({
  containterTextInput: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    width: "100%",
    position: "relative" // necesario para el ojito
  },
  textInput: {
    color: "black",
    width: "100%",
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingLeft: 20,
    paddingRight: 45, 
    paddingHorizontal: 20,
    height: 50,
  borderWidth: 1,
  borderColor: "#D3D3D3",
    textAlign: "left",
    paddingStart:12
  },
  imageTextIcon: {
    width: 20,
    height: 20,
    marginRight: 15,
  },
  eyeButton: {
    position: 'absolute',
    right: 15
  },
  textButton: {
    color: "white",
    fontSize: 16,
    fontWeight: "400"
  }
});


export default DefaultTextInputUserLogin