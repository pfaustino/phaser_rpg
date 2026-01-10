/**
 * ApothecaryUI.js
 * Handles the Apothecary interface for buying potions and crafting items.
 */

window.ApothecaryUI = {
    visible: false,
    panel: null,
    scene: null,

    // Configuration
    stock: [
        { id: 'health_potion', name: 'Health Potion', price: 50, desc: 'Restores 50 HP', image: 'item_consumable' },
        { id: 'mana_potion', name: 'Mana Potion', price: 50, desc: 'Restores 50 Mana', image: 'mana_potion' },
        { id: 'antidote', name: 'Antidote', price: 30, desc: 'Cures poison', image: 'item_consumable' },
        { id: 'elixir_strength', name: 'Elixir of Strength', price: 150, desc: '+5 Atk (Temp)', image: 'item_consumable' }
    ],

    currentTab: 'buy', // 'buy' or 'craft'

    recipes: [
        {
            id: 'greater_health_potion',
            name: 'Greater Health Potion',
            desc: 'Restores 100 HP',
            input: { id: 'health_potion', name: 'Health Potion', quantity: 3 },
            output: { id: 'greater_health_potion', name: 'Greater Health Potion', quantity: 1, healAmount: 100, rarity: 'Uncommon', image: 'item_consumable' }
        },
        {
            id: 'greater_mana_potion',
            name: 'Greater Mana Potion',
            desc: 'Restores 60 Mana',
            input: { id: 'mana_potion', name: 'Mana Potion', quantity: 3 },
            output: { id: 'greater_mana_potion', name: 'Greater Mana Potion', quantity: 1, manaAmount: 60, rarity: 'Uncommon', image: 'mana_potion' }
        }
    ],

    open: function () {
        if (this.visible) return;

        // Close other windows
        if (window.UIManager && typeof window.UIManager.closeAllInterfaces === 'function') {
            window.UIManager.closeAllInterfaces();
        }

        this.visible = true;
        this.scene = window.game.scene.scenes[0];
        this.currentTab = 'buy'; // Default tab

        // Notify game that building UI is open
        if (typeof window.buildingPanelVisible !== 'undefined') {
            window.buildingPanelVisible = true;
        }

        this.createUI();
        if (typeof playSound === 'function') playSound('door_open');
    },

    close: function () {
        if (!this.visible) return;

        this.visible = false;
        if (this.panel) {
            this.destroyUI();
        }

        // Notify game
        if (typeof window.buildingPanelVisible !== 'undefined') {
            window.buildingPanelVisible = false;
        }
    },

    destroyUI: function () {
        if (!this.panel) return;
        try {
            if (this.panel.bg) this.panel.bg.destroy();
            if (this.panel.title) this.panel.title.destroy();
            if (this.panel.closeText) this.panel.closeText.destroy();
            if (this.panel.closeBtn) {
                if (this.panel.closeBtn.bg) this.panel.closeBtn.bg.destroy();
                if (this.panel.closeBtn.symbol) this.panel.closeBtn.symbol.destroy();
            }
            if (this.panel.content) this.panel.content.destroy(); // Container destroys children

            if (this.panel.elements) {
                this.panel.elements.forEach(el => {
                    if (el && typeof el.destroy === 'function') {
                        el.destroy();
                    }
                });
            }
        } catch (err) {
            console.error('ApothecaryUI: Error destroying UI', err);
        }
        this.panel = null;
    },

    createUI: function () {
        const scene = this.scene;
        const width = scene.cameras.main.width;
        const height = scene.cameras.main.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const panelWidth = 700;
        const panelHeight = 500;

        // Background
        const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(1000).setStrokeStyle(3, 0x228822);

        // Title
        const title = scene.add.text(centerX, centerY - panelHeight / 2 + 30, 'The Alchemist\'s Corner', {
            fontSize: '28px', fontFamily: 'serif', fontStyle: 'bold', fill: '#aaffaa'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        // Close Instruction Text
        const closeText = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press ESC to Close', {
            fontSize: '14px', fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(1001).setOrigin(1, 0);

        // Close Button (X)
        const closeBtnSize = 30;
        const closeBtnX = centerX + panelWidth / 2 - 20;
        const closeBtnY = centerY - panelHeight / 2 + 20;

        closeText.setPosition(closeBtnX - 40, closeBtnY + 8);

        const closeBtnBg = scene.add.rectangle(closeBtnX, closeBtnY + 8, closeBtnSize, closeBtnSize, 0xcc0000)
            .setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0xffffff);

        const closeBtnSymbol = scene.add.text(closeBtnX, closeBtnY + 8, 'X', {
            fontSize: '20px', fill: '#ffffff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(1002).setOrigin(0.5);

        const onCloseClick = () => {
            this.close();
            if (typeof playSound === 'function') playSound('ui_click');
        };

        closeBtnBg.on('pointerdown', onCloseClick);
        closeBtnSymbol.on('pointerdown', onCloseClick);
        closeBtnBg.on('pointerover', () => closeBtnBg.setFillStyle(0xff0000));
        closeBtnBg.on('pointerout', () => closeBtnBg.setFillStyle(0xcc0000));

        // Content Container
        const contentContainer = scene.add.container(0, 0).setDepth(1001).setScrollFactor(0);

        this.panel = {
            bg, title, closeText, closeBtn: { bg: closeBtnBg, symbol: closeBtnSymbol },
            content: contentContainer,
            elements: []
        };

        // Render Tabs and Initial Content
        this.renderTabs(centerX, centerY, panelWidth, panelHeight);
        this.refreshContent(centerX, centerY, panelWidth, panelHeight);
    },

    renderTabs: function (x, y, w, h) {
        const scene = this.scene;
        const tabY = y - h / 2 + 70;
        const tabW = 150;
        const tabH = 40;
        const spacing = 20;

        const tabs = [
            { id: 'buy', label: 'Buy Potions' },
            { id: 'craft', label: 'Craft Upgrades' }
        ];

        let startX = x - ((tabs.length * tabW) + ((tabs.length - 1) * spacing)) / 2 + tabW / 2;

        tabs.forEach((tab, index) => {
            const tabX = startX + index * (tabW + spacing);
            const isSelected = this.currentTab === tab.id;
            const color = isSelected ? 0x228822 : 0x333333;

            const btn = scene.add.rectangle(tabX, tabY, tabW, tabH, color)
                .setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, isSelected ? 0xaaffaa : 0x666666);

            const text = scene.add.text(tabX, tabY, tab.label, {
                fontSize: '16px', fill: isSelected ? '#ffffff' : '#aaaaaa', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(1002).setOrigin(0.5);

            btn.on('pointerdown', () => {
                if (this.currentTab !== tab.id) {
                    this.currentTab = tab.id;
                    if (typeof playSound === 'function') playSound('ui_click');
                    // Completely refresh UI elements
                    this.refreshContent(x, y, w, h);
                    // Re-render tabs to update selection state
                    // (Actually we can just update colors here but full refresh is safer for prototype)
                    this.destroyTabs(); // Helper to clear old tabs
                    this.renderTabs(x, y, w, h);
                }
            });

            this.panel.elements.push(btn, text);
            // Tag tabs so we can destroy them separately if needed?
            // For now, destroyUI clears all elements, but switching tabs needs to clear only content.
            // We should separate "Persistent Elements" (Bg, Title) from "Tab Elements"

            // To handle simple redraw, we'll mark these as part of panel.elements.
            // But we need a way to clear just the content area. 
        });
    },

    // Helper to clear existing content elements
    clearContent: function () {
        if (this.panel.elements) {
            this.panel.elements.forEach(el => {
                // Determine if element is tab or content?
                // For simplicity, let's just destroy all and re-create static + content.
                // But efficient way:
                if (el.destroy) el.destroy();
            });
            this.panel.elements = [];
        }
        // Re-add Tabs (Recursion danger if called from renderTabs... wait)
        // Correct approach: renderTabs adds to a specific tracked list OR we just redraw everything.
        // Let's use `this.panel.elements` for EVERYTHING dynamic.
    },

    destroyTabs: function () {
        // Since we are redrawing everything in refreshContent loop conceptually, 
        // actually we should just clear elements.
    },

    refreshContent: function (x, y, w, h) {
        // Clear all dynamic elements (Tabs + Content)
        if (this.panel.elements) {
            this.panel.elements.forEach(el => { if (el.destroy) el.destroy(); });
            this.panel.elements = [];
        }

        // Re-draw Tabs
        this.renderTabs(x, y, w, h);

        // Draw Content based on Tab
        if (this.currentTab === 'buy') {
            this.renderShop(x, y, w, h);
        } else {
            this.renderCrafting(x, y, w, h);
        }
    },

    renderShop: function (x, y, w, h) {
        const startY = y - 50;
        const itemHeight = 60;
        const scene = this.scene;

        this.stock.forEach((item, index) => {
            const itemY = startY + (index * (itemHeight + 10));

            const itemBg = scene.add.rectangle(x, itemY, 500, itemHeight, 0x333333, 0.8)
                .setScrollFactor(0).setDepth(1001).setStrokeStyle(1, 0x666666);

            // Icon
            let iconKey = item.image;
            if (!scene.textures.exists(iconKey)) iconKey = 'item_consumable';
            const icon = scene.add.sprite(x - 220, itemY, iconKey).setScrollFactor(0).setDepth(1002).setScale(1.2);

            if (window.ItemManager) {
                const def = window.ItemManager.getItemDef(item.id);
                if (def && def.uiTint !== undefined) icon.setTint(def.uiTint);
            }

            // Text
            const nameText = scene.add.text(x - 180, itemY - 10, item.name, {
                fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(1002).setOrigin(0, 0.5);

            const descText = scene.add.text(x - 180, itemY + 12, item.desc, {
                fontSize: '14px', fill: '#aaaaaa'
            }).setScrollFactor(0).setDepth(1002).setOrigin(0, 0.5);

            const priceText = scene.add.text(x + 100, itemY, `${item.price} G`, {
                fontSize: '18px', fill: '#ffd700', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(1002).setOrigin(1, 0.5);

            // Buy Button
            const buyBg = scene.add.rectangle(x + 180, itemY, 100, 40, 0x228822)
                .setScrollFactor(0).setDepth(1002).setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, 0x44aa44);

            const buyText = scene.add.text(x + 180, itemY, 'BUY', {
                fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(1003).setOrigin(0.5);

            // Buy Action
            const buyAction = () => {
                const stats = window.GameState.playerStats;
                if (stats.gold >= item.price) {
                    stats.gold -= item.price;
                    this.addItemToInventory(item);
                    if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
                    if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, `Bought ${item.name}`, 0x00ff00);
                    if (typeof playSound === 'function') playSound('coin');
                } else {
                    if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, 'Not Enough Gold', 0xff0000);
                    if (typeof playSound === 'function') playSound('ui_error');
                }
            };

            buyBg.on('pointerdown', buyAction);
            buyText.setInteractive({ useHandCursor: true }).on('pointerdown', buyAction);

            // Hover
            buyBg.on('pointerover', () => buyBg.setFillStyle(0x33aa33));
            buyBg.on('pointerout', () => buyBg.setFillStyle(0x228822));

            this.panel.elements.push(itemBg, icon, nameText, descText, priceText, buyBg, buyText);
        });
    },

    renderCrafting: function (x, y, w, h) {
        const startY = y - 50;
        const itemHeight = 70;
        const scene = this.scene;

        if (this.recipes.length === 0) {
            const noRecipes = scene.add.text(x, y, "No recipes learned yet.", { fontSize: '18px', fill: '#888' }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);
            this.panel.elements.push(noRecipes);
            return;
        }

        this.recipes.forEach((recipe, index) => {
            const itemY = startY + (index * (itemHeight + 10));

            const itemBg = scene.add.rectangle(x, itemY, 550, itemHeight, 0x333333, 0.8)
                .setScrollFactor(0).setDepth(1001).setStrokeStyle(1, 0x666666);

            // Output Icon
            let iconKey = recipe.output.image || 'item_consumable';
            if (!scene.textures.exists(iconKey)) iconKey = 'item_consumable';
            const icon = scene.add.sprite(x - 240, itemY, iconKey).setScrollFactor(0).setDepth(1002).setScale(1.2);

            if (window.ItemManager) {
                const def = window.ItemManager.getItemDef(recipe.output.id);
                if (def && def.uiTint !== undefined) icon.setTint(def.uiTint);
            }

            // Output Name & Desc
            const nameText = scene.add.text(x - 200, itemY - 15, recipe.output.name, {
                fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(1002).setOrigin(0, 0.5);

            const descText = scene.add.text(x - 200, itemY + 10, recipe.desc, {
                fontSize: '12px', fill: '#aaaaaa'
            }).setScrollFactor(0).setDepth(1002).setOrigin(0, 0.5);

            // Required Ingredients
            const requiredText = scene.add.text(x - 200, itemY + 25, `Requires: ${recipe.input.quantity}x ${recipe.input.name}`, {
                fontSize: '12px', fill: '#ffcc00'
            }).setScrollFactor(0).setDepth(1002).setOrigin(0, 0.5);

            // Check Player Inventory
            const playerInv = window.GameState.playerStats.inventory;
            const inputItem = playerInv.find(i => i.id === recipe.input.id || (i.name && i.name === recipe.input.name));
            const playerQty = inputItem ? inputItem.quantity : 0;
            const canCraft = playerQty >= recipe.input.quantity;

            // Craft Button
            const btnColor = canCraft ? 0x228822 : 0x444444;
            const craftBg = scene.add.rectangle(x + 200, itemY, 100, 40, btnColor)
                .setScrollFactor(0).setDepth(1002).setStrokeStyle(1, canCraft ? 0x44aa44 : 0x666666);

            if (canCraft) craftBg.setInteractive({ useHandCursor: true });

            const craftText = scene.add.text(x + 200, itemY, 'CRAFT', {
                fontSize: '16px', fill: canCraft ? '#ffffff' : '#888888', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(1003).setOrigin(0.5);

            // Craft Action
            const craftAction = () => {
                if (!canCraft) return;

                // Remove Inputs
                if (inputItem) {
                    inputItem.quantity -= recipe.input.quantity;
                    if (inputItem.quantity <= 0) {
                        playerInv.splice(playerInv.indexOf(inputItem), 1);
                    }
                }

                // Add Output
                this.addItemToInventory(recipe.output);

                if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
                if (typeof playSound === 'function') playSound('combine'); // Need a sound? 'coin' or 'heal' works
                if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, `Crafted ${recipe.output.name}!`, 0x00ff00);

                // Refresh to update quantities
                this.refreshContent(x, y, w, h);
            };

            if (canCraft) {
                craftBg.on('pointerdown', craftAction);
                craftText.setInteractive({ useHandCursor: true }).on('pointerdown', craftAction);
                craftBg.on('pointerover', () => craftBg.setFillStyle(0x33aa33));
                craftBg.on('pointerout', () => craftBg.setFillStyle(0x228822));
            }

            this.panel.elements.push(itemBg, icon, nameText, descText, requiredText, craftBg, craftText);
        });
    },

    addItemToInventory: function (itemData) {
        const stats = window.GameState.playerStats;
        const newItem = {
            type: 'consumable',
            id: itemData.id,
            name: itemData.name,
            description: itemData.desc || itemData.description,
            quantity: itemData.quantity || 1,
            price: Math.floor((itemData.price || 0) / 2),
            rarity: itemData.rarity || 'Common',
            healAmount: itemData.healAmount || 0,
            manaAmount: itemData.manaAmount || 0,
            stackable: true
        };

        const inv = stats.inventory;
        const existing = inv.find(i => i.id === newItem.id || i.name === newItem.name);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + newItem.quantity;
        } else {
            inv.push(newItem);
        }
    }
};
