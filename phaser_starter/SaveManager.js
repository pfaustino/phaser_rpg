/**
 * SaveManager.js
 * Handles saving and loading of game state (playerStats, world state) to localStorage.
 * Restores inventory, equipment, and player position.
 */

window.SaveManager = {
    LEGACY_SAVE_KEY: 'rpg_save_data_v1',
    SAME_KEY_PREFIX: 'rpg_save_data_slot_',
    AUTOSAVE_INTERVAL: 60000,
    MAX_SLOTS: 5,
    currentSlot: 1,

    /**
     * Initialize the save manager
     */
    init(scene) {
        this.scene = scene;
        console.log('💾 SaveManager initialized. Checking migration...');
        this.migrateLegacySave();

        // Check if this was a load-on-start (show message after delay)
        const loadedFromStart = localStorage.getItem('rpg_load_on_start_completed');
        if (loadedFromStart) {
            localStorage.removeItem('rpg_load_on_start_completed');
            const loadedSlot = parseInt(loadedFromStart) || 1;
            // Delay message so chat is ready
            setTimeout(() => {
                if (window.addChatMessage) {
                    window.addChatMessage(`Game Loaded (Slot ${loadedSlot}).`, 0x00aaff, '💾');
                }
            }, 1000);
        }

        // Setup Auto-save
        if (this.AUTOSAVE_INTERVAL > 0) {
            if (this.autosaveInterval) clearInterval(this.autosaveInterval);
            this.autosaveInterval = setInterval(() => {
                if (window.GameState && !window.GameState.isGamePaused && window.player && window.player.active && window.playerStats.hp > 0) {
                    this.saveGame(this.currentSlot, true);
                }
            }, this.AUTOSAVE_INTERVAL);
        }

        // Create difficulty indicator (top-left corner, below title if any)
        this.createDifficultyIndicator(scene);
    },

    /**
     * Create the difficulty indicator UI element
     */
    createDifficultyIndicator(scene) {
        if (!scene) return;

        const difficulty = window.GameState?.currentDifficulty || 'normal';
        const difficultyColors = {
            'casual': { text: 'CASUAL', color: '#00ff00' },
            'easy': { text: 'EASY', color: '#88ff88' },
            'normal': { text: 'NORMAL', color: '#ffffff' },
            'hard': { text: 'HARD', color: '#ffaa00' },
            'nightmare': { text: 'NIGHTMARE', color: '#ff4444' }
        };

        const diffInfo = difficultyColors[difficulty] || difficultyColors['normal'];

        // Create text at top-right corner, below version number (version is at y=10)
        window.difficultyText = scene.add.text(scene.scale.width - 10, 28, diffInfo.text, {
            fontSize: '12px',
            fill: diffInfo.color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(30000);
    },

    getSlotKey(slot) {
        return `${this.SAME_KEY_PREFIX}${slot}`;
    },

    migrateLegacySave() {
        const legacyData = localStorage.getItem(this.LEGACY_SAVE_KEY);
        const slot1Key = this.getSlotKey(1);
        const slot1Data = localStorage.getItem(slot1Key);

        if (legacyData && !slot1Data) {
            console.log('📦 Migrating Legacy Save to Slot 1...');
            localStorage.setItem(slot1Key, legacyData);
            // Optional: Move legacy key to a backup or delete it. Keeping it for safety.
            localStorage.setItem(this.LEGACY_SAVE_KEY + '_backup', legacyData);
            // we do NOT delete the legacy key immediately to prevent data loss if migration fails silently
            console.log('✅ Migration complete.');
        }
    },

    /**
     * Save the current game state to a specific slot
     * @param {number} slot - Slot number (1-5)
     * @param {boolean} silent - Suppress UI feedback
     */
    saveGame(slot = 1, silent = false) {
        if (!window.GameState) return false;
        slot = slot || this.currentSlot;

        try {
            const data = {
                timestamp: Date.now(),
                version: 1,
                slot: slot,
                playerStats: window.GameState.playerStats,
                world: {
                    currentMap: window.MapManager ? window.MapManager.currentMap : 'town',
                    playerX: window.player ? window.player.x : (window.lastPlayerX || 0),
                    playerY: window.player ? window.player.y : (window.lastPlayerY || 0),
                    dungeonId: window.MapManager ? window.MapManager.currentDungeonId : null,
                    dungeonLevel: window.MapManager ? window.MapManager.dungeonLevel : 1
                },
                settings: {
                    difficulty: window.GameState.currentDifficulty,
                    musicVolume: window.musicVolume,
                    sfxVolume: window.sfxVolume,
                    musicEnabled: window.musicEnabled
                },
                // Quick metadata for UI
                meta: {
                    level: window.GameState.playerStats.level,
                    gold: window.GameState.playerStats.gold,
                    map: window.MapManager ? window.MapManager.currentMap : 'Unknown',
                    playtime: window.GameState.playtime || 0 // Assuming playtime tracking exists or will exist
                }
            };

            const json = JSON.stringify(data);
            localStorage.setItem(this.getSlotKey(slot), json);
            this.currentSlot = slot; // update active slot

            console.log(`💾 Game Saved to Slot ${slot}! Size: ${json.length} bytes`);

            if (!silent) {
                if (window.showDamageNumber && window.player) {
                    window.showDamageNumber(window.player.x, window.player.y - 50, "Game Saved!", 0x00ff00);
                }
                if (window.addChatMessage) {
                    window.addChatMessage(`Game Saved (Slot ${slot}).`, 0x00ff00);
                }
                const scene = this.scene || (window.game && window.game.scene.scenes[0]);
                if (scene && scene.sound && window.sfxVolume > 0) {
                    scene.sound.play('menu_select', { volume: window.sfxVolume });
                }
            }
            return true;
        } catch (e) {
            console.error('❌ Failed to save game:', e);
            if (!silent && window.addChatMessage) window.addChatMessage("Save Failed!", 0xff0000);
            return false;
        }
    },

    /**
     * Load game from a specific slot
     */
    loadGame(slot = 1) {
        try {
            const key = this.getSlotKey(slot);
            const json = localStorage.getItem(key);

            // Fallback to legacy if Slot 1 requested but empty (and legacy exists)
            // This covers the edge case where migration hasn't run yet? 
            // Actually init() runs migration, so this shouldn't happen unless init failed.

            if (!json) {
                console.log(`💾 No save file found in Slot ${slot}.`);
                return null;
            }

            const data = JSON.parse(json);
            console.log(`💾 Loading Save from Slot ${slot}:`, data);
            this.currentSlot = slot;

            if (data.playerStats && window.GameState) {
                Object.assign(window.GameState.playerStats, data.playerStats);
            }

            if (data.settings && data.settings.difficulty && window.GameState) {
                window.GameState.currentDifficulty = data.settings.difficulty;
            }

            // Restore settings
            if (data.settings) {
                if (window.updateMusicVolume && data.settings.musicVolume !== undefined)
                    window.updateMusicVolume(data.settings.musicVolume);
                if (window.updateSFXVolume && data.settings.sfxVolume !== undefined)
                    window.updateSFXVolume(data.settings.sfxVolume);
                if (window.toggleMusic && data.settings.musicEnabled !== undefined)
                    window.toggleMusic(data.settings.musicEnabled);
            }

            return data;
        } catch (e) {
            console.error('❌ Failed to load game:', e);
            return null;
        }
    },

    getSlotMeta(slot) {
        try {
            const json = localStorage.getItem(this.getSlotKey(slot));
            if (!json) return null;
            const data = JSON.parse(json);
            return {
                timestamp: data.timestamp,
                info: data.meta || { level: '?', map: 'Unknown' } // fallback for old saves without meta
            };
        } catch (e) {
            return null;
        }
    },

    hasSave(slot) {
        if (slot) return !!localStorage.getItem(this.getSlotKey(slot));
        // Check any slot
        for (let i = 1; i <= this.MAX_SLOTS; i++) {
            if (localStorage.getItem(this.getSlotKey(i))) return true;
        }
        return false;
    }
};

// Global Alias for UIManager/Buttons
// Global Alias for UIManager/Buttons
window.saveGame = (slot, silent) => window.SaveManager.saveGame(slot, silent);
window.loadGame = (slot) => {
    // If no slot specified, check if UIManager can show simple load or default
    // Ideally UIManager handles slot selection. 
    // This function is for direct loading (e.g. on start or dev console)
    slot = slot || window.SaveManager.currentSlot;

    if (window.SaveManager.hasSave(slot)) {
        localStorage.setItem('rpg_load_on_start', 'true');
        localStorage.setItem('rpg_load_slot', slot.toString()); // Persist slot choice across reload
        localStorage.setItem('rpg_load_on_start_completed', slot.toString()); // For post-reload message
        location.reload();
    } else {
        console.warn(`No save found in Slot ${slot} to load.`);
        if (window.addChatMessage) {
            window.addChatMessage(`No save found in Slot ${slot}.`, 0xff6666, '❌');
        }
    }
};

console.log('✅ SaveManager loaded');
