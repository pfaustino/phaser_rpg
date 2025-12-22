/**
 * DialogManager.js
 * Manages the availability of dialog options based on milestones and game state.
 */
class DialogManager {
    constructor(scene) {
        this.scene = scene;
        this.unlockedDialogs = new Set();
        this.enabledDialogs = new Set();
    }

    init() {
        console.log('💬 DialogManager initialized');
        this.loadProgress();
    }

    /**
     * Enable a specific dialog option/branch
     * @param {string} dialogId 
     */
    enableDialog(dialogId) {
        if (!this.enabledDialogs.has(dialogId)) {
            console.log(`💬 Unlocking dialog option: ${dialogId}`);
            this.enabledDialogs.add(dialogId);
            this.saveProgress();

            // Emit event
            if (this.scene.events) {
                this.scene.events.emit('dialog_unlocked', dialogId);
            }
        }
    }

    /**
     * Check if a dialog is enabled
     */
    isDialogEnabled(dialogId) {
        return this.enabledDialogs.has(dialogId);
    }

    /**
     * Load state
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('rpg_dialog_unlocks');
            if (saved) {
                const parsed = JSON.parse(saved);
                parsed.forEach(id => this.enabledDialogs.add(id));
            }
        } catch (e) {
            console.warn('DialogManager: Failed to load progress', e);
        }
    }

    /**
     * Save state
     */
    saveProgress() {
        try {
            const array = Array.from(this.enabledDialogs);
            localStorage.setItem('rpg_dialog_unlocks', JSON.stringify(array));
        } catch (e) {
            console.warn('DialogManager: Failed to save progress', e);
        }
    }
}

window.DialogManager = DialogManager;
