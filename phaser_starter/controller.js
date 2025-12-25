/**
 * Controller Module - Gamepad/Controller Support
 * 
 * Provides gamepad input handling for Xbox, PlayStation, and generic controllers.
 * Button mappings are loaded from controller.json for easy customization.
 */

// Controller state
let controllerConfig = null;
let gamepadConnected = false;
let activeGamepad = null;
let lastButtonStates = {};
let controllerScene = null;

// Menu navigation state
let menuSelectionIndex = 0;
let menuItemsPerRow = 6;
let menuTotalItems = 0;
let menuSelectionCursor = null;
let currentMenuItems = [];

// Virtual Cursor state
let virtualCursor = null;
let virtualCursorSpeed = 600; // Pixels per second
let cursorVisible = false;

/**
 * Load controller configuration from controller.json
 */
async function loadControllerConfig() {
    try {
        const response = await fetch('controller.json');
        controllerConfig = await response.json();
        console.log('🎮 Controller config loaded:', controllerConfig);
        return controllerConfig;
    } catch (error) {
        console.error('Failed to load controller.json:', error);
        // Use defaults
        controllerConfig = {
            deadzone: 0.3,
            buttons: {
                A: 0, B: 1, X: 2, Y: 3,
                LB: 4, RB: 5, LT: 6, RT: 7,
                SELECT: 8, START: 9,
                L3: 10, R3: 11,
                DPAD_UP: 12, DPAD_DOWN: 13,
                DPAD_LEFT: 14, DPAD_RIGHT: 15
            },
            actions: {
                attack: 'A', cancel: 'B', ability1: 'X', ability2: 'Y',
                healthPotion: 'LB', manaPotion: 'RB', menu: 'START', interact: 'A'
            }
        };
        return controllerConfig;
    }
}

/**
 * Get button index for an action
 */
function getButtonForAction(action) {
    if (!controllerConfig) return -1;
    const buttonName = controllerConfig.actions[action];
    return controllerConfig.buttons[buttonName] ?? -1;
}

/**
 * Initialize controller support
 * @param {Phaser.Scene} scene - The game scene
 */
function initController(scene) {
    controllerScene = scene;

    // Create virtual cursor (initially hidden)
    if (!virtualCursor) {
        virtualCursor = scene.add.circle(0, 0, 5, 0xffff00)
            .setStrokeStyle(2, 0x000000)
            .setDepth(10000) // Ensure it's on top of everything
            .setVisible(false)
            .setScrollFactor(0); // UI element

        console.log('🎮 Virtual cursor created');
    }

    // Listen for gamepad connection
    scene.input.gamepad.on('connected', (pad) => {
        console.log('🎮 Controller connected:', pad.id);
        gamepadConnected = true;
        activeGamepad = pad;
        if (typeof addChatMessage === 'function') {
            addChatMessage('Controller connected!', 0x00ff00, '🎮');
        }
    });

    scene.input.gamepad.on('disconnected', (pad) => {
        console.log('🎮 Controller disconnected');
        gamepadConnected = false;
        activeGamepad = null;
        lastButtonStates = {};
        if (typeof addChatMessage === 'function') {
            addChatMessage('Controller disconnected', 0xff6666, '🎮');
        }
    });

    // Also check for already connected gamepads
    if (scene.input.gamepad.total > 0) {
        activeGamepad = scene.input.gamepad.pad1;
        if (activeGamepad) {
            gamepadConnected = true;
            console.log('🎮 Controller already connected:', activeGamepad.id);
        }
    }

    // Set up ESC key handler for menu action
    scene.input.keyboard.on('keydown-ESC', () => {
        onControllerMenu();
    });

    console.log('🎮 Controller system initialized');
}

/**
 * Check if controller is connected
 */
function isControllerConnected() {
    return gamepadConnected && activeGamepad !== null;
}

// Track which buttons were just pressed this frame (computed once per frame)
let justPressedThisFrame = {};

/**
 * Update all button states at the start of each frame
 * Call this once per frame before checking any buttons
 */
function updateButtonStates() {
    if (!activeGamepad || !controllerConfig) return;

    justPressedThisFrame = {};

    // Check all buttons
    for (const [name, index] of Object.entries(controllerConfig.buttons)) {
        const pressed = activeGamepad.buttons[index]?.pressed || false;
        const wasPressed = lastButtonStates[index] || false;

        // Store if this button was just pressed
        justPressedThisFrame[index] = pressed && !wasPressed;

        // Update state for next frame
        lastButtonStates[index] = pressed;
    }
}

/**
 * Check if button was just pressed (call after updateButtonStates)
 */
function isButtonJustPressed(buttonIndex) {
    if (buttonIndex < 0) return false;
    return justPressedThisFrame[buttonIndex] || false;
}

/**
 * Check if an action button was just pressed
 */
function isActionJustPressed(action) {
    const buttonIndex = getButtonForAction(action);
    return isButtonJustPressed(buttonIndex);
}

/**
 * Handle all gamepad input - call this from update()
 */
let debugCounter = 0;
function handleGamepadInput() {
    if (!gamepadConnected || !activeGamepad || !controllerConfig) return;

    // Update all button states once at the start of the frame
    updateButtonStates();

    const pad = activeGamepad;
    const deadzone = controllerConfig.deadzone || 0.3;

    // Debug: log gamepad state every 60 frames (about once per second)
    debugCounter++;
    if (debugCounter % 60 === 0) {
        // Get axis values safely
        let axisX = 0, axisY = 0;
        if (pad.axes && pad.axes.length >= 2) {
            axisX = typeof pad.axes[0].getValue === 'function' ? pad.axes[0].getValue() : pad.axes[0];
            axisY = typeof pad.axes[1].getValue === 'function' ? pad.axes[1].getValue() : pad.axes[1];
        }
        console.log('🎮 Gamepad state:', {
            axisX: axisX.toFixed(3),
            axisY: axisY.toFixed(3),
            leftStick: pad.leftStick ? { x: pad.leftStick.x?.toFixed(3), y: pad.leftStick.y?.toFixed(3) } : 'N/A',
            startButton: pad.buttons[9]?.pressed,
            dpadUp: pad.buttons[12]?.pressed,
            connected: gamepadConnected
        });
    }

    // Get current menu/dialog state from global variables
    const inMenu = (window.inventoryVisible || inventoryVisible) ||
        (window.equipmentVisible || equipmentVisible) ||
        (window.shopVisible || shopVisible);
    const inDialog = (window.dialogVisible || dialogVisible);
    const inShop = (window.shopVisible || shopVisible);

    // --- D-PAD MENU TOGGLES (always work, except in shop) ---
    if (!inShop && !inDialog) {
        // D-pad UP = Toggle Inventory
        if (isButtonJustPressed(controllerConfig.buttons.DPAD_UP)) {
            if (typeof toggleInventory === 'function') {
                toggleInventory();
            }
        }
        // D-pad DOWN = Toggle Equipment
        if (isButtonJustPressed(controllerConfig.buttons.DPAD_DOWN)) {
            if (typeof toggleEquipment === 'function') {
                toggleEquipment();
            }
        }
    }

    // Get current quest modal state
    const modalNew = window.newQuestModal || newQuestModal;
    const modalCompleted = window.questCompletedModal || questCompletedModal;
    const modalPreview = window.questPreviewModal || questPreviewModal;

    const inQuestModal = (modalNew) || (modalCompleted) || (modalPreview);

    // Debug quest modal state periodically
    debugCounter++;
    if (debugCounter % 300 === 0) { // Every 5 seconds roughly
        console.log('🎮 Controller Menu State:', {
            inMenu, inDialog, inQuestModal,
            newQuestModal: modalNew ? 'PRESENT' : 'null',
            questCompletedModal: modalCompleted ? 'PRESENT' : 'null',
            questPreviewModal: modalPreview ? 'PRESENT' : 'null',
            cursorVisible,
            virtualCursorVisible: virtualCursor ? virtualCursor.visible : false
        });
    }

    // --- VIRTUAL MOUSE CURSOR (when in menu or dialog or quest modal) ---
    if (inMenu || inDialog || inQuestModal) {
        if (!cursorVisible) {
            // Show cursor centered or at last position
            virtualCursor.setPosition(controllerScene.scale.width / 2, controllerScene.scale.height / 2);
            virtualCursor.setVisible(true);
            cursorVisible = true;
            // Ensure depth is high
            virtualCursor.setDepth(10000);
        }


        // Move cursor with Left Stick
        let axisX = 0, axisY = 0;
        if (pad.axes && pad.axes.length >= 2) {
            axisX = typeof pad.axes[0].getValue === 'function' ? pad.axes[0].getValue() : pad.axes[0];
            axisY = typeof pad.axes[1].getValue === 'function' ? pad.axes[1].getValue() : pad.axes[1];
        }

        // Apply deadzone
        if (Math.abs(axisX) < deadzone) axisX = 0;
        if (Math.abs(axisY) < deadzone) axisY = 0;

        if (axisX !== 0 || axisY !== 0) {
            const speed = virtualCursorSpeed / 60; // Approximate per-frame speed
            let newX = virtualCursor.x + axisX * speed;
            let newY = virtualCursor.y + axisY * speed;

            // Clamp to screen
            newX = Phaser.Math.Clamp(newX, 0, controllerScene.scale.width);
            newY = Phaser.Math.Clamp(newY, 0, controllerScene.scale.height);

            virtualCursor.setPosition(newX, newY);

            // Check for hover events manually
            updateVirtualCursorHover();
        }
    } else {
        if (cursorVisible) {
            virtualCursor.setVisible(false);
            cursorVisible = false;
        }

        // --- MOVEMENT (left stick, only when NOT in menu/dialog) ---
        handleGamepadMovement(pad, deadzone);
    }

    // --- BUTTON ACTIONS ---
    // A button - Attack/Interact/Confirm
    if (isButtonJustPressed(controllerConfig.buttons.A)) {
        if (inMenu || inDialog || inQuestModal) {
            // Virtual click at cursor position
            triggerVirtualCursorClick();
        } else {
            onControllerA();
        }
    }

    // B button - Cancel/Close
    if (isButtonJustPressed(controllerConfig.buttons.B)) {
        onControllerB();
    }

    // X button - Ability 1
    if (isButtonJustPressed(controllerConfig.buttons.X)) {
        onControllerX();
    }

    // Y button - Ability 2
    if (isButtonJustPressed(controllerConfig.buttons.Y)) {
        onControllerY();
    }

    // LB - Health Potion
    if (isButtonJustPressed(controllerConfig.buttons.LB)) {
        console.log('[Ability Debug] LB pressed (Health Potion)');
        if (typeof usePotion === 'function') {
            usePotion('health');
        } else if (typeof window.usePotion === 'function') {
            window.usePotion('health');
        }
    }

    // RB - Mana Potion
    if (isButtonJustPressed(controllerConfig.buttons.RB)) {
        console.log('[Ability Debug] RB pressed (Mana Potion)');
        if (typeof usePotion === 'function') {
            usePotion('mana');
        } else if (typeof window.usePotion === 'function') {
            window.usePotion('mana');
        }
    }

    // Start - Menu toggle (same as ESC)
    if (isButtonJustPressed(controllerConfig.buttons.START)) {
        onControllerMenu();
    }
}

/**
 * Handle movement input from gamepad (left stick only)
 */
function handleGamepadMovement(pad, deadzone) {
    if (typeof player === 'undefined' || !player) return;
    if (typeof playerStats === 'undefined') return;

    // Get axis values - handle both Phaser axis objects and raw values
    let leftStickX = 0, leftStickY = 0;
    if (pad.axes && pad.axes.length >= 2) {
        // Try getValue() method first (Phaser Axis object), fall back to raw value
        leftStickX = typeof pad.axes[0].getValue === 'function' ? pad.axes[0].getValue() : (pad.axes[0] || 0);
        leftStickY = typeof pad.axes[1].getValue === 'function' ? pad.axes[1].getValue() : (pad.axes[1] || 0);
    }

    // Also try leftStick property as fallback
    if (leftStickX === 0 && leftStickY === 0 && pad.leftStick) {
        leftStickX = pad.leftStick.x || 0;
        leftStickY = pad.leftStick.y || 0;
    }

    // Use only left stick for movement (D-pad is for shortcuts)
    const moveLeft = leftStickX < -deadzone;
    const moveRight = leftStickX > deadzone;
    const moveUp = leftStickY < -deadzone;
    const moveDown = leftStickY > deadzone;

    const speed = playerStats.speed || 200;

    // Horizontal movement
    if (moveLeft) {
        player.setVelocityX(-speed);
    } else if (moveRight) {
        player.setVelocityX(speed);
    } else if (Math.abs(leftStickX) < deadzone) {
        // Only reset if keyboard isn't controlling and stick is in deadzone
        if (typeof cursors !== 'undefined' && !cursors.left?.isDown && !cursors.right?.isDown) {
            player.setVelocityX(0);
        }
    }

    // Vertical movement
    if (moveUp) {
        player.setVelocityY(-speed);
    } else if (moveDown) {
        player.setVelocityY(speed);
    } else if (Math.abs(leftStickY) < deadzone) {
        if (typeof cursors !== 'undefined' && !cursors.up?.isDown && !cursors.down?.isDown) {
            player.setVelocityY(0);
        }
    }
}

/**
 * Update virtual cursor hover state
 * Checks for overlap with any active menu items
 */
let lastHoveredItem = null;

function updateVirtualCursorHover() {
    if (!virtualCursor || !virtualCursor.visible) return;

    // DIAGNOSTIC HEARTBEAT (Every ~2 seconds)
    if (!window.diagTimer) window.diagTimer = 0;
    const now = Date.now();
    if (now - window.diagTimer > 2000) {
        window.diagTimer = now;
        console.log(`[Virtual Cursor] HEARTBEAT:`);
        console.log(`[Virtual Cursor]    -> window.questPreviewModal:`, window.questPreviewModal ? 'EXISTS' : 'UNDEFINED');
        if (window.questPreviewModal) {
            console.log(`[Virtual Cursor]    -> acceptBtn:`, window.questPreviewModal.acceptBtn ? 'EXISTS' : 'MISSING');
        }
        if (controllerScene) {
            const btn = controllerScene.children.list.find(c => c.name === 'QuestAcceptBtn');
            console.log(`[Virtual Cursor]    -> Scene Scan for 'QuestAcceptBtn':`, btn ? 'FOUND' : 'NOT FOUND');
        } else {
            console.log(`[Virtual Cursor]    -> controllerScene is UNDEFINED`);
        }
    }

    // Aggregate all visible menu items
    let allItems = getVisibleMenuItems();
    console.log(`[Virtual Cursor] Checking collision against ${allItems.length} items`);

    // Check overlap
    let hoveredItem = null;
    // Use getBounds() to match target item coordinate space (World vs Screen)
    const cursorRect = virtualCursor.getBounds();

    for (const itemWrapper of allItems) {
        // Wrapper usually has borderRect or sprite
        let bounds = null;

        if (itemWrapper.borderRect && itemWrapper.borderRect.active) {
            bounds = itemWrapper.borderRect.getBounds();
        } else if (itemWrapper.sprite && itemWrapper.sprite.active) {
            bounds = itemWrapper.sprite.getBounds();
        } else if (itemWrapper.bg && itemWrapper.bg.active) {
            bounds = itemWrapper.bg.getBounds();
        } else if (itemWrapper.zone && itemWrapper.zone.active) {
            bounds = itemWrapper.zone.getBounds();
        }

        if (bounds && Phaser.Geom.Rectangle.Overlaps(cursorRect, bounds)) {
            hoveredItem = itemWrapper;
            // Debug hover
            if (hoveredItem !== lastHoveredItem) {
                console.log('[Virtual Cursor] Hovered item', itemWrapper);
            }
            break; // Found one
        }
    }

    // Handle hover changes
    if (hoveredItem !== lastHoveredItem) {
        // Emit pointerout on old
        if (lastHoveredItem) {
            const target = lastHoveredItem.sprite || lastHoveredItem.bg || lastHoveredItem.borderRect;
            if (target && target.emit) target.emit('pointerout');
        }

        // Emit pointerover on new
        if (hoveredItem) {
            const target = hoveredItem.sprite || hoveredItem.bg || hoveredItem.borderRect;
            if (target && target.emit) target.emit('pointerover');
        }

        lastHoveredItem = hoveredItem;
    }
}

/**
 * Trigger click on the item under the virtual cursor
 */
function triggerVirtualCursorClick() {
    if (lastHoveredItem) {
        console.log('[Virtual Cursor] Clicked item:', lastHoveredItem, 'Source:', lastHoveredItem.source);
        // Prioritize buyButton if present (for Shop)
        const target = lastHoveredItem.buyButton || lastHoveredItem.sprite || lastHoveredItem.bg || lastHoveredItem.borderRect;

        if (target) {
            console.log(`[Virtual Cursor] Emitting pointerdown on target: ${target.name || 'Unnamed'} (${target.type})`);
            if (target.emit) {
                console.log(`[Virtual Cursor] Target listener count for pointerdown: ${target.listenerCount('pointerdown')}`);
                // Pass a mock pointer object with event.stopPropagation (needed by onClickItem)
                const mockPointer = {
                    isDown: true,
                    x: 0,
                    y: 0,
                    event: {
                        stopPropagation: () => { }
                    }
                };
                target.emit('pointerdown', mockPointer);
                console.log('[Virtual Cursor] pointerdown EMITTED');
            } else {
                console.warn('[Virtual Cursor] Target has no emit function!');
            }
        } else {
            console.warn('[Virtual Cursor] No target found to click inside item wrapper');
        }
    } else {
        console.log('[Virtual Cursor] Click - no target hovered');
    }
}

/**
 * Helper to get all currently visible menu items
 */
function getVisibleMenuItems() {
    let items = [];

    // Quest Modals (High Priority - Top Layer)
    const modalNew = window.newQuestModal || newQuestModal;
    const modalCompleted = window.questCompletedModal || questCompletedModal;
    const modalPreview = window.questPreviewModal || questPreviewModal;

    if (modalNew) {
        if (modalNew.acceptBtn) items.push({ bg: modalNew.acceptBtn, source: 'NewQuestAccept' });
        if (modalNew.cancelBtn) items.push({ bg: modalNew.cancelBtn, source: 'NewQuestCancel' });
    }

    if (modalCompleted) {
        if (modalCompleted.closeBtn) items.push({ bg: modalCompleted.closeBtn, source: 'QuestCompletedClose' });
    }

    // Fallback: Check if window.questPreviewModal failed but buttons exist in scene
    if (!modalPreview && controllerScene) {
        const acceptBtn = controllerScene.children.list.find(c => c.name === 'QuestAcceptBtn');
        if (acceptBtn && acceptBtn.active && acceptBtn.visible) {
            console.log('[Virtual Cursor] Found QuestAcceptBtn via Scene Scan (Global var missing?)');
            items.push({ bg: acceptBtn, source: 'QuestPreviewAccept_Fallback' });
        }
    }

    if (modalPreview) {
        if (modalPreview.acceptBtn) {
            items.push({ bg: modalPreview.acceptBtn, source: 'QuestPreviewAccept' });
            console.log('[Virtual Cursor] Adding QuestPreviewAccept');
        }
        if (modalPreview.declineBtn) items.push({ bg: modalPreview.declineBtn, source: 'QuestPreviewDecline' });
    }

    // Inventory
    if (typeof inventoryVisible !== 'undefined' && inventoryVisible && inventoryPanel && inventoryPanel.items) {
        items = items.concat(inventoryPanel.items);
    }

    // Equipment
    if (typeof equipmentVisible !== 'undefined' && equipmentVisible && equipmentPanel) {
        // Equipment inventory items (right side)
        if (equipmentPanel.inventoryItems) {
            items = items.concat(equipmentPanel.inventoryItems);
        }

        // Equipment slots (left side)
        if (equipmentPanel.slots) {
            items = items.concat(Object.values(equipmentPanel.slots));
        }
    }

    // Shop
    if (typeof shopVisible !== 'undefined' && shopVisible && shopPanel && shopPanel.items) {
        items = items.concat(shopPanel.items);
    }

    // Dialog
    const isDialog = (window.dialogVisible || dialogVisible);
    const panelDialog = (window.dialogPanel || dialogPanel);

    if (isDialog && panelDialog && panelDialog.choiceButtons) {
        items = items.concat(panelDialog.choiceButtons);
    }



    return items;
}


/**
 * A button action - Attack/Interact/Confirm
 */
function onControllerA() {
    const inMenu = (typeof inventoryVisible !== 'undefined' && inventoryVisible) ||
        (typeof equipmentVisible !== 'undefined' && equipmentVisible) ||
        (typeof shopVisible !== 'undefined' && shopVisible);
    const inDialog = typeof dialogVisible !== 'undefined' && dialogVisible;

    // Check for Quest Modal (and Quest Preview)
    const inQuestModal = (typeof questCompletedModal !== 'undefined' && questCompletedModal) ||
        (typeof newQuestModal !== 'undefined' && newQuestModal) ||
        (typeof window.questPreviewModal !== 'undefined' && window.questPreviewModal);

    if (inDialog) {
        // Advance dialog
        if (typeof advanceDialog === 'function') {
            advanceDialog();
        }
    } else if (inQuestModal) {
        // Quest Modal interaction is primarily handled by Virtual Cursor (Rectangles), 
        // but if we need a fallback action here, we could add it.
        // For now, the Virtual Cursor handles the 'A' press on buttons.
        // However, if we need to ensure clicks work, we let the virtual cursor do it.
        if (typeof triggerVirtualCursorClick === 'function') {
            triggerVirtualCursorClick();
        }
    } else if (inMenu) {
        // Activate selected item
        activateSelectedMenuItem();
    } else {
        // Not in menu - World Interaction Priority Order

        // 1. World Interaction (Town Exit, Mana Flux, Apparate, NPC, Building)
        // Matches 'F' key behavior
        if (typeof window.triggerWorldInteraction === 'function') {
            if (window.triggerWorldInteraction()) {
                return; // Interaction handled
            }
        }

        // 2. Item Pickup
        // Matches Spacebar behavior (if item nearby)
        if (typeof window.triggerItemPickup === 'function') {
            if (window.triggerItemPickup()) {
                return; // Item picked up
            }
        }

        // 3. Attack (Default)
        // Matches Spacebar behavior (if no item)
        if (typeof playerAttack === 'function') {
            playerAttack();
        }
    }
}

/**
 * B button action - Cancel/Close
 */
function onControllerB() {
    console.log('[Ability Debug] onControllerB called');
    if (typeof inventoryVisible !== 'undefined' && inventoryVisible) {
        if (typeof closeInventory === 'function') closeInventory();
    } else if (typeof equipmentVisible !== 'undefined' && equipmentVisible) {
        if (typeof destroyEquipmentUI === 'function') destroyEquipmentUI();
    } else if (typeof shopVisible !== 'undefined' && shopVisible) {
        if (typeof closeShop === 'function') closeShop();
    } else if (typeof dialogVisible !== 'undefined' && dialogVisible) {
        if (typeof closeDialog === 'function') closeDialog();
    } else {
        // No menu open - Use Ability 4 (Shield)
        console.log('[Ability Debug] No menu open, attempting Ability 4 (Shield)');
        if (typeof useAbility === 'function') {
            useAbility(4);
        } else if (typeof window.useAbility === 'function') {
            window.useAbility(4);
        } else {
            console.warn('[Ability Debug] useAbility not found');
        }
    }
}

/**
 * X button action - Ability 1 (Fireball)
 */
function onControllerX() {
    const inMenu = (typeof inventoryVisible !== 'undefined' && inventoryVisible) ||
        (typeof equipmentVisible !== 'undefined' && equipmentVisible) ||
        (typeof shopVisible !== 'undefined' && shopVisible);
    const inDialog = typeof dialogVisible !== 'undefined' && dialogVisible;

    if (!inMenu && !inDialog) {
        console.log('[Ability Debug] X pressed (Ability 1)');
        if (typeof useAbility === 'function') {
            useAbility(1);
        } else if (typeof window.useAbility === 'function') {
            window.useAbility(1);
        }
    }
}

/**
 * Y button action - Ability 2 (Ice Nova)
 */
function onControllerY() {
    const inMenu = (typeof inventoryVisible !== 'undefined' && inventoryVisible) ||
        (typeof equipmentVisible !== 'undefined' && equipmentVisible) ||
        (typeof shopVisible !== 'undefined' && shopVisible);
    const inDialog = typeof dialogVisible !== 'undefined' && dialogVisible;

    if (!inMenu && !inDialog) {
        console.log('[Ability Debug] Y pressed (Ability 2)');
        if (typeof useAbility === 'function') {
            useAbility(2);
        } else if (typeof window.useAbility === 'function') {
            window.useAbility(2);
        }
    }
}

/**
 * Start/Menu button action
 */
function onControllerMenu() {
    // Close any open menus, or open inventory
    if (typeof inventoryVisible !== 'undefined' && inventoryVisible) {
        if (typeof closeInventory === 'function') closeInventory();
    } else if (typeof equipmentVisible !== 'undefined' && equipmentVisible) {
        if (typeof destroyEquipmentUI === 'function') destroyEquipmentUI();
    } else if (typeof shopVisible !== 'undefined' && shopVisible) {
        if (typeof closeShop === 'function') closeShop();
    } else if (typeof dialogVisible !== 'undefined' && dialogVisible) {
        if (typeof closeDialog === 'function') closeDialog();
    } else {
        // Open inventory as default menu
        if (typeof toggleInventory === 'function') {
            toggleInventory();
        }
    }
}

/**
 * Move menu selection cursor
 */
function moveMenuSelection(direction) {
    if (menuTotalItems === 0) return;

    const oldIndex = menuSelectionIndex;

    switch (direction) {
        case 'up':
            menuSelectionIndex = Math.max(0, menuSelectionIndex - menuItemsPerRow);
            break;
        case 'down':
            menuSelectionIndex = Math.min(menuTotalItems - 1, menuSelectionIndex + menuItemsPerRow);
            break;
        case 'left':
            if (menuSelectionIndex % menuItemsPerRow > 0) {
                menuSelectionIndex--;
            }
            break;
        case 'right':
            if (menuSelectionIndex % menuItemsPerRow < menuItemsPerRow - 1 &&
                menuSelectionIndex < menuTotalItems - 1) {
                menuSelectionIndex++;
            }
            break;
    }

    if (oldIndex !== menuSelectionIndex) {
        updateMenuSelectionCursor();
        // Play selection sound
        if (typeof playSound === 'function') {
            playSound('menu_select');
        }
    }
}

/**
 * Set menu items for controller navigation
 */
function setMenuItems(items, itemsPerRow = 6) {
    currentMenuItems = items || [];
    menuTotalItems = currentMenuItems.length;
    menuItemsPerRow = itemsPerRow;
    menuSelectionIndex = 0;
    updateMenuSelectionCursor();
}

/**
 * Clear menu selection state
 */
function clearMenuSelection() {
    currentMenuItems = [];
    menuTotalItems = 0;
    menuSelectionIndex = 0;
    destroyMenuCursor();
}

/**
 * Update the visual selection cursor position
 */
function updateMenuSelectionCursor() {
    if (!controllerScene || menuTotalItems === 0) return;

    const item = currentMenuItems[menuSelectionIndex];
    if (!item) return;

    // Get position from item's sprite or background
    let x, y;
    if (item.sprite && item.sprite.active) {
        x = item.sprite.x;
        y = item.sprite.y;
    } else if (item.bg && item.bg.active) {
        x = item.bg.x;
        y = item.bg.y;
    } else {
        return;
    }

    // Create or update cursor
    if (!menuSelectionCursor || !menuSelectionCursor.active) {
        menuSelectionCursor = controllerScene.add.rectangle(x, y, 70, 70)
            .setStrokeStyle(3, 0xffff00)
            .setFillStyle(0xffff00, 0.1)
            .setScrollFactor(0)
            .setDepth(500);
    } else {
        menuSelectionCursor.setPosition(x, y);
    }
}

/**
 * Destroy the menu selection cursor
 */
function destroyMenuCursor() {
    if (menuSelectionCursor && menuSelectionCursor.active) {
        menuSelectionCursor.destroy();
        menuSelectionCursor = null;
    }
}

/**
 * Activate the currently selected menu item
 */
function activateSelectedMenuItem() {
    console.log('🎮 activateSelectedMenuItem called', {
        menuTotalItems: menuTotalItems,
        menuSelectionIndex: menuSelectionIndex,
        hasItems: currentMenuItems.length > 0
    });

    const item = currentMenuItems[menuSelectionIndex];
    if (!item) {
        console.log('🎮 No item at index', menuSelectionIndex);
        return;
    }

    console.log('🎮 Activating item:', item);

    // Trigger the item's click handler
    if (item.sprite && item.sprite.active) {
        console.log('🎮 Emitting pointerdown on sprite');
        item.sprite.emit('pointerdown');
    } else if (item.bg && item.bg.active) {
        console.log('🎮 Emitting pointerdown on bg');
        item.bg.emit('pointerdown');
    } else {
        console.log('🎮 No valid target to emit on');
    }
}

/**
 * Get current selection index
 */
function getMenuSelectionIndex() {
    return menuSelectionIndex;
}

// Export functions for use in game.js
if (typeof window !== 'undefined') {
    window.loadControllerConfig = loadControllerConfig;
    window.initController = initController;
    window.handleGamepadInput = handleGamepadInput;
    window.isControllerConnected = isControllerConnected;
    window.setMenuItems = setMenuItems;
    window.clearMenuSelection = clearMenuSelection;
    window.getMenuSelectionIndex = getMenuSelectionIndex;
    window.destroyMenuCursor = destroyMenuCursor;
}
