import React, { TouchableOpacity, StyleSheet, Text, View, Image } from 'react-native';


interface Props {
    text: string,
    onPress: () => void
    color?: string
    icon?: any
}

const RoundedButtonBlack = ({ text, onPress, color, icon }: Props) => {

    return (
        <View style={[styles.botones, { backgroundColor: color || "black" }]}>


            <TouchableOpacity
                onPress={onPress}
                 style={{width:"100%",height:"100%", justifyContent:"center", alignContent:"center"}}
            >
                <Text style={styles.textButton}>{text}</Text>
                <Image
                    source={icon}
                    style={styles.imageTextIcon}
                />
            </TouchableOpacity>


        </View>

    )
}

const styles = StyleSheet.create({
    imageTextIcon: {
        width: 20,
        height: 20,
        position: "absolute",
        right: 20,
        textAlign:"center"
    },
    textButton: {
        color: "white",
        fontSize: 12,
        fontWeight: "800",
        width: "100%",
        minWidth: 130,
        marginRight: 30,
        textAlign:"center"
    },
    botones: {
        padding: 2,
        minWidth: "30%",
        height: 50,
        borderRadius: 25,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    },
})

export default RoundedButtonBlack