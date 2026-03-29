import React, { TouchableOpacity, StyleSheet, Text, View } from 'react-native';


interface Props {
    text: string,
    onPress: () => void
    color?: string
}

const RoundedButtonFlex = ({ text, onPress, color }: Props) => {

    return (
        <View style={[styles.botones, { backgroundColor: color || "black" }]}>
            <TouchableOpacity
                onPress={onPress}
 style={{width:"100%",height:"100%", justifyContent:"center", alignContent:"center"}}
            >
                <Text style={styles.textButton}>{text}</Text>
            </TouchableOpacity>
        </View>

    )
}

const styles = StyleSheet.create({
    textButton: {
        color: "black",
        fontSize: 16,
        fontWeight: "700",
        width: "100%",
        textAlign:"center"
    },
    botones: {
          padding: 2,
        minWidth: "30%",
        height: 50,
        borderRadius: 8,
        position: "relative",
        display: "flex",
         width: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#BF6A02",
        borderStyle: "solid", // opcional, por defecto ya es "solid"
    },
})

export default RoundedButtonFlex