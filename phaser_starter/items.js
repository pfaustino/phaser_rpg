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

// ============================================
// ITEM GENERATION LOGIC (Moved from game.js)
// ============================================

/**
 * Get material based on quality tier
 */
function getMaterialForQuality(quality) {
    const qualityTiers = {
        'Common': ['Iron'],
        'Uncommon': ['Iron', 'Steel'],
        'Rare': ['Steel', 'Silver'],
        'Epic': ['Silver', 'Gold', 'Mithril'],
        'Legendary': ['Gold', 'Mithril', 'Dragonbone']
    };
    const available = qualityTiers[quality] || qualityTiers['Common'];
    return Phaser.Math.RND.pick(available);
}

/**
 * Get weapon type based on quality (better quality = more variety)
 */
function getWeaponTypeForQuality(quality) {
    const qualityWeapons = {
        'Common': ['Sword', 'Axe', 'Mace'],
        'Uncommon': ['Sword', 'Axe', 'Mace', 'Dagger'],
        'Rare': ['Sword', 'Axe', 'Mace', 'Dagger', 'Staff', 'Bow'],
        'Epic': Object.keys(getWeaponTypes()),
        'Legendary': Object.keys(getWeaponTypes())
    };
    const available = qualityWeapons[quality] || qualityWeapons['Common'];
    return Phaser.Math.RND.pick(available);
}

/**
 * Get prefix based on quality
 */
function getPrefixForQuality(quality) {
    const prefixes = getPrefixes();
    const available = Object.keys(prefixes).filter(p =>
        prefixes[p].quality.includes(quality)
    );
    if (available.length === 0) return null;
    return Math.random() < 0.4 ? Phaser.Math.RND.pick(available) : null; // 40% chance
}

/**
 * Get suffix based on quality
 */
function getSuffixForQuality(quality) {
    const suffixes = getSuffixes();
    const available = Object.keys(suffixes).filter(s =>
        suffixes[s].quality.includes(quality)
    );
    if (available.length === 0) return null;
    return Math.random() < 0.3 ? Phaser.Math.RND.pick(available) : null; // 30% chance
}

/**
 * Generate special properties for item
 */
function generateSpecialProperties(item, quality) {
    const props = {};
    const qualityLevels = { 'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Epic': 4, 'Legendary': 5 };
    const qLevel = qualityLevels[quality] || 1;

    // Higher quality = more likely to have special properties
    const hasSpecial = Math.random() < (0.1 + qLevel * 0.1); // 10-50% chance

    if (hasSpecial) {
        // Critical chance (weapons and rings)
        if ((item.type === 'weapon' || item.type === 'ring') && Math.random() < 0.3) {
            props.critChance = 0.02 + (qLevel * 0.01);
        }

        // Lifesteal (weapons and amulets)
        if ((item.type === 'weapon' || item.type === 'amulet') && Math.random() < 0.25) {
            props.lifesteal = 0.02 + (qLevel * 0.01);
        }

        // Elemental damage (weapons only, rare)
        if (item.type === 'weapon' && qLevel >= 3 && Math.random() < 0.2) {
            props.elementalDamage = {
                type: Phaser.Math.RND.pick(getElementalTypes()),
                amount: qLevel * 2
            };
        }

        // Resistances (armor pieces)
        if (['armor', 'helmet', 'boots', 'gloves', 'belt'].includes(item.type) && Math.random() < 0.3) {
            const resistanceTypes = ['physical', 'magic', 'fire', 'ice', 'lightning'];
            const resType = Phaser.Math.RND.pick(resistanceTypes);
            props.resistance = {};
            props.resistance[resType] = 0.05 + (qLevel * 0.02);
        }
    }

    return props;
}

/**
 * Assign item to a set (rare chance)
 */
function assignItemSet(item, quality) {
    if (quality === 'Common' || quality === 'Uncommon') return null;

    // Only Epic and Legendary can be set items, and only 30% chance
    if ((quality === 'Epic' || quality === 'Legendary') && Math.random() < 0.3) {
        const itemSets = getItemSets();
        const setNames = Object.keys(itemSets);
        const set = Phaser.Math.RND.pick(setNames);
        if (itemSets[set].pieces.includes(item.type)) {
            return set;
        }
    }
    return null;
}

/**
 * Build item name with all components
 */
function buildItemName(item) {
    const parts = [];

    if (item.prefix) parts.push(item.prefix);
    if (item.material) parts.push(item.material);
    if (item.weaponType) parts.push(item.weaponType);
    else if (item.type !== 'weapon') {
        // For non-weapons, use the type as the base name
        parts.push(item.type.charAt(0).toUpperCase() + item.type.slice(1));
    }
    if (item.suffix) parts.push(item.suffix);

    return parts.join(' ') || `${item.quality} ${item.type}`;
}

/**
 * Calculate final item stats with all modifiers
 */
function calculateItemStats(baseItem, quality) {
    const qualityLevels = { 'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Epic': 4, 'Legendary': 5 };
    const qLevel = qualityLevels[quality] || 1;

    let attackPower = baseItem.attackPower || 0;
    let defense = baseItem.defense || 0;
    let maxHp = baseItem.maxHp || 0;
    let speed = baseItem.speed || 0;
    let critChance = baseItem.critChance || 0;

    // Apply material multiplier
    const materials = getMaterials();
    if (baseItem.material && materials[baseItem.material]) {
        const mult = materials[baseItem.material].multiplier;
        attackPower = Math.floor(attackPower * mult);
        defense = Math.floor(defense * mult);
    }

    // Apply prefix bonuses
    const prefixesData = getPrefixes();
    if (baseItem.prefix && prefixesData[baseItem.prefix]) {
        const prefix = prefixesData[baseItem.prefix];
        if (prefix.attackBonus) attackPower = Math.floor(attackPower * (1 + prefix.attackBonus));
        if (prefix.defenseBonus) defense = Math.floor(defense * (1 + prefix.defenseBonus));
        if (prefix.hpBonus) maxHp = Math.floor(maxHp * (1 + prefix.hpBonus));
        if (prefix.critBonus) critChance += prefix.critBonus;
        if (prefix.lifesteal) baseItem.lifesteal = (baseItem.lifesteal || 0) + prefix.lifesteal;
        if (prefix.resistance) {
            baseItem.resistance = baseItem.resistance || {};
            Object.assign(baseItem.resistance, prefix.resistance);
        }
    }

    // Apply suffix bonuses
    const suffixesData = getSuffixes();
    if (baseItem.suffix && suffixesData[baseItem.suffix]) {
        const suffix = suffixesData[baseItem.suffix];
        if (suffix.attackBonus) attackPower = Math.floor(attackPower * (1 + suffix.attackBonus));
        if (suffix.defenseBonus) defense = Math.floor(defense * (1 + suffix.defenseBonus));
        if (suffix.hpBonus) maxHp = Math.floor(maxHp * (1 + suffix.hpBonus));
        if (suffix.speedBonus) speed = Math.floor(speed * (1 + suffix.speedBonus));
        if (suffix.critBonus) critChance += suffix.critBonus;
        if (suffix.lifesteal) baseItem.lifesteal = (baseItem.lifesteal || 0) + suffix.lifesteal;
        if (suffix.resistance) {
            baseItem.resistance = baseItem.resistance || {};
            Object.assign(baseItem.resistance, suffix.resistance);
        }
    }

    // Round values
    attackPower = Math.max(1, Math.floor(attackPower));
    defense = Math.max(0, Math.floor(defense));
    maxHp = Math.max(0, Math.floor(maxHp));
    speed = Math.max(0, Math.floor(speed));
    critChance = Math.min(0.5, Math.max(0, critChance)); // Cap at 50%

    return { attackPower, defense, maxHp, speed, critChance };
}

/**
 * Generate a random item drop
 */
function generateRandomItem() {
    const rand = Math.random();

    // Drop rates in order (highest to lowest):
    // 1. Coin (Gold): 25%
    // 2. Consumable: 20%
    // 3. Armor: 15%
    // 4. Gloves: 12%
    // 5. Boots: 10%
    // 6. Helmet: 8%
    // 7. Weapon: 5%
    // 8. Belt: 3%
    // 9. Ring: 1.5%
    // 10. Amulet: 0.5%
    // Total: 100%

    if (rand < 0.25) {
        // 25% - Coin (Gold)
        const goldAmount = Phaser.Math.Between(5, 25);
        return {
            type: 'gold',
            amount: goldAmount,
            name: `${goldAmount} Gold`,
            quality: 'Common'
        };
    }
    else if (rand < 0.45) {
        // 20% - Consumable
        if (Math.random() < 0.5) {
            return {
                type: 'consumable',
                name: 'Health Potion',
                quality: 'Common',
                healAmount: Phaser.Math.Between(20, 40)
            };
        } else {
            return {
                type: 'consumable',
                name: 'Mana Potion',
                quality: 'Common',
                manaAmount: Phaser.Math.Between(15, 30)
            };
        }
    }
    else if (rand < 0.60) {
        // 15% - Armor
        const qualities = ['Common', 'Uncommon'];
        const quality = Phaser.Math.RND.pick(qualities);
        const material = getMaterialForQuality(quality);
        const baseDefense = quality === 'Common' ? Phaser.Math.Between(3, 6) : Phaser.Math.Between(6, 10);

        const prefix = getPrefixForQuality(quality);
        const suffix = getSuffixForQuality(quality);

        const item = {
            type: 'armor',
            quality: quality,
            material: material,
            prefix: prefix,
            suffix: suffix,
            defense: baseDefense
        };

        const specialProps = generateSpecialProperties(item, quality);
        Object.assign(item, specialProps);
        item.set = assignItemSet(item, quality);
        item.name = buildItemName(item);
        const finalStats = calculateItemStats(item, quality);
        Object.assign(item, finalStats);

        return item;
    }
    else if (rand < 0.72) {
        // 12% - Gloves
        const qualities = ['Common', 'Uncommon'];
        const quality = Phaser.Math.RND.pick(qualities);
        const defense = quality === 'Common' ? Phaser.Math.Between(1, 3) : Phaser.Math.Between(3, 5);
        const attackBonus = quality === 'Common' ? Phaser.Math.Between(1, 2) : Phaser.Math.Between(2, 4);
        return {
            type: 'gloves',
            name: `${quality} Gloves`,
            quality: quality,
            defense: defense,
            attackPower: attackBonus
        };
    }
    else if (rand < 0.82) {
        // 10% - Boots
        const qualities = ['Common', 'Uncommon'];
        const quality = Phaser.Math.RND.pick(qualities);
        const material = getMaterialForQuality(quality);
        const baseDefense = quality === 'Common' ? Phaser.Math.Between(1, 3) : Phaser.Math.Between(3, 5);
        const baseSpeed = quality === 'Common' ? 5 : 10;

        const prefix = getPrefixForQuality(quality);
        const suffix = getSuffixForQuality(quality);

        const item = {
            type: 'boots',
            quality: quality,
            material: material,
            prefix: prefix,
            suffix: suffix,
            defense: baseDefense,
            speed: baseSpeed
        };

        const specialProps = generateSpecialProperties(item, quality);
        Object.assign(item, specialProps);
        item.set = assignItemSet(item, quality);
        item.name = buildItemName(item);
        const finalStats = calculateItemStats(item, quality);
        Object.assign(item, finalStats);

        return item;
    }
    else if (rand < 0.95) {
        // 5% - Weapon
        const qualities = ['Common', 'Uncommon', 'Rare'];
        const quality = Phaser.Math.RND.pick(qualities);

        // Get weapon type and material
        const weaponType = getWeaponTypeForQuality(quality);
        const material = getMaterialForQuality(quality);
        const weaponData = getWeaponTypes()[weaponType];

        // Base attack power based on quality
        const baseAttack = quality === 'Common' ? Phaser.Math.Between(5, 10) :
            quality === 'Uncommon' ? Phaser.Math.Between(10, 15) :
                Phaser.Math.Between(15, 20);

        // Apply weapon type modifier
        let attackPower = Math.floor(baseAttack * weaponData.baseAttack);
        let critChance = weaponData.critChance;

        // Get prefix and suffix
        const prefix = getPrefixForQuality(quality);
        const suffix = getSuffixForQuality(quality);

        // Create base item
        const item = {
            type: 'weapon',
            quality: quality,
            weaponType: weaponType,
            material: material,
            prefix: prefix,
            suffix: suffix,
            attackPower: attackPower,
            critChance: critChance,
            speed: weaponData.speed
        };

        // Add special properties
        const specialProps = generateSpecialProperties(item, quality);
        Object.assign(item, specialProps);

        // Assign set
        item.set = assignItemSet(item, quality);

        // Build name and calculate final stats
        item.name = buildItemName(item);
        const finalStats = calculateItemStats(item, quality);
        Object.assign(item, finalStats);

        return item;
    }
    else if (rand < 0.98) {
        // 3% - Belt
        const qualities = ['Common', 'Uncommon'];
        const quality = Phaser.Math.RND.pick(qualities);
        const material = getMaterialForQuality(quality);
        const baseDefense = quality === 'Common' ? Phaser.Math.Between(2, 4) : Phaser.Math.Between(4, 6);
        const baseHp = quality === 'Common' ? 10 : 15;

        const prefix = getPrefixForQuality(quality);
        const suffix = getSuffixForQuality(quality);

        const item = {
            type: 'belt',
            quality: quality,
            material: material,
            prefix: prefix,
            suffix: suffix,
            defense: baseDefense,
            maxHp: baseHp
        };

        const specialProps = generateSpecialProperties(item, quality);
        Object.assign(item, specialProps);
        item.set = assignItemSet(item, quality);
        item.name = buildItemName(item);
        const finalStats = calculateItemStats(item, quality);
        Object.assign(item, finalStats);

        return item;
    }
    else if (rand < 0.995) {
        // 1.5% - Ring
        const qualities = ['Common', 'Uncommon', 'Rare'];
        const quality = Phaser.Math.RND.pick(qualities);
        const attackBonus = quality === 'Common' ? Phaser.Math.Between(1, 3) :
            quality === 'Uncommon' ? Phaser.Math.Between(3, 5) :
                Phaser.Math.Between(5, 8);
        return {
            type: 'ring',
            name: `${quality} Ring`,
            quality: quality,
            attackPower: attackBonus,
            defense: Math.floor(attackBonus / 2) // Rings give both attack and defense
        };
    }
    else {
        // 0.5% - Amulet (rarest)
        const qualities = ['Common', 'Uncommon', 'Rare'];
        const quality = Phaser.Math.RND.pick(qualities);
        const material = getMaterialForQuality(quality);
        const baseDefense = quality === 'Common' ? Phaser.Math.Between(2, 4) :
            quality === 'Uncommon' ? Phaser.Math.Between(4, 6) :
                Phaser.Math.Between(6, 10);
        const baseHp = quality === 'Common' ? 10 : quality === 'Uncommon' ? 20 : 30;

        const prefix = getPrefixForQuality(quality);
        const suffix = getSuffixForQuality(quality);

        const item = {
            type: 'amulet',
            quality: quality,
            material: material,
            prefix: prefix,
            suffix: suffix,
            defense: baseDefense,
            maxHp: baseHp
        };

        const specialProps = generateSpecialProperties(item, quality);
        Object.assign(item, specialProps);
        item.set = assignItemSet(item, quality);
        item.name = buildItemName(item);
        const finalStats = calculateItemStats(item, quality);
        Object.assign(item, finalStats);

        return item;
    }
}

/**
 * Generate random item of specific type and quality (enhanced version)
 */
function generateRandomItemOfType(itemType, quality = 'Common') {
    const qualityLevels = {
        'Common': 1,
        'Uncommon': 2,
        'Rare': 3,
        'Epic': 4,
        'Legendary': 5
    };

    const qLevel = qualityLevels[quality] || 1;
    const material = getMaterialForQuality(quality);
    const prefix = getPrefixForQuality(quality);
    const suffix = getSuffixForQuality(quality);

    let item = {};

    switch (itemType) {
        case 'weapon':
            const weaponType = getWeaponTypeForQuality(quality);
            const weaponData = getWeaponTypes()[weaponType];
            const baseAttack = 5 + (qLevel * 5) + Phaser.Math.Between(0, 5);
            let attackPower = Math.floor(baseAttack * weaponData.baseAttack);

            item = {
                type: 'weapon',
                quality: quality,
                weaponType: weaponType,
                material: material,
                prefix: prefix,
                suffix: suffix,
                attackPower: attackPower,
                critChance: weaponData.critChance,
                speed: weaponData.speed
            };
            break;
        case 'armor':
            const armorDefense = 3 + (qLevel * 3) + Phaser.Math.Between(0, 3);
            item = {
                type: 'armor',
                quality: quality,
                material: material,
                prefix: prefix,
                suffix: suffix,
                defense: armorDefense
            };
            break;
        case 'helmet':
            const helmetDefense = 2 + (qLevel * 2) + Phaser.Math.Between(0, 2);
            item = {
                type: 'helmet',
                quality: quality,
                material: material,
                prefix: prefix,
                suffix: suffix,
                defense: helmetDefense
            };
            break;
        case 'boots':
            const bootsDefense = 1 + (qLevel * 2) + Phaser.Math.Between(0, 2);
            item = {
                type: 'boots',
                quality: quality,
                material: material,
                prefix: prefix,
                suffix: suffix,
                defense: bootsDefense,
                speed: 5 + (qLevel * 2)
            };
            break;
        case 'gloves':
            const glovesDefense = 1 + (qLevel * 2) + Phaser.Math.Between(0, 2);
            const glovesAttack = 1 + (qLevel * 1) + Phaser.Math.Between(0, 2);
            item = {
                type: 'gloves',
                quality: quality,
                material: material,
                prefix: prefix,
                suffix: suffix,
                defense: glovesDefense,
                attackPower: glovesAttack
            };
            break;
        case 'belt':
            const beltDefense = 2 + (qLevel * 2) + Phaser.Math.Between(0, 2);
            item = {
                type: 'belt',
                quality: quality,
                material: material,
                prefix: prefix,
                suffix: suffix,
                defense: beltDefense,
                maxHp: 10 + (qLevel * 5)
            };
            break;
        case 'ring':
            const ringAttack = 1 + (qLevel * 2) + Phaser.Math.Between(0, 2);
            item = {
                type: 'ring',
                quality: quality,
                material: material,
                prefix: prefix,
                suffix: suffix,
                attackPower: ringAttack,
                defense: Math.floor(ringAttack / 2)
            };
            break;
        case 'amulet':
            const amuletDefense = 2 + (qLevel * 2) + Phaser.Math.Between(0, 2);
            item = {
                type: 'amulet',
                quality: quality,
                material: material,
                prefix: prefix,
                suffix: suffix,
                defense: amuletDefense,
                maxHp: 10 + (qLevel * 10)
            };
            break;
        default:
            return generateRandomItem(); // Fallback
    }

    // Add special properties
    const specialProps = generateSpecialProperties(item, quality);
    Object.assign(item, specialProps);

    // Assign set
    item.set = assignItemSet(item, quality);

    // Build name and calculate final stats
    item.name = buildItemName(item);
    const finalStats = calculateItemStats(item, quality);
    Object.assign(item, finalStats);

    return item;
}
