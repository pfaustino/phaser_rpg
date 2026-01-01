/**
 * ItemManager - Central handler for data-driven item definitions
 * Handles loading items.json and providing lookups for sprite keys, stackability, etc.
 */
const ItemManager = {
    definitions: null,
    isLoaded: false,

    // Init and load definitions
    async load() {
        try {
            console.log('📦 ItemManager: Loading items.json...');
            const response = await fetch('items.json');
            if (!response.ok) {
                throw new Error(`Failed to load items.json: ${response.status} ${response.statusText}`);
            }
            this.definitions = await response.json();
            this.isLoaded = true;
            console.log('✅ ItemManager: Items loaded successfully', this.definitions);
            return true;
        } catch (error) {
            console.error('❌ ItemManager: Error loading items:', error);
            return false;
        }
    },

    // Get definition for a quest item
    getQuestItemDef(itemId) {
        if (!this.definitions || !this.definitions.questItems) return null;
        return this.definitions.questItems[itemId];
    },

    // Get definition for a consumable
    getConsumableDef(itemId) {
        if (!this.definitions || !this.definitions.consumables) return null;
        return this.definitions.consumables[itemId];
    },

    // Get any item definition by checking all categories
    getItemDef(itemId) {
        if (!this.definitions) return null;

        // Check quest items
        if (this.definitions.questItems && this.definitions.questItems[itemId]) {
            return { ...this.definitions.questItems[itemId], category: 'questItems' };
        }

        // Check consumables
        if (this.definitions.consumables && this.definitions.consumables[itemId]) {
            return { ...this.definitions.consumables[itemId], category: 'consumables' };
        }

        return null;
    },

    // Get sprite key for an item, falling back to defaults if not found
    getSpriteKey(item) {
        // Handle null/undefined item
        if (!item) return 'item_consumable';

        const itemId = item.id || '';

        // 1. Try to find in our loaded definitions
        const def = this.getItemDef(itemId);
        if (def && def.spriteKey) {
            return def.spriteKey;
        }

        // 2. Legacy/Fallback Logic (preserve existing mappings if definition missing)
        // This ensures we don't break things if items.json is incomplete
        if (item.type === 'weapon') return 'item_weapon';
        if (item.type === 'armor') return 'item_armor';
        if (item.type === 'helmet') return 'item_helmet';
        if (item.type === 'ring') return 'item_ring';
        if (item.type === 'amulet') return 'item_amulet';
        if (item.type === 'boots') return 'item_boots';
        if (item.type === 'gloves') return 'item_gloves';
        if (item.type === 'belt') return 'item_belt';
        if (item.type === 'gold') return 'item_gold';

        // Explicit overrides that might not be in JSON yet
        if (itemId === 'mana_potion' || (item.name && item.name === 'Mana Potion')) return 'mana_potion';

        return 'item_consumable';
    },

    // Check if an item is stackable
    isStackable(item) {
        if (!item) return false;

        const itemId = item.id;

        // 1. Check definitions
        const def = this.getItemDef(itemId);
        if (def && def.stackable !== undefined) {
            return def.stackable;
        }

        // 2. Legacy logic fallback
        // Shards were hardcoded stackable
        if (item.type === 'quest_item' &&
            ['crystal_shard', 'echo_shard', 'echo_crystal', 'shard_resonance'].includes(itemId)) {
            return true;
        }

        // Consumables typically stack
        if (item.type === 'consumable') return true;

        return false;
    },

    // Dynamically load all sprites defined in items.json
    loadAllSprites(scene) {
        if (!this.definitions) {
            console.warn('⚠️ ItemManager: Cannot load sprites, definitions not loaded');
            return;
        }

        let count = 0;

        // Helper to load a category
        const loadCategory = (category) => {
            if (!this.definitions[category]) return;
            Object.values(this.definitions[category]).forEach(item => {
                if (item.sprite && item.spriteKey) {
                    // Check if already loaded to avoid warnings
                    if (!scene.textures.exists(item.spriteKey)) {
                        scene.load.image(item.spriteKey, item.sprite);
                        count++;
                    }
                }
            });
        };

        loadCategory('questItems');
        loadCategory('consumables');

        console.log(`📦 ItemManager: Queued ${count} sprites for loading`);
    }
};

// Expose globally
window.ItemManager = ItemManager;
