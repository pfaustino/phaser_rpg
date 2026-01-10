/**
 * LibraryUI.js
 * Handles the Library interface for reading Lore and learning Spells.
 */

window.LibraryUI = {
    visible: false,
    panel: null,
    scene: null,

    // Configuration
    spells: [
        { id: 'ability2', name: 'Fireball', price: 500, desc: 'Deals massive AoE damage.', image: 'fireball_icon' },
        { id: 'ability3', name: 'Divine Shield', price: 800, desc: 'Provides temporary invulnerability.', image: 'shield_icon' }
    ],

    open: function () {
        if (this.visible) return;

        // Close other windows
        if (window.UIManager && typeof window.UIManager.closeAllInterfaces === 'function') {
            window.UIManager.closeAllInterfaces();
        }

        this.visible = true;
        this.scene = window.game.scene.scenes[0];

        // Notify game
        if (typeof window.buildingPanelVisible !== 'undefined') {
            window.buildingPanelVisible = true;
        }

        this.createUI();
        if (typeof playSound === 'function') playSound('book_open');
    },

    close: function () {
        if (!this.visible) return;
        this.visible = false;
        if (this.panel) this.destroyUI();

        if (typeof window.buildingPanelVisible !== 'undefined') {
            window.buildingPanelVisible = false;
        }
        if (typeof playSound === 'function') playSound('book_close');
    },

    createUI: function () {
        const scene = this.scene;
        const width = scene.cameras.main.width;
        const height = scene.cameras.main.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const panelWidth = 700;
        const panelHeight = 500;

        // Background (Dark Blue/Purple for arcane feel)
        const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a2a, 0.95)
            .setScrollFactor(0).setDepth(1000).setStrokeStyle(3, 0x4444aa);

        // Title
        const title = scene.add.text(centerX, centerY - panelHeight / 2 + 30, 'The Grand Library', {
            fontSize: '28px', fontFamily: 'serif', fontStyle: 'bold', fill: '#aaaaff'
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

        this.panel = {
            bg, title, closeText, closeBtn: { bg: closeBtnBg, symbol: closeBtnSymbol },
            elements: []
        };

        // Render Content
        this.renderContent(centerX, centerY, panelWidth, panelHeight);
    },

    renderContent: function (x, y, w, h) {
        const scene = this.scene;

        // --- Spells Loading Section ---
        const spellsTitle = scene.add.text(x, y - 100, 'Ancient Knowledge (Spells)', {
            fontSize: '22px', fill: '#ccccff'
        }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);
        this.panel.elements.push(spellsTitle);

        const startY = y - 50;

        this.spells.forEach((spell, index) => {
            const itemY = startY + (index * 80);

            // Background
            const itemBg = scene.add.rectangle(x, itemY, 500, 70, 0x2a2a3a, 0.8)
                .setScrollFactor(0).setDepth(1001).setStrokeStyle(1, 0x555588);

            // Icon Placeholder
            const iconKey = (scene.textures.exists(spell.image)) ? spell.image : 'item_consumable';
            const icon = scene.add.sprite(x - 220, itemY, iconKey).setScrollFactor(0).setDepth(1002).setScale(1.2);

            // Info
            const nameText = scene.add.text(x - 180, itemY - 10, spell.name, {
                fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(1002).setOrigin(0, 0.5);

            const descText = scene.add.text(x - 180, itemY + 15, spell.desc, {
                fontSize: '12px', fill: '#aaaaff'
            }).setScrollFactor(0).setDepth(1002).setOrigin(0, 0.5);

            // Buy/Status Button
            const hasSpell = window.playerStats && window.playerStats.unlockedAbilities && window.playerStats.unlockedAbilities.includes(spell.id);
            const canAfford = window.playerStats.gold >= spell.price;

            let btnColor = hasSpell ? 0x444444 : (canAfford ? 0x222288 : 0x442222);
            let btnTextStr = hasSpell ? 'LEARNED' : `${spell.price} G`;

            const buyBg = scene.add.rectangle(x + 180, itemY, 100, 40, btnColor)
                .setScrollFactor(0).setDepth(1002).setStrokeStyle(1, 0x6666aa);

            if (!hasSpell && canAfford) {
                buyBg.setInteractive({ useHandCursor: true });
            }

            const buyText = scene.add.text(x + 180, itemY, btnTextStr, {
                fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(1003).setOrigin(0.5);

            const buyAction = () => {
                if (hasSpell) return;

                if (window.playerStats.gold >= spell.price) {
                    window.playerStats.gold -= spell.price;
                    // Unlock ability logic
                    if (!window.playerStats.unlockedAbilities) window.playerStats.unlockedAbilities = [];
                    window.playerStats.unlockedAbilities.push(spell.id);

                    if (typeof playSound === 'function') playSound('level_up'); // Magic sound
                    if (typeof window.showDamageNumber === 'function') window.showDamageNumber(window.player.x, window.player.y - 40, `Learned ${spell.name}!`, 0xaaaaff);

                    // Refresh UI
                    // Simple quick refresh: close & open (or re-render)
                    this.close();
                    this.open();
                } else {
                    if (typeof playSound === 'function') playSound('ui_error');
                }
            };

            if (!hasSpell && canAfford) {
                buyBg.on('pointerdown', buyAction);
                buyText.setInteractive({ useHandCursor: true }).on('pointerdown', buyAction);
                buyBg.on('pointerover', () => buyBg.setFillStyle(0x3333aa));
                buyBg.on('pointerout', () => buyBg.setFillStyle(0x222288));
            }

            this.panel.elements.push(itemBg, icon, nameText, descText, buyBg, buyText);
        });

        // Lore/Hint at bottom
        const loreHint = scene.add.text(x, y + 150, "Knowledge is Power.", {
            fontSize: '16px', fill: '#6666aa', fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);
        this.panel.elements.push(loreHint);
    },

    destroyUI: function () {
        if (!this.panel) return;
        if (this.panel.bg) this.panel.bg.destroy();
        if (this.panel.title) this.panel.title.destroy();
        if (this.panel.closeText) this.panel.closeText.destroy();
        if (this.panel.closeBtn) {
            if (this.panel.closeBtn.bg) this.panel.closeBtn.bg.destroy();
            if (this.panel.closeBtn.symbol) this.panel.closeBtn.symbol.destroy();
        }
        if (this.panel.content) this.panel.content.destroy(); // Container destroys children

        if (this.panel.elements) {
            this.panel.elements.forEach(el => { if (el.destroy) el.destroy(); });
        }
        this.panel = null;
    }
};
