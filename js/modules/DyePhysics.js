// DyePhysics.js - Simulates realistic dye behavior and spreading

import { EventEmitter, distance } from './utils.js';
import { DYE_CONFIG, EVENTS } from '../config/constants.js';

export class DyePhysics extends EventEmitter {
    constructor(canvas, colorManager, foldingEngine) {
        super();
        this.canvas = canvas;
        this.colorManager = colorManager;
        this.foldingEngine = foldingEngine;
        this.dyeLayer = canvas.getLayer('dye');
        this.dyePoints = [];
        this.isApplying = false;
        this.currentBrushSize = DYE_CONFIG.BRUSH_DEFAULT_SIZE;
        this.currentIntensity = DYE_CONFIG.DEFAULT_INTENSITY;
    }

    setBrushSize(size) {
        this.currentBrushSize = Math.max(DYE_CONFIG.BRUSH_MIN_SIZE, 
                                        Math.min(size, DYE_CONFIG.BRUSH_MAX_SIZE));
    }

    setIntensity(intensity) {
        this.currentIntensity = Math.max(DYE_CONFIG.MIN_INTENSITY,
                                        Math.min(intensity, DYE_CONFIG.MAX_INTENSITY));
    }

    startApplying(x, y) {
        if (!this.canvas.isPointOnShirt(x, y)) return;
        this.isApplying = true;
        this.applyDye(x, y);
    }

    continueApplying(x, y) {
        if (!this.isApplying || !this.canvas.isPointOnShirt(x, y)) return;
        this.applyDye(x, y);
    }

    stopApplying() {
        this.isApplying = false;
    }

    applyDye(x, y) {
        const color = this.colorManager.getCurrentColor();
        const layers = this.foldingEngine.getLayers();
        const layerCount = Math.max(1, layers.length);
        
        // Create dye point with layer-aware properties
        const dyePoint = {
            x,
            y,
            color,
            intensity: this.currentIntensity,
            radius: this.currentBrushSize,
            layerCount,
            timestamp: Date.now()
        };
        
        this.dyePoints.push(dyePoint);
        this.renderDyePoint(dyePoint);
        this.simulateBleed(dyePoint);
        
        this.emit(EVENTS.DYE_APPLIED, { dyePoint });
    }

    renderDyePoint(dyePoint) {
        const ctx = this.dyeLayer.getContext('2d');
        const { x, y, color, intensity, radius, layerCount } = dyePoint;
        
        // Adjust intensity based on number of layers (more layers = less penetration)
        const effectiveIntensity = intensity / Math.sqrt(layerCount);
        const alpha = (effectiveIntensity / 100) * 0.8;
        
        // Create radial gradient for realistic dye spread
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        this.canvas.markDirty();
    }

    simulateBleed(dyePoint) {
        // Simulate dye bleeding to nearby areas
        const bleedRadius = dyePoint.radius * DYE_CONFIG.BLEED_RATE;
        const bleedIntensity = dyePoint.intensity * DYE_CONFIG.ABSORPTION_RATE;
        
        if (bleedIntensity < 5) return; // Too weak to bleed
        
        // Create bleeding effect in nearby points
        const bleedPoints = this.generateBleedPoints(dyePoint, bleedRadius);
        
        bleedPoints.forEach(point => {
            this.renderBleedPoint(point, bleedIntensity);
        });
    }

    generateBleedPoints(centerPoint, radius) {
        const points = [];
        const count = 8; // 8 bleed directions
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = radius * (0.5 + Math.random() * 0.5);
            
            points.push({
                x: centerPoint.x + Math.cos(angle) * distance,
                y: centerPoint.y + Math.sin(angle) * distance,
                color: centerPoint.color
            });
        }
        
        return points;
    }

    renderBleedPoint(point, intensity) {
        const ctx = this.dyeLayer.getContext('2d');
        const { x, y, color } = point;
        const alpha = (intensity / 100) * 0.3;
        const radius = this.currentBrushSize * 0.5;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    mixDyesAtPoint(x, y) {
        // Find all dye points affecting this location
        const affectingDyes = this.dyePoints.filter(point => {
            const dist = distance(x, y, point.x, point.y);
            return dist <= point.radius;
        });
        
        if (affectingDyes.length === 0) {
            return { r: 255, g: 255, b: 255 }; // White (no dye)
        }
        
        // Mix all affecting dyes
        const layers = affectingDyes.map(point => ({
            color: point.color,
            intensity: this.calculateIntensityAtPoint(x, y, point)
        }));
        
        return this.colorManager.blendLayers(layers);
    }

    calculateIntensityAtPoint(x, y, dyePoint) {
        const dist = distance(x, y, dyePoint.x, dyePoint.y);
        const normalizedDist = dist / dyePoint.radius;
        
        // Intensity falls off with distance
        return dyePoint.intensity * Math.max(0, 1 - normalizedDist);
    }

    clear() {
        this.dyePoints = [];
        const ctx = this.dyeLayer.getContext('2d');
        ctx.clearRect(0, 0, this.dyeLayer.width, this.dyeLayer.height);
        this.canvas.markDirty();
        this.emit(EVENTS.DYE_CLEARED);
    }

    getDyePoints() {
        return [...this.dyePoints];
    }
}