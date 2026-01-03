/**
 * SaveManager.js
 * Handles saving and loading of game state (playerStats, world state) to localStorage.
 * Restores inventory, equipment, and player position.
 */

window.SaveManager = {
    SAVE_KEY: 'rpg_save_data_v1',
    AUTOSAVE_INTERVAL: 60000, // 1 minute

    /**
     * Initialize the save manager (called from game.js create)
     */
    init(scene) {
        this.scene = scene;
        console.log('💾 SaveManager initialized');

        // Setup Auto-save
        if (this.AUTOSAVE_INTERVAL > 0) {
            // clear previous if any (hot reload safety)
            if (this.autosaveInterval) clearInterval(this.autosaveInterval);

            this.autosaveInterval = setInterval(() => {
                // Only autosave if game is active and player is alive
                if (window.GameState && !window.GameState.isGamePaused && window.player && window.player.active && window.playerStats.hp > 0) {
                    this.saveGame(true); // silent autosave
                }
            }, this.AUTOSAVE_INTERVAL);
        }
    },

    /**
     * Save the current game state
     * @param {boolean} silent - If true, suppresses UI feedback
     */
    saveGame(silent = false) {
        if (!window.GameState) return false;

        try {
            const data = {
                timestamp: Date.now(),
                version: 1,
                // Serialize Player Stats (Inventory, Equipment, XP, etc.)
                playerStats: window.GameState.playerStats,

                // World State
                world: {
                    currentMap: window.MapManager ? window.MapManager.currentMap : 'town',
                    playerX: window.player ? window.player.x : (window.lastPlayerX || 0),
                    playerY: window.player ? window.player.y : (window.lastPlayerY || 0),
                    // If in dungeon, save ID/Level
                    dungeonId: window.MapManager ? window.MapManager.currentDungeonId : null,
                    dungeonLevel: window.MapManager ? window.MapManager.dungeonLevel : 1
                },

                // Settings/Meta
                settings: {
                    difficulty: window.GameState.currentDifficulty
                }
            };

            const json = JSON.stringify(data);
            localStorage.setItem(this.SAVE_KEY, json);

            console.log(`💾 Game Saved! Size: ${json.length} bytes`);

            if (!silent) {
                // Visual Feedback
                if (window.showDamageNumber && window.player) {
                    window.showDamageNumber(window.player.x, window.player.y - 50, "Game Saved!", 0x00ff00);
                }
                if (window.addChatMessage) {
                    window.addChatMessage("Game Saved.", 0x00ff00);
                }

                // Audio Feedback (User Request)
                const scene = this.scene || (window.game && window.game.scene.scenes[0]);
                if (scene && scene.sound && window.sfxVolume > 0) {
                    // Use 'menu_select' as generic or 'item_pickup'
                    scene.sound.play('menu_select', { volume: window.sfxVolume });
                }
            }

            return true;
        } catch (e) {
            console.error('❌ Failed to save game:', e);
            if (!silent && window.addChatMessage) {
                window.addChatMessage("Save Failed!", 0xff0000);
            }
            return false;
        }
    },

    /**
     * Load the game state
     * @returns {object|null} The loaded data or null if not found
     */
    loadGame() {
        try {
            const json = localStorage.getItem(this.SAVE_KEY);
            if (!json) {
                console.log('💾 No save file found.');
                return null;
            }

            const data = JSON.parse(json);
            console.log('💾 Save file found:', data);

            // Restore Player Stats
            if (data.playerStats && window.GameState) {
                // Safe merge: overwrite keys in GameState.playerStats
                // This ensures we keep the reference to the global object
                Object.assign(window.GameState.playerStats, data.playerStats);
                console.log('   -> Player Stats restored');
            }

            // Restore Difficulty
            if (data.settings && data.settings.difficulty && window.GameState) {
                window.GameState.currentDifficulty = data.settings.difficulty;
            }

            return data;
        } catch (e) {
            console.error('❌ Failed to load game:', e);
            return null;
        }
    },

    /**
     * Check if a valid save exists
     */
    hasSave() {
        return !!localStorage.getItem(this.SAVE_KEY);
    }
};

// Global Alias for UIManager/Buttons
window.saveGame = (silent) => window.SaveManager.saveGame(silent);
window.loadGame = () => {
    // Set flag and reload to ensure clean initialization from save
    if (window.SaveManager.hasSave()) {
        localStorage.setItem('rpg_load_on_start', 'true');
        location.reload();
    } else {
        console.warn("No save found to load.");
    }
};

console.log('✅ SaveManager loaded');
