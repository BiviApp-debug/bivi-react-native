import React, { useEffect, useState, useContext } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    Alert,
    Image
} from 'react-native';
import { WebView } from 'react-native-webview';
import { API_BASE_URL } from '../../../API/API';
import { dataContext } from '../../../context/Authcontext';
import { saveMessageToFirestore } from './loginFunctions';
import { postDriverSubscription } from '../../../utils/postDriverSubscription';
import { fetchSubscriptionStatus } from '../../../utils/VerifySuscription';
import { getSubscriptionPlans } from '../../../utils/getSubscriptionPlans';
import formatToCOP from '../../../utils/formatCop';
import ErrorModal from '../../../components/ErrorModal';
import SuccessModal from '../../../components/SuccessModal';

interface Props {
    visible: boolean;
    userPhone: string;
    userPassword?: string;

    onClose: () => void;
}

export default function SubscriptionModal({
    visible,
    userPhone,
    userPassword,

    onClose,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<any>([]);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'NEQUI' | 'PSE'>('CARD');
    const [paymentMethodDefault, setPaymentMethodDefault] = useState('CARD');
    const [showPaymentMethods, setShowPaymentMethods] = useState(true);

    const { setAuthResponse } = useContext(dataContext);

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        (async () => {
            let getSusbcriptionTable = await getSubscriptionPlans()
            setPlans(getSusbcriptionTable)
        })();
    }, [])

    const createTransactionAndOpen = async () => {

        // ✅ Validar si el usuario existe en companyRegister
        try {
            setLoading(true);

            // Verificar si el usuario existe
            const userCheckResp = await fetch(`${API_BASE_URL}/companyPhone/${userPhone}`);
            const userExists = await userCheckResp.json();

            if (!userExists || !userExists.id) {
                setErrorMessage("Usuario no encontrado en el sistema.");
                setShowErrorModal(true);
                setLoading(false);
                return;
            }

            // ✅ Usuario existe, proceder con la transacción
            const plan = selectedPlan;
            
            const resp = await fetch(`${API_BASE_URL}/api/wompi/create-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: userPhone,
                    amount: plan?.price || 0,
                    description: `Suscripción ${plan?.name || 'Plan'}`,
                    paymentMethodDefault,
                }),
            });

            const data = await resp.json();
            if (data?.checkoutUrl) {
                setPaymentUrl(data.checkoutUrl);
            } else {
                // BYPASS: Mock URL si la API no responde correctamente
                // TODO: Reemplazar con URL real cuando endpoint esté disponible
                const mockCheckoutUrl = `https://checkout.wompi.co/p/mock-${Date.now()}`;
                setPaymentUrl(mockCheckoutUrl);
            }
        } catch (err) {
            console.error(err);
            // BYPASS: Mock URL si hay error de conexión
            // TODO: Reemplazar con URL real cuando endpoint esté disponible
            const mockCheckoutUrl = `https://checkout.wompi.co/p/mock-${Date.now()}`;
            setPaymentUrl(mockCheckoutUrl);
        } finally {
            setLoading(false);
        }
    };

    const onWebViewNav = async (navState: any) => {
        const url: string = navState.url || '';
        if (!url.includes('?')) return;
        const params = new URLSearchParams(url.split('?')[1]);
        const transactionId =
            params.get('id') || params.get('transaction_id') || params.get('transaction') || params.get('reference');
        if (!transactionId) return;

        setPaymentUrl(null);
        try {
            const verifyResp = await fetch(`${API_BASE_URL}/api/wompi/verify/${transactionId}`);
            const verifyData = await verifyResp.json();

            if (verifyData.success && verifyData.status === 'APPROVED') {
                setSuccessMessage("Tu suscripción quedó activa.");
                setShowSuccessModal(true);
                setTimeout(() => {
                    setShowSuccessModal(false);
                }, 2000);

                //Alert.alert('✅ Pago aprobado', 'Tu suscripción quedó activa.');
                if (userPassword) {

                    let paymentValue = Number(selectedPlan.price).toFixed(2);
                    const today = new Date();
                    const now = new Date().toISOString().split('T')[0];;
                    today.setMonth(today.getMonth() + 2);
                    const formatted = today.toISOString().split('T')[0];
                    await postDriverSubscription(userPhone, "true", paymentValue, formatted, now, verifyData.transaction.payment_method_type)

                    const response = await fetchSubscriptionStatus(userPhone);
                    if (response.isActive) {
                        onClose()
                        const login_response = await saveMessageToFirestore(userPhone, userPassword);
                        setAuthResponse(login_response);
                    }
                }
            } else {
                setErrorMessage("Pago no completado.");
                setShowErrorModal(true);
                //Alert.alert('Pago no completado', `Estado: ${verifyData.status || 'pendiente'}`);
            }
        } catch (err) {
            setErrorMessage("Error verificando transacción.");
            setShowErrorModal(true);
            console.error('Error verificando transacción', err);
            //Alert.alert('Error', 'No se pudo verificar la transacción.');
        }
    };

    if (!visible) return null;

    if (paymentUrl) {
        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.webViewContainer}>
                    <View style={styles.webViewModal}>
                        {/* Header con botón de cerrar */}
                        <View style={styles.webViewHeader}>
                            <Text style={styles.webViewTitle}>Completa tu pago</Text>
                            <TouchableOpacity
                                style={styles.webViewCloseBtn}
                                onPress={() => {
                                    Alert.alert(
                                        'Cancelar pago',
                                        '¿Estás seguro de que deseas cancelar el proceso de pago?',
                                        [
                                            { text: 'No', style: 'cancel' },
                                            {
                                                text: 'Sí, cancelar',
                                                onPress: () => setPaymentUrl(null),
                                                style: 'destructive'
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Image
                                    source={require("../../../../assets/back_black.png")}
                                    style={styles.webViewCloseIcon}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* WebView */}
                        <WebView
                            source={{ uri: paymentUrl }}
                            onNavigationStateChange={onWebViewNav}
                            startInLoadingState
                            renderLoading={() => (
                                <View style={styles.center}>
                                    <ActivityIndicator size="large" color="#FFCC28" />
                                </View>
                            )}
                            style={styles.webView}
                        />
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>

                            <Image
                                source={require("../../../../assets/logo_login.png")}
                                style={styles.imageUSer}
                            />
                            <Text style={styles.title}>Elige tu plan</Text>
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <Image
                                    source={require("../../../../assets/back_black.png")}
                                    style={styles.closeText}
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.subtitleLogin}>
                            Recarga para obtener servicios
                        </Text>
                    </View>

                    {/* Plans */}
                    <ScrollView
                        style={{ width: '100%' }}
                        contentContainerStyle={{ alignItems: 'center', paddingBottom: 12 }}
                    >
                        <View style={styles.planContainer}>
                            {plans.map((p: any) => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[
                                        styles.planCard,
                                        selectedPlan?.id === p.id && styles.selectedPlan
                                    ]}
                                    onPress={() => setSelectedPlan(p)}
                                >
                                    {p.icon && (
                                        <Image
                                            source={{ uri: p.icon }}
                                            style={styles.planIcon}
                                        />
                                    )}


                                    <Text style={styles.planName}>{p.name}</Text>
                                    <Text style={styles.planPrice}>{formatToCOP(Math.ceil(p.price).toString())}</Text>
                                    <Text style={styles.planDuration}>por {p.duration} días</Text>

                                </TouchableOpacity>
                            ))}
                        </View>


                    </ScrollView>

                    {/* Notificación Nequi */}
                    {paymentMethod === "NEQUI" && (
                        <Text style={styles.Notify}>ENVIAREMOS UN PUSH A TU APP DE NEQUI</Text>
                    )}

                    {/* Payment Methods */}
                    <View style={styles.paymentMethods}>
                        <View style={styles.paymentHeader}>
                            <Text style={styles.paymentMethodsTitle}>Métodos De Pagos</Text>
                            <TouchableOpacity
                                onPress={() => setShowPaymentMethods(!showPaymentMethods)}
                                style={styles.toggleButton}
                            >

                                <Image
                                    source={require("../../../../assets/close_hide.png")}
                                    style={[
                                        styles.hideWindow,
                                        { transform: [{ rotate: showPaymentMethods ? '180deg' : '360deg' }] }
                                    ]}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* ✅ Mostrar/Ocultar métodos */}
                        {showPaymentMethods && (
                            <View style={styles.methodsList}>
                                {['CARD', 'NEQUI', 'PSE'].map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[
                                            styles.methodButton,
                                            paymentMethod === m && styles.methodSelected,
                                        ]}
                                        onPress={() => setPaymentMethod(m as any)}
                                    >
                                        <Text
                                            style={[
                                                styles.methodText,
                                                paymentMethod === m && { color: '#fff', fontWeight: '700' },
                                            ]}
                                        >
                                            {m === 'CARD' ? '💳 Tarjeta' : m === 'NEQUI' ? '📱 Nequi' : '🏦 PSE'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Buttons */}
                    <View style={styles.butonsContent}>
                        <TouchableOpacity
                            style={styles.payBtn}
                            onPress={createTransactionAndOpen}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.payText}>Pagar</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>

                </View>
                <SuccessModal
                    visible={showSuccessModal}
                    message={successMessage}
                    onClose={() => setShowSuccessModal(false)}
                />
                <ErrorModal
                    visible={showErrorModal}
                    message={errorMessage}
                    onClose={() => setShowErrorModal(false)}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    planIcon: {
        width: 35,
        height: 35
    },
    hideWindow: {
        position: "absolute",
        right: 5
    },
    planDuration: {
        color: '#777',
        fontSize: 14,
        display: "none"
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 0,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    header: {
        backgroundColor: "#D946A6",
        paddingTop: 50,
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 15,
    },
    imageUSer: {
        borderRadius: 80,
        width: 80,
        height: 80,
        display: "flex",
        justifyContent: "center",
        alignContent: "center",
        alignSelf: "center"
    },
    webViewContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    webViewModal: {
        width: '90%',
        height: '80%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    webViewHeader: {
        backgroundColor: '#D946A6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    webViewTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    webViewCloseBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    webViewCloseIcon: {
        width: 12,
        height: 20,
    },
    webView: {
        flex: 1,
    },
    closeBtn: { alignSelf: 'center', width: 40, height: 40, marginTop: 35, display: "flex", justifyContent: "center", },
    closeText: { fontSize: 22, color: '#666', width: 9, height: 20, margin: "auto" },
    closeArrow: {
        fontSize: 40,
        fontWeight: '300',
        color: '#000',

    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginRight: 66,
        color: '#1A1A1A',
    },
    subtitleLogin: {
        color: "#1A1A1A",
        fontSize: 14,
        textAlign: "center",
        fontWeight: "200",
        marginTop: 5,
    },
    planContainer: {
        flexDirection: "row",
        paddingTop: 30,
        paddingBottom: 20,
        gap: 12,
        paddingHorizontal: 10,
    },
    planCard: {
        flex: 1,
        backgroundColor: '#F8F0F8',
        borderWidth: 2,
        borderColor: '#E0C0E0',
        borderRadius: 12,
        padding: 16,
        gap: 8,
        alignItems: 'center',
        minHeight: 140,
    },
    selectedPlan: {
        backgroundColor: '#D946A6',
        borderColor: '#D946A6',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },

    planName: { fontSize: 17, fontWeight: '400', color: '#7B2CBF' },
    planPrice: { fontSize: 17, color: '#D946A6', marginTop: 6, fontWeight: '700' },

    Notify: {
        fontSize: 12,
        height: 30,
        fontWeight: '400',
        textAlign: 'center',
        color: '#7B2CBF',
    },
    paymentMethods: {
        width: '90%',
        marginHorizontal: 'auto',
        marginBottom: 20,
        backgroundColor: "#7B2CBF",
        borderRadius: 12,
        padding: 16,
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    paymentMethodsTitle: {
        color: '#FFFFFF',
        fontSize: 21,
        fontWeight: 800,
        textAlign: "center"

    },
    toggleButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleArrow: {
        fontSize: 30,
        color: '#D946A6',
        fontWeight: '300',
    },
    methodsList: {
        gap: 10,
    },
    methodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D946A6',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F0E0F0',
    },
    methodSelected: {
        backgroundColor: '#E0C0E0',
        borderColor: '#D946A6',
    },
    methodIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    methodText: {
        color: '#7B2CBF',
        fontWeight: '500',
        fontSize: 15,
    },
    butonsContent: {
        flexDirection: 'row',
        width: "80%",
        margin: 'auto',
        justifyContent: "space-evenly",
        gap: 0,
        marginTop: 10,
        marginBottom: 30,
    },
    payBtn: {
        backgroundColor: '#D946A6',
        display: "flex",
        justifyContent: "center",
        borderRadius: 8,
        width: 90,
        height: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#A1157B",
        borderStyle: "solid",
    },
    payText: {
        color: '#FFFFFF',
        fontSize: 14,
        alignSelf: "center",
        fontWeight: '700',
    },
    cancelBtn: {
        backgroundColor: '#E0C0E0',
        display: "flex",
        justifyContent: "center",
        borderRadius: 8,
        width: 90,
        height: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#D946A6",
        borderStyle: "solid",
    },
    cancelText: {
        color: '#7B2CBF',
        fontSize: 14,
        alignSelf: "center",
        fontWeight: '700',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});