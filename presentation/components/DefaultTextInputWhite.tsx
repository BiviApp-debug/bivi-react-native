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

const DefaultTextInputWhite = ({ placeholder, value, onChangeText, keyBoarType, icon, secureText }: Props) => {
  return (
    <View style={styles.containterTextInput}>
      {icon && (
        <Image
                source={icon}
                style={styles.imageTextIcon}
              />
      )

      }

      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor={"black"}
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
  textButton: {
    color: "white",
    fontSize: 16,
    fontWeight: "400"
  }
})

export default DefaultTextInputWhite