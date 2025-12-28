/**
 * UIManager.js
 * Handles all UI-related functionality including Inventory, Quest Log, Settings, and Dialogs.
 * Extracted from game.js to improve code organization.
 */

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
            this.assetsVisible ||
            this.grassDebugVisible ||
            (window.questCompletedModal && window.questCompletedModal.visible) ||
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
        // Add others as they are migrated
    },

    // ============================================
    // SETTINGS UI
    // ============================================

    toggleSettings: function () {
        // If already open, close it
        if (this.settingsVisible) {
            this.settingsVisible = false;
            this.destroySettingsUI();
            return;
        }

        // Close all other interfaces before opening
        this.closeAllInterfaces();

        // Now open settings
        this.settingsVisible = true;
        this.createSettingsUI();
    },

    createSettingsUI: function () {
        const scene = game.scene.scenes[0];
        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 2;
        const panelWidth = 400;
        const panelHeight = 460;

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
            elements: []
        };

        let currentY = centerY - 100;
        const spacing = 60;

        // --- Music Toggle ---
        // Access global musicEnabled if it exists, otherwise assume true
        const musicOn = (typeof window.musicEnabled !== 'undefined') ? window.musicEnabled : true;

        const musicStatus = musicOn ? 'ON' : 'OFF';
        const musicColor = musicOn ? '#00ff00' : '#ff0000';

        const musicBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x333333)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true });

        const musicBtnText = scene.add.text(centerX, currentY, `Music: ${musicStatus}`, {
            fontSize: '20px', fill: musicColor
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        musicBtnBg.on('pointerdown', () => {
            if (typeof window.musicEnabled !== 'undefined') {
                window.musicEnabled = !window.musicEnabled;
                musicBtnText.setText(`Music: ${window.musicEnabled ? 'ON' : 'OFF'}`);
                musicBtnText.setColor(window.musicEnabled ? '#00ff00' : '#ff0000');

                if (typeof toggleMusic === 'function') {
                    toggleMusic(window.musicEnabled);
                } else if (scene.sound) {
                    scene.sound.mute = !window.musicEnabled;
                }
            }
            if (typeof playSound === 'function') playSound('menu_select');
        });

        this.settingsPanel.elements.push(musicBtnBg, musicBtnText);
        currentY += spacing;

        // --- Save Game ---
        const saveBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x004400)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x00ff00);
        const saveBtnText = scene.add.text(centerX, currentY, 'SAVE GAME', {
            fontSize: '20px', fill: '#00ff00', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        saveBtnBg.on('pointerdown', () => {
            if (typeof window.saveGame === 'function') window.saveGame();
            if (typeof playSound === 'function') playSound('menu_select');
        });
        this.settingsPanel.elements.push(saveBtnBg, saveBtnText);
        currentY += spacing;

        // --- Load Game ---
        const loadBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x000044)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x4444ff);
        const loadBtnText = scene.add.text(centerX, currentY, 'LOAD GAME', {
            fontSize: '20px', fill: '#aaaaff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        loadBtnBg.on('pointerdown', () => {
            if (typeof window.loadGame === 'function') {
                this.toggleSettings(); // Close menu
                window.loadGame();
            }
            if (typeof playSound === 'function') playSound('menu_select');
        });
        this.settingsPanel.elements.push(loadBtnBg, loadBtnText);
        currentY += spacing;

        // --- New Game ---
        const newGameBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x330000)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0xff0000);
        const newGameBtnText = scene.add.text(centerX, currentY, 'NEW GAME', {
            fontSize: '20px', fill: '#ff4444', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        newGameBtnBg.on('pointerdown', () => {
            if (confirm("Are you sure? This will DELETE your save file!")) {
                localStorage.clear();
                location.reload();
            }
        });
        this.settingsPanel.elements.push(newGameBtnBg, newGameBtnText);

        // --- Close ---
        const closeBtnBg = scene.add.rectangle(centerX, centerY + panelHeight / 2 - 40, 100, 40, 0x444444)
            .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true });
        const closeText = scene.add.text(centerX, centerY + panelHeight / 2 - 40, 'Close', {
            fontSize: '18px', fill: '#ffffff'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

        closeBtnBg.on('pointerdown', () => {
            this.toggleSettings();
            if (typeof playSound === 'function') playSound('menu_select');
        });
        this.settingsPanel.elements.push(closeBtnBg, closeText);
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

    // ============================================
    // INVENTORY UI
    // ============================================

    toggleInventory: function () {
        // If already open, close it
        if (this.inventoryVisible) {
            this.inventoryVisible = false;
            this.destroyInventoryUI();
            return;
        }

        // Close all other interfaces before opening
        this.closeAllInterfaces();

        // Now open inventory
        this.inventoryVisible = true;
        this.createInventoryUI();
    },

    createInventoryUI: function () {
        const scene = game.scene.scenes[0];
        const panelWidth = 650;
        const panelHeight = 600;
        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 2;

        const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xffffff);

        const title = scene.add.text(centerX, centerY - panelHeight / 2 + 20, 'INVENTORY', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0);

        const closeText = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press I to Close', {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(301).setOrigin(1, 0);

        this.inventoryPanel = {
            bg,
            title,
            closeText,
            items: []
        };

        const inventoryStartY = centerY - panelHeight / 2 + 80;
        const inventoryVisibleHeight = panelHeight - 120;
        const inventoryContainer = scene.add.container(centerX, inventoryStartY);
        inventoryContainer.setScrollFactor(0).setDepth(301);

        const inventoryMask = scene.make.graphics();
        inventoryMask.fillStyle(0xffffff);
        inventoryMask.fillRect(centerX - panelWidth / 2, inventoryStartY, panelWidth, inventoryVisibleHeight);
        inventoryMask.setScrollFactor(0);
        const maskGeometry = inventoryMask.createGeometryMask();
        inventoryContainer.setMask(maskGeometry);

        const scrollbar = this.setupScrollbar({
            scene,
            x: centerX + panelWidth / 2 - 25,
            y: inventoryStartY,
            height: inventoryVisibleHeight,
            depth: 303,
            minScroll: 0,
            initialScroll: 0,
            container: inventoryContainer,
            containerStartY: inventoryStartY,
            containerOffset: 0,
            wheelHitArea: this.inventoryPanel.bg,
            visibleHeight: inventoryVisibleHeight
        });

        this.inventoryPanel.container = inventoryContainer;
        this.inventoryPanel.mask = inventoryMask;
        this.inventoryPanel.maskGeometry = maskGeometry;
        this.inventoryPanel.scrollbar = scrollbar;
        this.inventoryPanel.startY = inventoryStartY;
        this.inventoryPanel.visibleHeight = inventoryVisibleHeight;

        this.updateInventoryItems();
    },

    updateInventoryItems: function () {
        const scene = game.scene.scenes[0];
        if (!this.inventoryPanel) return;

        // Hide tooltip
        this.hideTooltip(true);

        // Clear container
        if (this.inventoryPanel.container) {
            this.inventoryPanel.container.removeAll(true);
        }
        this.inventoryPanel.items = [];

        const slotSize = 60;
        const slotsPerRow = 6;
        const spacing = 30;

        // Calculate grid
        const gridWidth = slotsPerRow * slotSize + (slotsPerRow - 1) * spacing;
        const startX = -gridWidth / 2 + slotSize / 2;
        const startY = 40;

        playerStats.inventory.forEach((item, index) => {
            const row = Math.floor(index / slotsPerRow);
            const col = index % slotsPerRow;
            const x = startX + col * (slotSize + spacing);
            const y = startY + row * (slotSize + spacing);

            let spriteKey = 'item_weapon';
            if (item.type === 'weapon') {
                const weaponType = item.weaponType || 'Sword';
                const weaponKey = `weapon_${weaponType.toLowerCase()}`;
                if (scene.textures.exists(weaponKey)) spriteKey = weaponKey;
            } else if (item.type === 'armor') spriteKey = 'item_armor';
            else if (item.type === 'helmet') spriteKey = 'item_helmet';
            else if (item.type === 'ring') spriteKey = 'item_ring';
            else if (item.type === 'amulet') spriteKey = 'item_amulet';
            else if (item.type === 'boots') spriteKey = 'item_boots';
            else if (item.type === 'gloves') spriteKey = 'item_gloves';
            else if (item.type === 'belt') spriteKey = 'item_belt';
            else if (item.type === 'consumable') spriteKey = (item.name === 'Mana Potion') ? 'mana_potion' : 'item_consumable';
            else if (item.type === 'gold') spriteKey = 'item_gold';
            else if (item.type === 'quest_item') {
                if (item.id === 'crystal_shard') spriteKey = 'item_crystal';
                else if (item.id === 'artifact_fragment') spriteKey = 'item_fragment';
                else spriteKey = 'item_consumable';
            }

            const itemSprite = scene.add.sprite(x, y, spriteKey);
            itemSprite.setScrollFactor(0).setDepth(302).setScale(0.8);

            const qualityColor = window.QUALITY_COLORS ? (window.QUALITY_COLORS[item.quality] || window.QUALITY_COLORS['Common']) : 0xffffff;
            const borderWidth = 2;
            const spriteSize = slotSize * 0.8;
            const borderRect = scene.add.rectangle(x, y, spriteSize + borderWidth * 2, spriteSize + borderWidth * 2, qualityColor, 0)
                .setStrokeStyle(borderWidth, qualityColor)
                .setScrollFactor(0)
                .setDepth(300.5);

            const displayName = (item.quantity && item.quantity > 1) ? `${item.name} x${item.quantity}` : item.name;
            const itemText = scene.add.text(x, y + slotSize / 2 + 5, displayName, {
                fontSize: '10px',
                fill: '#ffffff',
                wordWrap: { width: slotSize }
            }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0);

            itemSprite.setInteractive({ useHandCursor: true });

            const onPointerOver = () => this.showTooltip(item, x, y, 'inventory');
            const onPointerOut = () => this.hideTooltip();

            itemSprite.on('pointerover', onPointerOver);
            itemSprite.on('pointerout', onPointerOut);
            itemSprite._tooltipHandlers = { onPointerOver, onPointerOut };

            const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
            if (equippableTypes.includes(item.type)) {
                itemSprite.on('pointerdown', () => {
                    if (typeof equipItemFromInventory === 'function') equipItemFromInventory(item, index);
                    this.hideTooltip(true);
                });
            } else if (item.type === 'consumable' && item.healAmount) {
                itemSprite.on('pointerdown', () => {
                    if (typeof useConsumable === 'function') useConsumable(item, index);
                    this.hideTooltip(true);
                });
            }

            this.inventoryPanel.container.add([borderRect, itemSprite, itemText]);

            this.inventoryPanel.items.push({
                sprite: itemSprite,
                text: itemText,
                borderRect: borderRect,
                item: item
            });
        });

        // Update scrollbar logic
        const totalRows = Math.ceil(playerStats.inventory.length / slotsPerRow);
        const totalContentHeight = totalRows * (slotSize + spacing) + 20;
        if (this.inventoryPanel.scrollbar) {
            this.inventoryPanel.scrollbar.updateMaxScroll(Math.max(0, totalContentHeight - this.inventoryPanel.visibleHeight), totalContentHeight);
        }

        if (playerStats.inventory.length === 0) {
            const emptyText = scene.add.text(0, 50, 'Inventory is empty\nKill monsters to collect items!', {
                fontSize: '18px',
                fill: '#888888',
                align: 'center',
                fontStyle: 'italic'
            }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0);
            this.inventoryPanel.container.add(emptyText);
            this.inventoryPanel.items.push({ text: emptyText });
        }
    },

    destroyInventoryUI: function () {
        const scene = game.scene.scenes[0];

        this.hideTooltip(true);

        if (this.inventoryPanel) {
            if (this.inventoryPanel.bg) this.inventoryPanel.bg.destroy();
            if (this.inventoryPanel.title) this.inventoryPanel.title.destroy();
            if (this.inventoryPanel.closeText) this.inventoryPanel.closeText.destroy();
            if (this.inventoryPanel.scrollbar) this.inventoryPanel.scrollbar.destroy();
            if (this.inventoryPanel.container) this.inventoryPanel.container.destroy();

            this.inventoryPanel.items = [];
            this.inventoryPanel = null;
        }

        this.inventoryVisible = false;
    },

    // ============================================
    // UTILS (Tooltip & Scrollbar)
    // ============================================

    showTooltip: function (item, x, y, context = 'inventory') {
        const scene = game.scene.scenes[0];
        if (!item) return;

        if (this.tooltipHideTimer) {
            scene.time.removeEvent(this.tooltipHideTimer);
            this.tooltipHideTimer = null;
        }
        this.hideTooltip(true);

        let tooltipLines = [];
        tooltipLines.push(item.name || 'Unknown Item');

        if (item.quality) tooltipLines.push(`Quality: ${item.quality}`);
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

        if (context === 'inventory') {
            const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
            if (equippableTypes.includes(item.type)) {
                tooltipLines.push('');
                tooltipLines.push('Click to Equip');
            } else if (item.type === 'consumable') {
                tooltipLines.push('');
                tooltipLines.push('Click to Use');
            }
        }

        const tooltipText = tooltipLines.join('\n');
        const qualityColor = (window.QUALITY_COLORS && window.QUALITY_COLORS[item.quality]) ? window.QUALITY_COLORS[item.quality] : 0xffffff;

        const text = scene.add.text(0, 0, tooltipText, {
            fontSize: '14px',
            fill: '#ffffff',
            padding: { x: 10, y: 10 },
            wordWrap: { width: 220 }
        }).setScrollFactor(0).setDepth(1001).setOrigin(0);

        const bounds = text.getBounds();
        let tx = x + 20;
        let ty = y + 20;

        if (tx + bounds.width > scene.cameras.main.width) tx = x - bounds.width - 20;
        if (ty + bounds.height > scene.cameras.main.height) ty = y - bounds.height - 20;

        text.setPosition(tx, ty);

        const bg = scene.add.rectangle(tx + bounds.width / 2, ty + bounds.height / 2, bounds.width, bounds.height, 0x000000, 0.9)
            .setScrollFactor(0).setDepth(999).setStrokeStyle(2, qualityColor);

        this.currentTooltip = { text, bg };
    },

    hideTooltip: function (immediate = false) {
        const scene = game.scene.scenes[0];
        const performHide = () => {
            if (this.currentTooltip) {
                if (this.currentTooltip.text) this.currentTooltip.text.destroy();
                if (this.currentTooltip.bg) this.currentTooltip.bg.destroy();
                this.currentTooltip = null;
            }
        };

        if (immediate) {
            performHide();
        } else {
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
        const detailStartY = listStartY;
        const detailWidth = panelWidth - (detailStartX - (centerX - panelWidth / 2)) - 20;

        let quests = [];
        // Retrieve quests based on tab (using UQE or legacy if needed)
        // Note: Accessing uqe from window scope
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
                    .setScrollFactor(0).setDepth(302).setInteractive({ useHandCursor: true });

                const titleText = scene.add.text(10, itemY, quest.title, {
                    fontSize: '16px',
                    fill: isSelected ? '#ffffff' : '#cccccc',
                    fontStyle: 'bold'
                }).setScrollFactor(0).setDepth(302).setOrigin(0, 0.5);

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

                itemBg.on('pointerdown', () => {
                    this.selectedQuestIndex = i;
                    this.updateQuestLogItems();
                });
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
            detailY += 35;

            const detailDesc = scene.add.text(detailStartX, detailY, quest.description, {
                fontSize: '16px', fill: '#cccccc', wordWrap: { width: detailWidth - 20 }
            }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
            this.questPanel.questDetailElements.push(detailDesc);
            detailY += 50;

            if (quest.objectives) {
                const objLabel = scene.add.text(detailStartX, detailY, 'Objectives:', {
                    fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
                }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
                this.questPanel.questDetailElements.push(objLabel);
                detailY += 30;

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
                        fontSize: '14px', fill: obj.completed ? '#00ff00' : '#cccccc'
                    }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
                    this.questPanel.questDetailElements.push(objText);
                    detailY += 25;
                });
                detailY += 15;
            }

            // Rewards
            detailY += 10;
            const rewardsLabel = scene.add.text(detailStartX, detailY, 'Rewards:', {
                fontSize: '18px', fill: '#ffd700', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
            this.questPanel.questDetailElements.push(rewardsLabel);
            detailY += 30;

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
                    .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x00ff00).setInteractive({ useHandCursor: true });
                const acceptBtnText = scene.add.text(detailStartX + (detailWidth - 20) / 2, detailY, 'Accept Quest', {
                    fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
                }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

                const acceptQuest = () => {
                    if (window.uqe && quest.isUQE) {
                        window.uqe.acceptQuest(quest.id);
                    }
                    this.updateQuestLogItems();
                    if (typeof playSound === 'function') playSound('item_pickup');
                };

                acceptBtn.on('pointerdown', acceptQuest);
                acceptBtnText.setInteractive({ useHandCursor: true }).on('pointerdown', acceptQuest);
                this.questPanel.questDetailElements.push(acceptBtn, acceptBtnText);
            }
        }

        this.isUpdatingQuestLog = false;
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
    // DIALOG UI
    // ============================================

    createDialogUI: function (npc) {
        const scene = game.scene.scenes[0];
        const panelWidth = 700;
        const portraitHeight = 150;
        const initialPanelHeight = 350;
        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 2 + 80;

        let portraitImage = null;
        if (npc.portraitKey && scene.textures.exists(npc.portraitKey)) {
            portraitImage = scene.add.image(
                centerX,
                centerY - initialPanelHeight / 2 + portraitHeight / 2 + 10,
                npc.portraitKey
            ).setScrollFactor(0).setDepth(402);

            const originalWidth = portraitImage.width;
            const originalHeight = portraitImage.height;
            const scaleFactor = (panelWidth - 20) / originalWidth;
            portraitImage.setScale(scaleFactor);
            if (portraitImage.displayHeight > portraitHeight) {
                portraitImage.setDisplaySize(panelWidth - 20, portraitHeight);
            }
        }

        this.dialogVisible = true;
        this.dialogPanel = {
            bg: scene.add.rectangle(centerX, centerY, panelWidth, initialPanelHeight, 0x1a1a1a, 0.95)
                .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0xffffff),
            portraitImage: portraitImage,
            portraitHeight: portraitImage ? portraitHeight : 0,
            npcNameText: scene.add.text(
                centerX - panelWidth / 2 + 20,
                centerY - initialPanelHeight / 2 + (portraitImage ? portraitHeight + 15 : 15),
                `${npc.name}${npc.title ? ' - ' + npc.title : ''}`, {
                fontSize: '22px', fill: '#ffd700', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(401).setOrigin(0, 0),
            dialogText: null,
            choiceButtons: [],
            npc: npc
        };
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

        // Count visible choices
        let visibleChoices = 0;
        node.choices.forEach(choice => {
            let result = true;
            if (choice.condition) {
                try {
                    if (typeof choice.condition === 'function') {
                        result = choice.condition(playerStats);
                    } else if (typeof evaluateDialogCondition === 'function') {
                        result = evaluateDialogCondition(choice.condition, playerStats);
                    }
                } catch (e) { console.error(e); }
            }
            if (result) visibleChoices++;
        });

        // Dynamic Height
        const headerHeight = portraitHeight + 50;
        const estHeight = Math.max((node.text.match(/\n/g) || []).length * 24, node.text.length * 0.6);
        const textHeight = Math.max(80, Math.min(600, estHeight));
        const choicesHeight = visibleChoices * (buttonHeight + buttonSpacing) + 20;
        const dynamicPanelHeight = headerHeight + textHeight + choicesHeight + 20;

        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 2 + 50;

        this.dialogPanel.bg.setPosition(centerX, centerY);
        this.dialogPanel.bg.setSize(panelWidth, dynamicPanelHeight);

        if (this.dialogPanel.portraitImage) {
            this.dialogPanel.portraitImage.setPosition(centerX, centerY - dynamicPanelHeight / 2 + portraitHeight / 2 + 10);
        }

        this.dialogPanel.npcNameText.setPosition(
            centerX - panelWidth / 2 + 20,
            centerY - dynamicPanelHeight / 2 + portraitHeight + 15
        );

        const textX = centerX - panelWidth / 2 + 20;
        const textY = centerY - dynamicPanelHeight / 2 + portraitHeight + 45;
        this.dialogPanel.dialogText = scene.add.text(textX, textY, node.text, {
            fontSize: '16px', fill: '#ffffff', wordWrap: { width: panelWidth - 40 }
        }).setScrollFactor(0).setDepth(401).setOrigin(0, 0);

        const startY = centerY - dynamicPanelHeight / 2 + headerHeight + textHeight;
        let visibleChoiceCount = 0;

        node.choices.forEach((choice) => {
            // Re-evaluate condition for display
            if (choice.condition) {
                let result = true;
                if (typeof choice.condition === 'function') {
                    result = choice.condition(playerStats);
                } else if (typeof evaluateDialogCondition === 'function') {
                    result = evaluateDialogCondition(choice.condition, playerStats);
                }
                if (!result) return;
            }

            const buttonY = startY + visibleChoiceCount * (buttonHeight + buttonSpacing);
            visibleChoiceCount++;
            const buttonWidth = panelWidth - 40;

            const buttonBg = scene.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, 0x333333, 0.9)
                .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });

            let displayText = choice.text;
            if (choice.isQuest) displayText = `(!) ${choice.text}`;
            else if (choice.action === 'unlock_lore' && choice.loreId) {
                displayText = `○ ${choice.text}`;
            }

            const buttonText = scene.add.text(centerX, buttonY, displayText, {
                fontSize: '16px', fill: '#ffffff'
            }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

            if (choice.isQuest) buttonText.setFill('#ffff00');

            buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x444444));
            buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x333333));

            buttonBg.on('pointerdown', (pointer) => {
                if (pointer && pointer.event) pointer.event.stopPropagation();

                // Handle actions
                if (choice.action === 'unlock_lore' && choice.loreId) {
                    if (window.loreManager && typeof window.loreManager.unlock === 'function') {
                        window.loreManager.unlock(choice.loreId);
                    }
                }

                if (choice.action === 'open_shop') {
                    if (typeof openShop === 'function') openShop(this.dialogPanel.npc);
                } else if (choice.action === 'choose_class') {
                    if (typeof chooseClass === 'function') chooseClass(choice.className);
                    this.handleDialogNext(choice);
                } else if (choice.action === 'complete_objective') {
                    if (window.uqe && choice.questId && choice.objectiveId) {
                        const quest = window.uqe.activeQuests.find(q => q.id === choice.questId);
                        if (quest) {
                            const obj = quest.objectives.find(o => o.id === choice.objectiveId);
                            if (obj && !obj.isComplete()) {
                                obj.progress = obj.target;
                                obj.completed = true;
                                quest.checkCompletion();
                                window.uqe.update();
                                if (typeof addChatMessage === 'function') addChatMessage(`Objective updated: ${obj.description}`, 0x00ff00);
                            }
                        }
                    }
                    this.handleDialogNext(choice);
                } else if (choice.action === 'complete_quest') {
                    if (window.uqe && choice.questId) {
                        const quest = window.uqe.activeQuests.find(q => q.id === choice.questId);
                        if (quest && quest.canComplete()) {
                            quest.complete();
                            if (typeof addChatMessage === 'function') addChatMessage(`Quest Completed: ${quest.title}`, 0x00ff00);
                            if (typeof playSound === 'function') playSound('quest_complete');
                        }
                    }
                    this.handleDialogNext(choice);
                } else if (['quest_advance', 'quest_accept', 'quest_accept_side', 'quest_accept_v2', 'quest_accept_main'].includes(choice.action)) {
                    const questId = choice.questId;
                    if (questId && window.uqe && window.uqe.allDefinitions[questId]) {
                        const currentNPC = this.dialogPanel.npc;
                        this.closeDialog();
                        if (typeof showQuestPreviewModalEnhanced === 'function') {
                            showQuestPreviewModalEnhanced(questId,
                                () => { // Accept
                                    window.uqe.acceptQuest(questId);
                                    if (typeof updateQuestTrackerHUD === 'function') updateQuestTrackerHUD();
                                    if (currentNPC) setTimeout(() => {
                                        if (typeof startDialog === 'function') startDialog(currentNPC);
                                    }, 50);
                                },
                                () => { // Decline
                                    if (currentNPC) setTimeout(() => {
                                        if (typeof startDialog === 'function') startDialog(currentNPC);
                                    }, 50);
                                }
                            );
                        }
                    } else {
                        this.handleDialogNext(choice);
                    }
                } else if (choice.action === 'accept_all') {
                    if (typeof acceptAllAvailableQuests === 'function') acceptAllAvailableQuests();
                    this.handleDialogNext(choice);
                } else {
                    this.handleDialogNext(choice);
                }
            });

            this.dialogPanel.choiceButtons.push({ bg: buttonBg, text: buttonText, choice });
        });
    },

    handleDialogNext: function (choice) {
        if (choice.next) {
            this.showDialogNode(choice.next);
        } else {
            this.closeDialog();
        }
    },

    showDialogNode: function (nodeId) {
        // Use global currentDialog if available (maintained by game.js startDialog)
        if (typeof currentDialog === 'undefined' || !currentDialog || !currentDialog.nodes[nodeId]) {
            this.closeDialog();
            return;
        }

        // Update global state for compatibility
        if (typeof currentDialogNode !== 'undefined') currentDialogNode = nodeId;

        const node = currentDialog.nodes[nodeId];
        this.updateDialogUI(node);

        // If no choices, auto-close after a moment
        if (node.choices.length === 0) {
            const scene = game.scene.scenes[0];
            scene.time.delayedCall(2000, () => {
                this.closeDialog();
            });
        }
    },

    closeDialog: function () {
        if (this.dialogPanel) {
            if (this.dialogPanel.bg) this.dialogPanel.bg.destroy();
            if (this.dialogPanel.npcNameText) this.dialogPanel.npcNameText.destroy();
            if (this.dialogPanel.dialogText) this.dialogPanel.dialogText.destroy();
            if (this.dialogPanel.portraitImage) this.dialogPanel.portraitImage.destroy();

            this.dialogPanel.choiceButtons.forEach(btn => {
                if (btn.bg) btn.bg.destroy();
                if (btn.text) btn.text.destroy();
            });
            this.dialogPanel = null;
        }

        this.dialogVisible = false;

        // Reset globals if they exist
        if (typeof currentDialog !== 'undefined') currentDialog = null;
        if (typeof currentDialogNode !== 'undefined') currentDialogNode = null;
        if (typeof currentShopNPC !== 'undefined') currentShopNPC = null;
        if (typeof dialogVisible !== 'undefined') dialogVisible = false;

        const scene = game.scene.scenes[0];
        if (scene) scene.lastWindowCloseTime = scene.time.now;
    }
};
