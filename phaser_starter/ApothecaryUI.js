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

    open: function () {
        if (this.visible) return;

        // Close other windows
        if (window.UIManager && typeof window.UIManager.closeAllInterfaces === 'function') {
            window.UIManager.closeAllInterfaces();
        }

        this.visible = true;
        this.scene = window.game.scene.scenes[0];

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
            .setScrollFactor(0).setDepth(1000).setStrokeStyle(3, 0x228822); // Greenish tint for nature/herbs

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

        // Render Shop Items (Default View)
        this.renderShop(centerX, centerY, panelWidth, panelHeight);
    },

    renderShop: function (x, y, w, h) {
        const startY = y - 100;
        const itemHeight = 60;
        const scene = this.scene;

        // Subtitle
        const sub = scene.add.text(x, y - h / 2 + 70, 'Potions & Elixirs', {
            fontSize: '20px', fill: '#88dd88'
        }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);
        this.panel.elements.push(sub);

        this.stock.forEach((item, index) => {
            const itemY = startY + (index * (itemHeight + 10));

            const itemBg = scene.add.rectangle(x, itemY, 500, itemHeight, 0x333333, 0.8)
                .setScrollFactor(0).setDepth(1001).setStrokeStyle(1, 0x666666);

            // Icon
            let iconKey = item.image;
            if (!scene.textures.exists(iconKey)) iconKey = 'item_consumable';
            const icon = scene.add.sprite(x - 220, itemY, iconKey).setScrollFactor(0).setDepth(1002).setScale(1.2);

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

                    // Add to inventory
                    const newItem = {
                        type: 'consumable',
                        id: item.id,
                        name: item.name,
                        description: item.desc,
                        quantity: 1,
                        price: Math.floor(item.price / 2),
                        rarity: 'Common',
                        healAmount: (item.id === 'health_potion') ? 50 : 0,
                        manaAmount: (item.id === 'mana_potion') ? 50 : 0,
                        stackable: true
                    };

                    // Stack logic
                    const inv = stats.inventory;
                    const existing = inv.find(i => i.id === newItem.id);
                    if (existing) {
                        existing.quantity = (existing.quantity || 1) + 1;
                    } else {
                        inv.push(newItem);
                    }

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
    }
};
