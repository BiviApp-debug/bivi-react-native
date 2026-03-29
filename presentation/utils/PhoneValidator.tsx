const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\d{10}$/
    return phoneRegex.test(phone);
}

export default validatePhone