/**
 * DebugUtils.js
 * 
 * Developer commands for debugging quests, NPCs, and game state.
 * These tools are not part of the core game loop.
 */

// ========================================
// DEBUG QUEST COMMANDS
// ========================================
// Usage: Open browser console and type debugQuest.help()

const debugQuest = {
    /**
     * Show all debug commands
     */
    help: function () {
        debugLog(`
🔧 QUEST DEBUG COMMANDS
========================
debugQuest.listActive()          - Show all active quests
debugQuest.listCompleted()       - Show all completed quests  
debugQuest.listAll()             - Show all quest definitions
debugQuest.accept('quest_id')    - Accept a quest by ID
debugQuest.complete('quest_id')  - Force complete a quest
debugQuest.skip('quest_id')      - Skip to next quest in chain
debugQuest.setProgress('quest_id', amount) - Set objective progress
debugQuest.reset()               - Reset ALL quest progress
debugQuest.goto('quest_id')      - Reset and skip to specific quest
debugQuest.info('quest_id')      - Show detailed quest info
        `);
    },

    /**
     * List all active quests
     */
    listActive: function () {
        if (!window.uqe) { console.error('UQE not loaded'); return; }
        debugLog('📋 ACTIVE QUESTS:');
        window.uqe.activeQuests.forEach(q => {
            const progress = q.objectives.map(o => `${o.progress}/${o.target}`).join(', ');
            debugLog(`  [${q.id}] ${q.title} - Progress: ${progress}`);
        });
        return window.uqe.activeQuests.length;
    },

    /**
     * List all completed quests
     */
    listCompleted: function () {
        if (!window.uqe) { console.error('UQE not loaded'); return; }
        debugLog('✅ COMPLETED QUESTS:');
        window.uqe.completedQuests.forEach(q => {
            debugLog(`  [${q.id}] ${q.title}`);
        });
        return window.uqe.completedQuests.length;
    },

    /**
     * List all quest definitions
     */
    listAll: function () {
        if (!window.uqe) { console.error('UQE not loaded'); return; }
        debugLog('📚 ALL QUEST DEFINITIONS:');
        Object.keys(window.uqe.allDefinitions).forEach(id => {
            const def = window.uqe.allDefinitions[id];
            const requires = def.requires ? ` (requires: ${def.requires})` : '';
            debugLog(`  [${id}] ${def.title}${requires}`);
        });
        return Object.keys(window.uqe.allDefinitions).length;
    },

    /**
     * Accept a quest by ID
     */
    accept: function (questId) {
        if (!window.uqe) { console.error('UQE not loaded'); return; }
        if (!window.uqe.allDefinitions[questId]) {
            console.error(`Quest '${questId}' not found`);
            return false;
        }
        window.uqe.acceptQuest(questId);
        debugLog(`✅ Accepted quest: ${questId}`);
        if (window.updateQuestTrackerHUD) window.updateQuestTrackerHUD();
        return true;
    },

    /**
     * Force complete a quest
     */
    complete: function (questId) {
        if (!window.uqe) { console.error('UQE not loaded'); return; }
        const quest = window.uqe.activeQuests.find(q => q.id === questId);
        if (!quest) {
            console.error(`Quest '${questId}' not active`);
            return false;
        }
        // Mark all objectives complete
        quest.objectives.forEach(obj => {
            obj.progress = obj.target;
            obj.completed = true;
        });
        debugLog(`✅ Completed quest: ${questId} (will process on next update)`);
        window.uqe.update(); // Process completion immediately
        return true;
    },

    /**
     * Skip to next quest in chain
     */
    skip: function (questId) {
        if (!questId) {
            // Skip current active main quest
            const mainQuest = window.uqe.activeQuests.find(q => q.id.startsWith('main_'));
            if (mainQuest) {
                questId = mainQuest.id;
            } else {
                console.error('No active main quest to skip');
                return false;
            }
        }
        return this.complete(questId);
    },

    /**
     * Set objective progress for a quest
     */
    setProgress: function (questId, amount) {
        if (!window.uqe) { console.error('UQE not loaded'); return; }
        const quest = window.uqe.activeQuests.find(q => q.id === questId);
        if (!quest) {
            console.error(`Quest '${questId}' not active`);
            return false;
        }
        quest.objectives.forEach(obj => {
            obj.progress = Math.min(amount, obj.target);
            if (obj.progress >= obj.target) {
                obj.completed = true;
            }
        });
        debugLog(`📊 Set progress for ${questId}: ${amount}`);
        if (window.updateQuestTrackerHUD) window.updateQuestTrackerHUD();
        return true;
    },

    /**
     * Reset ALL quest progress (clears save data)
     */
    reset: function () {
        if (!window.uqe) { console.error('UQE not loaded'); return; }
        // Clear UQE state
        window.uqe.activeQuests.forEach(q => q.dispose());
        window.uqe.activeQuests = [];
        window.uqe.completedQuests = [];
        window.uqe.pendingQuests = [];
        // Clear localStorage
        localStorage.removeItem('rpg_quest_save');
        debugLog('🔄 Quest progress reset! Refresh the page to restart.');
        return true;
    },

    /**
     * Go to a specific quest (reset and skip to it)
     */
    goto: function (targetQuestId) {
        if (!window.uqe) { console.error('UQE not loaded'); return; }
        if (!window.uqe.allDefinitions[targetQuestId]) {
            console.error(`Quest '${targetQuestId}' not found`);
            return false;
        }

        // Find the chain of quests leading to target
        const chain = [];
        let currentId = targetQuestId;
        while (currentId) {
            const def = window.uqe.allDefinitions[currentId];
            chain.unshift(currentId);
            currentId = def.requires;
        }

        debugLog(`🎯 Quest chain to ${targetQuestId}:`, chain);

        // Reset and complete all prerequisites
        this.reset();

        // Accept and complete each prerequisite
        chain.slice(0, -1).forEach(id => {
            window.uqe.acceptQuest(id);
            const quest = window.uqe.activeQuests.find(q => q.id === id);
            if (quest) {
                quest.objectives.forEach(obj => {
                    obj.progress = obj.target;
                    obj.completed = true;
                });
            }
            // Force update to process completion
            window.uqe.update();
        });

        // Accept the target quest
        window.uqe.acceptQuest(targetQuestId);
        if (window.updateQuestTrackerHUD) window.updateQuestTrackerHUD();

        debugLog(`✅ Now at quest: ${targetQuestId}`);
        return true;
    },

    /**
     * Show detailed info about a quest
     */
    info: function (questId) {
        if (!window.uqe) { console.error('UQE not loaded'); return; }
        const def = window.uqe.allDefinitions[questId];
        if (!def) {
            console.error(`Quest '${questId}' not found`);
            return null;
        }
        debugLog(`
📜 QUEST INFO: ${def.title}
ID: ${questId}
Giver: ${def.giver || 'Unknown'}
Requires: ${def.requires || 'None'}
Description: ${def.description}
Objectives:`);
        def.objectives.forEach(obj => {
            debugLog(`  - [${obj.type}] ${obj.label} (target: ${obj.target})`);
        });
        debugLog(`Rewards: ${def.rewards.xp} XP, ${def.rewards.gold} Gold`);

        // Check if active
        const active = window.uqe.activeQuests.find(q => q.id === questId);
        if (active) {
            debugLog('Status: ACTIVE');
            active.objectives.forEach(obj => {
                debugLog(`  Progress: ${obj.progress}/${obj.target}`);
            });
        } else if (window.uqe.completedQuests.find(q => q.id === questId)) {
            debugLog('Status: COMPLETED');
        } else {
            debugLog('Status: NOT STARTED');
        }
        return def;
    }
};

// Attach to window for console access
window.debugQuest = debugQuest;
debugLog('🔧 Quest debug commands loaded. Type debugQuest.help() for usage.');

// ============================================
// DEBUG TOOLS
// ============================================
window.debugFixNPCs = function () {
    debugLog('🔧 Running NPC Fixer...');
    const scene = window.game ? window.game.scene.scenes[0] : null;
    if (!scene) {
        console.error('❌ Game scene not found!');
        return;
    }

    const npcData = scene.cache.json.get('npcData');
    if (!npcData) {
        console.error('❌ npcData not found in cache!');
        return;
    }

    debugLog(`Found ${npcData.length} NPC definitions in JSON.`);
    let updated = 0;

    // Check global npcs array (from GameState/window)
    if (window.npcs) {
        window.npcs.forEach(npc => {
            const def = npcData.find(d => d.id === npc.id);
            if (def) {
                // Check for mismatches
                if (npc.name !== def.name || npc.dialogId !== def.dialogId) {
                    debugLog(`Mismatch for ${npc.id}:`);
                    debugLog(`  Current: Name="${npc.name}", Dialog="${npc.dialogId}"`);
                    debugLog(`  Target:  Name="${def.name}", Dialog="${def.dialogId}"`);

                    npc.name = def.name;
                    npc.dialogId = def.dialogId;
                    if (npc.nameText) npc.nameText.setText(def.name);

                    debugLog('  ✅ Fixed!');
                    updated++;
                }
            } else {
                console.warn(`⚠️ NPC ${npc.id} (${npc.name}) has no matching definition in JSON!`);
            }
        });
    }

    // Force save
    if (typeof window.saveGame === 'function') {
        window.saveGame();
        debugLog('💾 Game saved with fixed NPCs.');
    }

    debugLog(`🔧 Fix complete. Updated ${updated} NPCs.`);
    if (typeof window.addChatMessage === 'function') {
        window.addChatMessage(`Fixed ${updated} NPCs. Try talking now!`, 0x00ff00);
    }
};
