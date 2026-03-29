import { Image, StyleSheet, View,TextInput, KeyboardType } from 'react-native';
import React from 'react';
interface Props {
 placeholder : string,
 value:string,
 onChangeText : (text:string) => void,
 keyBoarType?:KeyboardType,
 icon :any
 secureText:boolean
}

const DefaultTextInputValidate = ({placeholder,value,onChangeText,keyBoarType,icon, secureText }: Props) => {
    return (
       <View style={styles.containterTextInput}>
                
                 <TextInput
                   style={styles.textInput}
                   placeholder={placeholder}
                   placeholderTextColor={"black"}
                   onChangeText = {text => onChangeText(text)}
                   keyboardType ={keyBoarType || 'default'}
                   value={value}
                   secureTextEntry = {secureText || false}
                 />
                  <Image
                   source={icon}
                   style={styles.imageTextIcon}
                 />
               </View>
    )
}


const styles = StyleSheet.create({
 
  containterTextInput: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    width: "90%",
    borderBottomWidth: 1,
    borderBottomColor: "white",
  },
  textInput: {
    color: "black",
    width: "90%",
    margin:"auto",
    fontSize: 16,
    height:"100%",
    backgroundColor:"#F2F2F7"
  },
 imageTextIcon: {
    width: 15,
    height: 15,
    right:25,
    position:"absolute"
  },
  textButton: {
    color: "white",
    fontSize: 16,
    fontWeight: "400"
  }
})

export default DefaultTextInputValidate