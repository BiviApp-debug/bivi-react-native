import { TouchableOpacity, StyleSheet, Text } from 'react-native';

interface Props {
    text: string,
    onPress: () => void
    color?:string
}

const EditButon = ({ text, onPress,color }: Props) => {

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.botones,{backgroundColor:color || "black"}]}
        >
            <Text style={styles.textButton}>{text}</Text>
        </TouchableOpacity>
    )
}


const styles = StyleSheet.create({
    textButton: {
        color: "white",
        fontSize: 16,
        fontWeight: "400"
    },
    botones: {
        height: 50,
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        width: "30%",
        padding: 10,
    },
})

export default EditButon