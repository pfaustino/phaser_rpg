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
    MAX_MONSTERS: 40,
    MONSTER_AGGRO_RADIUS: 200,      // Pixels - monsters start chasing within this distance
    MONSTER_DEAGGRO_RADIUS: 400,    // Pixels - monsters stop chasing beyond this distance
    MONSTER_RESPAWN_THRESHOLD: 20,  // MAX_MONSTERS / 2

    // ============================================
    // UI & VISUAL SETTINGS
    // ============================================
    QUALITY_COLORS: {
        'Common': 0x9d9d9d,    // Gray
        'Uncommon': 0x1eff00,  // Green
        'Rare': 0x0070dd,      // Blue
        'Epic': 0xa335ee,      // Purple
        'Legendary': 0xff8000  // Orange
    },

    // ============================================
    // DIFFICULTY SETTINGS
    // ============================================
    DIFFICULTY: {
        casual: { name: 'Casual', hpMult: 0.6, dmgMult: 0.5, qualityBonus: 0, xpMult: 1.25 },
        easy: { name: 'Easy', hpMult: 0.8, dmgMult: 0.75, qualityBonus: 0, xpMult: 1.10 },
        normal: { name: 'Normal', hpMult: 1.0, dmgMult: 1.0, qualityBonus: 0, xpMult: 1.00 },
        hard: { name: 'Hard', hpMult: 1.3, dmgMult: 1.25, qualityBonus: 0.10, xpMult: 0.90 },
        nightmare: { name: 'Nightmare', hpMult: 1.6, dmgMult: 1.5, qualityBonus: 0.25, xpMult: 0.75 }
    },

    // ============================================
    // ITEM SCALING FORMULAS
    // ============================================
    ITEM_SCALING: {
        weapon: { base: 3, perLevel: 1.5 },
        armor: { base: 2, perLevel: 1.0 },
        helmet: { base: 1, perLevel: 0.7 },
        boots: { base: 1, perLevel: 0.5 },
        gloves: { base: 1, perLevel: 0.5 },
        belt: { base: 1, perLevel: 0.5 },
        ring: { base: 1, perLevel: 0.4 },
        amulet: { base: 1, perLevel: 0.4 }
    },

    // ============================================
    // QUALITY MULTIPLIERS
    // ============================================
    QUALITY_MULTIPLIERS: {
        'Common': 1.0,
        'Uncommon': 1.15,
        'Rare': 1.30,
        'Epic': 1.50,
        'Legendary': 1.75
    },

    // ============================================
    // MONSTER SCALING
    // ============================================
    MONSTER_SCALING: {
        hpPerLevel: 0.15,      // +15% HP per monster level
        attackPerLevel: 0.10   // +10% attack per monster level
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
