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
            elements: []
        };

        let currentY = centerY - 150;
        const spacing = 55;

        // --- Volume Sliders Helper ---
        const createSlider = (y, label, initialValue, onUpdate) => {
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

            track.on('pointerdown', (pointer) => updateSlider(pointer.x));

            scene.input.setDraggable(thumb);
            thumb.on('drag', (pointer) => updateSlider(pointer.x));

            this.settingsPanel.elements.push(labelText, track, thumb);
        };

        // --- Music Slider ---
        const musicVolume = (typeof window.musicVolume !== 'undefined') ? window.musicVolume : 0.5;
        createSlider(currentY, 'Music Volume', musicVolume, (val) => {
            if (typeof window.updateMusicVolume === 'function') {
                window.updateMusicVolume(val);
            }
        });
        currentY += spacing + 20;

        // --- SFX Slider ---
        const sfxVolume = (typeof window.sfxVolume !== 'undefined') ? window.sfxVolume : 0.7;
        createSlider(currentY, 'SFX Volume', sfxVolume, (val) => {
            if (typeof window.updateSFXVolume === 'function') {
                window.updateSFXVolume(val);
            }
        });
        currentY += spacing + 10;

        // --- Difficulty Selector ---
        const diffLabel = scene.add.text(centerX, currentY, 'Difficulty:', {
            fontSize: '18px', fill: '#ffffff'
        }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);
        this.settingsPanel.elements.push(diffLabel);
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

            btn.on('pointerdown', () => {
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
            });

            this.settingsPanel.elements.push(btn, btnText);
        });

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
            if (typeof window.resetGame === 'function') {
                window.resetGame();
            } else if (confirm("Are you sure? This will DELETE your save file!")) {
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
    // INVENTORY UI (DEPRECATED)
    // ============================================
    // NOTE: The standalone Inventory UI has been removed.
    // Use the Equipment panel (E key / D-pad UP) which shows both equipment and inventory.

    // Stubs for backward compatibility (do nothing)
    toggleInventory: function () {
        console.warn('toggleInventory is deprecated. Use toggleEquipment instead.');
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

        if (typeof calculateItemScore === 'function') {
            const score = calculateItemScore(item);
            if (score > 0) tooltipLines.push(`Gear Score: ${score}`);
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
                        console.log('Quest Clicked:', i, quest.title);
                        this.selectedQuestIndex = i;
                        this.updateQuestLogItems();
                    };

                    // Try both pointerdown and pointerup
                    itemBg.on('pointerdown', onClick);
                    itemBg.on('pointerup', onClick);

                    titleText.on('pointerdown', onClick);
                    titleText.on('pointerup', onClick);

                    // Add debug logs directly
                    itemBg.on('pointerdown', () => console.log(`DEBUG: pointerdown on bg ${i}`));
                    titleText.on('pointerdown', () => console.log(`DEBUG: pointerdown on text ${i}`));

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
                        console.log(`[QuestLog] Clicking Accept for quest: ${quest.id}`);
                        if (window.uqe && quest.isUQE) {
                            window.uqe.acceptQuest(quest.id);
                            console.log(`[QuestLog] Quest ${quest.id} accepted via UQE.`);
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

    showTooltip: function (item, x, y, context = 'inventory') {
        if (!window.game || !window.game.scene || !window.game.scene.scenes[0]) return;
        const scene = window.game.scene.scenes[0];

        // Clean up existing tooltip
        this.hideTooltip();

        // Safe check for item
        if (!item) return;

        // Create container
        // Offset slightly to not cover the item entirely or cursor
        const tooltipX = x + 20;
        const tooltipY = y;

        const tooltip = scene.add.container(tooltipX, tooltipY).setDepth(20000).setScrollFactor(0);
        this.currentTooltip = tooltip;

        const rarityColors = {
            'Legendary': 0xffaa00,
            'Epic': 0x9900cc,
            'Rare': 0x0099ff,
            'Common': 0xffffff
        };
        const rarityColor = rarityColors[item.quality] || 0xffffff;
        const rarityHex = '#' + rarityColor.toString(16).padStart(6, '0');

        // Text elements array to calculate height
        const texts = [];
        let currentY = 10;
        const padding = 10;
        const width = 220;

        // 1. Name
        const nameText = scene.add.text(width / 2, currentY, item.name, {
            fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#ffffff',
            wordWrap: { width: width - 20 }
        }).setOrigin(0.5, 0);
        tooltip.add(nameText);
        texts.push(nameText);
        currentY += nameText.height + 5;

        // 2. Gear Score (if applicable) - approximate logic or reading from item? 
        // Item Level is usually a good proxy if GS isn't explicit
        if (item.itemLevel) {
            const gsText = scene.add.text(width / 2, currentY, `Gear Score: ${item.itemLevel * 10 + 50}`, { // Dummy calc to match look
                fontSize: '12px', fontFamily: 'Arial', fill: '#aaaaaa'
            }).setOrigin(0.5, 0);
            tooltip.add(gsText);
            texts.push(gsText);
            currentY += gsText.height + 2;
        }

        // 3. Quality
        const qualityText = scene.add.text(width / 2, currentY, `Quality: ${item.quality}`, {
            fontSize: '12px', fontFamily: 'Arial', fill: rarityHex
        }).setOrigin(0.5, 0);
        tooltip.add(qualityText);
        texts.push(qualityText);
        currentY += qualityText.height + 2;

        // 4. Type
        const typeText = scene.add.text(width / 2, currentY, `Type: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`, {
            fontSize: '12px', fontFamily: 'Arial', fill: '#aaaaaa'
        }).setOrigin(0.5, 0);
        tooltip.add(typeText);
        texts.push(typeText);
        currentY += typeText.height + 8;

        // 5. Stats
        const stats = [
            { label: 'Attack', val: item.attackPower || item.attack, prefix: '+' },
            { label: 'Defense', val: item.defense, prefix: '+' },
            { label: 'Crit', val: item.critChance ? Math.round(item.critChance * 100) + '%' : null, prefix: '+' },
            { label: 'Speed', val: item.speedBonus || item.speed, prefix: '+' },
            { label: 'Health', val: item.maxHp || item.hpBonus, prefix: '+' }, // maxHp on item usually means bonus
            { label: 'Lifesteal', val: item.lifesteal ? Math.round(item.lifesteal * 100) + '%' : null, prefix: '+' }
        ];

        stats.forEach(stat => {
            if (stat.val) {
                const statText = scene.add.text(padding + 10, currentY, `${stat.label}: ${stat.prefix}${stat.val}`, {
                    fontSize: '12px', fontFamily: 'Arial', fill: '#dddddd'
                }).setOrigin(0, 0);
                tooltip.add(statText);
                texts.push(statText);
                currentY += statText.height + 2;
            }
        });

        // 6. Description (if any)
        if (item.description) {
            currentY += 5;
            const descText = scene.add.text(width / 2, currentY, item.description, {
                fontSize: '11px', fontFamily: 'Arial', fill: '#aaaaaa', fontStyle: 'italic',
                wordWrap: { width: width - 20 }, align: 'center'
            }).setOrigin(0.5, 0);
            tooltip.add(descText);
            texts.push(descText);
            currentY += descText.height + 5;
        }

        // 7. Hint
        currentY += 10;
        const hintText = scene.add.text(width / 2, currentY, 'Click to Equip', {
            fontSize: '11px', fontFamily: 'Arial', fill: '#666666'
        }).setOrigin(0.5, 0);
        tooltip.add(hintText);
        texts.push(hintText);
        currentY += hintText.height + 10;

        // Background (created last to know height, but added first via sendToBack... or just insert at 0?)
        // Container add order matters for rendering. We should add bg first.
        // We can use moveDown or just create it first (but we didn't know height).
        // Best: create bg, then add all texts again? Or update bg size.
        // Let's create bg now and send to back.
        const bgHeight = currentY;
        const bg = scene.add.rectangle(width / 2, bgHeight / 2, width, bgHeight, 0x000000, 0.9)
            .setStrokeStyle(2, rarityColor);
        tooltip.add(bg);
        tooltip.sendToBack(bg);

        // Ensure tooltip stays on screen
        const camera = scene.cameras.main;
        if (tooltipX + width / 2 > camera.width) {
            tooltip.x = x - width - 20;
        }
        if (tooltipY + bgHeight / 2 > camera.height) {
            tooltip.y = camera.height - bgHeight / 2 - 10;
        }
        if (tooltip.y - bgHeight / 2 < 0) {
            tooltip.y = bgHeight / 2 + 10;
        }
    },

    showMonsterTooltip: function (monster, x, y) {
        if (!window.game || !window.game.scene || !window.game.scene.scenes[0]) return;
        const scene = window.game.scene.scenes[0];

        // Clean up existing tooltip
        this.hideTooltip();

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
    },

    hideTooltip: function () {
        if (this.currentTooltip) {
            try {
                if (typeof this.currentTooltip.destroy === 'function') {
                    this.currentTooltip.destroy();
                } else if (this.currentTooltip.active) {
                    // Fallback if it's a game object but somehow destroy is missing (unlikely)
                    // or if generic object
                    this.currentTooltip.destroy && this.currentTooltip.destroy();
                }
            } catch (e) {
                console.warn('UIManager: Safe destroy of tooltip failed', e);
            }
            this.currentTooltip = null;
        }
    },

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
            let textColor = '#ffffff';

            if (choice.isQuest) {
                const state = choice.questState || 'available';
                if (state === 'available') {
                    displayText = `(!) ${choice.text}`;
                    textColor = '#ffff00';
                } else if (state === 'active') {
                    displayText = `(?) ${choice.text}`;
                    textColor = '#ffffff';
                } else if (state === 'turnin') {
                    displayText = `(?) ${choice.text}`;
                    textColor = '#ffff00';
                }
            } else if (choice.action === 'unlock_lore' && choice.loreId) {
                // Simple Lore Check
                let isUnlocked = false;
                try {
                    const unlocked = JSON.parse(localStorage.getItem('rpg_unlocked_lore') || '[]');
                    isUnlocked = unlocked.includes(choice.loreId);
                } catch (e) { }
                displayText = isUnlocked ? `✓ ${choice.text}` : `○ ${choice.text}`;
                textColor = isUnlocked ? '#88ff88' : '#9370DB';
            }

            const buttonText = scene.add.text(
                centerX,
                buttonY,
                displayText,
                {
                    fontSize: '16px',
                    fill: textColor
                }
            ).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

            // Button hover effects
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
