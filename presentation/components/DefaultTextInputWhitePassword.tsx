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

const DefaultTextInputWhitePassword = ({
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
      {icon && (
        <Image
          source={icon}
          style={styles.imageTextIcon}
        />
      )}

      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor="black"
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
    width: "95%",
    borderWidth: 1,
    borderColor: 'black',
    paddingLeft: 10,
    borderRadius: 25,

  },
  textInput: {
    color: "black",
    width: "80%",
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    paddingLeft: 10,

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

export default DefaultTextInputWhitePassword