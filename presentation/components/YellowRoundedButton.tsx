import React, { TouchableOpacity, StyleSheet, Text, View } from 'react-native';


interface Props {
    text: string,
    onPress: () => void
    color?: string
    width?:any
    height?:any
}

const YellowRoundedButton = ({ text, onPress, color, width, height }: Props) => {

    return (
        <View style={[styles.botones, { backgroundColor: color || "black", width:width || 90,height: height|| 30 }]}>
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
        fontSize: 14,
        fontWeight: "400",
        width: "100%",
        textAlign:"center"
    },
    botones: {
          padding: 2,
        minWidth: "20%",
        margin: "auto",
        borderRadius: 8,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#BF6A02",
        borderStyle: "solid", // opcional, por defecto ya es "solid"
    },
})

export default YellowRoundedButton