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

        switch (quest.type) {
            case 'kill':
                return playerStats.questStats.monstersKilled || 0;
            case 'collect':
                return playerStats.questStats.itemsCollected || 0;
            case 'level':
                return playerStats.level || 1;
            case 'gold':
                return playerStats.questStats.goldEarned || 0;
            case 'explore':
                return playerStats.questStats.tilesTraveled || 0;
            case 'survive':
                return Math.floor((playerStats.questStats.survivalTime || 0) / 1000);
            case 'ui_tab':
                return playerStats.questStats.availableTabClicked || 0;
            default:
                return 0;
        }
    }
}

// Global instance to be initialized in game.js
window.QuestManager = QuestManager;
