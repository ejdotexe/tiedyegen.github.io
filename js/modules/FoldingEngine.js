// FoldingEngine.js - Handles folding transformations and geometry

import { EventEmitter } from './utils.js';
import { FOLD_CONFIG, FOLD_TYPES, EVENTS, SHIRT_CONFIG } from '../config/constants.js';

export class FoldingEngine extends EventEmitter {
    constructor(canvas) {
        super();
        this.canvas = canvas;
        this.folds = [];
        this.undoStack = [];
        this.layers = [];
        this.currentFoldType = null;
        this.foldLayer = canvas.getLayer('folds');
    }

    applyFold(foldType, params = {}) {
        if (this.layers.length >= FOLD_CONFIG.MAX_LAYERS) {
            console.warn('Maximum fold layers reached');
            return false;
        }

        const fold = this.createFold(foldType, params);
        if (!fold) return false;

        this.folds.push(fold);
        this.updateLayers();
        this.visualizeFolds();
        
        this.emit(EVENTS.FOLD_APPLIED, { fold, layers: this.layers });
        return true;
    }

    createFold(foldType, params) {
        switch (foldType) {
            case FOLD_TYPES.ACCORDION:
                return this.createAccordionFold(params);
            case FOLD_TYPES.SPIRAL:
                return this.createSpiralFold(params);
            case FOLD_TYPES.CRUMPLE:
                return this.createCrumpleFold(params);
            case FOLD_TYPES.DIAGONAL:
                return this.createDiagonalFold(params);
            default:
                return null;
        }
    }

    createAccordionFold(params) {
        const { CENTER_X, CENTER_Y, WIDTH, HEIGHT } = SHIRT_CONFIG;
        const direction = params.direction || 'horizontal';
        const numFolds = params.numFolds || 3;
        
        return {
            type: FOLD_TYPES.ACCORDION,
            direction,
            numFolds,
            lines: this.calculateAccordionLines(direction, numFolds),
            layerMultiplier: numFolds
        };
    }

    calculateAccordionLines(direction, numFolds) {
        const { CENTER_X, CENTER_Y, WIDTH, HEIGHT } = SHIRT_CONFIG;
        const lines = [];
        
        if (direction === 'horizontal') {
            const spacing = HEIGHT / (numFolds + 1);
            const startY = CENTER_Y - HEIGHT / 2 + 80;
            
            for (let i = 1; i <= numFolds; i++) {
                lines.push({
                    x1: CENTER_X - WIDTH / 2,
                    y1: startY + spacing * i,
                    x2: CENTER_X + WIDTH / 2,
                    y2: startY + spacing * i
                });
            }
        } else {
            const spacing = WIDTH / (numFolds + 1);
            const startX = CENTER_X - WIDTH / 2;
            const startY = CENTER_Y - HEIGHT / 2 + 80;
            
            for (let i = 1; i <= numFolds; i++) {
                lines.push({
                    x1: startX + spacing * i,
                    y1: startY,
                    x2: startX + spacing * i,
                    y2: startY + HEIGHT - 80
                });
            }
        }
        
        return lines;
    }

    createSpiralFold(params) {
        const { CENTER_X, CENTER_Y } = SHIRT_CONFIG;
        const centerX = params.centerX || CENTER_X;
        const centerY = params.centerY || CENTER_Y;
        const rotations = params.rotations || 2;
        
        return {
            type: FOLD_TYPES.SPIRAL,
            centerX,
            centerY,
            rotations,
            layerMultiplier: rotations * 2
        };
    }

    createCrumpleFold(params) {
        const points = params.points || this.generateRandomCrumplePoints(5);
        
        return {
            type: FOLD_TYPES.CRUMPLE,
            points,
            layerMultiplier: points.length
        };
    }

    generateRandomCrumplePoints(count) {
        const { CENTER_X, CENTER_Y, WIDTH, HEIGHT } = SHIRT_CONFIG;
        const points = [];
        
        for (let i = 0; i < count; i++) {
            points.push({
                x: CENTER_X - WIDTH / 2 + Math.random() * WIDTH,
                y: CENTER_Y - HEIGHT / 2 + 80 + Math.random() * (HEIGHT - 80)
            });
        }
        
        return points;
    }

    createDiagonalFold(params) {
        const { CENTER_X, CENTER_Y, WIDTH, HEIGHT } = SHIRT_CONFIG;
        const angle = params.angle || 45;
        
        return {
            type: FOLD_TYPES.DIAGONAL,
            angle,
            layerMultiplier: 2
        };
    }

    updateLayers() {
        this.layers = [];
        let currentMultiplier = 1;
        
        for (const fold of this.folds) {
            currentMultiplier *= fold.layerMultiplier;
        }
        
        this.layers = Array(Math.min(currentMultiplier, FOLD_CONFIG.MAX_LAYERS))
            .fill(null)
            .map((_, i) => ({
                index: i,
                opacity: 1 - (i * FOLD_CONFIG.LAYER_OPACITY_STEP)
            }));
    }

    visualizeFolds() {
        const ctx = this.foldLayer.getContext('2d');
        ctx.clearRect(0, 0, this.foldLayer.width, this.foldLayer.height);
        
        ctx.strokeStyle = FOLD_CONFIG.FOLD_LINE_COLOR;
        ctx.lineWidth = FOLD_CONFIG.FOLD_LINE_WIDTH;
        ctx.setLineDash([5, 5]);
        
        for (const fold of this.folds) {
            this.drawFoldVisualization(ctx, fold);
        }
        
        ctx.setLineDash([]);
        this.canvas.markDirty();
    }

    drawFoldVisualization(ctx, fold) {
        switch (fold.type) {
            case FOLD_TYPES.ACCORDION:
                fold.lines.forEach(line => {
                    ctx.beginPath();
                    ctx.moveTo(line.x1, line.y1);
                    ctx.lineTo(line.x2, line.y2);
                    ctx.stroke();
                });
                break;
            case FOLD_TYPES.SPIRAL:
                this.drawSpiralVisualization(ctx, fold);
                break;
            case FOLD_TYPES.CRUMPLE:
                fold.points.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                });
                break;
            case FOLD_TYPES.DIAGONAL:
                this.drawDiagonalVisualization(ctx, fold);
                break;
        }
    }

    drawSpiralVisualization(ctx, fold) {
        ctx.beginPath();
        ctx.arc(fold.centerX, fold.centerY, 50, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawDiagonalVisualization(ctx, fold) {
        const { CENTER_X, CENTER_Y, WIDTH, HEIGHT } = SHIRT_CONFIG;
        const rad = (fold.angle * Math.PI) / 180;
        
        ctx.beginPath();
        ctx.moveTo(CENTER_X - WIDTH / 2, CENTER_Y);
        ctx.lineTo(CENTER_X + WIDTH / 2, CENTER_Y);
        ctx.stroke();
    }

    undo() {
        if (this.folds.length === 0) return false;
        
        const fold = this.folds.pop();
        this.undoStack.push(fold);
        this.updateLayers();
        this.visualizeFolds();
        
        this.emit(EVENTS.FOLD_UNDONE, { fold });
        return true;
    }

    redo() {
        if (this.undoStack.length === 0) return false;
        
        const fold = this.undoStack.pop();
        this.folds.push(fold);
        this.updateLayers();
        this.visualizeFolds();
        
        this.emit(EVENTS.FOLD_APPLIED, { fold });
        return true;
    }

    clear() {
        this.folds = [];
        this.undoStack = [];
        this.layers = [];
        this.visualizeFolds();
        this.emit(EVENTS.FOLD_CLEARED);
    }

    getFolds() {
        return [...this.folds];
    }

    getLayers() {
        return [...this.layers];
    }
}