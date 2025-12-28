/**
 * GameState.js
 * 
 * Centralized repository for the game's mutable state.
 * Separates Data (State) from Logic (Game Loop).
 * 
 * This module is "Savable" - passing this object to JSON.stringify
 * should theoretically save the game state (excluding UI/Asset state).
 */

window.GameState = {
    // ============================================
    // PLAYER DATA
    // ============================================
    playerStats: {
        hp: 100,
        maxHp: 100,
        mana: 50,
        maxMana: 50,
        stamina: 100,
        maxStamina: 100,
        xp: 0,
        level: 1,
        baseAttack: 10,  // Base attack (without equipment)
        baseDefense: 5,  // Base defense (without equipment)
        attack: 10,      // Current attack (base + equipment)
        defense: 5,      // Current defense (base + equipment)
        lastAttackTime: 0,
        attackCooldown: 500, // milliseconds
        attackSpeedBonus: 0,  // Attack speed bonus (0-1, reduces cooldown)
        speedBonus: 0,        // Speed bonus from equipment
        comboCount: 0,       // Combo counter
        comboTimer: 0,       // Time since last attack (for combo reset)
        comboResetTime: 2000, // Combo resets after 2 seconds of no attacks
        gold: 0,
        inventory: [], // Temporary storage for picked up items
        equipment: {
            weapon: null,
            armor: null,
            helmet: null,
            ring: null,
            amulet: null,
            boots: null,
            gloves: null,
            belt: null
        },
        // Quest system
        quests: {
            active: [],      // Active side quests
            main: [],        // Active main quests
            available: [],   // Available quests (rejected/cancelled)
            completed: []    // Completed quest IDs
        },
        questStats: {        // Track quest progress
            monstersKilled: 0,
            itemsCollected: 0,
            goldEarned: 0,
            tilesTraveled: 0,
            survivalTime: 0,
            availableTabClicked: 0,
            storyProgress: {}
        },
        questChains: {}, // Track quest chain progress
        // Abilities system
        abilities: {
            heal: { lastUsed: 0 },
            fireball: { lastUsed: 0 },
            shield: { lastUsed: 0 }
        }
    },

    // ============================================
    // WORLD STATE (The "Buckets")
    // ============================================
    monsters: [],      // Active monster instances
    items: [],         // Active item instances on ground
    npcs: [],          // Active NPC instances

    // Defense Mode State
    defenseSpawnerState: {
        active: false,
        lastSpawnTime: 0,
        spawnedMonsters: [],
        waveInterval: 12000, // 12 seconds between waves
        monstersPerWave: 4,
        maxMonsters: 10
    },

    // ============================================
    // SYSTEM FLAGS
    // ============================================
    isGamePaused: false,

    // Trackers
    questTrackerEntries: [],
    lastPlayerX: 0,
    lastPlayerY: 0
};

// ============================================
// GLOBAL ALIASES (Backward Compatibility)
// ============================================
// This is the Magic Trick. Existing code in game.js that calls `playerStats.hp`
// will now transparently read/write `window.GameState.playerStats.hp`.

window.playerStats = window.GameState.playerStats;
window.monsters = window.GameState.monsters;
window.items = window.GameState.items;
window.npcs = window.GameState.npcs;
window.defenseSpawnerState = window.GameState.defenseSpawnerState;
window.isGamePaused = window.GameState.isGamePaused;
window.questTrackerEntries = window.GameState.questTrackerEntries;
window.lastPlayerX = window.GameState.lastPlayerX;
window.lastPlayerY = window.GameState.lastPlayerY;

console.log('✅ GameState loaded');
