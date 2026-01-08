/**
 * HUDManager.js
 * Manages manual UI positioning for Ability bars, Health bars, Potion slots, etc.
 * Works alongside UIManager_v2.js which handles overlay panels (Inventory, Settings, etc.)
 */
window.HUDManager = {
    scene: null,

    // UI Elements References
    abilityBar: null,
    hpBar: null, hpBarBg: null, hpBarText: null,
    manaBar: null, manaBarBg: null, manaBarText: null,
    staminaBar: null, staminaBarBg: null,
    xpBar: null, xpBarBg: null, xpBarText: null,
    goldText: null,
    debugText: null,
    controlsText: null,

    init(scene) {
        this.scene = scene;
        console.log('🖥️ HUDManager initialized');
    },

    /**
     * Create all HUD elements (Stats, Ability Bar, etc.)
     * Called from MainScene.create()
     */
    createHUD() {
        if (!this.scene) return;

        console.log('🖥️ Creating HUD Elements...');
        this.createStatsUI();
        this.createAbilityBar();

        // Initial Update
        this.updateUI();
    },

    /**
     * Create Stats Bars (HP, Mana, Stamina, XP)
     * Extracted from game.js create()
     */
    createStatsUI() {
        const scene = this.scene;
        const barWidth = 200;
        const barHeight = 28;
        const barSpacing = 25;
        const barX = 20;
        let barY = 20;

        // HP Bar
        this.hpBarBg = scene.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
        this.hpBar = scene.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0xff0000)
            .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);

        // HP Text
        this.hpBarText = scene.add.text(barX + barWidth / 2, barY, '', {
            fontSize: '13px', fill: '#ffffff', stroke: '#000000', strokeThickness: 2, fontStyle: 'bold', padding: { x: 0, y: 0 }
        }).setScrollFactor(0).setDepth(102).setOrigin(0.5, 0.5);

        // Mana Bar
        barY += barSpacing + 8;
        this.manaBarBg = scene.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
        this.manaBar = scene.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0x0000ff)
            .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);

        // Mana Text
        this.manaBarText = scene.add.text(barX + barWidth / 2, barY, '', {
            fontSize: '13px', fill: '#ffffff', stroke: '#000000', strokeThickness: 2, fontStyle: 'bold', padding: { x: 0, y: 0 }
        }).setScrollFactor(0).setDepth(102).setOrigin(0.5, 0.5);

        // Stamina Bar
        barY += barSpacing + 8;
        this.staminaBarBg = scene.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
        this.staminaBar = scene.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0x00ff00)
            .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);

        // XP Bar
        barY += barSpacing + 8;
        this.xpBarBg = scene.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
        this.xpBar = scene.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0xb478ff)
            .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);

        // XP Text
        this.xpBarText = scene.add.text(barX + barWidth / 2, barY, '', {
            fontSize: '13px', fill: '#ffffff', stroke: '#000000', strokeThickness: 2, fontStyle: 'bold', padding: { x: 0, y: 0 }
        }).setScrollFactor(0).setDepth(102).setOrigin(0.5, 0.5);

        // Debug & Gold Text
        const startTextY = barY + barSpacing + 15;
        this.debugText = scene.add.text(barX, startTextY, '', {
            fontSize: '14px', fill: '#ffff00', backgroundColor: '#000000', padding: { x: 5, y: 3 }
        }).setScrollFactor(0).setDepth(100);

        this.goldText = scene.add.text(barX, startTextY + 25, 'Gold: 0', {
            fontSize: '16px', fill: '#ffd700', backgroundColor: '#000000', padding: { x: 5, y: 3 }
        }).setScrollFactor(0).setDepth(100);

        // Controls Text
        const shortControlsText = 'H: Help';
        this.controlsText = scene.add.text(barX, startTextY + 50, shortControlsText, {
            fontSize: '14px', fill: '#ffffff', backgroundColor: '#000000', padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(100);

        // Expose globals for legacy compatibility (if needed)
        window.hpBar = this.hpBar;
        window.manaBar = this.manaBar;
        window.staminaBar = this.staminaBar;
        window.xpBar = this.xpBar;
        window.goldText = this.goldText;
        window.hpBarText = this.hpBarText;
        window.manaBarText = this.manaBarText;
        window.xpBarText = this.xpBarText;
    },

    /**
     * Create Ability Bar UI
     * Extracted from game.js
     */
    createAbilityBar() {
        if (!this.scene) return;

        const scene = this.scene;
        const screenWidth = scene.cameras.main.width;
        const screenHeight = scene.cameras.main.height;
        const bottomMargin = 15;
        const abilityBarY = screenHeight - bottomMargin - 30;
        const abilitySpacing = 80;
        const startX = screenWidth / 2 - (Object.keys(ABILITY_DEFINITIONS).length - 1) * abilitySpacing / 2;

        this.abilityBar = {
            buttons: [],
            potionSlots: [],
            cooldownOverlays: []
        };
        // Global alias for compatibility
        window.abilityBar = this.abilityBar;

        let index = 0;
        Object.keys(ABILITY_DEFINITIONS).forEach(abilityId => {
            const ability = ABILITY_DEFINITIONS[abilityId];
            const x = startX + index * abilitySpacing;

            // Button BG
            const buttonBg = scene.add.rectangle(x, abilityBarY, 60, 60, 0x333333, 0.9)
                .setScrollFactor(0).setDepth(200).setStrokeStyle(2, 0x666666)
                .setInteractive({ useHandCursor: true });

            // Tooltip Interactions
            buttonBg.on('pointerover', () => {
                buttonBg.setStrokeStyle(2, 0xffffff);
                if (window.UIManager && window.UIManager.showTooltip) {
                    window.UIManager.showTooltip({
                        type: 'ability', name: ability.name, description: ability.description,
                        manaCost: ability.manaCost, cooldown: ability.cooldown, quality: 'Rare'
                    }, x, abilityBarY - 60, 'ability');
                }
            });
            buttonBg.on('pointerout', () => {
                buttonBg.setStrokeStyle(2, 0x666666);
                if (window.UIManager && window.UIManager.hideTooltip) window.UIManager.hideTooltip();
            });

            // Click Interaction
            buttonBg.on('pointerdown', (pointer, localX, localY, event) => {
                if (event && event.stopPropagation) event.stopPropagation();

                // Find index
                const keys = Object.keys(ABILITY_DEFINITIONS);
                const myIndex = keys.indexOf(abilityId) + 1;

                if (window.useAbility) window.useAbility(myIndex);

                scene.tweens.add({ targets: buttonBg, scale: 0.9, duration: 50, yoyo: true });
            });

            // Icon
            const icon = scene.add.sprite(x, abilityBarY, ability.icon)
                .setScrollFactor(0).setDepth(201).setScale(0.8).setTint(ability.color);

            // Key Text
            const keyText = scene.add.text(x - 20, abilityBarY - 20, (index + 1).toString(), {
                fontSize: '14px', fill: '#ffffff', fontStyle: 'bold', backgroundColor: '#000000', padding: { x: 3, y: 2 }
            }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

            // Cooldown Overlay/Text
            const cooldownOverlay = scene.add.rectangle(x, abilityBarY, 60, 60, 0x000000, 0.7)
                .setScrollFactor(0).setDepth(203).setVisible(false);
            const cooldownText = scene.add.text(x, abilityBarY, '', {
                fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(204).setOrigin(0.5, 0.5).setVisible(false);

            // Mana Text
            const manaText = scene.add.text(x, abilityBarY + 25, `${ability.manaCost} MP`, {
                fontSize: '10px', fill: '#00aaff'
            }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

            this.abilityBar.buttons.push({
                id: abilityId, bg: buttonBg, icon: icon, keyText: keyText,
                cooldownOverlay: cooldownOverlay, cooldownText: cooldownText, manaText: manaText
            });

            index++;
        });

        // Potion Slots Creation (Health: 5, Mana: 6)
        this.createPotionSlot(scene, 'health', 5, 'Health Potion', 0xff4444, startX + index * abilitySpacing + 20, abilityBarY);
        this.createPotionSlot(scene, 'mana', 6, 'Mana Potion', 0x4444ff, startX + index * abilitySpacing + 20 + 80, abilityBarY);

        this.updatePotionSlots();
    },

    createPotionSlot(scene, type, key, itemName, color, x, y) {
        const bg = scene.add.rectangle(x, y, 60, 60, type === 'health' ? 0x442222 : 0x222244, 0.9)
            .setScrollFactor(0).setDepth(200).setStrokeStyle(2, color)
            .setInteractive({ useHandCursor: true });

        // Tooltip
        bg.on('pointerover', () => {
            bg.setStrokeStyle(2, 0xffffff);
            if (window.UIManager && window.UIManager.showTooltip) {
                window.UIManager.showTooltip({
                    type: 'consumable', name: itemName, description: `Restores ${type === 'health' ? 'HP' : 'MP'}. Key: ${key}`, quality: 'Common'
                }, x, y - 60, 'hotbar');
            }
        });
        bg.on('pointerout', () => {
            bg.setStrokeStyle(2, color);
            if (window.UIManager && window.UIManager.hideTooltip) window.UIManager.hideTooltip();
        });

        // Use Logic
        bg.on('pointerdown', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();

            // Find potion
            const potion = playerStats.inventory.find(i => i.name === itemName || (i.name && i.name.toLowerCase().includes(type)));
            if (potion) {
                const idx = playerStats.inventory.indexOf(potion);
                if (window.useItem) window.useItem(idx);
            } else {
                if (window.addChatMessage) window.addChatMessage(`No ${itemName}s!`, color);
            }
            scene.tweens.add({ targets: bg, scale: 0.9, duration: 50, yoyo: true });
        });

        const icon = scene.add.sprite(x, y, type === 'health' ? 'item_consumable' : 'mana_potion')
            .setScrollFactor(0).setDepth(201).setScale(0.8);
        if (type === 'health') icon.setTint(color);

        const keyText = scene.add.text(x - 20, y - 20, key.toString(), {
            fontSize: '14px', fill: '#ffffff', fontStyle: 'bold', backgroundColor: '#000000', padding: { x: 3, y: 2 }
        }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

        const quantityText = scene.add.text(x + 15, y + 20, 'x0', {
            fontSize: '12px', fill: '#ffffff', fontStyle: 'bold', backgroundColor: '#000000', padding: { x: 2, y: 1 }
        }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

        const labelText = scene.add.text(x, y + 35, type === 'health' ? 'HP' : 'MP', {
            fontSize: '10px', fill: color
        }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

        this.abilityBar.potionSlots.push({
            type: type, bg: bg, icon: icon, keyText: keyText, quantityText: quantityText, label: labelText
        });
    },

    /**
     * Update UI Bars (HP, Mana, etc.)
     */
    updateUI() {
        if (!this.hpBar) return;
        try {
            const stats = window.playerStats;
            const maxBarWidth = 200 - 4;

            // HP
            const hpPercent = Math.max(0, Math.min(1, stats.hp / stats.maxHp));
            this.hpBar.width = maxBarWidth * hpPercent;
            if (this.hpBarText) this.hpBarText.setText(`HP: ${Math.ceil(stats.hp)}/${stats.maxHp}`);

            // Mana
            const manaPercent = Math.max(0, Math.min(1, stats.mana / stats.maxMana));
            this.manaBar.width = maxBarWidth * manaPercent;
            if (this.manaBarText) this.manaBarText.setText(`Mana: ${Math.floor(stats.mana)}/${stats.maxMana}`);

            // Stamina
            const staminaPercent = Math.max(0, Math.min(1, stats.stamina / stats.maxStamina));
            this.staminaBar.width = maxBarWidth * staminaPercent;

            // XP
            const nextLevelXP = window.getXPNeededForLevel(stats.level);
            const prevLevelXP = stats.level > 1 ? window.getXPNeededForLevel(stats.level - 1) : 0;
            const xpInLevel = Math.max(0, stats.xp - prevLevelXP);
            const xpReq = nextLevelXP - prevLevelXP;
            this.xpBar.width = maxBarWidth * (xpInLevel / xpReq);
            if (this.xpBarText) this.xpBarText.setText(`Lvl ${stats.level} | XP: ${Math.floor(xpInLevel)}/${xpReq}`);

            // Gold
            if (this.goldText) this.goldText.setText(`Gold: ${stats.gold}`);

            // Debug
            if (window.player && this.debugText && this.scene) {
                const tileX = Math.floor(window.player.x / (this.scene.tileSize || 32));
                const tileY = Math.floor(window.player.y / (this.scene.tileSize || 32));
                this.debugText.setText(`X: ${Math.floor(window.player.x)} Y: ${Math.floor(window.player.y)} | Tile: (${tileX}, ${tileY})`);
            }
        } catch (e) {
            console.error("HUDManager: updateUI Error:", e);
        }
    },

    updatePotionSlots() {
        if (!this.abilityBar || !this.abilityBar.potionSlots) return;

        this.abilityBar.potionSlots.forEach(slot => {
            let count = 0;
            if (slot.type === 'health') {
                const potions = playerStats.inventory.filter(i => i.name === 'Health Potion' || (i.name && i.name.toLowerCase().includes('health')));
                count = potions.reduce((sum, i) => sum + (i.quantity || 1), 0);
            } else if (slot.type === 'mana') {
                const potions = playerStats.inventory.filter(i => i.name === 'Mana Potion' || (i.name && i.name.toLowerCase().includes('mana')));
                count = potions.reduce((sum, i) => sum + (i.quantity || 1), 0);
            }
            slot.quantityText.setText(`x${count}`);

            // Visual disable if 0
            if (count === 0) {
                slot.icon.setTint(0x666666);
                slot.bg.setAlpha(0.5);
            } else {
                slot.icon.clearTint();
                if (slot.type === 'health') slot.icon.setTint(0xff4444);
                slot.bg.setAlpha(0.9);
            }
        });
    },

    updateAbilityCooldowns(time) {
        if (!this.abilityBar) return;

        this.abilityBar.buttons.forEach(button => {
            const abilityState = playerStats.abilities[button.id];
            if (!abilityState) return;

            const ability = ABILITY_DEFINITIONS[button.id];
            const timeSinceLastUse = time - abilityState.lastUsed;
            const remainingCooldown = ability.cooldown - timeSinceLastUse;

            if (remainingCooldown > 0) {
                const seconds = Math.ceil(remainingCooldown / 1000);
                button.cooldownOverlay.setVisible(true);
                button.cooldownText.setText(seconds.toString()).setVisible(true);
                button.icon.setTint(0x666666);
            } else {
                button.cooldownOverlay.setVisible(false);
                button.cooldownText.setVisible(false);

                // Mana Check
                if (playerStats.mana >= ability.manaCost) {
                    button.icon.setTint(ability.color);
                } else {
                    button.icon.setTint(0x666666);
                }
            }
        });
    },

    /**
     * Resize HUD elements
     */
    resize(width, height) {
        if (!this.scene) return;

        // Reposition controls text if needed (was global)
        // Reposition Ability Bar
        if (this.abilityBar && this.abilityBar.buttons) {
            const bottomMargin = 20;
            const abilityBarY = height - bottomMargin - 30;
            const abilitySpacing = 80;
            const numButtons = this.abilityBar.buttons.length;
            const startX = width / 2 - (numButtons - 1) * abilitySpacing / 2;

            this.abilityBar.buttons.forEach((btn, index) => {
                const x = startX + index * abilitySpacing;
                if (btn.bg) btn.bg.setPosition(x, abilityBarY);
                if (btn.icon) btn.icon.setPosition(x, abilityBarY);
                if (btn.keyText) btn.keyText.setPosition(x - 20, abilityBarY - 20);
                if (btn.cooldownOverlay) btn.cooldownOverlay.setPosition(x, abilityBarY);
                if (btn.cooldownText) btn.cooldownText.setPosition(x, abilityBarY);
                if (btn.manaText) btn.manaText.setPosition(x, abilityBarY + 25);
            });

            // Potion Slots
            let potionStartX = startX + numButtons * abilitySpacing + 20;
            this.abilityBar.potionSlots.forEach((slot, index) => {
                const x = potionStartX + index * abilitySpacing;
                if (slot.bg) slot.bg.setPosition(x, abilityBarY);
                if (slot.icon) slot.icon.setPosition(x, abilityBarY);
                if (slot.keyText) slot.keyText.setPosition(x - 20, abilityBarY - 20);
                if (slot.quantityText) slot.quantityText.setPosition(x + 15, abilityBarY + 20);
                if (slot.label) slot.label.setPosition(x, abilityBarY + 35);
            });
        }
    }
};

// Global Aliases mapped to HUDManager
window.createAbilityBar = () => window.HUDManager.createAbilityBar();
window.updateAbilityBar = () => window.HUDManager.updateUI(); // Map to updateUI as in legacy
window.updateAbilityCooldowns = (t) => window.HUDManager.updateAbilityCooldowns(t);
window.updatePotionSlots = () => window.HUDManager.updatePotionSlots();
window.updateUI = () => window.HUDManager.updateUI();
