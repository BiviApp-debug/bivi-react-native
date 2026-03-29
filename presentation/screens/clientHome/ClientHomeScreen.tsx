import { Image, View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import styles from './Styles';
import { useContext, useEffect, useState } from 'react';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import { dataContext } from '../../context/Authcontext';
import React from 'react';

interface Props extends StackScreenProps<RootStackParamList, "ClientHomeScreen"> { };

export default function ClientHomeScreen({ navigation, route }: Props) {

   const {authResponse,setAuthResponse} = useContext(dataContext)
 
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps='handled'
      >
        <View style={styles.container}>
          <Text
            style={styles.textLogin}
          >
            Cliente Home 
          </Text>
             <TouchableOpacity
              onPress={() => navigation.pop()}
            >
              <Image
                style={styles.back_button}
                source={require("../../../assets/back.png")}
              />
            </TouchableOpacity>
        </View>
       
      </ScrollView>


    </KeyboardAvoidingView>

  )
}



