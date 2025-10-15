// TShirtCanvas.js - Core rendering engine for the t-shirt visualization

import { EventEmitter } from './utils.js';
import { CANVAS_CONFIG, SHIRT_CONFIG, EVENTS } from '../config/constants.js';

export class TShirtCanvas extends EventEmitter {
    constructor(canvasId) {
        super();
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas dimensions
        this.canvas.width = CANVAS_CONFIG.WIDTH;
        this.canvas.height = CANVAS_CONFIG.HEIGHT;
        
        // Canvas layers for different rendering stages
        this.layers = {
            base: this.createOffscreenCanvas(),      // Base shirt
            folds: this.createOffscreenCanvas(),     // Fold visualization
            dye: this.createOffscreenCanvas(),       // Dye application
            final: this.createOffscreenCanvas()      // Final pattern
        };
        
        // Shirt geometry
        this.shirtGeometry = this.createShirtGeometry();
        
        // State
        this.currentLayer = 'base';
        this.isDirty = true;
        
        this.initialize();
    }

    initialize() {
        this.drawBackground();
        this.drawShirt();
        this.emit(EVENTS.CANVAS_READY, { canvas: this });
    }

    createOffscreenCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_CONFIG.WIDTH;
        canvas.height = CANVAS_CONFIG.HEIGHT;
        return canvas;
    }

    createShirtGeometry() {
        const { WIDTH, HEIGHT, CENTER_X, CENTER_Y } = SHIRT_CONFIG;
        
        // T-shirt shape as a path
        return {
            body: {
                x: CENTER_X - WIDTH / 2,
                y: CENTER_Y - HEIGHT / 2 + 80,
                width: WIDTH,
                height: HEIGHT - 80
            },
            neckline: {
                x: CENTER_X,
                y: CENTER_Y - HEIGHT / 2 + 80,
                radius: 40
            },
            sleeves: [
                { // Left sleeve
                    x: CENTER_X - WIDTH / 2,
                    y: CENTER_Y - HEIGHT / 2 + 100,
                    width: -80,
                    height: 120
                },
                { // Right sleeve
                    x: CENTER_X + WIDTH / 2,
                    y: CENTER_Y - HEIGHT / 2 + 100,
                    width: 80,
                    height: 120
                }
            ]
        };
    }

    drawBackground() {
        this.ctx.fillStyle = CANVAS_CONFIG.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawShirt() {
        const ctx = this.layers.base.getContext('2d');
        const { body, neckline, sleeves } = this.shirtGeometry;
        
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw shirt body
        ctx.fillStyle = SHIRT_CONFIG.COLOR;
        ctx.strokeStyle = SHIRT_CONFIG.OUTLINE_COLOR;
        ctx.lineWidth = SHIRT_CONFIG.OUTLINE_WIDTH;
        
        ctx.beginPath();
        
        // Body rectangle
        ctx.rect(body.x, body.y, body.width, body.height);
        
        // Left sleeve
        ctx.rect(sleeves[0].x, sleeves[0].y, sleeves[0].width, sleeves[0].height);
        
        // Right sleeve
        ctx.rect(sleeves[1].x, sleeves[1].y, sleeves[1].width, sleeves[1].height);
        
        ctx.fill();
        ctx.stroke();
        
        // Draw neckline
        ctx.fillStyle = CANVAS_CONFIG.BACKGROUND_COLOR;
        ctx.beginPath();
        ctx.arc(neckline.x, neckline.y, neckline.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        this.isDirty = true;
    }

    render() {
        if (!this.isDirty) return;
        
        this.drawBackground();
        
        // Composite all layers
        this.ctx.drawImage(this.layers.base, 0, 0);
        this.ctx.drawImage(this.layers.folds, 0, 0);
        this.ctx.drawImage(this.layers.dye, 0, 0);
        this.ctx.drawImage(this.layers.final, 0, 0);
        
        this.isDirty = false;
    }

    getLayer(layerName) {
        return this.layers[layerName];
    }

    clearLayer(layerName) {
        const layer = this.layers[layerName];
        const ctx = layer.getContext('2d');
        ctx.clearRect(0, 0, layer.width, layer.height);
        this.isDirty = true;
    }

    markDirty() {
        this.isDirty = true;
    }

    isPointOnShirt(x, y) {
        const { body, sleeves } = this.shirtGeometry;
        
        // Check body
        if (x >= body.x && x <= body.x + body.width &&
            y >= body.y && y <= body.y + body.height) {
            return true;
        }
        
        // Check sleeves
        for (const sleeve of sleeves) {
            const sleeveRight = sleeve.x + sleeve.width;
            const sleeveBottom = sleeve.y + sleeve.height;
            
            if ((sleeve.width > 0 && x >= sleeve.x && x <= sleeveRight ||
                 sleeve.width < 0 && x <= sleeve.x && x >= sleeveRight) &&
                y >= sleeve.y && y <= sleeveBottom) {
                return true;
            }
        }
        
        return false;
    }

    getImageData() {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    putImageData(imageData, x = 0, y = 0) {
        this.ctx.putImageData(imageData, x, y);
        this.isDirty = false;
    }
}