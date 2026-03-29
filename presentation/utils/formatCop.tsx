 const formatToCOP = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(numericValue));
    return formatted
  };

export default formatToCOP