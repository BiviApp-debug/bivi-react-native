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

const DefaultTextInputDriverBlack = ({ placeholder, value, onChangeText, keyBoarType, icon, secureText }: Props) => {
  return (
    <View style={styles.containterTextInput}>
      <Image
        source={icon}
        style={styles.imageTextIcon}
      />
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor={"#c7c7c756"}
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
    height: 58,
    width: "98%",
    margin: "auto",
    borderRadius: 8,
    backgroundColor: "white",
  borderWidth: 1,
  borderColor: "#D3D3D3",
    position:"relative"
  },
  textInput: {
    color: "white",
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
})

export default DefaultTextInputDriverBlack