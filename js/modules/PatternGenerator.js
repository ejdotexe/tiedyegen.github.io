// PatternGenerator.js - Calculates final unfolded pattern

import { EventEmitter } from './utils.js';
import { EVENTS, SHIRT_CONFIG, FOLD_TYPES } from '../config/constants.js';

export class PatternGenerator extends EventEmitter {
    constructor(canvas, foldingEngine, dyePhysics) {
        super();
        this.canvas = canvas;
        this.foldingEngine = foldingEngine;
        this.dyePhysics = dyePhysics;
        this.finalLayer = canvas.getLayer('final');
    }

    async generatePattern() {
        this.emit(EVENTS.UNFOLD_START);
        
        const folds = this.foldingEngine.getFolds();
        const dyePoints = this.dyePhysics.getDyePoints();
        
        if (folds.length === 0) {
            // No folds, just copy dye layer
            this.copyDyeToFinal();
            this.emit(EVENTS.UNFOLD_COMPLETE);
            return;
        }
        
        // Generate unfolded pattern based on fold types
        await this.unfoldPattern(folds, dyePoints);
        
        this.emit(EVENTS.UNFOLD_COMPLETE);
    }

    async unfoldPattern(folds, dyePoints) {
        const ctx = this.finalLayer.getContext('2d');
        ctx.clearRect(0, 0, this.finalLayer.width, this.finalLayer.height);
        
        // Process each fold in reverse order (unfold from inside out)
        for (let i = folds.length - 1; i >= 0; i--) {
            const fold = folds[i];
            await this.applyUnfoldTransform(fold, dyePoints);
        }
        
        this.canvas.markDirty();
    }

    async applyUnfoldTransform(fold, dyePoints) {
        switch (fold.type) {
            case FOLD_TYPES.ACCORDION:
                this.unfoldAccordion(fold, dyePoints);
                break;
            case FOLD_TYPES.SPIRAL:
                this.unfoldSpiral(fold, dyePoints);
                break;
            case FOLD_TYPES.CRUMPLE:
                this.unfoldCrumple(fold, dyePoints);
                break;
            case FOLD_TYPES.DIAGONAL:
                this.unfoldDiagonal(fold, dyePoints);
                break;
        }
        
        // Small delay for visual effect
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    unfoldAccordion(fold, dyePoints) {
        const ctx = this.finalLayer.getContext('2d');
        const { direction, lines } = fold;
        
        // For accordion folds, mirror dye across fold lines
        dyePoints.forEach(point => {
            this.renderPointWithSymmetry(ctx, point, lines, direction);
        });
    }

    renderPointWithSymmetry(ctx, point, lines, direction) {
        const { x, y, color, intensity, radius } = point;
        
        // Render original point
        this.renderFinalPoint(ctx, x, y, color, intensity, radius);
        
        // Mirror across each fold line
        lines.forEach(line => {
            const mirrored = this.mirrorPoint(x, y, line, direction);
            this.renderFinalPoint(ctx, mirrored.x, mirrored.y, color, intensity, radius);
        });
    }

    mirrorPoint(x, y, line, direction) {
        if (direction === 'horizontal') {
            const dy = line.y1 - y;
            return { x, y: line.y1 + dy };
        } else {
            const dx = line.x1 - x;
            return { x: line.x1 + dx, y };
        }
    }

    unfoldSpiral(fold, dyePoints) {
        const ctx = this.finalLayer.getContext('2d');
        const { centerX, centerY, rotations } = fold;
        
        dyePoints.forEach(point => {
            // Create rotational symmetry
            for (let i = 0; i < rotations * 4; i++) {
                const angle = (i / (rotations * 4)) * Math.PI * 2;
                const rotated = this.rotatePoint(point.x, point.y, centerX, centerY, angle);
                this.renderFinalPoint(ctx, rotated.x, rotated.y, point.color, 
                                     point.intensity, point.radius);
            }
        });
    }

    rotatePoint(x, y, centerX, centerY, angle) {
        const dx = x - centerX;
        const dy = y - centerY;
        
        return {
            x: centerX + dx * Math.cos(angle) - dy * Math.sin(angle),
            y: centerY + dx * Math.sin(angle) + dy * Math.cos(angle)
        };
    }

    unfoldCrumple(fold, dyePoints) {
        const ctx = this.finalLayer.getContext('2d');
        
        // Crumple creates a more organic, scattered pattern
        dyePoints.forEach(point => {
            // Render with slight variations for organic feel
            const variations = this.generateCrumpleVariations(point, fold.points);
            variations.forEach(varied => {
                this.renderFinalPoint(ctx, varied.x, varied.y, point.color,
                                     point.intensity * 0.7, point.radius);
            });
        });
    }

    generateCrumpleVariations(point, crumplePoints) {
        const variations = [point];
        
        // Add scattered copies near crumple points
        crumplePoints.forEach(cp => {
            const offset = {
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 40
            };
            
            variations.push({
                x: point.x + offset.x,
                y: point.y + offset.y,
                color: point.color,
                intensity: point.intensity,
                radius: point.radius
            });
        });
        
        return variations;
    }

    unfoldDiagonal(fold, dyePoints) {
        const ctx = this.finalLayer.getContext('2d');
        const { angle } = fold;
        const { CENTER_X, CENTER_Y } = SHIRT_CONFIG;
        
        dyePoints.forEach(point => {
            // Render original
            this.renderFinalPoint(ctx, point.x, point.y, point.color,
                                 point.intensity, point.radius);
            
            // Mirror across diagonal
            const mirrored = this.mirrorDiagonal(point.x, point.y, CENTER_X, 
                                                CENTER_Y, angle);
            this.renderFinalPoint(ctx, mirrored.x, mirrored.y, point.color,
                                 point.intensity, point.radius);
        });
    }

    mirrorDiagonal(x, y, centerX, centerY, angle) {
        // Reflect point across a line through center at given angle
        const rad = (angle * Math.PI) / 180;
        const dx = x - centerX;
        const dy = y - centerY;
        
        const cos2 = Math.cos(2 * rad);
        const sin2 = Math.sin(2 * rad);
        
        return {
            x: centerX + dx * cos2 + dy * sin2,
            y: centerY + dx * sin2 - dy * cos2
        };
    }

    renderFinalPoint(ctx, x, y, color, intensity, radius) {
        const alpha = (intensity / 100) * 0.6;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    copyDyeToFinal() {
        const ctx = this.finalLayer.getContext('2d');
        const dyeLayer = this.canvas.getLayer('dye');
        ctx.clearRect(0, 0, this.finalLayer.width, this.finalLayer.height);
        ctx.drawImage(dyeLayer, 0, 0);
        this.canvas.markDirty();
    }
}