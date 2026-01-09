/**
 * DialogManager.js
 * Extracted from game.js
 * Handles dialog logic, loading, conditions, and quest integration.
 * Rendering is handled by UIManager_v2.js.
 */

window.DialogManager = {
    scene: null,
    dialogDatabase: {},
    currentDialog: null,
    currentDialogNode: null,
    currentDialogNPC: null,

    // Legacy support for "unlocks" (from old DialogManager.js)
    enabledDialogs: new Set(),

    init(scene) {
        this.scene = scene;
        this.loadProgress();
        // Listen for UQE events if needed?
    },

    /**
     * Load dialogs from JSON file
     */
    async loadDialogs() {
        console.warn('🔄 DialogManager: loadDialogs() started...');
        try {
            const response = await fetch('dialogs.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.dialogDatabase = await response.json();
            console.warn('✅ DialogManager: Dialogs loaded successfully:', Object.keys(this.dialogDatabase).length);
            console.warn('🔑 Loaded Keys:', Object.keys(this.dialogDatabase).join(', '));
        } catch (e) {
            console.error('❌ Failed to load dialogs.json:', e);
            // Fallback to empty generic dialog
            this.dialogDatabase = {
                'generic_npc': {
                    npcName: 'NPC',
                    npcTitle: 'Villager',
                    nodes: {
                        'start': { text: 'Hello there!', choices: [{ text: 'Goodbye', next: 'end' }] },
                        'end': { text: 'Farewell.', choices: [] }
                    }
                }
            };
        }
    },

    /**
     * Deep clone dialog data while preserving functions
     */
    deepCloneDialog(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (typeof obj === 'function') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.deepCloneDialog(item));

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepCloneDialog(obj[key]);
            }
        }
        return cloned;
    },

    /**
     * Evaluate a condition string from dialogs.json
     */
    evaluateDialogCondition(conditionStr, stats) {
        if (!conditionStr) return true;

        const parts = conditionStr.split(':');
        const type = parts[0];
        // For quest_objective it is Q:O, so we might need full parts
        const param = parts.slice(1).join(':');

        switch (type) {
            case 'quest_available':
                if (window.isQuestActive(param) || window.isQuestCompleted(param)) return false;
                if (window.uqe && window.uqe.allDefinitions) {
                    const def = window.uqe.allDefinitions[param];
                    if (def && def.requires) {
                        const prereqMet = window.uqe.completedQuests.some(q => q.id === def.requires);
                        if (!prereqMet) return false;
                    }
                }
                return true;

            case 'quest_active':
                return window.isQuestActive(param);

            case 'quest_completed':
                return window.isQuestCompleted(param);

            case 'quest_not_active':
                return !window.isQuestActive(param);

            case 'quest_not_completed':
                return !window.isQuestCompleted(param);

            case 'has_available_quest':
                return stats.quests && stats.quests.available &&
                    stats.quests.available.some(q => q.giver === param);

            case 'level_at_least':
                return stats.level >= parseInt(param);

            case 'has_item':
                return stats.inventory && stats.inventory.some(item => item.id === param);

            case 'gold_at_least':
                return stats.gold >= parseInt(param);

            case 'quest_can_complete':
                if (!window.isQuestActive(param)) return false;
                if (window.uqe) {
                    const quest = window.uqe.activeQuests.find(q => q.id === param);
                    if (quest) {
                        const incomplete = quest.objectives.filter(o => !o.isComplete());
                        if (incomplete.length === 0) return true;
                        const nonTalkIncomplete = incomplete.filter(o => o.type !== 'talk');
                        return nonTalkIncomplete.length === 0;
                    }
                }
                return false;

            case 'quest_objective_active':
            case 'quest_objective_complete':
                if (parts.length < 3) return false;
                const qId = parts[1];
                const oId = parts[2];

                if (!window.isQuestActive(qId)) return false;
                if (window.uqe) {
                    const quest = window.uqe.activeQuests.find(q => q.id === qId);
                    if (quest) {
                        const obj = quest.objectives.find(o => o.id === oId);
                        if (type === 'quest_objective_active') return obj && !obj.isComplete();
                        return obj && obj.isComplete();
                    }
                }
                return false;

            default:
                console.warn(`Unknown dialog condition type: ${type}`);
                return true;
        }
    },

    /**
     * Start dialog with an NPC
     */
    startDialog(npc) {
        this.currentDialogNPC = npc;
        window.currentDialogNPC = npc; // Sync global

        let dialogData = this.dialogDatabase[npc.dialogId];

        if (!dialogData) {
            console.warn(`[Dialog] Data NOT FOUND for ${npc.dialogId}`);
            if (typeof addChatMessage === 'function') addChatMessage(`[DEBUG] Missing dialog: ${npc.dialogId}`, 0xff0000);
            dialogData = this.dialogDatabase['generic_npc'];
        }

        if (!dialogData) {
            console.error(`[Dialog] CRITICAL: 'generic_npc' fallback missing! Using hardcoded emergency dialog.`);
            dialogData = {
                npcName: "Unknown",
                nodes: {
                    start: {
                        text: "...",
                        choices: [{ text: "Leave", next: null }]
                    }
                }
            };
        } else {
            // if (typeof addChatMessage === 'function') addChatMessage(`[DEBUG] Starting dialog: ${npc.name}`, 0x00ff00);
        }

        const activeDialog = this.deepCloneDialog(dialogData);
        activeDialog.npcName = npc.name || activeDialog.npcName;
        activeDialog.npcTitle = npc.title || activeDialog.npcTitle;

        // UQE Bridge Event
        if (typeof uqe !== 'undefined') {
            uqe.eventBus.emit('NPC_TALK', { id: npc.name });
            uqe.update();
        }

        // Quest Injection
        if (typeof window.uqe !== 'undefined' && window.uqe.allDefinitions) {
            this.injectQuestChoices(activeDialog, npc);
            console.warn('QUEST INJECTION:', activeDialog.nodes.start.choices); // DEBUG
        }

        this.currentDialog = activeDialog;
        this.currentDialogNode = 'start';

        // Sync Globals
        window.currentDialog = activeDialog;
        window.currentDialogNode = 'start';
        window.dialogVisible = true;

        if (window.UIManager) {
            if (typeof window.UIManager.createDialogUI === 'function') {
                window.UIManager.createDialogUI(npc);
                window.UIManager.showDialogNode('start');
            }
        }
    },

    /**
     * Close the current dialog
     */
    closeDialog() {
        this.currentDialog = null;
        this.currentDialogNode = null;
        this.currentDialogNPC = null;

        // Sync Globals
        window.currentDialog = null;
        window.currentDialogNode = null;
        window.dialogVisible = false;

        if (window.UIManager && typeof window.UIManager.closeDialog === 'function') {
            window.UIManager.closeDialog();
        }
    },

    injectQuestChoices(activeDialog, npc) {
        const uqe = window.uqe;
        const uqeCompletedIds = uqe.completedQuests.map(q => q.id);
        const uqeActiveIds = uqe.activeQuests.map(q => q.id);

        // 1. STATUS for ACTIVE quests
        uqe.activeQuests.forEach(quest => {
            const def = uqe.allDefinitions[quest.id];

            // 1a. AUTO-COMPLETE 'talk' objectives just by opening dialog
            const pendingTalkObj = quest.objectives.find(o => !o.completed && o.type === 'talk' && o.npcId === npc.name);
            if (pendingTalkObj) {
                if (window.uqe) {
                    window.uqe.completeObjective(quest.id, pendingTalkObj.id);
                    // Force save immediately
                    if (window.saveGame) window.saveGame(null, false, "Objective Updated Autosave");
                }
            }

            if (def && def.giver === npc.name) {
                // Force update status after auto-complete
                if (typeof quest.checkCompletion === 'function') quest.checkCompletion();

                // Use robust method check first, fallback to property check
                const isReadyForTurnIn = (typeof quest.canComplete === 'function')
                    ? quest.canComplete()
                    : quest.objectives.every(o => o.completed);

                if (isReadyForTurnIn) {
                    activeDialog.nodes.start.choices.unshift({
                        text: `[Complete] ${quest.title}`,
                        isQuest: true, questState: 'turnin', action: 'complete_quest', questId: quest.id
                    });
                } else {
                    activeDialog.nodes.start.choices.unshift({
                        text: `About ${quest.title}...`, next: `quest_status_${quest.id}`,
                        isQuest: true, questState: 'active'
                    });
                    activeDialog.nodes[`quest_status_${quest.id}`] = {
                        text: `How goes the task? Remember: ${quest.description}`,
                        choices: [{ text: 'I\'m working on it.', next: 'start' }]
                    };
                }
            }

            // (Removed manual Speak button injection since it's now auto-completed)
        });

        // 2. Available Quests
        const npcQuests = Object.values(uqe.allDefinitions).filter(q => q.giver === npc.name);
        npcQuests.forEach(questDef => {
            const isActive = uqeActiveIds.includes(questDef.id);
            const isCompleted = uqeCompletedIds.includes(questDef.id);
            let prereqMet = true;
            if (questDef.requires) prereqMet = uqeCompletedIds.includes(questDef.requires);

            if (!isActive && !isCompleted && prereqMet) {
                activeDialog.nodes.start.choices.unshift({
                    text: questDef.title, isQuest: true, questState: 'available',
                    action: 'quest_accept_v2', questId: questDef.id, next: 'quest_accepted',
                    condition: (stats) => !window.isQuestActive(questDef.id) && !window.isQuestCompleted(questDef.id)
                });
                if (!activeDialog.nodes.quest_accepted) {
                    activeDialog.nodes.quest_accepted = {
                        text: `Excellent. Here's what I need you to do: ${questDef.description}`,
                        choices: [{ text: 'I\'ll get right on it', next: 'end' }]
                    };
                }
            }
        });

        console.warn('📋 Final Dialog Choices:', activeDialog.nodes.start.choices.map(c => c.text));
    },

    // --- Legacy "Unlock" Logic ---

    enableDialog(dialogId) {
        if (!this.enabledDialogs.has(dialogId)) {
            console.log(`💬 Unlocking dialog option: ${dialogId}`);
            this.enabledDialogs.add(dialogId);
            this.saveProgress();
            if (this.scene && this.scene.events) this.scene.events.emit('dialog_unlocked', dialogId);
        }
    },
    isDialogEnabled(dialogId) { return this.enabledDialogs.has(dialogId); },
    loadProgress() {
        try {
            const saved = localStorage.getItem('rpg_dialog_unlocks');
            if (saved) JSON.parse(saved).forEach(id => this.enabledDialogs.add(id));
        } catch (e) { console.warn('DialogManager: Failed to load progress', e); }
    },
    saveProgress() {
        try {
            localStorage.setItem('rpg_dialog_unlocks', JSON.stringify(Array.from(this.enabledDialogs)));
        } catch (e) { console.warn('DialogManager: Failed to save progress', e); }
    }
};


// Global Aliases for Compatibility
window.loadDialogs = () => window.DialogManager.loadDialogs();
window.startDialog = (npc) => window.DialogManager.startDialog(npc);
window.closeDialog = () => window.DialogManager.closeDialog();
window.evaluateDialogCondition = (str, stats) => window.DialogManager.evaluateDialogCondition(str, stats);

// Move showQuestPreviewModalEnhanced here as it is tightly coupled with quest acceptance dialogs
window.showQuestPreviewModalEnhanced = function (questId, onAccept, onDecline) {
    if (typeof debugLog === 'function') debugLog(`[Quest Debug] START showQuestPreviewModalEnhanced for ${questId}`);
    const scene = (window.game && window.game.scene) ? window.game.scene.scenes[0] : null;
    if (!scene) return;

    const uqe = window.uqe;
    // Get quest definition from UQE
    const questDef = uqe && uqe.allDefinitions ? uqe.allDefinitions[questId] : null;
    if (!questDef) {
        console.error(`Quest ${questId} not found in UQE definitions`);
        if (onDecline) onDecline();
        return;
    }

    // Hide any existing preview modal
    if (window.questPreviewModal) {
        if (window.questPreviewModal.destroy) window.questPreviewModal.destroy();
        window.questPreviewModal = null;
    }

    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;

    // Adjusted dimensions for vertical layout
    const modalWidth = 600;
    const portraitHeight = 150;
    const padding = 20;
    const contentHeight = 350; // Text area
    const modalHeight = portraitHeight + contentHeight; // Total height ~500

    // Background overlay
    const overlay = scene.add.rectangle(centerX, centerY, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.70)
        .setScrollFactor(0).setDepth(2100).setInteractive();

    // Modal background
    const modalBg = scene.add.rectangle(centerX, centerY, modalWidth, modalHeight, 0x111111, 0.98)
        .setScrollFactor(0).setDepth(2101).setStrokeStyle(3, 0xffd700);

    const elements = [overlay, modalBg];

    // Top Y coordinate of the modal
    const modalTopY = centerY - modalHeight / 2;
    let currentY = modalTopY + padding;

    // --- Portrait Section (Top) ---
    // Lookup NPC using registry
    let npc = null;
    if (typeof npcRegistry !== 'undefined' && questDef.giver) {
        npc = npcRegistry[questDef.giver];
    }

    // Check if portrait exists
    if (npc && npc.portraitKey && scene.textures.exists(npc.portraitKey)) {
        // Portrait dimensions
        const targetWidth = modalWidth - 20; // 580
        const centerPortraitY = modalTopY + portraitHeight / 2 + 10;

        // Add container/background for portrait area
        const portraitBg = scene.add.rectangle(centerX, centerPortraitY, targetWidth, portraitHeight, 0x222222)
            .setScrollFactor(0).setDepth(2102);

        // Portrait Image
        const portrait = scene.add.image(centerX, centerPortraitY, npc.portraitKey)
            .setScrollFactor(0).setDepth(2102);

        // Scaling logic: "Cover" strategy
        const scaleX = targetWidth / portrait.width;
        portrait.setScale(scaleX);

        // Center the image vertically in the box
        portrait.setPosition(centerX, centerPortraitY);

        // MASKING
        const maskShape = scene.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.setScrollFactor(0);
        maskShape.fillRect(centerX - targetWidth / 2, centerPortraitY - portraitHeight / 2, targetWidth, portraitHeight);
        const mask = maskShape.createGeometryMask();
        portrait.setMask(mask);
        elements.push(maskShape); // Ensure destroy

        // Add a frame around portrait
        const portraitFrame = scene.add.rectangle(centerX, centerPortraitY, targetWidth, portraitHeight, 0x000000, 0)
            .setScrollFactor(0).setDepth(2104).setStrokeStyle(2, 0x444444);

        elements.push(portraitBg, portrait, portraitFrame);

        // NPC Name Overlay
        const nameY = centerPortraitY + portraitHeight / 2 - 15;
        const nameBg = scene.add.rectangle(centerX, nameY, targetWidth, 30, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(2103);

        const npcName = scene.add.text(centerX, nameY, npc.name, {
            fontSize: '18px', fill: '#ffd700', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(2104).setOrigin(0.5);

        elements.push(nameBg, npcName);
        currentY += portraitHeight + 30;
    } else {
        currentY += 40;
    }

    // --- Text Content ---

    // Header "QUEST OFFER"
    const header = scene.add.text(centerX, currentY, 'QUEST OFFER', {
        fontSize: '24px', fill: '#ffffff', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0.5, 0);
    elements.push(header);
    currentY += 35;

    // Quest title
    const questTitle = scene.add.text(centerX, currentY, questDef.title, {
        fontSize: '22px', fill: '#ffff00', fontStyle: 'bold',
        wordWrap: { width: modalWidth - 40 }, align: 'center'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0.5, 0);
    elements.push(questTitle);
    currentY += questTitle.height + 15;

    // Quest description
    const questDesc = scene.add.text(centerX, currentY, questDef.description || "No description available.", {
        fontSize: '15px', fill: '#cccccc',
        wordWrap: { width: modalWidth - 60 }, align: 'center'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0.5, 0);
    elements.push(questDesc);
    currentY += Math.max(60, questDesc.height + 20);

    // Objectives section
    const objLabel = scene.add.text(centerX - (modalWidth / 2) + 40, currentY, 'Objectives:', {
        fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0, 0);
    elements.push(objLabel);
    currentY += 25;

    if (questDef.objectives) {
        questDef.objectives.forEach(obj => {
            const objText = scene.add.text(centerX - (modalWidth / 2) + 50, currentY, `⏳ ${obj.label}: 0/${obj.target}`, {
                fontSize: '14px', fill: '#aaaaaa'
            }).setScrollFactor(0).setDepth(2103).setOrigin(0, 0);
            elements.push(objText);
            currentY += 20;
        });
    }

    // Rewards section
    currentY += 10;
    const rewardsLabel = scene.add.text(centerX - (modalWidth / 2) + 40, currentY, 'Rewards:', {
        fontSize: '16px', fill: '#ffd700', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0, 0);
    elements.push(rewardsLabel);
    currentY += 25;

    if (questDef.rewards) {
        let rewardStr = "";
        if (questDef.rewards.xp) rewardStr += `+${questDef.rewards.xp} XP  `;
        if (questDef.rewards.gold) rewardStr += `+${questDef.rewards.gold} Gold`;
        const rewardText = scene.add.text(centerX - (modalWidth / 2) + 50, currentY, rewardStr, {
            fontSize: '15px', fill: '#00ff00'
        }).setScrollFactor(0).setDepth(2103).setOrigin(0, 0);
        elements.push(rewardText);
    }

    // Buttons
    const btnY = centerY + modalHeight / 2 - 40;

    // Accept button
    const acceptBtn = scene.add.rectangle(centerX - 80, btnY, 140, 40, 0x00aa00, 1)
        .setScrollFactor(0).setDepth(2103).setStrokeStyle(2, 0x00ff00).setInteractive({ useHandCursor: true });
    const acceptBtnText = scene.add.text(centerX - 80, btnY, 'Accept', {
        fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2104).setOrigin(0.5);
    elements.push(acceptBtn, acceptBtnText);

    // Decline button
    const declineBtn = scene.add.rectangle(centerX + 80, btnY, 140, 40, 0x666666, 1)
        .setScrollFactor(0).setDepth(2103).setStrokeStyle(2, 0xaaaaaa).setInteractive({ useHandCursor: true });
    const declineBtnText = scene.add.text(centerX + 80, btnY, 'Decline', {
        fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2104).setOrigin(0.5);
    elements.push(declineBtn, declineBtnText);

    // Handlers
    const cleanup = () => {
        elements.forEach(e => e.destroy());
        window.questPreviewModal = null;
        if (scene) scene.lastWindowCloseTime = scene.time.now;
    };

    const acceptHandler = () => {
        cleanup();
        if (onAccept) onAccept();
    };

    const declineHandler = () => {
        cleanup();
        if (typeof playSound === 'function') playSound('quest_decline');
        if (onDecline) onDecline();
    };

    // Events
    acceptBtn.on('pointerover', () => acceptBtn.setFillStyle(0x00cc00));
    acceptBtn.on('pointerout', () => acceptBtn.setFillStyle(0x00aa00));
    acceptBtn.on('pointerdown', acceptHandler);

    declineBtn.on('pointerover', () => declineBtn.setFillStyle(0x888888));
    declineBtn.on('pointerout', () => declineBtn.setFillStyle(0x666666));
    declineBtn.on('pointerdown', declineHandler);

    window.questPreviewModal = {
        acceptBtn: acceptBtn,
        declineBtn: declineBtn,
        destroy: cleanup
    };

    // Animation
    scene.tweens.add({
        targets: elements,
        scale: { from: 0.95, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 200,
        ease: 'Back.out'
    });
};

