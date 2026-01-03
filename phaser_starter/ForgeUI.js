/**
 * ForgeUI.js
 * Handles the Blacksmith Forge interface for upgrading gear.
 */

window.ForgeUI = {
    visible: false,
    panel: null,

    // State
    selectedItem: null,
    upgradePreviewItem: null,

    // Configuration
    materials: ['Iron', 'Steel', 'Silver', 'Gold', 'Mithril', 'Dragonbone'],

    toggle: function () {
        if (this.visible) {
            this.close();
        } else {
            this.open();
        }
    },

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

        this.createUI();
    },

    close: function () {
        if (!this.visible) return;

        this.visible = false;
        if (this.panel) {
            this.destroyUI();
        }

        // Listener removal not needed (handled globally)
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

        // Panel Dimensions
        const panelWidth = 700;
        const panelHeight = 500;

        // Background
        const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0)
            .setDepth(1000)
            .setStrokeStyle(4, 0x4a4a4a); // Iron-like border

        // Title
        const title = scene.add.text(centerX, centerY - panelHeight / 2 + 30, 'BLACKSMITH FORGE', {
            fontSize: '28px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            fill: '#e0c0a0'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        // --- Inventory Section (Left) ---
        const listX = centerX - panelWidth / 4 - 20;
        const listY = centerY + 20;
        const listWidth = 280;
        const listHeight = 350;

        const listBg = scene.add.rectangle(listX, listY, listWidth, listHeight, 0x000000, 0.5)
            .setScrollFactor(0).setDepth(1001).setStrokeStyle(1, 0x666666);

        // List Title
        const listTitle = scene.add.text(listX, listY - listHeight / 2 - 20, 'YOUR GEAR', {
            fontSize: '18px', fill: '#aaaaaa'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        // --- Anvil/Upgrade Section (Right) ---
        const anvilX = centerX + panelWidth / 4 + 20;

        // Anvil Slot (Visual only for now, or drop target)
        const slotBg = scene.add.rectangle(anvilX, centerY - 80, 80, 80, 0x222222, 1)
            .setScrollFactor(0).setDepth(1001).setStrokeStyle(2, 0x888888);

        const slotText = scene.add.text(anvilX, centerY - 80, 'SELECT\nITEM', {
            fontSize: '14px', fill: '#555555', align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

        // Info Area
        const infoText = scene.add.text(anvilX, centerY + 20, 'Select an item to upgrade.', {
            fontSize: '16px', fill: '#ffffff', align: 'center', wordWrap: { width: 280 }
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1001);

        // Action Button
        const btnY = centerY + 150;
        const upgradeBtn = scene.add.rectangle(anvilX, btnY, 200, 50, 0x552222)
            .setScrollFactor(0).setDepth(1001).setStrokeStyle(2, 0xaa4444)
            .setInteractive({ useHandCursor: true });

        const btnText = scene.add.text(anvilX, btnY, 'UPGRADE', {
            fontSize: '24px', fontStyle: 'bold', fill: '#884444'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

        // Storage for cleanup
        this.panel = {
            bg, title,
            listBg, listTitle,
            slotBg, slotText,
            infoText,
            upgradeBtn, btnText,
            elements: []
        };

        // Close Button
        const closeBtn = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'X', {
            fontSize: '24px', fill: '#ff4444', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => this.close());
        this.panel.elements.push(closeBtn);

        // Populate List
        this.populateInventoryList(scene, listX, listY, listWidth, listHeight);

        // Upgrade Handler
        upgradeBtn.on('pointerdown', () => {
            if (this.selectedItem) {
                this.performUpgrade();
            }
        });
    },

    destroyUI: function () {
        if (!this.panel) return;

        // Destroy main components
        if (this.panel.bg) this.panel.bg.destroy();
        if (this.panel.title) this.panel.title.destroy();
        if (this.panel.listBg) this.panel.listBg.destroy();
        if (this.panel.listTitle) this.panel.listTitle.destroy();
        if (this.panel.slotBg) this.panel.slotBg.destroy();
        if (this.panel.slotText) this.panel.slotText.destroy();
        if (this.panel.infoText) this.panel.infoText.destroy();
        if (this.panel.upgradeBtn) this.panel.upgradeBtn.destroy();
        if (this.panel.btnText) this.panel.btnText.destroy();

        // Destroy dynamic elements
        if (this.panel.elements) {
            this.panel.elements.forEach(el => {
                if (el && el.destroy) el.destroy();
            });
        }

        this.panel = null;
        this.selectedItem = null;
    },

    populateInventoryList: function (scene, x, y, width, height) {
        // Clear old list items

        // Get Items: Inventory + Equipment
        const inventory = window.GameState.playerStats.inventory || [];
        const equipment = window.GameState.playerStats.equipment || {};

        // Filter for Upgradable Items (Base Types)
        // For now, let's assume anything with a 'tier' or matching material names is upgradable
        // Or simply any Weapon/Armor

        const upgradableTypes = ['weapon', 'armor', 'helmet', 'boots', 'gloves', 'shield'];

        let itemsToShow = [];

        // Add Inventory Items
        inventory.forEach((item, index) => {
            if (item && upgradableTypes.includes(item.type)) {
                itemsToShow.push({ item, source: 'inventory', index });
            }
        });

        // Add Equipment
        Object.entries(equipment).forEach(([slot, item]) => {
            if (item && upgradableTypes.includes(item.type)) {
                itemsToShow.push({ item, source: 'equipment', slot });
            }
        });

        // Render List
        let startY = y - height / 2 + 20;
        const itemHeight = 40;

        itemsToShow.forEach((entry, i) => {
            const itemY = startY + (i * (itemHeight + 5));
            if (itemY > y + height / 2 - 20) return; // Simple clipping

            const isEquipped = entry.source === 'equipment';
            const name = entry.item.name;
            const prefix = isEquipped ? '[E] ' : '';
            const color = isEquipped ? '#aaffaa' : '#ffffff';

            const itemBg = scene.add.rectangle(x, itemY, width - 20, itemHeight, 0x333333, 1)
                .setScrollFactor(0).setDepth(1002).setInteractive({ useHandCursor: true });

            const itemText = scene.add.text(x, itemY, prefix + name, {
                fontSize: '16px', fill: color
            }).setOrigin(0.5).setScrollFactor(0).setDepth(1003);

            // Interaction
            itemBg.on('pointerdown', () => {
                this.selectItem(entry);
                // Highlight selection
                this.panel.elements.forEach(el => {
                    if (el.isItemBg) el.setFillStyle(0x333333);
                });
                itemBg.setFillStyle(0x555522);
            });
            itemBg.isItemBg = true;

            this.panel.elements.push(itemBg, itemText);
        });
    },

    selectItem: function (entry) {
        this.selectedItem = entry;
        const item = entry.item;

        // Calculate Next Tier
        // Todo: Implement real logic. For now, mock it.
        // Assuming Name is "Iron Sword", next is "Steel Sword"

        const currentTier = this.getTierFromItem(item);
        const nextTier = currentTier ? currentTier + 1 : null;
        const nextMaterial = this.materials[nextTier - 1]; // 1-based tier

        // ... Logic to update info panel ...
        if (this.panel && this.panel.infoText) {
            let info = `selected: ${item.name}\n`;
            // Check every conceivable stat property
            const attack = item.attack || item.baseAttack || item.damage || item.attackPower || (item.stats ? item.stats.attack : 0) || 0;
            info += `Attack: ${attack}\n`;

            // Basic Upgrade Logic Mockup
            if (nextMaterial) {
                const cost = this.calculateUpgradeCost(currentTier);
                info += `\nNext: ${nextMaterial} ${item.type}\n`;
                info += `Cost: ${cost} Gold`;

                // Enable Button
                this.panel.upgradeBtn.setFillStyle(0x228822);
                this.panel.btnText.setFill('#aaffaa');
            } else {
                info += `\nMax Level!`;
                this.panel.upgradeBtn.setFillStyle(0x552222);
                this.panel.btnText.setFill('#884444');
            }

            this.panel.infoText.setText(info);
        }
    },

    getTierFromItem: function (item) {
        // Simple string matching for now
        for (let i = 0; i < this.materials.length; i++) {
            if (item.name.includes(this.materials[i])) {
                return i + 1;
            }
        }
        return 1; // Default to Tier 1 if unknown
    },

    performUpgrade: function () {
        if (!this.selectedItem) return;

        const entry = this.selectedItem;
        const item = entry.item;
        const currentTier = this.getTierFromItem(item);
        const nextTier = currentTier + 1;

        if (nextTier > this.materials.length) {
            console.log('Max tier reached');
            return;
        }

        const cost = this.calculateUpgradeCost(currentTier);
        const playerGold = window.GameState.playerStats.gold || 0;

        if (playerGold < cost) {
            console.log('Not enough gold');
            if (this.panel && this.panel.btnText) {
                this.panel.btnText.setText("NEED GOLD");
                setTimeout(() => {
                    if (this.panel && this.panel.btnText) this.panel.btnText.setText("UPGRADE");
                }, 1000);
            }
            return;
        }

        // --- 1. Deduct Cost ---
        window.GameState.playerStats.gold -= cost;
        if (typeof window.updateGoldDisplay === 'function') window.updateGoldDisplay();

        // --- 2. Create Upgraded Item ---
        const nextMaterial = this.materials[nextTier - 1];
        const newName = item.name.replace(this.materials[currentTier - 1], nextMaterial);

        // Clone item
        let newItem = JSON.parse(JSON.stringify(item));
        newItem.name = newName;

        // Recalculate Stats (Simple +20% for now)
        const multiplierIncrease = 1.2;

        if (newItem.attack) newItem.attack = Math.round(newItem.attack * multiplierIncrease);
        if (newItem.baseAttack) newItem.baseAttack = Math.round(newItem.baseAttack * multiplierIncrease);
        if (newItem.damage) newItem.damage = Math.round(newItem.damage * multiplierIncrease);
        if (newItem.attackPower) newItem.attackPower = Math.round(newItem.attackPower * multiplierIncrease);
        if (newItem.defense) newItem.defense = Math.round(newItem.defense * multiplierIncrease);

        // Handle nested stats if they exist
        if (newItem.stats) {
            if (newItem.stats.attack) newItem.stats.attack = Math.round(newItem.stats.attack * multiplierIncrease);
            if (newItem.stats.damage) newItem.stats.damage = Math.round(newItem.stats.damage * multiplierIncrease);
        }

        // --- 3. Replace Item in Inventory/Equipment ---
        if (entry.source === 'inventory') {
            window.GameState.playerStats.inventory[entry.index] = newItem;
        } else if (entry.source === 'equipment') {
            window.GameState.playerStats.equipment[entry.slot] = newItem;
            // Update player stats if equipped
            if (typeof window.calculatePlayerStats === 'function') window.calculatePlayerStats();
        }

        // --- 4. Visual Feedback ---
        if (typeof playSound === 'function') playSound('anvil_strike'); // Need to ensure sound exists or try fallback

        console.log(`Upgraded to ${newItem.name}!`);
        if (window.UIManager && typeof window.UIManager.showToast === 'function') {
            window.UIManager.showToast(`Upgraded: ${newItem.name}`, 2000, 0xaaffaa);
        }

        // Quick Refresh
        this.close();
        this.open();
    },

    calculateUpgradeCost: function (currentTier) {
        // Exponential pricing: 200 * tier^2
        // Tier 1 (Iron->Steel): 200
        // Tier 2 (Steel->Silver): 800
        // Tier 3 (Silver->Gold): 1800
        // Tier 4 (Gold->Mithril): 3200
        return 200 * (currentTier * currentTier);
    }
};
