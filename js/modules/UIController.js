// UIController.js - Manages user interface interactions

import { EventEmitter, getCanvasPoint } from './utils.js';
import { PHASES, FOLD_TYPES, EVENTS, COLOR_PRESETS } from '../config/constants.js';

export class UIController extends EventEmitter {
    constructor(canvas, foldingEngine, dyePhysics, colorManager, patternGenerator) {
        super();
        this.canvas = canvas;
        this.foldingEngine = foldingEngine;
        this.dyePhysics = dyePhysics;
        this.colorManager = colorManager;
        this.patternGenerator = patternGenerator;
        
        this.currentPhase = PHASES.FOLD;
        this.selectedFoldType = null;
        
        this.initializeUI();
        this.attachEventListeners();
    }

    initializeUI() {
        this.createColorPresets();
        this.updatePhaseDisplay();
    }

    createColorPresets() {
        const container = document.getElementById('preset-colors');
        
        COLOR_PRESETS.forEach(preset => {
            const colorDiv = document.createElement('div');
            colorDiv.className = 'preset-color';
            colorDiv.style.backgroundColor = preset.hex;
            colorDiv.title = preset.name;
            colorDiv.dataset.color = preset.hex;
            
            colorDiv.addEventListener('click', () => {
                this.selectPresetColor(preset.hex);
                document.querySelectorAll('.preset-color').forEach(el => 
                    el.classList.remove('active'));
                colorDiv.classList.add('active');
            });
            
            container.appendChild(colorDiv);
        });
    }

    attachEventListeners() {
        // Canvas interactions
        const canvasEl = this.canvas.canvas;
        canvasEl.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        canvasEl.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        canvasEl.addEventListener('mouseup', () => this.handleCanvasMouseUp());
        canvasEl.addEventListener('mouseleave', () => this.handleCanvasMouseUp());

        // Fold controls
        document.querySelectorAll('[data-fold]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedFoldType = e.target.dataset.fold;
                this.applyFold(this.selectedFoldType);
            });
        });

        document.getElementById('undo-fold').addEventListener('click', () => 
            this.foldingEngine.undo());
        document.getElementById('redo-fold').addEventListener('click', () => 
            this.foldingEngine.redo());
        document.getElementById('clear-folds').addEventListener('click', () => 
            this.foldingEngine.clear());

        // Dye controls
        document.getElementById('dye-color').addEventListener('input', (e) => {
            this.colorManager.setColor(e.target.value);
        });

        document.getElementById('dye-intensity').addEventListener('input', (e) => {
            this.dyePhysics.setIntensity(parseInt(e.target.value));
        });

        document.getElementById('brush-size').addEventListener('input', (e) => {
            this.dyePhysics.setBrushSize(parseInt(e.target.value));
        });

        document.getElementById('clear-dye').addEventListener('click', () => 
            this.dyePhysics.clear());

        // Unfold controls
        document.getElementById('unfold-btn').addEventListener('click', () => 
            this.patternGenerator.generatePattern());
        
        document.getElementById('reset-btn').addEventListener('click', () => 
            this.reset());
        
        document.getElementById('save-btn').addEventListener('click', () => 
            this.savePattern());

        // Phase navigation
        document.getElementById('prev-phase').addEventListener('click', () => 
            this.previousPhase());
        document.getElementById('next-phase').addEventListener('click', () => 
            this.nextPhase());
    }

    handleCanvasMouseDown(e) {
        const point = getCanvasPoint(this.canvas.canvas, e);
        
        if (this.currentPhase === PHASES.DYE) {
            this.dyePhysics.startApplying(point.x, point.y);
        }
    }

    handleCanvasMouseMove(e) {
        const point = getCanvasPoint(this.canvas.canvas, e);
        
        if (this.currentPhase === PHASES.DYE) {
            this.dyePhysics.continueApplying(point.x, point.y);
        }
    }

    handleCanvasMouseUp() {
        if (this.currentPhase === PHASES.DYE) {
            this.dyePhysics.stopApplying();
        }
    }

    applyFold(foldType) {
        const params = this.getFoldParameters(foldType);
        this.foldingEngine.applyFold(foldType, params);
    }

    getFoldParameters(foldType) {
        switch (foldType) {
            case FOLD_TYPES.ACCORDION:
                return { direction: 'horizontal', numFolds: 3 };
            case FOLD_TYPES.SPIRAL:
                return { rotations: 2 };
            case FOLD_TYPES.CRUMPLE:
                return {};
            case FOLD_TYPES.DIAGONAL:
                return { angle: 45 };
            default:
                return {};
        }
    }

    selectPresetColor(hex) {
        this.colorManager.setColor(hex);
        document.getElementById('dye-color').value = hex;
    }

    nextPhase() {
        if (this.currentPhase === PHASES.FOLD) {
            this.currentPhase = PHASES.DYE;
        } else if (this.currentPhase === PHASES.DYE) {
            this.currentPhase = PHASES.UNFOLD;
        }
        
        this.updatePhaseDisplay();
        this.emit(EVENTS.PHASE_CHANGED, { phase: this.currentPhase });
    }

    previousPhase() {
        if (this.currentPhase === PHASES.DYE) {
            this.currentPhase = PHASES.FOLD;
        } else if (this.currentPhase === PHASES.UNFOLD) {
            this.currentPhase = PHASES.DYE;
        }
        
        this.updatePhaseDisplay();
        this.emit(EVENTS.PHASE_CHANGED, { phase: this.currentPhase });
    }

    updatePhaseDisplay() {
        // Update workflow indicator
        document.querySelectorAll('.workflow-indicator .step').forEach(step => {
            step.classList.remove('active');
            if (step.dataset.step === this.currentPhase) {
                step.classList.add('active');
            }
        });

        // Show/hide control groups
        document.getElementById('fold-controls').classList.toggle('hidden', 
            this.currentPhase !== PHASES.FOLD);
        document.getElementById('dye-controls').classList.toggle('hidden', 
            this.currentPhase !== PHASES.DYE);
        document.getElementById('unfold-controls').classList.toggle('hidden', 
            this.currentPhase !== PHASES.UNFOLD);

        // Update navigation buttons
        document.getElementById('prev-phase').disabled = 
            this.currentPhase === PHASES.FOLD;
        document.getElementById('next-phase').disabled = 
            this.currentPhase === PHASES.UNFOLD;

        // Update canvas cursor
        this.canvas.canvas.style.cursor = 
            this.currentPhase === PHASES.DYE ? 'crosshair' : 'default';
    }

    reset() {
        this.foldingEngine.clear();
        this.dyePhysics.clear();
        this.canvas.clearLayer('final');
        this.currentPhase = PHASES.FOLD;
        this.updatePhaseDisplay();
        this.canvas.render();
    }

    savePattern() {
        const link = document.createElement('a');
        link.download = `tie-dye-pattern-${Date.now()}.png`;
        link.href = this.canvas.canvas.toDataURL();
        link.click();
    }
}