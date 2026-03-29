// colors.ts
export const COLORS = {
  // Colores principales
  primary: '#FFC300',        // Amarillo dorado principal
  primaryDark: '#E6B000',    // Amarillo más oscuro
  primaryLight: '#FFD633',   // Amarillo más claro
  
  // Colores de fondo
  background: '#000000',     // Negro principal
  backgroundLight: '#1a1a1a', // Negro claro para cards
  backgroundMedium: '#333333', // Gris oscuro para elementos
  
  // Colores de texto
  textPrimary: '#FFFFFF',    // Blanco principal
  textSecondary: '#888888',  // Gris para texto secundario
  textMuted: '#666666',      // Gris más oscuro
  textDark: '#000000',       // Negro para texto sobre fondos claros
  
  // Colores de estado
  success: '#4CAF50',        // Verde para éxito/online
  error: '#FF5722',          // Rojo para error/offline
  warning: '#FF9800',        // Naranja para advertencias
  info: '#2196F3',           // Azul para información
  
  // Colores de UI
  border: '#333333',         // Color de bordes
  divider: '#444444',        // Color de divisores
  shadow: '#000000',         // Color de sombras
  overlay: 'rgba(0, 0, 0, 0.5)', // Overlay transparente
  
  // Colores específicos de la app
  mapRoute: '#FFC300',       // Color de rutas en el mapa
  mapPin: '#FF5722',         // Color de pins de destino
  mapDriver: '#4CAF50',      // Color de pins de conductores
  
  // Gradientes (si los necesitas)
  gradientPrimary: ['#FFC300', '#FFD633'],
  gradientDark: ['#1a1a1a', '#000000'],
};

// Tipos para TypeScript (opcional pero recomendado)
export type ColorKey = keyof typeof COLORS;

// Función helper para obtener colores con opacidad
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // Si el color ya tiene formato rgba, extraer solo el RGB
  if (color.includes('rgba')) {
    const rgb = color.match(/\d+/g)?.slice(0, 3).join(', ');
    return `rgba(${rgb}, ${opacity})`;
  }
  
  // Convertir hex a rgba
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  return color;
};

export default COLORS;