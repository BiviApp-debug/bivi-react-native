import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensiones base (iPhone 11 Pro)
const baseWidth = 375;
const baseHeight = 812;

/**
 * Width percentage
 * Convierte porcentaje del ancho de pantalla a píxeles
 */
export const wp = (widthPercent: number) => {
  const elemWidth = typeof widthPercent === "number" ? widthPercent : parseFloat(widthPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * elemWidth) / 100);
};

/**
 * Height percentage
 * Convierte porcentaje de la altura de pantalla a píxeles
 */
export const hp = (heightPercent: number) => {
  const elemHeight = typeof heightPercent === "number" ? heightPercent : parseFloat(heightPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * elemHeight) / 100);
};

/**
 * Normaliza tamaños de fuente
 */
export const normalize = (size: number) => {
  const scale = SCREEN_WIDTH / baseWidth;
  const newSize = size * scale;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

/**
 * Escala moderada para spacing (padding, margin)
 */
export const moderateScale = (size: number, factor = 0.5) => {
  return size + (normalize(size) - size) * factor;
};

// Breakpoints
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768;
export const isTablet = SCREEN_WIDTH >= 768;

// Helpers
export const deviceHeight = SCREEN_HEIGHT;
export const deviceWidth = SCREEN_WIDTH;