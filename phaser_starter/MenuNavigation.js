/**
 * Global Menu Navigation Helper
 * Handles cycling efficiently through menus (Dialog, Quest Modal, etc.)
 */
window.cycleMenuSelection = function (direction) {
    if (window.dialogVisible && window.DialogManager && window.DialogManager.currentDialog) {
        // DIALOG NAVIGATION
        // We need to access the buttons array in UIManager
        if (window.UIManager && window.UIManager.dialogPanel && window.UIManager.dialogPanel.choiceButtons) {
            const buttons = window.UIManager.dialogPanel.choiceButtons;
            if (buttons.length === 0) return;

            // Find currently hovered/selected button index
            let currentIndex = -1;

            // Check against virtual cursor target if available, or internal state
            // We'll rely on a manual 'selectedIndex' property we can attach to the panel
            if (typeof window.UIManager.dialogPanel.selectedIndex === 'undefined') {
                window.UIManager.dialogPanel.selectedIndex = -1;
            }

            currentIndex = window.UIManager.dialogPanel.selectedIndex;
            console.log(`[MenuNav] Current Index: ${currentIndex}, Direction: ${direction}, Total Buttons: ${buttons.length}`);

            // If nothing selected, start at 0 (or -1 -> 0)
            let newIndex = currentIndex + direction;

            // Wrap around
            if (newIndex < 0) newIndex = buttons.length - 1;
            if (newIndex >= buttons.length) newIndex = 0;

            console.log(`[MenuNav] New Index: ${newIndex}`);

            // Update Selection
            window.UIManager.dialogPanel.selectedIndex = newIndex;

            // VISUAL FEEDBACK
            // Clear valid previous hover states manually (since virtual cursor might fight us)
            // We will FORCE the hover state on the target button
            buttons.forEach((btn, idx) => {
                const isSelected = (idx === newIndex);
                if (isSelected) {
                    // Simulate pointerover
                    if (btn.bg && btn.bg.setFillStyle) {
                        btn.bg.setFillStyle(0x444444);
                    }

                    // Move Virtual Cursor to this button (if it exists) to sync them
                    if (window.virtualCursor && btn.bg) {
                        const center = btn.bg.getCenter();
                        window.virtualCursor.setPosition(center.x, center.y);
                        // Update hover state in controller to match
                        // Force immediate update to register this as 'lastHoveredItem'
                        if (typeof updateVirtualCursorHover === 'function') {
                            updateVirtualCursorHover();
                        }
                    }
                } else {
                    // Simulate pointerout
                    if (btn.bg && btn.bg.setFillStyle) {
                        btn.bg.setFillStyle(0x333333);
                    }
                }
            });

            if (typeof playSound === 'function') playSound('ui_hover');
        } else {
            console.log(`[MenuNav] No dialog buttons found.`);
        }
    } else if (window.newQuestModal || window.questCompletedModal || window.questPreviewModal) {
        // QUEST MODAL NAVIGATION
        const modal = window.newQuestModal || window.questCompletedModal || window.questPreviewModal;
        let buttons = [];

        if (window.newQuestModal) {
            if (modal.acceptBtn) buttons.push(modal.acceptBtn);
            if (modal.cancelBtn) buttons.push(modal.cancelBtn);
        } else if (window.questCompletedModal) {
            if (modal.closeBtn) buttons.push(modal.closeBtn);
        } else if (window.questPreviewModal) {
            if (modal.acceptBtn) buttons.push(modal.acceptBtn);
            if (modal.declineBtn) buttons.push(modal.declineBtn);
        }

        if (buttons.length === 0) return;

        // Initialize index if missing
        if (typeof modal.selectedIndex === 'undefined') {
            modal.selectedIndex = -1;
        }

        let currentIndex = modal.selectedIndex;
        let newIndex = currentIndex + direction;

        // Wrap around
        if (newIndex < 0) newIndex = buttons.length - 1;
        if (newIndex >= buttons.length) newIndex = 0;

        modal.selectedIndex = newIndex;
        console.log(`[MenuNav] Quest Modal Index: ${newIndex}`);

        // Visual Feedback & Sync Cursor
        buttons.forEach((btn, idx) => {
            const isSelected = (idx === newIndex);

            // We use the button's own event handlers for hover effects
            if (isSelected) {
                // Emit pointerover to trigger existing hover effects (color change, etc.)
                if (btn.emit) btn.emit('pointerover');

                // Move Virtual Cursor
                if (window.virtualCursor) {
                    const center = btn.getCenter();
                    window.virtualCursor.setPosition(center.x, center.y);
                    if (typeof updateVirtualCursorHover === 'function') {
                        updateVirtualCursorHover();
                    }
                }
            } else {
                // Emit pointerout to reset state
                if (btn.emit) btn.emit('pointerout');

                // Fallback: If setTint was used and no event handler exists (shouldn't be needed for rectangles)
                if (btn.clearTint) btn.clearTint();
            }
        });

        if (typeof playSound === 'function') playSound('ui_hover');


    } else if (window.UIManager && window.UIManager.settingsVisible && window.UIManager.settingsPanel) {
        // SETTINGS NAVIGATION
        navigateSettings(direction);
    } else {
        console.log(`[MenuNav] No active menu for navigation.`);
    }
};

/**
 * Handle navigation specific to Settings Panel (Sliders, Selectors, Checkboxes)
 */
function navigateSettings(direction) {
    if (!window.UIManager || !window.UIManager.settingsPanel) return;

    const panel = window.UIManager.settingsPanel;
    const items = panel.interactiveItems;
    if (!items || items.length === 0) return;

    let currentIndex = panel.selectedIndex;
    if (typeof currentIndex === 'undefined') currentIndex = -1;

    // Calculate new index
    let newIndex = currentIndex + direction;

    // Wrap around
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;

    panel.selectedIndex = newIndex;
    updateSettingsHighlight(panel);
}

/**
 * Update the visual highlight for Settings Panel
 */
function updateSettingsHighlight(panel) {
    const items = panel.interactiveItems;
    const selectedIndex = panel.selectedIndex;

    // Find the currently selected item
    const selectedItem = items[selectedIndex];

    // Reset all highlights
    items.forEach((item, idx) => {
        const isSelected = (idx === selectedIndex);

        // Highlight logic depends on type
        if (item.bg) {
            if (isSelected) {
                item.bg.setStrokeStyle(2, 0xffff00); // Yellow highlight
                if (item.bg.setFillStyle && item.type === 'button') item.bg.setFillStyle(0x444444);
            } else {
                item.bg.setStrokeStyle(1, 0x666666); // Default gray
                if (item.bg.setFillStyle && item.type === 'button') item.bg.setFillStyle(isCloseBtn(item) ? 0x444444 : 0x330000); // Need original color reference really...
                // Simpler fallback: just stroke restoration
            }
        }
    });

    // Move Virtual Cursor
    if (window.virtualCursor && selectedItem) {
        let target = selectedItem.bg || selectedItem.thumb;
        if (target) {
            const center = target.getCenter();
            window.virtualCursor.setPosition(center.x, center.y);
            if (typeof updateVirtualCursorHover === 'function') updateVirtualCursorHover();
        }
    }

    if (typeof playSound === 'function') playSound('ui_hover');
}

// Helper to guess color restoration (imperfect but functional)
function isCloseBtn(item) { return item.id === 'close'; }

/**
 * Handle Left/Right/Confirmation Input for Settings
 * @param {string} action - 'left', 'right', 'confirm'
 */
window.handleSettingsInput = function (action) {
    if (!window.UIManager || !window.UIManager.settingsPanel || !window.UIManager.settingsVisible) return false;

    const panel = window.UIManager.settingsPanel;
    const index = panel.selectedIndex;
    if (typeof index === 'undefined' || index < 0 || !panel.interactiveItems) return false;

    const item = panel.interactiveItems[index];
    if (!item) return false;

    if (item.type === 'slider') {
        if (action === 'left' || action === 'right') {
            const step = 0.1; // 10% step
            let currentVal = item.getValue();
            if (action === 'left') currentVal -= step;
            if (action === 'right') currentVal += step;
            item.setValue(currentVal);
            if (typeof playSound === 'function') playSound('ui_click'); // Soft click for slider
            return true;
        }
    } else if (item.type === 'selector') {
        if (action === 'left' || action === 'right') {
            // Cycle through options
            const currentVal = item.getValue();
            const optionKeys = item.options.map(o => o.key);
            let optIdx = optionKeys.indexOf(currentVal);

            if (action === 'left') optIdx--;
            if (action === 'right') optIdx++;

            // Wrap options
            if (optIdx < 0) optIdx = optionKeys.length - 1;
            if (optIdx >= optionKeys.length) optIdx = 0;

            item.select(optionKeys[optIdx]);
            return true;
        }
    } else if (item.type === 'checkbox') {
        if (action === 'confirm' || action === 'left' || action === 'right') {
            // Checkboxes can be toggled by any of these usually
            item.toggle();
            if (typeof playSound === 'function') playSound('ui_click');
            return true;
        }
    } else if (item.type === 'button') {
        if (action === 'confirm') {
            item.action();
            // Sound usually played by action itself
            return true;
        }
    }

    return false;
};
