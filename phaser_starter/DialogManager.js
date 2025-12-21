/**
 * DialogManager - Handles NPC dialog rendering and player choices
 * 
 * Manages dialog trees, conditional display based on game state,
 * branching choices, and quest acceptance through dialog.
 */
class DialogManager {
    constructor(scene) {
        this.scene = scene;
        this.data = null;
        this.enabledDialogs = new Set();
        this.dialogFlags = new Set(); // Tracks flags set by dialog choices

        // Dialog state
        this.isDialogActive = false;
        this.currentDialog = null;
        this.currentLineIndex = 0;
        this.currentNpcId = null;

        // UI elements (created when dialog starts)
        this.dialogContainer = null;
        this.dialogBox = null;
        this.speakerText = null;
        this.dialogText = null;
        this.portraitImage = null;
        this.responseButtons = [];
        this.continuePrompt = null;
    }

    /**
     * Initialize data from Phaser cache and load saved flags
     */
    init() {
        this.data = this.scene.cache.json.get('dialogData');
        if (!this.data) {
            console.error('DialogManager: Failed to load dialogData from cache');
            return;
        }

        // Load saved dialog flags
        this.loadFlags();

        console.log('DialogManager initialized with', Object.keys(this.data.dialogs || {}).length, 'dialogs');
    }

    /**
     * Load dialog flags from localStorage
     */
    loadFlags() {
        try {
            const saved = localStorage.getItem('rpg_dialog_flags');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.dialogFlags = new Set(parsed);
            }
        } catch (e) {
            console.warn('DialogManager: Failed to load saved dialog flags', e);
        }
    }

    /**
     * Save dialog flags to localStorage
     */
    saveFlags() {
        try {
            localStorage.setItem('rpg_dialog_flags', JSON.stringify([...this.dialogFlags]));
        } catch (e) {
            console.warn('DialogManager: Failed to save dialog flags', e);
        }
    }

    /**
     * Set a flag (used by dialog choices)
     */
    setFlag(flag) {
        this.dialogFlags.add(flag);
        this.saveFlags();
    }

    /**
     * Check if a flag is set
     */
    hasFlag(flag) {
        return this.dialogFlags.has(flag);
    }

    /**
     * Enable a dialog (called by MilestoneManager)
     */
    enableDialog(dialogId) {
        this.enabledDialogs.add(dialogId);
        console.log('Dialog enabled:', dialogId);
    }

    /**
     * Get the best available dialog for an NPC
     * Returns the highest priority dialog that matches conditions
     */
    getAvailableDialog(npcId) {
        if (!this.data || !this.data.dialogs) return null;

        const dialogs = Object.values(this.data.dialogs);
        const npcDialogs = dialogs.filter(d => d.npcId === npcId);

        // Filter by conditions and sort by priority
        const available = npcDialogs
            .filter(d => this.checkConditions(d.conditions))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));

        return available.length > 0 ? available[0] : null;
    }

    /**
     * Check if dialog conditions are met
     */
    checkConditions(conditions) {
        if (!conditions) return true;

        // Check required quests/flags
        if (conditions.requires && conditions.requires.length > 0) {
            for (const req of conditions.requires) {
                // Check if it's a quest ID or a flag
                if (!this.isRequirementMet(req)) {
                    return false;
                }
            }
        }

        // Check NOT conditions (must not have these)
        if (conditions.requiresNot && conditions.requiresNot.length > 0) {
            for (const notReq of conditions.requiresNot) {
                if (this.isRequirementMet(notReq)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if a requirement (quest or flag) is met
     */
    isRequirementMet(requirement) {
        // Check dialog flags first
        if (this.dialogFlags.has(requirement)) {
            return true;
        }

        // Check if it's a completed quest
        if (this.scene.playerStats?.questStats?.completedQuests) {
            if (this.scene.playerStats.questStats.completedQuests.includes(requirement)) {
                return true;
            }
        }

        // Also check active quests (for quest_accepted type checks)
        if (this.scene.quests?.active) {
            const activeIds = this.scene.quests.active.map(q => q.id);
            if (activeIds.includes(requirement)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Start a dialog with an NPC
     */
    startDialog(npcId, forcedDialogId = null) {
        const dialog = forcedDialogId
            ? this.data.dialogs[forcedDialogId]
            : this.getAvailableDialog(npcId);

        if (!dialog) {
            console.log('No available dialog for NPC:', npcId);
            return false;
        }

        this.currentDialog = dialog;
        this.currentNpcId = npcId;
        this.currentLineIndex = 0;
        this.isDialogActive = true;

        // Create dialog UI
        this.createDialogUI();

        // Show first line
        this.showLine(dialog.lines[0]);

        // Emit dialog started event
        if (this.scene.events) {
            this.scene.events.emit('dialog_started', { npcId, dialogId: dialog.id });
        }

        return true;
    }

    /**
     * Create the dialog UI elements
     */
    createDialogUI() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Container for all dialog elements
        this.dialogContainer = this.scene.add.container(0, 0);
        this.dialogContainer.setDepth(10000); // Above everything
        this.dialogContainer.setScrollFactor(0);

        // Semi-transparent background overlay
        const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
        this.dialogContainer.add(overlay);

        // Dialog box dimensions
        const boxWidth = width * 0.85;
        const boxHeight = 180;
        const boxX = width / 2;
        const boxY = height - boxHeight / 2 - 20;

        // Dialog box background
        this.dialogBox = this.scene.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0x1a1a2e, 0.95);
        this.dialogBox.setStrokeStyle(3, 0x4a4a8a);
        this.dialogContainer.add(this.dialogBox);

        // Portrait area (left side)
        const portraitSize = 120;
        const portraitX = boxX - boxWidth / 2 + portraitSize / 2 + 15;
        const portraitY = boxY;

        // Portrait background
        const portraitBg = this.scene.add.rectangle(portraitX, portraitY, portraitSize, portraitSize, 0x2a2a4e);
        portraitBg.setStrokeStyle(2, 0x6a6aba);
        this.dialogContainer.add(portraitBg);

        // Portrait image (will be set when showing line)
        this.portraitImage = this.scene.add.image(portraitX, portraitY, '__DEFAULT');
        this.portraitImage.setDisplaySize(portraitSize - 10, portraitSize - 10);
        this.portraitImage.setVisible(false);
        this.dialogContainer.add(this.portraitImage);

        // Text area (right of portrait)
        const textX = portraitX + portraitSize / 2 + 20;
        const textWidth = boxWidth - portraitSize - 60;

        // Speaker name
        this.speakerText = this.scene.add.text(textX, boxY - boxHeight / 2 + 20, '', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#FFD700',
            fontStyle: 'bold'
        });
        this.dialogContainer.add(this.speakerText);

        // Dialog text
        this.dialogText = this.scene.add.text(textX, boxY - boxHeight / 2 + 50, '', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            wordWrap: { width: textWidth },
            lineSpacing: 6
        });
        this.dialogContainer.add(this.dialogText);

        // Continue prompt (shown when clicking advances dialog)
        this.continuePrompt = this.scene.add.text(boxX + boxWidth / 2 - 80, boxY + boxHeight / 2 - 25,
            'Click to continue...', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#888888',
            fontStyle: 'italic'
        });
        this.continuePrompt.setVisible(false);
        this.dialogContainer.add(this.continuePrompt);

        // Click handler for advancing dialog
        overlay.setInteractive();
        this.dialogBox.setInteractive();
        overlay.on('pointerdown', () => this.onDialogClick());
        this.dialogBox.on('pointerdown', () => this.onDialogClick());
    }

    /**
     * Show a specific dialog line
     */
    showLine(line) {
        // Update speaker
        this.speakerText.setText(line.speaker || '');

        // Update dialog text
        this.dialogText.setText(line.text || '');

        // Update portrait if available
        if (this.currentDialog.portrait) {
            try {
                // Check if portrait texture exists
                const portraitKey = 'portrait_' + this.currentDialog.id;
                if (this.scene.textures.exists(portraitKey)) {
                    this.portraitImage.setTexture(portraitKey);
                    this.portraitImage.setVisible(true);
                } else if (this.scene.textures.exists(this.currentDialog.portrait)) {
                    this.portraitImage.setTexture(this.currentDialog.portrait);
                    this.portraitImage.setVisible(true);
                } else {
                    this.portraitImage.setVisible(false);
                }
            } catch (e) {
                this.portraitImage.setVisible(false);
            }
        } else {
            this.portraitImage.setVisible(false);
        }

        // Clear any existing response buttons
        this.clearResponseButtons();

        // Check if this line has responses (choices)
        if (line.responses && line.responses.length > 0) {
            this.showResponses(line.responses);
            this.continuePrompt.setVisible(false);
        } else if (line.action === 'end_dialog') {
            // End dialog on click
            this.continuePrompt.setText('Click to close...');
            this.continuePrompt.setVisible(true);
        } else if (line.next !== undefined) {
            // Has next line
            this.continuePrompt.setText('Click to continue...');
            this.continuePrompt.setVisible(true);
        } else {
            // Default: end dialog
            this.continuePrompt.setText('Click to close...');
            this.continuePrompt.setVisible(true);
        }
    }

    /**
     * Show response buttons for player choices
     */
    showResponses(responses) {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        const boxY = height - 100;
        const buttonWidth = width * 0.75;
        const buttonHeight = 35;
        const startY = boxY - 20 - (responses.length * (buttonHeight + 8)) / 2;

        responses.forEach((response, index) => {
            const buttonY = startY + index * (buttonHeight + 8);

            // Button background
            const button = this.scene.add.rectangle(width / 2, buttonY, buttonWidth, buttonHeight, 0x2a4a6a, 0.95);
            button.setStrokeStyle(2, 0x4a8aba);
            button.setInteractive({ useHandCursor: true });

            // Button text
            const buttonText = this.scene.add.text(width / 2, buttonY, response.text, {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#FFFFFF'
            });
            buttonText.setOrigin(0.5);

            // Hover effects
            button.on('pointerover', () => {
                button.setFillStyle(0x3a6a9a, 0.95);
            });
            button.on('pointerout', () => {
                button.setFillStyle(0x2a4a6a, 0.95);
            });

            // Click handler
            button.on('pointerdown', () => {
                this.handleResponse(response);
            });

            this.dialogContainer.add(button);
            this.dialogContainer.add(buttonText);
            this.responseButtons.push({ button, text: buttonText });
        });
    }

    /**
     * Clear response buttons
     */
    clearResponseButtons() {
        for (const rb of this.responseButtons) {
            rb.button.destroy();
            rb.text.destroy();
        }
        this.responseButtons = [];
    }

    /**
     * Handle a player response choice
     */
    handleResponse(response) {
        // Set any flags from this choice
        if (response.setFlag) {
            this.setFlag(response.setFlag);
        }

        // Handle actions
        if (response.action === 'accept_quest' && response.questId) {
            this.acceptQuest(response.questId);
        }

        // Navigate to next line or end
        if (response.next !== undefined) {
            this.currentLineIndex = response.next;
            this.showLine(this.currentDialog.lines[response.next]);
        } else {
            this.endDialog();
        }
    }

    /**
     * Handle click on dialog (for continuing)
     */
    onDialogClick() {
        if (!this.isDialogActive || !this.currentDialog) return;

        // Ignore if response buttons are showing
        if (this.responseButtons.length > 0) return;

        const currentLine = this.currentDialog.lines[this.currentLineIndex];

        // Check for end action
        if (currentLine.action === 'end_dialog' || currentLine.action === 'complete_dialog') {
            this.endDialog();
            return;
        }

        // Go to next line
        if (currentLine.next !== undefined) {
            this.currentLineIndex = currentLine.next;
            this.showLine(this.currentDialog.lines[currentLine.next]);
        } else {
            this.endDialog();
        }
    }

    /**
     * Accept a quest from dialog
     */
    acceptQuest(questId) {
        console.log('Accepting quest from dialog:', questId);

        // Set flag for this quest being accepted
        this.setFlag(questId + '_accepted');

        // Emit event for quest system
        if (this.scene.events) {
            this.scene.events.emit('dialog_accept_quest', questId);
        }

        // Try to directly add quest if quest system is available
        if (this.scene.activateMainQuest) {
            this.scene.activateMainQuest(questId);
        }
    }

    /**
     * End the current dialog
     */
    endDialog() {
        this.isDialogActive = false;

        // Clean up UI
        if (this.dialogContainer) {
            this.dialogContainer.destroy();
            this.dialogContainer = null;
        }

        this.currentDialog = null;
        this.currentNpcId = null;
        this.currentLineIndex = 0;
        this.responseButtons = [];

        // Emit dialog ended event
        if (this.scene.events) {
            this.scene.events.emit('dialog_ended');
        }
    }

    /**
     * Check if dialog is currently active
     */
    isActive() {
        return this.isDialogActive;
    }

    /**
     * Reset all dialog flags (for new game)
     */
    resetProgress() {
        this.dialogFlags.clear();
        this.enabledDialogs.clear();
        this.saveFlags();
        this.endDialog();
    }
}

// Export for global use
window.DialogManager = DialogManager;
