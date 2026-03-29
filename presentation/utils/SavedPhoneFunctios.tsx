import AsyncStorage from '@react-native-async-storage/async-storage';

export const loadSavedPhone = async () => {
    try {
        const savedPhone = await AsyncStorage.getItem('savedPhone');
        if (savedPhone !== null) {
            console.log('Teléfono guardado:', savedPhone);
            return savedPhone;
        }
    } catch (error) {
        console.log('Error al cargar teléfono guardado:', error);
    }
};

export const savePhone = async (phoneNumber: string) => {
    try {
        console.log(phoneNumber,"holaS_datos_567")
        await AsyncStorage.setItem('savedPhone', phoneNumber);
    } catch (error) {
        console.log('Error al guardar teléfono:', error);
    }
};