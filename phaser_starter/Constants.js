/**
 * Constants.js
 * 
 * Centralized configuration and constants for the RPG Game.
 * Extracted from game.js to improve modularity.
 * 
 * These are assigned to the window object to ensure backward compatibility
 * with existing code in game.js.
 */

window.Constants = {
    // ============================================
    // MONSTER SPAWN SETTINGS
    // ============================================
    MAX_MONSTERS: 24,
    MONSTER_AGGRO_RADIUS: 200,      // Pixels - monsters start chasing within this distance
    MONSTER_DEAGGRO_RADIUS: 400,    // Pixels - monsters stop chasing beyond this distance
    MONSTER_RESPAWN_THRESHOLD: 12,  // MAX_MONSTERS / 2

    // ============================================
    // UI & VISUAL SETTINGS
    // ============================================
    QUALITY_COLORS: {
        'Common': 0x9d9d9d,    // Gray
        'Uncommon': 0x1eff00,  // Green
        'Rare': 0x0070dd,      // Blue
        'Epic': 0xa335ee,      // Purple
        'Legendary': 0xff8000  // Orange
    }
};

// ============================================
// GLOBAL ALIASES (Backward Compatibility)
// ============================================
// These ensure that existing code referring to 'MAX_MONSTERS' directly
// continues to work without needing to change every single reference immediately.
window.MAX_MONSTERS = window.Constants.MAX_MONSTERS;
window.MONSTER_AGGRO_RADIUS = window.Constants.MONSTER_AGGRO_RADIUS;
window.MONSTER_DEAGGRO_RADIUS = window.Constants.MONSTER_DEAGGRO_RADIUS;
window.MONSTER_RESPAWN_THRESHOLD = window.Constants.MONSTER_RESPAWN_THRESHOLD;
window.QUALITY_COLORS = window.Constants.QUALITY_COLORS;

console.log('✅ Constants loaded');
