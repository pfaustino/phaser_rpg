/**
 * ShopManager.js
 * Extracted from game.js
 * Handles the shop UI, buying/selling logic, and inventory interaction within the shop.
 */

window.ShopManager = {
    scene: null,
    shopVisible: false,
    shopPanel: null,
    currentShopNPC: null,

    init(scene) {
        this.scene = scene;
        // Expose legacy globals if needed, or just let them be handled via aliases
    },

    /**
     * Shop inventory (items available for purchase)
     */
    shopInventory: [
        { type: 'weapon', name: 'Iron Sword', quality: 'Common', attackPower: 5, price: 50, itemLevel: 5 },
        { type: 'weapon', name: 'Steel Blade', quality: 'Uncommon', attackPower: 8, price: 100, itemLevel: 10 },
        { type: 'armor', name: 'Leather Armor', quality: 'Common', defense: 3, price: 40, itemLevel: 5 },
        { type: 'armor', name: 'Chain Mail', quality: 'Uncommon', defense: 5, price: 80, itemLevel: 10 },
        { type: 'helmet', name: 'Iron Helmet', quality: 'Common', defense: 2, price: 30, itemLevel: 5 },
        { type: 'helmet', name: 'Steel Helmet', quality: 'Uncommon', defense: 4, price: 60, itemLevel: 10 },
        { type: 'ring', name: 'Bronze Ring', quality: 'Common', attackPower: 1, defense: 1, price: 40, itemLevel: 5 },
        { type: 'ring', name: 'Silver Ring', quality: 'Uncommon', attackPower: 3, defense: 2, price: 80, itemLevel: 10 },
        { type: 'amulet', name: 'Copper Amulet', quality: 'Common', defense: 2, maxHp: 10, price: 50, itemLevel: 5 },
        { type: 'amulet', name: 'Gold Amulet', quality: 'Uncommon', defense: 4, maxHp: 20, price: 100, itemLevel: 10 },
        { type: 'boots', name: 'Leather Boots', quality: 'Common', defense: 1, speed: 5, price: 25, itemLevel: 5 },
        { type: 'boots', name: 'Steel Boots', quality: 'Uncommon', defense: 3, speed: 10, price: 50, itemLevel: 10 },
        { type: 'consumable', name: 'Health Potion', quality: 'Common', healAmount: 50, price: 20 },
        { type: 'consumable', name: 'Mana Potion', quality: 'Common', manaAmount: 30, price: 20 }
    ],

    /**
     * Open shop UI
     */
    openShop(npc) {
        if (!npc || !npc.merchant) return;

        // Close all other interfaces before opening shop
        if (window.UIManager) {
            window.UIManager.closeAllInterfaces();
            window.UIManager.closeDialog();
        }

        this.shopVisible = true;
        if (window.UIManager) window.UIManager.shopVisible = true;
        this.currentShopNPC = npc;
        this.createShopUI(npc);
    },

    /**
     * Create shop UI panel
     */
    createShopUI(npc) {
        const scene = this.scene || window.game.scene.scenes[0];

        // Calculate dimensions
        const gameWidth = scene.scale.width;
        const gameHeight = scene.scale.height;
        const panelWidth = gameWidth / 2;
        const panelHeight = gameHeight;
        const leftPanelX = panelWidth / 2;
        const rightPanelX = panelWidth + panelWidth / 2;
        const centerY = gameHeight / 2;

        // Left panel - Shop Items
        const leftBg = scene.add.rectangle(leftPanelX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0xffffff);

        // Right panel - Player Inventory
        const rightBg = scene.add.rectangle(rightPanelX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0xffffff);

        // Divider
        const dividerGraphics = scene.add.graphics();
        dividerGraphics.lineStyle(2, 0xffffff, 0.5);
        dividerGraphics.lineBetween(panelWidth, 0, panelWidth, gameHeight);
        dividerGraphics.setScrollFactor(0).setDepth(401);

        // --- Right Panel: Player Inventory ---
        const inventoryStartY = 150;
        const inventoryEndY = gameHeight - 20;
        const inventoryVisibleHeight = inventoryEndY - inventoryStartY;
        const inventoryContainerOffset = 60;
        const inventoryContainer = scene.add.container(rightPanelX, inventoryStartY - inventoryContainerOffset);
        inventoryContainer.setScrollFactor(0).setDepth(401);

        const inventoryMaskTopOffset = 30;
        const inventoryMask = scene.make.graphics();
        inventoryMask.fillStyle(0xffffff);
        inventoryMask.fillRect(rightPanelX - panelWidth / 2, inventoryStartY - inventoryMaskTopOffset, panelWidth, inventoryVisibleHeight + inventoryMaskTopOffset);
        inventoryMask.setScrollFactor(0);
        const inventoryMaskGeometry = inventoryMask.createGeometryMask();
        inventoryContainer.setMask(inventoryMaskGeometry);

        // Use UIManager's setupScrollbar wrapper if available
        let inventoryScrollbar;
        if (window.UIManager && typeof window.UIManager.setupScrollbar === 'function') {
            inventoryScrollbar = window.UIManager.setupScrollbar({
                scene,
                x: rightPanelX + panelWidth / 2 - 22,
                y: inventoryStartY,
                height: inventoryVisibleHeight,
                depth: 403,
                minScroll: -30,
                initialScroll: -30,
                container: inventoryContainer,
                containerStartY: inventoryStartY,
                containerOffset: inventoryContainerOffset,
                wheelHitArea: rightBg,
                visibleHeight: inventoryVisibleHeight
            });
        }

        // --- Left Panel: Shop Items ---
        const shopStartY = 100;
        const shopVisibleHeight = gameHeight - 120;
        const shopItemsContainer = scene.add.container(leftPanelX, shopStartY);
        shopItemsContainer.setScrollFactor(0).setDepth(401);

        const shopMask = scene.make.graphics();
        shopMask.fillStyle(0xffffff);
        shopMask.fillRect(leftPanelX - panelWidth / 2, shopStartY, panelWidth, shopVisibleHeight);
        shopMask.setScrollFactor(0);
        const shopMaskGeometry = shopMask.createGeometryMask();
        shopItemsContainer.setMask(shopMaskGeometry);

        let shopItemsScrollbar;
        if (window.UIManager && typeof window.UIManager.setupScrollbar === 'function') {
            shopItemsScrollbar = window.UIManager.setupScrollbar({
                scene,
                x: leftPanelX + panelWidth / 2 - 22,
                y: shopStartY,
                height: shopVisibleHeight,
                depth: 403,
                minScroll: 0,
                initialScroll: 0,
                container: shopItemsContainer,
                containerStartY: shopStartY,
                containerOffset: 0,
                wheelHitArea: leftBg,
                visibleHeight: shopVisibleHeight
            });
        }

        this.shopPanel = {
            leftBg, rightBg, divider: dividerGraphics,
            leftTitle: scene.add.text(leftPanelX, 30, `${npc.name}'s Shop`, {
                fontSize: '24px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(40001).setOrigin(0.5, 0),
            rightTitle: scene.add.text(rightPanelX, 30, 'Your Inventory (Click to Sell)', {
                fontSize: '24px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(40001).setOrigin(0.5, 0),
            closeText: scene.add.text(gameWidth - 20, 20, 'Press ESC to Close', {
                fontSize: '14px', fill: '#aaaaaa'
            }).setScrollFactor(0).setDepth(40001).setOrigin(1, 0),
            closeBtn: null,
            goldText: null,
            items: [],
            inventoryItems: [],
            shopItemsContainer, shopItemsScrollbar,
            inventoryContainer, inventoryScrollbar,
            inventoryVisibleHeight, shopVisibleHeight,
            inventoryContainerOffset,
            minScroll: -30,
            shopMask, inventoryMask,
            currentTab: 'all',
            tabs: []
        };

        this.shopPanel.goldText = scene.add.text(leftPanelX - panelWidth / 2 + 20, 15, `Gold: ${playerStats.gold}`, {
            fontSize: '20px', fill: '#ffd700', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(40001).setOrigin(0, 0);

        // Add Close Button
        const closeBtnSize = 30;
        const closeBtnX = gameWidth - 20;
        const closeBtnY = 50; // Below text

        const closeBtnBg = scene.add.rectangle(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize, 0xcc0000)
            .setScrollFactor(0).setDepth(40001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0xffffff).setOrigin(1, 0);

        const closeBtnSymbol = scene.add.text(closeBtnX - closeBtnSize / 2, closeBtnY + closeBtnSize / 2, 'X', {
            fontSize: '20px', fill: '#ffffff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(40002).setOrigin(0.5);

        const onCloseClick = () => {
            if (typeof playSound === 'function') playSound('ui_click');
            this.closeShop();
        };

        closeBtnBg.on('pointerdown', onCloseClick);
        closeBtnSymbol.on('pointerdown', onCloseClick);

        closeBtnBg.on('pointerover', () => closeBtnBg.setFillStyle(0xff0000));
        closeBtnBg.on('pointerout', () => closeBtnBg.setFillStyle(0xcc0000));

        this.shopPanel.closeBtn = { bg: closeBtnBg, symbol: closeBtnSymbol };

        this.createShopTabs();
        this.updateShopItems();
        this.updateShopInventoryItems();
    },

    /**
     * Create shop tabs
     */
    createShopTabs() {
        const scene = this.scene || window.game.scene.scenes[0];
        if (!this.shopPanel) return;

        // Clear existing
        if (this.shopPanel.tabs) {
            this.shopPanel.tabs.forEach(t => {
                if (t.bg) t.bg.destroy();
                if (t.text) t.text.destroy();
            });
        }
        this.shopPanel.tabs = [];

        const tabs = [
            { id: 'all', label: 'All' },
            { id: 'weapon', label: 'Weapons' },
            { id: 'armor', label: 'Armor' },
            { id: 'accessory', label: 'Access.' },
            { id: 'consumable', label: 'Items' }
        ];

        const panelWidth = this.shopPanel.rightBg.width;
        const rightPanelX = this.shopPanel.rightBg.x;
        const tabWidth = (panelWidth - 20) / tabs.length;
        const tabHeight = 30;
        const tabY = 70;

        const currentTab = this.shopPanel.currentTab || 'all';

        tabs.forEach((tab, index) => {
            const tabX = rightPanelX - panelWidth / 2 + 10 + index * tabWidth + tabWidth / 2;
            const isActive = currentTab === tab.id;
            const tabColor = isActive ? 0x00aaff : 0x333333;
            const tabAlpha = isActive ? 0.8 : 0.6;

            const tabBg = scene.add.rectangle(tabX, tabY, tabWidth - 4, tabHeight, tabColor, tabAlpha)
                .setScrollFactor(0).setDepth(40002).setInteractive({ useHandCursor: true });

            const tabText = scene.add.text(tabX, tabY, tab.label, {
                fontSize: '12px', fill: '#ffffff', fontStyle: isActive ? 'bold' : 'normal'
            }).setScrollFactor(0).setDepth(40003).setOrigin(0.5, 0.5);

            tabBg.on('pointerdown', () => {
                this.shopPanel.currentTab = tab.id;
                this.createShopTabs();
                this.updateShopInventoryItems();
            });

            tabBg.on('pointerover', () => { if (this.shopPanel.currentTab !== tab.id) tabBg.setFillStyle(0x444444); });
            tabBg.on('pointerout', () => { if (this.shopPanel.currentTab !== tab.id) tabBg.setFillStyle(0x333333); });

            this.shopPanel.tabs.push({ bg: tabBg, text: tabText });
        });
    },

    /**
     * Update shop items display
     */
    updateShopItems() {
        const scene = this.scene || window.game.scene.scenes[0];
        if (!this.shopPanel || !this.currentShopNPC) return;

        // Clear existing
        this.shopPanel.items.forEach(item => {
            if (item.bg) item.bg.destroy();
            if (item.sprite) item.sprite.destroy();
            if (item.nameText) item.nameText.destroy();
            if (item.statsText) item.statsText.destroy();
            if (item.priceText) item.priceText.destroy();
            if (item.buyButton) item.buyButton.destroy();
            if (item.buyText) item.buyText.destroy();
            if (item.borderRect) item.borderRect.destroy();
        });
        this.shopPanel.items = [];
        if (this.shopPanel.shopItemsContainer) this.shopPanel.shopItemsContainer.removeAll(true);

        const itemsToDisplay = (this.currentShopNPC.inventory) ? this.currentShopNPC.inventory : this.shopInventory;

        const panelWidth = this.shopPanel.leftBg.width;
        const leftPanelX = this.shopPanel.leftBg.x;
        const startY = 50;
        const itemHeight = 100;
        const spacing = 20;

        if (this.shopPanel.goldText) this.shopPanel.goldText.setText(`Gold: ${playerStats.gold}`);

        itemsToDisplay.forEach((item, index) => {
            const itemY = startY + index * (itemHeight + spacing);
            const itemWidth = panelWidth - 60;
            const x = 0; // Container-relative

            const itemBg = scene.add.rectangle(x, itemY, itemWidth, itemHeight, 0x333333, 0.8)
                .setScrollFactor(0).setDepth(40001).setStrokeStyle(2, 0x666666);

            // Sprite Logic
            let spriteKey = 'item_weapon';
            if (item.type === 'weapon') spriteKey = 'item_weapon';
            else if (item.type === 'armor') spriteKey = 'item_armor';
            else if (item.type === 'helmet') spriteKey = 'item_helmet';
            else if (item.type === 'ring') spriteKey = 'item_ring';
            else if (item.type === 'amulet') spriteKey = 'item_amulet';
            else if (item.type === 'boots') spriteKey = 'item_boots';
            else if (item.type === 'gloves') spriteKey = 'item_gloves';
            else if (item.type === 'belt') spriteKey = 'item_belt';
            else if (item.type === 'consumable') spriteKey = (item.name === 'Mana Potion') ? 'mana_potion' : 'item_consumable';
            else if (item.type === 'quest_item') {
                if (item.id === 'crystal_shard') spriteKey = 'item_crystal';
                else if (item.id === 'artifact_fragment') spriteKey = 'item_fragment';
                else spriteKey = 'item_consumable';
            }

            let finalSpriteKey = spriteKey;
            if (!scene.textures.exists(spriteKey)) {
                // Fallback logic
                const fallbacks = ['item_weapon', 'item_armor', 'item_consumable'];
                for (const fb of fallbacks) if (scene.textures.exists(fb)) { finalSpriteKey = fb; break; }
            }

            let itemSprite, borderRect;
            try {
                itemSprite = scene.add.sprite(x - itemWidth / 2 + 30, itemY, finalSpriteKey)
                    .setScrollFactor(0).setDepth(40002).setScale(1.2);

                // Potion Visuals
                const lookupId = item.id || (item.name === 'Health Potion' ? 'health_potion' :
                    item.name === 'Mana Potion' ? 'mana_potion' : null);

                if (window.ItemManager && lookupId) {
                    const def = window.ItemManager.getItemDef(lookupId);
                    if (def && def.uiTint !== undefined) {
                        itemSprite.setTint(def.uiTint);
                    }
                }

                const customImageKeys = ['item_weapon', 'item_armor', 'item_helmet', 'item_amulet', 'item_boots', 'item_ring', 'item_consumable'];
                if (!customImageKeys.includes(finalSpriteKey) || finalSpriteKey !== spriteKey) {
                    const qColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
                    itemSprite.setTint(qColor);
                }

                const qColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
                borderRect = scene.add.rectangle(x - itemWidth / 2 + 30, itemY, 32 * 1.2 + 6, 32 * 1.2 + 6, qColor, 0)
                    .setStrokeStyle(3, qColor).setScrollFactor(0).setDepth(40001);
            } catch (e) {
                itemSprite = scene.add.rectangle(x - itemWidth / 2 + 30, itemY, 32, 32, 0x888888).setScrollFactor(0).setDepth(40002);
            }

            // Text
            const nameText = scene.add.text(x - itemWidth / 2 + 80, itemY - 15, item.name, {
                fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(40002).setOrigin(0, 0.5);

            let stats = [];
            if (item.attackPower) stats.push(`Atk: +${item.attackPower}`);
            if (item.defense) stats.push(`Def: +${item.defense}`);
            if (item.maxHp) stats.push(`HP: +${item.maxHp}`);
            if (item.speed) stats.push(`Spd: +${item.speed}`);
            if (item.healAmount) stats.push(`Heal: ${item.healAmount}`);
            const statsText = scene.add.text(x - itemWidth / 2 + 80, itemY + 15, stats.join(' | '), {
                fontSize: '14px', fill: '#cccccc'
            }).setScrollFactor(0).setDepth(40002).setOrigin(0, 0.5);

            const priceText = scene.add.text(x + itemWidth / 2 - 140, itemY, `${item.price} G`, {
                fontSize: '18px', fill: '#ffd700', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(40002).setOrigin(0.5, 0.5);

            // Buy Config
            const buyButton = scene.add.rectangle(x + itemWidth / 2 - 60, itemY, 80, 40, 0x00aa00, 0.9)
                .setScrollFactor(0).setDepth(40001).setStrokeStyle(2, 0x00ff00).setInteractive({ useHandCursor: true });
            const buyText = scene.add.text(x + itemWidth / 2 - 60, itemY, 'Buy', {
                fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(40002).setOrigin(0.5, 0.5);

            buyButton.on('pointerover', () => buyButton.setFillStyle(0x00cc00));
            buyButton.on('pointerout', () => buyButton.setFillStyle(0x00aa00));
            buyButton.on('pointerdown', () => this.buyItem(item, item.price));

            // Tooltip events
            const onHover = () => { if (window.showTooltip) showTooltip(item, leftPanelX, this.shopPanel.shopItemsContainer.y + itemY, 'shop_buy'); };
            const onOut = () => { if (window.hideTooltip) hideTooltip(); };

            [itemBg, itemSprite, borderRect].forEach(el => {
                if (el) {
                    el.setInteractive({ useHandCursor: true });
                    el.on('pointerover', onHover);
                    el.on('pointerout', onOut);
                }
            });

            this.shopPanel.shopItemsContainer.add([itemBg, itemSprite, borderRect, nameText, statsText, priceText, buyButton, buyText]);

            this.shopPanel.items.push({
                bg: itemBg, sprite: itemSprite, nameText, statsText, priceText, buyButton, buyText, borderRect
            });
        });

        const totalHeight = itemsToDisplay.length * (itemHeight + spacing) + startY;
        if (this.shopPanel.shopItemsScrollbar) {
            this.shopPanel.shopItemsScrollbar.updateMaxScroll(Math.max(0, totalHeight - this.shopPanel.shopVisibleHeight), totalHeight);
        }
    },

    /**
     * Buy item logic
     */
    buyItem(item, price) {
        if (playerStats.gold < price) {
            if (window.showDamageNumber) showDamageNumber(window.player.x, window.player.y - 40, 'Not enough gold!', 0xff0000);
            return;
        }

        if (window.hideTooltip) hideTooltip(true);

        // Stacking logic
        let stacked = false;
        const isShard = (item.type === 'quest_item' && item.id && item.id.includes('shard'));
        if ((item.type === 'consumable' || isShard)) {
            const existing = playerStats.inventory.find(i => i.type === item.type && i.name === item.name);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + 1;
                stacked = true;
            }
        }

        if (!stacked) {
            if (playerStats.inventory.length >= 30) {
                if (window.showDamageNumber) showDamageNumber(window.player.x, window.player.y - 40, 'Inventory full!', 0xff0000);
                return;
            }
            playerStats.inventory.push({
                ...item,
                id: isShard ? item.id : `shop_${Date.now()}_${Math.random()}`,
                quantity: (item.type === 'consumable' || isShard) ? 1 : undefined
            });
        }

        playerStats.gold -= price;
        if (this.shopPanel.goldText) this.shopPanel.goldText.setText(`Gold: ${playerStats.gold}`);

        if (window.showDamageNumber) showDamageNumber(window.player.x, window.player.y - 40, `Bought ${item.name}!`, 0x00ff00);

        this.updateShopItems();
        this.updateShopInventoryItems();

        // External updates
        if (typeof updatePotionSlots === 'function') updatePotionSlots();
        if (window.refreshInventory) window.refreshInventory();
        if (window.SaveManager) SaveManager.saveGame(SaveManager.currentSlot, true);
    },

    /**
     * Update player inventory panel in shop
     */
    updateShopInventoryItems() {
        const scene = this.scene || window.game.scene.scenes[0];
        if (!this.shopPanel) return;

        // Clear existing
        this.shopPanel.inventoryItems.forEach(item => {
            if (item.bg) item.bg.destroy();
            if (item.sprite) item.sprite.destroy();
            if (item.nameText) item.nameText.destroy();
            if (item.priceText) item.priceText.destroy();
            if (item.borderRect) item.borderRect.destroy();
        });
        this.shopPanel.inventoryItems = [];
        if (this.shopPanel.inventoryContainer) this.shopPanel.inventoryContainer.removeAll(true);

        const currentTab = this.shopPanel.currentTab || 'all';
        const inventoryItems = playerStats.inventory.filter(item => {
            if (currentTab === 'all') return true;
            if (currentTab === 'weapon') return item.type === 'weapon';
            if (currentTab === 'armor') return ['armor', 'helmet', 'boots', 'gloves', 'belt'].includes(item.type);
            if (currentTab === 'accessory') return ['ring', 'amulet'].includes(item.type);
            if (currentTab === 'consumable') return ['consumable', 'quest_item'].includes(item.type);
            return true;
        });

        // Sort (reuse logic if possible, or simple sort)
        inventoryItems.sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return (b.quality === 'Legendary' ? 4 : 0) - (a.quality === 'Legendary' ? 4 : 0);
        });

        const rightPanelX = this.shopPanel.rightBg.x;
        const itemSize = 60;
        const spacing = 15;
        const itemsPerRow = 6;
        const gridWidth = itemsPerRow * itemSize + (itemsPerRow - 1) * spacing;
        const startX = -gridWidth / 2 + itemSize / 2;
        const startY = 45;

        // Positioning Logic (Grid)
        // Similar to game.js but adapted
        const rowHeights = {};
        const itemData = [];

        inventoryItems.forEach((item, index) => {
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = startX + col * (itemSize + spacing);

            // Calc height
            // Sprite(60) + Name(variable) + Price(15) + Spacing
            // Bump estimated height to account for multiline names
            const totalH = itemSize + 45; // Increased from 40
            rowHeights[row] = Math.max(rowHeights[row] || 0, totalH);

            itemData.push({ item, row, col, x });
        });

        let currentY = startY;
        const rowY = {};
        for (let r in rowHeights) {
            rowY[r] = currentY;
            currentY += rowHeights[r] + spacing;
        }

        itemData.forEach(data => {
            const { item, row, x } = data;
            const y = rowY[row];

            const qColor = (window.QUALITY_COLORS && window.QUALITY_COLORS[item.quality]) ? window.QUALITY_COLORS[item.quality] : 0x9d9d9d;

            const itemBg = scene.add.rectangle(x, y, itemSize, itemSize, 0x222222, 0.8)
                .setScrollFactor(0).setDepth(40000).setStrokeStyle(2, qColor);

            let spriteKey = (typeof ItemManager !== 'undefined') ? ItemManager.getSpriteKey(item) : 'item_weapon';
            let itemSprite;
            try {
                itemSprite = scene.add.sprite(x, y, spriteKey).setScrollFactor(0).setDepth(40002).setScale(0.8);

                // Potion Visuals
                const lookupId = item.id || (item.name === 'Health Potion' ? 'health_potion' :
                    item.name === 'Mana Potion' ? 'mana_potion' :
                        item.name === 'Greater Health Potion' ? 'greater_health_potion' :
                            item.name === 'Greater Mana Potion' ? 'greater_mana_potion' : null);

                if (window.ItemManager && lookupId) {
                    const def = window.ItemManager.getItemDef(lookupId);
                    if (def) {
                        if (def.uiTint !== undefined) itemSprite.setTint(def.uiTint);
                        if (def.uiScale !== undefined) itemSprite.setScale(def.uiScale);
                    }
                }
            } catch (e) {
                itemSprite = scene.add.rectangle(x, y, 32, 32, 0xff00ff).setScrollFactor(0).setDepth(40002);
            }

            const displayName = (item.quantity && item.quantity > 1) ? `${item.name} x${item.quantity}` : item.name;
            const nameText = scene.add.text(x, y + itemSize / 2 + 5, displayName, {
                fontSize: '11px', fill: '#ffffff', wordWrap: { width: itemSize + 10 }
            }).setScrollFactor(0).setDepth(40002).setOrigin(0.5, 0);

            const sellPrice = this.calculateItemSellPrice(item);
            // Dynamic positioning for price to avoid overlap
            const priceY = nameText.y + nameText.displayHeight + 2;
            const priceText = scene.add.text(x, priceY, `${sellPrice}G`, {
                fontSize: '10px', fill: '#ffd700'
            }).setScrollFactor(0).setDepth(40002).setOrigin(0.5, 0);

            // Sell Handler
            const sellItem = () => {
                const idx = playerStats.inventory.indexOf(item);
                if (idx > -1) {
                    if (item.quantity > 1) item.quantity--;
                    else playerStats.inventory.splice(idx, 1);

                    playerStats.gold += sellPrice;
                    if (window.showDamageNumber) showDamageNumber(window.player.x, window.player.y - 40, `Sold +${sellPrice}G`, 0x00ff00);

                    this.updateShopItems();
                    this.updateShopInventoryItems();
                    if (window.SaveManager) SaveManager.saveGame(SaveManager.currentSlot, true);
                }
            };

            [itemBg, itemSprite].forEach(el => {
                el.setInteractive({ useHandCursor: true });
                el.on('pointerdown', sellItem);
                // Hover tooltips
                el.on('pointerover', () => { if (window.showTooltip) showTooltip(item, rightPanelX + x, this.shopPanel.inventoryContainer.y + y, 'shop_sell'); });
                el.on('pointerout', () => { if (window.hideTooltip) hideTooltip(); });
            });

            this.shopPanel.inventoryContainer.add([itemBg, itemSprite, nameText, priceText]);
            this.shopPanel.inventoryItems.push({ bg: itemBg, sprite: itemSprite, nameText, priceText });
        });

        const totalH = currentY;
        if (this.shopPanel.inventoryScrollbar) {
            this.shopPanel.inventoryScrollbar.updateMaxScroll(Math.max(0, totalH - this.shopPanel.inventoryVisibleHeight), totalH);
        }
    },

    calculateItemSellPrice(item) {
        const qualityMultiplier = { 'Common': 10, 'Uncommon': 25, 'Rare': 50, 'Epic': 100, 'Legendary': 200 };
        let base = qualityMultiplier[item.quality] || 10;
        if (item.attackPower) base += item.attackPower * 2;
        if (item.defense) base += item.defense * 2;
        if (item.maxHp) base += item.maxHp;
        if (item.speed) base += item.speed * 3;
        if (item.healAmount) base += item.healAmount;
        return Math.floor(base * 0.5);
    },

    closeShop() {
        if (window.hideTooltip) hideTooltip(true);

        if (this.shopPanel) {
            // Destroy everything
            const sp = this.shopPanel;
            if (sp.leftBg) sp.leftBg.destroy();
            if (sp.rightBg) sp.rightBg.destroy();
            if (sp.divider) sp.divider.destroy();
            if (sp.leftTitle) sp.leftTitle.destroy();
            if (sp.rightTitle) sp.rightTitle.destroy();
            if (sp.closeText) sp.closeText.destroy();
            if (sp.closeBtn) {
                if (sp.closeBtn.bg) sp.closeBtn.bg.destroy();
                if (sp.closeBtn.symbol) sp.closeBtn.symbol.destroy();
            }
            if (sp.goldText) sp.goldText.destroy();
            if (sp.shopMask) sp.shopMask.destroy();
            if (sp.inventoryMask) sp.inventoryMask.destroy();
            if (sp.shopItemsContainer) sp.shopItemsContainer.destroy();
            if (sp.inventoryContainer) sp.inventoryContainer.destroy();
            if (sp.shopItemsScrollbar) sp.shopItemsScrollbar.destroy();
            if (sp.inventoryScrollbar) sp.inventoryScrollbar.destroy();

            // Items
            if (sp.items) sp.items.forEach(i => { if (i.bg) i.bg.destroy(); }); // basics, container handles rest usually but safe to iterate
            if (sp.inventoryItems) sp.inventoryItems.forEach(i => { if (i.bg) i.bg.destroy(); });

            if (sp.tabs) sp.tabs.forEach(t => { if (t.bg) t.bg.destroy(); if (t.text) t.text.destroy(); });

            this.shopPanel = null;
        }

        if (window.clearMenuSelection) window.clearMenuSelection();

        this.shopVisible = false;
        if (window.UIManager) window.UIManager.shopVisible = false;
        this.currentShopNPC = null;
        debugLog('🛒 Shop closed (ShopManager)');
    }
};

// Global Aliases for Backward Compatibility
window.openShop = (npc) => window.ShopManager.openShop(npc);
window.closeShop = () => window.ShopManager.closeShop();
