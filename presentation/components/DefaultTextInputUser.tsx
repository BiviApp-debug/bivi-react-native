import { Image, StyleSheet, View, TextInput, KeyboardType } from 'react-native';
import React from 'react';
interface Props {
  placeholder: string,
  value: string,
  onChangeText: (text: string) => void,
  keyBoarType?: KeyboardType,
  icon: any
  secureText: boolean
}

const DefaultTextInputUser = ({ placeholder, value, onChangeText, keyBoarType, icon, secureText }: Props) => {
  return (
    <View style={styles.containterTextInput}>

      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor={"#6e6e6ec4"}
        onChangeText={text => onChangeText(text)}
        keyboardType={keyBoarType || 'default'}
        value={value}
        secureTextEntry={secureText || false}
      />
    </View>
  )
}


const styles = StyleSheet.create({

  containterTextInput: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    width: "100%",

  },
  textInput: {
    color: "black",
    width: "100%",
    fontSize: 16,
    backgroundColor: "#ffffff31",
    borderRadius: 8,
    paddingLeft: 20,
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
  textButton: {
    color: "white",
    fontSize: 16,
    fontWeight: "400"
  }
})

export default DefaultTextInputUser