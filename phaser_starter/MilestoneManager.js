/**
 * MilestoneManager - Monitors game events and triggers lore/quest/dialog unlocks
 * 
 * This manager listens for game events (quest completion, boss kills, etc.)
 * and checks if any milestones should be unlocked, then triggers the appropriate
 * unlocks in LoreManager, QuestManager, and DialogManager.
 */
class MilestoneManager {
    constructor(scene) {
        this.scene = scene;
        this.data = null;
        this.achievedMilestones = new Set();
    }

    /**
     * Initialize data from Phaser cache and load saved progress
     */
    init() {
        this.data = this.scene.cache.json.get('milestoneData');
        if (!this.data) {
            console.error('MilestoneManager: Failed to load milestoneData from cache');
            return;
        }

        // Load previously achieved milestones from localStorage
        this.loadProgress();

        console.log('MilestoneManager initialized with', this.data.milestones?.length || 0, 'milestones');
    }

    /**
     * Load achieved milestones from localStorage
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('rpg_milestones');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.achievedMilestones = new Set(parsed);
            }
        } catch (e) {
            console.warn('MilestoneManager: Failed to load saved milestones', e);
        }
    }

    /**
     * Save achieved milestones to localStorage
     */
    saveProgress() {
        try {
            localStorage.setItem('rpg_milestones', JSON.stringify([...this.achievedMilestones]));
        } catch (e) {
            console.warn('MilestoneManager: Failed to save milestones', e);
        }
    }

    /**
     * Check for milestones triggered by a specific event
     * @param {string} eventType - Type of event (quest_complete, boss_kill, etc.)
     * @param {object} eventData - Data about the event (questId, bossId, etc.)
     * @returns {array} - Array of milestones that were triggered
     */
    checkMilestones(eventType, eventData = {}) {
        if (!this.data) return [];

        const triggered = [];
        const allMilestones = [
            ...(this.data.milestones || []),
            ...(this.data.sideQuestMilestones || [])
        ];

        for (const milestone of allMilestones) {
            // Skip already achieved milestones
            if (this.achievedMilestones.has(milestone.id)) continue;

            // Check if this milestone matches the event
            if (this.matchesTrigger(milestone.trigger, eventType, eventData)) {
                triggered.push(milestone);
                this.unlockMilestone(milestone);
            }
        }

        return triggered;
    }

    /**
     * Check if a milestone trigger matches the current event
     */
    matchesTrigger(trigger, eventType, eventData) {
        if (!trigger || trigger.type !== eventType) return false;

        const condition = trigger.condition || {};

        switch (eventType) {
            case 'game_start':
                return true;

            case 'quest_complete':
                return condition.questId === eventData.questId;

            case 'quest_accept':
                return condition.questId === eventData.questId;

            case 'boss_kill':
                return condition.bossId === eventData.bossId;

            case 'item_acquire':
                return condition.itemId === eventData.itemId;

            case 'location_enter':
                return condition.locationId === eventData.locationId;

            case 'level_reach':
                return eventData.level >= condition.level;

            case 'kill_count':
                return eventData.count >= condition.count;

            case 'explore_count':
                return eventData.tiles >= condition.tiles;

            case 'survive_time':
                return eventData.seconds >= condition.seconds;

            default:
                return false;
        }
    }

    /**
     * Unlock a milestone and trigger all associated unlocks
     */
    unlockMilestone(milestone) {
        console.log('Milestone achieved:', milestone.name);

        // Mark as achieved
        this.achievedMilestones.add(milestone.id);
        this.saveProgress();

        // Unlock lore entries
        if (milestone.unlocks.lore && this.scene.loreManager) {
            for (const loreId of milestone.unlocks.lore) {
                this.scene.loreManager.unlockLore(loreId);
            }
        }

        // Unlock/activate quests
        if (milestone.unlocks.quests && milestone.unlocks.quests.length > 0) {
            // Note: Quest activation handled through game's quest system
            console.log('Milestone unlocks quests:', milestone.unlocks.quests);

            // Emit event for quest system to pick up
            if (this.scene.events) {
                this.scene.events.emit('milestone_quest_unlock', milestone.unlocks.quests);
            }
        }

        // Enable dialogs
        if (milestone.unlocks.dialogs && this.scene.dialogManager) {
            for (const dialogId of milestone.unlocks.dialogs) {
                this.scene.dialogManager.enableDialog(dialogId);
            }
        }

        // Emit milestone achieved event
        if (this.scene.events) {
            this.scene.events.emit('milestone_achieved', milestone);
        }
    }

    /**
     * Check if a milestone has been achieved
     */
    isAchieved(milestoneId) {
        return this.achievedMilestones.has(milestoneId);
    }

    /**
     * Get all achieved milestones
     */
    getAchievedMilestones() {
        return [...this.achievedMilestones];
    }

    /**
     * Reset all milestone progress (for new game)
     */
    resetProgress() {
        this.achievedMilestones.clear();
        this.saveProgress();
    }

    /**
     * Trigger game start milestone check
     */
    onGameStart() {
        this.checkMilestones('game_start', {});
    }

    /**
     * Convenience method for quest completion
     */
    onQuestComplete(questId) {
        return this.checkMilestones('quest_complete', { questId });
    }

    /**
     * Convenience method for quest acceptance
     */
    onQuestAccept(questId) {
        return this.checkMilestones('quest_accept', { questId });
    }

    /**
     * Convenience method for boss kill
     */
    onBossKill(bossId) {
        return this.checkMilestones('boss_kill', { bossId });
    }

    /**
     * Convenience method for level up
     */
    onLevelUp(level) {
        return this.checkMilestones('level_reach', { level });
    }

    /**
     * Convenience method for kill count tracking
     */
    onKillCountUpdate(count) {
        return this.checkMilestones('kill_count', { count });
    }

    /**
     * Convenience method for exploration tracking
     */
    onExploreCountUpdate(tiles) {
        return this.checkMilestones('explore_count', { tiles });
    }

    /**
     * Convenience method for survival time tracking
     */
    onSurviveTimeUpdate(seconds) {
        return this.checkMilestones('survive_time', { seconds });
    }
}

// Export for global use
window.MilestoneManager = MilestoneManager;
