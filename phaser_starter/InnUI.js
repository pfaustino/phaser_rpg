/**
 * InnUI.js
 * Handles the Inn interface for resting and saving.
 */

window.InnUI = {
    visible: false,
    panel: null,

    open: function () {
        if (this.visible) return;

        // Close other windows
        if (window.UIManager && typeof window.UIManager.closeAllInterfaces === 'function') {
            window.UIManager.closeAllInterfaces();
        }

        this.visible = true;

        // Notify game that building UI is open
        if (typeof window.buildingPanelVisible !== 'undefined') {
            window.buildingPanelVisible = true;
        }
        if (typeof window.currentBuilding !== 'undefined') {
            window.currentBuilding = 'inn';
        }

        this.createUI();
    },

    close: function () {
        if (!this.visible) return;

        this.visible = false;
        if (this.panel) {
            this.destroyUI();
        }

        // Listener removal not needed (handled globally)

        // Notify game that building UI is closed (maintain compatibility)
        if (typeof window.buildingPanelVisible !== 'undefined') {
            window.buildingPanelVisible = false;
        }
        if (typeof window.currentBuilding !== 'undefined') {
            window.currentBuilding = null;
        }
    },

    handleCloseInput: function (event) {
        // Prevent default browser behavior if needed
        this.close();
        if (event && event.stopImmediatePropagation) {
            event.stopImmediatePropagation();
        }
    },

    createUI: function () {
        const scene = window.game.scene.scenes[0];

        // Keyboard listener removed - handled globally by game.js triggerWorldInteraction

        const width = scene.cameras.main.width;
        const height = scene.cameras.main.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const panelWidth = 500;
        const panelHeight = 400;

        // Background panel
        const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0x8B4513);

        // Title
        const title = scene.add.text(centerX, centerY - 150, "The Cozy Inn", {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

        // Close text
        const closeText = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press F to Close', {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(401).setOrigin(1, 0)
            .setInteractive({ useHandCursor: true });

        closeText.on('pointerdown', () => this.close());

        // Welcome message
        const welcomeText = scene.add.text(centerX, centerY - 80, 'Welcome, traveler! Rest and save your progress.', {
            fontSize: '16px',
            fill: '#cccccc',
            wordWrap: { width: panelWidth - 40 }
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

        // Current stats display
        const playerStats = window.GameState.playerStats;
        const statsText = scene.add.text(centerX, centerY - 20,
            `HP: ${playerStats.hp}/${playerStats.maxHp} | Mana: ${playerStats.mana}/${playerStats.maxMana} | Gold: ${playerStats.gold}`, {
            fontSize: '14px',
            fill: '#ffffff'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

        // Rest button (restore HP/mana for gold)
        const restCost = 50;
        const restButtonBg = scene.add.rectangle(centerX - 100, centerY + 60, 180, 50, 0x4a4a4a, 1)
            .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x8B4513)
            .setInteractive({ useHandCursor: true });

        const restButtonText = scene.add.text(centerX - 100, centerY + 60, `Rest (${restCost} Gold)`, {
            fontSize: '16px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

        // Rest Action
        const restAction = () => {
            const stats = window.GameState.playerStats;
            if (stats.gold >= restCost) {
                if (stats.hp < stats.maxHp || stats.mana < stats.maxMana) {
                    stats.gold -= restCost;
                    stats.hp = stats.maxHp;
                    stats.mana = stats.maxMana;

                    if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();

                    statsText.setText(`HP: ${stats.hp}/${stats.maxHp} | Mana: ${stats.mana}/${stats.maxMana} | Gold: ${stats.gold}`);

                    if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, 'Fully Restored!', 0x00ff00);
                    if (typeof window.addChatMessage === 'function') window.addChatMessage('Restored HP and Mana', 0x00ff00, '💤');
                } else {
                    if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, 'Already at full health!', 0xffff00);
                }
            } else {
                if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, 'Not enough gold!', 0xff0000);
            }
        };

        restButtonBg.on('pointerdown', restAction);
        restButtonText.setInteractive({ useHandCursor: true });
        restButtonText.on('pointerdown', restAction);

        // Hover effects for rest button
        restButtonBg.on('pointerover', () => restButtonBg.setFillStyle(0x5a5a5a, 1));
        restButtonBg.on('pointerout', () => restButtonBg.setFillStyle(0x4a4a4a, 1));

        // Save button
        const saveButtonBg = scene.add.rectangle(centerX + 100, centerY + 60, 180, 50, 0x4a4a4a, 1)
            .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x8B4513)
            .setInteractive({ useHandCursor: true });

        const saveButtonText = scene.add.text(centerX + 100, centerY + 60, 'Save Game', {
            fontSize: '16px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

        // Save Action
        const performSave = () => {
            if (typeof window.saveGame === 'function') {
                window.saveGame();
                if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, 'Game Saved!', 0x00ff00);
                if (typeof window.addChatMessage === 'function') window.addChatMessage('Game saved successfully', 0x00ff00, '💾');
            } else {
                console.error('saveGame function not found!');
            }
        };

        saveButtonBg.on('pointerdown', performSave);
        saveButtonText.setInteractive({ useHandCursor: true });
        saveButtonText.on('pointerdown', performSave);

        // Hover effects for save button
        saveButtonBg.on('pointerover', () => saveButtonBg.setFillStyle(0x5a5a5a, 1));
        saveButtonBg.on('pointerout', () => saveButtonBg.setFillStyle(0x4a4a4a, 1));

        this.panel = {
            bg, title, closeText, welcomeText, statsText,
            buttons: [
                { bg: restButtonBg, text: restButtonText },
                { bg: saveButtonBg, text: saveButtonText }
            ]
        };
    },

    destroyUI: function () {
        if (!this.panel) return;

        if (this.panel.bg) this.panel.bg.destroy();
        if (this.panel.title) this.panel.title.destroy();
        if (this.panel.closeText) this.panel.closeText.destroy();
        if (this.panel.welcomeText) this.panel.welcomeText.destroy();
        if (this.panel.statsText) this.panel.statsText.destroy();

        if (this.panel.buttons) {
            this.panel.buttons.forEach(btn => {
                if (btn.bg) btn.bg.destroy();
                if (btn.text) btn.text.destroy();
            });
        }

        this.panel = null;
    }
};
