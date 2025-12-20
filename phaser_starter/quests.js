/**
 * QuestManager Module
 * Handles loading and managing quest data from quests.json
 */
class QuestManager {
    constructor(scene) {
        this.scene = scene;
        this.data = null;
    }

    /**
     * Initialize data from Phaser cache
     */
    init() {
        this.data = this.scene.cache.json.get('questData');
        if (!this.data) {
            console.error('QuestManager: Failed to load questData from cache');
        }
    }

    /**
     * Get the pool of quests to be active at start
     */
    getStarterQuests() {
        return this.data ? JSON.parse(JSON.stringify(this.data.starterQuests || [])) : [];
    }

    /**
     * Get the pool of quests to be available at start
     */
    getAvailableQuests() {
        return this.data ? JSON.parse(JSON.stringify(this.data.availableQuests || [])) : [];
    }

    /**
     * Get the pool of main story quests
     */
    getMainQuests() {
        return this.data ? JSON.parse(JSON.stringify(this.data.mainQuests || [])) : [];
    }

    /**
     * Get a specific quest by ID
     */
    getQuest(id) {
        if (!this.data) return null;

        // Search in starters
        let quest = (this.data.starterQuests || []).find(q => q.id === id);
        if (quest) return JSON.parse(JSON.stringify(quest));

        // Search in available
        quest = (this.data.availableQuests || []).find(q => q.id === id);
        if (quest) return JSON.parse(JSON.stringify(quest));

        // Search in chains
        for (const chainId in this.data.questChains) {
            quest = this.data.questChains[chainId].find(q => q.id === id);
            if (quest) return JSON.parse(JSON.stringify(quest));
        }

        // Search in main quests
        quest = (this.data.mainQuests || []).find(q => q.id === id);
        if (quest) return JSON.parse(JSON.stringify(quest));

        return null;
    }

    /**
     * Get next quest in a chain
     */
    getNextInChain(chainId, currentStep) {
        if (!this.data || !this.data.questChains[chainId]) return null;

        const chain = this.data.questChains[chainId];
        const nextQuest = chain.find(q => q.step === currentStep + 1);

        return nextQuest ? JSON.parse(JSON.stringify(nextQuest)) : null;
    }

    /**
     * Calculate progress for a quest based on player stats
     */
    calculateProgress(quest, playerStats) {
        if (!quest || !playerStats) return 0;

        const startValue = quest.startValue || 0;

        switch (quest.type) {
            case 'kill':
                return (playerStats.questStats.monstersKilled || 0) - startValue;
            case 'collect':
                return (playerStats.questStats.itemsCollected || 0) - startValue;
            case 'level':
                // Level is usually absolute, but we can make it relative if startValue is set.
                // However, most games treat "Reach Level X" as absolute.
                // If startValue is explicitly 0, we treat it as absolute.
                return playerStats.level || 1;
            case 'gold':
                return (playerStats.questStats.goldEarned || 0) - startValue;
            case 'explore':
                return (playerStats.questStats.tilesTraveled || 0) - startValue;
            case 'survive':
                return Math.floor(((playerStats.questStats.survivalTime || 0) - startValue) / 1000);
            case 'ui_tab':
                return (playerStats.questStats.availableTabClicked || 0) - startValue;
            case 'story':
                return (playerStats.questStats.storyProgress && playerStats.questStats.storyProgress[quest.id]) ? 1 : 0;
            default:
                return 0;
        }
    }

    /**
     * Get the current value for a specific quest type stat
     */
    getStatValue(type, playerStats) {
        if (!playerStats) return 0;
        switch (type) {
            case 'kill':
                return playerStats.questStats.monstersKilled || 0;
            case 'collect':
                return playerStats.questStats.itemsCollected || 0;
            case 'gold':
                return playerStats.questStats.goldEarned || 0;
            case 'explore':
                return playerStats.questStats.tilesTraveled || 0;
            case 'survive':
                return playerStats.questStats.survivalTime || 0;
            case 'ui_tab':
                return playerStats.questStats.availableTabClicked || 0;
            default:
                return 0;
        }
    }
}

// Global instance to be initialized in game.js
window.QuestManager = QuestManager;
