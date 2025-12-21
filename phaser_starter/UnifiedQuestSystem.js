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
    }

    emit(event, data) {
        // Skip logging for high-frequency events
        if (event !== 'time_survived' && event !== 'tile_traveled') {
            console.log(`📡 [UQE EventBus] ${event}`, data);
        }
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}

const UQE_EVENTS = {
    MONSTER_KILLED: 'monster_killed',
    ITEM_PICKUP: 'item_pickup',
    NPC_TALK: 'npc_talk',
    STAT_CHANGE: 'stat_change',
    QUEST_COMPLETED: 'quest_completed',
    OBJECTIVE_UPDATED: 'objective_updated',
    // New event types for additional objectives
    TILE_TRAVELED: 'tile_traveled',
    TIME_SURVIVED: 'time_survived',
    LEVEL_UP: 'level_up',
    GOLD_EARNED: 'gold_earned'
};

class UqeObjective {
    constructor(data, eventBus) {
        this.eventBus = eventBus;
        this.id = data.id || Math.random().toString(36).substr(2, 9);
        this.type = data.type;
        this.label = data.label || '';
        this.completed = false;
        this.progress = 0;
        this.target = data.target || 1;
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
        eventBus.on(UQE_EVENTS.MONSTER_KILLED, (data) => {
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
        eventBus.on(UQE_EVENTS.NPC_TALK, (data) => {
            console.log(`🗣️ [UQE] TalkObjective checking: '${this.npcId}' vs '${data.id}'`);
            if (data.id === this.npcId) this.updateProgress(1);
        });
    }
}

class CollectObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        this.itemId = data.itemId;
        eventBus.on(UQE_EVENTS.ITEM_PICKUP, (data) => {
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
        eventBus.on(UQE_EVENTS.TILE_TRAVELED, (data) => {
            this.updateProgress(data.amount || 1);
        });
    }
}

class SurviveObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        eventBus.on(UQE_EVENTS.TIME_SURVIVED, (data) => {
            this.updateProgress(data.seconds || 1);
        });
    }
}

class LevelObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data, eventBus);
        eventBus.on(UQE_EVENTS.LEVEL_UP, (data) => {
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
        eventBus.on(UQE_EVENTS.GOLD_EARNED, (data) => {
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
    }

    createObjectives(objData, eventBus) {
        return objData.map(data => {
            let obj;
            switch (data.type) {
                case 'kill': obj = new KillObjective(data, eventBus); break;
                case 'talk': obj = new TalkObjective(data, eventBus); break;
                case 'collect': obj = new CollectObjective(data, eventBus); break;
                case 'explore': obj = new ExploreObjective(data, eventBus); break;
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
        this.completedQuests = []; // New registry
        this.allDefinitions = {};
    }

    init(definitions) {
        this.allDefinitions = definitions;
        console.log("🚀 [UQE Engine] Initialized with", Object.keys(definitions).length, "definitions");
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
        } else {
            console.error(`❌ [UQE Engine] QUEST DEFINITION NOT FOUND: ${questId}`);
            console.log(`📊 [UQE Engine] Available keys:`, Object.keys(this.allDefinitions));
        }
    }

    getSaveData() {
        return {
            active: this.activeQuests.map(q => q.getSaveData()),
            completed: this.completedQuests.map(q => q.getSaveData())
        };
    }

    loadSaveData(saveData) {
        if (!saveData) return;

        // Handle both older format (plain array) and new format (object)
        const activeData = saveData.active || (Array.isArray(saveData) ? saveData : []);
        const completedData = saveData.completed || [];

        this.activeQuests = [];
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

        console.log(`💡 [UQE Engine] Rehydrated ${this.activeQuests.length} active, ${this.completedQuests.length} completed`);
    }

    update() {
        // Iterate backwards to safely remove
        for (let i = this.activeQuests.length - 1; i >= 0; i--) {
            const quest = this.activeQuests[i];
            if (quest.checkCompletion()) {
                console.log(`🏁 [UQE Engine] Quest Completed: ${quest.title}`);
                this.activeQuests.splice(i, 1);
                this.completedQuests.push(quest);
                this.eventBus.emit(UQE_EVENTS.QUEST_COMPLETED, quest);
            }
        }
    }
}

// Global instance
const uqe = new UqeEngine();
window.uqe = uqe;
console.log("💎 [UQE Engine] Global instance created and attached to window.");
