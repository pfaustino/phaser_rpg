/**
 * Unified Quest System (UQS) - Version 2.0
 * Event-driven, Composite-pattern based quest engine.
 */

class UqeEventBus {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        // Prevent duplicate aliases/listeners for the same event
        if (!this.listeners[event].includes(callback)) {
            this.listeners[event].push(callback);
        }
        // Return unsubscribe function
        return () => {
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        };
    }

    emit(event, data) {
        // Skip logging for high-frequency events
        if (event !== 'time_survived' && event !== 'tile_traveled') {
            // debugLog(`📡 [UQE EventBus] ${event}`, data);
        }
        if (this.listeners[event]) {
            // Clone array to prevent issues if listeners remove themselves during emission
            [...this.listeners[event]].forEach(callback => callback(data));
        }
    }
}

const UQE_EVENTS = {
    MONSTER_KILLED: 'monster_killed',
    ITEM_PICKUP: 'item_pickup',
    NPC_TALK: 'npc_talk',
    STAT_CHANGE: 'stat_change',
    QUEST_COMPLETED: 'quest_completed',
    QUEST_ACCEPTED: 'quest_accepted',
    QUEST_AVAILABLE: 'quest_available',
    OBJECTIVE_UPDATED: 'objective_updated',
    // New event types for additional objectives
    TILE_TRAVELED: 'tile_traveled',
    TIME_SURVIVED: 'time_survived',
    LEVEL_UP: 'level_up',
    GOLD_EARNED: 'gold_earned',
    LOCATION_EXPLORED: 'location_explored',
    INTERACT_OBJECT: 'interact_object'
};

class UqeObjective {
    constructor(data, eventBus) {
        this.eventBus = eventBus;
        this.id = data.id || Math.random().toString(36).substr(2, 9);
        this.definition = data; // Store full definition for access to custom props (ambientSound, etc)
        this.type = data.type;
        this.label = data.label || '';
        this.completed = false;
        this.progress = 0;
        this.target = data.target || 1;
        this.npcId = data.npcId; // Store npcId if present (for generic objectives like class_selection)
        this.cleanupFns = [];
    }

    // Helper to subscribe and track cleanup
    subscribe(event, callback) {
        if (this.eventBus) {
            const unsubscribe = this.eventBus.on(event, callback);
            this.cleanupFns.push(unsubscribe);
        }
    }

    dispose() {
        this.cleanupFns.forEach(fn => fn());
        this.cleanupFns = [];
    }

    updateProgress(amount) {
        if (this.completed) return;
        const prevProgress = this.progress;
        this.progress = Math.min(this.progress + amount, this.target);

        if (this.progress > prevProgress) {
            // debugLog(`📈 [UQE] Objective Progress: ${this.label} (${this.progress}/${this.target})`);
            if (this.eventBus) {
                this.eventBus.emit(UQE_EVENTS.OBJECTIVE_UPDATED, {
                    objective: this,
                    amount: amount
                });
            }
        }

        if (this.progress >= this.target) {
            this.completed = true;
            // debugLog(`✅ [UQE] Objective Complete: ${this.label}`);
        }
    }

    isComplete() {
        return this.completed;
    }

    getSaveData() {
        return {
            id: this.id,
            progress: this.progress,
            completed: this.completed
        };
    }

    rehydrate(saveData) {
        if (saveData && saveData.id === this.id) {
            this.progress = saveData.progress;
            this.completed = saveData.completed;
        }
    }
}

class KillObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.monsterId = data.monsterId;
        this.subscribe(UQE_EVENTS.MONSTER_KILLED, (data) => {
            // Support 'any' wildcard (match all monsters)
            if (this.monsterId === 'any') {
                this.updateProgress(1);
                return;
            }

            // Guard against undefined data
            if (!data || !data.id || !data.type) {
                console.warn('[UQE] KillObjective received incomplete data:', data);
                return;
            }

            const target = this.monsterId.toLowerCase();
            const killedId = data.id.toLowerCase();
            const killedType = data.type.toLowerCase();

            // 1. Exact ID match (e.g. "procedural_slime")
            // 2. Exact type match (e.g. "slime")
            // 3. Smart variant match (e.g. "prism slime" or "echo_mite" contains "slime" or "mite")
            const words = killedType.split(/[ _-]/);
            if (killedId === target || killedType === target || words.includes(target)) {
                this.updateProgress(1);
            }
        });
    }
}

class TalkObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.npcId = data.npcId;
        this.autoComplete = data.autoComplete !== false; // Default true if undefined

        this.subscribe(UQE_EVENTS.NPC_TALK, (data) => {
            // debugLog(`🗣️ [UQE] TalkObjective checking: '${this.npcId}' vs '${data.id}'`);

            // If autoComplete is disabled, ignore the event (must be completed manually)
            if (!this.autoComplete) {
                // console.warn(`🛑 [UQE] TalkObjective for ${this.npcId} requires manual completion. Ignoring event.`);
                return;
            }

            if (data.id === this.npcId) this.updateProgress(1);
        });
    }
}


class CollectObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.itemId = data.itemId;

        // Check if we already have the item (retroactive functionality)
        this.checkInventory();

        this.subscribe(UQE_EVENTS.ITEM_PICKUP, (data) => {
            // Match specific ID, type, or wildcard 'any'
            if (this.itemId === 'any' || data.id === this.itemId || data.type === this.itemId) {
                this.updateProgress(data.amount || 1);
            }
        });
    }

    checkInventory() {
        if (typeof playerStats !== 'undefined' && playerStats.inventory) {
            // Count items in inventory matching this.itemId
            const count = playerStats.inventory.reduce((acc, item) => {
                if (this.itemId === 'any' || item.id === this.itemId || item.type === this.itemId) {
                    return acc + (item.quantity || 1);
                }
                return acc;
            }, 0);

            // If we have items, update progress. 
            // Note: This assumes 'collect' means 'possess'.
            if (count > 0) {
                // Determine if we should set absolute progress or add.
                // Generally for 'possess', we want to ensure progress is at least what we have.
                // But updateProgress is incremental.
                // If progress is 0 and we have 1, updateProgress(1) -> 1.
                // If progress is 1 and we have 1, updateProgress(0) -> 1.

                // Let's rely on updateProgress logic, but we need to pass the DIFFERENCE if we want to sync, 
                // OR we just assume this check runs once at start.

                // Better approach: If current progress < count, add the difference.
                if (this.progress < count) {
                    this.updateProgress(count - this.progress);
                }
            }
        }
    }

    rehydrate(saveData) {
        super.rehydrate(saveData);
        // Re-check inventory on load to fix any desync or retroactive item acquisition
        this.checkInventory();
    }
}

class DynamicSpawnObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.itemId = data.itemId;
        this.spawnConfig = data.spawnConfig || {
            visualType: 'star',
            color: 0x00ffff,
            spawnRate: 0.02,
            maxNodes: 5,
            radius: 400
        };

        this.subscribe(UQE_EVENTS.ITEM_PICKUP, (data) => {
            if (data.id === this.itemId || data.type === this.itemId) {
                this.updateProgress(data.amount || 1);
            }
        });
    }
}

class ExploreObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.subscribe(UQE_EVENTS.TILE_TRAVELED, (data) => {
            this.updateProgress(data.amount || 1);
        });
    }
}

class ExploreLocationObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.zoneId = data.zoneId || data.locationId; // Support both naming conventions

        // IMMEDIATE CHECK: Are we already there?
        if (typeof window.MapManager !== 'undefined' && window.MapManager.currentMap === this.zoneId) {
            // We need to delay this slightly to ensure the quest is fully registered and UI is ready
            setTimeout(() => this.updateProgress(1), 500);
        }

        this.subscribe(UQE_EVENTS.LOCATION_EXPLORED, (data) => {
            // Match against zoneId if specified, otherwise fall back to objective ID
            const targetId = this.zoneId || this.id;
            if (data.id === targetId) {
                this.updateProgress(1);
            }
        });
    }
}

class InteractObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        // data.targetObjectId is the preferred key, but fallback to objectId or zoneId
        this.targetObjectId = data.targetObjectId || data.objectId || data.zoneId;

        this.subscribe(UQE_EVENTS.INTERACT_OBJECT, (eventData) => {
            if (eventData.id === this.targetObjectId) {
                this.updateProgress(1);
            }
        });
    }
}

class SurviveObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.subscribe(UQE_EVENTS.TIME_SURVIVED, (data) => {
            this.updateProgress(data.seconds || 1);
        });
    }
}

class LevelObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);

        // Initialize with current player level if available
        let currentLevel = 1;
        if (typeof playerStats !== 'undefined' && playerStats.level) {
            currentLevel = playerStats.level;
        }

        this.progress = currentLevel; // Start at current level

        // Check immediate completion
        if (this.progress >= this.target) {
            this.progress = this.target;
            this.completed = true;
            // Delay completion log/event slightly to ensure quest is fully constructed
            setTimeout(() => {
                if (this.eventBus) this.eventBus.emit(UQE_EVENTS.OBJECTIVE_UPDATED, { objective: this, amount: 0 });
            }, 100);
        }

        this.subscribe(UQE_EVENTS.LEVEL_UP, (data) => {
            // Set progress to current level
            if (data.level >= this.target) {
                this.progress = this.target;
                this.completed = true;
                // debugLog(`✅ [UQE] Level Objective Complete: ${this.label}`);
            } else {
                this.progress = data.level;
            }
        });
    }
    rehydrate(saveData) {
        super.rehydrate(saveData);
        // Validate against actual player level to prevent regression/stuck quests
        if (typeof playerStats !== 'undefined' && playerStats.level) {
            if (playerStats.level > this.progress) {
                this.progress = playerStats.level;
            }
        }
        if (this.progress >= this.target) {
            this.completed = true;
            this.progress = this.target;
        }
    }
}

class GoldObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.subscribe(UQE_EVENTS.GOLD_EARNED, (data) => {
            this.updateProgress(data.amount || 0);
        });
    }
}

class Quest {
    constructor(data, eventBus) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.giver = data.giver; // Store giver
        this.objectives = this.createObjectives(data.objectives, eventBus);
        this.completed = false;
        this.isTurnedIn = false; // Track manual turn-in
        this.rewards = data.rewards || {};
        this.requires = data.requires;
        this.autoComplete = data.autoComplete; // Support auto-completion even with giver
    }

    dispose() {
        this.objectives.forEach(obj => obj.dispose());
    }

    createObjectives(objData, eventBus) {
        return objData.map(data => {
            let obj;
            switch (data.type) {
                case 'kill': obj = new KillObjective(data, eventBus); break;
                case 'talk': obj = new TalkObjective(data, eventBus); break;
                case 'collect': obj = new CollectObjective(data, eventBus); break;
                case 'explore': obj = new ExploreObjective(data, eventBus); break;
                case 'explore_location': obj = new ExploreLocationObjective(data, eventBus); break;
                case 'interact': obj = new InteractObjective(data, eventBus); break;
                case 'survive': obj = new SurviveObjective(data, eventBus); break;
                case 'level': obj = new LevelObjective(data, eventBus); break;
                case 'gold': obj = new GoldObjective(data, eventBus); break;
                case 'dynamic_spawn': obj = new DynamicSpawnObjective(data, eventBus); break;
                default: obj = new UqeObjective(data, eventBus); break;
            }
            obj.parentQuest = this; // Link to parent
            return obj;
        });
    }

    // Check if objectives are met (for UI feedback)
    canComplete() {
        return this.objectives.every(o => o.isComplete());
    }

    // Signal manual turn-in
    complete() {
        this.isTurnedIn = true;
        return this.checkCompletion();
    }

    checkCompletion() {
        if (this.completed) return true;

        const allDone = this.objectives.every(o => o.isComplete());

        if (allDone) {
            // If quest has a giver, require manual turn-in (unless auto-complete is forced)
            if (this.giver && !this.isTurnedIn && !this.autoComplete) {
                return false; // Wait for dialog interaction
            }

            this.completed = true;
            // debugLog(`🏆 [UQE] QUEST COMPLETE: ${this.title}`);
        }
        return this.completed; // Return actual completed state
    }

    getSaveData() {
        return {
            id: this.id,
            completed: this.completed,
            objectives: this.objectives.map(o => o.getSaveData())
        };
    }

    rehydrate(saveData) {
        if (saveData && saveData.id === this.id) {
            this.completed = saveData.completed;
            this.objectives.forEach(obj => {
                const objSave = (saveData.objectives || []).find(o => o.id === obj.id);
                obj.rehydrate(objSave);
            });
        }
    }
}

class UqeEngine {
    constructor() {
        this.eventBus = new UqeEventBus();
        this.activeQuests = [];
        this.completedQuests = []; // Completed registry
        this.pendingQuests = []; // Available but not yet accepted
        this.allDefinitions = {};
        this.isUpdating = false; // Re-entrancy guard

        // Listen for objective updates to trigger completion checks
        this.eventBus.on(UQE_EVENTS.OBJECTIVE_UPDATED, () => {
            if (!this.isUpdating) {
                this.update();
            }
        });
    }

    init(definitions) {
        this.allDefinitions = definitions;
        // debugLog("🚀 [UQE Engine] Initialized with", Object.keys(definitions).length, "definitions");
    }

    /**
     * Initialize starter quests for new games
     * @param {string[]} questIds - Array of quest IDs to auto-accept as starters
     */
    initializeStarterQuests(questIds) {
        // debugLog(`🎮 [UQE Engine] Initializing starter quests:`, questIds);
        questIds.forEach(questId => {
            // Skip if already active or completed
            if (this.activeQuests.some(q => q.id === questId)) return;
            if (this.completedQuests.some(q => q.id === questId)) return;

            this.acceptQuest(questId);
        });
        // debugLog(`✅ [UQE Engine] Starter quests initialized. Active: ${this.activeQuests.length}`);
    }

    acceptQuest(questId) {
        // debugLog(`📝 [UQE Engine] acceptQuest called with: ${questId}`);
        if (this.activeQuests.some(q => q.id === questId)) {
            debugLog(`⚠️ [UQE Engine] Quest already active: ${questId}`);
            return;
        }
        if (this.completedQuests.some(q => q.id === questId)) {
            debugLog(`⚠️ [UQE Engine] Quest already completed: ${questId}`);
            return;
        }

        const def = this.allDefinitions[questId];
        if (def) {
            const quest = new Quest(def, this.eventBus);
            this.activeQuests.push(quest);
            // debugLog(`✅ [UQE Engine] Quest Accepted: ${quest.title} (ID: ${quest.id})`);
            // debugLog(`📊 [UQE Engine] Active quests now: ${this.activeQuests.length}`);

            // Play quest accept sound
            if (typeof playSound === 'function') {
                playSound('quest_accept');
            }

            // Emit quest accepted event so UI can update
            this.eventBus.emit(UQE_EVENTS.QUEST_ACCEPTED, quest);
        } else {
            console.error(`❌ [UQE Engine] QUEST DEFINITION NOT FOUND: ${questId}`);
            debugLog(`📊 [UQE Engine] Available keys:`, Object.keys(this.allDefinitions));
        }
    }

    // Check for newly available quests (adds to pending, or auto-accepts if flagged)
    checkNewQuests() {
        const completedIds = this.completedQuests.map(q => q.id);

        Object.keys(this.allDefinitions).forEach(questId => {
            const def = this.allDefinitions[questId];

            // Skip if already active, completed, or pending
            if (this.activeQuests.some(q => q.id === questId)) return;
            if (this.completedQuests.some(q => q.id === questId)) return;
            if (this.pendingQuests.includes(questId)) return;

            // Check requirements
            if (def.requires && completedIds.includes(def.requires)) {
                // If autoAccept is true, automatically accept the quest
                if (def.autoAccept) {
                    // debugLog(`✅ [UQE Engine] Auto-accepting quest: ${questId}`);
                    this.acceptQuest(questId);
                } else if (!questId.startsWith('main_')) {
                    // Non-main quests go to pending (main quests require NPC dialog unless autoAccept)
                    // debugLog(`🔔 [UQE Engine] Quest available: ${questId} (Requires: ${def.requires})`);
                    this.pendingQuests.push(questId);
                    this.eventBus.emit(UQE_EVENTS.QUEST_AVAILABLE, { questId, definition: def });
                }
            }
        });
    }

    // Get list of pending quests with their definitions
    getPendingQuests() {
        return this.pendingQuests.map(id => ({
            id,
            definition: this.allDefinitions[id]
        }));
    }

    // Accept a pending quest (removes from pending, adds to active)
    acceptPendingQuest(questId) {
        const index = this.pendingQuests.indexOf(questId);
        if (index > -1) {
            this.pendingQuests.splice(index, 1);
        }
        this.acceptQuest(questId);
    }

    getSaveData() {
        return {
            active: this.activeQuests.map(q => q.getSaveData()),
            completed: this.completedQuests.map(q => q.getSaveData()),
            pending: this.pendingQuests
        };
    }

    loadSaveData(saveData) {
        debugLog(`[UQE Load] loadSaveData called with:`, saveData);
        debugLog(`[UQE Load] allDefinitions loaded:`, Object.keys(this.allDefinitions).length, 'quests');

        if (!saveData) {
            console.warn(`[UQE Load] No save data provided!`);
            return;
        }

        // Cleanup existing listeners before overwriting
        this.activeQuests.forEach(q => q.dispose()); // PREVENT ZOMBIE LISTENERS
        this.activeQuests = [];

        // Handle both older format (plain array) and new format (object)
        const activeData = saveData.active || (Array.isArray(saveData) ? saveData : []);
        const completedData = saveData.completed || [];

        debugLog(`[UQE Load] Active quests in save: ${activeData.length}, Completed: ${completedData.length}`);

        activeData.forEach(qSave => {
            const def = this.allDefinitions[qSave.id];
            if (def) {
                const quest = new Quest(def, this.eventBus);
                quest.rehydrate(qSave);
                this.activeQuests.push(quest);
                debugLog(`[UQE Load] ✅ Loaded active quest: ${qSave.id}`);
            } else {
                console.warn(`[UQE Load] ❌ Definition not found for: ${qSave.id}`);
            }
        });

        this.completedQuests = [];
        completedData.forEach(qSave => {
            const def = this.allDefinitions[qSave.id];
            if (def) {
                const quest = new Quest(def, this.eventBus);
                quest.rehydrate(qSave);
                this.completedQuests.push(quest);
            }
        });

        // Restore pending quests
        this.pendingQuests = saveData.pending || [];

        debugLog(`[UQE Load] Result: ${this.activeQuests.length} active, ${this.completedQuests.length} completed, ${this.pendingQuests.length} pending`);
    }

    update() {
        if (this.isUpdating) return;
        this.isUpdating = true;

        try {
            // Iterate backwards to safely remove
            let questCompleted = false;
            for (let i = this.activeQuests.length - 1; i >= 0; i--) {
                const quest = this.activeQuests[i];
                if (!quest) continue; // Safety: modification in event listeners might shift indices

                if (quest.checkCompletion()) {
                    // debugLog(`🏁 [UQE Engine] Quest Completed: ${quest.title}`);

                    // Unsubscribe listeners for completed quest to stop tracking
                    quest.dispose();

                    this.activeQuests.splice(i, 1);
                    this.completedQuests.push(quest);
                    this.eventBus.emit(UQE_EVENTS.QUEST_COMPLETED, quest);
                    questCompleted = true;
                }
            }

            // If a quest was completed, check for new unlocks
            if (questCompleted) {
                this.checkNewQuests();
            }
        } finally {
            this.isUpdating = false;
        }
    }
    // Debug/Console Helper: Start a quest by ID
    startQuest(questId) {
        return this.acceptQuest(questId);
    }

    // Debug/Console Helper: Force complete a specific objective by ID
    completeObjective(questId, objectiveId) {
        const quest = this.activeQuests.find(q => q.id === questId);
        if (quest) {
            const obj = quest.objectives.find(o => o.id === objectiveId);
            if (obj) {
                obj.progress = obj.target;
                obj.completed = true;

                // Emit event so UI updates
                if (this.eventBus) {
                    this.eventBus.emit(UQE_EVENTS.OBJECTIVE_UPDATED, {
                        objective: obj,
                        amount: 0
                    });
                }

                // Check if this completes the whole quest
                this.update();
                debugLog(`✅ [UQE] Force completed objective: ${objectiveId} in quest ${questId}`);
            } else {
                console.warn(`⚠️ [UQE] Objective ${objectiveId} not found in quest ${questId}`);
            }
        } else {
            console.warn(`⚠️ [UQE] Cannot complete objective - quest ${questId} not active.`);
        }
    }

    // Debug/Console Helper: Force complete a quest by ID
    completeQuest(questId) {
        const quest = this.activeQuests.find(q => q.id === questId);
        if (quest) {
            // Force all objectives to complete
            quest.objectives.forEach(obj => {
                obj.progress = obj.target;
                obj.completed = true;
            });
            quest.completed = true;
            quest.isTurnedIn = true; // Skip turn-in requirement

            // Trigger completion logic immediately
            this.update();
            debugLog(`✅ [UQE] Force completed quest: ${questId}`);
        } else {
            console.warn(`⚠️ [UQE] Cannot complete quest ${questId} - not active.`);
        }
    }
}

// Global instance
const uqe = new UqeEngine();
window.uqe = uqe;
// debugLog("💎 [UQE Engine] Global instance created and attached to window.");
