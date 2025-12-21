/**
 * NPCManager - Handles data-driven NPC definitions
 */
class NPCManager {
    constructor(scene) {
        this.scene = scene;
        this.data = null;
    }

    /**
     * Initialize data from Phaser cache
     */
    init() {
        this.data = this.scene.cache.json.get('npcData');
        if (!this.data) {
            console.error('NPCManager: Failed to load npcData from cache');
        }
    }

    /**
     * Get all NPC data
     */
    getAllNPCs() {
        return this.data || [];
    }

    /**
     * Get NPC data by ID
     */
    getNPCById(id) {
        return this.npcs.find(npc => npc.id === id);
    }
}

// Export for global use
window.NPCManager = NPCManager;
