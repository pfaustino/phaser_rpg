/**
 * TavernUI.js
 * Handles the Tavern interface for buying drinks/food and hearing rumors.
 */

window.TavernUI = {
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
            window.currentBuilding = 'tavern';
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
        // Prevent default browser behavior if needed, though usually fine
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

        const panelWidth = 600;
        const panelHeight = 500;

        // Background panel
        const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0x8B4513);

        // Title
        const title = scene.add.text(centerX, centerY - 200, "The Rusty Tankard", {
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
        const welcomeText = scene.add.text(centerX, centerY - 140, 'Pull up a chair! Best ale in the kingdom.', {
            fontSize: '16px',
            fill: '#cccccc',
            wordWrap: { width: panelWidth - 40 }
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

        // --- Items Section ---
        const items = [
            { name: 'Ale', price: 10, heal: 10, desc: 'Restores 10 HP' },
            { name: 'Stew', price: 25, heal: 30, desc: 'Restores 30 HP' },
            { name: 'Bread', price: 5, heal: 5, desc: 'A simple snack' }
        ];

        const itemButtons = [];
        let startY = centerY - 60;
        const buttonHeight = 60;
        const buttonSpacing = 10;

        items.forEach((item, index) => {
            const btnY = startY + (index * (buttonHeight + buttonSpacing));
            const yOffset = btnY; // For closure capture

            // Button Config
            const btnBg = scene.add.rectangle(centerX, btnY, 400, buttonHeight, 0x333333, 1)
                .setScrollFactor(0).setDepth(401).setStrokeStyle(1, 0x666666);

            // Text
            const nameText = scene.add.text(centerX - 180, btnY, item.name, {
                fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(402).setOrigin(0, 0.5);

            const descText = scene.add.text(centerX - 180, btnY + 15, item.desc, {
                fontSize: '12px', fill: '#aaaaaa'
            }).setScrollFactor(0).setDepth(402).setOrigin(0, 0.5);

            const priceText = scene.add.text(centerX + 80, btnY, `${item.price} G`, {
                fontSize: '16px', fill: '#ffff00'
            }).setScrollFactor(0).setDepth(402).setOrigin(1, 0.5);

            // Buy Button
            const buyBg = scene.add.rectangle(centerX + 150, btnY, 80, 40, 0x228822, 1)
                .setScrollFactor(0).setDepth(402).setInteractive({ useHandCursor: true });

            const buyText = scene.add.text(centerX + 150, btnY, 'BUY', {
                fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(403).setOrigin(0.5, 0.5);

            // Action
            const buyAction = () => {
                const stats = window.GameState.playerStats;
                if (stats.gold >= item.price) {
                    stats.gold -= item.price;

                    // Simple heal immediately (Tavern logic often applies instantly, unlike inventory items)
                    // Or add to inventory? Original code implies buy->consume or buy->inventory?
                    // Original code: createTavernUI.buyAction used buyItem style logic? 
                    // Wait, original Tavern UI in game.js seemed to just show "Bought X!" -> likely minimal implementation
                    // Let's implement adding to inventory if possible, or instant heal if not.
                    // Actually, let's create a consumable item and add it.

                    // Construct new item matching items.json structure
                    const itemId = item.name.toLowerCase(); // 'ale', 'stew', 'bread'
                    const newItem = {
                        type: 'consumable',
                        name: item.name,
                        healAmount: item.heal,
                        description: item.desc,
                        quantity: 1,
                        price: Math.floor(item.price / 2),
                        rarity: 'Common',
                        id: itemId,
                        stackable: true // Explicitly set stackable
                    };

                    // Add to inventory with stacking logic
                    const inventory = window.GameState.playerStats.inventory;
                    let stacked = false;

                    // Check if item is stackable (it is, since we just made it so, but use helper)
                    const isStackable = (window.ItemManager && window.ItemManager.isStackable)
                        ? window.ItemManager.isStackable(newItem)
                        : true;

                    if (isStackable) {
                        const existingItem = inventory.find(i => i.id === newItem.id);
                        if (existingItem) {
                            existingItem.quantity = (existingItem.quantity || 1) + 1;
                            stacked = true;
                            console.log(`Stacked ${newItem.name}, new quantity: ${existingItem.quantity}`);
                        }
                    }

                    if (!stacked) {
                        inventory.push(newItem);
                    }

                    if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
                    if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, `Bought ${item.name}`, 0x00ff00);
                    if (typeof window.addChatMessage === 'function') window.addChatMessage(`Bought ${item.name} for ${item.price} G`, 0x00ff00, '🍺');
                } else {
                    if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, 'Not enough gold!', 0xff0000);
                }
            };

            buyBg.on('pointerdown', buyAction);
            buyText.setInteractive({ useHandCursor: true }).on('pointerdown', buyAction);

            // Hover
            buyBg.on('pointerover', () => buyBg.setFillStyle(0x33aa33, 1));
            buyBg.on('pointerout', () => buyBg.setFillStyle(0x228822, 1));

            itemButtons.push({
                bg: btnBg, name: nameText, desc: descText, price: priceText,
                buyBg, buyText
            });
        });

        // --- Rumors Section ---
        const rumorY = centerY + 160;
        const rumorButtonBg = scene.add.rectangle(centerX, rumorY, 250, 40, 0x4a4a4a, 1)
            .setScrollFactor(0).setDepth(401).setStrokeStyle(1, 0x888888)
            .setInteractive({ useHandCursor: true });

        const rumorButtonText = scene.add.text(centerX, rumorY, 'Listen for Rumors', {
            fontSize: '16px', fill: '#ffffff'
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

        const rumors = [
            'I heard there\'s a powerful weapon hidden in the deepest dungeon...',
            'The monsters have been more aggressive lately. Be careful out there!',
            'Some say there\'s a secret passage behind the blacksmith\'s shop.',
            'A legendary adventurer once lived in this town. Their treasure is still out there somewhere...'
        ];

        const rumorAction = () => {
            const randomRumor = rumors[Math.floor(Math.random() * rumors.length)];
            if (typeof window.addChatMessage === 'function') window.addChatMessage(randomRumor, 0xffff00, '💬');
            if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, 'Hearing rumors...', 0xffff00);
        };

        rumorButtonBg.on('pointerdown', rumorAction);
        rumorButtonText.setInteractive({ useHandCursor: true }).on('pointerdown', rumorAction);

        // Hover
        rumorButtonBg.on('pointerover', () => rumorButtonBg.setFillStyle(0x5a5a5a, 1));
        rumorButtonBg.on('pointerout', () => rumorButtonBg.setFillStyle(0x4a4a4a, 1));

        this.panel = {
            bg, title, closeText, welcomeText,
            itemButtons,
            rumorBtn: { bg: rumorButtonBg, text: rumorButtonText }
        };
    },

    destroyUI: function () {
        if (!this.panel) return;

        if (this.panel.bg) this.panel.bg.destroy();
        if (this.panel.title) this.panel.title.destroy();
        if (this.panel.closeText) this.panel.closeText.destroy();
        if (this.panel.welcomeText) this.panel.welcomeText.destroy();

        if (this.panel.itemButtons) {
            this.panel.itemButtons.forEach(btn => {
                if (btn.bg) btn.bg.destroy();
                if (btn.name) btn.name.destroy();
                if (btn.desc) btn.desc.destroy();
                if (btn.price) btn.price.destroy();
                if (btn.buyBg) btn.buyBg.destroy();
                if (btn.buyText) btn.buyText.destroy();
            });
        }

        if (this.panel.rumorBtn) {
            if (this.panel.rumorBtn.bg) this.panel.rumorBtn.bg.destroy();
            if (this.panel.rumorBtn.text) this.panel.rumorBtn.text.destroy();
        }

        this.panel = null;
    }
};
