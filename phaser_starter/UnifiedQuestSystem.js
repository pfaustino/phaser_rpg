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
        this.listeners[event].push(callback);
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
            console.log(`📡 [UQE EventBus] ${event}`, data);
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
    LOCATION_EXPLORED: 'location_explored'
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
            console.log(`📈 [UQE] Objective Progress: ${this.label} (${this.progress}/${this.target})`);
            if (this.eventBus) {
                this.eventBus.emit(UQE_EVENTS.OBJECTIVE_UPDATED, {
                    objective: this,
                    amount: amount
                });
            }
        }

        if (this.progress >= this.target) {
            this.completed = true;
            console.log(`✅ [UQE] Objective Complete: ${this.label}`);
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
        this.subscribe(UQE_EVENTS.NPC_TALK, (data) => {
            console.log(`🗣️ [UQE] TalkObjective checking: '${this.npcId}' vs '${data.id}'`);
            if (data.id === this.npcId) this.updateProgress(1);
        });
    }
}

class CollectObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.itemId = data.itemId;
        this.subscribe(UQE_EVENTS.ITEM_PICKUP, (data) => {
            // Match specific ID, type, or wildcard 'any'
            if (this.itemId === 'any' || data.id === this.itemId || data.type === this.itemId) {
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
        this.zoneId = data.zoneId; // Optional specific zone ID

        this.subscribe(UQE_EVENTS.LOCATION_EXPLORED, (data) => {
            // Match against zoneId if specified, otherwise fall back to objective ID
            const targetId = this.zoneId || this.id;
            if (data.id === targetId) {
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
                console.log(`✅ [UQE] Level Objective Complete: ${this.label}`);
            } else {
                this.progress = data.level;
            }
        });
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
        this.objectives = this.createObjectives(data.objectives, eventBus);
        this.completed = false;
        this.rewards = data.rewards || {};
        this.requires = data.requires;
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
                case 'survive': obj = new SurviveObjective(data, eventBus); break;
                case 'level': obj = new LevelObjective(data, eventBus); break;
                case 'gold': obj = new GoldObjective(data, eventBus); break;
                default: obj = new UqeObjective(data, eventBus); break;
            }
            obj.parentQuest = this; // Link to parent
            return obj;
        });
    }

    checkCompletion() {
        if (this.completed) return true;
        const allDone = this.objectives.every(o => o.isComplete());
        if (allDone) {
            this.completed = true;
            console.log(`🏆 [UQE] QUEST COMPLETE: ${this.title}`);
        }
        return allDone;
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
    }

    init(definitions) {
        this.allDefinitions = definitions;
        console.log("🚀 [UQE Engine] Initialized with", Object.keys(definitions).length, "definitions");
    }

    /**
     * Initialize starter quests for new games
     * @param {string[]} questIds - Array of quest IDs to auto-accept as starters
     */
    initializeStarterQuests(questIds) {
        console.log(`🎮 [UQE Engine] Initializing starter quests:`, questIds);
        questIds.forEach(questId => {
            // Skip if already active or completed
            if (this.activeQuests.some(q => q.id === questId)) return;
            if (this.completedQuests.some(q => q.id === questId)) return;

            this.acceptQuest(questId);
        });
        console.log(`✅ [UQE Engine] Starter quests initialized. Active: ${this.activeQuests.length}`);
    }

    acceptQuest(questId) {
        console.log(`📝 [UQE Engine] acceptQuest called with: ${questId}`);
        if (this.activeQuests.some(q => q.id === questId)) {
            console.log(`⚠️ [UQE Engine] Quest already active: ${questId}`);
            return;
        }
        if (this.completedQuests.some(q => q.id === questId)) {
            console.log(`⚠️ [UQE Engine] Quest already completed: ${questId}`);
            return;
        }

        const def = this.allDefinitions[questId];
        if (def) {
            const quest = new Quest(def, this.eventBus);
            this.activeQuests.push(quest);
            console.log(`✅ [UQE Engine] Quest Accepted: ${quest.title} (ID: ${quest.id})`);
            console.log(`📊 [UQE Engine] Active quests now: ${this.activeQuests.length}`);
            // Emit quest accepted event so UI can update
            this.eventBus.emit(UQE_EVENTS.QUEST_ACCEPTED, quest);
        } else {
            console.error(`❌ [UQE Engine] QUEST DEFINITION NOT FOUND: ${questId}`);
            console.log(`📊 [UQE Engine] Available keys:`, Object.keys(this.allDefinitions));
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
                    console.log(`✅ [UQE Engine] Auto-accepting quest: ${questId}`);
                    this.acceptQuest(questId);
                } else if (!questId.startsWith('main_')) {
                    // Non-main quests go to pending (main quests require NPC dialog unless autoAccept)
                    console.log(`🔔 [UQE Engine] Quest available: ${questId} (Requires: ${def.requires})`);
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
        if (!saveData) return;

        // Cleanup existing listeners before overwriting
        this.activeQuests.forEach(q => q.dispose()); // PREVENT ZOMBIE LISTENERS
        this.activeQuests = [];

        // Handle both older format (plain array) and new format (object)
        const activeData = saveData.active || (Array.isArray(saveData) ? saveData : []);
        const completedData = saveData.completed || [];

        activeData.forEach(qSave => {
            const def = this.allDefinitions[qSave.id];
            if (def) {
                const quest = new Quest(def, this.eventBus);
                quest.rehydrate(qSave);
                this.activeQuests.push(quest);
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

        console.log(`💡 [UQE Engine] Rehydrated ${this.activeQuests.length} active, ${this.completedQuests.length} completed, ${this.pendingQuests.length} pending`);
    }

    update() {
        // Iterate backwards to safely remove
        let questCompleted = false;
        for (let i = this.activeQuests.length - 1; i >= 0; i--) {
            const quest = this.activeQuests[i];
            if (quest.checkCompletion()) {
                console.log(`🏁 [UQE Engine] Quest Completed: ${quest.title}`);

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
    }
}

// Global instance
const uqe = new UqeEngine();
window.uqe = uqe;
console.log("💎 [UQE Engine] Global instance created and attached to window.");
