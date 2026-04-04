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

const DefaultTextInputDriverBlackPassword = ({
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
  eyeButton: {
    position: 'absolute',
    right: 15
  },
    containterTextInput: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    width: "98%",
    margin: "auto",
    borderRadius: 8,
  
  borderWidth: 1,
  borderColor: "#D3D3D3", 
    backgroundColor: "white",
    position:"relative"
  },
  textInput: {
    color: "black",
    width: "100%",
    fontSize: 16,
    paddingLeft: 0,
    textAlign: "left",
     paddingStart:12,
    margin:0  
  },
  imageTextIcon: {
    width: 20,
    height: 20,
    marginRight: 0,
    marginLeft:10,
    position:"absolute",
    left:20
  },
  textButton: {
    color: "white",
    fontSize: 16,
    fontWeight: "400"
  }
});

export default DefaultTextInputDriverBlackPassword