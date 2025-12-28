/**
 * MilestoneManager.js
 * Manages game milestones, tracking progress and unlocking content.
 * Decoupled from main game logic to allow data-driven progression.
 */
class MilestoneManager {
    constructor(scene) {
        this.scene = scene;
        this.milestones = [];
        this.completedMilestones = new Set();
        // Check interval for passive stats
        this.checkInterval = null;
    }

    /**
     * Initialize the manager with milestone data
     * @param {Object} data - Loaded JSON data containing milestones
     */
    init(data) {
        if (!data || !data.milestones) {
            console.error('MilestoneManager: No milestone data provided');
            return;
        }

        this.milestones = [...data.milestones];
        if (data.sideQuestMilestones) {
            this.milestones.push(...data.sideQuestMilestones);
        }

        this.loadProgress();
        this.setupEventListeners();

        console.log(`🏆 MilestoneManager initialized with ${this.milestones.length} milestones`);

        // Check game_start triggers immediately
        this.checkTriggers('game_start', {});
    }

    /**
     * Load completed milestones from localStorage
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('completed_milestones');
            if (saved) {
                const parsed = JSON.parse(saved);
                parsed.forEach(id => this.completedMilestones.add(id));
                console.log(`🏆 Loaded ${this.completedMilestones.size} completed milestones`);
            }
        } catch (e) {
            console.warn('MilestoneManager: Failed to load progress', e);
        }
    }

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        try {
            const array = Array.from(this.completedMilestones);
            localStorage.setItem('completed_milestones', JSON.stringify(array));
        } catch (e) {
            console.warn('MilestoneManager: Failed to save progress', e);
        }
    }

    /**
     * Setup global event listeners to catch game events
     */
    setupEventListeners() {
        // Listen for standard game events
        // Note: These events must be emitted by the game actions
        if (!this.scene.events) return;

        this.scene.events.on('quest_complete', (data) => this.checkTriggers('quest_complete', data));
        this.scene.events.on('boss_kill', (data) => this.checkTriggers('boss_kill', data));
        this.scene.events.on('location_enter', (data) => this.checkTriggers('location_enter', data));
        this.scene.events.on('npc_talk', (data) => this.checkTriggers('npc_talk', data));
        this.scene.events.on('stat_change', (data) => this.checkTriggers('stat_change', data));

        // Periodic check for passive stats (like kill counts)
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.checkInterval = setInterval(() => {
            this.checkPassiveTriggers();
        }, 2000);
    }

    /**
     * Clean up listeners
     */
    destroy() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        // We rely on scene shutdown to clear event listeners usually, 
        // but could manually remove them here if needed.
    }

    /**
     * Evaluate triggers for a specific event type
     * @param {string} type - Event type (e.g., 'quest_complete')
     * @param {Object} data - Event context data
     */
    checkTriggers(type, data) {
        this.milestones.forEach(milestone => {
            if (this.completedMilestones.has(milestone.id)) return;

            if (milestone.trigger.type === type) {
                if (this.evaluateCondition(milestone.trigger, data)) {
                    this.completeMilestone(milestone);
                }
            }
        });
    }

    /**
     * Check passive triggers (like kill counts) that might not fire explicit events
     */
    checkPassiveTriggers() {
        // Get current stats from global state
        const stats = window.playerStats || {};

        this.milestones.forEach(milestone => {
            if (this.completedMilestones.has(milestone.id)) return;

            const trigger = milestone.trigger;

            // Check stat thresholds
            if (trigger.type === 'stat_reach' || trigger.type === 'kill_count' || trigger.type === 'explore_count' || trigger.type === 'survive_time') {
                if (this.evaluateCondition(trigger, stats)) {
                    this.completeMilestone(milestone);
                }
            }
        });
    }

    /**
     * Check if a specific condition is met
     */
    evaluateCondition(trigger, context) {
        // Support both nested 'condition' object and flat trigger properties
        const condition = trigger.condition || trigger;

        switch (trigger.type) {
            case 'game_start':
                return true;

            case 'quest_complete':
                return context.questId === (condition.questId || condition.target);

            case 'boss_kill':
                return context.bossId === (condition.bossId || condition.target);

            case 'location_enter':
                return context.location === (condition.location || condition.target);

            case 'npc_talk':
                return context.npcId === (condition.npcId || condition.target);

            case 'kill_count':
                const currentKills = (window.playerStats && window.playerStats.monstersKilled) || 0;
                return currentKills >= (condition.count || condition.target || 1);

            case 'explore_count':
                const tiles = (window.playerStats && window.playerStats.questStats && window.playerStats.questStats.tilesTraveled) || 0;
                return tiles >= (condition.tiles || condition.target || 1);

            case 'survive_time':
                // Survival time is in ms in playerStats, but targets are usually in seconds
                const timeMs = (window.playerStats && window.playerStats.questStats && window.playerStats.questStats.survivalTime) || 0;
                const timeSeconds = Math.floor(timeMs / 1000);
                return timeSeconds >= (condition.seconds || condition.target || 0);

            case 'stat_reach':
            case 'stat_change':
                const statName = condition.stat;
                const statVal = (window.playerStats && window.playerStats[statName]) || 0;
                return statVal >= (condition.value || condition.target || 0);

            default:
                return false;
        }
    }

    /**
     * Mark milestone as complete and issue rewards
     */
    completeMilestone(milestone) {
        console.log(`🏆 Milestone Completed: ${milestone.name}`);
        this.completedMilestones.add(milestone.id);
        this.saveProgress();

        // Normalize unlocks/rewards schema
        const unlocks = milestone.unlocks || milestone.rewards || {};

        // 1. Show notification
        const msg = unlocks.notification || `Milestone: ${milestone.name}`;
        if (window.showDamageNumber && this.scene && this.scene.cameras && this.scene.cameras.main) {
            const x = this.scene.cameras.main.midPoint.x;
            const y = this.scene.cameras.main.midPoint.y - 150;
            window.showDamageNumber(x, y, msg, 0xFFD700);
        } else {
            console.log(`[Toast] ${msg}`);
        }

        // 2. Unlock Lore
        // Handle both 'lore' (array) and 'loreUnlock' (string/id)
        const loreToUnlock = [];
        if (unlocks.lore && Array.isArray(unlocks.lore)) {
            loreToUnlock.push(...unlocks.lore);
        }
        if (unlocks.loreUnlock) {
            loreToUnlock.push(unlocks.loreUnlock);
        }

        loreToUnlock.forEach(loreId => {
            if (this.scene.loreManager) {
                this.scene.loreManager.unlockLore(loreId, 'milestone');
            }
        });

        // 3. Unlock Quests
        if (unlocks.quests) {
            unlocks.quests.forEach(questId => {
                if (window.questManager) {
                    // If using QuestManager (Legacy/Refactored)
                    // window.questManager.acceptQuest(questId);
                }
                // Also trigger UQE if needed
                if (window.uqe) {
                    // window.uqe.acceptQuest(questId) -- logic might differ
                }
            });
        }

        // 4. Unlock Dialogs
        if (unlocks.dialogs) {
            unlocks.dialogs.forEach(dialogId => {
                if (this.scene.dialogManager) {
                    this.scene.dialogManager.enableDialog(dialogId);
                }
            });
        }

        // 5. Grant XP (from rewards specific)
        if (unlocks.xp && window.playerStats) {
            // Assuming a global addXp function or direct manipulation
            if (typeof window.addXp === 'function') {
                window.addXp(unlocks.xp);
            } else {
                console.log(`[Milestone] Awarded ${unlocks.xp} XP (Function missing)`);
            }
        }
    }
}

// Export to global scope
window.MilestoneManager = MilestoneManager;
