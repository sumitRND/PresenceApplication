// utils/responsive.ts
import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base dimensions (iPhone 14 Pro as reference)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Scale factors
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

// Get the minimum scale to maintain aspect ratio
const deviceScale = Math.min(widthScale, heightScale);

// Font scale based on device settings
const fontScale = PixelRatio.getFontScale();

/**
 * Scales a value based on screen width (percentage)
 */
export const wp = (widthPercent: number): number => {
  const elemWidth = parseFloat(String(widthPercent));
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * elemWidth) / 100);
};

/**
 * Scales a value based on screen height (percentage)
 */
export const hp = (heightPercent: number): number => {
  const elemHeight = parseFloat(String(heightPercent));
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * elemHeight) / 100);
};

/**
 * Scales a font size with respect to device font settings
 * @param size - The base font size
 * @param factor - Optional scaling factor (default: 1)
 */
export const fontSize = (size: number, factor: number = 1): number => {
  const newSize = size * deviceScale * factor;

  // Limit font scaling to prevent UI breaking
  const maxScale = 1.5; // Maximum 150% of original size
  const minScale = 0.85; // Minimum 85% of original size

  if (fontScale > maxScale) {
    return Math.round(newSize * maxScale);
  } else if (fontScale < minScale) {
    return Math.round(newSize * minScale);
  }

  return Math.round(newSize * fontScale);
};

/**
 * Scales a dimension (width/height) based on screen size
 * @param dimension - The base dimension
 */
export const scale = (dimension: number): number => {
  return Math.round(dimension * deviceScale);
};

/**
 * Scales vertical dimensions (height, marginTop, marginBottom, etc.)
 */
export const verticalScale = (dimension: number): number => {
  return Math.round(dimension * heightScale);
};

/**
 * Scales horizontal dimensions (width, marginLeft, marginRight, etc.)
 */
export const horizontalScale = (dimension: number): number => {
  return Math.round(dimension * widthScale);
};

/**
 * Moderate scaling - scales less aggressively than scale()
 * Useful for paddings and margins
 */
export const moderateScale = (
  dimension: number,
  factor: number = 0.5,
): number => {
  return Math.round(dimension + (scale(dimension) - dimension) * factor);
};

/**
 * Get adaptive height for components that need to adjust based on font scale
 */
export const adaptiveHeight = (baseHeight: number): number => {
  // Adjust height based on font scale to accommodate larger text
  const adjustment = fontScale > 1 ? (fontScale - 1) * baseHeight * 0.3 : 0;
  return Math.round(baseHeight + adjustment);
};

/**
 * Get adaptive padding that adjusts with font scale
 */
export const adaptivePadding = (basePadding: number): number => {
  return moderateScale(basePadding, fontScale > 1 ? 0.7 : 0.5);
};

/**
 * Check if font scaling is enabled and above normal
 */
export const isLargeFontScale = (): boolean => {
  return fontScale > 1.15;
};

/**
 * Get responsive style adjustments based on font scale
 */
export const getResponsiveStyles = () => {
  return {
    isLargeFont: isLargeFontScale(),
    fontScale,
    shouldWrapText: fontScale > 1.3,
    extraPadding: fontScale > 1.2 ? moderateScale(8) : 0,
  };
};
