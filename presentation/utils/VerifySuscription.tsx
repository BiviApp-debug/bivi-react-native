import { API_BASE_URL } from "../API/API";
 export   const fetchSubscriptionStatus = async (phone: string) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/driverSubscription/${phone}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.status === 404) {
                return {
                    isActive: false,
                    expiryDate: null,
                };
            }

            if (!response.ok) {
                throw new Error('Error al obtener suscripción');
            }

            const data = await response.json();
            
            const isActive = data.isActive === 'true' || data.isActive === true;
            const today = new Date();
            const expireDate = new Date(data.expirateDate);

            const subscriptionIsValid = isActive && expireDate > today;

            return {
                isActive: subscriptionIsValid,
                expiryDate: data.expirateDate,
                value: data.value,
            };
        } catch (error) {
            console.error('Error verificando suscripción:', error);
            throw error;
        }
    };