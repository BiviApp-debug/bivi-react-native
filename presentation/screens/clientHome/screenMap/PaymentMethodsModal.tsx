import React, { useContext, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Image,
} from 'react-native';
import COLORS from '../../../utils/colors';
import { updatePaymentMethod } from '../../../utils/updatePaymentMethod';
import { dataContext } from '../../../context/Authcontext';

interface PaymentMethodsModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectMethod: (method: 'efectivo' | 'nequi' | 'tarjeta' | 'pse' | 'daviplata') => void;
    selectedMethod?: 'efectivo' | 'nequi' | 'tarjeta' | 'pse' | 'daviplata';
}

const PaymentMethodsModal: React.FC<PaymentMethodsModalProps> = ({
    visible,
    onClose,
    onSelectMethod,
    selectedMethod = 'efectivo',
}) => {
    const [slideAnim] = useState(new Animated.Value(Dimensions.get('window').height));
     const { authResponse } = useContext(dataContext)

     

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

    const handleSelectMethod = async (method: 'efectivo' | 'nequi' | 'tarjeta' | 'pse' | 'daviplata') => {
        onSelectMethod(method);
        const result = await updatePaymentMethod(authResponse?.usuario?.phone, method);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Backdrop - cierra al tocar fuera */}
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                {/* Contenido del modal */}
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Header con título y botón cerrar */}
                    <View style={styles.header}>
                        <View style={styles.dragIndicator} />
                        <View style={styles.headerContent}>
                            <Text style={styles.title}>Métodos De Pagos</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Image style={{ width: 40, height: 40, resizeMode: 'cover' }} source={require('../../../../assets/close_hide.png')} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Lista de métodos de pago */}
                    <View style={styles.methodsList}>
                        {/* Efectivo */}
                        <TouchableOpacity
                            style={[
                                styles.methodItem,
                                selectedMethod === 'efectivo' && styles.methodItemSelected,
                            ]}
                            onPress={() => handleSelectMethod('efectivo')}
                        >
                            <View style={styles.methodIconContainer}>
                                <Image style={{ width: 55, height: 25, resizeMode: 'cover' }} source={require('../../../../assets/chas_icon_img.jpg')} />
                            </View>
                            <View style={styles.methodTextContainer}>
                                <Text style={styles.methodTitle}>Efectivo</Text>
                                {selectedMethod === 'efectivo' && (
                                    <View style={styles.selectedBadge}>
                                        <Text style={styles.selectedBadgeText}>Seleccionado</Text>
                                    </View>
                                )}
                            </View>
                            {selectedMethod === 'efectivo' && (
                                <View style={styles.checkmark}>
                                    <Text style={styles.checkmarkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Nequi */}
                        <TouchableOpacity
                            style={[
                                styles.methodItem,
                                selectedMethod === 'nequi' && styles.methodItemSelected,
                            ]}
                            onPress={() => handleSelectMethod('nequi')}
                        >
                            <View style={[styles.methodIconContainer, styles.nequiIcon]}>
                                <Image style={{ width: 30, height: 30, resizeMode: 'cover' }} source={require('../../../../assets/neki_icon_img.png')} />
                            </View>
                            <View style={styles.methodTextContainer}>
                                <Text style={styles.methodTitle}>Nequi</Text>
                                {selectedMethod === 'nequi' && (
                                    <View style={styles.selectedBadge}>
                                        <Text style={styles.selectedBadgeText}>Seleccionado</Text>
                                    </View>
                                )}
                            </View>
                            {selectedMethod === 'nequi' && (
                                <View style={styles.checkmark}>
                                    <Text style={styles.checkmarkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>


                        {/* Daviplata */}
                        <TouchableOpacity
                            style={[
                                styles.methodItem,
                                selectedMethod === 'daviplata' && styles.methodItemSelected,
                            ]}
                            onPress={() => handleSelectMethod('daviplata')}
                        >
                            <View style={styles.methodIconContainer}>
                                <Image style={{ width: 50, height: 50, resizeMode: 'cover' }} source={require('../../../../assets/log_daviplata.png')} />
                            </View>
                            <View style={styles.methodTextContainer}>
                                <Text style={styles.methodTitle}>Daviplata</Text>
                                {selectedMethod === 'daviplata' && (
                                    <View style={styles.selectedBadge}>
                                        <Text style={styles.selectedBadgeText}>Seleccionado</Text>
                                    </View>
                                )}
                            </View>
                            {selectedMethod === 'daviplata' && (
                                <View style={styles.checkmark}>
                                    <Text style={styles.checkmarkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* PSE */}
                        <TouchableOpacity
                            style={[
                                styles.methodItem,
                                selectedMethod === 'pse' && styles.methodItemSelected,
                            ]}
                            onPress={() => handleSelectMethod('pse')}
                        >
                            <View style={styles.methodIconContainer}>
                                 <Image style={{ width: 50, height: 50, resizeMode: 'cover' }} source={require('../../../../assets/logo_pse_img.png')} />
                            </View>
                            <View style={styles.methodTextContainer}>
                                <Text style={styles.methodTitle}>PSE</Text>
                                {selectedMethod === 'pse' && (
                                    <View style={styles.selectedBadge}>
                                        <Text style={styles.selectedBadgeText}>Seleccionado</Text>
                                    </View>
                                )}
                            </View>
                            {selectedMethod === 'pse' && (
                                <View style={styles.checkmark}>
                                    <Text style={styles.checkmarkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Tarjeta */}
                        <TouchableOpacity
                            style={[
                                styles.methodItem,
                                selectedMethod === 'tarjeta' && styles.methodItemSelected,
                            ]}
                            onPress={() => handleSelectMethod('tarjeta')}
                        >
                            <View style={styles.methodIconContainer}>
                                <Text style={styles.methodIcon}>💳</Text>
                            </View>
                            <View style={styles.methodTextContainer}>
                                <Text style={styles.methodTitle}>Tarjeta</Text>
                                {selectedMethod === 'tarjeta' && (
                                    <View style={styles.selectedBadge}>
                                        <Text style={styles.selectedBadgeText}>Seleccionado</Text>
                                    </View>
                                )}
                            </View>
                            {selectedMethod === 'tarjeta' && (
                                <View style={styles.checkmark}>
                                    <Text style={styles.checkmarkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Botón de confirmación (opcional) */}
                    {/* <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={onClose}
                        >
                            <Text style={styles.confirmButtonText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View> */}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 34,
        maxHeight: '70%',
    },
    header: {
        paddingTop: 12,
        paddingBottom: 16,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.textSecondary,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
        opacity: 0.3,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign:'center',
        marginLeft:80,
    },
    closeButton: {
        width: 40,
        height: 40,      
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    methodsList: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    methodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    methodItemSelected: {
        backgroundColor: COLORS.backgroundMedium,
        borderColor: COLORS.primary,
    },
    methodIconContainer: {
        width: 48,
        height: 30,
        borderRadius: 24,
        backgroundColor: COLORS.backgroundMedium,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    nequiIcon: {
        backgroundColor: 'white',
    },
    methodIcon: {
        fontSize: 24,
    },
    methodIconText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    methodTextContainer: {
        flex: 1,
    },
    methodTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    selectedBadge: {
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    selectedBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primary,
    },
    checkmark: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textDark,
    },
});

export default PaymentMethodsModal;