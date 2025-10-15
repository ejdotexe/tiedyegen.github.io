// ColorManager.js - Handles color mixing, palettes, and realistic color behavior

import { hexToRgb, rgbToHex, clamp } from './utils.js';
import { COLOR_PRESETS } from '../config/constants.js';

export class ColorManager {
    constructor() {
        this.presets = COLOR_PRESETS;
        this.currentColor = { r: 255, g: 0, b: 0 };
    }

    setColor(hex) {
        const rgb = hexToRgb(hex);
        if (rgb) {
            this.currentColor = rgb;
        }
    }

    getCurrentColor() {
        return { ...this.currentColor };
    }

    getCurrentColorHex() {
        return rgbToHex(this.currentColor.r, this.currentColor.g, this.currentColor.b);
    }

    // Mix two colors with realistic dye mixing (subtractive)
    mixColors(color1, color2, ratio = 0.5) {
        // Convert RGB to CMY for subtractive mixing
        const cmy1 = this.rgbToCmy(color1);
        const cmy2 = this.rgbToCmy(color2);
        
        // Mix in CMY space
        const mixedCmy = {
            c: cmy1.c * (1 - ratio) + cmy2.c * ratio,
            m: cmy1.m * (1 - ratio) + cmy2.m * ratio,
            y: cmy1.y * (1 - ratio) + cmy2.y * ratio
        };
        
        // Convert back to RGB
        return this.cmyToRgb(mixedCmy);
    }

    rgbToCmy(rgb) {
        return {
            c: 1 - rgb.r / 255,
            m: 1 - rgb.g / 255,
            y: 1 - rgb.b / 255
        };
    }

    cmyToRgb(cmy) {
        return {
            r: Math.round((1 - cmy.c) * 255),
            g: Math.round((1 - cmy.m) * 255),
            b: Math.round((1 - cmy.y) * 255)
        };
    }

    // Apply dye to existing color with saturation
    applyDye(baseColor, dyeColor, intensity) {
        const normalizedIntensity = clamp(intensity / 100, 0, 1);
        return this.mixColors(baseColor, dyeColor, normalizedIntensity);
    }

    // Blend multiple dye layers
    blendLayers(layers) {
        if (layers.length === 0) return { r: 255, g: 255, b: 255 };
        if (layers.length === 1) return layers[0].color;
        
        let result = layers[0].color;
        for (let i = 1; i < layers.length; i++) {
            const layer = layers[i];
            result = this.mixColors(result, layer.color, layer.intensity);
        }
        
        return result;
    }

    getPresets() {
        return this.presets;
    }
}