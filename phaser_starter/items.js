/**
 * Items System Module
 * Loads item definitions from items.json and provides item-related utilities
 */

// Item data loaded from JSON (prefixed with _ to avoid conflicts with game.js)
let _weaponTypes = {};
let _materials = {};
let _prefixes = {};
let _suffixes = {};
let _itemSets = {};
let _elementalTypes = [];
let _qualityColors = {};
let _audioFiles = {};

// Flag to track if data is loaded
let itemsDataLoaded = false;

/**
 * Load items data from JSON file
 * @returns {Promise} Resolves when data is loaded
 */
async function loadItemsData() {
    try {
        const response = await fetch('items.json');
        if (!response.ok) {
            throw new Error(`Failed to load items.json: ${response.status}`);
        }

        const data = await response.json();

        // Assign to module-level variables
        _weaponTypes = data.weaponTypes || {};
        _materials = data.materials || {};
        _prefixes = data.prefixes || {};
        _suffixes = data.suffixes || {};
        _itemSets = data.itemSets || {};
        _elementalTypes = data.elementalTypes || [];
        _qualityColors = data.qualityColors || {};
        _audioFiles = data.audioFiles || {};

        itemsDataLoaded = true;
        console.log('✅ Items data loaded:', {
            weaponTypes: Object.keys(_weaponTypes).length,
            materials: Object.keys(_materials).length,
            prefixes: Object.keys(_prefixes).length,
            suffixes: Object.keys(_suffixes).length,
            itemSets: Object.keys(_itemSets).length
        });

        return data;
    } catch (error) {
        console.error('❌ Error loading items.json:', error);
        // Use default fallbacks if file fails to load
        initializeFallbackData();
        return null;
    }
}

/**
 * Initialize fallback data if JSON fails to load
 */
function initializeFallbackData() {
    console.warn('⚠️ Using fallback item data');
    _weaponTypes = {
        'Sword': { baseAttack: 1.0, speed: 1.0, critChance: 0.05, hitSound: 'hit_monster' },
        'Axe': { baseAttack: 1.15, speed: 0.9, critChance: 0.08, hitSound: 'hit_monster' },
        'Mace': { baseAttack: 1.1, speed: 0.85, critChance: 0.06, hitSound: 'hit_monster' },
        'Dagger': { baseAttack: 0.85, speed: 1.2, critChance: 0.12, hitSound: 'hit_monster' },
        'Staff': { baseAttack: 0.9, speed: 1.1, critChance: 0.07, hitSound: 'hit_monster' },
        'Bow': { baseAttack: 0.95, speed: 1.15, critChance: 0.10, hitSound: 'hit_monster' },
        'Crossbow': { baseAttack: 1.05, speed: 0.95, critChance: 0.09, hitSound: 'hit_monster' }
    };
    _materials = {
        'Iron': { multiplier: 1.0, tier: 1 },
        'Steel': { multiplier: 1.2, tier: 2 }
    };
    itemsDataLoaded = true;
}

/**
 * Get the hit sound for a weapon type
 * @param {string} weaponType - The weapon type (e.g., 'Sword', 'Axe')
 * @returns {string} The sound key to play
 */
function getWeaponHitSound(weaponType) {
    if (!weaponType || !_weaponTypes[weaponType]) {
        return 'hit_monster'; // Default fallback
    }
    return _weaponTypes[weaponType].hitSound || 'hit_monster';
}

/**
 * Get weapon type stats
 * @param {string} weaponType - The weapon type
 * @returns {object} Weapon stats or default
 */
function getWeaponStats(weaponType) {
    if (!weaponType || !_weaponTypes[weaponType]) {
        return { baseAttack: 1.0, speed: 1.0, critChance: 0.05, hitSound: 'hit_monster' };
    }
    return _weaponTypes[weaponType];
}

/**
 * Get material stats
 * @param {string} material - The material name
 * @returns {object} Material stats or default
 */
function getMaterialStats(material) {
    if (!material || !_materials[material]) {
        return { multiplier: 1.0, tier: 1 };
    }
    return _materials[material];
}

/**
 * Get quality color for UI
 * @param {string} quality - Item quality
 * @returns {string} Hex color string
 */
function getQualityColor(quality) {
    return _qualityColors[quality] || '#9d9d9d';
}

/**
 * Check if items data has been loaded
 * @returns {boolean}
 */
function isItemsDataLoaded() {
    return itemsDataLoaded;
}

// ============================================
// GETTERS - Expose item data for game.js
// ============================================

/**
 * Get all weapon types
 * @returns {object} Weapon types object
 */
function getWeaponTypes() {
    return _weaponTypes;
}

/**
 * Get all materials
 * @returns {object} Materials object
 */
function getMaterials() {
    return _materials;
}

/**
 * Get all prefixes
 * @returns {object} Prefixes object
 */
function getPrefixes() {
    return _prefixes;
}

/**
 * Get all suffixes
 * @returns {object} Suffixes object
 */
function getSuffixes() {
    return _suffixes;
}

/**
 * Get all item sets
 * @returns {object} Item sets object
 */
function getItemSets() {
    return _itemSets;
}

/**
 * Get elemental types
 * @returns {array} Elemental types array
 */
function getElementalTypes() {
    return _elementalTypes;
}

/**
 * Get a specific prefix data
 * @param {string} prefixName - Prefix name
 * @returns {object|null} Prefix data or null
 */
function getPrefix(prefixName) {
    return _prefixes[prefixName] || null;
}

/**
 * Get a specific suffix data
 * @param {string} suffixName - Suffix name
 * @returns {object|null} Suffix data or null
 */
function getSuffix(suffixName) {
    return _suffixes[suffixName] || null;
}

/**
 * Get a specific item set data
 * @param {string} setName - Set name
 * @returns {object|null} Item set data or null
 */
function getItemSet(setName) {
    return _itemSets[setName] || null;
}
