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
let inputKeys = {}; // Stores Phaser Key objects mapped by action name

// Menu navigation state
let menuSelectionIndex = 0;
let menuItemsPerRow = 6;
let menuTotalItems = 0;
let menuSelectionCursor = null;
let currentMenuItems = [];

// Virtual Cursor state
let virtualCursor = null;
let aimReticle = null;
let virtualCursorSpeed = 600; // Pixels per second
let cursorVisible = false;

/**
 * Load controller configuration from controller.json
 */
async function loadControllerConfig() {
    try {
        const response = await fetch('controller.json');
        controllerConfig = await response.json();
        window.controllerConfig = controllerConfig; // Ensure global access
        debugLog('🎮 Controller config loaded:', controllerConfig);
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

        debugLog('🎮 Virtual cursor created');
    }

    // Create aim reticle (initially hidden)
    if (!aimReticle) {
        aimReticle = scene.add.circle(0, 0, 5, 0xff0000)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(900)
            .setVisible(false);
    }

    // Listen for gamepad connection
    scene.input.gamepad.on('connected', (pad) => {
        debugLog('🎮 Controller connected:', pad.id);
        gamepadConnected = true;
        activeGamepad = pad;
        if (typeof addChatMessage === 'function') {
            addChatMessage('Controller connected!', 0x00ff00, '🎮');
        }
    });

    scene.input.gamepad.on('disconnected', (pad) => {
        debugLog('🎮 Controller disconnected');
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
            debugLog('🎮 Controller already connected:', activeGamepad.id);
        }
    }

    // Listen for mouse input to switch to keyboard mode
    scene.input.on('pointermove', () => {
        if (typeof checkInputModeChange === 'function') checkInputModeChange('keyboard');
    });

    scene.input.on('pointerdown', () => {
        if (typeof checkInputModeChange === 'function') checkInputModeChange('keyboard');
    });

    // Initialize Keyboard Keys from Config
    if (controllerConfig && controllerConfig.keyboard) {
        debugLog('⌨️ Initializing Keyboard Controls...');
        for (const [action, keyStr] of Object.entries(controllerConfig.keyboard)) {
            // keyStr can be "W,UP" -> split by comma
            const codes = keyStr.split(',').map(s => s.trim());
            inputKeys[action] = [];

            codes.forEach(code => {
                // Handle special case for number keys if needed, but Phaser usually handles "ONE", "TWO" etc.
                // Phaser.Input.Keyboard.KeyCodes[code]
                let keyCode = Phaser.Input.Keyboard.KeyCodes[code];

                // Fallback for single characters "W", "A", "S", "D"
                if (!keyCode && code.length === 1) {
                    keyCode = Phaser.Input.Keyboard.KeyCodes[code.toUpperCase()];
                }

                if (keyCode) {
                    const keyObj = scene.input.keyboard.addKey(keyCode);
                    inputKeys[action].push(keyObj);
                    // debugLog(`   Mapped ${action} -> ${code}`);
                } else {
                    console.warn(`⚠️ Invalid key code: ${code} for action: ${action}`);
                }
            });
        }
    }

    // Set up ESC key handler for menu action - keep as backup or part of 'settings' action
    // (Now handled by isActionJustPressed('settings'))

    debugLog('🎮 Controller system initialized');

    // Trigger initial UI update now that config is loaded
    if (scene && scene.events) {
        scene.events.emit('input-mode-changed', currentInputMode);
    }
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
 * Check if an action button was just pressed (Gamepad OR Keyboard)
 */
function isActionJustPressed(action) {
    // 1. Check Gamepad
    const buttonIndex = getButtonForAction(action);
    if (isButtonJustPressed(buttonIndex)) return true;

    // 2. Check Keyboard
    if (inputKeys[action]) {
        for (const key of inputKeys[action]) {
            if (Phaser.Input.Keyboard.JustDown(key)) {
                checkInputModeChange('keyboard');
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if an action is currently active (Held Down) - Gamepad OR Keyboard
 */
function isActionActive(action) {
    // 1. Check Gamepad
    if (activeGamepad && controllerConfig) {
        const buttonIndex = getButtonForAction(action);
        if (buttonIndex >= 0 && activeGamepad.buttons[buttonIndex]?.pressed) {
            return true;
        }
    }

    // 2. Check Keyboard
    if (inputKeys[action]) {
        for (const key of inputKeys[action]) {
            if (key.isDown) return true;
        }
    }

    return false;
}

/**
 * Check and handle input mode switching (Keyboard <-> Gamepad)
 * Call this whenever input is detected
 * @param {string} source - 'gamepad' or 'keyboard'
 */
let currentInputMode = 'keyboard'; // Default

// Expose checks
window.getContentInputMode = () => currentInputMode;

function checkInputModeChange(source) {
    if (source !== currentInputMode) {
        currentInputMode = source;
        // debugLog(`🎮 Input Mode Changed to: ${source.toUpperCase()}`);

        // Emit event for UI updates
        const scene = controllerScene || (game.scene.scenes[0]);
        if (scene && scene.events) {
            scene.events.emit('input-mode-changed', currentInputMode);
        }
    }
}

/**
 * Get the display label for an action based on current input mode
 * @param {string} action - Action name (e.g. 'ability1', 'equipment')
 * @returns {string} - Display text (e.g. 'X', '1', 'E', 'D-Up')
 */
window.getInputLabel = function (action) {
    if (!controllerConfig || !controllerConfig.uiLabels || !controllerConfig.uiLabels[action]) {
        // Fallback or unconfigured
        return '?';
    }

    // Check if input mode is gamepad (active or just recently used)
    const isGamepad = (currentInputMode === 'gamepad');

    // Allow forcing mode if needed, but currentInputMode is best source of truth
    if (isGamepad) {
        return controllerConfig.uiLabels[action].gamepad || '?';
    } else {
        return controllerConfig.uiLabels[action].keyboard || '?';
    }
};

/**
 * Handle all gamepad input - call this from update()
 */
let debugCounter = 0;
function handleGamepadInput() {
    if (!gamepadConnected || !activeGamepad || !controllerConfig) return;

    // Update all button states once at the start of the frame
    updateButtonStates();

    // Check for input to switch mode
    if (activeGamepad && activeGamepad.buttons.some(b => b.pressed) || (activeGamepad.axes.some(a => Math.abs(a.getValue()) > 0.3))) {
        checkInputModeChange('gamepad');
    }

    const pad = activeGamepad;
    const deadzone = controllerConfig.deadzone || 0.3;

    // Define state variables
    const inMenu = (typeof window.inventoryVisible !== 'undefined' && window.inventoryVisible) ||
        (typeof window.equipmentVisible !== 'undefined' && window.equipmentVisible) ||
        (typeof window.shopVisible !== 'undefined' && window.shopVisible) ||
        (window.ShopManager && window.ShopManager.shopVisible) ||
        (window.UIManager && window.UIManager.settingsVisible);

    const inDialog = (typeof window.dialogVisible !== 'undefined' && window.dialogVisible);

    const inQuestModal = (typeof window.newQuestModal !== 'undefined' && window.newQuestModal) ||
        (typeof window.questCompletedModal !== 'undefined' && window.questCompletedModal) ||
        (typeof window.questPreviewModal !== 'undefined' && window.questPreviewModal);

    // Debug: log gamepad state every 60 frames (about once per second)
    debugCounter++;
    if (debugCounter % 60 === 0) {
        // Get axis values safely
        let axisX = 0, axisY = 0;
        if (pad.axes && pad.axes.length >= 2) {
            axisX = typeof pad.axes[0].getValue === 'function' ? pad.axes[0].getValue() : pad.axes[0];
            axisY = typeof pad.axes[1].getValue === 'function' ? pad.axes[1].getValue() : pad.axes[1];
        }
        debugLog('🎮 Gamepad state:', {
            axisX: axisX.toFixed(3),
            axisY: axisY.toFixed(3),
            leftStick: pad.leftStick ? { x: pad.leftStick.x?.toFixed(3), y: pad.leftStick.y?.toFixed(3) } : 'N/A',
            startButton: pad.buttons[9]?.pressed,
            dpadUp: pad.buttons[12]?.pressed,
            connected: gamepadConnected
        });
    }

    // Get current menu/dialog state from global variables
    const inShop = (typeof window.shopVisible !== 'undefined' && window.shopVisible) ||
        (window.ShopManager && window.ShopManager.shopVisible);

    // --- D-PAD MENU TOGGLES (always work, except in shop) ---
    // --- D-PAD MENU TOGGLES (Removed: Handled by Game.js via Actions) ---
    // Actions: inventory, equipment, quests defined in controller.json

    // Get current quest modal state
    const modalNew = (typeof window.newQuestModal !== 'undefined' && window.newQuestModal);
    const modalCompleted = (typeof window.questCompletedModal !== 'undefined' && window.questCompletedModal);
    const modalPreview = (typeof window.questPreviewModal !== 'undefined' && window.questPreviewModal);

    // Debug quest modal state periodically
    debugCounter++;
    if (debugCounter % 300 === 0) { // Every 5 seconds roughly
        debugLog('🎮 Controller Menu State:', {
            inMenu, inDialog, inQuestModal,
            newQuestModal: modalNew ? 'PRESENT' : 'null',
            questCompletedModal: modalCompleted ? 'PRESENT' : 'null',
            questPreviewModal: modalPreview ? 'PRESENT' : 'null',
            cursorVisible,
            virtualCursorVisible: virtualCursor ? virtualCursor.visible : false
        });
    }

    // --- VIRTUAL MOUSE CURSOR (when in menu only) ---
    // Note: We EXCLUDE inDialog AND inQuestModal here because we want discrete D-Pad/Stick navigation
    if (inMenu && !inQuestModal) {
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
        // Hide cursor if not in relevant menu (and NOT in dialog/quest, though they manage visibility separately)
        // Actually, for Dialogs/Quests, we might WANT the cursor visible to show selection, 
        // but we don't want the STICK to move it freely.
        // So we should handle visibility separately.

        if (inDialog || inQuestModal) {
            if (!cursorVisible) {
                virtualCursor.setVisible(true);
                cursorVisible = true;
                virtualCursor.setDepth(10000);
            }
            // Do NOT allow analog movement here.

            // Allow Discrete Menu Navigation via Stick Flick/D-Pad
            handleMenuNavigation(pad, deadzone);
        } else {
            if (cursorVisible) {
                virtualCursor.setVisible(false);
                cursorVisible = false;
            }

            // --- MOVEMENT (left stick, only when NOT in menu/dialog/quest) ---
            handleGamepadMovement(pad, deadzone);

            // --- AIMING (right stick) ---
            handleGamepadAiming(pad, deadzone);
        }
    }

    // --- MENU NAVIGATION (D-Pad / Stick Flick) ---
    // Explicitly handle menu navigation when in Menu or Dialog or Quest
    if (inMenu || inDialog || inQuestModal) {
        handleMenuNavigation(pad, deadzone);
    }

    // --- BUTTON ACTIONS ---
    // A button - Attack/Interact/Confirm
    if (isButtonJustPressed(controllerConfig.buttons.A)) {
        // --- Settings Menu Confirm ---
        if (window.UIManager && window.UIManager.settingsVisible && window.handleSettingsInput) {
            if (window.handleSettingsInput('confirm')) {
                return; // Handled
            }
        }

        if (inDialog) {
            debugLog('[Controller] "A" Pressed in Dialog - Calling Discrete Activation');
            // Try discrete activation first
            if (typeof window.activateDialogSelection === 'function' && window.activateDialogSelection()) {
                return; // Handled
            }
            // Fallback to virtual cursor
            triggerVirtualCursorClick();
        } else if (inQuestModal) {
            debugLog('[Controller] "A" Pressed in Quest Modal - Discrete Activation');
            // Quest Modal Discrete Activation
            let handled = false;
            // Determine active modal
            const modal = window.newQuestModal || window.questCompletedModal || window.questPreviewModal;
            if (modal && typeof modal.selectedIndex !== 'undefined' && modal.selectedIndex >= 0) {
                // Identify button based on index
                let btnToClick = null;

                if (window.newQuestModal) {
                    if (modal.selectedIndex === 0) btnToClick = modal.acceptBtn;
                    else if (modal.selectedIndex === 1) btnToClick = modal.cancelBtn;
                } else if (window.questCompletedModal) {
                    if (modal.selectedIndex === 0) btnToClick = modal.closeBtn;
                } else if (window.questPreviewModal) {
                    if (modal.selectedIndex === 0) btnToClick = modal.acceptBtn;
                    else if (modal.selectedIndex === 1) btnToClick = modal.declineBtn;
                }

                if (btnToClick) {
                    debugLog('[Controller] Clicking Quest Button via Index', modal.selectedIndex);
                    // Emit pointerdown event manually
                    const mockPointer = {
                        isDown: true, x: 0, y: 0,
                        event: { stopPropagation: () => { } }
                    };
                    if (btnToClick.emit) {
                        btnToClick.emit('pointerdown', mockPointer);
                        if (typeof playSound === 'function') playSound('ui_click');
                        handled = true;
                    }
                }
            }

            if (!handled) {
                // Fallback to virtual cursor if no index selected
                triggerVirtualCursorClick();
            }

        } else if (inMenu) {
            // Virtual click at cursor position
            triggerVirtualCursorClick();
        }
    }

    // B button - Back/Cancel (Close UI)
    if (isButtonJustPressed(controllerConfig.buttons.B)) {
        debugLog('[Controller] "B" Pressed');
        if (typeof onControllerB === 'function') {
            onControllerB();
        }
    }
    // Gameplay actions (Attack/Interact) are handled by Game.js via isActionJustPressed('attack'/'interact')
}

// Other buttons (B, X, Y, LB, RB, RT, Start) are now handled by Game.js
// via isActionJustPressed() + controller.json mappings.
// This prevents double-firing of abilities and actions.


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

    // Define state variables locally
    const inMenu = (typeof window.inventoryVisible !== 'undefined' && window.inventoryVisible) ||
        (typeof window.equipmentVisible !== 'undefined' && window.equipmentVisible) ||
        (typeof window.shopVisible !== 'undefined' && window.shopVisible) ||
        (window.ShopManager && window.ShopManager.shopVisible) ||
        (window.UIManager && window.UIManager.settingsVisible);

    const inDialog = (typeof window.dialogVisible !== 'undefined' && window.dialogVisible);

    const inQuestModal = (typeof window.newQuestModal !== 'undefined' && window.newQuestModal) ||
        (typeof window.questCompletedModal !== 'undefined' && window.questCompletedModal) ||
        (typeof window.questPreviewModal !== 'undefined' && window.questPreviewModal);

    // Horizontal movement
    // Horizontal movement
    if (!inMenu && !inDialog && !inQuestModal) {
        if (moveLeft) {
            player.setVelocityX(-speed);
        } else if (moveRight) {
            player.setVelocityX(speed);
        } else if (Math.abs(leftStickX) < deadzone) {
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

        // DEBUG MOVEMENT
        if (debugCounter % 60 === 0 && (Math.abs(leftStickX) > deadzone || Math.abs(leftStickY) > deadzone)) {
            debugLog(`[Controller] Moving: X:${leftStickX.toFixed(2)} Y:${leftStickY.toFixed(2)} Speed:${speed}`);
        }

    } else {
        // In Menu/Dialog - Stop player movement
        player.setVelocity(0);

        if (debugCounter % 60 === 0) {
            debugLog(`[Controller] Movement BLOCKED by UI: Menu:${inMenu} Dialog:${inDialog} Quest:${inQuestModal}`);
        }
    }
}

/**
 * Handle aiming input from gamepad (right stick)
 */
function handleGamepadAiming(pad, deadzone) {
    if (typeof player === 'undefined' || !player) return;

    let rx = 0, ry = 0;
    if (pad.rightStick) {
        rx = pad.rightStick.x;
        ry = pad.rightStick.y;
    } else if (pad.axes.length >= 4) {
        // Fallback for some non-standard mappings
        rx = typeof pad.axes[2].getValue === 'function' ? pad.axes[2].getValue() : pad.axes[2];
        ry = typeof pad.axes[3].getValue === 'function' ? pad.axes[3].getValue() : pad.axes[3];
    }

    if (Math.abs(rx) > deadzone || Math.abs(ry) > deadzone) {
        const angle = Math.atan2(ry, rx);
        player.aimAngle = angle; // Store for firing

        // Position reticle at fixed distance
        const aimDist = 100;
        if (aimReticle) {
            aimReticle.setPosition(player.x + Math.cos(angle) * aimDist, player.y + Math.sin(angle) * aimDist);
            aimReticle.setVisible(true);
        }

        // Also update facing direction based on aim
        if (Math.abs(rx) > Math.abs(ry)) {
            player.facingDirection = rx > 0 ? 'east' : 'west';
        } else {
            player.facingDirection = ry > 0 ? 'south' : 'north';
        }
    } else {
        if (aimReticle) aimReticle.setVisible(false);
        // Don't clear player.aimAngle, keep last aim
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
        debugLog(`[Virtual Cursor] HEARTBEAT:`);
        debugLog(`[Virtual Cursor]    -> window.questPreviewModal:`, window.questPreviewModal ? 'EXISTS' : 'UNDEFINED');
        if (window.questPreviewModal) {
            debugLog(`[Virtual Cursor]    -> acceptBtn:`, window.questPreviewModal.acceptBtn ? 'EXISTS' : 'MISSING');
        }
        if (controllerScene) {
            const btn = controllerScene.children.list.find(c => c.name === 'QuestAcceptBtn');
            debugLog(`[Virtual Cursor]    -> Scene Scan for 'QuestAcceptBtn':`, btn ? 'FOUND' : 'NOT FOUND');
        } else {
            debugLog(`[Virtual Cursor]    -> controllerScene is UNDEFINED`);
        }
    }

    // Aggregate all visible menu items
    let allItems = getVisibleMenuItems();
    debugLog(`[Virtual Cursor] Checking collision against ${allItems.length} items`);

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
                debugLog('[Virtual Cursor] Hovered item', itemWrapper);
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
/**
 * Trigger click on the item under the virtual cursor
 */
function triggerVirtualCursorClick() {
    if (lastHoveredItem) {
        debugLog('[Virtual Cursor] Clicked item:', lastHoveredItem, 'Source:', lastHoveredItem.source);
        // Prioritize buyButton if present (for Shop)
        const target = lastHoveredItem.buyButton || lastHoveredItem.sprite || lastHoveredItem.bg || lastHoveredItem.borderRect;

        if (target) {
            debugLog(`[Virtual Cursor] Emitting pointerdown on target: ${target.name || 'Unnamed'} (${target.type})`);
            if (target.emit) {
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
                // Also try 'pointerup' as some Buttons require it
                // target.emit('pointerup', mockPointer); 

                debugLog('[Virtual Cursor] pointerdown EMITTED');
                return true;
            } else {
                console.warn('[Virtual Cursor] Target has no emit function!');
            }
        } else {
            console.warn('[Virtual Cursor] No target found to click inside item wrapper');
        }
    } else {
        debugLog('[Virtual Cursor] Click - FAILED (No item hovered)');
        // Extra Debug: Print why?
        const items = getVisibleMenuItems();
        debugLog(`[Virtual Cursor] Visible Items Count: ${items.length}`);
    }
    return false;
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
            debugLog('[Virtual Cursor] Found QuestAcceptBtn via Scene Scan (Global var missing?)');
            items.push({ bg: acceptBtn, source: 'QuestPreviewAccept_Fallback' });
        }
    }

    if (modalPreview) {
        if (modalPreview.acceptBtn) {
            items.push({ bg: modalPreview.acceptBtn, source: 'QuestPreviewAccept' });
            debugLog('[Virtual Cursor] Adding QuestPreviewAccept');
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
    const isDialog = (typeof window.dialogVisible !== 'undefined' && window.dialogVisible);

    // Check UIManager for the panel, or fallback to global/local
    let panelDialog = null;
    if (window.UIManager && window.UIManager.dialogPanel) {
        panelDialog = window.UIManager.dialogPanel;
    } else if (typeof window.dialogPanel !== 'undefined') {
        panelDialog = window.dialogPanel;
    } else if (typeof dialogPanel !== 'undefined') {
        panelDialog = dialogPanel;
    }

    if (isDialog && panelDialog && panelDialog.choiceButtons) {
        // debugLog('[Virtual Cursor] Adding ' + panelDialog.choiceButtons.length + ' dialog buttons');
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
        // Use Discrete Selection first (more reliable for Menu Navigation)
        // Use Discrete Selection first (more reliable for Menu Navigation)
        // Inline logic for guaranteed execution
        let handled = false;
        debugLog('[Controller] Attempting Inline Dialog Activation...');
        if (window.UIManager && window.UIManager.dialogPanel && window.UIManager.dialogPanel.choiceButtons) {
            const panel = window.UIManager.dialogPanel;
            const index = panel.selectedIndex;
            debugLog(`[Controller] Dialog Index: ${index}`);

            if (typeof index === 'number' && index >= 0 && index < panel.choiceButtons.length) {
                const btn = panel.choiceButtons[index];
                debugLog(`[Controller] Activating: ${btn.choice ? btn.choice.text : 'Unknown'}`);
                if (typeof window.UIManager.handleDialogChoice === 'function') {
                    window.UIManager.handleDialogChoice(btn.choice);
                    if (typeof playSound === 'function') playSound('ui_click');
                    handled = true;
                }
            } else {
                debugLog('[Controller] Invalid Index for Activation');
            }
        }

        if (handled) return;


        // Fallback: Use Virtual Cursor click
        if (typeof triggerVirtualCursorClick === 'function') {
            triggerVirtualCursorClick();
        } else if (typeof advanceDialog === 'function') {
            advanceDialog(); // Fallback
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
    debugLog('[Controller] onControllerB called');

    // 1. Inventory
    if (typeof inventoryVisible !== 'undefined' && inventoryVisible) {
        if (typeof closeInventory === 'function') closeInventory();
    }
    // 2. Equipment
    else if (typeof equipmentVisible !== 'undefined' && equipmentVisible) {
        if (typeof destroyEquipmentUI === 'function') destroyEquipmentUI();
    }
    // 3. Shop (Global or Manager)
    else if ((typeof shopVisible !== 'undefined' && shopVisible) || (window.ShopManager && window.ShopManager.shopVisible)) {
        if (typeof closeShop === 'function') closeShop();
        else if (window.ShopManager) window.ShopManager.closeShop();
    }
    // 4. Forge (Blacksmith)
    else if (window.ForgeUI && window.ForgeUI.visible) {
        window.ForgeUI.close();
    }
    // 5. Tavern
    else if (window.TavernUI && window.TavernUI.visible) {
        window.TavernUI.close();
    }
    // 6. Inn
    else if (window.InnUI && window.InnUI.visible) {
        window.InnUI.close();
    }
    // 7. Dialog (Last priority for UI)
    else if (typeof dialogVisible !== 'undefined' && dialogVisible) {
        if (typeof closeDialog === 'function') closeDialog();
    }
    // 8. No UI open - Gameplay Action
    else {
        // No menu open - Use Ability 4 (Shield)
        debugLog('[Ability Debug] No menu open, attempting Ability 4 (Shield)');
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
        debugLog('[Ability Debug] X pressed (Ability 1)');
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
        debugLog('[Ability Debug] Y pressed (Ability 2)');
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
        // Open Settings menu as default
        if (typeof toggleSettings === 'function') {
            toggleSettings();
        } else if (typeof window.toggleSettings === 'function') {
            window.toggleSettings();
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
    debugLog('🎮 activateSelectedMenuItem called', {
        menuTotalItems: menuTotalItems,
        menuSelectionIndex: menuSelectionIndex,
        hasItems: currentMenuItems.length > 0
    });

    const item = currentMenuItems[menuSelectionIndex];
    if (!item) {
        debugLog('🎮 No item at index', menuSelectionIndex);
        return;
    }

    debugLog('🎮 Activating item:', item);

    // Trigger the item's click handler
    if (item.sprite && item.sprite.active) {
        debugLog('🎮 Emitting pointerdown on sprite');
        item.sprite.emit('pointerdown');
    } else if (item.bg && item.bg.active) {
        debugLog('🎮 Emitting pointerdown on bg');
        item.bg.emit('pointerdown');
    } else {
        debugLog('🎮 No valid target to emit on');
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

/**
 * Handle menu navigation from gamepad (Stick Flick or D-Pad)
 */
function handleMenuNavigation(pad, deadzone) {
    // Handle Menu Navigation (Stick Flick)
    if (typeof cycleMenuSelection === 'function') {
        // Get Stick Y
        let stickY = 0;
        let stickX = 0;
        if (pad.axes && pad.axes.length >= 2) {
            // Handle Phaser axis objects or raw numbers
            const axis0 = pad.axes[0]; // Left stick X
            const axis1 = pad.axes[1]; // Left stick Y
            stickX = typeof axis0.getValue === 'function' ? axis0.getValue() : axis0;
            stickY = typeof axis1.getValue === 'function' ? axis1.getValue() : axis1;
        }
        // Fallback
        if (stickY === 0 && pad.leftStick) stickY = pad.leftStick.y;
        if (stickX === 0 && pad.leftStick) stickX = pad.leftStick.x;

        // SETTINGS NAVIGATION (Left/Right for Sliders)
        if (window.UIManager && window.UIManager.settingsVisible) {
            // Check Left/Right Stick Flick or D-Pad
            const moveLeft = (stickX < -0.5 && !window.stickWasLeft) || (pad.buttons[14]?.pressed && !window.dpadWasLeft);
            const moveRight = (stickX > 0.5 && !window.stickWasRight) || (pad.buttons[15]?.pressed && !window.dpadWasRight);

            // Debounce flags for X axis
            if (Math.abs(stickX) < 0.3) {
                window.stickWasLeft = false;
                window.stickWasRight = false;
            }
            if (!pad.buttons[14]?.pressed) window.dpadWasLeft = false;
            if (!pad.buttons[15]?.pressed) window.dpadWasRight = false;

            if (moveLeft) {
                if (window.handleSettingsInput) window.handleSettingsInput('left');
                window.stickWasLeft = true;
                window.dpadWasLeft = pad.buttons[14]?.pressed;
            } else if (moveRight) {
                if (window.handleSettingsInput) window.handleSettingsInput('right');
                window.stickWasRight = true;
                window.dpadWasRight = pad.buttons[15]?.pressed;
            }
        }

        if ((stickY < -0.5 && !window.stickWasUp) || (pad.buttons[12]?.pressed && !window.dpadWasUp)) {
            debugLog('[Controller] Menu Nav UP');
            cycleMenuSelection(-1);
            window.stickWasUp = true;
            window.dpadWasUp = pad.buttons[12]?.pressed;
        } else if ((stickY > 0.5 && !window.stickWasDown) || (pad.buttons[13]?.pressed && !window.dpadWasDown)) {
            debugLog('[Controller] Menu Nav DOWN');
            cycleMenuSelection(1);
            window.stickWasDown = true;
            window.dpadWasDown = pad.buttons[13]?.pressed;
        }


        if (Math.abs(stickY) < 0.3) {
            window.stickWasUp = false;
            window.stickWasDown = false;
        }
        if (!pad.buttons[12]?.pressed) window.dpadWasUp = false;
        if (!pad.buttons[13]?.pressed) window.dpadWasDown = false;
    }
}

/**
 * Activates the currently selected dialog option (Discrete Mode)
 * Returns true if successful, false otherwise.
 */
function activateDialogSelection() {
    debugLog('[Controller] activateDialogSelection ENTERED');
    if (window.UIManager && window.UIManager.dialogPanel && window.UIManager.dialogPanel.choiceButtons) {
        const panel = window.UIManager.dialogPanel;
        const index = panel.selectedIndex;
        debugLog(`[Controller] Dialog Panel Index: ${index}`);

        if (typeof index === 'number' && index >= 0 && index < panel.choiceButtons.length) {
            const btn = panel.choiceButtons[index];
            debugLog(`[Controller] Activating dialog button index ${index}:`, btn.choice ? btn.choice.text : 'NO CHOICE DATA');

            // Trigger the choice logic directly
            if (typeof window.UIManager.handleDialogChoice === 'function') {
                window.UIManager.handleDialogChoice(btn.choice);
                if (typeof playSound === 'function') playSound('ui_click');
                debugLog('[Controller] activateDialogSelection SUCCESS');
                return true;
            } else {
                console.error('[Controller] UIManager.handleDialogChoice is missing!');
            }
        } else {
            debugLog(`[Controller] No valid dialog selection index: ${index}`);
        }
    } else {
        debugLog('[Controller] activateDialogSelection FAILED - Missing Panel/Buttons');
    }
    return false;
}

// Expose for robustness
if (typeof window !== 'undefined') {
    window.activateDialogSelection = activateDialogSelection;
}
