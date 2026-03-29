import { API_BASE_URL } from '../API/API';

interface ResetPasswordParams {
    phone: string;
    newPassword: string;
}

interface ResetPasswordResponse {
    success: boolean;
    message: string;
    error?: string;
    details?: string;
}

export const ResetPasswordUSer = async ({
    phone,
    newPassword
}: ResetPasswordParams): Promise<ResetPasswordResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/reset-password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone,
                newPassword,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al resetear contraseña');
        }

        return data;
    } catch (error: any) {
        console.error('Error en resetPassword:', error);
        throw error;
    }
};