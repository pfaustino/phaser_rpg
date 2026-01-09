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
        debugLog('💾 SaveManager initialized. Checking migration...');
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
                    this.saveGame(this.currentSlot, false, "Autosave every 60 seconds");
                }
            }, this.AUTOSAVE_INTERVAL);
        }

        // Note: Difficulty indicator is now created in game.js (combined with map location)
    },

    getSlotKey(slot) {
        return `${this.SAME_KEY_PREFIX}${slot}`;
    },

    migrateLegacySave() {
        // Migration 1: Old SaveManager v1 format (rpg_save_data_v1)
        const legacyData = localStorage.getItem(this.LEGACY_SAVE_KEY);
        const slot1Key = this.getSlotKey(1);
        const slot1Data = localStorage.getItem(slot1Key);

        if (legacyData && !slot1Data) {
            debugLog('📦 Migrating Legacy SaveManager v1 to Slot 1...');
            localStorage.setItem(slot1Key, legacyData);
            localStorage.setItem(this.LEGACY_SAVE_KEY + '_backup', legacyData);
            debugLog('✅ Migration complete.');
        }

        // Migration 2: Very old format (rpg_savegame) - merge UQE quests if missing
        this.migrateOldSaveQuests();
    },

    /**
     * Migrate UQE quests from very old save format (rpg_savegame) to current slot
     */
    migrateOldSaveQuests() {
        const oldSaveJson = localStorage.getItem('rpg_savegame');
        if (!oldSaveJson) return;

        try {
            const oldSave = JSON.parse(oldSaveJson);
            if (!oldSave.uqeQuests) {
                debugLog('[Migration] Old save has no UQE quests to migrate.');
                return;
            }

            // Check current slot for UQE data
            const currentSlotKey = this.getSlotKey(this.currentSlot || 1);
            const currentJson = localStorage.getItem(currentSlotKey);
            if (!currentJson) {
                debugLog('[Migration] No current slot data to migrate into.');
                return;
            }

            const currentData = JSON.parse(currentJson);
            if (currentData.uqeQuests && Object.keys(currentData.uqeQuests).length > 0) {
                debugLog('[Migration] Current slot already has UQE quests, skipping migration.');
                return;
            }

            // Migrate!
            debugLog('📦 Migrating UQE quests from old rpg_savegame to current slot...');
            currentData.uqeQuests = oldSave.uqeQuests;
            localStorage.setItem(currentSlotKey, JSON.stringify(currentData));
            debugLog('✅ UQE quest migration complete! Reload to apply.');

            // Also load into current session if uqe is ready
            if (window.uqe && typeof window.uqe.loadSaveData === 'function') {
                window.uqe.loadSaveData(oldSave.uqeQuests);
                debugLog('✅ UQE quests loaded into current session!');
                if (window.addChatMessage) {
                    window.addChatMessage('Quest data restored from old save!', 0x00ff00, '🎯');
                }
            }
        } catch (e) {
            console.error('[Migration] Failed to migrate old save quests:', e);
        }
    },

    /**
     * Save the current game state to a specific slot
     * @param {number} slot - Slot number (1-5)
     * @param {boolean} silent - Suppress UI feedback
     */
    saveGame(slot = 1, silent = false, customMessage = null) {


        // Cancel any click-to-move in progress (prevent walking after save)
        const scene = this.scene || (window.game && window.game.scene.scenes[0]);
        if (scene) {
            scene.isMovingToClick = false;
            scene.clickMoveTarget = null;
        }

        if (!window.GameState) {

            return false;
        }
        slot = slot || this.currentSlot;


        try {
            const data = {
                timestamp: Date.now(),
                version: 1,
                slot: slot,
                playerStats: window.GameState.playerStats,
                // UQE Quest system data (for quest progress)
                uqeQuests: window.uqe && typeof window.uqe.getSaveData === 'function' ? window.uqe.getSaveData() : null,
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
                    playtime: window.GameState.playtime || 0
                }
            };



            const json = JSON.stringify(data);
            const slotKey = this.getSlotKey(slot);


            localStorage.setItem(slotKey, json);
            this.currentSlot = slot;

            // VERIFY the save was written


            debugLog(`💾 Game Saved to Slot ${slot}! Size: ${json.length} bytes`);

            if (!silent) {
                const msg = customMessage ? `${customMessage} (Slot ${slot})` : `Game Saved (Slot ${slot}).`;

                if (window.showDamageNumber && window.player) {
                    window.showDamageNumber(window.player.x, window.player.y - 50, customMessage || "Game Saved!", 0x00ff00);
                }
                if (window.addChatMessage) {
                    window.addChatMessage(msg, 0x00ff00, '💾');
                }
                const scene = this.scene || (window.game && window.game.scene.scenes[0]);
                if (scene && scene.sound && window.sfxVolume > 0 && scene.cache.audio.exists('menu_select')) {
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


            if (!json) {

                return null;
            }

            const data = JSON.parse(json);


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

            // SANITIZATION FIX (Idle Slowdown Bug)
            // Ensure speed is reset if corrupted (e.g. set to < 50)
            if (window.GameState.playerStats.speed < 100) {
                console.warn('⚠️ Detected corrupted player speed (< 100). Resetting to 200.');
                window.GameState.playerStats.speed = 200;
            }

            // Recalculate stats to ensure speed includes base + equipment
            if (typeof recalculatePlayerStats === 'function') {
                recalculatePlayerStats();
            } else if (window.PlayerStatsManager) {
                window.PlayerStatsManager.recalculateStats();
            }

            // Store UQE quest data for deferred loading (UQE definitions may not be loaded yet)
            if (data.uqeQuests) {

                window._pendingUqeQuests = data.uqeQuests;

                // Try to load now if UQE is ready
                if (window.uqe && Object.keys(window.uqe.allDefinitions || {}).length > 0) {

                    window.uqe.loadSaveData(data.uqeQuests);
                    window._pendingUqeQuests = null;
                }
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
window.saveGame = (slot, silent, msg) => window.SaveManager.saveGame(slot, silent, msg);
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

debugLog('✅ SaveManager loaded');
