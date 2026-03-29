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
import { updateDriverSubscriptionValue } from '../../../utils/updateDriverSubscriptionValue';
import SuccessModal from '../../../components/SuccessModal';
import ErrorModal from '../../../components/ErrorModal';

interface Props {
    visible: boolean;
    userPhone: string;
    userPassword?: string;

    onClose: () => void;
}

export default function SubscriptionModalPatch({
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
    const [showPaymentMethods, setShowPaymentMethods] = useState(true); // ✅ Estado para mostrar/ocultar
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

        // ✅ Validar si hay un plan seleccionado
        if (!selectedPlan) {
            setErrorMessage("Selecciona un plan, elige un plan de suscripción antes de continuar.");
            setShowErrorModal(true);
           /*  Alert.alert(
                'Selecciona un plan',
                'Por favor, elige un plan de suscripción antes de continuar.',
                [{ text: 'OK' }]
            ); */
            return;
        }


        try {
            setLoading(true);
            const plan = selectedPlan
            const resp = await fetch(`${API_BASE_URL}/api/wompi/create-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: userPhone,
                    amount: plan.price,
                    description: `Suscripción ${plan.name}`,
                    paymentMethodDefault,
                }),
            });

            const data = await resp.json();
            if (data?.checkoutUrl) {
                setPaymentUrl(data.checkoutUrl);
            } else {
                setErrorMessage("No se pudo iniciar el pago.");
                setShowErrorModal(true);
                //Alert.alert('Error', 'No se pudo iniciar el pago.');
            }
        } catch (err) {
            console.error(err);
            setErrorMessage("No se pudo iniciar el pago. Revisa tu conexión");
            setShowErrorModal(true);
            //Alert.alert('Error', 'No se pudo iniciar el pago. Revisa tu conexión.');
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

                if (userPassword) {
                    const responsePrevious = await fetchSubscriptionStatus(userPhone)

                    let paymentValue: string = Number(selectedPlan.price).toFixed(2);
                    if (responsePrevious.value) {
                        paymentValue = (Number(selectedPlan.price) + Number(responsePrevious.value)).toFixed(2);
                    }

                    await updateDriverSubscriptionValue(userPhone, paymentValue)
                    const response = await fetchSubscriptionStatus(userPhone);
                    if (response.isActive) {
                        setSuccessMessage("Tu suscripción quedó activa.");
                        setShowSuccessModal(true);
                        setTimeout(() => {
                           onClose();
                        }, 2000);
                       
                        //Alert.alert('✅ Pago aprobado', 'Tu suscripción quedó activa.');

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
        backgroundColor: '#fff',
        borderRadius: 0,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    header: {
        backgroundColor: "#FFCC28",
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
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    webViewHeader: {
        backgroundColor: '#FFCC28',
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
        color: '#1A1A1A',
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
        color: "black",
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
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 16,
        gap: 8,
        alignItems: 'center',
        minHeight: 140,
    },
    selectedPlan: {
        backgroundColor: '#FFCC28',
        borderColor: '#FFCC28',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },

    planName: { fontSize: 17, fontWeight: '400', color: '#191515A8' },
    planPrice: { fontSize: 17, color: '#191515A8', marginTop: 6, fontWeight: '400' },

    Notify: {
        fontSize: 12,
        height: 30,
        fontWeight: '400',
        textAlign: 'center',
        color: '#666',
    },
    paymentMethods: {
        width: '90%',
        marginHorizontal: 'auto',
        marginBottom: 20,
        backgroundColor: "#3D3D3D",
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
        color: 'white',
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
        color: '#FFCC28',
        fontWeight: '300',
    },
    methodsList: {
        gap: 10,
    },
    methodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#555',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#4A4A4A',
    },
    methodSelected: {
        backgroundColor: '#5A5A5A',
        borderColor: '#FFCC28',
    },
    methodIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    methodText: {
        color: '#DDD',
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
        backgroundColor: '#FFCC28',
        display: "flex",
        justifyContent: "center",
        borderRadius: 8,
        width: 90,
        height: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#BF6A02",
        borderStyle: "solid",
    },
    payText: {
        color: '#000',
        fontSize: 14,
        alignSelf: "center",
        fontWeight: '400',
    },
    cancelBtn: {
        backgroundColor: '#FFCC28B0',
        display: "flex",
        justifyContent: "center",
        borderRadius: 8,
        width: 90,
        height: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#BF6A02",
        borderStyle: "solid",
    },
    cancelText: {
        color: '#000',
        fontSize: 14,
        alignSelf: "center",
        fontWeight: '400',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});