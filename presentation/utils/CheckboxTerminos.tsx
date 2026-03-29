import React, { useState } from 'react'
import { View, Text, Pressable, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons' // si usas Expo

export default function CheckboxTerminos({ onChange }: any) {
    const [checked, setChecked] = useState(false)

    const toggleCheck = () => {
        const newValue = !checked
        setChecked(newValue)
        onChange && onChange(newValue)
    }

    return (
        <Pressable
            onPress={toggleCheck}
            style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 10, paddingLeft: 20 }}
        >
            <View
                style={{
                    height: 16,
                    width: 16,
                    borderWidth: 1,
                    backgroundColor: 'white',
                    borderColor: 'white',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 2,
                    marginRight: 10,
                    marginTop: 5,

                }}
            >
                {checked && (
                    <Ionicons name="checkmark" size={14} color="black" />
                )}
            </View>

            <Text style={{ fontSize: 12, color: "white", paddingRight: 30,  }}>
                Al marcar la casilla, confirmo que revisé y acepto los{" "}

                <Text
                    style={{ fontWeight: "bold", textDecorationLine: "none" }}
                    onPress={() => Linking.openURL("https://www.motouberos.com.co/terminos")}
                >
                    Términos de uso
                </Text>

                {" "}y reconozco el{" "}

                <Text
                    style={{ fontWeight: "bold", textDecorationLine: "none" }}
                    onPress={() => Linking.openURL("https://www.motouberos.com.co/terminos")}
                >
                    Aviso de privacidad
                </Text>

                . Soy mayor de 18 años.
            </Text>

        </Pressable>
    )
}
