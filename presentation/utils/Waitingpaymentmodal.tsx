import React, { useContext, useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { createInvoiceTravel } from './createInvoiceTravel';
import { getActiveTravelsByClient } from './getActiveTravels';
import { HandleDeleteActiveTravels } from './HandleActiveTravels';
import { HandleDeleteOffers } from './HandleOffers';
import { HandleDeleteTravels } from './HandleTravel';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../API/API';
import { dataContext } from '../context/Authcontext';
import { getDriverSubscription } from './getDriverSubscription';
import { updateDriverSubscriptionValue } from './updateDriverSubscriptionValue';
import COLORS from './colors';
import formatToCOP from './formatCop';
import { getPercentageByVehicle } from './getPercentageByVehicle';
import { postDriverLocation } from './postDriverLocation';

interface WaitingPaymentModalProps {
    visible: boolean;
    onClose?: () => void;
    clientName?: string;
    amount?: string;
    showCloseButton?: boolean;
    myData: any
}

const socket = io(`${API_BASE_URL}`, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

const WaitingPaymentModal: React.FC<WaitingPaymentModalProps> = ({
    myData,
    visible,
    onClose,
    clientName,
    amount,
    showCloseButton = false,
}) => {

    const [catchData, setCathData] = useState<any>();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const { authResponse } = useContext(dataContext)

    useEffect(() => {
        if (!visible) {
            setShowSuccessModal(false);
        }
    }, [visible]);

    useEffect(() => {
        // Solo leemos el viaje activo. NO llamar patchFinishUser aquí: en el cliente la
        // factura se crea antes del finish; llamar finish al abrir dejaba el viaje inválido y el POST a invoiceTravels respondía 400.
        (async () => {
            if (visible === true && clientName) {
                try {
                    const activeRes = await getActiveTravelsByClient(clientName);
                    const row = activeRes?.data?.[0];
                    setCathData(row ?? myData);
                } catch (_) {
                    setCathData(myData);
                }
            }
        })();

        const socketEvent = `invoice_travels${authResponse.usuario.phone}`;

        const handleInvoiceEvent = (data: any) => {
            if (data.status === "PAYED_CLIENT") {
                setShowSuccessModal(false);
                if (onClose) onClose();
            }
        };

        socket.on(socketEvent, handleInvoiceEvent);

        // Limpiar listener para evitar acumulación de múltiples listeners
        return () => {
            socket.off(socketEvent, handleInvoiceEvent);
        };
    }, [visible, clientName]);


    const dismissSuccessAndClose = () => {
        setShowSuccessModal(false);
        if (onClose) onClose();
    };

    const HandletotalInvoice = async () => {
        const invoiceData = catchData ?? myData;
        if (!invoiceData) return;

        let invoiceOk = false;
        try {
            const createInvoice = await createInvoiceTravel(invoiceData, "conductor");
            if (!createInvoice?.data) return;

            // Descuenta plan en cobro en efectivo (PAYED_DRIVER) inmediatamente.
            try {
                const driverPhone = authResponse?.usuario?.phone;
                const vehicleType = authResponse?.usuario?.vehicleType;
                if (driverPhone && vehicleType) {
                    const subscription = await getDriverSubscription(driverPhone);
                    const p = await getPercentageByVehicle(vehicleType);
                    const pct = Number(p?.data?.[0]?.percentaje);
                    const amountRaw =
                        String(invoiceData?.contraoferta || "").replace(/\D/g, "") ||
                        String(invoiceData?.oferta || "").replace(/\D/g, "") ||
                        String(invoiceData?.tarifa || "").replace(/\D/g, "");
                    const gross = Number(amountRaw || 0);
                    if (
                        subscription?.isActive &&
                        Number.isFinite(pct) &&
                        pct > 0 &&
                        gross > 0
                    ) {
                        const currentPlan = Number(subscription?.value || 0);
                        const discount = Math.ceil((gross * pct) / 100);
                        const nextPlan = Math.max(currentPlan - discount, 0);
                        await updateDriverSubscriptionValue(driverPhone, nextPlan.toFixed(2));
                    }
                }
            } catch (discErr) {
                console.warn("No se pudo descontar plan en PAYED_DRIVER:", discErr);
            }

            invoiceOk = true;
            setShowSuccessModal(true);

            try {
                await HandleDeleteActiveTravels(invoiceData?.clientid);
                await HandleDeleteOffers(invoiceData?.clientid);
                await HandleDeleteTravels(invoiceData?.clientid);
                await postDriverLocation(authResponse?.usuario?.phone);
            } catch (delErr) {
                console.warn("Limpieza post-cobro (viajes/ofertas):", delErr);
            }
        } catch (error) {
            console.error("Error al crear factura:", error);
        }

        if (invoiceOk) {
            setTimeout(dismissSuccessAndClose, 2200);
        }
    };

    return (
        <>
            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalContainer}>
                        {/* Icono de reloj o loading */}
                        <View style={styles.iconContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>

                        {/* Título */}
                        <Text style={styles.title}>Esperando pago</Text>

                        {/* Descripción */}
                        <Text style={styles.description}>
                            Aguardando confirmación de pago de {catchData?.user}
                        </Text>

                        {/* Monto (opcional) */}
                        {amount && (
                            <View style={styles.amountContainer}>
                                <Text style={styles.amountLabel}>Monto:</Text>
                                <Text style={styles.amountValue}>{formatToCOP(amount)}</Text>
                            </View>
                        )}

                        {/* Mensaje adicional */}
                        <Text style={styles.infoText}>
                            Te notificaremos cuando se complete el pago
                        </Text>

                        {/* Botón de pago en efectivo */}
                        {showCloseButton && onClose && (
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={HandletotalInvoice}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.paymentButtonText}>Cobro en Efectivo</Text>
                            </TouchableOpacity>
                        )}

                        {/* Botón de cerrar */}
                        {showCloseButton && onClose && (
                            <TouchableOpacity
                                style={[styles.closeButton, styles.closeButtonSecondary]}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.closeButtonText}>Cerrar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal de éxito — botón explícito por si el temporizador o el socket fallan */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={dismissSuccessAndClose}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalContainer}>
                        {/* Icono de éxito */}
                        <View style={[styles.iconContainer, styles.successIconContainer]}>
                            <Text style={styles.successIcon}>✓</Text>
                        </View>

                        <Text style={styles.title}>¡Pago cobrado!</Text>

                        <Text style={styles.description}>
                            El pago se ha registrado exitosamente
                        </Text>

                        {amount && (
                            <View style={styles.amountContainer}>
                                <Text style={styles.amountLabel}>Monto:</Text>
                                <Text style={styles.amountValue}>{formatToCOP(amount)}</Text>
                            </View>
                        )}

                        <Text style={styles.infoText}>
                            Gracias por usar nuestro servicio
                        </Text>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={dismissSuccessAndClose}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.paymentButtonText}>Continuar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#141414',
        borderRadius: 18,
        padding: 24,
        width: Dimensions.get('window').width * 0.85,
        maxWidth: 400,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    iconContainer: {
        marginBottom: 20,
        padding: 20,
        backgroundColor: '#1B1B1B',
        borderRadius: 50,
        borderWidth: 2,
        width: 100,
        height: 100,
        borderColor: COLORS.primary,
    },
    successIconContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: '#3a301bff',
        borderColor: '#af904cff',
    },
    successIcon: {
        fontSize: 48,
        color: '#af954cff',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#AAA',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#1B1B1B',
        borderRadius: 12,
        width: '100%',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    amountLabel: {
        fontSize: 16,
        color: '#AAA',
        marginRight: 8,
    },
    amountValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    infoText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        marginBottom: 16,
        fontStyle: 'italic',
    },
    closeButton: {
        marginTop: 8,
        paddingVertical: 12,
        paddingHorizontal: 32,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        width: '100%',
    },
    closeButtonSecondary: {
        backgroundColor: '#2A2A2A',
    },
    paymentButtonText: {
        color: 'black',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
    },
});

export default WaitingPaymentModal;