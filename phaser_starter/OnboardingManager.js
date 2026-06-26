/**
 * OnboardingManager.js
 * First-time guided tutorial with skippable steps and Settings replay.
 */
class OnboardingManager {
    constructor() {
        this.scene = null;
        this.steps = [];
        this.stepIndex = 0;
        this.active = false;
        this.container = null;
        this.uiElements = [];
        this.autoStartArmed = false;
        this.waitingForCinematic = false;
        this.sessionSuppressed = false;
        this._keyHandler = null;
        this._moveKeys = null;
        this.STORAGE_KEY = 'onboarding_completed_v1';
        this.CONTEXT_STORAGE_KEY = 'onboarding_context_v1';
        this.DEPTH = 50000;
        this.contextualSteps = [];
        this.contextualShown = {};
        this._lastMap = null;
        this._activeContextId = null;
        this._contextMode = null;
    }

    init(scene, data) {
        this.scene = scene;
        this.steps = (data && data.steps) ? [...data.steps] : [];
        this.contextualSteps = (data && data.contextual) ? [...data.contextual] : [];
        this.contextualShown = this.loadContextProgress();
        this._lastMap = window.MapManager ? window.MapManager.currentMap : null;
        debugLog(`📘 OnboardingManager ready (${this.steps.length} steps, ${this.contextualSteps.length} contextual)`);

        scene.events.on('cinematic-closed', () => {
            this.waitingForCinematic = false;
            this.tryAutoStart();
        });
    }

    loadContextProgress() {
        try {
            const saved = localStorage.getItem(this.CONTEXT_STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('OnboardingManager: could not load contextual progress', e);
        }
        return {};
    }

    saveContextProgress() {
        try {
            localStorage.setItem(this.CONTEXT_STORAGE_KEY, JSON.stringify(this.contextualShown));
        } catch (e) {
            console.warn('OnboardingManager: could not save contextual progress', e);
        }
    }

    isContextShown(id) {
        return !!this.contextualShown[id];
    }

    markContextShown(id) {
        this.contextualShown[id] = true;
        this.saveContextProgress();
    }

    clearContextProgress() {
        this.contextualShown = {};
        try {
            localStorage.removeItem(this.CONTEXT_STORAGE_KEY);
        } catch (e) {
            console.warn('OnboardingManager: could not clear contextual progress', e);
        }
    }

    isCompleted() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    markCompleted() {
        try {
            localStorage.setItem(this.STORAGE_KEY, 'true');
        } catch (e) {
            console.warn('OnboardingManager: could not persist completion', e);
        }
    }

    clearCompleted() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (e) {
            console.warn('OnboardingManager: could not clear completion', e);
        }
        this.clearContextProgress();
    }

    /**
     * Arm auto-start for brand-new profiles (no save load this session).
     * @param {{ waitForCinematic?: boolean }} options
     */
    armAutoStart(options = {}) {
        if (this.sessionSuppressed || this.isCompleted() || this.steps.length === 0) {
            return;
        }
        this.autoStartArmed = true;
        this.waitingForCinematic = !!options.waitForCinematic;
        if (!this.waitingForCinematic) {
            this.tryAutoStart();
        }
    }

    suppressForSession() {
        this.sessionSuppressed = true;
        this.autoStartArmed = false;
    }

    tryAutoStart() {
        if (!this.autoStartArmed || this.active || this.sessionSuppressed || this.isCompleted()) {
            return;
        }
        if (this.waitingForCinematic) {
            return;
        }
        this.autoStartArmed = false;
        this.scene.time.delayedCall(400, () => {
            if (!this.active && !this.sessionSuppressed) {
                this.start(false);
            }
        });
    }

    willCinematicPlay() {
        const cm = this.scene && this.scene.cinematicManager;
        if (!cm || !cm.cinematics) return false;
        const cinematic = cm.cinematics.find(c => c.trigger === 'ms_game_start');
        return !!(cinematic && !cm.playedCinematics.has(cinematic.id));
    }

    replay() {
        if (!this.scene || this.steps.length === 0) return;
        if (this.active) {
            this.destroyUI();
            this.clearActionListeners();
            this.active = false;
            window.onboardingActive = false;
            this.resumeGameplay();
        }
        if (this._activeContextId) {
            this.dismissContextual(false);
        }
        if (window.UIManager && window.UIManager.settingsVisible) {
            window.UIManager.toggleSettings();
        }
        this.clearCompleted();
        this.sessionSuppressed = false;
        this._activeContextId = null;
        this.start(true);
    }

    /**
     * Per-frame contextual trigger checks (town exit proximity, map entry, etc.).
     */
    update() {
        if (!this.scene || this.sessionSuppressed || this.active) {
            return;
        }

        const currentMap = window.MapManager ? window.MapManager.currentMap : null;

        if (currentMap === 'wilderness' && this._lastMap !== 'wilderness') {
            if (this._activeContextId === 'town_exit') {
                this.dismissContextual(false);
            }
            this.tryContextualTrigger('enter_wilderness');
        }
        this._lastMap = currentMap;

        if (this._activeContextId === 'town_exit' && !this.isNearTownExit()) {
            this.dismissContextual(false);
        } else if (!this._activeContextId && this.isNearTownExit()) {
            this.tryContextualTrigger('near_town_exit');
        }
    }

    isNearTownExit() {
        if (!window.MapManager || window.MapManager.currentMap !== 'town' || !window.player) {
            return false;
        }
        const marker = window.MapManager.transitionMarkers.find(m => m.targetMap === 'wilderness');
        if (!marker) {
            return false;
        }
        const dist = Phaser.Math.Distance.Between(window.player.x, window.player.y, marker.x, marker.y);
        return dist <= marker.radius * 1.15;
    }

    tryContextualTrigger(triggerName) {
        if (this._activeContextId || this.active) {
            return;
        }
        const step = this.contextualSteps.find(s => s.trigger === triggerName);
        if (!step || this.isContextShown(step.id)) {
            return;
        }
        this.showContextual(step);
    }

    showContextual(step) {
        if (!step || this.active) {
            return;
        }

        this._activeContextId = step.id;
        this._contextMode = step.mode || 'full';

        if (this._contextMode === 'banner') {
            this.showContextBanner(step);
        } else {
            this.active = true;
            window.onboardingActive = true;
            this.pauseGameplay();
            this.showContextPanel(step, true);
        }
    }

    dismissContextual(markShown) {
        if (!this._activeContextId) {
            return;
        }
        if (markShown) {
            this.markContextShown(this._activeContextId);
        }
        this.destroyUI();
        this.clearActionListeners();
        if (this._contextMode === 'full') {
            this.active = false;
            window.onboardingActive = false;
            this.resumeGameplay();
        }
        this._activeContextId = null;
        this._contextMode = null;
    }

    showContextBanner(step) {
        this.destroyUI();
        const scene = this.scene;
        const width = scene.scale.width;
        const height = scene.scale.height;
        const baseDepth = this.DEPTH;
        const panelH = 130;
        const panelY = height - panelH / 2 - 16;

        this.trackUI(scene.add.rectangle(width / 2, panelY, Math.min(700, width * 0.9), panelH, 0x1a2433, 0.94)
            .setStrokeStyle(2, 0x5a8fd4)
            .setScrollFactor(0).setDepth(baseDepth));

        this.trackUI(scene.add.text(width / 2, panelY - 38, step.title, {
            fontSize: '20px', fill: '#ffd700', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth + 1));

        this.trackUI(scene.add.text(width / 2, panelY + 2, this.formatText(step.text), {
            fontSize: '15px', fill: '#e8e8e8', align: 'center',
            wordWrap: { width: Math.min(660, width * 0.85) }, lineSpacing: 5
        }).setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth + 1));

        const btnY = panelY + 46;
        const gotBtn = this.trackUI(scene.add.rectangle(width / 2, btnY, 140, 34, 0x2a6e3f)
            .setScrollFactor(0).setDepth(baseDepth + 1)
            .setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x66cc88));
        const gotText = this.trackUI(scene.add.text(width / 2, btnY, 'Got it', {
            fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth + 2));
        this.wireButton(gotBtn, gotText, () => this.dismissContextual(true));

        if (typeof addChatMessage === 'function') {
            const interact = (typeof window.getInputLabel === 'function' && window.getInputLabel('interact') !== '?')
                ? window.getInputLabel('interact')
                : 'F';
            addChatMessage(`Town Exit nearby — press ${interact} to leave Hearthwell.`, 0x88ccff, '🚪');
        }
    }

    showContextPanel(step, isContextual) {
        this.destroyUI();
        const scene = this.scene;
        const width = scene.scale.width;
        const height = scene.scale.height;
        const baseDepth = this.DEPTH;

        this.trackUI(scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72)
            .setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth));

        if (step.highlight) {
            const hx = step.highlight.x * width;
            const hy = step.highlight.y * height;
            const hw = step.highlight.w * width;
            const hh = step.highlight.h * height;
            const ring = this.trackUI(scene.add.rectangle(hx, hy, hw, hh, 0x000000, 0)
                .setStrokeStyle(3, 0xffd700, 0.95)
                .setScrollFactor(0).setDepth(baseDepth + 1));
            scene.tweens.add({
                targets: ring,
                alpha: { from: 0.5, to: 1 },
                duration: 700,
                yoyo: true,
                repeat: -1
            });
        }

        const panelW = Math.min(640, width * 0.85);
        const panelH = 200;
        const panelY = height - panelH / 2 - 28;
        this.trackUI(scene.add.rectangle(width / 2, panelY, panelW, panelH, 0x1a2433, 0.98)
            .setStrokeStyle(2, 0x5a8fd4)
            .setScrollFactor(0).setDepth(baseDepth + 2));

        this.trackUI(scene.add.text(width / 2, panelY - 62, step.title, {
            fontSize: '22px', fill: '#ffd700', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth + 3));

        this.trackUI(scene.add.text(width / 2, panelY - 8, this.formatText(step.text), {
            fontSize: '16px', fill: '#e8e8e8', align: 'center',
            wordWrap: { width: panelW - 40 }, lineSpacing: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth + 3));

        const btnY = panelY + 78;
        const btnDepth = baseDepth + 4;
        const nextBtn = this.trackUI(scene.add.rectangle(width / 2 + 70, btnY, 120, 36, 0x2a6e3f)
            .setScrollFactor(0).setDepth(btnDepth)
            .setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x66cc88));
        const nextText = this.trackUI(scene.add.text(width / 2 + 70, btnY, 'Got it', {
            fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(btnDepth + 1));
        this.wireButton(nextBtn, nextText, () => {
            if (isContextual) {
                this.dismissContextual(true);
            }
        });
        this.bindAdvanceKeys(() => {
            if (isContextual) {
                this.dismissContextual(true);
            }
        });

        if (isContextual && typeof addChatMessage === 'function') {
            addChatMessage(step.title, 0x88ccff, '⚔️');
        }
    }

    start(isReplay) {
        if (!this.scene || this.steps.length === 0 || this.active) return;

        this.active = true;
        this.stepIndex = 0;
        window.onboardingActive = true;
        this.pauseGameplay();

        if (typeof addChatMessage === 'function') {
            const label = isReplay ? 'Tutorial replay started.' : 'Welcome! A quick tutorial is starting.';
            addChatMessage(label, 0x88ccff, '📘');
        }

        this.showStep(0);
    }

    pauseGameplay() {
        if (this.scene && this.scene.physics) {
            this.scene.physics.pause();
        }
        window.isGamePaused = true;
        if (window.GameState) window.GameState.isGamePaused = true;
    }

    resumeGameplay() {
        if (this.scene && this.scene.physics) {
            this.scene.physics.resume();
        }
        window.isGamePaused = false;
        if (window.GameState) window.GameState.isGamePaused = false;
    }

    formatText(text) {
        const kb = (key, fallback) => {
            if (typeof window.getInputLabel === 'function') {
                const label = window.getInputLabel(key);
                if (label && label !== '?') return label;
            }
            return fallback;
        };

        const isGamepad = (typeof currentInputMode !== 'undefined' && currentInputMode === 'gamepad');
        const replacements = {
            '{move}': isGamepad ? 'Left Stick / D-pad' : 'WASD or Arrow Keys',
            '{attack}': isGamepad ? 'A' : 'Space',
            '{interact}': isGamepad ? 'A' : 'F',
            '{quests}': isGamepad ? 'D-pad Down' : 'Q',
            '{inventory}': isGamepad ? 'D-pad Left' : 'I',
            '{equipment}': kb('equipment', 'E'),
            '{abilities}': isGamepad ? 'X / Y / B' : '1 / 2 / 3',
            '{potions}': isGamepad ? 'LB / RB' : '5 / 6',
            '{save}': 'F6',
            '{load}': 'F9'
        };

        let out = text;
        Object.keys(replacements).forEach(token => {
            out = out.split(token).join(replacements[token]);
        });
        return out;
    }

    destroyUI() {
        this.clearActionListeners();
        if (this.uiElements && this.uiElements.length) {
            this.uiElements.forEach(el => {
                if (el && el.destroy) el.destroy();
            });
            this.uiElements = [];
        }
        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }
    }

    trackUI(obj) {
        if (obj) this.uiElements.push(obj);
        return obj;
    }

    clearActionListeners() {
        if (this._keyHandler && this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown', this._keyHandler);
        }
        this._keyHandler = null;
        this._moveKeys = null;
    }

    bindAdvanceKeys(onAdvance) {
        this.clearActionListeners();
        const scene = this.scene;
        if (!scene.input || !scene.input.keyboard) return;

        this._keyHandler = (event) => {
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                onAdvance();
            }
        };
        scene.input.keyboard.on('keydown', this._keyHandler);
    }

    wireButton(rect, text, onClick) {
        const handler = () => {
            if (typeof playSound === 'function') playSound('menu_select');
            onClick();
        };
        rect.on('pointerdown', handler);
        if (text && text.setInteractive) {
            text.setInteractive({ useHandCursor: true });
            text.on('pointerdown', handler);
        }
    }

    showStep(index) {
        if (!this.scene || index < 0 || index >= this.steps.length) {
            this.finish(false);
            return;
        }

        this.stepIndex = index;
        const step = this.steps[index];
        this.destroyUI();

        const scene = this.scene;
        const width = scene.scale.width;
        const height = scene.scale.height;
        const baseDepth = this.DEPTH;

        this.trackUI(scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72)
            .setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth));

        if (step.highlight) {
            const hx = step.highlight.x * width;
            const hy = step.highlight.y * height;
            const hw = step.highlight.w * width;
            const hh = step.highlight.h * height;
            const ring = this.trackUI(scene.add.rectangle(hx, hy, hw, hh, 0x000000, 0)
                .setStrokeStyle(3, 0xffd700, 0.95)
                .setScrollFactor(0).setDepth(baseDepth + 1));
            scene.tweens.add({
                targets: ring,
                alpha: { from: 0.5, to: 1 },
                duration: 700,
                yoyo: true,
                repeat: -1
            });
        }

        const panelW = Math.min(640, width * 0.85);
        const panelH = 200;
        const panelY = height - panelH / 2 - 28;
        this.trackUI(scene.add.rectangle(width / 2, panelY, panelW, panelH, 0x1a2433, 0.98)
            .setStrokeStyle(2, 0x5a8fd4)
            .setScrollFactor(0).setDepth(baseDepth + 2));

        const title = this.trackUI(scene.add.text(width / 2, panelY - 62, step.title, {
            fontSize: '22px', fill: '#ffd700', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth + 3));

        const body = this.trackUI(scene.add.text(width / 2, panelY - 8, this.formatText(step.text), {
            fontSize: '16px', fill: '#e8e8e8', align: 'center',
            wordWrap: { width: panelW - 40 }, lineSpacing: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth + 3));

        this.trackUI(scene.add.text(width / 2, panelY + 52, `Step ${index + 1} of ${this.steps.length}`, {
            fontSize: '13px', fill: '#888888'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(baseDepth + 3));

        const btnY = panelY + 78;
        const advance = step.advance || 'next';
        const btnDepth = baseDepth + 4;

        if (advance === 'action_move') {
            this.trackUI(scene.add.text(width / 2, btnY, 'Try moving now…', {
                fontSize: '15px', fill: '#aaddff', fontStyle: 'italic'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(btnDepth));
            this.resumeGameplay();
            this.bindMovementAdvance(() => this.advance());
        } else {
            const nextBtn = this.trackUI(scene.add.rectangle(width / 2 + 70, btnY, 120, 36, 0x2a6e3f)
                .setScrollFactor(0).setDepth(btnDepth)
                .setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x66cc88));
            const nextText = this.trackUI(scene.add.text(width / 2 + 70, btnY, 'Next', {
                fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(btnDepth + 1));
            this.wireButton(nextBtn, nextText, () => this.advance());
            this.bindAdvanceKeys(() => this.advance());
        }

        const skipBtn = this.trackUI(scene.add.rectangle(width / 2 - 70, btnY, 120, 36, 0x444444)
            .setScrollFactor(0).setDepth(btnDepth)
            .setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x888888));
        const skipText = this.trackUI(scene.add.text(width / 2 - 70, btnY, 'Skip', {
            fontSize: '16px', fill: '#cccccc'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(btnDepth + 1));
        this.wireButton(skipBtn, skipText, () => this.finish(true));
    }

    bindMovementAdvance(onDone) {
        this.clearActionListeners();
        const scene = this.scene;
        if (!scene.input || !scene.input.keyboard) {
            onDone();
            return;
        }

        const codes = new Set([
            'KeyW', 'KeyA', 'KeyS', 'KeyD',
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
        ]);

        this._keyHandler = (event) => {
            if (codes.has(event.code)) {
                this.clearActionListeners();
                this.pauseGameplay();
                onDone();
            }
        };
        scene.input.keyboard.on('keydown', this._keyHandler);

        scene.time.delayedCall(12000, () => {
            if (this._keyHandler) {
                this.clearActionListeners();
                this.pauseGameplay();
                onDone();
            }
        });
    }

    advance() {
        const next = this.stepIndex + 1;
        if (next >= this.steps.length) {
            this.finish(false);
        } else {
            this.showStep(next);
        }
    }

    finish(skipped) {
        this.destroyUI();
        this.clearActionListeners();
        this.active = false;
        window.onboardingActive = false;
        this.resumeGameplay();

        this.markCompleted();

        if (typeof addChatMessage === 'function') {
            const msg = skipped
                ? 'Tutorial skipped. Replay anytime from Settings.'
                : 'Tutorial complete! Explore town, then head to the Town Exit when you are ready.';
            addChatMessage(msg, skipped ? 0xaaaaaa : 0x88ff88, skipped ? '⏭️' : '✅');
        }
    }
}

window.OnboardingManager = new OnboardingManager();
