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
        console.log(`📡 [UQE EventBus] ${event}`, data);
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}

const UQE_EVENTS = {
    MONSTER_KILLED: 'monster_killed',
    ITEM_PICKUP: 'item_pickup',
    NPC_TALK: 'npc_talk',
    STAT_CHANGE: 'stat_change'
};

class UqeObjective {
    constructor(data) {
        this.id = data.id || Math.random().toString(36).substr(2, 9);
        this.type = data.type;
        this.label = data.label || '';
        this.completed = false;
        this.progress = 0;
        this.target = data.target || 1;
    }

    updateProgress(amount) {
        if (this.completed) return;
        this.progress = Math.min(this.progress + amount, this.target);
        if (this.progress >= this.target) {
            this.completed = true;
            console.log(`✅ Objective Complete: ${this.label}`);
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
        super(data);
        this.monsterId = data.monsterId;
        eventBus.on(UQE_EVENTS.MONSTER_KILLED, (data) => {
            if (data.id === this.monsterId) this.updateProgress(1);
        });
    }
}

class TalkObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data);
        this.npcId = data.npcId;
        eventBus.on(UQE_EVENTS.NPC_TALK, (data) => {
            if (data.id === this.npcId) this.updateProgress(1);
        });
    }
}

class CollectObjective extends UqeObjective {
    constructor(data, eventBus) {
        super(data);
        this.itemId = data.itemId;
        eventBus.on(UQE_EVENTS.ITEM_PICKUP, (data) => {
            if (data.id === this.itemId) this.updateProgress(data.amount || 1);
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
            switch (data.type) {
                case 'kill': return new KillObjective(data, eventBus);
                case 'talk': return new TalkObjective(data, eventBus);
                case 'collect': return new CollectObjective(data, eventBus);
                default: return new UqeObjective(data);
            }
        });
    }

    checkCompletion() {
        if (this.completed) return true;
        const allDone = this.objectives.every(o => o.isComplete());
        if (allDone) {
            this.completed = true;
            console.log(`🏆 QUEST COMPLETE: ${this.title}`);
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
        if (this.activeQuests.some(q => q.id === questId)) return;
        if (this.completedQuests.some(q => q.id === questId)) return; // Don't re-accept

        const def = this.allDefinitions[questId];
        if (def) {
            const quest = new Quest(def, this.eventBus);
            this.activeQuests.push(quest);
            console.log(`📝 [UQE Engine] Quest Accepted: ${quest.title}`);
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
        // Iterate backwards to safely remove items
        for (let i = this.activeQuests.length - 1; i >= 0; i--) {
            const quest = this.activeQuests[i];
            if (quest.checkCompletion()) {
                console.log(`🏆 [UQE Engine] Moving quest to completed: ${quest.title}`);
                this.activeQuests.splice(i, 1);
                this.completedQuests.push(quest);
                this.eventBus.emit(UQE_EVENTS.QUEST_COMPLETED, quest);
            }
        }
    }
}

// Global instance
const uqe = new UqeEngine();
