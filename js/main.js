// main.js - Application initialization and coordination

import { TShirtCanvas } from './modules/TShirtCanvas.js';
import { FoldingEngine } from './modules/FoldingEngine.js';
import { ColorManager } from './modules/ColorManager.js';
import { DyePhysics } from './modules/DyePhysics.js';
import { PatternGenerator } from './modules/PatternGenerator.js';
import { UIController } from './modules/UIController.js';
import { EVENTS } from './config/constants.js';

class TieDyeApp {
    constructor() {
        this.modules = {};
        this.initialized = false;
    }

    async init() {
        console.log('Initializing Tie-Dye Generator...');

        try {
            // Initialize core modules in dependency order
            this.modules.canvas = new TShirtCanvas('tshirt-canvas');
            this.modules.colorManager = new ColorManager();
            this.modules.foldingEngine = new FoldingEngine(this.modules.canvas);
            this.modules.dyePhysics = new DyePhysics(
                this.modules.canvas,
                this.modules.colorManager,
                this.modules.foldingEngine
            );
            this.modules.patternGenerator = new PatternGenerator(
                this.modules.canvas,
                this.modules.foldingEngine,
                this.modules.dyePhysics
            );
            this.modules.uiController = new UIController(
                this.modules.canvas,
                this.modules.foldingEngine,
                this.modules.dyePhysics,
                this.modules.colorManager,
                this.modules.patternGenerator
            );

            this.attachEventListeners();
            this.startRenderLoop();

            this.initialized = true;
            console.log('Tie-Dye Generator initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }

    attachEventListeners() {
        // Listen to module events for coordination
        this.modules.canvas.on(EVENTS.CANVAS_READY, () => {
            console.log('Canvas ready');
        });

        this.modules.foldingEngine.on(EVENTS.FOLD_APPLIED, (data) => {
            console.log('Fold applied:', data.fold.type);
        });

        this.modules.dyePhysics.on(EVENTS.DYE_APPLIED, () => {
            // Could add analytics or other tracking here
        });

        this.modules.patternGenerator.on(EVENTS.UNFOLD_START, () => {
            console.log('Unfolding pattern...');
        });

        this.modules.patternGenerator.on(EVENTS.UNFOLD_COMPLETE, () => {
            console.log('Pattern generated!');
            // Hide fold and dye layers, show final
            this.modules.canvas.clearLayer('folds');
            this.modules.canvas.clearLayer('dye');
        });
    }

    startRenderLoop() {
        const render = () => {
            this.modules.canvas.render();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new TieDyeApp();
        app.init();
        
        // Expose app to window for debugging
        window.tieDyeApp = app;
    });
} else {
    const app = new TieDyeApp();
    app.init();
    window.tieDllllpp = a