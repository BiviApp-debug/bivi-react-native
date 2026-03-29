import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';

interface Props {
    text: string,
    onPress: () => void
    color?: string
}

const RoundedButton = ({ text, onPress, color }: Props) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.button, { backgroundColor: color || "black" }]}
            activeOpacity={0.7}
        >
            <Text style={styles.textButton}>{text}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    button: {
        padding: 0,
        minWidth: "30%",
        height: 40,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#BF6A02",
    },
    textButton: {
        color: "black",
        fontSize: 16,
        fontWeight: "500",
        textAlign: "center"
    },
})

export default RoundedButton