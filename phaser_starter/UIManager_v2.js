debugLog('✅ UIManager_v2.js LOADED (Forced Refresh)');

window.UIManager = {
    // State Variables
    inventoryVisible: false,
    equipmentVisible: false, // Keeping track even if logic stays split
    settingsVisible: false,
    questVisible: false,
    dialogVisible: false,
    shopVisible: false,
    buildingPanelVisible: false,
    assetsVisible: false,
    grassDebugVisible: false,

    init: function () {
        console.log('[UIManager] Initializing global hooks...');
        window.toggleSettings = () => this.toggleSettings();
        window.createSettingsUI = () => this.createSettingsUI(); // Ensure game.js can call it

        // Ensure other managers can hook in
    },

    // Panel References
    inventoryPanel: null,
    equipmentPanel: null,
    settingsPanel: null,
    questPanel: null,
    dialogPanel: null,
    shopPanel: null,
    buildingPanel: null,
    assetsPanel: null,
    grassDebugPanel: null,

    // Toast / Notification State
    activeToasts: [],
    toastQueue: [],
    isToastProcessing: false,

    // Tooltip State
    currentTooltip: null,
    tooltipHideTimer: null,

    /**
     * Check if any UI window is currently open
     * Used to block movement/interaction when clicking on UI
     */
    isAnyWindowOpen: function () {
        return this.inventoryVisible ||
            this.equipmentVisible ||
            this.settingsVisible ||
            this.questVisible ||
            this.dialogVisible ||
            this.shopVisible ||
            this.buildingPanelVisible ||
            (typeof window.buildingPanelVisible !== 'undefined' && window.buildingPanelVisible) ||
            this.assetsVisible ||
            this.grassDebugVisible ||
            (window.questCompletedModal && (window.questCompletedModal.visible || window.questCompletedModal.closeBtn)) ||
            (window.newQuestModal && window.newQuestModal.visible) ||
            (window.questPreviewModal !== null); // Assuming questPreviewModal remains global or moves here later
    },

    /**
     * Close all open interfaces
     */
    closeAllInterfaces: function () {
        if (this.inventoryVisible) {
            this.toggleInventory(); // Toggles off
        }
        if (this.equipmentVisible) {
            this.equipmentVisible = false;
            if (typeof destroyEquipmentUI === 'function') destroyEquipmentUI(); // Check legacy or move later
        }
        if (this.questVisible) {
            this.toggleQuestLog(); // Toggles off
        }
        if (this.shopVisible) {
            this.shopVisible = false;
            if (typeof closeShop === 'function') closeShop();
        }
        if (this.settingsVisible) {
            this.toggleSettings(); // Toggles off
        }
        if (this.dialogVisible) {
            this.closeDialog();
        }

        // Handle Building UIs
        if (typeof window.buildingPanelVisible !== 'undefined' && window.buildingPanelVisible) {
            if (typeof window.closeBuildingUI === 'function') {
                window.closeBuildingUI();
            } else {
                // Manual fallback for specific buildings
                if (window.TavernUI && window.TavernUI.visible) window.TavernUI.close();
                if (window.InnUI && window.InnUI.visible) window.InnUI.close();
                if (window.ForgeUI && window.ForgeUI.visible) window.ForgeUI.close();
            }
            window.buildingPanelVisible = false;
            this.buildingPanelVisible = false;
        }
    },

    // ============================================
    // SETTINGS UI
    // ============================================

    toggleSettings: function () {
        // If settings is already open, close it (handled by closeAllInterfaces via isAnyWindowOpen check, but explicit check here is fine too)
        if (this.settingsVisible) {
            this.settingsVisible = false;
            this.destroySettingsUI();
            return;
        }

        // If ANY other window is open, simply close them and DO NOT open settings
        // This makes ESC act as a generic "Close" button
        if (this.isAnyWindowOpen() || (typeof window.buildingPanelVisible !== 'undefined' && window.buildingPanelVisible)) {
            this.closeAllInterfaces();
            return;
        }

        // Now open settings (only if nothing else was open)
        this.settingsVisible = true;
        this.createSettingsUI();
    },

    // --- Save/Load Modal ---
    saveLoadModal: null,

    showSaveLoadModal: function (mode) { // mode: 'save' or 'load'
        if (this.saveLoadModal) this.destroySaveLoadModal();
        this.closeAllInterfaces(); // Close other windows

        const scene = game.scene.scenes[0];
        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 2;
        const width = 600;
        const height = 500;

        const bg = scene.add.rectangle(centerX, centerY, width, height, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(20000).setStrokeStyle(3, mode === 'save' ? 0x00ff00 : 0x4444ff)
            .setInteractive(); // Block input

        const titleText = mode === 'save' ? 'SAVE GAME' : 'LOAD GAME';
        const titleColor = mode === 'save' ? '#00ff00' : '#aaaaff';

        const title = scene.add.text(centerX, centerY - height / 2 + 30, titleText, {
            fontSize: '32px', fill: titleColor, fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(20001).setOrigin(0.5);

        const closeBtn = scene.add.text(centerX + width / 2 - 20, centerY - height / 2 + 20, 'X', {
            fontSize: '24px', fill: '#ffffff'
        }).setScrollFactor(0).setDepth(20001).setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => this.destroySaveLoadModal());

        this.saveLoadModal = { bg, title, closeBtn, elements: [] };

        // Render Slots
        const startY = centerY - height / 2 + 80;
        const gap = 70;

        for (let i = 1; i <= 5; i++) {
            const y = startY + (i - 1) * gap;
            this.createSlotEntry(scene, centerX, y, i, mode);
        }
    },

    createSlotEntry: function (scene, x, y, slot, mode) {
        const width = 500;
        const height = 60;
        const meta = window.SaveManager.getSlotMeta(slot);

        // Slot Background
        const bg = scene.add.rectangle(x, y, width, height, 0x333333, 0.9)
            .setScrollFactor(0).setDepth(20001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x666666);

        // Slot Number
        const numText = scene.add.text(x - width / 2 + 20, y, `Slot ${slot}`, {
            fontSize: '20px', fill: '#ffffff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(20002).setOrigin(0, 0.5);

        // Info Text
        let infoStr = "Empty";
        let subInfoStr = "";

        if (meta) {
            const date = new Date(meta.timestamp).toLocaleString();
            infoStr = `Lvl ${meta.info.level || '?'} - ${meta.info.map}`;
            subInfoStr = date;
        }

        const infoText = scene.add.text(x, y - 10, infoStr, {
            fontSize: '18px', fill: meta ? '#ffff00' : '#888888'
        }).setScrollFactor(0).setDepth(20002).setOrigin(0.5, 0.5);

        const subText = scene.add.text(x, y + 15, subInfoStr, {
            fontSize: '12px', fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(20002).setOrigin(0.5, 0.5);

        // Action
        bg.on('pointerdown', () => {
            if (mode === 'save') {
                // Confirm overwrite if exists
                if (meta && !confirm(`Overwrite Slot ${slot}?`)) return;

                window.SaveManager.saveGame(slot);
                this.destroySaveLoadModal();
            } else {
                if (!meta) {
                    if (typeof playSound === 'function') playSound('ui_error');
                    return;
                }
                window.loadGame(slot);
            }
        });

        // Hover effect
        bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffffff));
        bg.on('pointerout', () => bg.setStrokeStyle(1, 0x666666));

        this.saveLoadModal.elements.push(bg, numText, infoText, subText);
    },

    destroySaveLoadModal: function () {
        if (this.saveLoadModal) {
            if (this.saveLoadModal.bg) this.saveLoadModal.bg.destroy();
            if (this.saveLoadModal.title) this.saveLoadModal.title.destroy();
            if (this.saveLoadModal.closeBtn) this.saveLoadModal.closeBtn.destroy();
            if (this.saveLoadModal.elements) this.saveLoadModal.elements.forEach(e => e.destroy());
            this.saveLoadModal = null;
        }
    },

    createSettingsUI: function () {
        const scene = game.scene.scenes[0];
        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 2;
        const panelWidth = 400;
        const panelHeight = 620;

        // Background
        const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(10000).setStrokeStyle(3, 0xffffff);

        // Title
        const title = scene.add.text(centerX, centerY - panelHeight / 2 + 30, 'SETTINGS', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(10001).setOrigin(0.5);

        this.settingsPanel = {
            bg: bg,
            title: title,
            elements: [],
            interactiveItems: [] // Structured list for controller navigation
        };

        let currentY = centerY - 150;
        const spacing = 55;

        // --- Volume Sliders Helper ---
        const createSlider = (y, label, initialValue, onUpdate, id) => {
            const trackWidth = 250;
            const trackHeight = 10;
            const thumbSize = 20;

            // Label
            const labelText = scene.add.text(centerX, y - 25, `${label}: ${Math.round(initialValue * 100)}%`, {
                fontSize: '18px', fill: '#ffffff'
            }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

            // Track
            const track = scene.add.rectangle(centerX, y, trackWidth, trackHeight, 0x333333)
                .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true });

            // Thumb
            const thumbX = centerX - (trackWidth / 2) + (initialValue * trackWidth);
            const thumb = scene.add.rectangle(thumbX, y, thumbSize, thumbSize, 0xffffff)
                .setScrollFactor(0).setDepth(10002).setInteractive({ useHandCursor: true });

            const updateSlider = (pointerX) => {
                const relativeX = Phaser.Math.Clamp(pointerX - (centerX - trackWidth / 2), 0, trackWidth);
                const value = relativeX / trackWidth;

                thumb.x = (centerX - trackWidth / 2) + relativeX;
                labelText.setText(`${label}: ${Math.round(value * 100)}%`);
                onUpdate(value);
            };

            const setValue = (val) => {
                const value = Phaser.Math.Clamp(val, 0, 1);
                const relativeX = value * trackWidth;
                thumb.x = (centerX - trackWidth / 2) + relativeX;
                labelText.setText(`${label}: ${Math.round(value * 100)}%`);
                onUpdate(value);
            };

            track.on('pointerdown', (pointer) => updateSlider(pointer.x));

            scene.input.setDraggable(thumb);
            thumb.on('drag', (pointer) => updateSlider(pointer.x));

            this.settingsPanel.elements.push(labelText, track, thumb);

            // Register as interactive item
            this.settingsPanel.interactiveItems.push({
                type: 'slider',
                id: id,
                bg: track, // Visual target for highlight
                thumb: thumb,
                getValue: () => (thumb.x - (centerX - trackWidth / 2)) / trackWidth,
                setValue: setValue
            });
        };

        // --- Music Slider ---
        const musicVolume = (typeof window.musicVolume !== 'undefined') ? window.musicVolume : 0.5;
        createSlider(currentY, 'Music Volume', musicVolume, (val) => {
            if (typeof window.updateMusicVolume === 'function') {
                window.updateMusicVolume(val);
            }
        }, 'music');
        currentY += spacing + 20;

        // --- SFX Slider ---
        const sfxVolume = (typeof window.sfxVolume !== 'undefined') ? window.sfxVolume : 0.7;
        createSlider(currentY, 'SFX Volume', sfxVolume, (val) => {
            if (typeof window.updateSFXVolume === 'function') {
                window.updateSFXVolume(val);
            }
        }, 'sfx');
        currentY += spacing + 10;

        // --- Difficulty Selector ---
        const diffLabel = scene.add.text(centerX, currentY, 'Difficulty:', {
            fontSize: '18px', fill: '#ffffff'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);
        this.settingsPanel.elements.push(diffLabel);

        // Push label as a non-interactive row purely for spacing? No, we skip it.
        // We will make the difficulty ROW the interactive item.

        currentY += 25;

        const difficulties = ['casual', 'easy', 'normal', 'hard', 'nightmare'];
        const diffColors = {
            casual: 0x4CAF50,
            easy: 0x8BC34A,
            normal: 0x2196F3,
            hard: 0xFF9800,
            nightmare: 0xF44336
        };
        const currentDiff = window.GameState?.currentDifficulty || 'normal';
        const diffBtnWidth = 70;
        const diffBtnSpacing = 5;
        const totalDiffWidth = (diffBtnWidth * 5) + (diffBtnSpacing * 4);
        const diffStartX = centerX - totalDiffWidth / 2 + diffBtnWidth / 2;

        const diffButtons = [];

        difficulties.forEach((diff, index) => {
            const btnX = diffStartX + index * (diffBtnWidth + diffBtnSpacing);
            const isSelected = (diff === currentDiff);
            const btnColor = isSelected ? diffColors[diff] : 0x333333;
            const textColor = isSelected ? '#ffffff' : '#888888';

            const btn = scene.add.rectangle(btnX, currentY, diffBtnWidth, 30, btnColor)
                .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
                .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffffff : 0x666666);

            const diffName = diff.charAt(0).toUpperCase() + diff.slice(1);
            const btnText = scene.add.text(btnX, currentY, diffName.substring(0, 6), {
                fontSize: '11px', fill: textColor
            }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

            btn.diffKey = diff;
            btn.btnText = btnText;

            const selectDifficulty = () => {
                // Update game state and persist
                window.GameState.currentDifficulty = diff;
                localStorage.setItem('gameDifficulty', diff);

                // Update button visuals
                this.settingsPanel.elements.forEach(el => {
                    if (el.diffKey !== undefined) {
                        const isNowSelected = (el.diffKey === diff);
                        el.setFillStyle(isNowSelected ? diffColors[el.diffKey] : 0x333333);
                        el.setStrokeStyle(isNowSelected ? 2 : 1, isNowSelected ? 0xffffff : 0x666666);
                        if (el.btnText) {
                            el.btnText.setColor(isNowSelected ? '#ffffff' : '#888888');
                        }
                    }
                });

                if (typeof playSound === 'function') playSound('menu_select');
                if (typeof addChatMessage === 'function') {
                    addChatMessage(`Difficulty set to ${diffName}`, 0xffd700, '⚙️');
                }
            };

            btn.on('pointerdown', selectDifficulty);

            this.settingsPanel.elements.push(btn, btnText);
            diffButtons.push({ btn, selectDifficulty, key: diff });
        });

        // Register Difficulty Row
        this.settingsPanel.interactiveItems.push({
            type: 'selector',
            id: 'difficulty',
            options: diffButtons, // Store references to buttons to manually trigger click/highlight
            bg: diffButtons[0].btn, // Fallback highlight target (usually we highlight the 'Row' or individual item)
            // For selector, we might want to highlight the CURRENT selection
            getValue: () => window.GameState.currentDifficulty || 'normal',
            select: (diffKey) => {
                const target = diffButtons.find(d => d.key === diffKey);
                if (target) target.selectDifficulty();
            }
        });

        currentY += spacing;

        // --- Debug Mode Checkbox ---
        const debugEnabled = window.GameState?.debugMode || false;

        const debugLabel = scene.add.text(centerX - 80, currentY, 'Debug Mode:', {
            fontSize: '16px', fill: '#888888'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0, 0.5);

        const checkboxBg = scene.add.rectangle(centerX + 60, currentY, 24, 24, 0x333333)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x666666);

        const checkmark = scene.add.text(centerX + 60, currentY, debugEnabled ? '✓' : '', {
            fontSize: '18px', fill: '#00ff00'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        const toggleDebug = () => {
            const newValue = !window.GameState.debugMode;
            window.GameState.debugMode = newValue;
            localStorage.setItem('debugMode', newValue.toString());
            checkmark.setText(newValue ? '✓' : '');

            if (typeof addChatMessage === 'function') {
                addChatMessage(`Debug mode ${newValue ? 'enabled' : 'disabled'}`, 0xaaaaaa, '🔧');
            }
        };

        checkboxBg.on('pointerdown', toggleDebug);

        this.settingsPanel.elements.push(debugLabel, checkboxBg, checkmark);

        this.settingsPanel.interactiveItems.push({
            type: 'checkbox',
            id: 'debug',
            bg: checkboxBg, // Highlight target
            toggle: toggleDebug
        });

        currentY += spacing - 15;

        // --- Save Game ---
        const saveBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x004400)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x00ff00);
        const saveBtnText = scene.add.text(centerX, currentY, 'SAVE GAME', {
            fontSize: '20px', fill: '#00ff00', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        const onSave = () => {
            this.showSaveLoadModal('save');
            if (typeof playSound === 'function') playSound('menu_select');
        };

        saveBtnBg.on('pointerdown', onSave);
        this.settingsPanel.elements.push(saveBtnBg, saveBtnText);

        this.settingsPanel.interactiveItems.push({
            type: 'button',
            id: 'save',
            bg: saveBtnBg,
            action: onSave
        });

        currentY += spacing;

        // --- Load Game ---
        const loadBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x000044)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x4444ff);
        const loadBtnText = scene.add.text(centerX, currentY, 'LOAD GAME', {
            fontSize: '20px', fill: '#aaaaff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        const onLoad = () => {
            this.showSaveLoadModal('load');
            if (typeof playSound === 'function') playSound('menu_select');
        };

        loadBtnBg.on('pointerdown', onLoad);
        this.settingsPanel.elements.push(loadBtnBg, loadBtnText);

        this.settingsPanel.interactiveItems.push({
            type: 'button',
            id: 'load',
            bg: loadBtnBg,
            action: onLoad
        });

        currentY += spacing;

        // --- New Game ---
        const newGameBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x330000)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0xff0000);
        const newGameBtnText = scene.add.text(centerX, currentY, 'NEW GAME', {
            fontSize: '20px', fill: '#ff4444', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        const onNewGame = () => {
            if (confirm("Start a New Game? Unsaved progress will be lost.")) {
                localStorage.removeItem('rpg_load_on_start'); // Ensure clean start
                window.resetGame ? window.resetGame() : location.reload();
            }
        };

        newGameBtnBg.on('pointerdown', onNewGame);
        this.settingsPanel.elements.push(newGameBtnBg, newGameBtnText);

        this.settingsPanel.interactiveItems.push({
            type: 'button',
            id: 'newgame',
            bg: newGameBtnBg,
            action: onNewGame
        });

        // --- Close ---
        const closeBtnBg = scene.add.rectangle(centerX, centerY + panelHeight / 2 - 40, 100, 40, 0x444444)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true });
        const closeText = scene.add.text(centerX, centerY + panelHeight / 2 - 40, 'Close', {
            fontSize: '18px', fill: '#ffffff'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        const onClose = () => {
            this.toggleSettings();
            if (typeof playSound === 'function') playSound('menu_select');
        };

        closeBtnBg.on('pointerdown', onClose);
        this.settingsPanel.elements.push(closeBtnBg, closeText);

        this.settingsPanel.interactiveItems.push({
            type: 'button',
            id: 'close',
            bg: closeBtnBg,
            action: onClose
        });
    },

    destroySettingsUI: function () {
        if (this.settingsPanel) {
            if (this.settingsPanel.bg) this.settingsPanel.bg.destroy();
            if (this.settingsPanel.title) this.settingsPanel.title.destroy();
            if (this.settingsPanel.elements) {
                this.settingsPanel.elements.forEach(el => el.destroy());
            }
            this.settingsPanel = null;
        }
    },

    toggleSettings: function () {
        this.settingsVisible = !this.settingsVisible;
        if (this.settingsVisible) {
            this.createSettingsUI();

            // Auto-select first item for controller
            if (this.settingsPanel && this.settingsPanel.interactiveItems.length > 0) {
                this.settingsPanel.selectedIndex = 0;
                // Defer update slightly to ensure UI is ready
                setTimeout(() => {
                    if (window.updateSettingsHighlight) {
                        window.updateSettingsHighlight(this.settingsPanel);
                    }
                }, 50);
            }

            if (typeof playSound === 'function') playSound('menu_open');
        } else {
            this.destroySettingsUI();
            if (typeof playSound === 'function') playSound('menu_close');
        }
    },

    // ============================================
    // INVENTORY UI (DEPRECATED)
    // ============================================
    // NOTE: The standalone Inventory UI has been removed.
    // Use the Equipment panel (E key / D-pad UP) which shows both equipment and inventory.

    // Use the Equipment panel (E key / D-pad UP) which shows both equipment and inventory.

    toggleEquipment: function () {
        if (typeof window.toggleEquipment === 'function') {
            window.toggleEquipment();
        } else {
            console.error("Window.toggleEquipment not found!");
        }
    },

    // Stubs for backward compatibility (do nothing)
    toggleInventory: function () {
        this.toggleEquipment();
    },


    createInventoryUI: function () {
        console.warn('createInventoryUI is deprecated. Use Equipment panel instead.');
    },


    updateInventoryItems: function () {
        // No-op: deprecated
    },

    destroyInventoryUI: function () {
        this.inventoryVisible = false;
    },

    updateInventory: function () {
        // No-op: deprecated
    },

    // ============================================
    // DIALOG UI
    // ============================================

    createDialogUI: function (npc) {
        const scene = game.scene.scenes[0];

        if (this.dialogPanel) {
            this.destroyDialogUI();
        }

        const panelWidth = 700;
        const panelHeight = 250;
        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 2 + 50;

        // Background
        const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x000000, 0.9)
            .setScrollFactor(0).setDepth(400).setStrokeStyle(4, 0xffffff);

        // Portrait
        let portraitImage = null;
        let portraitHeight = 0;

        if (npc && npc.portraitKey && scene.textures.exists(npc.portraitKey)) {
            portraitImage = scene.add.image(centerX, centerY - 100, npc.portraitKey)
                .setScrollFactor(0).setDepth(401);

            const maxPortraitHeight = 150;
            if (portraitImage.height > maxPortraitHeight) {
                const scale = maxPortraitHeight / portraitImage.height;
                portraitImage.setScale(scale);
            }
            portraitHeight = portraitImage.displayHeight;
        }

        // Name
        const npcNameText = scene.add.text(centerX, centerY - 100, npc.name || 'Unknown', {
            fontSize: '24px', fill: '#ffd700', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5);

        this.dialogPanel = {
            bg: bg,
            portraitImage: portraitImage,
            npcNameText: npcNameText,
            dialogText: null,
            choiceButtons: [],
            portraitHeight: portraitHeight
        };

        this.dialogVisible = true;
    },

    showDialogNode: function (nodeId) {
        if (!window.DialogManager || !window.DialogManager.currentDialog) return;
        const dialog = window.DialogManager.currentDialog;
        const node = dialog.nodes[nodeId];

        if (!node) {
            console.error(`Dialog node '${nodeId}' not found!`);
            this.closeDialog();
            return;
        }

        window.DialogManager.currentDialogNode = nodeId;
        this.updateDialogUI(node);
    },

    updateDialogUI: function (node) {
        const scene = game.scene.scenes[0];
        if (!this.dialogPanel) return;

        if (this.dialogPanel.dialogText) this.dialogPanel.dialogText.destroy();
        this.dialogPanel.choiceButtons.forEach(btn => {
            if (btn.bg) btn.bg.destroy();
            if (btn.text) btn.text.destroy();
        });
        this.dialogPanel.choiceButtons = [];

        const panelWidth = 700;
        const buttonHeight = 40;
        const buttonSpacing = 10;
        const portraitHeight = this.dialogPanel.portraitHeight || 0;

        // Filter valid choices
        const visibleChoices = node.choices.filter(choice => {
            if (!choice.condition) return true;
            return window.evaluateDialogCondition ? window.evaluateDialogCondition(choice.condition, window.playerStats) : true;
        });

        // Layout calcs
        const headerHeight = portraitHeight + 50;
        const lineCount = (node.text.match(/\n/g) || []).length + 1;
        const textHeight = Math.max(80, Math.min(600, Math.max(lineCount * 24, node.text.length * 0.6)));
        const choicesHeight = visibleChoices.length * (buttonHeight + buttonSpacing) + 20;
        const dynamicPanelHeight = headerHeight + textHeight + choicesHeight + 20;

        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 2 + 50;

        this.dialogPanel.bg.setPosition(centerX, centerY);
        this.dialogPanel.bg.setSize(panelWidth, dynamicPanelHeight);

        if (this.dialogPanel.portraitImage) {
            this.dialogPanel.portraitImage.setPosition(centerX, centerY - dynamicPanelHeight / 2 + portraitHeight / 2 + 10);
        }
        this.dialogPanel.npcNameText.setPosition(centerX, centerY - dynamicPanelHeight / 2 + portraitHeight + 35);

        const textX = centerX - panelWidth / 2 + 20;
        const textY = centerY - dynamicPanelHeight / 2 + portraitHeight + 65;
        this.dialogPanel.dialogText = scene.add.text(textX, textY, node.text, {
            fontSize: '18px', fill: '#ffffff', wordWrap: { width: panelWidth - 40 }
        }).setScrollFactor(0).setDepth(401).setOrigin(0, 0);

        // Buttons
        const startY = centerY - dynamicPanelHeight / 2 + headerHeight + textHeight;

        visibleChoices.forEach((choice, index) => {
            const buttonY = startY + index * (buttonHeight + buttonSpacing);
            const buttonWidth = panelWidth - 40;

            const buttonBg = scene.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, 0x333333, 0.9)
                .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });

            let displayText = choice.text;
            let textColor = '#ffffff';
            let loreUnlocked = false;

            if (choice.isQuest) {
                // Determine icon based on state
                if (choice.questState === 'active') {
                    displayText = `(?) ${choice.text}`;
                    textColor = '#aaaaaa'; // Grey for active/in-progress
                } else if (choice.questState === 'turnin') {
                    displayText = `(?) ${choice.text}`; // Or (!) depending on pref, usually Turn In is Special
                    textColor = '#ffff00'; // Yellow for turn-in
                } else {
                    // Default / Available / Offer
                    displayText = `(!) ${choice.text}`;
                    textColor = '#ffff00'; // Yellow for new
                }
            } else if (choice.action === 'unlock_lore' && choice.loreId) {
                try {
                    const unlocked = JSON.parse(localStorage.getItem('rpg_unlocked_lore') || '[]');
                    loreUnlocked = unlocked.includes(choice.loreId);
                } catch (e) { }
                displayText = loreUnlocked ? `✓ ${choice.text}` : `○ ${choice.text}`;
                textColor = loreUnlocked ? '#88ff88' : '#9370DB';
            }

            const buttonText = scene.add.text(centerX, buttonY, displayText, {
                fontSize: '16px', fill: textColor
            }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

            buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x444444));
            buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x333333));

            buttonBg.on('pointerdown', (pointer) => {
                console.warn('🖱️ Dialog Button Clicked:', choice.text);
                if (pointer && pointer.event) pointer.event.stopPropagation();
                this.handleDialogChoice(choice);
            });

            // Make text pass-through or interactive too (just to be safe)
            buttonText.setInteractive({ useHandCursor: true })
                .on('pointerdown', (pointer) => {
                    console.warn('🖱️ Dialog Text Clicked:', choice.text);
                    if (pointer && pointer.event) pointer.event.stopPropagation();
                    this.handleDialogChoice(choice);
                });

            this.dialogPanel.choiceButtons.push({ bg: buttonBg, text: buttonText, choice: choice });
        });

        // 🛑 FALLBACK: If no choices are valid (dead end), auto-close after 3 seconds
        if (visibleChoices.length === 0) {
            scene.time.delayedCall(3000, () => {
                this.closeDialog();
            });
        }
    },

    handleDialogChoice: function (choice) {
        const action = choice.action;

        if (action === 'unlock_lore' && choice.loreId) {
            if (window.loreManager) window.loreManager.unlock(choice.loreId);
        }

        if (action === 'open_shop') {
            if (window.ShopManager) window.ShopManager.openShop(window.currentDialogNPC);
        } else if (action === 'choose_class') {
            if (typeof window.chooseClass === 'function') window.chooseClass(choice.className);
            this.finishChoice(choice);
        } else if (['quest_advance', 'quest_accept', 'quest_accept_side', 'quest_accept_v2', 'quest_accept_main'].includes(action)) {
            // Redirect to global helper for preview modal
            if (window.showQuestPreviewModalEnhanced) {
                // Must close dialog strictly but keep reference? 
                // showQuestPreviewModalEnhanced handles closing/reopening internally?
                // No, it expects us to close.
                this.closeDialog();
                window.showQuestPreviewModalEnhanced(choice.questId,
                    () => { // Accept
                        window.uqe.acceptQuest(choice.questId);
                        window.updateQuestTrackerHUD && window.updateQuestTrackerHUD();
                        // Reopen
                        if (window.DialogManager) setTimeout(() => window.DialogManager.startDialog(window.currentDialogNPC), 50);
                    },
                    () => { // Decline
                        if (window.DialogManager) setTimeout(() => window.DialogManager.startDialog(window.currentDialogNPC), 50);
                    }
                );
                return; // Stop here
            }
        } else if (action === 'complete_objective') {
            console.warn('🎯 UIManager: complete_objective called', choice.questId, choice.objectiveId);
            if (window.uqe && choice.questId && choice.objectiveId) {
                // Call UQE to update progress
                window.uqe.completeObjective(choice.questId, choice.objectiveId);
                console.warn('✅ UQE.completeObjective executed');

                // Force save to prevent data loss on refresh
                if (window.saveGame) {
                    window.saveGame(null, false, "Quest Update Autosave"); // Silent set to false to show message
                    console.warn('💾 Forced silent save after objective complete');
                }

                // Then show feedback
                this.finishChoice(choice);
            } else {
                console.error('❌ UIManager: UQE or IDs missing for complete_objective');
            }
        } else if (action === 'complete_quest' || action === 'quest_turnin') {
            if (window.uqe && choice.questId) {
                // Explicitly call completeQuest in UQE
                if (typeof window.uqe.completeQuest === 'function') {
                    window.uqe.completeQuest(choice.questId);

                    // Force save to prevent data loss on refresh
                    if (window.saveGame) {
                        window.saveGame(null, false, "Quest Complete Autosave"); // Silent set to false to show message
                    }
                } else {
                    console.error('❌ UIManager: window.uqe.completeQuest is NOT a function');
                }

                // Close dialog or proceed
                if (choice.next) this.showDialogNode(choice.next);
                else this.closeDialog();
            }
        } else {
            this.finishChoice(choice);
        }
    },

    finishChoice: function (choice) {
        if (choice.next) {
            this.showDialogNode(choice.next);
        } else {
            this.closeDialog();
        }
    },

    closeDialog: function () {
        this.destroyDialogUI();
        if (window.DialogManager) window.DialogManager.currentDialog = null;
    },

    destroyDialogUI: function () {
        if (this.dialogPanel) {
            if (this.dialogPanel.bg) this.dialogPanel.bg.destroy();
            if (this.dialogPanel.portraitImage) this.dialogPanel.portraitImage.destroy();
            if (this.dialogPanel.npcNameText) this.dialogPanel.npcNameText.destroy();
            if (this.dialogPanel.dialogText) this.dialogPanel.dialogText.destroy();
            if (this.dialogPanel.choiceButtons) {
                this.dialogPanel.choiceButtons.forEach(btn => {
                    if (btn.bg) btn.bg.destroy();
                    if (btn.text) btn.text.destroy();
                });
            }
            this.dialogPanel = null;
        }
        this.dialogVisible = false;
        window.dialogVisible = false;
    },

    // ============================================
    // UTILS (Tooltip & Scrollbar)
    // ============================================

    /**
     * Helper to generate tooltip text lines
     */
    getTooltipText: function (item, context = 'inventory', isComparison = false) {
        if (!item) return '';

        let tooltipLines = [];

        // Header
        // Header
        tooltipLines.push(`${item.name}` || 'Unknown Item');
        if (isComparison) {
            tooltipLines[0] += ' (Equipped)';
        }

        if (typeof calculateItemScore === 'function') {
            const score = calculateItemScore(item);
            if (score > 0) tooltipLines.push(`Gear Score: ${score}`);
        }

        // --- ABILITY TOOLTIP ---
        if (item.type === 'ability') {
            if (item.description) {
                tooltipLines.push('');
                // Wrap text if needed? The generic wordWrap in `createTooltipObject` handles visuals
                tooltipLines.push(item.description);
            }
            tooltipLines.push('');
            if (item.manaCost) tooltipLines.push(`Mana Cost: ${item.manaCost}`);
            if (item.cooldown) tooltipLines.push(`Cooldown: ${(item.cooldown / 1000).toFixed(1)}s`);

            return tooltipLines.join('\n');
        }

        if (item.quality) tooltipLines.push(`Quality: ${item.quality}`);
        if (item.itemLevel) tooltipLines.push(`iLvl: ${item.itemLevel}`);
        if (item.type) {
            const typeStr = item.type.charAt(0).toUpperCase() + item.type.slice(1);
            tooltipLines.push(`Type: ${typeStr}`);
        }

        if (item.attackPower) tooltipLines.push(`Attack: +${item.attackPower}`);
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
        if (item.maxHp) tooltipLines.push(`Max HP: +${item.maxHp}`);
        if (item.healAmount) tooltipLines.push(`Heal: ${item.healAmount} HP`);
        if (item.speed) tooltipLines.push(`Speed: +${item.speed}`);
        if (item.critChance) tooltipLines.push(`Crit: +${(item.critChance * 100).toFixed(1)}%`);
        if (item.lifesteal) tooltipLines.push(`Lifesteal: +${(item.lifesteal * 100).toFixed(1)}%`);

        if (typeof getItemSets === 'function') {
            const itemSetsForTooltip = getItemSets();
            if (item.set && itemSetsForTooltip && itemSetsForTooltip[item.set]) {
                tooltipLines.push('');
                tooltipLines.push(`Set: ${item.set}`);
                const setInfo = itemSetsForTooltip[item.set];
                if (setInfo && setInfo.pieces) {
                    tooltipLines.push(`Pieces: ${setInfo.pieces.join(', ')}`);
                }
            }
        }

        // Instructions (only for main item, not comparison)
        if (!isComparison && context === 'inventory') {
            const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
            if (equippableTypes.includes(item.type)) {
                tooltipLines.push('');
                tooltipLines.push('Click to Equip');
            } else if (item.type === 'consumable') {
                tooltipLines.push('');
                tooltipLines.push('Click to Use');
            }
        }

        return tooltipLines.join('\n');
    },

    /**
     * Show tooltip for an item
     */
    showTooltip: function (item, x, y, context = 'inventory') {
        try {
            if (!this) throw new Error("UIManager 'this' is undefined");

            const scene = game.scene.scenes[0];
            if (!scene) throw new Error("Scene not found");

            if (!item) {
                return;
            }

            // DEBUG: Track last hovered item type globally
            if (typeof window !== 'undefined') {
                window.lastHoveredType = item.type || 'undefined';
            }
            window.debugTrace = 0.5;

            if (this.tooltipHideTimer) {
                scene.time.removeEvent(this.tooltipHideTimer);
                this.tooltipHideTimer = null;
            }

            this.hideTooltip(true);

            // Ensure tracking array exists
            if (!this.activeTooltips) this.activeTooltips = [];

            // --- 1. Main Tooltip ---
            let mainTextStr = this.getTooltipText(item, context, false);

            const qualityColor = (window.QUALITY_COLORS && window.QUALITY_COLORS[item.quality]) ? window.QUALITY_COLORS[item.quality] : 0xffffff;

            const mainObj = this.createTooltipObject(scene, mainTextStr, x + 20, y + 20, qualityColor);
            if (!mainObj) return;

            // Keep main tooltip on screen
            const bounds = mainObj.text.getBounds();
            // Check right edge
            if (mainObj.text.x + bounds.width > scene.cameras.main.width) {
                const newX = x - bounds.width - 20;
                mainObj.text.setX(newX);
                mainObj.bg.setX(newX + bounds.width / 2);
            }
            // Check bottom edge
            if (mainObj.text.y + bounds.height > scene.cameras.main.height) {
                const newY = y - bounds.height - 20;
                mainObj.text.setY(newY);
                mainObj.bg.setY(newY + bounds.height / 2);
            }
            window.debugTrace = 3.5;


            this.currentTooltip = mainObj;

            // --- 2. Comparison Tooltip ---
            window.debugTrace = 4; // Start Comparison Logic
            // Only if we are hovering a valid equipment type and NOT hovering the equipped item itself
            const slotMapping = {
                'sword': 'weapon',
                'axe': 'weapon',
                'mace': 'weapon',
                'staff': 'weapon',
                'bow': 'weapon',
                'crossbow': 'weapon',
                'dagger': 'weapon',
                'weapon': 'weapon',
                'armor': 'armor',
                'helmet': 'helmet',
                'ring': 'ring',
                'amulet': 'amulet',
                'boots': 'boots',
                'gloves': 'gloves',
                'belt': 'belt',
                'shield': 'shield',
                // Allow capital cases just in case
                'Sword': 'weapon', 'Axe': 'weapon', 'Mace': 'weapon', 'Staff': 'weapon',
                'Bow': 'weapon', 'Crossbow': 'weapon', 'Dagger': 'weapon',
                'Weapon': 'weapon', 'Armor': 'armor', 'Helmet': 'helmet',
                'Ring': 'ring', 'Amulet': 'amulet', 'Boots': 'boots',
                'Gloves': 'gloves', 'Belt': 'belt', 'Shield': 'shield'
            };

            // Normalize type to lowercase for lookup
            const typeLower = (item.type || '').toLowerCase().trim();
            // Check both direct type (e.g. 'Sword') and lower cased (e.g. 'sword')
            const slot = slotMapping[item.type] || slotMapping[typeLower];
            window.debugTrace = 5; // Got Slot

            // DEBUG: Export state for HUD
            if (typeof window !== 'undefined') {
                const equipment = window.GameState && window.GameState.playerStats ? window.GameState.playerStats.equipment : null;
                const equippedItem = (equipment && slot) ? equipment[slot] : null;

                window.debugTooltipState = {
                    type: item.type,
                    typeLower: typeLower,
                    slot: slot || 'null',
                    equippedName: equippedItem ? equippedItem.name : 'None',
                    hasEquipment: !!equipment
                };
            }

            if (slot) {
                const equipment = window.GameState.playerStats.equipment;
                const equippedItem = equipment ? equipment[slot] : null;

                // Check if items are different: use ID if available, otherwise object reference
                // Check if items are different: default to true if objects are different
                // Previously suppressed comparison if names were identical, but this hid comparison for 
                // distinct items with same name (e.g. two "Iron Armor"s with different stats or just duplicates)
                const isDifferentItem = equippedItem && equippedItem !== item;

                if (isDifferentItem) {
                    const compTextStr = this.getTooltipText(equippedItem, context, true);
                    const compColor = (window.QUALITY_COLORS && window.QUALITY_COLORS[equippedItem.quality]) ? window.QUALITY_COLORS[equippedItem.quality] : 0xaaaaaa;

                    // Position: Attempt to place it to the Right of the main tooltip
                    // If specific space not available, try Left.
                    // Main Tooltip Final X/Y
                    const mainX = mainObj.text.x;
                    const mainY = mainObj.text.y;
                    const mainW = mainObj.text.width;

                    let compX = mainX + mainW + 20; // Default: Right
                    let compY = mainY;

                    const compObj = this.createTooltipObject(scene, compTextStr, compX, compY, compColor);

                    const compBounds = compObj.text.getBounds();

                    // If Right goes off-screen, move to Left of Main
                    if (compX + compBounds.width > scene.cameras.main.width) {
                        compX = mainX - compBounds.width - 20;
                        compObj.text.setX(compX);
                        compObj.bg.setX(compX + compBounds.width / 2);
                    }

                    this.comparisonTooltip = compObj;
                }
            }
        } catch (e) {
            console.error("CRASH in showTooltip:", e);
            if (typeof window !== 'undefined') {
                window.lastTooltipError = e.message;
                window.debugTrace = 999;
            }
        }
    },

    createTooltipObject: function (scene, textStr, x, y, borderColor) {
        // Remove [[DEBUG]] if present (just in case getTooltipText adds it)
        textStr = textStr.replace('[[DEBUG]] ', '');

        const text = scene.add.text(x, y, textStr, {
            fontSize: '14px',
            fill: '#ffffff',
            padding: { x: 10, y: 10 },
            wordWrap: { width: 220 }
        }).setScrollFactor(0).setDepth(10001).setOrigin(0);

        const bounds = text.getBounds();
        const bg = scene.add.rectangle(x + bounds.width / 2, y + bounds.height / 2, bounds.width, bounds.height, 0x000000, 0.9)
            .setScrollFactor(0).setDepth(9999).setStrokeStyle(2, borderColor);

        // Ensure text is above bg
        text.setDepth(10002);

        // Track tooltip with unique ID for debugging
        if (typeof this._tooltipIdCounter === 'undefined') this._tooltipIdCounter = 0;
        const obj = { text, bg, id: ++this._tooltipIdCounter };

        // Add to active tracking
        if (!this.activeTooltips) this.activeTooltips = [];
        this.activeTooltips.push(obj);

        return obj;
    },

    /**
     * hideTooltip - Destroys all active tooltips
     * 
     * IMPORTANT: This is the ONLY hideTooltip function in the file.
     * A duplicate was removed from around line 1462 on 2026-01-07.
     * That duplicate was overriding this function and causing tooltip persistence bugs.
     * 
     * This version uses the `activeTooltips` array to track all tooltip objects
     * (both main and comparison tooltips) and destroys them properly.
     * 
     * @param {boolean} immediate - If true, destroy immediately. If false, use timer debounce.
     */
    hideTooltip: function (immediate = false) {
        const scene = game.scene.scenes[0];
        const performHide = () => {
            // Destroy ALL active tooltips
            if (this.activeTooltips && this.activeTooltips.length > 0) {
                this.activeTooltips.forEach((obj) => {
                    try {
                        if (obj.text && obj.text.destroy) obj.text.destroy();
                        if (obj.bg && obj.bg.destroy) obj.bg.destroy();
                    } catch (err) {
                        console.error('UIManager: Error destroying tooltip:', err);
                    }
                });
                this.activeTooltips = [];
            } else {
                this.activeTooltips = [];
            }

            // Clear explicit references
            this.currentTooltip = null;
            this.comparisonTooltip = null;
        };

        if (immediate) {
            // Cancel any pending timer
            if (this.tooltipHideTimer) {
                if (scene && scene.time) scene.time.removeEvent(this.tooltipHideTimer);
                this.tooltipHideTimer = null;
            }
            performHide();
        } else {
            // Timer logic
            if (!this.tooltipHideTimer && scene && scene.time) {
                this.tooltipHideTimer = scene.time.delayedCall(50, () => {
                    performHide();
                    this.tooltipHideTimer = null;
                });
            }
        }
    },

    setupScrollbar: function (params) {
        const { scene, x, y, width = 12, height, depth = 1000, minScroll = 0, initialScroll = 0, onScroll, container, containerStartY, containerOffset = 0, wheelHitArea, visibleHeight } = params;

        const track = scene.add.rectangle(x, y, width, height, 0x333333, 0.8)
            .setScrollFactor(0).setDepth(depth).setStrokeStyle(1, 0x555555)
            .setInteractive({ useHandCursor: true }).setOrigin(0.5, 0);

        let thumbHeight = 40;
        const thumb = scene.add.rectangle(x, y, width - 4, thumbHeight, 0x666666, 1)
            .setScrollFactor(0).setDepth(depth + 1).setStrokeStyle(1, 0x888888)
            .setInteractive({ useHandCursor: true }).setOrigin(0.5, 0);

        let currentScroll = initialScroll;
        let maxScroll = 0;
        let isDragging = false;
        let dragStartY = 0;
        let dragStartScroll = 0;

        const setScroll = (newPosition) => {
            currentScroll = Math.max(minScroll, Math.min(maxScroll, newPosition));

            if (maxScroll > minScroll) {
                const scrollRange = maxScroll - minScroll;
                const scrollRatio = (currentScroll - minScroll) / scrollRange;
                const padding = 2;
                const availableTrackHeight = height - (padding * 2);
                const thumbMoveRange = availableTrackHeight - thumb.height;

                if (thumbMoveRange > 0) {
                    thumb.y = y + padding + (scrollRatio * thumbMoveRange);
                } else {
                    thumb.y = y + padding;
                }
            } else {
                thumb.y = y + 2;
            }

            if (container && containerStartY !== undefined) {
                container.y = containerStartY - containerOffset - currentScroll;
            }

            if (onScroll) onScroll(currentScroll);
        };

        const onPointerDown = (pointer) => {
            if (!track.visible) return;
            if (thumb.getBounds().contains(pointer.x, pointer.y)) {
                isDragging = true;
                dragStartY = pointer.y;
                dragStartScroll = currentScroll;
            } else if (track.getBounds().contains(pointer.x, pointer.y)) {
                const padding = 2;
                const availableTrackHeight = height - (padding * 2);
                const thumbMoveRange = availableTrackHeight - thumb.height;
                if (thumbMoveRange > 0) {
                    const clickY = pointer.y - y - padding - (thumb.height / 2);
                    const clickRatio = Math.max(0, Math.min(1, clickY / thumbMoveRange));
                    const scrollRange = maxScroll - minScroll;
                    setScroll(minScroll + clickRatio * scrollRange);
                }
            }
        };

        const onPointerMove = (pointer) => {
            if (isDragging && pointer.isDown) {
                const padding = 2;
                const availableTrackHeight = height - (padding * 2);
                const thumbMoveRange = availableTrackHeight - thumb.height;
                if (thumbMoveRange > 0 && maxScroll > minScroll) {
                    const deltaY = pointer.y - dragStartY;
                    const scrollChangeRatio = deltaY / thumbMoveRange;
                    const scrollRange = maxScroll - minScroll;
                    setScroll(dragStartScroll + scrollChangeRatio * scrollRange);
                }
            }
        };

        const onPointerUp = () => { isDragging = false; };

        const onWheel = (pointer, gameObjects, deltaX, deltaY) => {
            if (!track.visible || maxScroll <= minScroll) return;
            const hitArea = wheelHitArea || track;
            const bounds = (hitArea.getBounds ? hitArea.getBounds() : hitArea);
            if (bounds.contains(pointer.x, pointer.y)) {
                setScroll(currentScroll + deltaY * 0.5);
            }
        };

        scene.input.on('pointerdown', onPointerDown);
        scene.input.on('pointermove', onPointerMove);
        scene.input.on('pointerup', onPointerUp);
        scene.input.on('wheel', onWheel);

        return {
            track,
            thumb,
            updateMaxScroll: (newMax, totalContentHeight) => {
                maxScroll = newMax;
                if (totalContentHeight > visibleHeight) {
                    const ratio = Math.min(1, visibleHeight / totalContentHeight);
                    const padding = 2;
                    const usableHeight = height - (padding * 2);
                    thumb.height = Math.min(usableHeight, Math.max(30, usableHeight * ratio));
                    track.setVisible(true);
                    thumb.setVisible(true);
                } else {
                    track.setVisible(false);
                    thumb.setVisible(false);
                }
                setScroll(currentScroll);
            },
            setScroll,
            getScroll: () => currentScroll,
            destroy: () => {
                scene.input.off('pointerdown', onPointerDown);
                scene.input.off('pointermove', onPointerMove);
                scene.input.off('pointerup', onPointerUp);
                scene.input.off('wheel', onWheel);
                track.destroy();
                thumb.destroy();
            },
            setVisible: (visible) => {
                if (visible && maxScroll > minScroll) {
                    track.setVisible(true);
                    thumb.setVisible(true);
                } else {
                    track.setVisible(false);
                    thumb.setVisible(false);
                }
            }
        };
    },

    // ============================================
    // QUEST LOG UI
    // ============================================

    questLogTab: 'main', // 'main', 'current', 'available', 'completed'
    selectedQuestIndex: 0,
    isUpdatingQuestLog: false,

    toggleQuestLog: function () {
        // Don't allow opening quest log during combat
        if (typeof isInCombat === 'function' && isInCombat()) {
            return;
        }

        // If already open, close it
        if (this.questVisible) {
            this.questVisible = false;
            this.destroyQuestLogUI();
            return;
        }

        // Close all other interfaces before opening
        this.closeAllInterfaces();

        // Now open quest log
        this.questVisible = true;
        this.createQuestLogUI();
    },

    createQuestLogUI: function () {
        const scene = game.scene.scenes[0];
        const panelWidth = 900;
        const panelHeight = 600;
        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 2;

        const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xffffff);

        const title = scene.add.text(centerX, centerY - panelHeight / 2 + 15, 'QUEST LOG', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0);

        const closeText = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press Q to Close', {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(301).setOrigin(1, 0);

        const tabY = centerY - panelHeight / 2 + 60;
        const tabWidth = 110;
        const tabSpacing = 5;
        const totalTabWidth = (tabWidth * 4) + (tabSpacing * 3);
        const tabStartX = centerX - totalTabWidth / 2 + tabWidth / 2;

        this.questLogTab = 'main'; // Reset default tab

        const createTab = (x, label) => {
            const btn = scene.add.rectangle(x, tabY, tabWidth, 35, 0x333333, 0.9)
                .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });
            const text = scene.add.text(x, tabY, label, {
                fontSize: '16px',
                fill: '#aaaaaa'
            }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);
            return { btn, text };
        };

        const mainTab = createTab(tabStartX, 'Story');
        const currentTab = createTab(tabStartX + tabWidth + tabSpacing, 'Active');
        const availableTab = createTab(tabStartX + (tabWidth + tabSpacing) * 2, 'Available');
        const completedTab = createTab(tabStartX + (tabWidth + tabSpacing) * 3, 'Completed');

        const updateTabButtons = () => {
            // Reset all tabs
            [mainTab, currentTab, availableTab, completedTab].forEach(t => {
                t.btn.setStrokeStyle(2, 0x666666);
                t.text.setStyle({ fill: '#aaaaaa', fontStyle: 'normal' });
            });

            // Set active tab
            let active = null;
            if (this.questLogTab === 'main') active = mainTab;
            else if (this.questLogTab === 'current') active = currentTab;
            else if (this.questLogTab === 'available') active = availableTab;
            else if (this.questLogTab === 'completed') active = completedTab;

            if (active) {
                active.btn.setStrokeStyle(2, 0xffffff);
                active.text.setStyle({ fill: '#ffffff', fontStyle: 'bold' });
            }
        };

        const switchTab = (tabName) => {
            this.questLogTab = tabName;
            this.selectedQuestIndex = 0;
            updateTabButtons();

            if (tabName === 'available') {
                playerStats.questStats.availableTabClicked = (playerStats.questStats.availableTabClicked || 0) + 1;
                if (typeof checkQuestProgress === 'function') checkQuestProgress();
            }

            this.updateQuestLogItems();
        };

        mainTab.btn.on('pointerdown', () => switchTab('main'));
        mainTab.text.setInteractive({ useHandCursor: true }).on('pointerdown', () => switchTab('main'));

        currentTab.btn.on('pointerdown', () => switchTab('current'));
        currentTab.text.setInteractive({ useHandCursor: true }).on('pointerdown', () => switchTab('current'));

        availableTab.btn.on('pointerdown', () => switchTab('available'));
        availableTab.text.setInteractive({ useHandCursor: true }).on('pointerdown', () => switchTab('available'));

        completedTab.btn.on('pointerdown', () => switchTab('completed'));
        completedTab.text.setInteractive({ useHandCursor: true }).on('pointerdown', () => switchTab('completed'));

        const listStartX = centerX - panelWidth / 2 + 20;
        const listStartY = centerY - panelHeight / 2 + 100;
        const listWidth = 310;
        const listHeight = panelHeight - 200;

        const listContainer = scene.add.container(listStartX, listStartY);
        listContainer.setScrollFactor(0).setDepth(301);

        const listMask = scene.add.graphics();
        listMask.fillStyle(0xffffff);
        listMask.fillRect(listStartX, listStartY, listWidth, listHeight);
        listMask.setScrollFactor(0).setDepth(299).setVisible(false);
        const maskGeometry = listMask.createGeometryMask();
        listContainer.setMask(maskGeometry);

        const scrollbar = this.setupScrollbar({
            scene,
            x: listStartX + listWidth + 10,
            y: listStartY,
            height: listHeight,
            depth: 303,
            minScroll: 0,
            initialScroll: 0,
            container: listContainer,
            containerStartY: listStartY,
            containerOffset: 0,
            wheelHitArea: bg,
            visibleHeight: listHeight,
            onScroll: () => this.updateQuestLogItems()
        });

        const dividerX = centerX - panelWidth / 2 + 350;
        const dividerTopY = centerY - panelHeight / 2 + 100;
        const dividerHeight = panelHeight - 140;
        const divider = scene.add.rectangle(dividerX, dividerTopY + dividerHeight / 2, 2, dividerHeight, 0x666666, 1)
            .setScrollFactor(0).setDepth(301);

        this.questPanel = {
            bg, title, closeText,
            mainTab, currentTab, availableTab, completedTab,
            divider, container: listContainer, mask: listMask, maskGeometry,
            scrollbar,
            listStartX, listStartY, listWidth, listHeight,
            questListElements: [],
            questDetailElements: []
        };

        updateTabButtons();
        this.updateQuestLogItems();
    },

    updateQuestLogItems: function () {
        if (this.isUpdatingQuestLog) return;
        this.isUpdatingQuestLog = true;

        const scene = game.scene.scenes[0];
        if (!this.questPanel) {
            this.isUpdatingQuestLog = false;
            return;
        }

        try {
            if (this.questPanel.container) this.questPanel.container.removeAll(true);
            this.questPanel.questListElements = [];

            this.questPanel.questDetailElements.forEach(el => {
                if (el) el.destroy();
            });
            this.questPanel.questDetailElements = [];

            const centerX = this.questPanel.bg.x;
            const panelWidth = this.questPanel.bg.width;

            const listWidth = this.questPanel.listWidth;
            const listHeight = this.questPanel.listHeight;
            const listStartY = this.questPanel.listStartY;
            const dividerX = centerX - panelWidth / 2 + 350;

            const detailStartX = dividerX + 20;
            const detailStartY = this.questPanel.listStartY || (centerY - panelHeight / 2 + 100);

            // DEBUG: Temporarily disable mask to rule out masking issues
            // if (this.questPanel.maskGeometry) this.questPanel.container.setMask(this.questPanel.maskGeometry);
            if (this.questPanel.container) this.questPanel.container.clearMask();

            const detailWidth = panelWidth - (detailStartX - (centerX - panelWidth / 2)) - 20;

            let quests = [];
            // Retrieve quests based on tab (using UQE or legacy if needed)
            if (this.questLogTab === 'main') {
                if (window.uqe && window.uqe.activeQuests) {
                    window.uqe.activeQuests.forEach(q => {
                        const def = window.uqe.allDefinitions[q.id];
                        if (def && def.step) {
                            const totalProgress = q.objectives.reduce((sum, obj) => sum + obj.progress, 0);
                            const totalTarget = q.objectives.reduce((sum, obj) => sum + obj.target, 0);
                            quests.push({ ...q, progress: totalProgress, target: totalTarget, rewards: q.rewards || {} });
                        }
                    });
                }
            } else if (this.questLogTab === 'current') {
                if (window.uqe && window.uqe.activeQuests) {
                    window.uqe.activeQuests.forEach(q => {
                        const totalProgress = q.objectives.reduce((sum, obj) => sum + obj.progress, 0);
                        const totalTarget = q.objectives.reduce((sum, obj) => sum + obj.target, 0);
                        quests.push({ ...q, progress: totalProgress, target: totalTarget, rewards: q.rewards || {} });
                    });
                }
            } else if (this.questLogTab === 'available') {
                if (window.uqe && window.uqe.allDefinitions) {
                    const uqeCompletedIds = window.uqe.completedQuests.map(q => q.id);
                    const uqeActiveIds = window.uqe.activeQuests.map(q => q.id);
                    Object.values(window.uqe.allDefinitions).forEach(questDef => {
                        const isActive = uqeActiveIds.includes(questDef.id);
                        const isCompleted = uqeCompletedIds.includes(questDef.id);
                        let prereqMet = true;
                        if (questDef.requires) prereqMet = uqeCompletedIds.includes(questDef.requires);

                        if (!isActive && !isCompleted && prereqMet) {
                            const totalTarget = questDef.objectives.reduce((sum, obj) => sum + (obj.target || 1), 0);
                            quests.push({
                                ...questDef,
                                isUQE: true,
                                progress: 0,
                                target: totalTarget,
                                rewards: questDef.rewards || {}
                            });
                        }
                    });
                }
            } else { // completed
                if (window.uqe && window.uqe.completedQuests) {
                    window.uqe.completedQuests.forEach(q => {
                        const totalTarget = q.objectives.reduce((sum, obj) => sum + obj.target, 0);
                        quests.push({
                            ...q,
                            completed: true,
                            progress: totalTarget,
                            target: totalTarget,
                            rewards: q.rewards || {}
                        });
                    });
                }
            }

            if (this.selectedQuestIndex >= quests.length) this.selectedQuestIndex = Math.max(0, quests.length - 1);
            if (quests.length === 0) this.selectedQuestIndex = -1;

            // Render List
            if (quests.length === 0) {
                let msg = 'No quests found';
                if (this.questLogTab === 'main') msg = 'No active story quests';
                else if (this.questLogTab === 'available') msg = 'No available quests';
                else if (this.questLogTab === 'completed') msg = 'No completed quests';

                const noQuestsText = scene.add.text(listWidth / 2, listHeight / 2, msg, {
                    fontSize: '16px', fill: '#888888', fontStyle: 'italic'
                }).setOrigin(0.5, 0.5);
                this.questPanel.container.add(noQuestsText);

                if (this.questPanel.scrollbar) {
                    this.questPanel.scrollbar.updateMaxScroll(0, listHeight);
                    this.questPanel.scrollbar.setVisible(false);
                }
            } else {
                const questItemHeight = 50;
                const totalContentHeight = quests.length * questItemHeight;

                if (this.questPanel.scrollbar) {
                    const maxScroll = Math.max(0, totalContentHeight - listHeight);
                    this.questPanel.scrollbar.updateMaxScroll(maxScroll, totalContentHeight);
                }

                const scrollY = this.questPanel.scrollbar ? this.questPanel.scrollbar.getScroll() : 0;
                const startIndex = Math.floor(scrollY / questItemHeight);
                const endIndex = Math.min(quests.length, Math.ceil((scrollY + listHeight) / questItemHeight));

                for (let i = startIndex; i < endIndex; i++) {
                    const quest = quests[i];
                    const isSelected = (i === this.selectedQuestIndex);
                    const itemY = i * questItemHeight + questItemHeight / 2;

                    const itemBg = scene.add.rectangle(listWidth / 2, itemY, listWidth - 10, questItemHeight - 5,
                        isSelected ? 0x444444 : 0x2a2a2a, 0.9)
                        .setStrokeStyle(2, isSelected ? 0x00aaff : 0x555555)
                        .setScrollFactor(0).setDepth(302)
                        .setName(`quest_bg_${i}`) // Debug Name
                        .setInteractive({ useHandCursor: true });

                    const titleText = scene.add.text(10, itemY, quest.title, {
                        fontSize: '16px',
                        fill: isSelected ? '#ffffff' : '#cccccc',
                        fontStyle: 'bold'
                    }).setScrollFactor(0).setDepth(305).setOrigin(0, 0.5)
                        .setName(`quest_text_${i}`) // Debug Name
                        .setInteractive({ useHandCursor: true });

                    const onClick = () => {
                        debugLog('Quest Clicked:', i, quest.title);
                        this.selectedQuestIndex = i;
                        this.updateQuestLogItems();
                    };

                    // Try both pointerdown and pointerup
                    itemBg.on('pointerdown', onClick);
                    itemBg.on('pointerup', onClick);

                    titleText.on('pointerdown', onClick);
                    titleText.on('pointerup', onClick);

                    // Add debug logs directly
                    itemBg.on('pointerdown', () => debugLog(`DEBUG: pointerdown on bg ${i}`));
                    titleText.on('pointerdown', () => debugLog(`DEBUG: pointerdown on text ${i}`));

                    this.questPanel.container.add([itemBg, titleText]);

                    if ((this.questLogTab === 'current' || this.questLogTab === 'main') && quest.target) {
                        const progressPercent = Math.min(quest.progress / quest.target, 1);
                        const progressText = scene.add.text(listWidth - 15, itemY, `${Math.round(progressPercent * 100)}%`, {
                            fontSize: '12px', fill: '#00ff00'
                        }).setScrollFactor(0).setDepth(302).setOrigin(1, 0.5);
                        this.questPanel.container.add(progressText);
                    } else if (this.questLogTab === 'completed') {
                        const icon = scene.add.text(listWidth - 15, itemY, '✓', {
                            fontSize: '20px', fill: '#00ff00'
                        }).setScrollFactor(0).setDepth(302).setOrigin(1, 0.5);
                        this.questPanel.container.add(icon);
                    }
                }
            }

            // Render Details
            if (quests.length > 0 && this.selectedQuestIndex >= 0 && this.selectedQuestIndex < quests.length) {
                const quest = quests[this.selectedQuestIndex];
                let detailY = detailStartY;

                const detailTitle = scene.add.text(detailStartX, detailY, quest.title, {
                    fontSize: '24px', fill: '#ffffff', fontStyle: 'bold', wordWrap: { width: detailWidth - 20 }
                }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
                this.questPanel.questDetailElements.push(detailTitle);
                detailY += detailTitle.height + 15;

                const detailDesc = scene.add.text(detailStartX, detailY, quest.description, {
                    fontSize: '16px', fill: '#cccccc', wordWrap: { width: detailWidth - 20 }
                }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
                this.questPanel.questDetailElements.push(detailDesc);
                detailY += detailDesc.height + 25;

                if (quest.objectives) {
                    const objLabel = scene.add.text(detailStartX, detailY, 'Objectives:', {
                        fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
                    }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
                    this.questPanel.questDetailElements.push(objLabel);
                    detailY += objLabel.height + 10;

                    quest.objectives.forEach(obj => {
                        const statusStr = obj.completed ? '✅' : '⏳';
                        const objProgress = obj.progress !== undefined ? obj.progress : 0;

                        let textXOffset = 20;
                        if (obj.icon) {
                            const iconSprite = scene.add.sprite(detailStartX + 20, detailY + 10, obj.icon)
                                .setScrollFactor(0).setDepth(302).setScale(0.6);
                            this.questPanel.questDetailElements.push(iconSprite);
                            textXOffset += 25;
                        }

                        const objText = scene.add.text(detailStartX + textXOffset, detailY, `${statusStr} ${obj.label}: ${objProgress}/${obj.target}`, {
                            fontSize: '14px', fill: obj.completed ? '#00ff00' : '#cccccc', wordWrap: { width: detailWidth - textXOffset - 20 }
                        }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
                        this.questPanel.questDetailElements.push(objText);
                        detailY += objText.height + 5;
                    });
                    detailY += 15;
                }

                // Rewards
                detailY += 10;
                const rewardsLabel = scene.add.text(detailStartX, detailY, 'Rewards:', {
                    fontSize: '18px', fill: '#ffd700', fontStyle: 'bold'
                }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
                this.questPanel.questDetailElements.push(rewardsLabel);
                detailY += rewardsLabel.height + 5;

                let rewardsText = '';
                if (quest.rewards.xp) rewardsText += `+${quest.rewards.xp} XP`;
                if (quest.rewards.gold) {
                    if (rewardsText) rewardsText += '\n';
                    rewardsText += `+${quest.rewards.gold} Gold`;
                }
                const rewards = scene.add.text(detailStartX, detailY, rewardsText, {
                    fontSize: '16px', fill: '#ffd700'
                }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
                this.questPanel.questDetailElements.push(rewards);

                // Accept Button
                if (this.questLogTab === 'available') {
                    detailY += 60;
                    const acceptBtn = scene.add.rectangle(detailStartX + (detailWidth - 20) / 2, detailY, 200, 40, 0x00aa00, 0.9)
                        .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x00ff00)
                        .setInteractive({ useHandCursor: true })
                        .setName('AcceptQuestButton');
                    const acceptBtnText = scene.add.text(detailStartX + (detailWidth - 20) / 2, detailY, 'Accept Quest', {
                        fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
                    }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

                    const acceptQuest = () => {
                        debugLog(`[QuestLog] Clicking Accept for quest: ${quest.id}`);
                        if (window.uqe && quest.isUQE) {
                            window.uqe.acceptQuest(quest.id);
                            debugLog(`[QuestLog] Quest ${quest.id} accepted via UQE.`);
                        }
                        this.updateQuestLogItems();
                        if (typeof playSound === 'function') playSound('item_pickup');
                    };

                    // Add hover effects and click listeners
                    acceptBtn.on('pointerover', () => acceptBtn.setFillStyle(0x00cc00));
                    acceptBtn.on('pointerout', () => acceptBtn.setFillStyle(0x00aa00));
                    acceptBtn.on('pointerdown', acceptQuest);

                    // Ensure text is also interactive and triggers the button logic
                    acceptBtnText.setInteractive({ useHandCursor: true })
                        .on('pointerdown', acceptQuest)
                        .on('pointerover', () => acceptBtn.setFillStyle(0x00cc00))
                        .on('pointerout', () => acceptBtn.setFillStyle(0x00aa00));

                    this.questPanel.questDetailElements.push(acceptBtn, acceptBtnText);
                }
            }
        } catch (e) {
            console.error("Error updating quest log items:", e);
        } finally {
            this.isUpdatingQuestLog = false;
        }
    },

    destroyQuestLogUI: function () {
        if (this.questPanel) {
            if (this.questPanel.bg) this.questPanel.bg.destroy();
            if (this.questPanel.title) this.questPanel.title.destroy();
            if (this.questPanel.closeText) this.questPanel.closeText.destroy();

            ['main', 'current', 'available', 'completed'].forEach(k => {
                const tab = this.questPanel[k + 'Tab'];
                if (tab) {
                    if (tab.btn) tab.btn.destroy();
                    if (tab.text) tab.text.destroy();
                }
            });

            if (this.questPanel.divider) this.questPanel.divider.destroy();
            if (this.questPanel.container) this.questPanel.container.destroy();
            if (this.questPanel.mask) this.questPanel.mask.destroy();
            if (this.questPanel.scrollbar) this.questPanel.scrollbar.destroy();

            this.questPanel.questListElements.forEach(el => el && el.destroy());
            this.questPanel.questDetailElements.forEach(el => el && el.destroy());

            this.questPanel = null;
        }
        this.questVisible = false;
    },

    refreshQuestLog: function () {
        if (this.questVisible && this.questPanel) {
            this.updateQuestLogItems();
        }
    },



    // ============================================
    // TOOLTIP SYSTEM (Monsters/Items)
    // ============================================



    showMonsterTooltip: function (monster, x, y) {
        if (!window.game || !window.game.scene || !window.game.scene.scenes[0]) return;
        const scene = window.game.scene.scenes[0];

        // Clean up existing tooltip immediately (cancels any pending hide timers)
        this.hideTooltip(true);

        // Create container
        const tooltip = scene.add.container(x, y - 50).setDepth(20000);
        this.currentTooltip = tooltip;

        // Background
        const bg = scene.add.rectangle(0, 0, 150, 60, 0x000000, 0.8)
            .setStrokeStyle(2, 0xff0000);
        tooltip.add(bg);

        // Name Text
        const nameText = scene.add.text(0, -15, monster.name || 'Unknown', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: '#ffffff'
        }).setOrigin(0.5);
        tooltip.add(nameText);

        // Level Text
        const levelText = scene.add.text(0, 5, `Lvl ${monster.level || 1}`, {
            fontSize: '12px',
            fontFamily: 'Arial',
            fill: '#cccccc'
        }).setOrigin(0.5);
        tooltip.add(levelText);

        // HP Text
        // Use monster.hp vs monster.maxHp
        // Handle potential undefined maxHp
        const maxHp = monster.maxHp || monster.hp || 100;
        const hpText = scene.add.text(0, 20, `HP: ${Math.floor(monster.hp)}/${Math.floor(maxHp)}`, {
            fontSize: '12px',
            fontFamily: 'Arial',
            fill: '#ff4444'
        }).setOrigin(0.5);
        tooltip.add(hpText);

        // Fix: Add to activeTooltips so hideTooltip() can destroy it
        // We treat the container as the 'text' object for the destroy loop to pick it up effective immediately
        if (!this.activeTooltips) this.activeTooltips = [];
        this.activeTooltips.push({ text: tooltip });
    },

    // NOTE: hideTooltip is defined earlier in this file (around line 738)
    // DO NOT add a duplicate here - it will override the correct implementation!

    // ============================================
    // TOAST / NOTIFICATION SYSTEM
    // ============================================

    /**
     * Show a sliding toast notification
     * @param {string} message - Text to display
     * @param {string} type - 'info', 'success', 'warning', 'quest'
     * @param {number} duration - ms to display
     */
    showToast(message, type = 'info', duration = 3000) {
        return; // Disabled by user request
        if (!window.game || !window.game.scene || !window.game.scene.scenes[0]) return;
        const scene = window.game.scene.scenes[0];

        // Initialize queue if not present
        if (!this.toastQueue) {
            this.toastQueue = [];
            this.isToastProcessing = false;
        }

        // Add to queue
        this.toastQueue.push({ message, type, duration });

        if (!this.isToastProcessing) {
            this.processToastQueue();
        }
    },

    processToastQueue() {
        if (this.toastQueue.length === 0) {
            this.isToastProcessing = false;
            return;
        }

        this.isToastProcessing = true;
        const scene = window.game.scene.scenes[0];
        const toastData = this.toastQueue.shift();

        const centerX = scene.cameras.main.width / 2;
        const startY = -60;
        const targetY = 80;

        // Color mapping
        const colors = {
            info: { bg: 0x333333, text: '#ffffff', stroke: '#00ffff' },
            success: { bg: 0x1a4a1a, text: '#ffffff', stroke: '#00ff00' },
            warning: { bg: 0x4a1a1a, text: '#ffffff', stroke: '#ff0000' },
            quest: { bg: 0x2a2a4a, text: '#ffd700', stroke: '#ffd700' }
        };
        const style = colors[toastData.type] || colors.info;

        // Container for toast
        const toastWidth = 400;
        const toastHeight = 50;
        const bg = scene.add.rectangle(centerX, startY, toastWidth, toastHeight, style.bg, 0.9)
            .setScrollFactor(0).setDepth(10000).setStrokeStyle(2, style.bg === 0x333333 ? 0x888888 : 0xaaaaaa);

        const text = scene.add.text(centerX, startY, toastData.message, {
            fontSize: '18px',
            fill: style.text,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10001);

        // Slide in
        scene.tweens.add({
            targets: [bg, text],
            y: (target) => (target === bg ? targetY : targetY),
            duration: 500,
            ease: 'Back.out'
        });

        // Stay and slide out
        scene.time.delayedCall(toastData.duration, () => {
            scene.tweens.add({
                targets: [bg, text],
                y: startY,
                duration: 500,
                ease: 'Back.in',
                onComplete: () => {
                    bg.destroy();
                    text.destroy();
                    // Process next in queue
                    this.processToastQueue();
                }
            });
        });
    },

    /**
     * Specialized quest update toast
     */
    showQuestToast(title, progressMessage, isComplete = false) {
        const type = isComplete ? 'success' : 'quest';
        const icon = isComplete ? '✅' : '📜';
        const message = `${icon} ${title}\n${progressMessage}`;
        this.showToast(message, type, 4000);
    }

};

