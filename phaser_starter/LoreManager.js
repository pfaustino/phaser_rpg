/**
 * LoreManager - Manages lore entries and the Codex system
 * 
 * Tracks which lore entries have been unlocked, provides data for the
 * Codex UI, and shows notifications when new lore is discovered.
 */
class LoreManager {
    constructor(scene) {
        this.scene = scene;
        this.data = null;
        this.unlockedLore = new Set();
        this.newlyUnlocked = []; // Track entries unlocked this session for notifications
    }

    /**
     * Initialize data from Phaser cache and load saved progress
     */
    init() {
        this.data = this.scene.cache.json.get('loreData');
        if (!this.data) {
            console.error('LoreManager: Failed to load loreData from cache');
            return;
        }

        // Load previously unlocked lore from localStorage
        this.loadProgress();

        console.log('LoreManager initialized with', this.data.entries?.length || 0, 'lore entries');
    }

    /**
     * Load unlocked lore from localStorage
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('rpg_unlocked_lore');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.unlockedLore = new Set(parsed);
            }
        } catch (e) {
            console.warn('LoreManager: Failed to load saved lore progress', e);
        }
    }

    /**
     * Save unlocked lore to localStorage
     */
    saveProgress() {
        try {
            localStorage.setItem('rpg_unlocked_lore', JSON.stringify([...this.unlockedLore]));
        } catch (e) {
            console.warn('LoreManager: Failed to save lore progress', e);
        }
    }

    /**
     * Unlock a lore entry by ID
     * @param {string} loreId - ID of the lore entry to unlock
     * @returns {object|null} - The unlocked lore entry, or null if not found
     */
    unlockLore(loreId) {
        if (!this.data || !this.data.entries) return null;

        // Don't re-unlock already unlocked lore
        if (this.unlockedLore.has(loreId)) return null;

        // Find the lore entry
        const entry = this.data.entries.find(e => e.id === loreId);
        if (!entry) {
            console.warn('LoreManager: Lore entry not found:', loreId);
            return null;
        }

        // Unlock it
        this.unlockedLore.add(loreId);
        this.newlyUnlocked.push(entry);
        this.saveProgress();

        console.log('Lore unlocked:', entry.title);

        // Show notification
        this.showUnlockNotification(entry);

        // Emit event
        if (this.scene.events) {
            this.scene.events.emit('lore_unlocked', entry);
        }

        return entry;
    }

    /**
     * Show a notification when lore is unlocked
     */
    showUnlockNotification(entry) {
        // Create notification text
        const categoryName = this.data.categories[entry.category] || entry.category;

        // Use scene's notification system if available, otherwise console
        if (this.scene.showNotification) {
            this.scene.showNotification(`📖 New Lore: ${entry.title}`, 0xFFD700);
        } else if (this.scene.addCombatText) {
            // Fallback to combat text if available
            this.scene.addCombatText(
                this.scene.cameras.main.width / 2,
                100,
                `📖 New Lore: ${entry.title}`,
                '#FFD700'
            );
        } else {
            console.log(`[LORE NOTIFICATION] New ${categoryName}: ${entry.title}`);
        }
    }

    /**
     * Check if a lore entry is unlocked
     */
    isUnlocked(loreId) {
        return this.unlockedLore.has(loreId);
    }

    /**
     * Get all unlocked lore entries
     * @returns {array} - Array of unlocked lore entry objects
     */
    getUnlockedLore() {
        if (!this.data || !this.data.entries) return [];

        return this.data.entries.filter(e => this.unlockedLore.has(e.id));
    }

    /**
     * Get unlocked lore filtered by category
     * @param {string} category - Category key to filter by
     */
    getLoreByCategory(category) {
        return this.getUnlockedLore().filter(e => e.category === category);
    }

    /**
     * Get unlocked lore filtered by chapter
     * @param {number} chapter - Chapter number to filter by
     */
    getLoreByChapter(chapter) {
        return this.getUnlockedLore().filter(e => e.chapter === chapter);
    }

    /**
     * Get all available categories with their display names
     */
    getCategories() {
        if (!this.data || !this.data.categories) return {};
        return { ...this.data.categories };
    }

    /**
     * Get category counts for Codex UI
     * @returns {object} - Object with category keys and {total, unlocked} counts
     */
    getCategoryCounts() {
        if (!this.data || !this.data.entries) return {};

        const counts = {};
        for (const [key, name] of Object.entries(this.data.categories)) {
            const categoryEntries = this.data.entries.filter(e => e.category === key);
            const unlockedEntries = categoryEntries.filter(e => this.unlockedLore.has(e.id));
            counts[key] = {
                name,
                total: categoryEntries.length,
                unlocked: unlockedEntries.length
            };
        }
        return counts;
    }

    /**
     * Get a specific lore entry by ID (only if unlocked)
     */
    getLoreEntry(loreId) {
        if (!this.isUnlocked(loreId)) return null;
        return this.data.entries.find(e => e.id === loreId);
    }

    /**
     * Get newly unlocked lore from this session
     */
    getNewlyUnlocked() {
        return [...this.newlyUnlocked];
    }

    /**
     * Clear newly unlocked list (after viewing)
     */
    clearNewlyUnlocked() {
        this.newlyUnlocked = [];
    }

    /**
     * Get total lore statistics
     */
    getStats() {
        if (!this.data || !this.data.entries) {
            return { total: 0, unlocked: 0, percentage: 0 };
        }

        const total = this.data.entries.length;
        const unlocked = this.unlockedLore.size;
        const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

        return { total, unlocked, percentage };
    }

    /**
     * Reset all lore progress (for new game)
     */
    resetProgress() {
        this.unlockedLore.clear();
        this.newlyUnlocked = [];
        this.saveProgress();
    }
}

// Export for global use
window.LoreManager = LoreManager;
