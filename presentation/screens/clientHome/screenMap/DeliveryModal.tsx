import React, { useContext, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    TextInput,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import COLORS from '../../../utils/colors';
import { dataContext } from '../../../context/Authcontext';
import { createDeliveryData } from '../../../utils/createDeliveryData';
import formatToCOP from '../../../utils/formatCop';
import ErrorModal from '../../../components/ErrorModal';

interface DeliveryModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (data: DeliveryData) => void;
}

export interface DeliveryData {
    weightRange: 'small' | 'medium' | 'large' | 'extra-large';
    description: string;
    itemValue?: string;
    recipientName?: string;
    recipientPhone?: string;
    specialInstructions?: string;
}

const DeliveryModal: React.FC<DeliveryModalProps> = ({
    visible,
    onClose,
    onConfirm,
}) => {
    const [slideAnim] = useState(new Animated.Value(Dimensions.get('window').height));
    const [selectedWeight, setSelectedWeight] = useState<'small' | 'medium' | 'large' | 'extra-large'>('small');
    const [description, setDescription] = useState('');
    const [itemValue, setItemValue] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const { authResponse } = useContext(dataContext);

    React.useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: Dimensions.get('window').height,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleConfirm = async () => {
        if (!description.trim()) {
            setErrorMessage("Por favor describe qué vas a enviar");
            setShowErrorModal(true);
            alert('Por favor describe qué vas a enviar');
            return;
        }

        const deliveryData: DeliveryData = {
            weightRange: selectedWeight,
            description: description.trim(),
            itemValue: itemValue.trim() || undefined,
            recipientName: recipientName.trim() || undefined,
            recipientPhone: recipientPhone.trim() || undefined,
            specialInstructions: specialInstructions.trim() || undefined,
        };

        const generarCodigoVerificacion = () => {
            return Math.floor(100000 + Math.random() * 900000).toString();
        };
        let result = await createDeliveryData(
            authResponse?.usuario?.phone,
            selectedWeight,
            description.trim(),
            generarCodigoVerificacion(),
            itemValue.trim(),
            recipientName.trim(),
            recipientPhone.trim(),
            specialInstructions.trim()
        );
        if (result) {
            onConfirm(deliveryData);
            resetForm();
            onClose();
        }
    };

    const resetForm = () => {
        setSelectedWeight('small');
        setDescription('');
        setItemValue('');
        setRecipientName('');
        setRecipientPhone('');
        setSpecialInstructions('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const weightOptions = [
        {
            id: 'food',
            label: 'Comida',
            icon: require('../../../../assets/food_icon.png'),
            weight: 'Hasta 2kg',
            description: '⭐Comida caliente ⭐Platos preparados ⭐Postres'
        },
        {
            id: 'store',
            label: 'Tiendas',
            icon: require('../../../../assets/store_icon.png'),
            weight: '2kg - 10kg',
            description: '⭐Mercado ⭐Medicamentos ⭐Higiene ⭐Belleza'
        },
        {
            id: 'liquor',
            label: 'Licores',
            icon: require('../../../../assets/licores_store.png'),
            weight: '10kg - 25kg',
            description: '⭐Cervezas ⭐Botellas de Licor ⭐Snacks'
        },
        {
            id: 'large-delivery',
            label: 'Encomiendas',
            icon: require('../../../../assets/box_icon.png'),
            weight: 'Más de 25kg',
            description: '⭐Documentos importantes ⭐Envió De Objetos ⭐Dinero ⭐Pago de facturas'
        },
    ];

    const sections = [
        { type: 'weightSelection', id: 'weight' },
        { type: 'description', id: 'desc' },
        { type: 'itemValue', id: 'value' },
        { type: 'recipientData', id: 'recipient' },
        { type: 'specialInstructions', id: 'instructions' },
        { type: 'infoBox', id: 'info' },
    ];

    const handleItemValueChange = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        setItemValue(cleaned);
    };

    const renderSection = ({ item }: { item: any }) => {
        switch (item.type) {
            case 'weightSelection':
                return (
                    <View style={styles.section}>
                        <View style={styles.weightGrid}>
                            {weightOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.weightOption,
                                        selectedWeight === option.id && styles.weightOptionSelected,
                                    ]}
                                    onPress={() => setSelectedWeight(option.id as any)}
                                >
                                    <Image style={styles.weightIcon} source={option.icon} />
                                    <Text style={[
                                        styles.weightLabel,
                                        selectedWeight === option.id && styles.weightLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={[{ display: "none" }, styles.weightText]}>{option.weight}</Text>
                                    <View style={styles.descriptionContainer}>
                                        {option.description.split('⭐').filter(item => item.trim()).map((item, index) => (
                                            <View key={index} style={styles.descriptionRow}>
                                                <Text style={styles.star}>⭐</Text>
                                                <Text style={styles.descriptionItem}>{item.trim()}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    {selectedWeight === option.id && (
                                        <View style={styles.selectedBadge}>
                                            <Text style={styles.selectedBadgeText}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 'description':
                return (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            DESCRIBE TU DOMICILIO DETALLADAMENTE <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Ej: 2 cajas de zapatos, documentos importantes, flores..."
                                placeholderTextColor={COLORS.textSecondary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                maxLength={200}
                            />
                            <Text style={styles.charCount}>{description.length}/200</Text>
                        </View>
                    </View>
                );

            case 'itemValue':
                return (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Valor declarado (opcional)</Text>
                        {/* CAMBIO: texto actualizado */}
                        <Text style={styles.sectionDescription}>
                            Dinos cuanto cuesta mas o menos lo que vas a pedir a domicilio (Ejemplo: Pizza familiar, $50.000)
                        </Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                placeholderTextColor={COLORS.textSecondary}
                                value={formatToCOP(itemValue)}
                                onChangeText={handleItemValueChange}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                );

            case 'recipientData':
                return (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Datos del destinatario (opcional)</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputIcon}>👤</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Nombre del destinatario"
                                placeholderTextColor={COLORS.textSecondary}
                                value={recipientName}
                                onChangeText={setRecipientName}
                            />
                        </View>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputIcon}>📱</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Teléfono del destinatario"
                                placeholderTextColor={COLORS.textSecondary}
                                value={recipientPhone}
                                onChangeText={setRecipientPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                );

            case 'specialInstructions':
                return (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Instrucciones especiales (opcional)</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Ej: Tocar el timbre dos veces, dejar en portería..."
                                placeholderTextColor={COLORS.textSecondary}
                                value={specialInstructions}
                                onChangeText={setSpecialInstructions}
                                multiline
                                numberOfLines={3}
                                maxLength={150}
                            />
                            <Text style={styles.charCount}>{specialInstructions.length}/150</Text>
                        </View>
                    </View>
                );

            case 'infoBox':
                return (
                    <View style={[styles.infoBox, { marginBottom: 100 }]}>
                        <Text style={styles.infoIcon}>ℹ️</Text>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoTitle}>Importante:</Text>
                            <Text style={styles.infoText}>
                                • Se aceptan envíos de dinero en efectivo{'\n'}
                                • No se permiten artículos ilegales o peligrosos{'\n'}
                                • El conductor puede solicitar verificación del contenido
                            </Text>
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                <Animated.View
                    style={[
                        styles.modalContainer,
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    <View style={styles.header}>
                        <View style={styles.dragIndicator} />
                        <View style={styles.headerContent}>
                            <View style={styles.headerLeft}>
                                <View style={styles.iconContainer}>
                                    <Image
                                        style={styles.headerIcon}
                                        source={require('../../../../assets/modal_box_icon.png')}
                                    />
                                </View>
                                <View>
                                    <Text style={styles.title}>Servicio de Domicilio</Text>
                                    <Text style={styles.subtitle}>Completa los detalles</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <Image
                                    source={require("../../../../assets/close_hide.png")}
                                    style={[styles.hideWindow, { transform: [{ rotate: '90deg' }] }]}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <FlatList
                        data={sections}
                        renderItem={renderSection}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={true}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmButton, !description.trim() && styles.confirmButtonDisabled]}
                            onPress={handleConfirm}
                            disabled={!description.trim()}
                        >
                            <Text style={styles.confirmButtonText}>Continuar</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>

            <ErrorModal
                visible={showErrorModal}
                message={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    hideWindow: { position: "absolute", right: 5 },
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    modalContainer: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
    header: { paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    dragIndicator: { width: 40, height: 4, backgroundColor: COLORS.textSecondary, borderRadius: 2, alignSelf: 'center', marginBottom: 16, opacity: 0.3 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerIcon: { width: 28, height: 28 },
    title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
    subtitle: { fontSize: 13, color: COLORS.textSecondary },
    closeButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    closeButtonText: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '600' },
    listContent: { paddingHorizontal: 20, paddingBottom: 20 },
    section: { marginTop: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
    sectionDescription: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, marginTop: -8 },
    required: { color: COLORS.error },
    weightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    weightOption: { width: '48%', backgroundColor: COLORS.backgroundLight, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', position: 'relative' },
    weightOptionSelected: { backgroundColor: COLORS.backgroundMedium, borderColor: COLORS.primary },
    weightIcon: { fontSize: 32, marginBottom: 8 },
    weightLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
    weightLabelSelected: { color: COLORS.primary },
    weightText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
    weightDescription: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 14 },
    selectedBadge: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    selectedBadgeText: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark },
    inputContainer: { backgroundColor: COLORS.backgroundLight, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, position: 'relative' },
    textArea: { color: COLORS.textPrimary, fontSize: 15, padding: 16, minHeight: 100, textAlignVertical: 'top' },
    charCount: { position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: COLORS.textSecondary },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundLight, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, marginBottom: 12 },
    inputPrefix: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, marginRight: 8 },
    inputIcon: { fontSize: 20, marginRight: 12 },
    input: { flex: 1, color: COLORS.textPrimary, fontSize: 15, paddingVertical: 16 },
    infoBox: { flexDirection: 'row', backgroundColor: COLORS.primary + '15', borderRadius: 12, padding: 16, marginTop: 24 },
    infoIcon: { fontSize: 20, marginRight: 12 },
    infoTextContainer: { flex: 1 },
    infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
    infoText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
    footer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 12 },
    cancelButton: { flex: 1, backgroundColor: COLORS.backgroundMedium, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    cancelButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
    confirmButton: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    confirmButtonDisabled: { opacity: 0.5 },
    confirmButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
    descriptionContainer: { width: '100%', marginTop: 8 },
    descriptionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, color: "white" },
    star: { fontSize: 10, color: COLORS.primary, marginRight: 4, marginTop: 2 },
    descriptionItem: { fontSize: 14, color: "white", flex: 1, lineHeight: 14 },
});

export default DeliveryModal;