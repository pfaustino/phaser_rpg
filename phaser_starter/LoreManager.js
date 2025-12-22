/**
 * LoreManager.js
 * Manages the discovery and storage of lore entries.
 * Acts as the bridge between game events (Milestones) and the UI (LoreCodex).
 */
class LoreManager {
    constructor(scene) {
        this.scene = scene;
        this.unlockedLore = new Set();
        this.initialized = false;
    }

    /**
     * Initialize the manager
     * Load unlocked lore from localStorage
     */
    init() {
        if (this.initialized) return;

        this.loadProgress();
        this.initialized = true;
        console.log(`📜 LoreManager initialized. ${this.unlockedLore.size} entries discovered.`);
    }

    /**
     * Unlock a specific lore entry
     * @param {string} loreId - The ID of the lore entry to unlock
     * @param {string} source - Optional source for categorization (e.g., 'npc_malik', 'world')
     */
    unlockLore(loreId, source = 'general') {
        // If already unlocked, do nothing
        if (this.isLoreUnlocked(loreId)) return;

        console.log(`📜 Unlocking lore: ${loreId}`);

        // Add to set
        this.unlockedLore.add(loreId);

        // Save to specific key format expected by LoreCodex
        // LoreCodex currently looks for 'lore_read_Source' keys
        // We will adapt to that or use a unified 'lore_unlocked' key
        // For backwards compatibility and LoreCodex.js support:
        this.saveLegacyFormat(loreId, source);

        // Save to modern unified set
        this.saveProgress();

        // Emit event for UI to update
        if (this.scene.events) {
            this.scene.events.emit('lore_unlocked', loreId);
        }

        // Show toast notification
        this.showUnlockNotification(`New Lore Unlocked`);
    }

    /**
     * Check if lore is unlocked
     */
    isLoreUnlocked(loreId) {
        return this.unlockedLore.has(loreId);
    }

    /**
     * Load unlocking progress
     */
    loadProgress() {
        try {
            // Load unified list
            const saved = localStorage.getItem('rpg_lore_unlocked');
            if (saved) {
                const parsed = JSON.parse(saved);
                parsed.forEach(id => this.unlockedLore.add(id));
            }

            // Also scan legacy keys to sync up
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('lore_read_')) {
                    try {
                        const ids = JSON.parse(localStorage.getItem(key));
                        if (Array.isArray(ids)) {
                            ids.forEach(id => this.unlockedLore.add(id));
                        }
                    } catch (e) {
                        console.warn('Failed to parse legacy lore key:', key);
                    }
                }
            }
        } catch (e) {
            console.warn('LoreManager: Failed to load progress', e);
        }
    }

    /**
     * Save progress to unified storage
     */
    saveProgress() {
        try {
            const array = Array.from(this.unlockedLore);
            localStorage.setItem('rpg_lore_unlocked', JSON.stringify(array));
        } catch (e) {
            console.warn('LoreManager: Failed to save progress', e);
        }
    }

    /**
     * Save in the format LoreCodex.js currently expects (lore_read_SOURCE)
     */
    saveLegacyFormat(loreId, source) {
        // Default source if not provided, or try to infer from ID (e.g. lore_ch1_...)
        let key = `lore_read_${source}`;

        try {
            // Get existing array for this source
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            if (!existing.includes(loreId)) {
                existing.push(loreId);
                localStorage.setItem(key, JSON.stringify(existing));
            }
        } catch (e) {
            console.warn('LoreManager: Failed to save legacy format', e);
        }
    }

    /**
     * Show a simple notification
     */
    showUnlockNotification(text) {
        // Reuse global notification system if available
        if (window.showDamageNumber) {
            // center of screen ish
            const x = this.scene.cameras.main.midPoint.x;
            const y = this.scene.cameras.main.midPoint.y - 100;
            window.showDamageNumber(x, y, text, 0x00FFFF);
        }
    }
}

// Export global
window.LoreManager = LoreManager;
