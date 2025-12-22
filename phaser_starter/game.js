/**
 * RPG Game - Phaser.js Starter Template
 * 
 * This is a basic template to get you started with Phaser.js
 * Port your pygame game systems here one at a time.
 */

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#2c3e50',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

console.log('🎮 GAME CONFIG CREATED - Preload function:', typeof preload);

// Create the game instance
const game = new Phaser.Game(config);

console.log('🎮 PHASER GAME INSTANCE CREATED');

// Game state
let player;
let cursors;
let map;
let monsters = [];
let items = []; // Items on the ground
let npcs = []; // NPCs in the world
let spaceKey;
let currentMap = 'town'; // 'town', 'wilderness', or 'dungeon'
let transitionMarkers = []; // Array of transition marker objects
let buildings = []; // Array of building objects for collision
let dungeonWalls = []; // Array of dungeon wall objects for collision

// Dungeon system
let currentDungeon = null; // Current dungeon data structure
let dungeonLevel = 1; // Current dungeon floor level
let dungeonCache = {}; // Cache of generated dungeons (key: "level_1", "level_2", etc.)
let dungeonCompletions = {}; // Track which dungeons are completed (key: "level_1" -> true/false)
let dungeonTilesets = {
    floor: null,
    wall: null,
    floorMetadata: null,
    wallMetadata: null,
    floorTileLookup: {}, // Corner pattern -> tile data lookup
    wallTileLookup: {} // Corner pattern -> tile data lookup
};

// Monster spawn settings
const MAX_MONSTERS = 24;
const MONSTER_AGGRO_RADIUS = 200; // Pixels - monsters won't spawn within this distance of player
const MONSTER_RESPAWN_THRESHOLD = MAX_MONSTERS / 2; // Respawn when below 12

// Player stats
let playerStats = {
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
};

// ============================================
// QUEST HELPERS (Global Bridge)
// ============================================
function isQuestActive(id) {
    if (!id) return false;

    // Legacy check
    const legacyQuests = playerStats.quests.main.concat(playerStats.quests.active);
    const legacyActive = legacyQuests.some(q => q.id === id);

    // UQE check
    let uqeActive = false;
    if (window.uqe) {
        uqeActive = window.uqe.activeQuests.some(q => q.id === id);
    }

    // EXTREME LOUD LOGGING for specific quests
    if (id.startsWith('main_01_') || id === 'v2_demo_quest') {
        const uqeActiveIds = window.uqe ? window.uqe.activeQuests.map(q => q.id) : [];
        console.log(`[UQE] isQuestActive('${id}') CHECK: legacy=${legacyActive}, uqe=${uqeActive}`);
        console.log(`[UQE] Current UQE Active IDs: [${uqeActiveIds.join(', ')}]`);
    }

    return legacyActive || uqeActive;
}

function isQuestCompleted(id) {
    if (!id) return false;

    // Legacy check
    const legacyCompleted = playerStats.quests.completed.includes(id);

    // UQE check
    let uqeCompleted = false;
    if (window.uqe) {
        uqeCompleted = window.uqe.completedQuests.some(q => q.id === id);
    }

    // EXTREME LOUD LOGGING for specific quests
    if (id.startsWith('main_01_') || id === 'v2_demo_quest') {
        const uqeCompletedIds = window.uqe ? window.uqe.completedQuests.map(q => q.id) : [];
        console.log(`[UQE] isQuestCompleted('${id}') CHECK: legacy=${legacyCompleted}, uqe=${uqeCompleted}`);
        console.log(`[UQE] Current UQE Completed IDs: [${uqeCompletedIds.join(', ')}]`);
    }

    return legacyCompleted || uqeCompleted;
}

// Ensure global scope
window.isQuestActive = isQuestActive;
window.isQuestCompleted = isQuestCompleted;

// UI elements
let hpBarBg, hpBar;
let manaBarBg, manaBar;
let staminaBarBg, staminaBar;
let xpBarBg, xpBar;
let statsText;
let goldText;
let damageNumbers = []; // Array of {x, y, text, timer, color, textObject}
let comboText = null; // Combo counter display

let comboIndicator = null; // Combo visual indicator
let attackSpeedIndicator = null; // Attack speed bonus indicator
let weaponSprite = null; // Weapon sprite that follows player

// System chat box
let systemChatBox = null;
let chatMessages = [];
const MAX_CHAT_MESSAGES = 50;

// Inventory UI
let inventoryVisible = false;
let inventoryKey;
let inventoryPanel = null;
let inventoryItems = []; // Array of item display objects
// Tooltip state
let currentTooltip = null;
let tooltipHideTimer = null;

// Equipment UI
let equipmentVisible = false;
let equipmentKey;
let equipmentPanel = null;


// Settings UI
let settingsVisible = false;
let settingsKey;
let settingsPanel = null;
let musicEnabled = true; // Default to enabled

// Background music
let villageMusic = null;
let wildernessMusic = null;
let dungeonMusic = null;

// Quest UI
let questVisible = false;
let questKey;
let questPanel = null;
let questCompletedModal = null;
let newQuestModal = null;
let selectedQuestIndex = 0;
let questLogTab = 'current'; // 'current' or 'completed'
let pendingNewQuest = null; // Store new quest to show after completed modal closes
let pendingCompletedQuest = null; // Store completed quest to show after combat ends
let questManager = null; // Manager for data-driven quests
let monsterRenderer = null; // Renderer for data-driven monsters

// Dialog UI
let dialogVisible = false;
let dialogPanel = null;
let currentDialog = null;
let currentDialogNode = null;
let interactKey; // 'F' key for interaction

// Shop UI
let shopVisible = false;
let shopPanel = null;
let currentShopNPC = null;

// Building UI
let buildingPanelVisible = false;
let buildingPanel = null;
let currentBuilding = null;

// Assets window UI
let assetsVisible = false;
let assetsPanel = null;
let assetsKey; // CTRL+A key combination

// Grass debug window UI
let grassDebugVisible = false;
let grassDebugPanel = null;
let grassDebugKey; // CTRL+M key combination

// Abilities system
let abilityBar = null;
let abilityButtons = [];

// Sound system
let soundsEnabled = true;
let soundEffects = {};
let audioUnlocked = false; // Track if audio context has been unlocked

// Item quality colors
const QUALITY_COLORS = {
    'Common': 0x9d9d9d,    // Gray
    'Uncommon': 0x1eff00,  // Green
    'Rare': 0x0070dd,      // Blue
    'Epic': 0xa335ee,      // Purple
    'Legendary': 0xff8000  // Orange
};

/**
 * Preload assets (like pygame loading images)
 */
function preload() {
    // Try to load actual images first, fall back to generated graphics if they don't exist
    // NOTE: For GitHub Pages, images must be in assets/ folder relative to index.html

    console.log('🚀🚀🚀 PRELOAD FUNCTION CALLED 🚀🚀🚀');
    console.trace('PRELOAD CALL STACK');

    // Load quest data
    this.load.json('questData', 'quests.json');
    this.load.json('questDataV2', 'quests_v2.json');

    // Load Method 2 monster data
    this.load.json('monsterData', 'monsters.json');

    // Load dialog/lore system data
    this.load.json('milestoneData', 'milestones.json');
    this.load.json('loreData', 'lore.json');
    this.load.json('dialogData', 'dialogs.json');

    // Load NPC portraits for dialog system
    this.load.image('portrait_elder_malik', 'assets/images/ElderMalik-Portrait.jpg');


    // Add load event listeners for debugging - MUST be before load calls
    this.load.on('filecomplete', (key, type, data) => {
        if (key === 'grass') {
            console.log('✅✅✅ Grass file loaded successfully:', key, type);
            console.log('  File data:', data);
            if (data && data.src) {
                console.log('  Source URL:', data.src);
            }
            if (data && data.image) {
                console.log('  Image dimensions:', data.image.width, 'x', data.image.height);
            }
            // Mark that grass loaded successfully
            this.grassLoadedSuccessfully = true;
        }
    });

    this.load.on('loaderror', (file) => {
        if (file.key === 'grass') {
            console.error('❌❌❌ Grass spritesheet FAILED to load!');
            console.error('  Attempted URL:', file.src);
            console.error('  Error details:', file);
            console.error('  This means the fallback texture will be used.');
            this.grassLoadedSuccessfully = false;
        }
    });

    // Try loading images (will fail silently if files don't exist - that's OK!)
    // Load player walking animations as sprite sheets
    // Using 48x48 pixel frames
    this.load.spritesheet('player_walk_south', 'assets/animations/Low_level_teenage_wizard_walk_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('player_walk_north', 'assets/animations/Low_level_teenage_wizard_walk_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('player_walk_east', 'assets/animations/Low_level_teenage_wizard_walk_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('player_walk_west', 'assets/animations/Low_level_teenage_wizard_walk_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Load NPC spritesheets
    this.load.spritesheet('npc_lysa', 'assets/animations/Lysa.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('npc_captain_thorne', 'assets/animations/CaptainThorne.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('npc_blacksmith_brond', 'assets/animations/BlacksmithBrond.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('npc_mage_elara', 'assets/animations/MageElara.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('npc_captain_kael', 'assets/animations/CaptainKael.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('npc_elder_malik', 'assets/animations/ElderMalik.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    // Try loading other images (will fail silently if files don't exist - that's OK!)
    // Load grass as a spritesheet for variety (96x96 frames)
    // Try relative path first (works better with local server)
    const grassPath = 'assets/tiles/grass.png';
    const fullGrassPath = new URL(grassPath, window.location.href).href;
    console.log('🔄 PRELOAD: Attempting to load grass spritesheet from:', grassPath);
    console.log('🔄 PRELOAD: Full resolved path:', fullGrassPath);
    console.log('🔄 PRELOAD: Current working directory context:', window.location.href);

    // Initialize load success flag
    this.grassSpritesheetLoaded = false;

    this.load.spritesheet('grass', grassPath, {
        frameWidth: 96,
        frameHeight: 96
    });

    console.log('🔄 PRELOAD: load.spritesheet() called for grass');

    // Track if grass spritesheet loaded successfully
    this.load.once('filecomplete-spritesheet-grass', (key, type, data) => {
        console.log('✅ Grass spritesheet loaded successfully!');
        console.log('  Key:', key);
        console.log('  Type:', type);
        console.log('  Data:', data);
        if (data && data.src) {
            console.log('  Source URL:', data.src);
        }
        this.grassSpritesheetLoaded = true;
    });

    this.load.on('loaderror', (file) => {
        if (file.key === 'grass') {
            console.error('❌ Grass spritesheet FAILED to load!');
            console.error('  Attempted path:', file.src);
            console.error('  File object:', file);
            this.grassSpritesheetLoaded = false;
        }
        // Track custom image load failures
        if (file.key === 'item_weapon') {
            this.customItemImagesLoaded.weapon = false;
            console.error('❌ Custom weapon image failed to load');
        } else if (file.key === 'item_armor') {
            this.customItemImagesLoaded.armor = false;
            console.error('❌ Custom armor image failed to load');
        } else if (file.key === 'item_helmet') {
            this.customItemImagesLoaded.helmet = false;
            console.error('❌ Custom helmet image failed to load');
        } else if (file.key === 'item_amulet') {
            this.customItemImagesLoaded.amulet = false;
            console.error('❌ Custom amulet image failed to load');
        } else if (file.key === 'item_boots') {
            this.customItemImagesLoaded.boots = false;
            console.error('❌ Custom boots image failed to load');
        } else if (file.key === 'item_gloves') {
            this.customItemImagesLoaded.gloves = false;
            console.error('❌ Custom gloves image failed to load');
        } else if (file.key === 'item_belt') {
            this.customItemImagesLoaded.belt = false;
            console.error('❌ Custom belt image failed to load');
        } else if (file.key === 'item_ring') {
            this.customItemImagesLoaded.ring = false;
            console.error('❌ Custom ring image failed to load');
        } else if (file.key === 'item_consumable') {
            this.customItemImagesLoaded.consumable = false;
            console.error('❌ Custom consumable image failed to load');
        }
    });

    // Load custom item images
    // Track which custom images loaded successfully
    this.customItemImagesLoaded = {
        weapon: false,
        armor: false,
        helmet: false,
        amulet: false,
        boots: false,
        gloves: false,
        belt: false,
        ring: false,
        consumable: false
    };

    // Track successful image loads (set up handlers BEFORE loading)
    this.load.on('filecomplete-image-item_weapon', () => {
        this.customItemImagesLoaded.weapon = true;
        console.log('✅ Custom weapon image loaded');
    });
    this.load.on('filecomplete-image-item_armor', () => {
        this.customItemImagesLoaded.armor = true;
        console.log('✅ Custom armor image loaded');
    });
    this.load.on('filecomplete-image-item_helmet', () => {
        this.customItemImagesLoaded.helmet = true;
        console.log('✅ Custom helmet image loaded');
    });
    this.load.on('filecomplete-image-item_amulet', () => {
        this.customItemImagesLoaded.amulet = true;
        console.log('✅ Custom amulet image loaded');
    });
    this.load.on('filecomplete-image-item_boots', () => {
        this.customItemImagesLoaded.boots = true;
        console.log('✅ Custom boots image loaded');
    });
    this.load.on('filecomplete-image-item_gloves', () => {
        this.customItemImagesLoaded.gloves = true;
        console.log('✅ Custom gloves image loaded');
    });
    this.load.on('filecomplete-image-item_belt', () => {
        this.customItemImagesLoaded.belt = true;
        console.log('✅ Custom belt image loaded');
    });
    this.load.on('filecomplete-image-item_ring', () => {
        this.customItemImagesLoaded.ring = true;
        console.log('✅ Custom ring image loaded');
    });
    this.load.on('filecomplete-image-item_consumable', () => {
        this.customItemImagesLoaded.consumable = true;
        console.log('✅ Custom consumable image loaded');
    });

    // Now load the images
    this.load.image('item_weapon', 'assets/images/pixellab-medieval-short-sword-1765494973241.png');
    // Weapon sprites for in-game display (48x48)
    // For now, we'll use the same sprite for all weapons, but structure allows for weapon-specific sprites
    this.load.image('weapon_sword', 'assets/images/pixellab-medieval-short-sword-1765494973241.png');
    this.load.image('weapon_axe', 'assets/images/basic-axe.png');
    this.load.image('weapon_bow', 'assets/images/basic-bow.png');
    this.load.image('weapon_mace', 'assets/images/basic-mace.png');
    this.load.image('weapon_dagger', 'assets/images/basic-dagger.png');
    this.load.image('weapon_staff', 'assets/images/basic-staff.png');
    this.load.image('weapon_crossbow', 'assets/images/basic-crossbow.png');
    this.load.image('item_armor', 'assets/images/pixellab-medieval-cloth-chest-armor-1765494738527.png');
    this.load.image('item_helmet', 'assets/images/pixellab-medieval-leather-helmet-1765494658638.png');
    this.load.image('item_amulet', 'assets/images/pixellab-medieval-jeweled-amulet-1765494933856.png');
    this.load.image('item_boots', 'assets/images/pixellab-medieval-leather-boots-1765494901812.png');
    this.load.image('item_gloves', 'assets/images/pixellab-medieval-purple-cloth-gloves---1765494868593.png');
    this.load.image('item_belt', 'assets/images/pixellab-medieval-belt---just-the-belt-1765494612990.png');
    this.load.image('item_ring', 'assets/images/pixellab-golden-ring-1765494525925.png');
    this.load.image('item_consumable', 'assets/images/pixellab-red-simple-health-potion-1765494342318.png');

    // Load player and monster base images
    this.load.image('player', 'assets/player.png');
    this.load.image('monster', 'assets/monster.png');

    // Load monster directional sprites (from PixelLab) - static images for fallback
    // Goblin
    this.load.image('monster_goblin_south', 'assets/animations/monster_goblin_south.png');
    this.load.image('monster_goblin_north', 'assets/animations/monster_goblin_north.png');
    this.load.image('monster_goblin_east', 'assets/animations/monster_goblin_east.png');
    this.load.image('monster_goblin_west', 'assets/animations/monster_goblin_west.png');

    // Orc
    this.load.image('monster_orc_south', 'assets/animations/monster_orc_south.png');
    this.load.image('monster_orc_north', 'assets/animations/monster_orc_north.png');
    this.load.image('monster_orc_east', 'assets/animations/monster_orc_east.png');
    this.load.image('monster_orc_west', 'assets/animations/monster_orc_west.png');

    // Skeleton
    this.load.image('monster_skeleton_south', 'assets/animations/monster_skeleton_south.png');
    this.load.image('monster_skeleton_north', 'assets/animations/monster_skeleton_north.png');
    this.load.image('monster_skeleton_east', 'assets/animations/monster_skeleton_east.png');
    this.load.image('monster_skeleton_west', 'assets/animations/monster_skeleton_west.png');

    // Slime
    this.load.image('monster_slime_south', 'assets/animations/monster_slime_south.png');
    this.load.image('monster_slime_north', 'assets/animations/monster_slime_north.png');
    this.load.image('monster_slime_east', 'assets/animations/monster_slime_east.png');
    this.load.image('monster_slime_west', 'assets/animations/monster_slime_west.png');

    // Wolf
    this.load.image('monster_wolf_south', 'assets/animations/monster_wolf_south.png');
    this.load.image('monster_wolf_north', 'assets/animations/monster_wolf_north.png');
    this.load.image('monster_wolf_east', 'assets/animations/monster_wolf_east.png');
    this.load.image('monster_wolf_west', 'assets/animations/monster_wolf_west.png');

    // Dragon
    this.load.image('monster_dragon_south', 'assets/animations/monster_dragon_south.png');
    this.load.image('monster_dragon_north', 'assets/animations/monster_dragon_north.png');
    this.load.image('monster_dragon_east', 'assets/animations/monster_dragon_east.png');
    this.load.image('monster_dragon_west', 'assets/animations/monster_dragon_west.png');

    // Ghost
    this.load.image('monster_ghost_south', 'assets/animations/monster_ghost_south.png');
    this.load.image('monster_ghost_north', 'assets/animations/monster_ghost_north.png');
    this.load.image('monster_ghost_east', 'assets/animations/monster_ghost_east.png');
    this.load.image('monster_ghost_west', 'assets/animations/monster_ghost_west.png');

    // Spider (quadruped version)
    this.load.image('monster_spider_south', 'assets/animations/monster_spider_south.png');
    this.load.image('monster_spider_north', 'assets/animations/monster_spider_north.png');
    this.load.image('monster_spider_east', 'assets/animations/monster_spider_east.png');
    this.load.image('monster_spider_west', 'assets/animations/monster_spider_west.png');

    // Echo Mite (from PixelLab)
    this.load.image('monster_echo_mite', 'assets/animations/monster_echo_mite_south.png');
    this.load.image('monster_echo_mite_south', 'assets/animations/monster_echo_mite_south.png');
    this.load.image('monster_echo_mite_north', 'assets/animations/monster_echo_mite_north.png');
    this.load.image('monster_echo_mite_east', 'assets/animations/monster_echo_mite_east.png');
    this.load.image('monster_echo_mite_west', 'assets/animations/monster_echo_mite_west.png');

    // Echo Mite attack animations (64x64 frames)
    this.load.spritesheet('monster_echo_mite_attack_south', 'assets/animations/monster-echo-mite-attack-south.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('monster_echo_mite_attack_north', 'assets/animations/monster-echo-mite-attack-north.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('monster_echo_mite_attack_east', 'assets/animations/monster-echo-mite-attack-east.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('monster_echo_mite_attack_west', 'assets/animations/monster-echo-mite-attack-west.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    // Load animated sprite sheets for walking (Goblin, Orc, Skeleton, Wolf, Dragon, Slime, Ghost, and Spider)
    // Goblin walking animations (48x48 frames, 6 frames per direction)
    this.load.spritesheet('monster_goblin_walk_south', 'assets/animations/monster_goblin_walk_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_goblin_walk_north', 'assets/animations/monster_goblin_walk_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_goblin_walk_east', 'assets/animations/monster_goblin_walk_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_goblin_walk_west', 'assets/animations/monster_goblin_walk_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Goblin attack animations (48x48 frames)
    this.load.spritesheet('monster_goblin_attack_south', 'assets/animations/monster_goblin_attack_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_goblin_attack_north', 'assets/animations/monster_goblin_attack_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_goblin_attack_east', 'assets/animations/monster_goblin_attack_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_goblin_attack_west', 'assets/animations/monster_goblin_attack_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Orc walking animations (48x48 frames, 6 frames per direction)
    this.load.spritesheet('monster_orc_walk_south', 'assets/animations/monster_orc_walk_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_orc_walk_north', 'assets/animations/monster_orc_walk_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_orc_walk_east', 'assets/animations/monster_orc_walk_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_orc_walk_west', 'assets/animations/monster_orc_walk_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Orc attack animations (48x48 frames)
    this.load.spritesheet('monster_orc_attack_south', 'assets/animations/monster_orc_attack_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_orc_attack_north', 'assets/animations/monster_orc_attack_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_orc_attack_east', 'assets/animations/monster_orc_attack_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_orc_attack_west', 'assets/animations/monster_orc_attack_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Skeleton walking animations (48x48 frames, 6 frames per direction)
    this.load.spritesheet('monster_skeleton_walk_south', 'assets/animations/monster_skeleton_walk_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_skeleton_walk_north', 'assets/animations/monster_skeleton_walk_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_skeleton_walk_east', 'assets/animations/monster_skeleton_walk_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_skeleton_walk_west', 'assets/animations/monster_skeleton_walk_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Skeleton attack animations (48x48 frames)
    this.load.spritesheet('monster_skeleton_attack_south', 'assets/animations/monster_skeleton_attack_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_skeleton_attack_north', 'assets/animations/monster_skeleton_attack_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_skeleton_attack_east', 'assets/animations/monster_skeleton_attack_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_skeleton_attack_west', 'assets/animations/monster_skeleton_attack_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Wolf walking animations (48x48 frames, 6 frames per direction)
    this.load.spritesheet('monster_wolf_walk_south', 'assets/animations/monster_wolf_walk_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_wolf_walk_north', 'assets/animations/monster_wolf_walk_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_wolf_walk_east', 'assets/animations/monster_wolf_walk_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_wolf_walk_west', 'assets/animations/monster_wolf_walk_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Wolf attack animations (48x48 frames)
    this.load.spritesheet('monster_wolf_attack_south', 'assets/animations/monster_wolf_attack_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_wolf_attack_north', 'assets/animations/monster_wolf_attack_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_wolf_attack_east', 'assets/animations/monster_wolf_attack_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_wolf_attack_west', 'assets/animations/monster_wolf_attack_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Dragon walking animations (48x48 frames, 6 frames per direction)
    this.load.spritesheet('monster_dragon_walk_south', 'assets/animations/monster_dragon_walk_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_dragon_walk_north', 'assets/animations/monster_dragon_walk_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_dragon_walk_east', 'assets/animations/monster_dragon_walk_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_dragon_walk_west', 'assets/animations/monster_dragon_walk_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Dragon attack animations (48x48 frames)
    this.load.spritesheet('monster_dragon_attack_south', 'assets/animations/monster_dragon_attack_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_dragon_attack_north', 'assets/animations/monster_dragon_attack_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_dragon_attack_east', 'assets/animations/monster_dragon_attack_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_dragon_attack_west', 'assets/animations/monster_dragon_attack_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Slime walking animations (48x48 frames, 6 frames per direction)
    this.load.spritesheet('monster_slime_walk_south', 'assets/animations/monster_slime_walk_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_slime_walk_north', 'assets/animations/monster_slime_walk_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_slime_walk_east', 'assets/animations/monster_slime_walk_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_slime_walk_west', 'assets/animations/monster_slime_walk_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Slime attack animations (48x48 frames)
    this.load.spritesheet('monster_slime_attack_south', 'assets/animations/monster_slime_attack_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_slime_attack_north', 'assets/animations/monster_slime_attack_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_slime_attack_east', 'assets/animations/monster_slime_attack_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_slime_attack_west', 'assets/animations/monster_slime_attack_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Ghost walking animations (48x48 frames, 6 frames per direction)
    this.load.spritesheet('monster_ghost_walk_south', 'assets/animations/monster_ghost_walk_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_ghost_walk_north', 'assets/animations/monster_ghost_walk_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_ghost_walk_east', 'assets/animations/monster_ghost_walk_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_ghost_walk_west', 'assets/animations/monster_ghost_walk_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Ghost attack animations (48x48 frames)
    this.load.spritesheet('monster_ghost_attack_south', 'assets/animations/monster_ghost_attack_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_ghost_attack_north', 'assets/animations/monster_ghost_attack_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_ghost_attack_east', 'assets/animations/monster_ghost_attack_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_ghost_attack_west', 'assets/animations/monster_ghost_attack_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // Spider walking animations (48x48 frames, 6 frames per direction)
    this.load.spritesheet('monster_spider_walk_south', 'assets/animations/monster_spider_walk_south.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_spider_walk_north', 'assets/animations/monster_spider_walk_north.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_spider_walk_east', 'assets/animations/monster_spider_walk_east.png', {
        frameWidth: 48,
        frameHeight: 48
    });
    this.load.spritesheet('monster_spider_walk_west', 'assets/animations/monster_spider_walk_west.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    this.load.image('dirt', 'assets/tiles/tile_floor_dirt.png');
    this.load.image('stone', 'assets/tiles/tile_floor_stone.png');
    this.load.image('wall', 'assets/tiles/wall.png');

    // Load dungeon tilesets with alpha support
    // PNG images should automatically preserve transparency
    this.load.image('dungeon_floor_tileset', 'assets/tiles/dungeon/dungeon_floor_tileset.png');
    this.load.image('dungeon_wall_tileset', 'assets/tiles/dungeon/dungeon_wall_tileset.png');
    this.load.image('dungeon_entrance', 'assets/dungeon_entrance.png');
    this.load.text('dungeon_floor_metadata', 'assets/tiles/dungeon/dungeon_floor_metadata.json');
    this.load.text('dungeon_wall_metadata', 'assets/tiles/dungeon/dungeon_wall_metadata.json');

    // Generate fallback graphics (always created - used if images don't load)

    // Create fallback player sprite (yellow circle with border) - only if animations don't load
    this.add.graphics()
        .fillStyle(0xffff00)
        .fillCircle(16, 16, 14)
        .lineStyle(2, 0x000000)
        .strokeCircle(16, 16, 14)
        .generateTexture('player', 32, 32);

    // Procedural monster generation - create different monster types with unique appearances
    generateProceduralMonsters.call(this);

    // Create grass tile (green with pattern) - only if spritesheet failed to load
    // Wait longer for the texture to load, then check
    this.time.delayedCall(500, () => {
        console.log('🔍 Checking grass texture after load delay...');
        console.log('  grassLoadedSuccessfully flag:', this.grassLoadedSuccessfully);

        if (this.textures.exists('grass')) {
            const grassTexture = this.textures.get('grass');
            console.log('  Texture exists:', true);
            console.log('  Frame total:', grassTexture.frameTotal);
            console.log('  Source:', grassTexture.source);

            // Check if it's a real spritesheet (has frames and source image) or just a placeholder
            const hasRealSource = grassTexture.source && grassTexture.source[0] && grassTexture.source[0].image;
            const sourceImage = hasRealSource ? grassTexture.source[0].image : null;
            const hasFrames = grassTexture.frameTotal && grassTexture.frameTotal > 0;

            // Check if source image has a valid src (not just a canvas)
            let hasValidImageSrc = false;
            if (sourceImage) {
                const src = sourceImage.src || sourceImage.currentSrc || '';
                hasValidImageSrc = src && src !== window.location.href && !src.includes('data:') && !src.includes('canvas');
                const isCanvas = sourceImage.isCanvas || (sourceImage.tagName && sourceImage.tagName === 'CANVAS');
                console.log('  Source image src:', src);
                console.log('  Is canvas:', isCanvas);
                console.log('  Has valid image src:', hasValidImageSrc);
            }

            // If load failed or texture is a canvas (generated), create fallback
            if (this.grassLoadedSuccessfully === false || !hasRealSource || !hasFrames || !hasValidImageSrc || (sourceImage && sourceImage.isCanvas)) {
                // Remove the failed/placeholder texture and create fallback
                console.warn('⚠️ Grass spritesheet failed to load or is generated texture, removing and creating fallback');
                console.warn('  Load success flag:', this.grassLoadedSuccessfully);
                console.warn('  Has real source:', hasRealSource);
                console.warn('  Has frames:', hasFrames);
                console.warn('  Has valid src:', hasValidImageSrc);
                this.textures.remove('grass');
                this.add.graphics()
                    .fillStyle(0x59BD59)
                    .fillRect(0, 0, 32, 32)
                    .fillStyle(0x6BC96B)
                    .fillRect(0, 0, 32, 2)
                    .fillRect(0, 30, 32, 2)
                    .fillRect(0, 0, 2, 32)
                    .fillRect(30, 0, 2, 32)
                    .generateTexture('grass', 32, 32);
                console.log('✅ Created fallback grass texture');
            } else {
                console.log('✅ Grass spritesheet loaded successfully with', grassTexture.frameTotal, 'frames');
                // Verify the source image has correct dimensions
                if (sourceImage) {
                    console.log('  Source image dimensions:', sourceImage.width, 'x', sourceImage.height);
                    console.log('  Source image URL:', sourceImage.src || sourceImage.currentSrc || 'unknown');
                }
            }
        } else {
            // No grass texture at all, create fallback
            console.warn('⚠️ No grass texture found after delay, creating fallback');
            this.add.graphics()
                .fillStyle(0x59BD59)
                .fillRect(0, 0, 32, 32)
                .fillStyle(0x6BC96B)
                .fillRect(0, 0, 32, 2)
                .fillRect(0, 30, 32, 2)
                .fillRect(0, 0, 2, 32)
                .fillRect(30, 0, 2, 32)
                .generateTexture('grass', 32, 32);
            console.log('✅ Created fallback grass texture');
        }
    });

    // Create wall tile (dark gray with border)
    this.add.graphics()
        .fillStyle(0x505050)
        .fillRect(0, 0, 32, 32)
        .lineStyle(2, 0x303030)
        .strokeRect(0, 0, 32, 32)
        .fillStyle(0x606060)
        .fillRect(2, 2, 28, 2)
        .fillRect(2, 2, 2, 28)
        .generateTexture('wall', 32, 32);

    // Create dirt tile (brown)
    this.add.graphics()
        .fillStyle(0x8b4513)
        .fillRect(0, 0, 32, 32)
        .fillStyle(0x654321)
        .fillRect(4, 4, 24, 24)
        .fillStyle(0x9d5a2a)
        .fillRect(8, 8, 16, 16)
        .generateTexture('dirt', 32, 32);

    // Create stone tile (light gray checkerboard pattern)
    this.add.graphics()
        .fillStyle(0x808080)
        .fillRect(0, 0, 32, 32)
        .fillStyle(0x909090)
        .fillRect(0, 0, 16, 16)
        .fillRect(16, 16, 16, 16)
        .fillStyle(0x707070)
        .fillRect(16, 0, 16, 16)
        .fillRect(0, 16, 16, 16)
        .generateTexture('stone', 32, 32);

    // Create fallback item sprites - wait for images to load first, then create fallbacks if needed
    // Check after a delay to allow custom images to load
    this.time.delayedCall(500, () => {
        // Helper to check if texture is a loaded image (not generated)
        const isLoadedImage = (key) => {
            if (!this.textures.exists(key)) return false;
            const texture = this.textures.get(key);
            // Check if it has a source image that's not a canvas
            if (texture && texture.source && texture.source[0]) {
                const source = texture.source[0];
                if (source.image) {
                    // Check if it's not a canvas (generated texture)
                    return !source.image.isCanvas &&
                        (source.image.src || source.image.currentSrc || '').includes('.png');
                }
            }
            return false;
        };

        // Only create fallbacks if custom images didn't load (check both flag and texture)
        if (!this.customItemImagesLoaded.weapon && !isLoadedImage('item_weapon')) {
            console.log('⚠️ Creating fallback for item_weapon (custom image not loaded)');
            if (this.textures.exists('item_weapon')) {
                this.textures.remove('item_weapon'); // Remove if it exists but isn't our custom image
            }
            this.add.graphics()
                .fillStyle(0x0070dd)
                .fillRect(4, 4, 24, 24)
                .lineStyle(2, 0x000000)
                .strokeRect(4, 4, 24, 24)
                .fillStyle(0xffffff)
                .fillRect(14, 6, 4, 20) // Sword blade
                .fillRect(12, 8, 8, 4)  // Cross guard
                .generateTexture('item_weapon', 32, 32);
        }

        if (!this.customItemImagesLoaded.armor) {
            console.log('⚠️ Creating fallback for item_armor (custom image not loaded)');
            if (this.textures.exists('item_armor')) {
                this.textures.remove('item_armor');
            }
            this.add.graphics()
                .fillStyle(0x1eff00)
                .fillRect(4, 4, 24, 24)
                .lineStyle(2, 0x000000)
                .strokeRect(4, 4, 24, 24)
                .fillStyle(0xffffff)
                .fillRect(10, 8, 12, 16) // Shield shape
                .fillRect(14, 6, 4, 4)   // Top decoration
                .generateTexture('item_armor', 32, 32);
        }

        if (!this.customItemImagesLoaded.helmet) {
            console.log('⚠️ Creating fallback for item_helmet (custom image not loaded)');
            if (this.textures.exists('item_helmet')) {
                this.textures.remove('item_helmet');
            }
            this.add.graphics()
                .fillStyle(0x9370db)
                .fillRect(4, 4, 24, 24)
                .lineStyle(2, 0x000000)
                .strokeRect(4, 4, 24, 24)
                .fillStyle(0xffffff)
                .fillRect(10, 6, 12, 8) // Crown top
                .fillRect(12, 4, 8, 4)  // Crown points
                .generateTexture('item_helmet', 32, 32);
        }

        if (!this.customItemImagesLoaded.amulet) {
            console.log('⚠️ Creating fallback for item_amulet (custom image not loaded)');
            if (this.textures.exists('item_amulet')) {
                this.textures.remove('item_amulet');
            }
            this.add.graphics()
                .fillStyle(0x00ced1)
                .fillRect(8, 8, 16, 16)
                .lineStyle(2, 0x000000)
                .strokeRect(8, 8, 16, 16)
                .fillStyle(0xffffff)
                .fillRect(12, 12, 8, 8) // Center gem
                .fillRect(14, 6, 4, 4)  // Chain link
                .generateTexture('item_amulet', 32, 32);
        }

        if (!this.customItemImagesLoaded.boots) {
            console.log('⚠️ Creating fallback for item_boots (custom image not loaded)');
            if (this.textures.exists('item_boots')) {
                this.textures.remove('item_boots');
            }
            this.add.graphics()
                .fillStyle(0x8b4513)
                .fillRect(4, 8, 24, 20)
                .lineStyle(2, 0x000000)
                .strokeRect(4, 8, 24, 20)
                .fillStyle(0x654321)
                .fillRect(6, 10, 20, 16) // Boot body
                .fillRect(8, 24, 16, 4)  // Sole
                .generateTexture('item_boots', 32, 32);
        }

        if (!this.customItemImagesLoaded.gloves) {
            console.log('⚠️ Creating fallback for item_gloves (custom image not loaded)');
            if (this.textures.exists('item_gloves')) {
                this.textures.remove('item_gloves');
            }
            this.add.graphics()
                .fillStyle(0xff8c00)
                .fillRect(4, 4, 24, 24)
                .lineStyle(2, 0x000000)
                .strokeRect(4, 4, 24, 24)
                .fillStyle(0xffffff)
                .fillRect(8, 8, 16, 16) // Glove shape
                .generateTexture('item_gloves', 32, 32);
        }

        if (!this.customItemImagesLoaded.belt) {
            console.log('⚠️ Creating fallback for item_belt (custom image not loaded)');
            if (this.textures.exists('item_belt')) {
                this.textures.remove('item_belt');
            }
            this.add.graphics()
                .fillStyle(0x8b4513)
                .fillRect(4, 10, 24, 12)
                .lineStyle(2, 0x000000)
                .strokeRect(4, 10, 24, 12)
                .fillStyle(0x654321)
                .fillRect(6, 12, 20, 8) // Belt body
                .generateTexture('item_belt', 32, 32);
        }

        if (!this.customItemImagesLoaded.ring && !isLoadedImage('item_ring')) {
            console.log('⚠️ Creating fallback for item_ring (custom image not loaded)');
            if (this.textures.exists('item_ring')) {
                this.textures.remove('item_ring');
            }
            this.add.graphics()
                .fillStyle(0xffd700)
                .fillRect(8, 8, 16, 16)
                .lineStyle(2, 0x000000)
                .strokeRect(8, 8, 16, 16)
                .fillStyle(0xffff00)
                .fillRect(12, 12, 8, 8) // Ring center
                .generateTexture('item_ring', 32, 32);
        }

        if (!this.customItemImagesLoaded.consumable && !isLoadedImage('item_consumable')) {
            console.log('⚠️ Creating fallback for item_consumable (custom image not loaded)');
            if (this.textures.exists('item_consumable')) {
                this.textures.remove('item_consumable');
            }
            this.add.graphics()
                .fillStyle(0xff0000)
                .fillRect(6, 6, 20, 20)
                .lineStyle(2, 0x000000)
                .strokeRect(6, 6, 20, 20)
                .fillStyle(0xff6666)
                .fillRect(10, 10, 12, 12) // Potion body
                .fillRect(14, 4, 4, 4)     // Potion neck
                .generateTexture('item_consumable', 32, 32);
        }

        console.log('✅ Fallback textures check complete. Custom images loaded:', this.customItemImagesLoaded);
    });

    // Create fallbacks only if custom images didn't load (will be checked in delayed call)
    // For now, don't create immediate fallbacks for ring and consumable since we have custom images
    // The delayed call will create fallbacks if the custom images fail to load

    // Gold coin (yellow circle) - always create since there's no custom image
    this.add.graphics()
        .fillStyle(0xffd700)
        .fillCircle(16, 16, 12)
        .lineStyle(2, 0x000000)
        .strokeCircle(16, 16, 12)
        .fillStyle(0xffed4e)
        .fillCircle(16, 16, 8)
        .generateTexture('item_gold', 32, 32);

    // NPC sprite (cyan circle to distinguish from player/monsters)
    this.add.graphics()
        .fillStyle(0x00ffff)
        .fillCircle(16, 16, 14)
        .lineStyle(2, 0x000000)
        .strokeCircle(16, 16, 14)
        .fillStyle(0x00cccc)
        .fillCircle(16, 16, 10)
        .generateTexture('npc', 32, 32);

    // Create particle textures for hit effects
    // Hit spark texture (small yellow/orange particle)
    this.add.graphics()
        .fillStyle(0xffd700)
        .fillCircle(2, 2, 2)
        .generateTexture('hit_spark', 4, 4);

    // Impact particle texture (slightly larger)
    this.add.graphics()
        .fillStyle(0xff8800)
        .fillCircle(3, 3, 3)
        .generateTexture('impact_particle', 6, 6);

    // Death particle texture (red/orange)
    this.add.graphics()
        .fillStyle(0xff4444)
        .fillCircle(4, 4, 4)
        .generateTexture('death_particle', 8, 8);

    // Ability effect sprites
    // Fireball effect (orange/red circle)
    this.add.graphics()
        .fillStyle(0xff4400)
        .fillCircle(16, 16, 12)
        .fillStyle(0xffff00)
        .fillCircle(16, 16, 8)
        .fillStyle(0xffffff)
        .fillCircle(16, 16, 4)
        .generateTexture('fireball_effect', 32, 32);

    // Heal effect (green cross/circle)
    this.add.graphics()
        .fillStyle(0x00ff00)
        .fillCircle(16, 16, 14)
        .fillStyle(0x88ff88)
        .fillRect(14, 8, 4, 16)
        .fillRect(8, 14, 16, 4)
        .generateTexture('heal_effect', 32, 32);

    // Shield effect (blue circle with border)
    this.add.graphics()
        .lineStyle(3, 0x0088ff)
        .strokeCircle(16, 16, 14)
        .lineStyle(2, 0x00aaff)
        .strokeCircle(16, 16, 10)
        .fillStyle(0x0088ff, 0.3)
        .fillCircle(16, 16, 12)
        .generateTexture('shield_effect', 32, 32);

    // Load sound files (optional - will work without them)
    // Note: Phaser will show warnings if files don't exist, but won't crash
    this.load.audio('attack_swing', 'assets/audio/attack_swing.wav');
    this.load.audio('hit_monster', 'assets/audio/hit_monster.mp3');
    this.load.audio('hit_player', 'assets/audio/hit_player.mp3');
    this.load.audio('monster_die', 'assets/audio/monster_die.mp3');
    this.load.audio('item_pickup', 'assets/audio/item_pickup.wav');
    this.load.audio('level_up', 'assets/audio/level_up.wav');
    this.load.audio('fireball_cast', 'assets/audio/fireball_cast.wav');
    this.load.audio('heal_cast', 'assets/audio/heal_cast.wav');

    // Load background music for all areas
    this.load.audio('village_music', 'assets/audio/music/Village_Hearth_FULL_SONG_MusicGPT.mp3');
    this.load.audio('wilderness_music', 'assets/audio/music/Wilderness_of_Arcana_FULL_SONG_MusicGPT.mp3');
    this.load.audio('dungeon_music', 'assets/audio/music/Dungeon_of_Arcana_FULL_SONG_MusicGPT.mp3');
    console.log('🎵 Loading music files...');

    // Listen for music file load completion
    this.load.once('filecomplete-audio-village_music', () => {
        console.log('✅ Village music file loaded successfully');
    });
    this.load.once('filecomplete-audio-wilderness_music', () => {
        console.log('✅ Wilderness music file loaded successfully');
    });
    this.load.once('filecomplete-audio-dungeon_music', () => {
        console.log('✅ Dungeon music file loaded successfully');
    });

    this.load.on('loaderror', (file) => {
        if (file.key === 'village_music' || file.key === 'wilderness_music' || file.key === 'dungeon_music') {
            console.error(`❌ Failed to load music file: ${file.key}`, file.src);
        }
    });

    console.log('📢 Attempting to load sound files from assets/audio/');

    console.log('✅ Assets loaded: player (yellow), procedural monsters, grass (green), wall (gray), dirt (brown), stone (light gray)');
    console.log('✅ Item sprites created: weapon (blue), armor (green), consumable (red), gold (yellow)');
    console.log('✅ NPC sprite created: npc (cyan)');
    console.log('✅ Ability effects created: fireball, heal, shield');
    console.log('💡 To use real images: uncomment image loading lines in preload() and add assets/ folder');
}

/**
 * Generate procedural monster textures with different shapes and styles
 */
function generateProceduralMonsters() {
    const size = 32;
    const center = size / 2;

    // Define monster types with visual characteristics
    const monsterDefs = [
        {
            key: 'monster_goblin',
            name: 'Goblin',
            bodyColor: 0x8b4513, // Brown
            accentColor: 0x654321,
            shape: 'circle',
            features: ['ears', 'eyes'],
            size: 0.9
        },
        {
            key: 'monster_orc',
            name: 'Orc',
            bodyColor: 0x228b22, // Forest green
            accentColor: 0x006400,
            shape: 'square',
            features: ['tusks', 'eyes'],
            size: 1.1
        },
        {
            key: 'monster_skeleton',
            name: 'Skeleton',
            bodyColor: 0xf5f5dc, // Beige
            accentColor: 0xffffff,
            shape: 'circle',
            features: ['bones', 'skull'],
            size: 0.95
        },
        {
            key: 'monster_spider',
            name: 'Spider',
            bodyColor: 0x2f2f2f, // Dark gray
            accentColor: 0x1a1a1a,
            shape: 'circle',
            features: ['legs', 'eyes'],
            size: 0.8
        },
        {
            key: 'monster_slime',
            name: 'Slime',
            bodyColor: 0x00ff00, // Green
            accentColor: 0x00cc00,
            shape: 'blob',
            features: ['glow', 'eyes'],
            size: 1.0
        },
        {
            key: 'monster_wolf',
            name: 'Wolf',
            bodyColor: 0x808080, // Gray
            accentColor: 0x555555,
            shape: 'oval',
            features: ['ears', 'snout', 'eyes'],
            size: 1.0
        },
        {
            key: 'monster_dragon',
            name: 'Dragon',
            bodyColor: 0x8b0000, // Dark red
            accentColor: 0xff4500,
            shape: 'circle',
            features: ['wings', 'spikes', 'eyes'],
            size: 1.2
        },
        {
            key: 'monster_ghost',
            name: 'Ghost',
            bodyColor: 0xe0e0e0, // Light gray
            accentColor: 0xffffff,
            shape: 'blob',
            features: ['glow', 'eyes'],
            size: 1.0,
            alpha: 0.7
        },
        {
            key: 'monster_echo_mite',
            name: 'Echo_Mite',
            bodyColor: 0x8b4513, // Brownish
            accentColor: 0xff0000,
            shape: 'blob',
            features: ['eyes', 'legs'],
            size: 0.8
        }
    ];

    // Generate texture for each monster type
    monsterDefs.forEach(def => {
        const g = this.add.graphics();
        const scale = def.size;
        const radius = (size / 2) * scale;
        const alpha = def.alpha !== undefined ? def.alpha : 1.0;

        // Shadow
        g.fillStyle(0x000000, 0.3);
        g.fillCircle(center + 1, center + 1, radius);

        // Main body based on shape
        if (def.shape === 'circle') {
            g.fillStyle(def.bodyColor, alpha);
            g.fillCircle(center, center, radius);
            g.lineStyle(2, def.accentColor, alpha);
            g.strokeCircle(center, center, radius);
        } else if (def.shape === 'square') {
            const halfSize = radius;
            g.fillStyle(def.bodyColor, alpha);
            g.fillRect(center - halfSize, center - halfSize, halfSize * 2, halfSize * 2);
            g.lineStyle(2, def.accentColor, alpha);
            g.strokeRect(center - halfSize, center - halfSize, halfSize * 2, halfSize * 2);
        } else if (def.shape === 'oval') {
            g.fillStyle(def.bodyColor, alpha);
            g.fillEllipse(center, center, radius * 1.5, radius);
            g.lineStyle(2, def.accentColor, alpha);
            g.strokeEllipse(center, center, radius * 1.5, radius);
        } else if (def.shape === 'blob') {
            // Irregular blob shape
            g.fillStyle(def.bodyColor, alpha);
            g.fillCircle(center, center, radius);
            // Add blob bumps
            g.fillCircle(center - radius * 0.3, center - radius * 0.3, radius * 0.4);
            g.fillCircle(center + radius * 0.3, center - radius * 0.2, radius * 0.3);
            g.lineStyle(2, def.accentColor, alpha);
            g.strokeCircle(center, center, radius);
        }

        // Add features
        if (def.features.includes('eyes')) {
            // Two eyes
            g.fillStyle(0xffffff, alpha);
            g.fillCircle(center - radius * 0.3, center - radius * 0.2, radius * 0.15);
            g.fillCircle(center + radius * 0.3, center - radius * 0.2, radius * 0.15);
            g.fillStyle(0x000000, alpha);
            g.fillCircle(center - radius * 0.3, center - radius * 0.2, radius * 0.08);
            g.fillCircle(center + radius * 0.3, center - radius * 0.2, radius * 0.08);
        }

        if (def.features.includes('ears')) {
            // Pointed ears
            g.fillStyle(def.bodyColor, alpha);
            g.fillTriangle(
                center - radius * 0.6, center - radius * 0.5,
                center - radius * 0.3, center - radius * 0.8,
                center - radius * 0.2, center - radius * 0.4
            );
            g.fillTriangle(
                center + radius * 0.6, center - radius * 0.5,
                center + radius * 0.3, center - radius * 0.8,
                center + radius * 0.2, center - radius * 0.4
            );
        }

        if (def.features.includes('tusks')) {
            // Orc tusks
            g.fillStyle(0xffffff, alpha);
            g.fillRect(center - radius * 0.4, center + radius * 0.3, radius * 0.15, radius * 0.2);
            g.fillRect(center + radius * 0.25, center + radius * 0.3, radius * 0.15, radius * 0.2);
        }

        if (def.features.includes('bones')) {
            // Skeleton bones
            g.lineStyle(2, def.accentColor, alpha);
            // Ribs
            for (let i = -2; i <= 2; i++) {
                g.lineBetween(center + i * radius * 0.2, center - radius * 0.3,
                    center + i * radius * 0.2, center + radius * 0.3);
            }
        }

        if (def.features.includes('skull')) {
            // Skull details
            g.lineStyle(1, def.accentColor, alpha);
            // Jaw line
            g.strokeEllipse(center, center + radius * 0.4, radius * 0.6, radius * 0.3);
        }

        if (def.features.includes('legs')) {
            // Spider legs (8 legs)
            g.lineStyle(2, def.accentColor, alpha);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const startX = center + Math.cos(angle) * radius * 0.6;
                const startY = center + Math.sin(angle) * radius * 0.6;
                const endX = center + Math.cos(angle) * radius * 1.2;
                const endY = center + Math.sin(angle) * radius * 1.2;
                g.lineBetween(startX, startY, endX, endY);
            }
        }

        if (def.features.includes('wings')) {
            // Dragon wings
            g.fillStyle(def.accentColor, alpha * 0.6);
            g.fillTriangle(
                center - radius * 0.8, center,
                center - radius * 1.2, center - radius * 0.5,
                center - radius * 1.2, center + radius * 0.5
            );
            g.fillTriangle(
                center + radius * 0.8, center,
                center + radius * 1.2, center - radius * 0.5,
                center + radius * 1.2, center + radius * 0.5
            );
        }

        if (def.features.includes('spikes')) {
            // Spikes on back
            g.fillStyle(def.accentColor, alpha);
            for (let i = -1; i <= 1; i++) {
                g.fillTriangle(
                    center + i * radius * 0.4, center - radius * 0.6,
                    center + i * radius * 0.4 - radius * 0.15, center - radius * 0.9,
                    center + i * radius * 0.4 + radius * 0.15, center - radius * 0.9
                );
            }
        }

        if (def.features.includes('snout')) {
            // Wolf snout
            g.fillStyle(def.accentColor, alpha);
            g.fillEllipse(center, center + radius * 0.4, radius * 0.3, radius * 0.2);
        }

        if (def.features.includes('glow')) {
            // Glowing effect
            g.fillStyle(def.bodyColor, alpha * 0.3);
            g.fillCircle(center, center, radius * 1.3);
        }

        // Generate texture
        g.generateTexture(def.key, size, size);
        g.destroy();
    });

    // Store monster definitions globally for use in creation
    if (typeof window !== 'undefined') {
        window.monsterDefinitions = monsterDefs;
    }
}

/**
 * Create town map with streets, buildings, and NPCs
 */
function createTownMap() {
    const scene = game.scene.scenes[0];
    const tileSize = 32;
    const mapWidth = 40;
    const mapHeight = 40;

    // Clear existing buildings and markers
    buildings = [];
    transitionMarkers = [];

    // Create base grass tiles using spritesheet for variety
    let grassFrameCount = 1;
    let useFrames = false;

    if (scene.textures.exists('grass')) {
        const grassTexture = scene.textures.get('grass');
        if (grassTexture && grassTexture.frameTotal && grassTexture.frameTotal > 0) {
            grassFrameCount = grassTexture.frameTotal;
            useFrames = true;
        }
    }

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            // Add medium green background behind each grass tile
            const bgRect = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x59BD59, 1.0);
            bgRect.setOrigin(0);
            bgRect.setDepth(-1); // Behind the grass tile

            // Use random frame from spritesheet if available, otherwise use default
            // Scale 96x96 frames down to 32x32 tiles
            const scaleFactor = 32 / 96; // 0.333...
            if (useFrames) {
                const frameIndex = Math.floor(Math.random() * grassFrameCount);
                const tile = scene.add.image(x * tileSize, y * tileSize, 'grass', frameIndex).setOrigin(0);
                tile.setScale(scaleFactor);
                tile.setDepth(0);
            } else {
                // Use default grass texture (no frame index)
                const tile = scene.add.image(x * tileSize, y * tileSize, 'grass').setOrigin(0);
                tile.setScale(scaleFactor);
                tile.setDepth(0);
            }
        }
    }

    // Create main streets (cross pattern through center)
    const centerX = Math.floor(mapWidth / 2);
    const centerY = Math.floor(mapHeight / 2);

    // Horizontal main street (5 tiles wide)
    for (let x = 0; x < mapWidth; x++) {
        for (let dy = -2; dy <= 2; dy++) {
            const y = centerY + dy;
            if (y >= 0 && y < mapHeight) {
                const tile = scene.add.image(x * tileSize, y * tileSize, 'dirt').setOrigin(0);
                tile.setDepth(0);
            }
        }
    }

    // Vertical main street (5 tiles wide)
    for (let y = 0; y < mapHeight; y++) {
        for (let dx = -2; dx <= 2; dx++) {
            const x = centerX + dx;
            if (x >= 0 && x < mapWidth) {
                const tile = scene.add.image(x * tileSize, y * tileSize, 'dirt').setOrigin(0);
                tile.setDepth(0);
            }
        }
    }

    // Define player spawn and exit positions (before placing buildings)
    const entranceX = centerX * tileSize;
    const entranceY = (mapHeight - 7) * tileSize; // Exit marker position (moved north to clear UI)
    const playerSpawnX = entranceX;
    const playerSpawnY = entranceY - 50; // Player spawns above exit

    // Helper function to check if a building would block player spawn or exit
    function wouldBlockPlayerOrExit(buildingX, buildingY, buildingWidth, buildingHeight) {
        // Very large buffer zone to ensure clear path (12 tiles = 384 pixels)
        const buffer = 12 * tileSize;

        // Player spawn area (much larger protected zone)
        const spawnArea = {
            x: playerSpawnX - buffer,
            y: playerSpawnY - buffer,
            width: buffer * 2,
            height: buffer * 2
        };

        // Exit marker area (much larger protected zone)
        const exitArea = {
            x: entranceX - buffer,
            y: entranceY - buffer,
            width: buffer * 2,
            height: buffer * 2
        };

        // Check if building overlaps spawn area (any part of building)
        if (buildingX < spawnArea.x + spawnArea.width &&
            buildingX + buildingWidth > spawnArea.x &&
            buildingY < spawnArea.y + spawnArea.height &&
            buildingY + buildingHeight > spawnArea.y) {
            return true;
        }

        // Check if building overlaps exit area (any part of building)
        if (buildingX < exitArea.x + exitArea.width &&
            buildingX + buildingWidth > exitArea.x &&
            buildingY < exitArea.y + exitArea.height &&
            buildingY + buildingHeight > exitArea.y) {
            return true;
        }

        // Also check if building would create a dead-end by blocking access from spawn to exit
        // Create a path corridor between spawn and exit
        const corridorWidth = 8 * tileSize; // 8 tiles wide corridor (wider)
        const corridorX = Math.min(playerSpawnX, entranceX) - corridorWidth / 2;
        const corridorY = Math.min(playerSpawnY, entranceY);
        const corridorHeight = Math.abs(playerSpawnY - entranceY) + buffer;

        if (buildingX < corridorX + corridorWidth &&
            buildingX + buildingWidth > corridorX &&
            buildingY < corridorY + corridorHeight &&
            buildingY + buildingHeight > corridorY) {
            return true;
        }

        return false;
    }

    // Building colors
    const buildingColors = {
        inn: 0x8B4513,        // Brown
        tavern: 0x654321,      // Dark brown
        blacksmith: 0x696969,  // Gray
        shop: 0xFFD700,       // Gold
        house: 0xCD853F,       // Peru
        market: 0xFFA500,      // Orange
        watchtower: 0x483D8B   // Dark Slate Blue
    };

    // Place important buildings with quadrant restrictions
    // Upper left quadrant (x < centerX, y < centerY): Only Inn
    // Other 3 quadrants: All other buildings
    // This ensures player spawn area (bottom center) stays clear

    // Helper function to check if building is in upper left quadrant
    function isInUpperLeftQuadrant(buildingX, buildingY, buildingWidth, buildingHeight) {
        // Check if any part of building is in upper left (x < centerX, y < centerY)
        const buildingMaxX = buildingX + buildingWidth;
        const buildingMaxY = buildingY + buildingHeight;
        return buildingMaxX <= centerX * tileSize && buildingMaxY <= centerY * tileSize;
    }

    // Helper function to check if building is in other 3 quadrants (not upper left)
    function isInOtherQuadrants(buildingX, buildingY, buildingWidth, buildingHeight) {
        // Check if building is NOT entirely in upper left
        const buildingMaxX = buildingX + buildingWidth;
        const buildingMaxY = buildingY + buildingHeight;
        return !(buildingMaxX <= centerX * tileSize && buildingMaxY <= centerY * tileSize);
    }

    const buildingData = [
        // Inn: Upper left quadrant only - positioned near center for easier access
        { type: 'inn', x: 5, y: 8, width: 6, height: 5, color: buildingColors.inn, quadrant: 'upperLeft' },
        // Other buildings: Other 3 quadrants (upper right, lower left, lower right)
        // Tavern: Upper right, closer to center
        { type: 'tavern', x: centerX + 4, y: 8, width: 5, height: 5, color: buildingColors.tavern, quadrant: 'other' },
        // Blacksmith: Lower left quadrant, positioned in middle-left area for better visibility
        // At x: 3 (left side), y: 18 (middle area, well above spawn at y: 37, maxY = 22)
        // This ensures it's visible from spawn and not in upper left quadrant
        { type: 'blacksmith', x: 3, y: 18, width: 5, height: 4, color: buildingColors.blacksmith, quadrant: 'other' },
        // Shop: Lower right, moved up to avoid spawn area
        { type: 'shop', x: centerX + 4, y: 15, width: 5, height: 4, color: buildingColors.shop, quadrant: 'other' },
        // Market: Near center, upper area
        { type: 'market', x: centerX + 2, y: centerY - 4, width: 3, height: 3, color: buildingColors.market, quadrant: 'other' },
        // Watchtower: Upper right, further from center
        { type: 'watchtower', x: mapWidth - 10, y: 5, width: 4, height: 8, color: buildingColors.watchtower, quadrant: 'other' }
    ];

    // Filter out buildings that would block spawn/exit or violate quadrant rules
    const validBuildings = buildingData.filter(building => {
        const buildingX = building.x * tileSize;
        const buildingY = building.y * tileSize;
        const buildingWidth = building.width * tileSize;
        const buildingHeight = building.height * tileSize;

        // Check spawn/exit blocking
        const wouldBlock = wouldBlockPlayerOrExit(buildingX, buildingY, buildingWidth, buildingHeight);
        if (wouldBlock) {
            console.log(`⚠️ Skipping ${building.type} at (${building.x}, ${building.y}) - would block spawn/exit`);
            return false;
        }

        // Check quadrant restrictions
        if (building.quadrant === 'upperLeft') {
            // Inn must be in upper left quadrant
            if (!isInUpperLeftQuadrant(buildingX, buildingY, buildingWidth, buildingHeight)) {
                console.log(`⚠️ Skipping ${building.type} at (${building.x}, ${building.y}) - not in upper left quadrant`);
                return false;
            }
        } else if (building.quadrant === 'other') {
            // Other buildings must NOT be in upper left quadrant
            if (!isInOtherQuadrants(buildingX, buildingY, buildingWidth, buildingHeight)) {
                console.log(`⚠️ Skipping ${building.type} at (${building.x}, ${building.y}) - is in upper left quadrant (reserved for Inn)`);
                return false;
            }
        }

        return true;
    });

    // Place buildings (only valid ones that don't block spawn/exit)
    console.log(`🏗️ Placing ${validBuildings.length} valid buildings out of ${buildingData.length} total`);
    validBuildings.forEach(building => {
        const buildingCenterX = building.x * tileSize + (building.width * tileSize) / 2;
        const buildingCenterY = building.y * tileSize + (building.height * tileSize) / 2;
        console.log(`✅ Creating building: ${building.type} at tile (${building.x}, ${building.y}) = pixel (${buildingCenterX}, ${buildingCenterY})`);

        // Create building rectangle
        const buildingRect = scene.add.rectangle(
            buildingCenterX,
            buildingCenterY,
            building.width * tileSize,
            building.height * tileSize,
            building.color,
            0.9
        ).setDepth(1).setStrokeStyle(2, 0x000000);

        // Add building to collision list with interaction properties
        buildings.push({
            x: building.x * tileSize,
            y: building.y * tileSize,
            width: building.width * tileSize,
            height: building.height * tileSize,
            type: building.type,
            rect: buildingRect,
            centerX: buildingCenterX,
            centerY: buildingCenterY,
            interactionRadius: 120, // pixels - increased from 80 to make buildings easier to interact with
            interactionIndicator: null,
            showIndicator: false
        });

        // Add building label with better visibility
        const label = scene.add.text(
            buildingCenterX,
            buildingCenterY,
            building.type.toUpperCase(),
            {
                fontSize: '12px',
                fill: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setDepth(2).setOrigin(0.5, 0.5);

        // Special debug for blacksmith
        if (building.type === 'blacksmith') {
            console.log(`🔨 BLACKSMITH created at pixel position (${buildingCenterX}, ${buildingCenterY})`);
            console.log(`   Map size: ${mapWidth}x${mapHeight} tiles = ${mapWidth * tileSize}x${mapHeight * tileSize} pixels`);
            console.log(`   Blacksmith is in the LOWER LEFT area of the map`);
            console.log(`   Building rect active: ${buildingRect.active}, visible: ${buildingRect.visible}`);
            console.log(`   Label active: ${label.active}, visible: ${label.visible}`);
            // Force render by ensuring it's in the scene
            if (!buildingRect.active) {
                console.warn('⚠️ Blacksmith rect is not active!');
            }
            if (!label.active) {
                console.warn('⚠️ Blacksmith label is not active!');
            }
        }
    });

    // Place some regular houses around the edges (avoiding spawn/exit)
    // Exclude bottom center area where spawn/exit are - make it EXTREMELY large
    const protectedBottomArea = {
        minX: centerX - 18, // 18 tiles left of center (extremely wide protection)
        maxX: centerX + 18, // 18 tiles right of center
        minY: mapHeight - 20, // 20 tiles from bottom (extremely tall protection)
        maxY: mapHeight
    };

    for (let i = 0; i < 8; i++) {
        let houseX, houseY, houseW, houseH;
        let attempts = 0;
        let valid = false;

        while (!valid && attempts < 50) {
            houseW = Phaser.Math.Between(4, 6);
            houseH = Phaser.Math.Between(4, 6);
            houseX = Phaser.Math.Between(2, mapWidth - houseW - 2);
            houseY = Phaser.Math.Between(2, mapHeight - houseH - 2);

            // Check if not on street or overlapping buildings
            valid = true;
            const streetBuffer = 3;
            const buildingMinX = houseX;
            const buildingMaxX = houseX + houseW;
            const buildingMinY = houseY;
            const buildingMaxY = houseY + houseH;

            // Check if building overlaps the horizontal street (Y corridor)
            if (buildingMaxY >= centerY - streetBuffer && buildingMinY <= centerY + streetBuffer) {
                valid = false;
            }

            // Check if building overlaps the vertical street (X corridor)
            if (valid && buildingMaxX >= centerX - streetBuffer && buildingMinX <= centerX + streetBuffer) {
                valid = false;
            }

            // Check if in protected bottom area (spawn/exit zone)
            // Check if ANY part of building overlaps protected area (not just center)
            if (valid) {
                const buildingMinX = houseX;
                const buildingMaxX = houseX + houseW;
                const buildingMinY = houseY;
                const buildingMaxY = houseY + houseH;

                // Check if building overlaps protected area
                if (buildingMaxX >= protectedBottomArea.minX &&
                    buildingMinX <= protectedBottomArea.maxX &&
                    buildingMaxY >= protectedBottomArea.minY &&
                    buildingMinY <= protectedBottomArea.maxY) {
                    valid = false;
                }
            }

            // Check if in upper left quadrant (reserved for Inn only)
            if (valid) {
                const buildingMaxX = houseX + houseW;
                const buildingMaxY = houseY + houseH;
                // Upper left quadrant: x < centerX, y < centerY
                if (buildingMaxX <= centerX && buildingMaxY <= centerY) {
                    valid = false;
                }
            }

            // Check if would block player spawn or exit (using helper function)
            if (valid) {
                const buildingX = houseX * tileSize;
                const buildingY = houseY * tileSize;
                const buildingWidth = houseW * tileSize;
                const buildingHeight = houseH * tileSize;
                if (wouldBlockPlayerOrExit(buildingX, buildingY, buildingWidth, buildingHeight)) {
                    valid = false;
                    // Don't log here - too many attempts
                }
            }

            // Check if overlapping existing buildings
            if (valid) {
                for (const b of buildings) {
                    if (houseX * tileSize < b.x + b.width && houseX * tileSize + houseW * tileSize > b.x &&
                        houseY * tileSize < b.y + b.height && houseY * tileSize + houseH * tileSize > b.y) {
                        valid = false;
                        break;
                    }
                }
            }
            attempts++;
        }

        if (valid) {
            const houseRect = scene.add.rectangle(
                houseX * tileSize + (houseW * tileSize) / 2,
                houseY * tileSize + (houseH * tileSize) / 2,
                houseW * tileSize,
                houseH * tileSize,
                buildingColors.house,
                0.8
            ).setDepth(1).setStrokeStyle(2, 0x000000);

            // Calculate house center for interaction
            const houseCenterX = (houseX * tileSize) + (houseW * tileSize) / 2;
            const houseCenterY = (houseY * tileSize) + (houseH * tileSize) / 2;

            buildings.push({
                x: houseX * tileSize,
                y: houseY * tileSize,
                width: houseW * tileSize,
                height: houseH * tileSize,
                type: 'house',
                rect: houseRect,
                centerX: houseCenterX,
                centerY: houseCenterY,
                interactionRadius: 80,
                interactionIndicator: null,
                showIndicator: false
            });
        }
    }

    // Create town entrance marker (at bottom edge, center) - make it very visible
    // Note: entranceX and entranceY are already defined above

    // Create a more prominent marker with multiple visual elements
    const entranceMarker = scene.add.rectangle(entranceX, entranceY, tileSize * 4, tileSize * 4, 0x00ff00, 0.7)
        .setDepth(25).setStrokeStyle(5, 0x00ff00); // Very high depth, thicker stroke

    // Add a pulsing glow effect
    const glowMarker = scene.add.rectangle(entranceX, entranceY, tileSize * 5, tileSize * 5, 0x00ff00, 0.3)
        .setDepth(24).setStrokeStyle(3, 0x00ff00);

    const entranceText = scene.add.text(entranceX, entranceY, 'TOWN\nEXIT\n[F]', {
        fontSize: '16px',
        fill: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: {
            offsetX: 2,
            offsetY: 2,
            color: '#000000',
            blur: 4,
            stroke: true,
            fill: true
        }
    }).setDepth(26).setOrigin(0.5, 0.5); // Highest depth to ensure visibility

    // Store glow for animation
    transitionMarkers.push({
        x: entranceX,
        y: entranceY,
        radius: tileSize * 2,
        targetMap: 'wilderness',
        marker: entranceMarker,
        glow: glowMarker,
        text: entranceText
    });

    transitionMarkers.push({
        x: entranceX,
        y: entranceY,
        radius: tileSize * 1.5,
        targetMap: 'wilderness',
        marker: entranceMarker,
        text: entranceText
    });

    // Store map info
    scene.mapWidth = mapWidth;
    scene.mapHeight = mapHeight;
    scene.tileSize = tileSize;

    // Set world bounds
    const playerSize = 32;
    const worldWidth = mapWidth * tileSize;
    const worldHeight = mapHeight * tileSize;
    scene.physics.world.setBounds(
        playerSize / 2,
        playerSize / 2,
        worldWidth - playerSize,
        worldHeight - playerSize
    );

    // Position player at town center (near entrance) - ensure it's clear of buildings
    // Check spawn position AFTER all buildings are placed
    function isPositionInBuilding(x, y, playerSize) {
        for (const building of buildings) {
            if (x + playerSize > building.x &&
                x - playerSize < building.x + building.width &&
                y + playerSize > building.y &&
                y - playerSize < building.y + building.height) {
                return true;
            }
        }
        return false;
    }

    if (player) {
        const playerSize = 16; // Half of player sprite size
        let safeSpawnX = entranceX;
        let safeSpawnY = entranceY - 50; // Default spawn position
        let spawnFound = false;

        console.log(`🔍 Searching for safe spawn. Default: (${safeSpawnX}, ${safeSpawnY})`);
        console.log(`   Total buildings placed: ${buildings.length}`);
        buildings.forEach((b, i) => {
            console.log(`   Building ${i}: (${b.x}, ${b.y}, ${b.width}, ${b.height})`);
        });

        // Check if default spawn is clear
        if (!isPositionInBuilding(safeSpawnX, safeSpawnY, playerSize)) {
            spawnFound = true;
            console.log('✅ Default spawn position is clear');
        } else {
            console.log('❌ Default spawn blocked, searching for safe position...');
            // Try positions going up from exit (on the main street) - more thorough search
            for (let offset = 64; offset <= 500 && !spawnFound; offset += 32) {
                const testX = entranceX;
                const testY = entranceY - offset;

                if (!isPositionInBuilding(testX, testY, playerSize)) {
                    safeSpawnX = testX;
                    safeSpawnY = testY;
                    spawnFound = true;
                    console.log(`✅ Found safe spawn at offset ${offset}: (${testX}, ${testY})`);
                }
            }

            // If still not found, try positions to the left/right of exit - wider search
            if (!spawnFound) {
                for (let offset = -200; offset <= 200 && !spawnFound; offset += 32) {
                    for (let yOffset = 50; yOffset <= 300 && !spawnFound; yOffset += 32) {
                        const testX = entranceX + offset;
                        const testY = entranceY - yOffset;

                        if (!isPositionInBuilding(testX, testY, playerSize)) {
                            safeSpawnX = testX;
                            safeSpawnY = testY;
                            spawnFound = true;
                            console.log(`✅ Found safe spawn at (${testX}, ${testY})`);
                        }
                    }
                }
            }
        }

        player.x = safeSpawnX;
        player.y = safeSpawnY;
        console.log(`✅ Player spawned at: (${Math.floor(safeSpawnX)}, ${Math.floor(safeSpawnY)})`);
        console.log(`   Spawn area protected: X=${playerSpawnX - 16 * tileSize} to ${playerSpawnX + 16 * tileSize}, Y=${playerSpawnY - 16 * tileSize} to ${playerSpawnY + 16 * tileSize}`);

        // Verify spawn is actually clear
        if (isPositionInBuilding(safeSpawnX, safeSpawnY, playerSize)) {
            console.error('❌ ERROR: Player spawned inside a building!');
            console.error(`   Player at: (${safeSpawnX}, ${safeSpawnY})`);
            // Try to find ANY clear position on the map as last resort
            for (let y = 100; y < worldHeight - 100 && !spawnFound; y += 64) {
                for (let x = 100; x < worldWidth - 100 && !spawnFound; x += 64) {
                    if (!isPositionInBuilding(x, y, playerSize)) {
                        player.x = x;
                        player.y = y;
                        console.log(`⚠️ Emergency spawn at: (${x}, ${y})`);
                        spawnFound = true;
                    }
                }
            }
        }

        if (!spawnFound) {
            console.warn('⚠️ Could not find completely clear spawn position, using default');
        }
    }

    console.log('✅ Town map created with', buildings.length, 'buildings');
}

/**
 * Create wilderness map (original map generation)
 */
function createWildernessMap() {
    const scene = game.scene.scenes[0];
    const tileSize = 32;
    const mapWidth = 50;
    const mapHeight = 50;

    // Clear existing buildings and markers
    buildings = [];
    transitionMarkers = [];

    // Check for grass spritesheet frames for variety
    let grassFrameCount = 1;
    let useFrames = false;

    if (scene.textures.exists('grass')) {
        const grassTexture = scene.textures.get('grass');
        if (grassTexture && grassTexture.frameTotal && grassTexture.frameTotal > 0) {
            grassFrameCount = grassTexture.frameTotal;
            useFrames = true;
        }
    }

    // Create tilemap with variety
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            let tileType = 'grass';

            // Create walls around edges
            if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) {
                tileType = 'wall';
            } else {
                // Add variety to the map
                const rand = Math.random();
                if (rand < 0.1) {
                    tileType = 'dirt';
                } else if (rand < 0.15) {
                    tileType = 'stone';
                }
                // else grass (default)
            }

            // Add medium green background behind grass tiles
            if (tileType === 'grass') {
                const bgRect = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x59BD59, 1.0);
                bgRect.setOrigin(0);
                bgRect.setDepth(-1); // Behind the grass tile
            }

            // Add tiles to a static group for better performance
            // Use random frame from spritesheet if available for grass tiles
            const scaleFactor = 32 / 96; // 0.333...
            let tile;
            if (tileType === 'grass' && useFrames) {
                const frameIndex = Math.floor(Math.random() * grassFrameCount);
                tile = scene.add.image(x * tileSize, y * tileSize, 'grass', frameIndex).setOrigin(0);
                tile.setScale(scaleFactor);
            } else {
                tile = scene.add.image(x * tileSize, y * tileSize, tileType).setOrigin(0);
                // Scale grass tiles from 96x96 spritesheet frames down to 32x32
                if (tileType === 'grass') {
                    tile.setScale(scaleFactor);
                }
            }
            tile.setDepth(0); // Background layer
        }
    }

    // Create wilderness exit marker (at top center)
    const exitX = (mapWidth / 2) * tileSize;
    const exitY = 2 * tileSize;

    const exitMarker = scene.add.rectangle(exitX, exitY, tileSize * 2, tileSize * 2, 0x00ff00, 0.5)
        .setDepth(3).setStrokeStyle(3, 0x00ff00);

    const exitText = scene.add.text(exitX, exitY, 'RETURN\nTO TOWN', {
        fontSize: '12px',
        fill: '#ffffff',
        fontStyle: 'bold',
        align: 'center'
    }).setDepth(4).setOrigin(0.5, 0.5);

    transitionMarkers.push({
        x: exitX,
        y: exitY,
        radius: tileSize * 1.5,
        targetMap: 'town',
        marker: exitMarker,
        text: exitText
    });

    // Store map info
    scene.mapWidth = mapWidth;
    scene.mapHeight = mapHeight;
    scene.tileSize = tileSize;

    // Set world bounds
    const playerSize = 32;
    const worldWidth = mapWidth * tileSize;
    const worldHeight = mapHeight * tileSize;
    scene.physics.world.setBounds(
        playerSize / 2,
        playerSize / 2,
        worldWidth - playerSize,
        worldHeight - playerSize
    );

    // Position player near exit marker
    if (player) {
        player.x = exitX;
        player.y = exitY + 50;
    }

    // Create dungeon entrance markers (2-3 scattered around map)
    createDungeonEntrances(mapWidth, mapHeight, tileSize);

    console.log('✅ Wilderness map created');
}

/**
 * Create dungeon entrance markers in wilderness
 */
function createDungeonEntrances(mapWidth, mapHeight, tileSize) {
    const scene = game.scene.scenes[0];
    const numEntrances = Phaser.Math.Between(2, 3);

    for (let i = 0; i < numEntrances; i++) {
        // Place away from edges (buffer zone)
        const buffer = 5;
        const x = Phaser.Math.Between(buffer, mapWidth - buffer - 1) * tileSize;
        const y = Phaser.Math.Between(buffer, mapHeight - buffer - 1) * tileSize;

        // Create entrance marker - use cave entrance image if available, otherwise fallback to rectangle
        let entrance;
        if (scene.textures.exists('dungeon_entrance')) {
            entrance = scene.add.image(x, y, 'dungeon_entrance')
                .setDepth(3)
                .setDisplaySize(tileSize * 2, tileSize * 2);
        } else {
            // Fallback to rectangle if image didn't load
            entrance = scene.add.rectangle(x, y, tileSize * 2, tileSize * 2, 0x444444, 0.8)
                .setDepth(3).setStrokeStyle(3, 0x888888);
        }

        const text = scene.add.text(x, y, 'DUNGEON\nENTRANCE', {
            fontSize: '12px',
            fill: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        }).setDepth(4).setOrigin(0.5, 0.5);

        transitionMarkers.push({
            x: x,
            y: y,
            radius: tileSize * 1.5,
            targetMap: 'dungeon',
            dungeonLevel: 1, // Always start at level 1
            marker: entrance,
            text: text
        });
    }
}

/**
 * Transition between maps
 */
function transitionToMap(targetMap, level = 1) {
    const scene = game.scene.scenes[0];

    // Clear monsters when leaving wilderness or dungeon
    if (currentMap === 'wilderness' || currentMap === 'dungeon') {
        monsters.forEach(m => {
            if (m && m.active) {
                // Destroy HP bars before destroying monster
                if (m.hpBarBg) m.hpBarBg.destroy();
                if (m.hpBar) m.hpBar.destroy();
                m.destroy();
            }
        });
        monsters = [];
    }

    // Clear dungeon walls when leaving dungeon
    if (currentMap === 'dungeon') {
        dungeonWalls = [];
    }

    // Clear NPCs (will be repositioned)
    npcs.forEach(npc => {
        // Clean up indicators before destroying NPC
        if (npc.interactionIndicator && npc.interactionIndicator.active) {
            npc.interactionIndicator.destroy();
            npc.interactionIndicator = null;
        }
        if (npc && npc.active) npc.destroy();
    });
    npcs = [];

    // Clear buildings and transition markers
    // Close building UI if open
    if (buildingPanelVisible) {
        closeBuildingUI();
    }

    // Clean up building indicators
    buildings.forEach(b => {
        if (b.interactionIndicator && b.interactionIndicator.active) {
            b.interactionIndicator.destroy();
        }
        if (b.rect && b.rect.active) b.rect.destroy();
    });
    buildings = [];

    transitionMarkers.forEach(m => {
        if (m.marker && m.marker.active) m.marker.destroy();
        if (m.glow && m.glow.active) m.glow.destroy();
        if (m.text && m.text.active) m.text.destroy();
    });
    transitionMarkers = [];

    // Clear all tiles (depth 0-4) - but only if NOT transitioning to dungeon
    // (dungeon will clear its own tiles)
    if (targetMap !== 'dungeon') {
        const toDestroy = [];
        // Create snapshot to avoid modification during iteration
        const childrenSnapshot = Array.from(scene.children.list || []);
        childrenSnapshot.forEach(child => {
            if (child && child.depth >= 0 && child.depth <= 4 && child !== player) {
                toDestroy.push(child);
            }
        });
        // Destroy in reverse order
        for (let i = toDestroy.length - 1; i >= 0; i--) {
            const child = toDestroy[i];
            if (child && child.active) {
                try {
                    child.destroy();
                } catch (e) {
                    console.warn('Error destroying child:', e);
                }
            }
        }
    }

    // Handle background music - stop all music first
    if (villageMusic && villageMusic.isPlaying) {
        villageMusic.stop();
        villageMusic.destroy();
        villageMusic = null;
        console.log('🎵 Stopped village music');
    }
    if (wildernessMusic && wildernessMusic.isPlaying) {
        wildernessMusic.stop();
        wildernessMusic.destroy();
        wildernessMusic = null;
        console.log('🎵 Stopped wilderness music');
    }
    if (dungeonMusic && dungeonMusic.isPlaying) {
        dungeonMusic.stop();
        dungeonMusic.destroy();
        dungeonMusic = null;
        console.log('🎵 Stopped dungeon music');
    }

    // Start appropriate music for the target map
    if (musicEnabled && scene.sound) {
        let musicKey = null;
        let musicName = '';

        if (targetMap === 'town') {
            musicKey = 'village_music';
            musicName = 'village';
        } else if (targetMap === 'wilderness') {
            musicKey = 'wilderness_music';
            musicName = 'wilderness';
        } else if (targetMap === 'dungeon') {
            musicKey = 'dungeon_music';
            musicName = 'dungeon';
        }

        if (musicKey) {
            console.log(`🎵 Attempting to start ${musicName} music...`);
            console.log('   - Sound system exists:', !!scene.sound);
            console.log('   - Audio cache exists:', !!scene.cache.audio);
            console.log(`   - ${musicName} music in cache:`, scene.cache.audio.exists(musicKey));

            if (scene.cache.audio.exists(musicKey)) {
                try {
                    const music = scene.sound.add(musicKey, {
                        volume: 0.5,
                        loop: true,
                        seek: 0
                    });

                    // Store reference based on map type
                    if (targetMap === 'town') {
                        villageMusic = music;
                    } else if (targetMap === 'wilderness') {
                        wildernessMusic = music;
                    } else if (targetMap === 'dungeon') {
                        dungeonMusic = music;
                    }

                    // Try to play
                    const playResult = music.play();
                    if (playResult && typeof playResult.then === 'function') {
                        // playResult is a Promise
                        playResult.then(() => {
                            console.log(`🎵 Started ${musicName} music successfully`);
                        }).catch(err => {
                            console.warn(`⚠️ Could not play ${musicName} music (may need user interaction):`, err);
                        });
                    } else {
                        // playResult is not a Promise (or is null/undefined)
                        console.log(`🎵 Started ${musicName} music`);
                    }
                } catch (e) {
                    console.error(`❌ Error playing ${musicName} music:`, e);
                }
            } else {
                console.warn(`⚠️ ${musicName} music not found in cache. Available audio keys:`, Object.keys(scene.cache.audio.entries || {}));
            }
        }
    } else if (!musicEnabled) {
        console.log('🎵 Music is disabled, skipping background music');
    }

    // Create new map
    if (targetMap === 'town') {
        createTownMap();
        initializeNPCs(); // Reposition NPCs in town
    } else if (targetMap === 'dungeon') {
        dungeonLevel = level;
        try {
            createDungeonMap(level);
            if (!currentDungeon) {
                console.error('❌ Failed to create dungeon, returning to wilderness');
                createWildernessMap();
                spawnInitialMonsters.call(scene, scene.mapWidth * scene.tileSize, scene.mapHeight * scene.tileSize);
                currentMap = 'wilderness';
                return;
            }
            // Spawn monsters after dungeon is created (don't fail dungeon if this errors)
            try {
                spawnDungeonMonsters();
            } catch (e) {
                console.error('❌ Error spawning dungeon monsters (dungeon still created):', e);
                console.error(e.stack);
                // Don't fallback - dungeon is created, just no monsters
            }
        } catch (e) {
            console.error('❌ Error creating dungeon:', e);
            console.error(e.stack);
            // Only fallback if dungeon creation itself failed
            createWildernessMap();
            spawnInitialMonsters.call(scene, scene.mapWidth * scene.tileSize, scene.mapHeight * scene.tileSize);
            currentMap = 'wilderness';
            return;
        }
    } else {
        createWildernessMap();
        spawnInitialMonsters.call(scene, scene.mapWidth * scene.tileSize, scene.mapHeight * scene.tileSize);
    }

    currentMap = targetMap;

    // Update camera for new map - NO bounds so player stays centered
    // const worldWidth = scene.mapWidth * scene.tileSize;
    // const worldHeight = scene.mapHeight * scene.tileSize;
    // scene.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    scene.cameras.main.startFollow(player);

    console.log('✅ Transitioned to', targetMap);
}

/**
 * ========================================
 * DUNGEON GENERATION SYSTEM
 * ========================================
 */

/**
 * Generate a procedural dungeon
 */
function generateDungeon(level, width, height, seed = null) {
    // Use seed for reproducible generation
    // Note: Phaser's RND.sow() may not work as expected, so we'll use a simple seeded RNG
    if (!seed) {
        // Generate new random seed
        seed = Date.now() + Math.floor(Math.random() * 1000000);
    }

    // Simple seeded random function - CRITICAL: Must start from the same seed each time for determinism
    // Store original seed to ensure we can reset if needed
    const originalSeed = seed;
    let seedValue = seed;
    const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
    };

    // Reset function to ensure determinism (call this at start of generation)
    const resetSeed = () => {
        seedValue = originalSeed;
    };

    // Reset seed at start to ensure deterministic generation
    resetSeed();

    // Helper functions using seeded random
    const seededBetween = (min, max) => {
        return Math.floor(seededRandom() * (max - min + 1)) + min;
    };

    const seededPick = (array) => {
        return array[Math.floor(seededRandom() * array.length)];
    };

    const dungeon = {
        level: level,
        seed: seed,
        width: width,
        height: height,
        rooms: [],
        corridors: [],
        mapData: [],
        entrance: null,
        exit: null,
        seededRandom: seededRandom,
        seededBetween: seededBetween,
        seededPick: seededPick
    };

    // Initialize mapData with all floors (0 = wall, 1 = floor)
    // Start with floor everywhere, then add walls where needed
    for (let y = 0; y < height; y++) {
        dungeon.mapData[y] = [];
        for (let x = 0; x < width; x++) {
            dungeon.mapData[y][x] = 1; // Floor (base layer)
        }
    }

    // Step 1: Generate rooms
    const roomCount = seededBetween(8, 12);
    console.log(`  Generating ${roomCount} rooms...`);
    dungeon.rooms = generateRooms(dungeon, roomCount);
    console.log(`  Generated ${dungeon.rooms.length} rooms`);

    if (dungeon.rooms.length === 0) {
        console.error('❌ No rooms generated!');
        return null;
    }

    // Step 2: Connect rooms with corridors
    console.log('  Connecting rooms...');
    dungeon.corridors = connectRooms(dungeon);

    // Step 3: Since we start with all floors, we need to add walls
    // First, mark rooms and corridors as floor (they already are, but this ensures they stay floor)
    // Then add walls around the perimeter and in empty areas
    console.log('  Adding walls to map...');
    addWallsToDungeon(dungeon);

    // Step 4: Place entrance and exit
    placeDungeonFeatures(dungeon);

    console.log(`  ✅ Dungeon generated: ${dungeon.rooms.length} rooms, ${dungeon.corridors.length} corridors`);
    return dungeon;
}

/**
 * Generate rooms for the dungeon
 */
function generateRooms(dungeon, count) {
    const rooms = [];
    const minRoomSize = 3;
    const maxRoomSize = 8;
    const maxAttempts = 200;

    // Use dungeon's seeded random functions
    const seededBetween = dungeon.seededBetween || Phaser.Math.Between;

    // Ensure we have valid bounds
    if (dungeon.width < maxRoomSize + 4 || dungeon.height < maxRoomSize + 4) {
        console.warn('Dungeon too small for room generation');
        return rooms;
    }

    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let placed = false;

        while (!placed && attempts < maxAttempts) {
            const width = seededBetween(minRoomSize, maxRoomSize);
            const height = seededBetween(minRoomSize, maxRoomSize);

            // Ensure valid bounds
            const maxX = Math.max(2, dungeon.width - width - 2);
            const maxY = Math.max(2, dungeon.height - height - 2);

            if (maxX <= 2 || maxY <= 2) {
                // Can't place more rooms
                break;
            }

            const x = seededBetween(2, maxX);
            const y = seededBetween(2, maxY);

            const newRoom = {
                x: x,
                y: y,
                width: width,
                height: height,
                centerX: x + Math.floor(width / 2),
                centerY: y + Math.floor(height / 2),
                type: 'normal'
            };

            // Check for overlaps
            if (!rooms.some(room => roomsOverlap(newRoom, room))) {
                rooms.push(newRoom);
                placed = true;
            }
            attempts++;
        }

        // If we couldn't place this room, stop trying
        if (!placed) {
            console.log(`⚠️ Could only place ${rooms.length} of ${count} rooms`);
            break;
        }
    }

    // Ensure we have at least 2 rooms (entrance and exit)
    if (rooms.length < 2) {
        console.warn('Not enough rooms generated, creating minimal dungeon');
        // Create at least 2 rooms manually
        rooms.length = 0;
        rooms.push({ x: 5, y: 5, width: 5, height: 5, centerX: 7, centerY: 7, type: 'normal' });
        rooms.push({ x: dungeon.width - 10, y: dungeon.height - 10, width: 5, height: 5, centerX: dungeon.width - 7, centerY: dungeon.height - 7, type: 'normal' });
    }

    return rooms;
}

/**
 * Check if two rooms overlap
 */
function roomsOverlap(room1, room2) {
    return room1.x < room2.x + room2.width &&
        room1.x + room1.width > room2.x &&
        room1.y < room2.y + room2.height &&
        room1.y + room1.height > room2.y;
}

/**
 * Connect rooms with corridors
 */
function connectRooms(dungeon) {
    const corridors = [];

    // Simple: Connect each room to the next (creates a path)
    for (let i = 0; i < dungeon.rooms.length - 1; i++) {
        const room1 = dungeon.rooms[i];
        const room2 = dungeon.rooms[i + 1];

        // Create L-shaped corridor
        const corridor = createLShapedCorridor(
            room1.centerX, room1.centerY,
            room2.centerX, room2.centerY
        );

        corridors.push(corridor);
    }

    // Also connect first room to last room (creates a loop)
    if (dungeon.rooms.length > 2) {
        const firstRoom = dungeon.rooms[0];
        const lastRoom = dungeon.rooms[dungeon.rooms.length - 1];
        const corridor = createLShapedCorridor(
            firstRoom.centerX, firstRoom.centerY,
            lastRoom.centerX, lastRoom.centerY
        );
        corridors.push(corridor);
    }

    return corridors;
}

/**
 * Create L-shaped corridor between two points (3 tiles wide for easier navigation)
 */
function createLShapedCorridor(x1, y1, x2, y2) {
    const path = [];
    const corridorWidth = 3; // Make corridors 3 tiles wide

    // Horizontal first, then vertical
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);

    // Horizontal segment - create width
    for (let x = startX; x <= endX; x++) {
        // Add center line and one tile on each side
        for (let offset = -Math.floor(corridorWidth / 2); offset <= Math.floor(corridorWidth / 2); offset++) {
            path.push({ x: x, y: y1 + offset });
        }
    }

    // Vertical segment - create width
    for (let y = startY; y <= endY; y++) {
        // Add center line and one tile on each side
        for (let offset = -Math.floor(corridorWidth / 2); offset <= Math.floor(corridorWidth / 2); offset++) {
            const point = { x: x2 + offset, y: y };
            // Avoid duplicates
            if (!path.some(p => p.x === point.x && p.y === point.y)) {
                path.push(point);
            }
        }
    }

    return { path: path };
}

/**
 * Carve rooms into the map
 */
function carveRooms(dungeon) {
    dungeon.rooms.forEach(room => {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                if (x >= 0 && x < dungeon.width && y >= 0 && y < dungeon.height) {
                    dungeon.mapData[y][x] = 1; // Floor
                }
            }
        }
    });
}

/**
 * Add walls to dungeon - since we start with all floors, mark everything as wall
 * except rooms and corridors (which stay as floor)
 */
function addWallsToDungeon(dungeon) {
    // Create a set of all floor positions (rooms + corridors)
    const floorPositions = new Set();

    // Mark all room positions as floor
    dungeon.rooms.forEach(room => {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                if (x >= 0 && x < dungeon.width && y >= 0 && y < dungeon.height) {
                    floorPositions.add(`${x},${y}`);
                }
            }
        }
    });

    // Mark all corridor positions as floor
    dungeon.corridors.forEach(corridor => {
        if (corridor.path) {
            corridor.path.forEach(point => {
                if (point.x >= 0 && point.x < dungeon.width && point.y >= 0 && point.y < dungeon.height) {
                    floorPositions.add(`${point.x},${point.y}`);
                }
            });
        }
    });

    // Now mark everything as wall except the floor positions
    for (let y = 0; y < dungeon.height; y++) {
        for (let x = 0; x < dungeon.width; x++) {
            const key = `${x},${y}`;
            if (!floorPositions.has(key)) {
                dungeon.mapData[y][x] = 0; // Wall
            }
            // Floor positions already have mapData[y][x] = 1 from initialization
        }
    }
}

/**
 * Carve corridors into the map (kept for reference, but not used when starting with floors)
 */
function carveCorridors(dungeon) {
    dungeon.corridors.forEach(corridor => {
        corridor.path.forEach(point => {
            if (point.x >= 0 && point.x < dungeon.width &&
                point.y >= 0 && point.y < dungeon.height) {
                dungeon.mapData[point.y][point.x] = 1; // Floor
            }
        });
    });
}

/**
 * Place entrance and exit in dungeon
 */
function placeDungeonFeatures(dungeon) {
    if (dungeon.rooms.length === 0) return;

    // Entrance in first room
    const entranceRoom = dungeon.rooms[0];
    dungeon.entrance = {
        x: entranceRoom.centerX,
        y: entranceRoom.centerY
    };

    // Exit in last room
    const exitRoom = dungeon.rooms[dungeon.rooms.length - 1];
    dungeon.exit = {
        x: exitRoom.centerX,
        y: exitRoom.centerY
    };
}

/**
 * Create dungeon map from generated data
 */
function createDungeonMap(level) {
    const scene = game.scene.scenes[0];
    if (!scene) {
        console.error('❌ Scene not available for dungeon creation');
        return;
    }

    const tileSize = 32;

    try {
        // Check if dungeon already exists in cache or needs regeneration
        const dungeonKey = `level_${level}`;
        const isCompleted = dungeonCompletions[dungeonKey] || false;

        console.log(`🏗️ Creating dungeon level ${level}...`);
        console.log(`🔍 Current dungeon cache state:`, {
            dungeonKey,
            cacheExists: !!dungeonCache[dungeonKey],
            cacheHasSeed: !!(dungeonCache[dungeonKey] && dungeonCache[dungeonKey].seed),
            cacheSeed: dungeonCache[dungeonKey]?.seed,
            isCompleted,
            currentDungeonExists: !!currentDungeon,
            currentDungeonSeed: currentDungeon?.seed
        });

        // Debug: Log cache state
        console.log(`🔍 Dungeon cache check for ${dungeonKey}:`, {
            exists: !!dungeonCache[dungeonKey],
            hasSeed: !!(dungeonCache[dungeonKey] && dungeonCache[dungeonKey].seed),
            seed: dungeonCache[dungeonKey]?.seed,
            isCompleted: isCompleted,
            cacheKeys: Object.keys(dungeonCache)
        });

        if (isCompleted) {
            // Generate new dungeon (boss was defeated, reset it)
            console.log(`🔄 Dungeon level ${level} was completed, generating new one...`);
            currentDungeon = generateDungeon(level, 40, 40);
            dungeonCache[dungeonKey] = currentDungeon;
        } else if (dungeonCache[dungeonKey] && dungeonCache[dungeonKey].seed) {
            // Regenerate from saved seed
            const savedSeed = dungeonCache[dungeonKey].seed;
            console.log(`📦 Regenerating dungeon level ${level} from seed ${savedSeed}...`);

            // CRITICAL: Ensure we use the exact same seed value (convert to number if needed)
            const numericSeed = typeof savedSeed === 'number' ? savedSeed : parseInt(savedSeed, 10);
            if (isNaN(numericSeed)) {
                console.error(`❌ Invalid seed value: ${savedSeed}, generating new dungeon`);
                currentDungeon = generateDungeon(level, 40, 40);
                dungeonCache[dungeonKey] = currentDungeon;
            } else {
                currentDungeon = generateDungeon(
                    level,
                    40, 40,
                    numericSeed
                );
                if (!currentDungeon) {
                    console.error('❌ generateDungeon returned null when using seed');
                    return;
                }
                // Ensure seed is preserved in cache (use the numeric seed we passed in)
                currentDungeon.seed = numericSeed;
                dungeonCache[dungeonKey] = currentDungeon;
                console.log(`✅ Regenerated dungeon with seed ${numericSeed}, confirmed seed: ${currentDungeon.seed}`);
            }
        } else {
            // Generate new dungeon
            console.log(`🆕 Generating new dungeon level ${level} (no seed found in cache)...`);
            currentDungeon = generateDungeon(level, 40, 40);
            if (!currentDungeon) {
                console.error('❌ generateDungeon returned null');
                return;
            }
            dungeonCache[dungeonKey] = currentDungeon;
            console.log(`✅ Generated new dungeon with seed ${currentDungeon.seed}`);
        }

        if (!currentDungeon || !currentDungeon.mapData) {
            console.error('❌ Failed to generate dungeon - no mapData');
            return;
        }

        console.log(`✅ Dungeon generated successfully: ${currentDungeon.width}x${currentDungeon.height}, ${currentDungeon.rooms.length} rooms`);
    } catch (e) {
        console.error('❌ Error generating dungeon:', e);
        console.error(e.stack);
        // Don't return here - let the error propagate so transitionToMap can handle it
        throw e;
    }

    try {
        // Clear previous tiles (create a copy of the list to avoid modification during iteration)
        const toDestroy = [];
        if (scene.children && scene.children.list) {
            // Create a snapshot of children to avoid modification during iteration
            const childrenSnapshot = Array.from(scene.children.list);
            childrenSnapshot.forEach(child => {
                if (child && child.depth >= 0 && child.depth <= 4 && child !== player) {
                    toDestroy.push(child);
                }
            });
        }
        // Destroy in reverse order to avoid index issues
        for (let i = toDestroy.length - 1; i >= 0; i--) {
            const child = toDestroy[i];
            if (child && child.active) {
                try {
                    child.destroy();
                } catch (e) {
                    console.warn('Error destroying child:', e);
                }
            }
        }

        // Set dungeon background to dark blue-grey (similar to floor tiles)
        // This color matches the dark stone floor appearance
        scene.cameras.main.setBackgroundColor('#1a1a2e');

        // Create tiles from dungeon.mapData - ensure EVERY cell gets a tile
        console.log(`🎨 Rendering dungeon tiles (${currentDungeon.width}x${currentDungeon.height})...`);
        let tileCount = 0;
        let floorCount = 0;
        let wallCount = 0;
        for (let y = 0; y < currentDungeon.height; y++) {
            for (let x = 0; x < currentDungeon.width; x++) {
                const tileType = currentDungeon.mapData[y][x];
                // Ensure tileType is valid (should be 0 or 1)
                if (tileType === undefined || tileType === null) {
                    console.warn(`Invalid tileType at (${x}, ${y}), defaulting to wall`);
                    currentDungeon.mapData[y][x] = 0; // Default to wall
                }
                createDungeonTile(x, y, currentDungeon.mapData[y][x], tileSize);
                if (currentDungeon.mapData[y][x] === 1) floorCount++;
                else wallCount++;
                tileCount++;
            }
        }
        console.log(`✅ Dungeon tiles rendered: ${tileCount} tiles (${floorCount} floors, ${wallCount} walls)`);
    } catch (e) {
        console.error('❌ Error rendering dungeon tiles:', e);
        console.error(e.stack);
        throw e; // Propagate error
    }

    // Create entrance and exit markers
    try {
        createDungeonMarkers(tileSize);
    } catch (e) {
        console.error('❌ Error creating dungeon markers:', e);
        // Don't throw - markers are not critical
    }

    // Store map info
    scene.mapWidth = currentDungeon.width;
    scene.mapHeight = currentDungeon.height;
    scene.tileSize = tileSize;

    // Set world bounds
    const playerSize = 32;
    const worldWidth = currentDungeon.width * tileSize;
    const worldHeight = currentDungeon.height * tileSize;
    scene.physics.world.setBounds(
        playerSize / 2,
        playerSize / 2,
        worldWidth - playerSize,
        worldHeight - playerSize
    );

    // Position player at entrance
    if (player && currentDungeon.entrance) {
        player.x = currentDungeon.entrance.x * tileSize;
        player.y = currentDungeon.entrance.y * tileSize;
    }

    console.log(`✅ Dungeon level ${level} created (seed: ${currentDungeon.seed}, rooms: ${currentDungeon.rooms.length})`);
}

/**
 * Create texture frames from tileset for each tile
 * For wall tiles, process to make white pixels transparent
 */
function createTilesetFrames(tilesetKey, metadata, type) {
    console.log(`🔧 createTilesetFrames called: tilesetKey=${tilesetKey}, type=${type}`);
    if (!metadata || !metadata.tileset_data || !metadata.tileset_data.tiles) {
        console.warn(`⚠️ createTilesetFrames: No metadata or tiles for ${tilesetKey}`);
        return;
    }

    const tiles = metadata.tileset_data.tiles;
    console.log(`📦 Processing ${tiles.length} tiles for ${type} tileset`);
    const sourceTexture = this.textures.get(tilesetKey);

    if (!sourceTexture) {
        console.error(`❌ Source texture ${tilesetKey} not found!`);
        return;
    }

    tiles.forEach(tile => {
        const bbox = tile.bounding_box;
        const frameKey = `dungeon_${type}_${tile.id}`;

        // Remove existing texture if it exists to force reprocessing
        if (this.textures.exists(frameKey)) {
            this.textures.remove(frameKey);
        }

        // Process both floor and wall tilesets to remove green/white pixels
        if (type === 'wall' || type === 'floor') {
            // For wall tiles, process to make white pixels transparent
            try {
                // Create a canvas to process the image
                const canvas = document.createElement('canvas');
                canvas.width = bbox.width;
                canvas.height = bbox.height;
                const ctx = canvas.getContext('2d');

                // Get the source image - try different methods to access it
                let sourceImage = sourceTexture.getSourceImage();
                if (!sourceImage && sourceTexture.source) {
                    sourceImage = sourceTexture.source[0]?.image || sourceTexture.source[0]?.canvas;
                }

                if (sourceImage) {
                    // Draw the tile region to canvas
                    if (sourceImage instanceof HTMLImageElement || sourceImage instanceof HTMLCanvasElement || sourceImage instanceof ImageBitmap) {
                        ctx.drawImage(sourceImage, bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);

                        // Process pixels: make white (or near-white) pixels transparent
                        const imageData = ctx.getImageData(0, 0, bbox.width, bbox.height);
                        const data = imageData.data;

                        if (type === 'wall' && tile.id === 0) {
                            console.log(`🎨 Processing first wall tile ${frameKey}, imageData size: ${data.length}, pixels: ${data.length / 4}`);
                        }
                        let transparentCount = 0;

                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            const avg = (r + g + b) / 3;

                            // For walls: remove white/light pixels (new tileset is already dark, no green processing needed)
                            // For floors: remove green pixels (bright green that shouldn't be there)
                            if (type === 'wall') {
                                // Make pixels transparent if they're very light (threshold 220 for faint patterns)
                                // New dark tileset shouldn't have bright green, so we only need to handle white/light pixels
                                if (avg > 220 || (r > 220 && g > 220 && b > 220)) {
                                    data[i + 3] = 0; // Set alpha to 0 (transparent)
                                    transparentCount++;
                                }
                            } else if (type === 'floor') {
                                // Remove bright green pixels (common in tilesets as background)
                                // Check if it's a bright green color (high green, lower red/blue)
                                if (g > 200 && g > r + 50 && g > b + 50) {
                                    data[i + 3] = 0; // Set alpha to 0 (transparent)
                                    transparentCount++;
                                }
                                // Also remove very light pixels (white/light grey backgrounds)
                                if (avg > 240) {
                                    data[i + 3] = 0;
                                    transparentCount++;
                                }
                            }
                        }

                        if (transparentCount > 0) {
                            console.log(`Processed ${type} tile ${frameKey}: made ${transparentCount} pixels transparent`);
                        }

                        ctx.putImageData(imageData, 0, 0);

                        // Create texture from processed canvas
                        this.textures.addCanvas(frameKey, canvas);
                    } else {
                        // Fallback: just add frame normally if we can't process
                        sourceTexture.add(frameKey, 0, bbox.x, bbox.y, bbox.width, bbox.height);
                    }
                } else {
                    // Fallback: just add frame normally
                    sourceTexture.add(frameKey, 0, bbox.x, bbox.y, bbox.width, bbox.height);
                }
            } catch (e) {
                console.warn(`Failed to process ${type} tile ${frameKey}, using normal frame:`, e);
                // Fallback: just add frame normally
                sourceTexture.add(frameKey, 0, bbox.x, bbox.y, bbox.width, bbox.height);
            }
        } else {
            // Should not reach here - both floor and wall are processed above
            sourceTexture.add(frameKey, 0, bbox.x, bbox.y, bbox.width, bbox.height);
        }
    });

    console.log(`✅ Created ${tiles.length} texture frames for ${type} tileset`);
}

/**
 * Build lookup table for dungeon tiles based on corner patterns
 */
function buildDungeonTileLookup(type) {
    const metadata = type === 'floor' ? dungeonTilesets.floorMetadata : dungeonTilesets.wallMetadata;
    if (!metadata || !metadata.tileset_data || !metadata.tileset_data.tiles) {
        console.warn(`⚠️ No metadata tiles found for ${type}`);
        return;
    }

    const lookup = type === 'floor' ? dungeonTilesets.floorTileLookup : dungeonTilesets.wallTileLookup;
    const tiles = metadata.tileset_data.tiles;

    // Build lookup: corner pattern string -> tile data
    tiles.forEach(tile => {
        const corners = tile.corners;
        // Create pattern key: "NW_NE_SE_SW" format
        const patternKey = `${corners.NW}_${corners.NE}_${corners.SE}_${corners.SW}`;
        lookup[patternKey] = {
            id: tile.id,
            boundingBox: tile.bounding_box,
            corners: corners
        };
    });

    console.log(`✅ Built ${type} tile lookup with ${Object.keys(lookup).length} patterns`);
}

/**
 * Get corner terrain type for Wang tiling
 * For a cell at (x, y), we check the 4 corners by looking at adjacent cells:
 * - NW corner: check cell (x, y) itself
 * - NE corner: check cell (x+1, y)
 * - SE corner: check cell (x+1, y+1)
 * - SW corner: check cell (x, y+1)
 * 
 * For floor tileset: "lower" = dark stone, "upper" = lighter stone (both are floors)
 * For wall tileset: "lower" = floor, "upper" = wall
 */
function getCornerTerrain(cellX, cellY, corner, mapData, width, height, isFloorTileset) {
    let checkX = cellX;
    let checkY = cellY;

    // Adjust coordinates based on which corner we're checking
    if (corner === 'NE' || corner === 'SE') {
        checkX = cellX + 1;
    }
    if (corner === 'SE' || corner === 'SW') {
        checkY = cellY + 1;
    }

    // Clamp to map bounds (treat out-of-bounds as wall)
    if (checkX < 0 || checkX >= width || checkY < 0 || checkY >= height) {
        return isFloorTileset ? 'lower' : 'upper'; // Out of bounds: floor tileset uses lower, wall uses upper
    }

    const tileType = mapData[checkY][checkX];

    if (isFloorTileset) {
        // For floor tileset: "lower" = dark stone, "upper" = lighter stone (both are floor types)
        // Use only "lower" (dark stone) for consistent floor appearance
        // This avoids the checkerboard pattern
        return 'lower';
    } else {
        // For wall tileset: floor = "lower", wall = "upper"
        return tileType === 0 ? 'upper' : 'lower';
    }
}

/**
 * Get the appropriate tile from tileset based on Wang tiling corners
 */
function getWangTile(x, y, mapData, width, height, type) {
    const isFloorTileset = type === 'floor';

    // Get corner terrain types (NW, NE, SE, SW) for cell at (x, y)
    const nw = getCornerTerrain(x, y, 'NW', mapData, width, height, isFloorTileset);
    const ne = getCornerTerrain(x, y, 'NE', mapData, width, height, isFloorTileset);
    const se = getCornerTerrain(x, y, 'SE', mapData, width, height, isFloorTileset);
    const sw = getCornerTerrain(x, y, 'SW', mapData, width, height, isFloorTileset);

    // Create pattern key
    const patternKey = `${nw}_${ne}_${se}_${sw}`;

    // Look up tile
    const lookup = type === 'floor' ? dungeonTilesets.floorTileLookup : dungeonTilesets.wallTileLookup;
    let tileData = lookup[patternKey];

    if (!tileData) {
        // Try fallback: use base tile (all corners same type)
        const allLower = patternKey.split('_').every(c => c === 'lower');
        const fallbackKey = allLower ? 'lower_lower_lower_lower' : 'upper_upper_upper_upper';
        tileData = lookup[fallbackKey];

        // If still no match, try to find any tile with mostly matching corners
        if (!tileData) {
            // Find the first available tile as ultimate fallback
            const firstKey = Object.keys(lookup)[0];
            tileData = firstKey ? lookup[firstKey] : null;
        }
    }

    return tileData;
}

/**
 * Create a dungeon tile using Wang tiling
 */
function createDungeonTile(x, y, tileType, tileSize) {
    const scene = game.scene.scenes[0];
    let tile;

    // Check if tilesets are loaded and working
    const floorTilesetLoaded = scene.textures.exists('dungeon_floor_tileset');
    const wallTilesetLoaded = scene.textures.exists('dungeon_wall_tileset');
    const hasMetadata = dungeonTilesets.floorMetadata && dungeonTilesets.wallMetadata;
    const hasLookups = Object.keys(dungeonTilesets.floorTileLookup).length > 0 &&
        Object.keys(dungeonTilesets.wallTileLookup).length > 0;
    const useTilesets = floorTilesetLoaded && wallTilesetLoaded && hasMetadata && hasLookups;

    // Debug: log once to see what's happening
    if (x === 0 && y === 0 && tileType === 1 && !useTilesets) {
        console.warn('⚠️ Dungeon tilesets not available, using fallback colors:', {
            floorTilesetLoaded,
            wallTilesetLoaded,
            hasMetadata,
            hasLookups,
            floorLookupSize: Object.keys(dungeonTilesets.floorTileLookup).length,
            wallLookupSize: Object.keys(dungeonTilesets.wallTileLookup).length
        });
    }

    if (tileType === 0) {
        // Wall
        if (useTilesets) {
            // Use Wang tiling for walls
            const tileData = getWangTile(x, y, currentDungeon.mapData, currentDungeon.width, currentDungeon.height, 'wall');
            if (tileData && tileData.boundingBox) {
                const bbox = tileData.boundingBox;
                try {
                    // Use pre-created texture frame
                    const frameKey = `dungeon_wall_${tileData.id}`;
                    // Check if we created a processed frame (for walls) or use the original tileset
                    if (scene.textures.exists(frameKey)) {
                        // Use the processed frame (with white pixels made transparent)
                        tile = scene.add.image(x * tileSize, y * tileSize, frameKey);
                        tile.setOrigin(0);
                        tile.setDisplaySize(tileSize, tileSize);
                        // Apply dark tint for dungeon-like appearance
                        tile.setTint(0x1a1a1a); // Very dark gray tint
                    } else {
                        // Fallback: use crop method - process pixels directly to remove green
                        const sourceTexture = scene.textures.get('dungeon_wall_tileset');
                        const sourceImage = sourceTexture.getSourceImage();

                        if (sourceImage) {
                            // Create a canvas to process the tile region
                            const canvas = document.createElement('canvas');
                            canvas.width = bbox.width;
                            canvas.height = bbox.height;
                            const ctx = canvas.getContext('2d');

                            // Draw the tile region
                            ctx.drawImage(sourceImage, bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);

                            // Process pixels to remove white/light pixels (new dark tileset shouldn't need green processing)
                            const imageData = ctx.getImageData(0, 0, bbox.width, bbox.height);
                            const data = imageData.data;

                            for (let i = 0; i < data.length; i += 4) {
                                const r = data[i];
                                const g = data[i + 1];
                                const b = data[i + 2];
                                const avg = (r + g + b) / 3;

                                // Remove very light pixels (white/light backgrounds)
                                if (avg > 220 || (r > 220 && g > 220 && b > 220)) {
                                    data[i + 3] = 0; // Make transparent
                                }
                            }

                            ctx.putImageData(imageData, 0, 0);

                            // Create texture from processed canvas
                            const processedKey = `dungeon_wall_processed_${tileData.id}_${bbox.x}_${bbox.y}`;
                            if (!scene.textures.exists(processedKey)) {
                                scene.textures.addCanvas(processedKey, canvas);
                            }

                            tile = scene.add.image(x * tileSize, y * tileSize, processedKey);
                            tile.setOrigin(0);
                            tile.setDisplaySize(tileSize, tileSize);
                            // Apply dark tint for dungeon-like appearance
                            tile.setTint(0x1a1a1a); // Very dark gray tint
                        } else {
                            // Ultimate fallback: use crop method without processing
                            tile = scene.add.image(x * tileSize, y * tileSize, 'dungeon_wall_tileset');
                            tile.setOrigin(0);
                            tile.setCrop(bbox.x, bbox.y, bbox.width, bbox.height);
                            tile.setDisplaySize(tileSize, tileSize);
                            // Apply dark tint for dungeon-like appearance
                            tile.setTint(0x1a1a1a); // Very dark gray tint
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to create wall tile at (${x}, ${y}):`, e);
                    // Fallback to solid color - dark and dank dungeon color
                    tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x151515, 1.0)
                        .setOrigin(0);
                }
            } else {
                // Fallback to solid color if lookup failed - dark and dank dungeon color
                tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x151515, 1.0)
                    .setOrigin(0);
            }
        } else {
            // Fallback: use dark colored rectangle (stone-like) - dark and dank dungeon color
            tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x151515, 1.0)
                .setOrigin(0);
        }

        // Add wall to collision array
        dungeonWalls.push({
            x: x * tileSize,
            y: y * tileSize,
            width: tileSize,
            height: tileSize,
            rect: tile
        });
    } else {
        // Floor
        if (useTilesets) {
            // Use Wang tiling for floors
            const tileData = getWangTile(x, y, currentDungeon.mapData, currentDungeon.width, currentDungeon.height, 'floor');
            if (tileData && tileData.boundingBox) {
                const bbox = tileData.boundingBox;
                try {
                    // Use pre-created texture frame (processed to remove green)
                    const frameKey = `dungeon_floor_${tileData.id}`;
                    // Check if we created a processed frame (for floors) or use the original tileset
                    if (scene.textures.exists(frameKey)) {
                        // Use the processed frame (with green pixels made transparent)
                        tile = scene.add.image(x * tileSize, y * tileSize, frameKey);
                        tile.setOrigin(0);
                        tile.setDisplaySize(tileSize, tileSize);
                    } else if (scene.textures.exists('dungeon_floor_tileset') &&
                        scene.textures.get('dungeon_floor_tileset').has(frameKey)) {
                        // Fallback: use frame from tileset
                        tile = scene.add.image(x * tileSize, y * tileSize, 'dungeon_floor_tileset', frameKey);
                        tile.setOrigin(0);
                        tile.setDisplaySize(tileSize, tileSize);
                    } else {
                        // Fallback: use crop method
                        tile = scene.add.image(x * tileSize, y * tileSize, 'dungeon_floor_tileset');
                        tile.setOrigin(0);
                        tile.setCrop(bbox.x, bbox.y, bbox.width, bbox.height);
                        tile.setDisplaySize(tileSize, tileSize);
                    }
                } catch (e) {
                    console.warn(`Failed to create floor tile at (${x}, ${y}):`, e);
                    // Fallback to solid color
                    tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x555555, 1.0)
                        .setOrigin(0);
                }
            } else {
                // Fallback to solid color if lookup failed - use dark grey (not green)
                tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x333333, 1.0)
                    .setOrigin(0);
            }
        } else {
            // Fallback: use dark grey rectangle (stone floor-like) - ensure no green
            tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x333333, 1.0)
                .setOrigin(0);
        }
    }

    // Ensure tile is created and has proper depth
    if (tile) {
        tile.setDepth(0);
    } else {
        // Ultimate fallback - create a dark tile so nothing is green
        console.warn(`Failed to create tile at (${x}, ${y}), creating fallback`);
        tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x333333, 1.0)
            .setOrigin(0).setDepth(0);
    }
}

/**
 * Create dungeon entrance and exit markers
 */
function createDungeonMarkers(tileSize) {
    const scene = game.scene.scenes[0];
    transitionMarkers = [];

    // Entrance marker (exit to wilderness)
    if (currentDungeon.entrance) {
        const entranceX = currentDungeon.entrance.x * tileSize;
        const entranceY = currentDungeon.entrance.y * tileSize;

        const entranceMarker = scene.add.rectangle(entranceX, entranceY, tileSize * 2, tileSize * 2, 0x00ff00, 0.5)
            .setDepth(3).setStrokeStyle(3, 0x00ff00);

        const entranceText = scene.add.text(entranceX, entranceY, 'EXIT\nTO SURFACE', {
            fontSize: '12px',
            fill: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        }).setDepth(4).setOrigin(0.5, 0.5);

        transitionMarkers.push({
            x: entranceX,
            y: entranceY,
            radius: tileSize * 1.5,
            targetMap: 'wilderness',
            marker: entranceMarker,
            text: entranceText
        });
    }

    // Exit marker (stairs to next level)
    if (currentDungeon.exit) {
        const exitX = currentDungeon.exit.x * tileSize;
        const exitY = currentDungeon.exit.y * tileSize;

        const exitMarker = scene.add.rectangle(exitX, exitY, tileSize * 2, tileSize * 2, 0xff8800, 0.5)
            .setDepth(3).setStrokeStyle(3, 0xff8800);

        const exitText = scene.add.text(exitX, exitY, `STAIRS\nLEVEL ${dungeonLevel + 1}`, {
            fontSize: '12px',
            fill: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        }).setDepth(4).setOrigin(0.5, 0.5);

        transitionMarkers.push({
            x: exitX,
            y: exitY,
            radius: tileSize * 1.5,
            targetMap: 'dungeon',
            dungeonLevel: dungeonLevel + 1,
            marker: exitMarker,
            text: exitText
        });
    }
}

/**
 * Spawn monsters in dungeon rooms
 */
function spawnDungeonMonsters() {
    const scene = game.scene.scenes[0];
    if (!currentDungeon || !currentDungeon.rooms) return;

    // Spawn monsters in rooms (not entrance room, not exit room)
    const combatRooms = currentDungeon.rooms.slice(1, -1); // Skip first and last room

    combatRooms.forEach(room => {
        // Spawn 1-3 monsters per room
        const monsterCount = Phaser.Math.Between(1, 3);

        for (let i = 0; i < monsterCount; i++) {
            const x = (room.x + Phaser.Math.Between(1, room.width - 1)) * scene.tileSize;
            const y = (room.y + Phaser.Math.Between(1, room.height - 1)) * scene.tileSize;

            // Spawn random monster type (scaled by level)
            const dungeonMonsterTypes = [
                { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10, isProcedural: false },
                { name: 'Orc', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20, isProcedural: false },
                { name: 'Skeleton', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15, isProcedural: false }
            ];

            // Add procedural versions to the pool if available
            if (monsterRenderer && Object.keys(monsterRenderer.monsterBlueprints).length > 0) {
                const blueprints = Object.values(monsterRenderer.monsterBlueprints);
                blueprints.forEach(bp => {
                    // Only add if it's one of the dungeon types or a unique one like Prism Slime
                    if (['Goblin', 'Orc', 'Skeleton', 'Prism Slime'].includes(bp.name)) {
                        dungeonMonsterTypes.push({
                            name: bp.name,
                            id: bp.id,
                            hp: bp.stats.hp,
                            attack: bp.stats.attack,
                            speed: bp.stats.speed,
                            xp: bp.stats.xp,
                            textureKey: bp.id,
                            isProcedural: true
                        });
                    }
                });
            }

            const selectedType = Phaser.Utils.Array.GetRandom(dungeonMonsterTypes);
            const scaledHp = selectedType.hp + (dungeonLevel * 10);
            const scaledAttack = selectedType.attack + (dungeonLevel * 2);
            const scaledXp = (selectedType.xp || 10) + (dungeonLevel * 5);

            spawnMonsterScaled(x, y, selectedType, scaledHp, scaledAttack, scaledXp);
        }
    });

    // Spawn boss in exit room
    if (currentDungeon.exit && currentDungeon.rooms.length > 0) {
        const bossRoom = currentDungeon.rooms[currentDungeon.rooms.length - 1];
        const bossX = bossRoom.centerX * scene.tileSize;
        const bossY = bossRoom.centerY * scene.tileSize;

        spawnBossMonster(bossX, bossY, dungeonLevel);
    }
}

/**
 * Spawn a boss monster
 */
function spawnBossMonster(x, y, level) {
    const scene = game.scene.scenes[0];

    // Use a specific monster type for boss
    let bossType = 'dragon';
    let bossName = 'Dragon Boss';

    // Check if we have a special boss blueprint or if the user wants procedural boss
    // For now, let's randomly decide or try to find a "Boss" type blueprint
    const hasBossBlueprint = monsterRenderer && (monsterRenderer.monsterBlueprints['Boss'] || monsterRenderer.monsterBlueprints['dragon']);

    // 50/50 chance to be procedural if a blueprint exists
    const useProcedural = hasBossBlueprint && Math.random() < 0.5;

    const bossTypeData = {
        name: bossName,
        textureKey: 'monster_dragon_south',
        hp: 100 + (level * 50),
        attack: 15 + (level * 5),
        speed: 80,
        xp: 50 + (level * 25),
        isProcedural: useProcedural
    };

    const boss = spawnMonster(x, y, bossTypeData, bossTypeData.hp, bossTypeData.attack, bossTypeData.xp, true);

    if (boss) {
        console.log(`👹 Boss spawned at level ${level} (${useProcedural ? 'Procedural' : 'Sprite'})`);
    }
}

/**
 * Handle boss defeat - mark dungeon as completed and reset it
 */
function onBossDefeated(level, x, y) {
    const dungeonKey = `level_${level}`;

    // Mark dungeon as completed
    dungeonCompletions[dungeonKey] = true;

    // Clear dungeon from cache (force regeneration on next entry)
    delete dungeonCache[dungeonKey];
    currentDungeon = null;

    // Drop boss loot
    dropBossLoot(x, y, level);

    // Show completion message
    showDamageNumber(player.x, player.y - 40, 'Dungeon Cleared!', 0x00ffff);
    addChatMessage(`Dungeon Level ${level} Cleared!`, 0x00ffff, '🏆');
    console.log(`✅ Dungeon level ${level} completed - will reset on next entry`);

    // Auto-save
    saveGame();
}

/**
 * Drop boss loot (multiple, higher-quality items)
 */
function dropBossLoot(x, y, level) {
    const scene = game.scene.scenes[0];

    // Boss drops 2-4 items, with better quality based on level
    const numItems = 2 + Math.floor(level / 2); // 2 items at level 1, 3 at level 2, 4+ at higher levels
    const qualityRoll = Math.random();

    // Quality distribution: Higher level = better items
    let quality = 'Common';
    if (level >= 3) {
        quality = qualityRoll < 0.3 ? 'Legendary' : qualityRoll < 0.6 ? 'Epic' : 'Rare';
    } else if (level >= 2) {
        quality = qualityRoll < 0.4 ? 'Epic' : qualityRoll < 0.7 ? 'Rare' : 'Uncommon';
    } else {
        quality = qualityRoll < 0.5 ? 'Rare' : qualityRoll < 0.8 ? 'Uncommon' : 'Common';
    }

    const itemTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet'];

    for (let i = 0; i < numItems; i++) {
        // Random item type
        const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

        // Slightly randomize quality per item (boss can drop mix)
        let itemQuality = quality;
        const qualityVariation = Math.random();
        if (qualityVariation < 0.2 && level > 1) {
            // 20% chance for one tier higher
            const qualityTiers = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
            const currentIndex = qualityTiers.indexOf(quality);
            if (currentIndex < qualityTiers.length - 1) {
                itemQuality = qualityTiers[currentIndex + 1];
            }
        }

        const item = generateRandomItemOfType(itemType, itemQuality);

        // Create item sprite
        let spriteKey = 'item_gold';
        if (item.type === 'weapon') spriteKey = 'item_weapon';
        else if (item.type === 'armor') spriteKey = 'item_armor';
        else if (item.type === 'helmet') spriteKey = 'item_helmet';
        else if (item.type === 'ring') spriteKey = 'item_ring';
        else if (item.type === 'amulet') spriteKey = 'item_amulet';

        // Find a valid walkable position for the item
        const tileSize = 32;
        let itemX = x;
        let itemY = y;
        let attempts = 0;
        const maxAttempts = 20;

        // Spread items around boss location, ensuring they're on walkable tiles
        const angle = (i / numItems) * Math.PI * 2;
        const baseRadius = 30 + (i * 5);

        while (attempts < maxAttempts) {
            const radius = baseRadius + (attempts * 5); // Expand search radius if needed
            itemX = x + Math.cos(angle) * radius;
            itemY = y + Math.sin(angle) * radius;

            // Check if position is walkable (in dungeon)
            if (currentDungeon && currentDungeon.mapData) {
                const tileX = Math.floor(itemX / tileSize);
                const tileY = Math.floor(itemY / tileSize);

                // Check bounds
                if (tileX >= 0 && tileX < currentDungeon.width &&
                    tileY >= 0 && tileY < currentDungeon.height) {
                    const tileType = currentDungeon.mapData[tileY][tileX];
                    if (tileType === 1) { // Floor tile (walkable)
                        break; // Found valid position
                    }
                }
            } else {
                // Not in dungeon, just use the position
                break;
            }

            attempts++;
            // Try a slightly different angle if we haven't found a valid spot
            if (attempts < maxAttempts) {
                const newAngle = angle + (Math.random() - 0.5) * 0.5;
                itemX = x + Math.cos(newAngle) * radius;
                itemY = y + Math.sin(newAngle) * radius;
            }
        }

        const itemSprite = scene.add.sprite(itemX, itemY, spriteKey);
        itemSprite.setDepth(8);

        // Store item data (match structure used by dropItemsFromMonster)
        item.sprite = itemSprite;
        item.x = itemSprite.x;
        item.y = itemSprite.y;

        // Pulsing animation (more noticeable for boss loot)
        scene.tweens.add({
            targets: itemSprite,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        items.push(item);
    }

    // Also drop gold
    const goldAmount = 50 + (level * 25);
    playerStats.gold += goldAmount;
    showDamageNumber(x, y - 20, `+${goldAmount} Gold`, 0xffd700);

    // UQE: Emit gold earned event
    if (typeof uqe !== 'undefined') {
        uqe.eventBus.emit(UQE_EVENTS.GOLD_EARNED, { amount: goldAmount });
    }

    console.log(`💰 Boss dropped ${numItems} items (quality: ${quality})`);
}

/**
 * Create game objects (like pygame initialization)
 */
function create() {
    console.log('🚀 CREATE FUNCTION CALLED - Starting tileset processing');

    // Initialize procedural monster renderer (Method 2)
    monsterRenderer = new MonsterRenderer(this);
    if (this.cache.json.exists('monsterData')) {
        monsterRenderer.init(this.cache.json.get('monsterData'));
    }

    // Load persistent settings (independent of save game)
    loadSettings();

    // Initialize Quest Manager
    questManager = new QuestManager(this);
    questManager.init();

    // Initialize Unified Quest Engine (V2)
    if (this.cache.json.exists('questDataV2')) {
        const v2Data = this.cache.json.get('questDataV2');
        uqe.init(v2Data.quests || {});

        // Handle V2 Quest Completion
        uqe.eventBus.on(UQE_EVENTS.QUEST_COMPLETED, (quest) => {
            console.log(`🎁 [UQE Bridge] Handling completion for: ${quest.title}`);

            // Give Rewards
            if (quest.rewards.xp) {
                playerStats.xp += quest.rewards.xp;
                addChatMessage(`Gained ${quest.rewards.xp} XP from quest`, 0xffd700, '✨');
            }
            if (quest.rewards.gold) {
                playerStats.gold += quest.rewards.gold;
                addChatMessage(`Gained ${quest.rewards.gold} Gold from quest`, 0xffd700, '💰');
            }
            updatePlayerStats();

            // Show UI Notification
            showQuestCompletedModal({
                title: quest.title,
                rewards: quest.rewards
            });

            // Refresh UI
            if (questVisible) updateQuestLogItems();
        });

        // Handle Objective Progress HUD - WoW-style persistent tracker
        uqe.eventBus.on(UQE_EVENTS.OBJECTIVE_UPDATED, (data) => {
            handleObjectiveUpdate(data);
        });
    }

    // Parse dungeon tileset metadata and create texture frames
    try {
        if (this.cache.text.exists('dungeon_floor_metadata')) {
            const floorMetadataText = this.cache.text.get('dungeon_floor_metadata');
            dungeonTilesets.floorMetadata = JSON.parse(floorMetadataText);

            // Create texture frames for floor tiles
            if (this.textures.exists('dungeon_floor_tileset')) {
                createTilesetFrames.call(this, 'dungeon_floor_tileset', dungeonTilesets.floorMetadata, 'floor');
                console.log('✅ Dungeon floor tileset image loaded and frames created');
            } else {
                console.warn('⚠️ Dungeon floor tileset image not found');
            }

            buildDungeonTileLookup('floor');
            console.log('✅ Dungeon floor tileset metadata loaded');
        } else {
            console.warn('⚠️ Dungeon floor metadata not found in cache');
        }

        if (this.cache.text.exists('dungeon_wall_metadata')) {
            console.log('📋 Found dungeon_wall_metadata in cache');
            const wallMetadataText = this.cache.text.get('dungeon_wall_metadata');
            dungeonTilesets.wallMetadata = JSON.parse(wallMetadataText);
            console.log('📋 Parsed wall metadata, tiles:', dungeonTilesets.wallMetadata?.tileset_data?.tiles?.length || 0);

            // Create texture frames for wall tiles
            if (this.textures.exists('dungeon_wall_tileset')) {
                console.log('🔨 About to call createTilesetFrames for wall tileset');
                console.log('🔨 Texture exists check passed');
                try {
                    createTilesetFrames.call(this, 'dungeon_wall_tileset', dungeonTilesets.wallMetadata, 'wall');
                    console.log('✅ createTilesetFrames completed for wall tileset');
                } catch (e) {
                    console.error('❌ Error in createTilesetFrames:', e);
                }
                console.log('✅ Dungeon wall tileset image loaded and frames created');
            } else {
                console.warn('⚠️ Dungeon wall tileset image not found in textures');
            }

            buildDungeonTileLookup('wall');
            console.log('✅ Dungeon wall tileset metadata loaded');
        } else {
            console.warn('⚠️ Dungeon wall metadata not found in cache');
        }
    } catch (e) {
        console.warn('⚠️ Could not load dungeon tileset metadata:', e);
        console.error(e.stack);
    }

    // Start with town map
    createTownMap();

    // Start village music on initial load
    console.log('🎵 Checking for village music...');
    console.log('   - Sound system exists:', !!this.sound);
    console.log('   - Audio cache exists:', !!this.cache.audio);
    console.log('   - Village music in cache:', this.cache.audio.exists('village_music'));

    // Start music on initial load (game starts in town)
    if (musicEnabled && this.sound && this.cache.audio.exists('village_music')) {
        try {
            villageMusic = this.sound.add('village_music', {
                volume: 0.5,
                loop: true,
                seek: 0
            });

            // Try to play - may fail due to browser autoplay policy
            const playResult = villageMusic.play();
            if (playResult && typeof playResult.then === 'function') {
                // playResult is a Promise
                playResult.then(() => {
                    console.log('🎵 Started village music on game start successfully');
                }).catch(err => {
                    console.warn('⚠️ Could not play music on start (may need user interaction):', err);
                });
            } else {
                // playResult is not a Promise (might be boolean or sound object)
                console.log('🎵 Started village music on game start');
            }
        } catch (e) {
            console.error('❌ Error playing village music:', e);
        }
    } else {
        if (!musicEnabled) {
            console.log('🎵 Music is disabled, skipping music on start');
        } else {
            console.warn('⚠️ Village music not available - sound system or cache issue');
            console.warn('   Available audio keys:', Object.keys(this.cache.audio.entries || {}));
        }
    }

    // Create player (positioned by createTownMap)
    const tileSize = this.tileSize || 32;

    // Create walking animations if sprite sheets are loaded
    if (this.textures.exists('player_walk_south')) {
        // Create animations for each direction
        // Frame rate controls animation speed - adjust for smoother animation
        const frameRate = 8; // Animation speed (frames per second) - lower = slower, smoother

        // Create smooth looping animations
        this.anims.create({
            key: 'walk_south',
            frames: this.anims.generateFrameNumbers('player_walk_south', { start: 0, end: -1 }), // -1 means use all frames
            frameRate: frameRate,
            repeat: -1, // Loop infinitely
            yoyo: false // Don't reverse, just loop
        });

        this.anims.create({
            key: 'walk_north',
            frames: this.anims.generateFrameNumbers('player_walk_north', { start: 0, end: -1 }),
            frameRate: frameRate,
            repeat: -1,
            yoyo: false
        });

        this.anims.create({
            key: 'walk_east',
            frames: this.anims.generateFrameNumbers('player_walk_east', { start: 0, end: -1 }),
            frameRate: frameRate,
            repeat: -1,
            yoyo: false
        });

        this.anims.create({
            key: 'walk_west',
            frames: this.anims.generateFrameNumbers('player_walk_west', { start: 0, end: -1 }),
            frameRate: frameRate,
            repeat: -1,
            yoyo: false
        });

        console.log('✅ Player walking animations created');
    }

    // Create monster animations (will be loaded from PixelLab assets)
    createMonsterAnimations.call(this);

    // Create attack and fireball animations if sprite sheets are loaded
    if (this.textures.exists('player_attack')) {
        const attackFrames = this.anims.generateFrameNumbers('player_attack', { start: 0, end: -1 });
        console.log('Attack frames generated:', attackFrames.length, 'frames');
        this.anims.create({
            key: 'attack',
            frames: attackFrames,
            frameRate: 12, // Faster for attack animation
            repeat: 0 // Play once, don't loop
        });
        console.log('✅ Player attack animation created with', attackFrames.length, 'frames');
    } else {
        console.warn('⚠️ player_attack texture not found');
    }

    if (this.textures.exists('player_fireball')) {
        const fireballFrames = this.anims.generateFrameNumbers('player_fireball', { start: 0, end: -1 });
        console.log('Fireball frames generated:', fireballFrames.length, 'frames');
        this.anims.create({
            key: 'fireball_cast',
            frames: fireballFrames,
            frameRate: 10,
            repeat: 0 // Play once, don't loop
        });
        console.log('✅ Player fireball animation created with', fireballFrames.length, 'frames');
    } else {
        console.warn('⚠️ player_fireball texture not found');
    }

    // Try to use animated sprite, fallback to generated sprite
    let playerTexture = 'player_walk_south'; // Default direction
    if (!this.textures.exists('player_walk_south')) {
        playerTexture = 'player'; // Fallback to generated sprite
        console.log('⚠️ Player animations not found, using fallback sprite');
    }

    player = this.physics.add.sprite(400, 300, playerTexture);

    // Scale player to 64x64 (source is 48x48, so scale = 64/48 = 1.333...)
    player.setScale(64 / 48);

    // Store current facing direction and movement state
    player.facingDirection = 'south'; // 'north', 'south', 'east', 'west'
    player.isMoving = false;

    // Track player movement for exploration quests
    let lastPlayerTileX = Math.floor(player.x / tileSize);
    let lastPlayerTileY = Math.floor(player.y / tileSize);

    player.setCollideWorldBounds(true);
    player.setDepth(10); // Player on top

    // Initialize player stats on sprite
    player.stats = playerStats;

    // Create player HP bar above sprite
    const playerHpBarWidth = 40;
    const playerHpBarHeight = 4;
    player.hpBarBg = this.add.rectangle(0, 0, playerHpBarWidth, playerHpBarHeight, 0x000000, 0.8)
        .setDepth(15).setOrigin(0.5, 0.5).setScrollFactor(1);
    player.hpBar = this.add.rectangle(0, 0, playerHpBarWidth - 2, playerHpBarHeight - 2, 0xff0000)
        .setDepth(16).setOrigin(0, 0.5).setScrollFactor(1);

    // Create weapon sprite (initially hidden, shown when weapon is equipped)
    weaponSprite = this.add.sprite(player.x, player.y, 'weapon_sword');
    // Scale weapon sprite to 48x48 (adjust scale based on actual image size)
    // If source image is 32x32, scale = 48/32 = 1.5
    // If source image is already 48x48, scale = 1.0
    // For now, set to 1.0 and adjust if needed
    weaponSprite.setScale(1.0);
    weaponSprite.setDepth(11); // Above player (10) but below UI elements
    weaponSprite.setVisible(false); // Hidden until weapon is equipped
    // Origin will be set based on direction in updateWeaponPosition (handle position)
    weaponSprite.setOrigin(0.5, 1.0); // Default: center horizontally, bottom vertically (handle)
    weaponSprite.isAnimating = false; // Flag to prevent position updates during animation

    // Initialize weapon sprite based on current equipment
    updateWeaponSprite();

    // Initialize NPCs in town
    initializeNPCs();

    // Create UI bars (HP, Mana, Stamina, XP)
    const barWidth = 200;
    const barHeight = 20;
    const barSpacing = 25;
    const barX = 20;
    let barY = 20;

    // HP Bar
    hpBarBg = this.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
    hpBar = this.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0xff0000)
        .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);

    // Mana Bar
    barY += barSpacing;
    manaBarBg = this.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
    manaBar = this.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0x0000ff)
        .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);

    // Stamina Bar
    barY += barSpacing;
    staminaBarBg = this.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
    staminaBar = this.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0x00ff00)
        .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);

    // XP Bar
    barY += barSpacing;
    xpBarBg = this.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
    xpBar = this.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0xb478ff)
        .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);

    // Stats text
    statsText = this.add.text(barX, barY + barSpacing, '', {
        fontSize: '16px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 5, y: 3 }
    }).setScrollFactor(0).setDepth(100);

    // Debug text (player position)
    this.debugText = this.add.text(barX, barY + barSpacing + 25, '', {
        fontSize: '14px',
        fill: '#ffff00',
        backgroundColor: '#000000',
        padding: { x: 5, y: 3 }
    }).setScrollFactor(0).setDepth(100);

    // Gold text
    goldText = this.add.text(barX, barY + barSpacing + 45, 'Gold: 0', {
        fontSize: '16px',
        fill: '#ffd700',
        backgroundColor: '#000000',
        padding: { x: 5, y: 3 }
    }).setScrollFactor(0).setDepth(100);

    // Controls text (toggleable) - default to short version
    const fullControlsText = 'WASD: Move | SPACE: Attack/Pickup | 1-3: Abilities | I: Inventory | E: Equipment | Q: Quests | F: Interact | F5: Save | F9: Load | H: Help | CTRL+A: Assets';
    const shortControlsText = 'H: Help';

    let controlsText = this.add.text(barX, barY + barSpacing + 70, shortControlsText, {
        fontSize: '14px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 }
    }).setScrollFactor(0).setDepth(100);

    // Store controls text reference for toggling
    this.controlsText = controlsText;
    this.controlsFullText = fullControlsText;
    this.controlsShortText = shortControlsText;
    this.controlsExpanded = false; // Start with short version

    // Create system chat box (bottom left)
    createSystemChatBox.call(this);

    // Add mouse wheel scrolling for chat box
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (!systemChatBox) return;

        // Get mouse position in screen coordinates (chat box uses scrollFactor 0, so it's in screen space)
        const mouseX = pointer.x;
        const mouseY = pointer.y;

        // Get chat box bounds (bg is centered, so calculate corners)
        const chatX = systemChatBox.bg.x - systemChatBox.bg.width / 2;
        const chatY = systemChatBox.bg.y - systemChatBox.bg.height / 2;
        const chatWidth = systemChatBox.bg.width;
        const chatHeight = systemChatBox.bg.height;

        // Check if mouse is over chat box area
        if (mouseX >= chatX && mouseX <= chatX + chatWidth &&
            mouseY >= chatY && mouseY <= chatY + chatHeight) {
            // Scroll the chat box
            // deltaY: negative when scrolling up (we want to scroll up), positive when scrolling down (we want to scroll down)
            // So we negate deltaY to get the correct scroll direction
            const scrollAmount = -deltaY * 0.5; // Adjust scroll speed (0.5 = smooth scrolling)
            scrollChat(scrollAmount);
        }
    });

    // Create ability bar
    createAbilityBar();

    // Set up input (like pygame keyboard)
    cursors = this.input.keyboard.createCursorKeys();

    // Add WASD keys
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');

    // Add Spacebar for attack
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Add 'I' key for inventory
    inventoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);

    // Add 'E' key for equipment
    equipmentKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Add 'Q' key for quest log
    questKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    // Add 'F' key for interaction
    interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    // Add 'ESC' key for settings
    settingsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Add save/load keys
    this.saveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F5);
    this.loadKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F9);

    // Add 'H' key for help/controls toggle
    this.helpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    // Add ability keys (1, 2, 3)
    this.abilityOneKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.abilityTwoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.abilityThreeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);

    // Add CTRL+A for assets window
    assetsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.ctrlKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);

    // Add CTRL+M for grass debug window
    grassDebugKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    console.log('✅ Grass debug key (M) initialized:', grassDebugKey);

    // Initialize starting quests
    initializeQuests();

    // Initialize NPCs
    initializeNPCs();

    // Check for auto-load
    checkAutoLoad();

    // Camera follows player - NO bounds set so player always stays centered
    // This allows black space to show beyond map edges
    // const worldWidth = this.mapWidth * this.tileSize;
    // const worldHeight = this.mapHeight * this.tileSize;
    // this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(player);

    // Store map dimensions for debug display (already set above)

    // Initialize sounds after assets load
    initializeSounds();

    // Unlock audio on first user interaction (browser requirement)
    const unlockAudio = () => {
        if (!audioUnlocked && this.sound) {
            this.sound.play('fireball_cast', { volume: 0 }); // Silent play to unlock
            this.sound.stopByKey('fireball_cast');
            audioUnlocked = true;
            console.log('🔓 Audio context unlocked');
        }
    };

    // Unlock on any key press or click
    this.input.keyboard.on('keydown', unlockAudio);
    this.input.on('pointerdown', unlockAudio);

    // Set up mouse wheel event listener for shop scrolling (left panel only)
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (shopVisible && shopPanel && shopPanel.maxScrollY > 0) {
            // Check if pointer is over the left panel (shop items area)
            const leftPanelBounds = shopPanel.leftBg.getBounds();
            if (leftPanelBounds.contains(pointer.x, pointer.y)) {
                const scrollSpeed = 90; // One item height
                const oldScroll = shopPanel.scrollY;
                shopPanel.scrollY += deltaY > 0 ? scrollSpeed : -scrollSpeed;
                shopPanel.scrollY = Math.max(0, Math.min(shopPanel.scrollY, shopPanel.maxScrollY));
                if (oldScroll !== shopPanel.scrollY) {
                    updateShopItems();
                    updateShopInventoryItems(); // Re-render inventory items after scrolling
                }
            }
        }
    });

    console.log('Game created');
}

/**
 * Update loop (like pygame game loop)
 */
function update(time, delta) {
    // Update uqe quest engine (V2)
    if (typeof uqe !== 'undefined') {
        uqe.update();
    }

    const speed = 200; // pixels per second

    // Update damage numbers
    updateDamageNumbers(time, delta);

    // Update combo timer
    playerStats.comboTimer += delta;
    if (playerStats.comboTimer >= playerStats.comboResetTime) {
        // Combo expired
        if (playerStats.comboCount > 0) {
            playerStats.comboCount = 0;
            updateComboDisplay();
        }
    } else if (playerStats.comboCount > 0) {
        // Update combo display
        updateComboDisplay();
    }

    // Calculate attack speed bonus (from combos and equipment)
    // Higher combos = faster attacks (reduced cooldown)
    const comboAttackSpeedBonus = Math.min(playerStats.comboCount * 0.05, 0.3); // Max 30% reduction at 6+ combo
    const equipmentSpeedBonus = (playerStats.speedBonus || 0) * 0.01; // 1% per speed point
    playerStats.attackSpeedBonus = comboAttackSpeedBonus + equipmentSpeedBonus;

    // Apply attack speed bonus to cooldown
    const baseCooldown = 500;
    playerStats.attackCooldown = Math.max(200, baseCooldown * (1 - playerStats.attackSpeedBonus));

    // Update attack speed indicator
    updateAttackSpeedIndicator();

    // Player movement (like your movement system)
    // Don't allow movement when shop/inventory/dialog/settings/building is open
    player.setVelocity(0);

    if (shopVisible || inventoryVisible || dialogVisible || settingsVisible || buildingPanelVisible) {
        // Don't process movement when UI is open, but continue with other updates
        // (monsters, UI updates, etc. still need to run)
    } else {
        // Normal movement processing
        let moving = false;
        let newDirection = player.facingDirection; // Default to current direction

        if (cursors.left.isDown || this.wasd.A.isDown) {
            player.setVelocityX(-speed);
            newDirection = 'west';
            moving = true;
        } else if (cursors.right.isDown || this.wasd.D.isDown) {
            player.setVelocityX(speed);
            newDirection = 'east';
            moving = true;
        }

        if (cursors.up.isDown || this.wasd.W.isDown) {
            player.setVelocityY(-speed);
            newDirection = 'north';
            moving = true;
        } else if (cursors.down.isDown || this.wasd.S.isDown) {
            player.setVelocityY(speed);
            newDirection = 'south';
            moving = true;
        }

        // Normalize diagonal movement
        if (player.body.velocity.x !== 0 && player.body.velocity.y !== 0) {
            player.body.velocity.normalize().scale(speed);
            // For diagonal movement, prioritize vertical direction
            if (Math.abs(player.body.velocity.y) > Math.abs(player.body.velocity.x)) {
                newDirection = player.body.velocity.y < 0 ? 'north' : 'south';
            } else {
                newDirection = player.body.velocity.x < 0 ? 'west' : 'east';
            }
        }

        // Update player animation based on direction and movement state
        // Don't override if attack or fireball animation is playing
        const currentAnim = player.anims.currentAnim;
        const isPlayingActionAnim = currentAnim && (currentAnim.key === 'attack' || currentAnim.key === 'fireball_cast');

        if (!isPlayingActionAnim) {
            if (newDirection !== player.facingDirection || moving !== player.isMoving) {
                player.facingDirection = newDirection;
                player.isMoving = moving;

                if (moving) {
                    // Play walking animation for current direction
                    const animKey = `walk_${newDirection}`;
                    if (this.anims.exists(animKey)) {
                        // Only play if not already playing this animation
                        if (player.anims.currentAnim === null || player.anims.currentAnim.key !== animKey) {
                            player.play(animKey);
                        }
                    } else {
                        // Fallback: switch texture if animation doesn't exist
                        const textureKey = `player_walk_${newDirection}`;
                        if (this.textures.exists(textureKey)) {
                            player.setTexture(textureKey);
                        }
                    }
                } else {
                    // When stopped, stop the animation and show first frame
                    if (this.anims.exists(`walk_${player.facingDirection}`)) {
                        player.anims.stop();
                        // Set to first frame of current direction
                        const textureKey = `player_walk_${player.facingDirection}`;
                        if (this.textures.exists(textureKey)) {
                            player.setTexture(textureKey);
                            player.setFrame(0); // Show first frame
                        }
                    }
                }
            }
        }
    }

    // Update weapon sprite position to follow player
    if (weaponSprite && weaponSprite.visible) {
        updateWeaponPosition();
    }

    // Check building collisions (only in town) - allow sliding along walls (using dungeon wall logic)
    if (currentMap === 'town' && buildings.length > 0) {
        const playerSize = 12; // Smaller collision box for easier navigation (matches dungeon)
        const deltaTime = delta / 1000;

        // Store original velocities before collision check
        const originalVelX = player.body.velocity.x;
        const originalVelY = player.body.velocity.y;

        // Check if player is currently overlapping with any buildings
        let isTouchingBuilding = false;
        let touchingBuildings = [];

        for (const building of buildings) {
            const overlap = player.x + playerSize > building.x &&
                player.x - playerSize < building.x + building.width &&
                player.y + playerSize > building.y &&
                player.y - playerSize < building.y + building.height;

            if (overlap) {
                isTouchingBuilding = true;
                touchingBuildings.push(building);
            }
        }

        // First, check if player is stuck inside a building and push them out immediately
        for (const building of buildings) {
            const isInside = player.x + playerSize > building.x &&
                player.x - playerSize < building.x + building.width &&
                player.y + playerSize > building.y &&
                player.y - playerSize < building.y + building.height;

            if (isInside) {
                // Player is stuck inside building - push them out to the nearest edge
                const buildingCenterX = building.x + building.width / 2;
                const buildingCenterY = building.y + building.height / 2;
                const distX = player.x - buildingCenterX;
                const distY = player.y - buildingCenterY;

                // Push to nearest edge (whichever is closer)
                if (Math.abs(distX) > Math.abs(distY)) {
                    // Push horizontally
                    if (distX > 0) {
                        // Push right (out of left side of building)
                        player.x = building.x + building.width + playerSize + 2;
                    } else {
                        // Push left (out of right side of building)
                        player.x = building.x - playerSize - 2;
                    }
                } else {
                    // Push vertically
                    if (distY > 0) {
                        // Push down (out of top of building)
                        player.y = building.y + building.height + playerSize + 2;
                    } else {
                        // Push up (out of bottom of building)
                        player.y = building.y - playerSize - 2;
                    }
                }
                // After pushing out, stop checking - we'll handle collisions normally
                break;
            }
        }

        // Check collisions separately for X and Y to allow sliding
        let canMoveX = true;
        let canMoveY = true;

        // Test X movement (keep Y fixed at current position)
        if (originalVelX !== 0) {
            const testX = player.x + originalVelX * deltaTime;
            const testY = player.y; // Use current Y position

            for (const building of buildings) {
                if (testX + playerSize > building.x &&
                    testX - playerSize < building.x + building.width &&
                    testY + playerSize > building.y &&
                    testY - playerSize < building.y + building.height) {
                    canMoveX = false;
                    break;
                }
            }
        }

        // Test Y movement (keep X fixed at current position)
        if (originalVelY !== 0) {
            const testX = player.x; // Use current X position
            const testY = player.y + originalVelY * deltaTime;

            for (const building of buildings) {
                if (testX + playerSize > building.x &&
                    testX - playerSize < building.x + building.width &&
                    testY + playerSize > building.y &&
                    testY - playerSize < building.y + building.height) {
                    canMoveY = false;
                    break;
                }
            }
        }

        // If touching a building, allow sliding along it OR moving away from it
        if (isTouchingBuilding && touchingBuildings.length > 0) {
            // Check if we're actually overlapping (stuck inside) vs just touching
            let isActuallyStuck = false;
            for (const building of touchingBuildings) {
                const overlap = player.x + playerSize > building.x &&
                    player.x - playerSize < building.x + building.width &&
                    player.y + playerSize > building.y &&
                    player.y - playerSize < building.y + building.height;
                if (overlap) {
                    isActuallyStuck = true;
                    break;
                }
            }

            // Only apply special sliding/moving away logic if we're actually stuck inside
            if (isActuallyStuck) {
                for (const building of touchingBuildings) {
                    const buildingLeft = building.x;
                    const buildingRight = building.x + building.width;
                    const buildingTop = building.y;
                    const buildingBottom = building.y + building.height;
                    const isHorizontalBuilding = building.width >= building.height;
                    const isVerticalBuilding = building.height >= building.width;

                    // For vertical buildings: allow Y movement (sliding along) OR X movement away from building
                    if (isVerticalBuilding) {
                        const isOverlapping = player.x + playerSize > building.x &&
                            player.x - playerSize < building.x + building.width &&
                            player.y + playerSize > building.y &&
                            player.y - playerSize < building.y + building.height;

                        const buildingCenterX = building.x + building.width / 2;
                        const currentDistX = Math.abs(player.x - buildingCenterX);
                        const newX = player.x + originalVelX * deltaTime;
                        const newDistX = Math.abs(newX - buildingCenterX);

                        // If moving X away from the building (distance increases) AND we're overlapping, allow it
                        if (originalVelX !== 0 && isOverlapping && newDistX > currentDistX) {
                            // Moving away from vertical building - check if it would collide with other buildings
                            const testX = player.x + originalVelX * deltaTime;
                            let wouldCollideWithOther = false;
                            for (const otherBuilding of buildings) {
                                if (otherBuilding === building) continue;
                                if (testX + playerSize > otherBuilding.x &&
                                    testX - playerSize < otherBuilding.x + otherBuilding.width &&
                                    player.y + playerSize > otherBuilding.y &&
                                    player.y - playerSize < otherBuilding.y + otherBuilding.height) {
                                    wouldCollideWithOther = true;
                                    break;
                                }
                            }
                            if (!wouldCollideWithOther) {
                                canMoveX = true;
                            }
                        } else if (originalVelY !== 0) {
                            // Not moving away, so allow sliding along building (Y movement)
                            const slidePlayerSize = playerSize - 2;
                            const testY = player.y + originalVelY * deltaTime;
                            let yWouldCollide = false;
                            for (const otherBuilding of buildings) {
                                if (otherBuilding === building) continue;
                                if (player.x + slidePlayerSize > otherBuilding.x &&
                                    player.x - slidePlayerSize < otherBuilding.x + otherBuilding.width &&
                                    testY + slidePlayerSize > otherBuilding.y &&
                                    testY - slidePlayerSize < otherBuilding.y + otherBuilding.height) {
                                    yWouldCollide = true;
                                    break;
                                }
                            }
                            if (!yWouldCollide) {
                                canMoveY = true;
                            }
                        }
                    }

                    // For horizontal buildings: allow X movement (sliding along) OR Y movement away from building
                    if (isHorizontalBuilding) {
                        const buildingCenterY = building.y + building.height / 2;
                        const currentDistY = Math.abs(player.y - buildingCenterY);
                        const newY = player.y + originalVelY * deltaTime;
                        const newDistY = Math.abs(newY - buildingCenterY);

                        const isOverlapping = player.x + playerSize > building.x &&
                            player.x - playerSize < building.x + building.width &&
                            player.y + playerSize > building.y &&
                            player.y - playerSize < building.y + building.height;

                        // If moving Y away from the building (distance increases) AND we're overlapping, allow it
                        if (originalVelY !== 0 && isOverlapping && newDistY > currentDistY) {
                            // Moving away from horizontal building - allow Y movement
                            const testY = player.y + originalVelY * deltaTime;
                            let wouldCollideWithOther = false;
                            for (const otherBuilding of buildings) {
                                if (otherBuilding === building) continue;
                                if (player.x + playerSize > otherBuilding.x &&
                                    player.x - playerSize < otherBuilding.x + otherBuilding.width &&
                                    testY + playerSize > otherBuilding.y &&
                                    testY - playerSize < otherBuilding.y + otherBuilding.height) {
                                    wouldCollideWithOther = true;
                                    break;
                                }
                            }
                            if (!wouldCollideWithOther) {
                                canMoveY = true;
                            }
                        } else if (originalVelX !== 0) {
                            // Not moving away, so allow sliding along building (X movement)
                            const slidePlayerSize = playerSize - 2;
                            const testX = player.x + originalVelX * deltaTime;
                            let xWouldCollide = false;
                            for (const otherBuilding of buildings) {
                                if (otherBuilding === building) continue;
                                if (testX + slidePlayerSize > otherBuilding.x &&
                                    testX - slidePlayerSize < otherBuilding.x + otherBuilding.width &&
                                    player.y + slidePlayerSize > otherBuilding.y &&
                                    player.y - slidePlayerSize < otherBuilding.y + otherBuilding.height) {
                                    xWouldCollide = true;
                                    break;
                                }
                            }
                            if (!xWouldCollide) {
                                canMoveX = true;
                            }
                        }
                    }
                }
            }
        }

        // Apply movement restrictions - only block the axis that collides
        // This allows sliding along buildings when moving diagonally
        if (!canMoveX) {
            player.setVelocityX(0);
        }
        if (!canMoveY) {
            player.setVelocityY(0);
        }

        // Final check: if one axis is blocked but the other isn't, ensure the non-blocked axis can still move
        // This handles the case where diagonal movement hits a building - allow sliding along it
        if (!canMoveX && canMoveY && originalVelY !== 0) {
            // X is blocked, but Y is free - allow Y movement (sliding along vertical building)
            player.setVelocityY(originalVelY);
        }
        if (!canMoveY && canMoveX && originalVelX !== 0) {
            // Y is blocked, but X is free - allow X movement (sliding along horizontal building)
            player.setVelocityX(originalVelX);
        }
    }

    // Check dungeon wall collisions - allow sliding along walls
    if (currentMap === 'dungeon' && dungeonWalls.length > 0) {
        const playerSize = 12; // Smaller collision box for easier navigation (was 16)
        const deltaTime = delta / 1000;

        // Store original velocities before collision check
        const originalVelX = player.body.velocity.x;
        const originalVelY = player.body.velocity.y;

        // Check if player is currently overlapping with any walls
        let isTouchingWall = false;
        let touchingWalls = [];

        for (const wall of dungeonWalls) {
            const overlap = player.x + playerSize > wall.x &&
                player.x - playerSize < wall.x + wall.width &&
                player.y + playerSize > wall.y &&
                player.y - playerSize < wall.y + wall.height;

            if (overlap) {
                isTouchingWall = true;
                touchingWalls.push(wall);
            }
        }

        // First, check if player is stuck inside a wall and push them out immediately
        for (const wall of dungeonWalls) {
            const isInside = player.x + playerSize > wall.x &&
                player.x - playerSize < wall.x + wall.width &&
                player.y + playerSize > wall.y &&
                player.y - playerSize < wall.y + wall.height;

            if (isInside) {
                // Player is stuck inside wall - push them out to the nearest edge
                const wallCenterX = wall.x + wall.width / 2;
                const wallCenterY = wall.y + wall.height / 2;
                const distX = player.x - wallCenterX;
                const distY = player.y - wallCenterY;

                // Push to nearest edge (whichever is closer)
                if (Math.abs(distX) > Math.abs(distY)) {
                    // Push horizontally
                    if (distX > 0) {
                        // Push right (out of left side of wall)
                        player.x = wall.x + wall.width + playerSize + 2;
                    } else {
                        // Push left (out of right side of wall)
                        player.x = wall.x - playerSize - 2;
                    }
                } else {
                    // Push vertically
                    if (distY > 0) {
                        // Push down (out of top of wall)
                        player.y = wall.y + wall.height + playerSize + 2;
                    } else {
                        // Push up (out of bottom of wall)
                        player.y = wall.y - playerSize - 2;
                    }
                }
                // After pushing out, stop checking - we'll handle collisions normally
                console.log('⚠️ Player was stuck inside wall, pushed out');
                break;
            }
        }

        // Check collisions separately for X and Y to allow sliding
        let canMoveX = true;
        let canMoveY = true;

        // Test X movement (keep Y fixed at current position)
        if (originalVelX !== 0) {
            const testX = player.x + originalVelX * deltaTime;
            const testY = player.y; // Use current Y position

            for (const wall of dungeonWalls) {
                if (testX + playerSize > wall.x &&
                    testX - playerSize < wall.x + wall.width &&
                    testY + playerSize > wall.y &&
                    testY - playerSize < wall.y + wall.height) {
                    canMoveX = false;
                    break;
                }
            }
        }

        // Test Y movement (keep X fixed at current position)
        if (originalVelY !== 0) {
            const testX = player.x; // Use current X position
            const testY = player.y + originalVelY * deltaTime;

            for (const wall of dungeonWalls) {
                if (testX + playerSize > wall.x &&
                    testX - playerSize < wall.x + wall.width &&
                    testY + playerSize > wall.y &&
                    testY - playerSize < wall.y + wall.height) {
                    canMoveY = false;
                    break;
                }
            }
        }

        // If touching a wall, allow sliding along it OR moving away from it
        // BUT: Only apply special logic if we're actually overlapping (stuck), otherwise use normal collision
        if (isTouchingWall && touchingWalls.length > 0) {
            // Check if we're actually overlapping (stuck inside) vs just touching
            let isActuallyStuck = false;
            for (const wall of touchingWalls) {
                const overlap = player.x + playerSize > wall.x &&
                    player.x - playerSize < wall.x + wall.width &&
                    player.y + playerSize > wall.y &&
                    player.y - playerSize < wall.y + wall.height;
                if (overlap) {
                    isActuallyStuck = true;
                    break;
                }
            }

            // Only apply special sliding/moving away logic if we're actually stuck inside
            // Otherwise, use normal collision detection (which should prevent entry)
            if (isActuallyStuck) {
                for (const wall of touchingWalls) {
                    const wallLeft = wall.x;
                    const wallRight = wall.x + wall.width;
                    const wallTop = wall.y;
                    const wallBottom = wall.y + wall.height;
                    const isHorizontalWall = wall.width >= wall.height;
                    const isVerticalWall = wall.height >= wall.width;

                    // For vertical walls: allow Y movement (sliding along) OR X movement away from wall
                    if (isVerticalWall) {
                        // Check if player is currently overlapping with this specific wall
                        const isOverlapping = player.x + playerSize > wall.x &&
                            player.x - playerSize < wall.x + wall.width &&
                            player.y + playerSize > wall.y &&
                            player.y - playerSize < wall.y + wall.height;

                        const wallCenterX = wall.x + wall.width / 2;
                        const currentDistX = Math.abs(player.x - wallCenterX);
                        const newX = player.x + originalVelX * deltaTime;
                        const newDistX = Math.abs(newX - wallCenterX);

                        // If moving X away from the wall (distance increases) AND we're overlapping, allow it
                        // But still check collisions with other walls
                        if (originalVelX !== 0 && isOverlapping && newDistX > currentDistX) {
                            // Moving away from vertical wall - check if it would collide with other walls
                            const testX = player.x + originalVelX * deltaTime;
                            let wouldCollideWithOther = false;
                            for (const otherWall of dungeonWalls) {
                                if (otherWall === wall) continue;
                                if (testX + playerSize > otherWall.x &&
                                    testX - playerSize < otherWall.x + otherWall.width &&
                                    player.y + playerSize > otherWall.y &&
                                    player.y - playerSize < otherWall.y + otherWall.height) {
                                    wouldCollideWithOther = true;
                                    break;
                                }
                            }
                            if (!wouldCollideWithOther) {
                                canMoveX = true;
                            }
                        } else if (originalVelY !== 0) {
                            // Not moving away, so allow sliding along wall (Y movement)
                            const slidePlayerSize = playerSize - 2;
                            const testY = player.y + originalVelY * deltaTime;
                            let yWouldCollide = false;
                            for (const otherWall of dungeonWalls) {
                                if (otherWall === wall) continue;
                                if (player.x + slidePlayerSize > otherWall.x &&
                                    player.x - slidePlayerSize < otherWall.x + otherWall.width &&
                                    testY + slidePlayerSize > otherWall.y &&
                                    testY - slidePlayerSize < otherWall.y + otherWall.height) {
                                    yWouldCollide = true;
                                    break;
                                }
                            }
                            if (!yWouldCollide) {
                                canMoveY = true;
                            }
                        } else if (originalVelY !== 0 && !isOverlapping) {
                            // Only Y movement and not overlapping - allow sliding along wall
                            const slidePlayerSize = playerSize - 2;
                            const testY = player.y + originalVelY * deltaTime;
                            let yWouldCollide = false;
                            for (const otherWall of dungeonWalls) {
                                if (otherWall === wall) continue;
                                if (player.x + slidePlayerSize > otherWall.x &&
                                    player.x - slidePlayerSize < otherWall.x + otherWall.width &&
                                    testY + slidePlayerSize > otherWall.y &&
                                    testY - slidePlayerSize < otherWall.y + otherWall.height) {
                                    yWouldCollide = true;
                                    break;
                                }
                            }
                            if (!yWouldCollide) {
                                canMoveY = true;
                            }
                        }
                    }

                    // For horizontal walls: allow X movement (sliding along) OR Y movement away from wall
                    if (isHorizontalWall) {
                        const wallCenterY = wall.y + wall.height / 2;
                        const currentDistY = Math.abs(player.y - wallCenterY);
                        const newY = player.y + originalVelY * deltaTime;
                        const newDistY = Math.abs(newY - wallCenterY);

                        // Only allow moving away if we're actually touching/overlapping the wall
                        // Check if player is currently overlapping with this specific wall
                        const isOverlapping = player.x + playerSize > wall.x &&
                            player.x - playerSize < wall.x + wall.width &&
                            player.y + playerSize > wall.y &&
                            player.y - playerSize < wall.y + wall.height;

                        // If moving Y away from the wall (distance increases) AND we're overlapping, allow it
                        if (originalVelY !== 0 && isOverlapping && newDistY > currentDistY) {
                            // Moving away from horizontal wall - allow Y movement
                            // But still check if it would collide with other walls
                            const testY = player.y + originalVelY * deltaTime;
                            let wouldCollideWithOther = false;
                            for (const otherWall of dungeonWalls) {
                                if (otherWall === wall) continue;
                                if (player.x + playerSize > otherWall.x &&
                                    player.x - playerSize < otherWall.x + otherWall.width &&
                                    testY + playerSize > otherWall.y &&
                                    testY - playerSize < otherWall.y + otherWall.height) {
                                    wouldCollideWithOther = true;
                                    break;
                                }
                            }
                            if (!wouldCollideWithOther) {
                                canMoveY = true;
                            }
                        } else if (originalVelX !== 0) {
                            // Not moving away or moving towards wall, so allow sliding along wall (X movement)
                            const slidePlayerSize = playerSize - 2;
                            const testX = player.x + originalVelX * deltaTime;
                            let xWouldCollide = false;
                            for (const otherWall of dungeonWalls) {
                                if (otherWall === wall) continue;
                                if (testX + slidePlayerSize > otherWall.x &&
                                    testX - slidePlayerSize < otherWall.x + otherWall.width &&
                                    player.y + slidePlayerSize > otherWall.y &&
                                    player.y - slidePlayerSize < otherWall.y + otherWall.height) {
                                    xWouldCollide = true;
                                    break;
                                }
                            }
                            if (!xWouldCollide) {
                                canMoveX = true;
                            }
                        }
                    }
                }
            }
        }

        // Apply movement restrictions - only block the axis that collides
        // This allows sliding along walls when moving diagonally
        if (!canMoveX) {
            player.setVelocityX(0);
        }
        if (!canMoveY) {
            player.setVelocityY(0);
        }

        // Final check: if one axis is blocked but the other isn't, ensure the non-blocked axis can still move
        // This handles the case where diagonal movement hits a wall - allow sliding along it
        if (!canMoveX && canMoveY && originalVelY !== 0) {
            // X is blocked, but Y is free - allow Y movement (sliding along vertical wall)
            player.setVelocityY(originalVelY);
        }
        if (!canMoveY && canMoveX && originalVelX !== 0) {
            // Y is blocked, but X is free - allow X movement (sliding along horizontal wall)
            player.setVelocityX(originalVelX);
        }
    }

    // Player attack or item pickup (Spacebar)
    // Priority: Pick up items if nearby, otherwise attack
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        let itemPickedUp = false;

        // Check for nearby items first
        items.forEach((item, index) => {
            if (!item.sprite || !item.sprite.active) return;

            const distance = Phaser.Math.Distance.Between(
                player.x, player.y,
                item.sprite.x, item.sprite.y
            );

            // Pick up item if player is close (within 30 pixels)
            if (distance < 30 && !itemPickedUp) {
                pickupItem(item, index);
                itemPickedUp = true; // Only pick up one item per key press
            }
        });

        // Only attack if no item was picked up
        if (!itemPickedUp) {
            playerAttack(time);
        }
    }

    // Get scene reference (used for multiple things below)
    const scene = game.scene.scenes[0];

    // Ability keys (1, 2, 3)
    if (Phaser.Input.Keyboard.JustDown(scene.abilityOneKey)) {
        castAbility('heal', time);
    }
    if (Phaser.Input.Keyboard.JustDown(scene.abilityTwoKey)) {
        castAbility('fireball', time);
    }
    if (Phaser.Input.Keyboard.JustDown(scene.abilityThreeKey)) {
        castAbility('shield', time);
    }

    // Update ability cooldowns
    updateAbilityCooldowns(time);

    // Toggle inventory (I key)
    if (Phaser.Input.Keyboard.JustDown(inventoryKey)) {
        toggleInventory();
    }

    // Toggle equipment (E key) - always check, even when panel is open
    if (equipmentKey && Phaser.Input.Keyboard.JustDown(equipmentKey)) {
        toggleEquipment();
    }

    // Update inventory if visible
    if (inventoryVisible) {
        updateInventory();
    }

    // Update equipment if visible
    if (equipmentVisible) {
        updateEquipment();
    }

    // Toggle quest log (Q key)
    if (Phaser.Input.Keyboard.JustDown(questKey)) {
        toggleQuestLog();
    }

    // ESC key - close any open interface
    if (settingsKey && Phaser.Input.Keyboard.JustDown(settingsKey)) {
        // Check if any interface is open (including dialogs, building panels, and quest modals)
        const anyInterfaceOpen = inventoryVisible || equipmentVisible || questVisible || shopVisible || settingsVisible || dialogVisible || buildingPanelVisible || questCompletedModal || newQuestModal;

        if (anyInterfaceOpen) {
            // Close all interfaces - don't open settings
            closeAllInterfaces();
            // Also close dialog and building panel if they're open
            // (closeDialog() and closeBuildingUI() will set their visibility flags)
            if (dialogVisible) {
                closeDialog(); // This sets dialogVisible = false internally
            }
            if (buildingPanelVisible) {
                closeBuildingUI(); // This sets buildingPanelVisible = false internally
            }
            // Quest modals have their own ESC handlers that will close them
            // We just need to prevent Settings from opening
        } else {
            // Only open settings if NO interface is open
            toggleSettings();
        }
    }

    // Interaction (F key)
    if (Phaser.Input.Keyboard.JustDown(interactKey)) {
        if (shopVisible) {
            closeShop();
        } else {
            // Check for transition markers first
            let nearMarker = false;
            for (const marker of transitionMarkers) {
                if (!marker || !marker.x || !marker.y) continue;
                const distance = Phaser.Math.Distance.Between(player.x, player.y, marker.x, marker.y);
                if (distance <= marker.radius) {
                    const targetLevel = marker.dungeonLevel || 1;

                    // Check if trying to go to next level - require previous level boss to be defeated
                    if (marker.targetMap === 'dungeon' && targetLevel > 1) {
                        const previousLevel = targetLevel - 1;
                        const previousLevelKey = `level_${previousLevel}`;
                        const previousLevelCompleted = dungeonCompletions[previousLevelKey] || false;

                        if (!previousLevelCompleted) {
                            // Boss not defeated - show message and prevent transition
                            showDamageNumber(player.x, player.y - 40, `Defeat Level ${previousLevel} Boss First!`, 0xff0000);
                            console.log(`❌ Cannot go to level ${targetLevel} - level ${previousLevel} boss not defeated`);
                            nearMarker = true; // Mark as handled to prevent other interactions
                            break;
                        }
                    }

                    console.log(`🚪 Transitioning to ${marker.targetMap} level ${targetLevel}`);
                    try {
                        transitionToMap(marker.targetMap, targetLevel);
                    } catch (e) {
                        console.error('❌ Error during transition:', e);
                    }
                    nearMarker = true;
                    break;
                }
            }

            // If not near a marker, check building or NPC interaction
            if (!nearMarker) {
                // If building UI is open, close it
                if (buildingPanelVisible) {
                    closeBuildingUI();
                    return;
                }

                // Check buildings first (in town), then NPCs
                if (currentMap === 'town') {
                    checkBuildingInteraction();
                    // If building UI didn't open, check NPCs
                    if (!buildingPanelVisible) {
                        checkNPCInteraction();
                    }
                } else {
                    checkNPCInteraction();
                }
            }
        }
    }

    // Assets window (CTRL+A)
    if (Phaser.Input.Keyboard.JustDown(assetsKey) && scene.ctrlKey.isDown) {
        toggleAssetsWindow();
    }

    // Grass debug window (CTRL+M)
    if (grassDebugKey && scene.ctrlKey) {
        if (Phaser.Input.Keyboard.JustDown(grassDebugKey) && scene.ctrlKey.isDown) {
            console.log('🔍 CTRL+M pressed!');
            toggleGrassDebugWindow();
        }
    } else {
        // Debug: log if keys aren't initialized
        if (!grassDebugKey) console.warn('⚠️ grassDebugKey not initialized');
        if (!scene.ctrlKey) console.warn('⚠️ scene.ctrlKey not initialized');
    }

    // Save/Load
    if (Phaser.Input.Keyboard.JustDown(scene.saveKey)) {
        saveGame();
    }
    if (Phaser.Input.Keyboard.JustDown(scene.loadKey)) {
        loadGame();
    }

    // Toggle controls (H key) - switch between short and full text
    if (Phaser.Input.Keyboard.JustDown(scene.helpKey)) {
        if (scene.controlsText) {
            scene.controlsExpanded = !scene.controlsExpanded;
            scene.controlsText.setText(scene.controlsExpanded ? scene.controlsFullText : scene.controlsShortText);
        }
    }

    // Update quest log if visible
    if (questVisible) {
        updateQuestLog();
    }

    // Track player movement for exploration quests
    const currentTileX = Math.floor(player.x / scene.tileSize);
    const currentTileY = Math.floor(player.y / scene.tileSize);
    if (scene.lastPlayerTileX !== undefined && scene.lastPlayerTileY !== undefined) {
        if (currentTileX !== scene.lastPlayerTileX || currentTileY !== scene.lastPlayerTileY) {
            playerStats.questStats.tilesTraveled++;
            // UQE: Emit tile traveled event
            if (typeof uqe !== 'undefined') {
                uqe.eventBus.emit(UQE_EVENTS.TILE_TRAVELED, { amount: 1 });
            }
        }
    }
    scene.lastPlayerTileX = currentTileX;
    scene.lastPlayerTileY = currentTileY;

    // Track survival time - emit UQE event every second
    playerStats.questStats.survivalTime += delta;
    if (!scene.lastSurvivalEmit) scene.lastSurvivalEmit = 0;
    scene.lastSurvivalEmit += delta;
    if (scene.lastSurvivalEmit >= 1000) {
        const seconds = Math.floor(scene.lastSurvivalEmit / 1000);
        scene.lastSurvivalEmit = scene.lastSurvivalEmit % 1000;
        if (typeof uqe !== 'undefined') {
            uqe.eventBus.emit(UQE_EVENTS.TIME_SURVIVED, { seconds: seconds });
        }
    }

    // Check quest progress
    checkQuestProgress();

    // Monster respawn system - only in wilderness
    if (currentMap === 'wilderness' && monsters.length < MONSTER_RESPAWN_THRESHOLD) {
        const scene = game.scene.scenes[0];
        const mapWidth = scene.mapWidth * scene.tileSize;
        const mapHeight = scene.mapHeight * scene.tileSize;
        const monstersNeeded = MAX_MONSTERS - monsters.length;

        // Use data-driven monster types if available
        let monsterTypes = [
            { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10, isProcedural: false },
            { name: 'Orc', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20, isProcedural: false },
            { name: 'Skeleton', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15, isProcedural: false },
            { name: 'Spider', textureKey: 'monster_spider', hp: 20, attack: 4, speed: 70, xp: 8, isProcedural: false },
            { name: 'Slime', textureKey: 'monster_slime', hp: 15, attack: 3, speed: 30, xp: 5, isProcedural: false },
            { name: 'Wolf', textureKey: 'monster_wolf', hp: 40, attack: 7, speed: 65, xp: 18, isProcedural: false },
            { name: 'Dragon', textureKey: 'monster_dragon', hp: 80, attack: 12, speed: 35, xp: 40, isProcedural: false },
            { name: 'Echo_Mite', textureKey: 'monster_echo_mite', hp: 15, attack: 3, speed: 60, xp: 5, isProcedural: false },
            { name: 'Ghost', textureKey: 'monster_ghost', hp: 35, attack: 6, speed: 55, xp: 12, isProcedural: false }
        ];

        if (monsterRenderer && Object.keys(monsterRenderer.monsterBlueprints).length > 0) {
            const uniqueBlueprints = Array.from(new Set(Object.values(monsterRenderer.monsterBlueprints)));

            uniqueBlueprints.forEach(bp => {
                monsterTypes.push({
                    name: bp.name,
                    id: bp.id,
                    hp: bp.stats.hp,
                    attack: bp.stats.attack,
                    speed: bp.stats.speed,
                    xp: bp.stats.xp,
                    textureKey: bp.id,
                    isProcedural: true
                });
            });
        }

        // Spawn monsters away from player
        for (let i = 0; i < monstersNeeded; i++) {
            let spawnX, spawnY;
            let attempts = 0;
            const maxAttempts = 50;

            // Find spawn point away from player
            do {
                spawnX = Phaser.Math.Between(50, mapWidth - 50);
                spawnY = Phaser.Math.Between(50, mapHeight - 50);
                attempts++;
            } while (
                attempts < maxAttempts &&
                Phaser.Math.Distance.Between(spawnX, spawnY, player.x, player.y) < MONSTER_AGGRO_RADIUS
            );

            const typeIndex = Math.floor(Math.random() * monsterTypes.length);
            const type = monsterTypes[typeIndex];

            spawnMonster.call(scene, spawnX, spawnY, type);
        }
    }

    // Update NPC indicators
    updateNPCIndicators();

    // Update building indicators (only in town)
    if (currentMap === 'town') {
        updateBuildingIndicators();
    }

    // Update transition marker visibility (pulse effect when near)
    transitionMarkers.forEach(marker => {
        if (marker.marker && marker.marker.active) {
            const distance = Phaser.Math.Distance.Between(player.x, player.y, marker.x, marker.y);
            const pulseSpeed = 300;
            const pulseAmount = 0.3;

            // Always pulse the marker
            const baseAlpha = 0.7;
            const pulse = Math.sin(scene.time.now / pulseSpeed) * pulseAmount;
            marker.marker.setAlpha(baseAlpha + pulse);

            // Pulse glow if it exists
            if (marker.glow && marker.glow.active) {
                const glowPulse = Math.sin(scene.time.now / pulseSpeed + Math.PI / 2) * 0.2;
                marker.glow.setAlpha(0.3 + glowPulse);
                // Also pulse the size slightly
                const sizePulse = 1 + Math.sin(scene.time.now / pulseSpeed) * 0.1;
                marker.glow.setScale(sizePulse);
            }

            if (marker.text) marker.text.setAlpha(1.0);
        }
    });

    // Handle shop scrolling (only when shop is open)
    // Note: Mouse wheel is handled in the 'wheel' event listener in create()
    // Keyboard scrolling (Up/Down arrows when shop is open)
    // Note: Movement is disabled when shop is open, so arrows only scroll
    if (shopVisible && shopPanel && shopPanel.maxScrollY > 0) {
        let scrollChanged = false;

        if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
            const oldScroll = shopPanel.scrollY;
            shopPanel.scrollY = Math.max(0, shopPanel.scrollY - 90); // One item height
            scrollChanged = (oldScroll !== shopPanel.scrollY);
        }
        if (Phaser.Input.Keyboard.JustDown(cursors.down)) {
            const oldScroll = shopPanel.scrollY;
            shopPanel.scrollY = Math.min(shopPanel.maxScrollY, shopPanel.scrollY + 90); // One item height
            scrollChanged = (oldScroll !== shopPanel.scrollY);
        }

        // Update display if scroll changed
        if (scrollChanged) {
            updateShopItems();
        }
    }

    // Update UI bars
    updateUI();

    // Update player HP bar position
    if (player && player.hpBarBg && player.hpBar) {
        const offsetY = -24; // Position above player sprite
        player.hpBarBg.x = player.x;
        player.hpBarBg.y = player.y + offsetY;
        player.hpBar.x = player.x - (player.hpBarBg.width / 2) + 1;
        player.hpBar.y = player.y + offsetY;

        // Update player HP bar width
        const hpPercent = Math.max(0, Math.min(1, playerStats.hp / playerStats.maxHp));
        player.hpBar.width = (player.hpBarBg.width - 2) * hpPercent;

        // Only show if damaged
        const showBar = playerStats.hp < playerStats.maxHp;
        player.hpBarBg.setVisible(showBar);
        player.hpBar.setVisible(showBar);
    }

    // Monster AI and combat
    monsters.forEach((monster, index) => {
        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            monster.x, monster.y
        );

        // Update monster animation based on movement
        const isMoving = monster.body.velocity.x !== 0 || monster.body.velocity.y !== 0;
        if (monster.getData('isMethod2')) {
            monsterRenderer.update(monster, isMoving);
        } else {
            updateMonsterAnimation(monster, delta);
        }

        // Move towards player if close (use monster's speed stat)
        if (distance < 200 && distance > 32) {
            const monsterSpeed = monster.speed || 50;
            this.physics.moveToObject(monster, player, monsterSpeed);

            // Check dungeon wall collisions for monsters
            if (currentMap === 'dungeon' && dungeonWalls.length > 0) {
                const monsterSize = 12; // Slightly smaller than player for easier pathfinding
                const deltaTime = delta / 1000;

                // Check if monster's intended position would collide with a wall
                const intendedX = monster.x + monster.body.velocity.x * deltaTime;
                const intendedY = monster.y + monster.body.velocity.y * deltaTime;

                let wouldCollideX = false;
                let wouldCollideY = false;

                // Test X movement
                if (monster.body.velocity.x !== 0) {
                    for (const wall of dungeonWalls) {
                        if (intendedX + monsterSize > wall.x &&
                            intendedX - monsterSize < wall.x + wall.width &&
                            monster.y + monsterSize > wall.y &&
                            monster.y - monsterSize < wall.y + wall.height) {
                            wouldCollideX = true;
                            break;
                        }
                    }
                }

                // Test Y movement
                if (monster.body.velocity.y !== 0) {
                    for (const wall of dungeonWalls) {
                        if (monster.x + monsterSize > wall.x &&
                            monster.x - monsterSize < wall.x + wall.width &&
                            intendedY + monsterSize > wall.y &&
                            intendedY - monsterSize < wall.y + wall.height) {
                            wouldCollideY = true;
                            break;
                        }
                    }
                }

                // Stop movement on axis that would collide
                if (wouldCollideX) {
                    monster.body.setVelocityX(0);
                }
                if (wouldCollideY) {
                    monster.body.setVelocityY(0);
                }
            }
        } else {
            monster.body.setVelocity(0);
        }

        // Monster attack player if in range
        if (distance <= monster.attackRange && monster.hp > 0) {
            monsterAttackPlayer(monster, time);
        }

        // Update monster HP bar position and visibility
        if (monster.hpBarBg && monster.hpBar && monster.active) {
            const offsetY = -24; // Position above monster sprite
            monster.hpBarBg.x = monster.x;
            monster.hpBarBg.y = monster.y + offsetY;
            monster.hpBar.x = monster.x - (monster.hpBarBg.width / 2) + 1;
            monster.hpBar.y = monster.y + offsetY;

            // Update monster HP bar width
            const hpPercent = Math.max(0, Math.min(1, monster.hp / monster.maxHp));
            monster.hpBar.width = (monster.hpBarBg.width - 2) * hpPercent;

            // Show HP bar if monster is damaged or player is nearby (in combat)
            const distanceToPlayer = Phaser.Math.Distance.Between(
                player.x, player.y,
                monster.x, monster.y
            );
            const showBar = monster.hp < monster.maxHp || distanceToPlayer < 150;
            monster.hpBarBg.setVisible(showBar);
            monster.hpBar.setVisible(showBar);
        }

        // Remove dead monsters
        if (monster.hp <= 0 && !monster.isDead) {
            handleMonsterDeath(monster);
        }
    });
}

/**
 * Handle monster death (XP, quests, loot, animations)
 */
function handleMonsterDeath(monster) {
    if (!monster || monster.isDead) return;
    monster.isDead = true;

    const scene = game.scene.scenes[0];

    // Check if this was a boss in a dungeon
    if (monster.isBoss && currentMap === 'dungeon') {
        onBossDefeated(dungeonLevel, monster.x, monster.y);
    }

    // Destroy HP bars
    if (monster.hpBarBg) monster.hpBarBg.destroy();
    if (monster.hpBar) monster.hpBar.destroy();

    // Play death animation & particles
    playMonsterDeathAnimation(monster);
    createDeathEffects(monster.x, monster.y);

    // Death animation - fade out and rotate (enhanced)
    scene.tweens.add({
        targets: monster,
        alpha: 0,
        angle: 360,
        scale: 0,
        duration: 500,
        ease: 'Power2'
    });

    // Give XP (based on monster type)
    const xpGain = monster.xpReward || 10;
    playerStats.xp += xpGain;
    showDamageNumber(monster.x, monster.y, `+${xpGain} XP`, 0xffd700, false, 'xp');
    addChatMessage(`Gained ${xpGain} XP`, 0xffd700, '✨');

    // Track quest progress - legacy
    playerStats.questStats.monstersKilled++;

    // UQE Bridge Event - FIX: Ensure this is called for ALL deaths
    if (typeof uqe !== 'undefined') {
        uqe.eventBus.emit(UQE_EVENTS.MONSTER_KILLED, {
            id: monster.monsterId || monster.monsterType.toLowerCase(),
            type: monster.monsterType.toLowerCase()
        });
    }

    // Add chat message for monster death
    const monsterName = monster.monsterType || 'Monster';
    addChatMessage(`${monsterName} defeated`, 0xff6b6b, '💀');

    // Check level up & Drop items
    checkLevelUp();
    dropItemsFromMonster(monster.x, monster.y);

    // Play death sound
    playSound('monster_die');

    // Remove monster after animation completes
    scene.time.delayedCall(300, () => {
        if (monster && monster.active) {
            monster.destroy();
            const index = monsters.indexOf(monster);
            if (index !== -1) {
                monsters.splice(index, 1);
            }
        }
    });
}
// Items are now manually picked up with Spacebar (handled above)
// No automatic pickup - player must press Spacebar when near items

// Check if combat just ended and show pending quest modals
const currentlyInCombat = isInCombat();
if (!currentlyInCombat && (pendingCompletedQuest || pendingNewQuest)) {
    // Combat ended, show pending quest modals
    if (pendingCompletedQuest) {
        const questToShow = pendingCompletedQuest;
        pendingCompletedQuest = null;
        showQuestCompletedModal(questToShow);
    } else if (pendingNewQuest) {
        // Only show new quest if no completed quest was pending
        const questToShow = pendingNewQuest;
        pendingNewQuest = null;
        showNewQuestModal(questToShow);
    }
}

/**
 * Player attack function
 */
function playerAttack(time) {
    const stats = playerStats;
    const scene = game.scene.scenes[0];

    // Check cooldown
    if (time - stats.lastAttackTime < stats.attackCooldown) {
        return;
    }

    // Combo tracking - check if within combo window
    const timeSinceLastAttack = time - stats.lastAttackTime;
    if (timeSinceLastAttack < stats.comboResetTime && stats.comboCount > 0) {
        // Continue combo (attacked within combo window)
        stats.comboCount++;
    } else {
        // Start new combo (too much time passed or first attack)
        stats.comboCount = 1;
    }
    stats.lastAttackTime = time;
    stats.comboTimer = 0; // Reset combo timer

    // Get weapon quality for trail color
    const equippedWeapon = stats.equipment.weapon;
    const weaponQuality = equippedWeapon ? (equippedWeapon.quality || 'Common') : 'Common';
    const weaponType = equippedWeapon ? (equippedWeapon.weaponType || 'Sword') : 'Sword';

    // Create weapon swing trail
    const facingDirection = player.facingDirection || 'south';
    createWeaponSwingTrail(player.x, player.y, facingDirection, weaponQuality);

    // Animate weapon sprite during attack
    animateWeaponStrike(facingDirection, weaponType);

    // Play attack animation if available
    if (scene.anims.exists('attack')) {
        // Stop any current animation
        player.anims.stop();

        // Set texture to attack sprite sheet if needed
        if (scene.textures.exists('player_attack')) {
            player.setTexture('player_attack');
        }

        // Play attack animation
        player.play('attack');
        console.log('Playing attack animation');

        // Resume walking animation after attack completes
        player.once('animationcomplete', (animation) => {
            if (animation && animation.key === 'attack') {
                // Switch back to walking texture
                const walkTextureKey = `player_walk_${player.facingDirection}`;
                if (scene.textures.exists(walkTextureKey)) {
                    player.setTexture(walkTextureKey);
                }

                if (player.isMoving && scene.anims.exists(`walk_${player.facingDirection}`)) {
                    player.play(`walk_${player.facingDirection}`);
                } else {
                    // Show first frame of current direction when stopped
                    player.setFrame(0);
                }
            }
        });
    } else {
        console.log('Attack animation not found - checking textures:', {
            hasAttackTexture: scene.textures.exists('player_attack'),
            hasAttackAnim: scene.anims.exists('attack')
        });
    }

    // Find nearest monster in attack range
    const attackRange = 50; // pixels
    let closestMonster = null;
    let closestDistance = attackRange;

    monsters.forEach(monster => {
        if (monster.hp <= 0) return;

        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            monster.x, monster.y
        );

        if (distance < closestDistance) {
            closestDistance = distance;
            closestMonster = monster;
        }
    });

    if (closestMonster) {
        // Calculate damage (with variation) - uses current attack (base + equipment)
        const baseDamage = playerStats.attack; // This includes equipment bonuses
        const variation = Phaser.Math.FloatBetween(0.9, 1.1);
        let damage = Math.max(1, Math.floor(baseDamage * variation));

        // Check for critical hit (5% chance, 2x damage)
        const isCritical = Math.random() < 0.05;
        if (isCritical) {
            damage = Math.floor(damage * 2);
        }

        // Apply damage
        closestMonster.hp -= damage;
        closestMonster.hp = Math.max(0, closestMonster.hp);

        // Create hit particle effects (physical damage)
        createHitEffects(closestMonster.x, closestMonster.y, isCritical, 'physical');

        // Screen shake on critical hits
        if (isCritical) {
            shakeCamera(200, 0.01); // Duration 200ms, intensity 0.01
        } else if (damage > baseDamage * 1.5) {
            // Light shake for big hits
            shakeCamera(100, 0.005);
        }

        // Show damage number with enhanced visuals for criticals
        const damageColor = isCritical ? 0xff0000 : 0xffff00; // Red for critical, yellow for normal
        const damageText = isCritical ? `-${damage} CRIT!` : `-${damage}`;
        showDamageNumber(closestMonster.x, closestMonster.y - 20, damageText, damageColor, isCritical, 'physical');
        const monsterName = closestMonster.monsterType || 'Monster';
        const chatMessage = isCritical ? `${damageText} on ${monsterName}` : `Hit ${monsterName} for ${damage} damage`;
        addChatMessage(chatMessage, isCritical ? 0xff0000 : 0xffff00, '⚔️');
        playSound('hit_monster');

        // Enhanced visual feedback - flash monster with color
        if (closestMonster.setTint) {
            const flashColor = isCritical ? 0xff6666 : 0xffffff; // Red tint for critical
            closestMonster.setTint(flashColor);
            scene.time.delayedCall(100, () => {
                if (closestMonster && closestMonster.active && closestMonster.clearTint) {
                    closestMonster.clearTint();
                }
            });
        } else {
            // Fallback for Containers (Method 2)
            const originalAlpha = closestMonster.alpha || 1;
            closestMonster.setAlpha(0.5);
            scene.time.delayedCall(100, () => {
                if (closestMonster && closestMonster.active) {
                    closestMonster.setAlpha(originalAlpha);
                }
            });
        }
    }
}

/**
 * Monster attack player
 */
function monsterAttackPlayer(monster, time) {
    // Check cooldown
    if (time - monster.lastAttackTime < monster.attackCooldown) {
        return;
    }

    monster.lastAttackTime = time;

    // Determine direction monster is facing player
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    if (Math.abs(dy) > Math.abs(dx)) {
        monster.facingDirection = dy > 0 ? 'south' : 'north';
    } else {
        monster.facingDirection = dx > 0 ? 'east' : 'west';
    }

    // Play attack animation
    playMonsterAttackAnimation(monster);

    // Calculate damage
    const baseDamage = monster.attack;
    const defense = playerStats.defense;
    const actualDamage = Math.max(1, baseDamage - Math.floor(defense / 2));

    // Apply damage to player
    playerStats.hp -= actualDamage;
    playerStats.hp = Math.max(0, playerStats.hp);

    // Create hit effects on player (red particles - physical damage)
    createHitEffects(player.x, player.y, false, 'physical');

    // Play sound effect when player is hit
    playSound('hit_player');

    // Light screen shake when player takes damage
    shakeCamera(150, 0.008);

    // Show damage number
    showDamageNumber(player.x, player.y - 20, `-${actualDamage}`, 0xff0000, false, 'physical');
    const monsterName = monster.monsterType || 'Monster';
    addChatMessage(`Took ${actualDamage} damage from ${monsterName}`, 0xff6b6b, '🛡️');

    // Enhanced visual feedback - flash player red
    player.setTint(0xff0000);
    game.scene.scenes[0].time.delayedCall(100, () => {
        if (player && player.active) {
            player.clearTint();
        }
    });

    // Check if player is dead
    if (playerStats.hp <= 0) {
        console.log('Player died!');
        // TODO: Add death handling
    }
}

/**
 * Create hit particle effects at impact point
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {boolean} isCritical - Whether this is a critical hit
 * @param {string} damageType - 'physical' or 'magic' (default: 'physical')
 */
function createHitEffects(x, y, isCritical = false, damageType = 'physical') {
    const scene = game.scene.scenes[0];

    // Create particle emitter for hit sparks
    if (!scene.textures.exists('hit_spark')) {
        return; // Particle texture not created yet
    }

    const particleCount = isCritical ? 20 : 10; // More particles for critical hits

    // Color-coded by damage type
    let colors;
    if (damageType === 'magic') {
        // Blue/purple for magic damage
        colors = isCritical
            ? [0x4400ff, 0x8800ff, 0xaa88ff, 0xffffff] // Purple/blue/white for critical magic
            : [0x4400ff, 0x6600ff, 0x8888ff]; // Blue/purple for normal magic
    } else {
        // Yellow/orange for physical damage
        colors = isCritical
            ? [0xff0000, 0xff8800, 0xffd700, 0xffffff] // Red/orange/gold/white for critical
            : [0xffd700, 0xff8800, 0xffff00]; // Yellow/orange for normal hits
    }

    // Create particles manually (Phaser 3 particle system)
    for (let i = 0; i < particleCount; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = Phaser.Math.FloatBetween(30, 80);
        const distance = Phaser.Math.FloatBetween(0, 20);
        const color = Phaser.Utils.Array.GetRandom(colors);

        const particle = scene.add.circle(
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance,
            isCritical ? 3 : 2,
            color,
            0.9
        ).setDepth(201);

        // Animate particle
        scene.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * speed,
            y: y + Math.sin(angle) * speed,
            alpha: 0,
            scale: 0,
            duration: Phaser.Math.Between(200, 400),
            ease: 'Power2',
            onComplete: () => {
                if (particle && particle.active) {
                    particle.destroy();
                }
            }
        });
    }

    // Add impact flash (brief white circle)
    const flash = scene.add.circle(x, y, isCritical ? 15 : 10, 0xffffff, 0.8)
        .setDepth(201);

    scene.tweens.add({
        targets: flash,
        scale: isCritical ? 2 : 1.5,
        alpha: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
            if (flash && flash.active) {
                flash.destroy();
            }
        }
    });
}

/**
 * Update weapon sprite based on equipped weapon
 */
function updateWeaponSprite() {
    if (!weaponSprite) return;

    const equippedWeapon = playerStats.equipment.weapon;

    if (!equippedWeapon) {
        weaponSprite.setVisible(false);
        console.log('⚠️ No weapon equipped - hiding weapon sprite');
        return;
    }

    // Get weapon type from item name or type
    const weaponType = equippedWeapon.weaponType || 'Sword';
    const weaponKey = `weapon_${weaponType.toLowerCase()}`;

    // Check if weapon sprite exists, fallback to sword
    const scene = game.scene.scenes[0];
    if (scene.textures.exists(weaponKey)) {
        weaponSprite.setTexture(weaponKey);
    } else {
        weaponSprite.setTexture('weapon_sword'); // Fallback
    }

    weaponSprite.setVisible(true);
    updateWeaponPosition();
    console.log(`✅ Weapon sprite updated: ${weaponType} (${weaponKey})`);
}

/**
 * Update weapon sprite position based on player facing direction
 */
function updateWeaponPosition() {
    if (!weaponSprite || !weaponSprite.visible || !player) return;

    // Don't update rotation during animation (but still update position)
    const skipRotation = weaponSprite.isAnimating;

    const facingDirection = player.facingDirection || 'south';

    // Get weapon type for weapon-specific positioning
    const equippedWeapon = playerStats.equipment.weapon;
    const weaponType = equippedWeapon ? (equippedWeapon.weaponType || 'Sword') : 'Sword';

    const offsetX = 0;
    const offsetY = 0;

    // Position weapon relative to player based on facing direction
    // Adjust these offsets to position the weapon correctly
    let x = player.x + offsetX;
    let y = player.y + offsetY;

    // Adjust position based on direction (weapon appears in front of player)
    switch (facingDirection) {
        case 'north':
            y -= 20; // Weapon above player
            break;
        case 'south':
            y += 8; // Weapon closer to player (hand level, not too far below)
            x -= 8; // Offset left so handle aligns with character's right hand
            break;
        case 'east':
            if (weaponType === 'Mace') {
                x += 12; // Mace closer to player's hand (reduced from 20)
                y -= 4; // Slightly higher to align handle with hand
            } else {
                x += 20; // Weapon to the right
            }
            break;
        case 'west':
            if (weaponType === 'Mace') {
                x -= 12; // Mace closer to player's hand (reduced from 20)
                y -= 4; // Slightly higher to align handle with hand
            } else {
                x -= 20; // Weapon to the left
            }
            break;
    }

    weaponSprite.x = x;
    weaponSprite.y = y;

    // Set rotation and flip based on direction (skip during animation)
    // Origin point is where the handle is (fulcrum for rotation)
    if (!skipRotation) {
        switch (facingDirection) {
            case 'north':
                weaponSprite.setFlipX(false);
                weaponSprite.rotation = -Math.PI / 2; // Point up
                // Handle is at bottom of sprite (which is left when rotated -90°)
                weaponSprite.setOrigin(1.0, 1.0); // Right edge, bottom (handle position)
                break;
            case 'south':
                weaponSprite.setFlipX(false);
                weaponSprite.rotation = Math.PI / 2; // Point down (90° clockwise)
                // Keep same origin as East (handle at bottom)
                // When rotated 90°, handle moves to left side, blade points down
                weaponSprite.setOrigin(0.5, 1.0); // Center horizontally, bottom (handle position)
                break;
            case 'east':
                weaponSprite.setFlipX(false); // Normal orientation (sword on right)
                weaponSprite.rotation = 0; // Point right
                // Handle is at bottom of sprite
                weaponSprite.setOrigin(0.5, 1.0); // Center horizontally, bottom (handle)
                break;
            case 'west':
                weaponSprite.setFlipX(true); // Flip horizontally (sword on left, right-side up)
                weaponSprite.rotation = 0; // No rotation, just flipped
                // Handle is at bottom of sprite
                weaponSprite.setOrigin(0.5, 1.0); // Center horizontally, bottom (handle)
                break;
        }
    } else {
        // During animation, only update origin and flip (not rotation)
        switch (facingDirection) {
            case 'north':
                weaponSprite.setFlipX(false);
                weaponSprite.setOrigin(1.0, 1.0);
                break;
            case 'south':
                weaponSprite.setFlipX(false);
                weaponSprite.setOrigin(0.5, 1.0);
                break;
            case 'east':
                weaponSprite.setFlipX(false);
                weaponSprite.setOrigin(0.5, 1.0);
                break;
            case 'west':
                weaponSprite.setFlipX(true);
                weaponSprite.setOrigin(0.5, 1.0);
                break;
        }
    }
}

/**
 * Animate weapon sprite during attack using rotation/flip
 * @param {string} direction - Facing direction
 * @param {string} weaponType - Weapon type (Sword, Axe, Bow, etc.)
 */
function animateWeaponStrike(direction, weaponType = 'Sword') {
    if (!weaponSprite || !weaponSprite.visible) {
        console.log('⚠️ Weapon sprite not visible - skipping animation');
        return;
    }

    const scene = game.scene.scenes[0];

    // Get base rotation and flip state for direction FIRST
    let baseRotation = 0;
    let isFlipped = false;
    switch (direction) {
        case 'north':
            baseRotation = -Math.PI / 2;
            isFlipped = false;
            break;
        case 'south':
            baseRotation = Math.PI / 2;
            isFlipped = false;
            break;
        case 'east':
            baseRotation = 0;
            isFlipped = false;
            break;
        case 'west':
            baseRotation = 0;
            isFlipped = true; // Flip horizontally for west
            break;
    }

    // Set animation flag BEFORE updating position (prevents rotation reset)
    weaponSprite.isAnimating = true;

    // Reset weapon to base position (this sets the origin/fulcrum point)
    // The skipRotation flag will prevent it from resetting rotation during animation
    updateWeaponPosition();

    console.log(`🎬 Animating weapon strike: ${weaponType} facing ${direction}`);
    console.log(`   Base rotation: ${baseRotation} (${(baseRotation * 180 / Math.PI).toFixed(1)}°)`);

    // Set initial flip state
    weaponSprite.setFlipX(isFlipped);

    // Different animation styles based on weapon type
    if (weaponType === 'Bow' || weaponType === 'Crossbow') {
        // Ranged weapons: Pull back animation
        const pullBackDistance = 10;
        let pullX = weaponSprite.x;
        let pullY = weaponSprite.y;

        switch (direction) {
            case 'north':
                pullY += pullBackDistance;
                break;
            case 'south':
                pullY -= pullBackDistance;
                break;
            case 'east':
                pullX -= pullBackDistance;
                break;
            case 'west':
                pullX += pullBackDistance;
                break;
        }

        // Pull back
        scene.tweens.add({
            targets: weaponSprite,
            x: pullX,
            y: pullY,
            duration: 100,
            ease: 'Power2',
            onComplete: () => {
                // Release (snap forward)
                scene.tweens.add({
                    targets: weaponSprite,
                    x: weaponSprite.x + (weaponSprite.x - pullX) * 2,
                    y: weaponSprite.y + (weaponSprite.y - pullY) * 2,
                    duration: 50,
                    ease: 'Power3',
                    onComplete: () => {
                        updateWeaponPosition();
                    }
                });
            }
        });
    } else {
        // Melee weapons: 5-step strike animation rotating around handle (fulcrum)
        // North/South use large 275-degree arcs, East/West use 120-degree arcs
        let maxSwingAngle;
        if (direction === 'north' || direction === 'south') {
            maxSwingAngle = (275 * Math.PI) / 180; // 275 degrees in radians for large arc
        } else {
            maxSwingAngle = (120 * Math.PI) / 180; // 120 degrees in radians for East/West
        }

        // Determine swing direction based on facing
        let swingStart, swingEnd;
        if (direction === 'east') {
            // East: swing from 0° to 120° (rightward arc)
            swingStart = baseRotation;
            swingEnd = baseRotation + maxSwingAngle;
        } else if (direction === 'west') {
            // West (flipped): swing from 0° to -120° (leftward arc)
            swingStart = baseRotation;
            swingEnd = baseRotation - maxSwingAngle;
        } else if (direction === 'north') {
            // North: swing from -90° to -90° - 275° = -365° (large counter-clockwise arc, same style as South)
            swingStart = baseRotation;
            swingEnd = baseRotation - maxSwingAngle;
        } else { // south
            // South: swing from 90° to 90° + 275° = 365° (large downward arc away from character)
            swingStart = baseRotation;
            swingEnd = baseRotation + maxSwingAngle;
        }

        // 5-step animation with varying rotation increments
        const steps = 5;
        const stepAngles = [
            0,           // Step 1: 0% (start)
            0.15,        // Step 2: 15% (wind-up)
            0.40,        // Step 3: 40% (mid-swing)
            0.75,        // Step 4: 75% (near impact)
            1.0          // Step 5: 100% (full swing)
        ];

        // Set initial rotation to start position
        weaponSprite.rotation = swingStart;

        console.log(`   Swing: ${(swingStart * 180 / Math.PI).toFixed(1)}° → ${(swingEnd * 180 / Math.PI).toFixed(1)}°`);

        // Create step-based animation
        let currentStep = 0;
        const stepDuration = 40; // 40ms per step = 200ms total

        function animateStep() {
            if (currentStep >= steps) {
                // Animation complete - return to base position
                scene.tweens.add({
                    targets: weaponSprite,
                    rotation: baseRotation,
                    duration: 100,
                    ease: 'Power1',
                    onComplete: () => {
                        weaponSprite.isAnimating = false; // Clear animation flag
                        updateWeaponPosition();
                        console.log(`   ✅ Animation complete, returned to base rotation`);
                    }
                });
                return;
            }

            // Calculate target rotation for this step
            const progress = stepAngles[currentStep];
            const targetRotation = swingStart + (swingEnd - swingStart) * progress;

            console.log(`   Step ${currentStep + 1}/5: ${(targetRotation * 180 / Math.PI).toFixed(1)}° (${(progress * 100).toFixed(0)}%)`);

            // Animate to this step
            scene.tweens.add({
                targets: weaponSprite,
                rotation: targetRotation,
                duration: stepDuration,
                ease: currentStep < 2 ? 'Power1' : 'Power2', // Faster at start, smoother at impact
                onComplete: () => {
                    currentStep++;
                    animateStep();
                }
            });
        }

        // Start the step animation
        animateStep();

        // Also add slight scale pulse for impact effect (at step 4)
        scene.time.delayedCall(stepDuration * 3, () => {
            scene.tweens.add({
                targets: weaponSprite,
                scaleX: weaponSprite.scaleX * 1.15,
                scaleY: weaponSprite.scaleY * 1.15,
                duration: 30,
                yoyo: true,
                ease: 'Power2'
            });
        });
    }
}

/**
 * Create weapon swing trail effect
 * @param {number} x - X position (player position)
 * @param {number} y - Y position (player position)
 * @param {string} direction - Facing direction
 * @param {string} quality - Weapon quality (Common, Uncommon, Rare, Epic, Legendary)
 */
function createWeaponSwingTrail(x, y, direction, quality = 'Common') {
    const scene = game.scene.scenes[0];
    const qualityColor = QUALITY_COLORS[quality] || QUALITY_COLORS['Common'];

    // Calculate trail direction based on player facing
    let angle = 0;
    let trailLength = 30;

    switch (direction) {
        case 'north':
            angle = -Math.PI / 2; // Up
            break;
        case 'south':
            angle = Math.PI / 2; // Down
            break;
        case 'east':
            angle = 0; // Right
            break;
        case 'west':
            angle = Math.PI; // Left
            break;
        case 'northeast':
            angle = -Math.PI / 4;
            break;
        case 'northwest':
            angle = -3 * Math.PI / 4;
            break;
        case 'southeast':
            angle = Math.PI / 4;
            break;
        case 'southwest':
            angle = 3 * Math.PI / 4;
            break;
        default:
            angle = 0;
    }

    // Create trail particles (arc shape)
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const arcOffset = (i / particleCount) * Math.PI * 0.6 - Math.PI * 0.3; // 60 degree arc
        const particleAngle = angle + arcOffset;
        const distance = (i / particleCount) * trailLength;

        const particleX = x + Math.cos(particleAngle) * distance;
        const particleY = y + Math.sin(particleAngle) * distance;

        // Create trail particle
        const particle = scene.add.circle(
            particleX,
            particleY,
            Phaser.Math.Between(2, 4),
            qualityColor,
            0.8
        ).setDepth(200);

        // Animate particle (fade and move outward)
        scene.tweens.add({
            targets: particle,
            x: particleX + Math.cos(particleAngle) * 20,
            y: particleY + Math.sin(particleAngle) * 20,
            alpha: 0,
            scale: 0,
            duration: Phaser.Math.Between(150, 250),
            ease: 'Power2',
            onComplete: () => {
                if (particle && particle.active) {
                    particle.destroy();
                }
            }
        });
    }

    // Create main swing line (bright line following the arc)
    const lineGraphics = scene.add.graphics();
    lineGraphics.lineStyle(3, qualityColor, 0.9);
    lineGraphics.setDepth(200);

    // Draw arc line
    const startAngle = angle - Math.PI * 0.3;
    const endAngle = angle + Math.PI * 0.3;
    const radius = trailLength * 0.7;

    lineGraphics.beginPath();
    lineGraphics.arc(x, y, radius, startAngle, endAngle, false);
    lineGraphics.strokePath();

    // Fade out the line
    scene.tweens.add({
        targets: lineGraphics,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
            if (lineGraphics && lineGraphics.active) {
                lineGraphics.destroy();
            }
        }
    });
}

/**
 * Create sparkle effect for XP gains
 */
function createSparkleEffect(x, y) {
    const scene = game.scene.scenes[0];

    const sparkleCount = 8;
    const colors = [0xffd700, 0xffaa00, 0xffff00, 0xffffff]; // Gold/yellow/white

    for (let i = 0; i < sparkleCount; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.FloatBetween(5, 15);
        const speed = Phaser.Math.FloatBetween(20, 40);
        const color = Phaser.Utils.Array.GetRandom(colors);

        const sparkle = scene.add.circle(
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance,
            Phaser.Math.Between(1, 3),
            color,
            0.9
        ).setDepth(201);

        scene.tweens.add({
            targets: sparkle,
            x: x + Math.cos(angle) * speed,
            y: y + Math.sin(angle) * speed,
            alpha: 0,
            scale: 0,
            duration: Phaser.Math.Between(300, 500),
            ease: 'Power2',
            onComplete: () => {
                if (sparkle && sparkle.active) {
                    sparkle.destroy();
                }
            }
        });
    }
}

/**
 * Create death particle burst effect
 */
function createDeathEffects(x, y) {
    const scene = game.scene.scenes[0];

    const particleCount = 15;
    const colors = [0xff4444, 0xff8800, 0x888888, 0x444444]; // Red/orange/gray for death

    for (let i = 0; i < particleCount; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = Phaser.Math.FloatBetween(40, 100);
        const color = Phaser.Utils.Array.GetRandom(colors);

        const particle = scene.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.9)
            .setDepth(201);

        scene.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * speed,
            y: y + Math.sin(angle) * speed,
            alpha: 0,
            scale: 0,
            duration: Phaser.Math.Between(300, 600),
            ease: 'Power2',
            onComplete: () => {
                if (particle && particle.active) {
                    particle.destroy();
                }
            }
        });
    }
}

/**
 * Shake camera for impact feedback
 */
let cameraShakeTween = null;
function shakeCamera(duration = 200, intensity = 0.01) {
    const scene = game.scene.scenes[0];
    const camera = scene.cameras.main;

    // Cancel existing shake if any
    if (cameraShakeTween) {
        cameraShakeTween.stop();
        camera.setScroll(0, 0);
    }

    const originalX = camera.scrollX;
    const originalY = camera.scrollY;
    let elapsed = 0;

    const shake = () => {
        if (elapsed < duration) {
            const offsetX = (Math.random() - 0.5) * intensity * camera.width;
            const offsetY = (Math.random() - 0.5) * intensity * camera.height;
            camera.setScroll(originalX + offsetX, originalY + offsetY);
            elapsed += 16; // ~60fps
            scene.time.delayedCall(16, shake);
        } else {
            camera.setScroll(originalX, originalY);
            cameraShakeTween = null;
        }
    };

    shake();
}

/**
 * Show floating damage number with enhanced visuals
 */
/**
 * Show damage/healing/XP number with visual effects
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} text - Text to display
 * @param {number} color - Color hex value
 * @param {boolean} isCritical - Whether this is a critical hit
 * @param {string} type - Type: 'physical', 'magic', 'healing', 'xp' (default: 'physical')
 */
/**
 * Create system chat box for combat and loot messages
 */
function createSystemChatBox() {
    const scene = game.scene.scenes[0];
    const gameWidth = 1024;
    const gameHeight = 768;
    const chatWidth = Math.floor(gameWidth / 3); // One third of map width
    const chatHeight = 120;
    const chatX = 10; // Left margin
    const chatY = gameHeight - chatHeight - 10; // Bottom margin

    // Create background panel
    const bg = scene.add.rectangle(chatX + chatWidth / 2, chatY + chatHeight / 2, chatWidth, chatHeight, 0x000000, 0.85)
        .setScrollFactor(0).setDepth(250).setStrokeStyle(2, 0x666666);

    // Create scrollable text container
    const textContainer = scene.add.container(chatX + 5, chatY + 5);
    textContainer.setScrollFactor(0).setDepth(251);

    // Create mask for clipping text that goes outside the box
    // Mask is positioned relative to container (0, 0)
    const maskGraphics = scene.make.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(0, 0, chatWidth - 20, chatHeight - 10);
    maskGraphics.setPosition(chatX + 5, chatY + 5);
    maskGraphics.setScrollFactor(0);
    const mask = maskGraphics.createGeometryMask();
    textContainer.setMask(mask);

    systemChatBox = {
        bg: bg,
        container: textContainer,
        mask: mask,
        messages: [],
        scrollY: 0,
        maxScrollY: 0,
        width: chatWidth - 20,
        height: chatHeight - 10,
        x: chatX + 5,
        y: chatY + 5,
        padding: 5
    };

    chatMessages = [];
    console.log('✅ System chat box created');
}

/**
 * Add a message to the system chat box
 */
function addChatMessage(text, color = 0xffffff, icon = '') {
    if (!systemChatBox) {
        console.warn('Chat box not initialized');
        return;
    }

    const scene = game.scene.scenes[0];
    const timestamp = new Date().toLocaleTimeString();
    const displayText = icon ? `${icon} ${text}` : text;

    // Create message text
    const messageText = scene.add.text(0, 0, `[${timestamp}] ${displayText}`, {
        fontSize: '11px',
        fill: `#${color.toString(16).padStart(6, '0')}`,
        wordWrap: { width: systemChatBox.width - 15 }
    }).setOrigin(0, 0);

    // Calculate Y position based on existing messages
    let yOffset = systemChatBox.padding;
    systemChatBox.messages.forEach(msg => {
        yOffset += msg.height + 3; // Small spacing between messages
    });

    // Position message
    messageText.setPosition(systemChatBox.padding, yOffset);

    // Add to container
    systemChatBox.container.add(messageText);

    // Store message reference
    const messageData = {
        text: messageText,
        height: messageText.height,
        y: yOffset
    };
    systemChatBox.messages.push(messageData);
    chatMessages.push({ text: displayText, color, timestamp });

    // Limit messages (remove oldest if too many)
    if (systemChatBox.messages.length > MAX_CHAT_MESSAGES) {
        const oldMsg = systemChatBox.messages.shift();
        if (oldMsg && oldMsg.text && oldMsg.text.active) {
            oldMsg.text.destroy();
        }
        // Reposition remaining messages
        repositionChatMessages();
    }

    // Auto-scroll to bottom to show latest message
    updateChatScroll();
}

/**
 * Reposition all chat messages (after removing old ones)
 */
function repositionChatMessages() {
    if (!systemChatBox) return;

    let yOffset = systemChatBox.padding;
    systemChatBox.messages.forEach(msg => {
        if (msg.text && msg.text.active) {
            msg.text.setPosition(systemChatBox.padding, yOffset);
            msg.y = yOffset;
            yOffset += msg.height + 3;
        }
    });
}

/**
 * Update chat scroll position
 */
function updateChatScroll() {
    if (!systemChatBox) return;

    // Calculate total height of all messages
    let totalHeight = systemChatBox.padding;
    systemChatBox.messages.forEach(msg => {
        totalHeight += msg.height + 3;
    });

    // Update max scroll
    systemChatBox.maxScrollY = Math.max(0, totalHeight - systemChatBox.height);

    // Auto-scroll to bottom (show latest messages)
    systemChatBox.scrollY = systemChatBox.maxScrollY;

    // Apply scroll offset to container
    systemChatBox.container.y = systemChatBox.y - systemChatBox.scrollY;
}

/**
 * Scroll chat box with mouse wheel
 */
function scrollChat(delta) {
    if (!systemChatBox) return;

    // Update scroll position
    systemChatBox.scrollY += delta;

    // Clamp scroll position to valid range
    systemChatBox.scrollY = Math.max(0, Math.min(systemChatBox.maxScrollY, systemChatBox.scrollY));

    // Apply scroll offset to container
    systemChatBox.container.y = systemChatBox.y - systemChatBox.scrollY;
}

function showDamageNumber(x, y, text, color, isCritical = false, type = 'physical') {
    const scene = game.scene.scenes[0];
    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

    // Add icons/symbols based on type
    let displayText = text;
    if (type === 'healing') {
        displayText = `↑ ${text}`; // Upward arrow for healing
    } else if (type === 'xp') {
        displayText = `✨ ${text}`; // Sparkle for XP
    } else if (type === 'magic') {
        displayText = `⚡ ${text}`; // Lightning bolt for magic
    } else if (type === 'physical') {
        displayText = `⚔ ${text}`; // Sword for physical
    }

    const fontSize = isCritical ? '28px' : '20px';
    const strokeThickness = isCritical ? 4 : 2;

    const textObj = scene.add.text(x, y, displayText, {
        fontSize: fontSize,
        fill: colorHex,
        stroke: '#000000',
        strokeThickness: strokeThickness,
        fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(200);

    // Add bounce effect for critical hits
    if (isCritical) {
        scene.tweens.add({
            targets: textObj,
            scale: 1.5,
            duration: 100,
            yoyo: true,
            ease: 'Bounce'
        });
    }

    // Create sparkle effect for XP
    if (type === 'xp') {
        createSparkleEffect(x, y);
    }

    damageNumbers.push({
        x: x,
        y: y,
        text: displayText,
        timer: isCritical ? 2.0 : 1.4, // Longer display for criticals
        color: color,
        textObject: textObj,
        isCritical: isCritical,
        type: type
    });
}

/**
 * Update damage numbers
 */
function updateDamageNumbers(time, delta) {
    const deltaSeconds = delta / 1000;

    damageNumbers.forEach((dn, index) => {
        dn.timer -= deltaSeconds;

        // Different movement based on type
        let floatSpeed;
        if (dn.type === 'healing') {
            floatSpeed = 25; // Healing moves upward faster
        } else if (dn.type === 'xp') {
            floatSpeed = dn.isCritical ? 20 : 15; // XP floats up
        } else {
            floatSpeed = dn.isCritical ? 20 : 15; // Damage floats up
        }
        dn.y -= floatSpeed * deltaSeconds;

        // Update text object position (Phaser handles camera scrolling automatically)
        if (dn.textObject && dn.textObject.active) {
            dn.textObject.x = dn.x;
            dn.textObject.y = dn.y;

            // Fade out - use appropriate timer duration
            const fadeDuration = dn.isCritical ? 2.0 : 1.4;
            const alpha = Math.min(1, dn.timer / fadeDuration);
            dn.textObject.setAlpha(alpha);

            // Add subtle pulsing effect for critical hits
            if (dn.isCritical && dn.timer > 0.5) {
                const pulse = 1 + Math.sin(time * 0.02) * 0.1;
                dn.textObject.setScale(pulse);
            }
        }

        if (dn.timer <= 0) {
            if (dn.textObject && dn.textObject.active) {
                dn.textObject.destroy();
            }
            damageNumbers.splice(index, 1);
        }
    });
}

/**
 * Update combo display
 */
function updateComboDisplay() {
    const scene = game.scene.scenes[0];
    const comboCount = playerStats.comboCount;

    if (comboCount <= 0) {
        // Hide combo display
        if (comboText && comboText.active) {
            // Stop any active tweens
            if (comboText.comboTween) {
                scene.tweens.remove(comboText.comboTween);
                comboText.comboTween = null;
            }
            comboText.destroy();
            comboText = null;
        }
        if (comboIndicator && comboIndicator.active) {
            // Stop any active tweens
            if (comboIndicator.indicatorTween) {
                scene.tweens.remove(comboIndicator.indicatorTween);
                comboIndicator.indicatorTween = null;
            }
            comboIndicator.destroy();
            comboIndicator = null;
        }
        return;
    }

    // Create or update combo text (position on right side to avoid overlap)
    const gameWidth = scene.cameras.main.width;
    if (!comboText || !comboText.active) {
        comboText = scene.add.text(gameWidth - 200, 20, '', {
            fontSize: '24px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(310).setOrigin(1, 0); // Right-aligned
    }

    // Determine combo color based on count
    let comboColor = '#ffffff';
    let comboSize = '24px';
    if (comboCount >= 10) {
        comboColor = '#ff00ff'; // Magenta for high combos
        comboSize = '32px';
    } else if (comboCount >= 5) {
        comboColor = '#ff8800'; // Orange for medium combos
        comboSize = '28px';
    } else {
        comboColor = '#ffff00'; // Yellow for low combos
    }

    comboText.setText(`${comboCount}x COMBO!`);
    comboText.setStyle({ fontSize: comboSize, fill: comboColor });

    // Add pulsing effect for high combos (only if not already tweening)
    if (comboCount >= 5 && !comboText.comboTween) {
        comboText.comboTween = scene.tweens.add({
            targets: comboText,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            ease: 'Power2',
            repeat: -1
        });
    } else if (comboCount < 5 && comboText.comboTween) {
        // Stop tween if combo drops below 5
        scene.tweens.remove(comboText.comboTween);
        comboText.comboTween = null;
        comboText.setScale(1);
    }

    // Create combo indicator (glowing effect)
    if (!comboIndicator || !comboIndicator.active) {
        comboIndicator = scene.add.circle(comboText.x - comboText.width / 2, comboText.y + comboText.height / 2, 30, 0xffffff, 0.3)
            .setScrollFactor(0).setDepth(309);
    }

    // Update indicator position (since text is right-aligned)
    comboIndicator.x = comboText.x - comboText.width / 2;
    comboIndicator.y = comboText.y + comboText.height / 2;

    // Update indicator color and size based on combo
    const indicatorColor = comboCount >= 10 ? 0xff00ff : (comboCount >= 5 ? 0xff8800 : 0xffff00);
    comboIndicator.setFillStyle(indicatorColor, comboCount >= 5 ? 0.4 : 0.2);
    comboIndicator.setRadius(20 + comboCount * 2);

    // Pulse indicator (only if not already tweening)
    if (!comboIndicator.indicatorTween) {
        comboIndicator.indicatorTween = scene.tweens.add({
            targets: comboIndicator,
            alpha: { from: 0.3, to: 0.6 },
            scale: { from: 0.9, to: 1.1 },
            duration: 500,
            yoyo: true,
            ease: 'Sine.easeInOut',
            repeat: -1
        });
    }
}

/**
 * Update attack speed bonus indicator
 * Only shows when there's a combo-based bonus (temporary), not equipment-based (permanent)
 */
function updateAttackSpeedIndicator() {
    const scene = game.scene.scenes[0];

    // Only show indicator for combo-based bonuses (temporary), not equipment (permanent)
    const comboAttackSpeedBonus = Math.min(playerStats.comboCount * 0.05, 0.3); // Max 30% reduction at 6+ combo

    if (comboAttackSpeedBonus <= 0) {
        // Hide indicator if no combo bonus
        if (attackSpeedIndicator && attackSpeedIndicator.active) {
            // Stop any active tweens
            if (attackSpeedIndicator.speedTween) {
                scene.tweens.remove(attackSpeedIndicator.speedTween);
                attackSpeedIndicator.speedTween = null;
            }
            attackSpeedIndicator.destroy();
            attackSpeedIndicator = null;
        }
        return;
    }

    // Create or update indicator (position on right side, below combo)
    const gameWidth = scene.cameras.main.width;
    if (!attackSpeedIndicator || !attackSpeedIndicator.active) {
        attackSpeedIndicator = scene.add.text(gameWidth - 200, 60, '', {
            fontSize: '16px',
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 2,
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(310).setOrigin(1, 0); // Right-aligned
    }

    const speedPercent = Math.round(comboAttackSpeedBonus * 100);
    attackSpeedIndicator.setText(`⚡ Attack Speed +${speedPercent}%`);

    // Pulse effect (only if not already tweening)
    if (!attackSpeedIndicator.speedTween) {
        attackSpeedIndicator.speedTween = scene.tweens.add({
            targets: attackSpeedIndicator,
            alpha: { from: 0.7, to: 1.0 },
            duration: 800,
            yoyo: true,
            ease: 'Sine.easeInOut',
            repeat: -1
        });
    }
}

/**
 * Update UI bars
 */
function updateUI() {
    const stats = playerStats;
    const maxBarWidth = 200 - 4; // Consistent max width for all bars
    const scene = game.scene.scenes[0];

    // Update HP bar
    const hpPercent = Math.max(0, Math.min(1, stats.hp / stats.maxHp));
    hpBar.width = maxBarWidth * hpPercent;

    // Update Mana bar
    const manaPercent = Math.max(0, Math.min(1, stats.mana / stats.maxMana));
    manaBar.width = maxBarWidth * manaPercent;

    // Update Stamina bar
    const staminaPercent = Math.max(0, Math.min(1, stats.stamina / stats.maxStamina));
    staminaBar.width = maxBarWidth * staminaPercent;

    // Update XP bar (simplified - 100 XP per level for now)
    const xpForNextLevel = playerStats.level * 100;
    const currentLevelXP = stats.xp % xpForNextLevel;
    const xpPercent = Math.max(0, Math.min(1, currentLevelXP / xpForNextLevel));
    xpBar.width = maxBarWidth * xpPercent;

    // Update stats text
    statsText.setText(`Level ${stats.level} | HP: ${Math.ceil(stats.hp)}/${stats.maxHp} | XP: ${stats.xp}`);

    // Update gold text
    if (goldText) {
        goldText.setText(`Gold: ${stats.gold}`);
    }

    // Update debug text (player position)
    if (player && scene.debugText) {
        const tileX = Math.floor(player.x / scene.tileSize);
        const tileY = Math.floor(player.y / scene.tileSize);
        scene.debugText.setText(`X: ${Math.floor(player.x)} Y: ${Math.floor(player.y)} | Tile: (${tileX}, ${tileY})`);
    }
}

/**
 * Check for level up
 */
function checkLevelUp() {
    const stats = playerStats;
    const xpNeeded = stats.level * 100;

    if (stats.xp >= xpNeeded) {
        stats.level++;
        stats.maxHp += 20;
        stats.hp = stats.maxHp; // Full heal on level up
        stats.maxMana += 10;
        stats.mana = stats.maxMana;
        stats.attack += 2;
        stats.defense += 1;

        showDamageNumber(player.x, player.y - 40, 'LEVEL UP!', 0x00ffff);
        addChatMessage(`Level Up! Now Level ${stats.level}`, 0x00ffff, '⭐');
        console.log(`Level up! Now level ${stats.level}`);

        // UQE: Emit level up event
        if (typeof uqe !== 'undefined') {
            uqe.eventBus.emit(UQE_EVENTS.LEVEL_UP, { level: stats.level });
            uqe.update(); // Check for quest completion
        }
    }
}

// ============================================
// ENHANCED ITEM SYSTEM - CONSTANTS
// ============================================

// Weapon types with different stat profiles
const WEAPON_TYPES = {
    'Sword': { baseAttack: 1.0, speed: 1.0, critChance: 0.05 },      // Balanced
    'Axe': { baseAttack: 1.15, speed: 0.9, critChance: 0.08 },       // High damage, slower
    'Mace': { baseAttack: 1.1, speed: 0.85, critChance: 0.06 },      // High damage, very slow
    'Dagger': { baseAttack: 0.85, speed: 1.2, critChance: 0.12 },    // Fast, high crit
    'Staff': { baseAttack: 0.9, speed: 1.1, critChance: 0.07 },     // Magic-focused
    'Bow': { baseAttack: 0.95, speed: 1.15, critChance: 0.10 },     // Ranged, fast
    'Crossbow': { baseAttack: 1.05, speed: 0.95, critChance: 0.09 }  // Ranged, powerful
};

// Material types that affect stats
const MATERIALS = {
    'Iron': { multiplier: 1.0, tier: 1 },
    'Steel': { multiplier: 1.2, tier: 2 },
    'Silver': { multiplier: 1.4, tier: 3 },
    'Gold': { multiplier: 1.6, tier: 4 },
    'Mithril': { multiplier: 1.8, tier: 5 },
    'Dragonbone': { multiplier: 2.0, tier: 6 }
};

// Prefixes that modify stats
const PREFIXES = {
    'Sharp': { attackBonus: 0.15, quality: ['Common', 'Uncommon'] },
    'Sturdy': { defenseBonus: 0.15, quality: ['Common', 'Uncommon'] },
    'Balanced': { attackBonus: 0.1, defenseBonus: 0.1, quality: ['Common', 'Uncommon'] },
    'Vicious': { attackBonus: 0.25, critBonus: 0.05, quality: ['Uncommon', 'Rare'] },
    'Reinforced': { defenseBonus: 0.25, hpBonus: 0.1, quality: ['Uncommon', 'Rare'] },
    'Precise': { critBonus: 0.1, attackBonus: 0.1, quality: ['Uncommon', 'Rare'] },
    'Soulbound': { attackBonus: 0.2, defenseBonus: 0.2, lifesteal: 0.05, quality: ['Rare', 'Epic'] },
    'Ethereal': { defenseBonus: 0.3, resistance: { magic: 0.1 }, quality: ['Rare', 'Epic'] },
    'Celestial': { attackBonus: 0.3, critBonus: 0.15, quality: ['Epic', 'Legendary'] },
    'Demonic': { attackBonus: 0.35, lifesteal: 0.1, quality: ['Epic', 'Legendary'] },
    'Divine': { attackBonus: 0.25, defenseBonus: 0.25, hpBonus: 0.2, quality: ['Legendary'] }
};

// Suffixes that modify stats
const SUFFIXES = {
    'of Power': { attackBonus: 0.2, quality: ['Uncommon', 'Rare'] },
    'of Protection': { defenseBonus: 0.2, quality: ['Uncommon', 'Rare'] },
    'of Swiftness': { speedBonus: 0.15, critBonus: 0.05, quality: ['Uncommon', 'Rare'] },
    'of Vitality': { hpBonus: 0.25, quality: ['Uncommon', 'Rare'] },
    'of the Bear': { hpBonus: 0.3, defenseBonus: 0.15, quality: ['Rare', 'Epic'] },
    'of the Wolf': { attackBonus: 0.2, speedBonus: 0.2, quality: ['Rare', 'Epic'] },
    'of the Eagle': { critBonus: 0.15, attackBonus: 0.15, quality: ['Rare', 'Epic'] },
    'of Life': { lifesteal: 0.08, hpBonus: 0.2, quality: ['Epic', 'Legendary'] },
    'of Death': { attackBonus: 0.3, critBonus: 0.2, quality: ['Epic', 'Legendary'] },
    'of Eternity': { attackBonus: 0.25, defenseBonus: 0.25, hpBonus: 0.25, quality: ['Legendary'] }
};

// Set items - matching pieces grant bonuses
const ITEM_SETS = {
    'Warrior': {
        pieces: ['weapon', 'armor', 'helmet', 'boots', 'gloves'],
        bonuses: {
            2: { attackBonus: 0.1 },
            3: { defenseBonus: 0.1 },
            4: { hpBonus: 0.15 },
            5: { attackBonus: 0.15, defenseBonus: 0.15, critBonus: 0.1 }
        }
    },
    'Guardian': {
        pieces: ['armor', 'helmet', 'boots', 'gloves', 'belt'],
        bonuses: {
            2: { defenseBonus: 0.15 },
            3: { hpBonus: 0.2 },
            4: { resistance: { physical: 0.1 } },
            5: { defenseBonus: 0.25, hpBonus: 0.3, resistance: { physical: 0.15 } }
        }
    },
    'Assassin': {
        pieces: ['weapon', 'helmet', 'boots', 'gloves', 'ring'],
        bonuses: {
            2: { critBonus: 0.1 },
            3: { speedBonus: 0.15 },
            4: { attackBonus: 0.15 },
            5: { critBonus: 0.2, attackBonus: 0.2, lifesteal: 0.1 }
        }
    }
};

// Elemental damage types
const ELEMENTAL_TYPES = ['Fire', 'Ice', 'Lightning', 'Poison', 'Arcane'];

// ============================================
// ENHANCED ITEM SYSTEM - HELPER FUNCTIONS
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
        'Epic': Object.keys(WEAPON_TYPES),
        'Legendary': Object.keys(WEAPON_TYPES)
    };
    const available = qualityWeapons[quality] || qualityWeapons['Common'];
    return Phaser.Math.RND.pick(available);
}

/**
 * Get prefix based on quality
 */
function getPrefixForQuality(quality) {
    const available = Object.keys(PREFIXES).filter(p =>
        PREFIXES[p].quality.includes(quality)
    );
    if (available.length === 0) return null;
    return Math.random() < 0.4 ? Phaser.Math.RND.pick(available) : null; // 40% chance
}

/**
 * Get suffix based on quality
 */
function getSuffixForQuality(quality) {
    const available = Object.keys(SUFFIXES).filter(s =>
        SUFFIXES[s].quality.includes(quality)
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
                type: Phaser.Math.RND.pick(ELEMENTAL_TYPES),
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
        const setNames = Object.keys(ITEM_SETS);
        const set = Phaser.Math.RND.pick(setNames);
        if (ITEM_SETS[set].pieces.includes(item.type)) {
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
    if (baseItem.material && MATERIALS[baseItem.material]) {
        const mult = MATERIALS[baseItem.material].multiplier;
        attackPower = Math.floor(attackPower * mult);
        defense = Math.floor(defense * mult);
    }

    // Apply prefix bonuses
    if (baseItem.prefix && PREFIXES[baseItem.prefix]) {
        const prefix = PREFIXES[baseItem.prefix];
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
    if (baseItem.suffix && SUFFIXES[baseItem.suffix]) {
        const suffix = SUFFIXES[baseItem.suffix];
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
        return {
            type: 'consumable',
            name: 'Health Potion',
            quality: 'Common',
            healAmount: Phaser.Math.Between(20, 40)
        };
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
        const weaponData = WEAPON_TYPES[weaponType];

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
            const weaponData = WEAPON_TYPES[weaponType];
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

/**
 * Drop items from a killed monster
 */
function dropItemsFromMonster(x, y) {
    const scene = game.scene.scenes[0];

    // 70% chance to drop random loot
    let droppedItem = null;
    if (Math.random() < 0.7) {
        droppedItem = generateRandomItem();
    }

    // NEW: Quest-specific loot logic
    // If the player has an active quest for a specific item, give it a chance to drop
    if (typeof uqe !== 'undefined') {
        uqe.activeQuests.forEach(quest => {
            quest.objectives.forEach(obj => {
                if (obj.type === 'collect' && !obj.completed) {
                    // 30% chance to drop quest-specific item
                    if (Math.random() < 0.3) {
                        droppedItem = {
                            id: obj.itemId,
                            type: 'quest_item',
                            name: obj.label.replace('Gather ', '').replace('Collect ', ''),
                            quality: 'Uncommon',
                            amount: 1
                        };
                        console.log(`🎁 [UQE Bridge] Dropping quest item: ${droppedItem.name}`);
                    }
                }
            });
        });
    }

    if (droppedItem) {
        const item = droppedItem;
        // Create item sprite on ground
        let spriteKey = 'item_gold';
        if (item.type === 'weapon') spriteKey = 'item_weapon';
        else if (item.type === 'armor') spriteKey = 'item_armor';
        else if (item.type === 'helmet') spriteKey = 'item_helmet';
        else if (item.type === 'ring') spriteKey = 'item_ring';
        else if (item.type === 'amulet') spriteKey = 'item_amulet';
        else if (item.type === 'boots') spriteKey = 'item_boots';
        else if (item.type === 'gloves') spriteKey = 'item_gloves';
        else if (item.type === 'belt') spriteKey = 'item_belt';
        else if (item.type === 'consumable') spriteKey = 'item_consumable';
        else if (item.type === 'quest_item') spriteKey = 'item_consumable'; // Use consumable sprite for shards etc.

        const itemSprite = scene.add.sprite(x, y, spriteKey);
        itemSprite.setDepth(8); // Above tiles, below monsters

        // Add slight random offset so items don't stack exactly
        itemSprite.x += Phaser.Math.Between(-10, 10);
        itemSprite.y += Phaser.Math.Between(-10, 10);

        // Add pulsing animation to make items noticeable
        scene.tweens.add({
            targets: itemSprite,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Store item data
        item.sprite = itemSprite;
        item.x = itemSprite.x;
        item.y = itemSprite.y;

        items.push(item);

        // Add chat message for loot drop
        const qualityColor = {
            'Common': 0xcccccc,
            'Uncommon': 0x1eff00,
            'Rare': 0x0070dd,
            'Epic': 0xa335ee,
            'Legendary': 0xff8000
        }[item.quality] || 0xcccccc;
        addChatMessage(`Loot: ${item.name} (${item.quality})`, qualityColor, '💎');
    }
}

/**
 * Pick up an item
 */
function pickupItem(item, index) {
    const scene = game.scene.scenes[0];

    if (item.type === 'gold') {
        // Add gold directly
        playerStats.gold += item.amount;
        playerStats.questStats.goldEarned += item.amount;
        showDamageNumber(item.sprite.x, item.sprite.y, `+${item.amount} Gold`, 0xffd700);
        updatePlayerStats(); // Update gold display
    } else {
        // Add item to inventory
        console.log(`📦 Adding item to inventory: ${item.name} (type: ${item.type})`);
        console.log(`   Before: ${playerStats.inventory.length} items`);
        playerStats.inventory.push(item);
        console.log(`   After: ${playerStats.inventory.length} items`);
        console.log(`   Inventory contents:`, playerStats.inventory.map(i => i.name));
        playerStats.questStats.itemsCollected++;
        showDamageNumber(item.sprite.x, item.sprite.y, `Picked up ${item.name}`, 0x00ff00);
        playSound('item_pickup');
        console.log(`Picked up: ${item.name} (Inventory: ${playerStats.inventory.length} items)`);

        // Refresh inventory UI if open - this will update the display with the new item
        refreshInventory();

        // UQE Bridge Event
        if (typeof uqe !== 'undefined') {
            uqe.eventBus.emit(UQE_EVENTS.ITEM_PICKUP, {
                id: item.id || item.name,
                type: item.type,
                amount: 1
            });
        }
    }

    // Remove item from ground
    if (item.sprite && item.sprite.active) {
        item.sprite.destroy();
    }
    items.splice(index, 1);
}

/**
 * Close all open interfaces
 */
function closeAllInterfaces() {
    if (inventoryVisible) {
        inventoryVisible = false;
        destroyInventoryUI();
    }
    if (equipmentVisible) {
        equipmentVisible = false;
        destroyEquipmentUI();
    }
    if (questVisible) {
        questVisible = false;
        destroyQuestLogUI();
    }
    if (shopVisible) {
        shopVisible = false;
        closeShop();
    }
    if (settingsVisible) {
        settingsVisible = false;
        destroySettingsUI();
    }
    // Note: dialogVisible and buildingPanelVisible may have their own close handlers
    // Add them here if needed
}

/**
 * Toggle inventory visibility
 */
function toggleInventory() {
    const scene = game.scene.scenes[0];

    // If already open, close it
    if (inventoryVisible) {
        inventoryVisible = false;
        destroyInventoryUI();
        return;
    }

    // Close all other interfaces before opening
    closeAllInterfaces();

    // Now open inventory
    inventoryVisible = true;
    createInventoryUI();
}

/**
 * Create inventory UI panel
 */
function createInventoryUI() {
    const scene = game.scene.scenes[0];

    // Create background panel (centered on screen)
    // Width calculated for 6 columns: 6 slots (60px) + 5 spacings (10px) + padding = ~450px, using 650px for comfortable spacing
    const panelWidth = 650;
    const panelHeight = 600;
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;

    // Create background and title first
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xffffff);

    const title = scene.add.text(centerX, centerY - panelHeight / 2 + 20, 'INVENTORY', {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0);

    const closeText = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press I to Close', {
        fontSize: '14px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(301).setOrigin(1, 0);

    inventoryPanel = {
        bg,
        title,
        closeText,
        items: []
    };

    // Container for items
    const inventoryStartY = centerY - panelHeight / 2 + 80;
    const inventoryVisibleHeight = panelHeight - 120;
    const inventoryContainer = scene.add.container(centerX, inventoryStartY);
    inventoryContainer.setScrollFactor(0).setDepth(301);

    // Mask for items
    const inventoryMask = scene.make.graphics();
    inventoryMask.fillStyle(0xffffff);
    inventoryMask.fillRect(centerX - panelWidth / 2, inventoryStartY, panelWidth, inventoryVisibleHeight);
    inventoryMask.setScrollFactor(0);
    const maskGeometry = inventoryMask.createGeometryMask();
    inventoryContainer.setMask(maskGeometry);

    // Scrollbar
    const scrollbar = setupScrollbar({
        scene,
        x: centerX + panelWidth / 2 - 25,
        y: inventoryStartY,
        height: inventoryVisibleHeight,
        depth: 303,
        minScroll: 0,
        initialScroll: 0,
        container: inventoryContainer,
        containerStartY: inventoryStartY,
        containerOffset: 0,
        wheelHitArea: inventoryPanel.bg,
        visibleHeight: inventoryVisibleHeight
    });

    inventoryPanel.container = inventoryContainer;
    inventoryPanel.mask = inventoryMask;
    inventoryPanel.maskGeometry = maskGeometry;
    inventoryPanel.scrollbar = scrollbar;
    inventoryPanel.startY = inventoryStartY;
    inventoryPanel.visibleHeight = inventoryVisibleHeight;

    // Show items
    updateInventoryItems();

}

/**
 * Update inventory items display
 */
function updateInventoryItems() {
    const scene = game.scene.scenes[0];
    if (!inventoryPanel) {
        console.warn('⚠️ updateInventoryItems: inventoryPanel is null');
        return;
    }

    console.log(`📦 updateInventoryItems: Displaying ${playerStats.inventory.length} items`);

    // Always hide tooltip when refreshing inventory items
    hideTooltip(true);

    // Clear container
    if (inventoryPanel.container) {
        inventoryPanel.container.removeAll(true);
    }
    inventoryPanel.items = [];

    const slotSize = 60;
    const slotsPerRow = 6;
    const spacing = 30; // Increased spacing for labels
    const panelWidth = inventoryPanel.bg.width;
    const panelHeight = inventoryPanel.bg.height;

    // Calculate grid start position (relative to container)
    const gridWidth = slotsPerRow * slotSize + (slotsPerRow - 1) * spacing;
    const startX = -gridWidth / 2 + slotSize / 2;
    const startY = 40; // Increased top padding inside container to prevent cut-off



    // Display items
    console.log(`📦 Rendering ${playerStats.inventory.length} items in inventory UI`);
    playerStats.inventory.forEach((item, index) => {
        console.log(`  - Item ${index}: ${item.name} (type: ${item.type})`);
        const row = Math.floor(index / slotsPerRow);
        const col = index % slotsPerRow;
        const x = startX + col * (slotSize + spacing);
        const y = startY + row * (slotSize + spacing);

        // Get item sprite key
        let spriteKey = 'item_weapon';
        if (item.type === 'weapon') {
            // For weapons, use weapon-specific sprite based on weaponType
            const weaponType = item.weaponType || 'Sword';
            const weaponKey = `weapon_${weaponType.toLowerCase()}`;
            // Check if weapon-specific sprite exists, otherwise fallback to item_weapon
            if (scene.textures.exists(weaponKey)) {
                spriteKey = weaponKey;
            } else {
                spriteKey = 'item_weapon'; // Fallback
            }
        } else if (item.type === 'armor') spriteKey = 'item_armor';
        else if (item.type === 'helmet') spriteKey = 'item_helmet';
        else if (item.type === 'ring') spriteKey = 'item_ring';
        else if (item.type === 'amulet') spriteKey = 'item_amulet';
        else if (item.type === 'boots') spriteKey = 'item_boots';
        else if (item.type === 'gloves') spriteKey = 'item_gloves';
        else if (item.type === 'belt') spriteKey = 'item_belt';
        else if (item.type === 'consumable') spriteKey = 'item_consumable';
        else if (item.type === 'gold') spriteKey = 'item_gold';

        // Create item sprite
        const itemSprite = scene.add.sprite(x, y, spriteKey);
        itemSprite.setScrollFactor(0).setDepth(302).setScale(0.8);

        // Add quality border around the sprite
        const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
        const borderWidth = 2;
        const spriteSize = slotSize * 0.8; // Match sprite scale
        const borderRect = scene.add.rectangle(x, y, spriteSize + borderWidth * 2, spriteSize + borderWidth * 2, qualityColor, 0)
            .setStrokeStyle(borderWidth, qualityColor)
            .setScrollFactor(0)
            .setDepth(300.5); // Above inventory panel bg but below sprite

        // Create item name text (small, below sprite)
        const itemText = scene.add.text(x, y + slotSize / 2 + 5, item.name, {
            fontSize: '10px',
            fill: '#ffffff',
            wordWrap: { width: slotSize }
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0);

        // Make items interactive for tooltips
        itemSprite.setInteractive({ useHandCursor: true });

        // Store display item object for cleanup
        const displayItem = {
            sprite: itemSprite,
            text: itemText,
            borderRect: borderRect
        };

        // Store cleanup function on sprite for proper removal
        const onPointerOver = () => {
            // Show new unified tooltip (includes action hints)
            showTooltip(item, x, y, 'inventory');
        };

        const onPointerOut = () => {
            hideTooltip();
        };

        itemSprite.on('pointerover', onPointerOver);
        itemSprite.on('pointerout', onPointerOut);

        // Add all to container
        inventoryPanel.container.add([borderRect, itemSprite, itemText]);

        // Store cleanup handlers
        itemSprite._tooltipHandlers = { onPointerOver, onPointerOut };

        // Click to equip (only for equippable items)
        const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
        if (equippableTypes.includes(item.type)) {
            itemSprite.on('pointerdown', () => {
                equipItemFromInventory(item, index);
                hideTooltip(true); // Hide tooltip immediately after equipping
            });
        }
        // Click to use consumables
        else if (item.type === 'consumable' && item.healAmount) {
            itemSprite.on('pointerdown', () => {
                useConsumable(item, index);
                hideTooltip(true); // Hide tooltip immediately after using
            });
        }

        inventoryPanel.items.push({
            sprite: itemSprite,
            text: itemText,
            borderRect: borderRect,
            item: item
        });
    });

    // Update scrollbar
    const totalRows = Math.ceil(playerStats.inventory.length / slotsPerRow);
    const totalContentHeight = totalRows * (slotSize + spacing) + 20; // 20 for padding
    if (inventoryPanel.scrollbar) {
        inventoryPanel.scrollbar.updateMaxScroll(Math.max(0, totalContentHeight - inventoryPanel.visibleHeight), totalContentHeight);
    }

    // Show empty message if no items
    if (playerStats.inventory.length === 0) {
        const emptyText = scene.add.text(0, 50, 'Inventory is empty\nKill monsters to collect items!', {
            fontSize: '18px',
            fill: '#888888',
            align: 'center',
            fontStyle: 'italic'
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0);
        inventoryPanel.container.add(emptyText);
        inventoryPanel.items.push({ text: emptyText });
    }
}


/**
 * showTooltip - Unified tooltip system for Inventory, Equipment, and Shop
 * @param {Object} item - The item data object
 * @param {number} x - Pointer X coordinate
 * @param {number} y - Pointer Y coordinate
 * @param {string} context - 'inventory', 'equipment', 'shop_buy', or 'shop_sell'
 */
function showTooltip(item, x, y, context = 'inventory') {
    const scene = game.scene.scenes[0];
    if (!item) return;

    // Clear any existing tooltip or hide timer immediately
    if (tooltipHideTimer) {
        scene.time.removeEvent(tooltipHideTimer);
        tooltipHideTimer = null;
    }
    hideTooltip(true); // Force immediate hide of previous

    let tooltipLines = [];

    // 1. Header: Name
    tooltipLines.push(item.name || 'Unknown Item');

    // 2. Sub-header: Quality and Type
    if (item.quality) {
        tooltipLines.push(`Quality: ${item.quality}`);
    }
    if (item.type) {
        const typeStr = item.type.charAt(0).toUpperCase() + item.type.slice(1);
        tooltipLines.push(`Type: ${typeStr}`);
    }

    // 3. Stats
    if (item.attackPower) tooltipLines.push(`Attack: +${item.attackPower}`);
    if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
    if (item.maxHp) tooltipLines.push(`Max HP: +${item.maxHp}`);
    if (item.healAmount) tooltipLines.push(`Heal: ${item.healAmount} HP`);
    if (item.speed) tooltipLines.push(`Speed: +${item.speed}`);
    if (item.critChance) tooltipLines.push(`Crit: +${(item.critChance * 100).toFixed(1)}%`);
    if (item.lifesteal) tooltipLines.push(`Lifesteal: +${(item.lifesteal * 100).toFixed(1)}%`);

    // 4. Set Info
    if (item.set && ITEM_SETS && ITEM_SETS[item.set]) {
        tooltipLines.push('');
        tooltipLines.push(`Set: ${item.set}`);
        const setInfo = ITEM_SETS[item.set];
        if (setInfo && setInfo.pieces) {
            tooltipLines.push(`Pieces: ${setInfo.pieces.join(', ')}`);
        }
    }

    // 5. Context-Specific Actions & Prices
    if (context === 'inventory') {
        const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
        if (equippableTypes.includes(item.type)) {
            tooltipLines.push('');
            tooltipLines.push('Click to Equip');
        } else if (item.type === 'consumable') {
            tooltipLines.push('');
            tooltipLines.push('Click to Use');
        }
    } else if (context === 'equipment') {
        tooltipLines.push('');
        tooltipLines.push('Click to Unequip');
    } else if (context === 'shop_buy') {
        tooltipLines.push('');
        tooltipLines.push(`Price: ${item.price || 0} Gold`);
        tooltipLines.push('Click to Buy');
    } else if (context === 'shop_sell') {
        const sellPrice = item.price ? Math.floor(item.price * 0.5) : (typeof calculateItemSellPrice === 'function' ? calculateItemSellPrice(item) : 0);
        tooltipLines.push('');
        tooltipLines.push(`Value: ${sellPrice} Gold`);
        tooltipLines.push('Click to Sell');
    }

    const tooltipText = tooltipLines.join('\n');
    const qualityColor = (QUALITY_COLORS && QUALITY_COLORS[item.quality]) ? QUALITY_COLORS[item.quality] : 0xffffff;

    // Create text object
    const text = scene.add.text(0, 0, tooltipText, {
        fontSize: '14px',
        fill: '#ffffff',
        padding: { x: 10, y: 10 },
        wordWrap: { width: 220 }
    }).setScrollFactor(0).setDepth(1001).setOrigin(0);


    // Position logic
    const bounds = text.getBounds();
    let tx = x + 20;
    let ty = y + 20;

    // Boundary checks
    if (tx + bounds.width > scene.cameras.main.width) {
        tx = x - bounds.width - 20;
    }
    if (ty + bounds.height > scene.cameras.main.height) {
        ty = y - bounds.height - 20;
    }

    text.setPosition(tx, ty);

    // Optional background rectangle for better visibility with quality border
    const bg = scene.add.rectangle(tx + bounds.width / 2, ty + bounds.height / 2, bounds.width, bounds.height, 0x000000, 0.9)
        .setScrollFactor(0).setDepth(999).setStrokeStyle(2, qualityColor);

    currentTooltip = { text, bg };
}

/**
 * hideTooltip - Hides the active tooltip
 * @param {boolean} immediate - If true, destroys immediately without delay
 */
function hideTooltip(immediate = false) {
    const scene = game.scene.scenes[0];

    const performHide = () => {
        if (currentTooltip) {
            if (currentTooltip.text) currentTooltip.text.destroy();
            if (currentTooltip.bg) currentTooltip.bg.destroy();
            currentTooltip = null;
        }
    };

    if (immediate) {
        performHide();
    } else {
        // Debounce hide slightly to prevent flickering during rapid movement
        if (!tooltipHideTimer && scene && scene.time) {
            tooltipHideTimer = scene.time.delayedCall(50, () => {
                performHide();
                tooltipHideTimer = null;
            });
        }
    }
}

// Also check for any orphaned tooltip text objects in the scene
const scene = game.scene.scenes[0];


/**
 * Unified scrollbar setup utility
 * @param {Object} params Configuration parameters
 * @returns {Object} Scrollbar instance with update methods
 */
function setupScrollbar({
    scene,
    x,
    y,
    width = 12,
    height,
    depth = 1000,
    minScroll = 0,
    initialScroll = 0,
    onScroll, // Callback(newPosition)
    container, // Optional Phaser Container to auto-update .y
    containerStartY, // Required if using container
    containerOffset = 0, // Extra offset for container positioning
    wheelHitArea, // Optional rectangle/object with getBounds() for wheel support
    visibleHeight // Height of the visible area (usually same as scrollbar height)
}) {
    // Create track with origin at top center
    const track = scene.add.rectangle(x, y, width, height, 0x333333, 0.8)
        .setScrollFactor(0).setDepth(depth).setStrokeStyle(1, 0x555555)
        .setInteractive({ useHandCursor: true }).setOrigin(0.5, 0);

    // Thumb height ratio
    let thumbHeight = 40;
    const thumb = scene.add.rectangle(x, y, width - 4, thumbHeight, 0x666666, 1)
        .setScrollFactor(0).setDepth(depth + 1).setStrokeStyle(1, 0x888888)
        .setInteractive({ useHandCursor: true }).setOrigin(0.5, 0);

    let currentScroll = initialScroll;
    let maxScroll = 0;
    let isDragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;

    const setScroll = (newPosition) => {
        // Clamp scroll position between min and max
        currentScroll = Math.max(minScroll, Math.min(maxScroll, newPosition));

        // Update thumb position with precision
        if (maxScroll > minScroll) {
            const scrollRange = maxScroll - minScroll;
            const scrollRatio = (currentScroll - minScroll) / scrollRange;

            // Available movement range for the thumb (leave 2px padding at top and bottom)
            const padding = 2;
            const availableTrackHeight = height - (padding * 2);
            const thumbMoveRange = availableTrackHeight - thumb.height;

            // Map scroll ratio to thumb Y position (relative to track Y + padding)
            if (thumbMoveRange > 0) {
                thumb.y = y + padding + (scrollRatio * thumbMoveRange);
            } else {
                thumb.y = y + padding;
            }
        } else {
            thumb.y = y + 2;
        }

        // Apply scroll logic to container
        if (container && containerStartY !== undefined) {
            container.y = containerStartY - containerOffset - currentScroll;
        }

        if (onScroll) {
            onScroll(currentScroll);
        }
    };


    // Interactions
    const onPointerDown = (pointer) => {
        if (!track.visible) return;

        if (thumb.getBounds().contains(pointer.x, pointer.y)) {
            isDragging = true;
            dragStartY = pointer.y;
            dragStartScroll = currentScroll;
        } else if (track.getBounds().contains(pointer.x, pointer.y)) {
            // Jump to position
            const padding = 2;
            const availableTrackHeight = height - (padding * 2);
            const thumbMoveRange = availableTrackHeight - thumb.height;

            if (thumbMoveRange > 0) {
                // Click position relative to track start (offset by padding and half thumb)
                const clickY = pointer.y - y - padding - (thumb.height / 2);
                const clickRatio = Math.max(0, Math.min(1, clickY / thumbMoveRange));
                const scrollRange = maxScroll - minScroll;
                setScroll(minScroll + clickRatio * scrollRange);
            }
        }
    };

    const onPointerMove = (pointer) => {
        if (isDragging && pointer.isDown) {
            const padding = 2;
            const availableTrackHeight = height - (padding * 2);
            const thumbMoveRange = availableTrackHeight - thumb.height;

            if (thumbMoveRange > 0 && maxScroll > minScroll) {
                const deltaY = pointer.y - dragStartY;
                const scrollChangeRatio = deltaY / thumbMoveRange;
                const scrollRange = maxScroll - minScroll;
                setScroll(dragStartScroll + scrollChangeRatio * scrollRange);
            }
        }
    };


    const onPointerUp = () => { isDragging = false; };

    const onWheel = (pointer, gameObjects, deltaX, deltaY) => {
        if (!track.visible || maxScroll <= minScroll) return;

        const hitArea = wheelHitArea || track;
        const bounds = (hitArea.getBounds ? hitArea.getBounds() : hitArea);

        if (bounds.contains(pointer.x, pointer.y)) {
            setScroll(currentScroll + deltaY * 0.5);
        }
    };

    scene.input.on('pointerdown', onPointerDown);
    scene.input.on('pointermove', onPointerMove);
    scene.input.on('pointerup', onPointerUp);
    scene.input.on('wheel', onWheel);

    const instance = {
        track,
        thumb,
        updateMaxScroll: (newMax, totalContentHeight) => {
            maxScroll = newMax;
            if (totalContentHeight > visibleHeight) {
                const ratio = Math.min(1, visibleHeight / totalContentHeight);
                const padding = 2;
                const usableHeight = height - (padding * 2);

                // Calculate thumb height proportionate to usable track height
                // Ensure min height of 30, but never more than usableHeight
                thumb.height = Math.min(usableHeight, Math.max(30, usableHeight * ratio));

                track.setVisible(true);
                thumb.setVisible(true);
            } else {
                track.setVisible(false);
                thumb.setVisible(false);
            }
            setScroll(currentScroll); // Refresh position
        },

        setScroll,
        getScroll: () => currentScroll,
        destroy: () => {
            scene.input.off('pointerdown', onPointerDown);
            scene.input.off('pointermove', onPointerMove);
            scene.input.off('pointerup', onPointerUp);
            scene.input.off('wheel', onWheel);
            track.destroy();
            thumb.destroy();
        },
        setVisible: (visible) => {
            if (visible && maxScroll > minScroll) {
                track.setVisible(true);
                thumb.setVisible(true);
            } else {
                track.setVisible(false);
                thumb.setVisible(false);
            }
        }
    };

    return instance;
}

/**
 * Destroy inventory UI
 */
function destroyInventoryUI() {
    const scene = game.scene.scenes[0];

    // Always hide tooltip first when closing inventory
    hideTooltip(true);

    if (inventoryPanel) {
        if (inventoryPanel.bg && inventoryPanel.bg.active) inventoryPanel.bg.destroy();
        if (inventoryPanel.title && inventoryPanel.title.active) inventoryPanel.title.destroy();
        if (inventoryPanel.closeText && inventoryPanel.closeText.active) inventoryPanel.closeText.destroy();

        if (inventoryPanel.scrollbar) {
            inventoryPanel.scrollbar.destroy();
        }

        if (inventoryPanel.container) {
            inventoryPanel.container.destroy();
        }

        inventoryPanel.items = [];
        inventoryPanel = null;
    }


    // Final cleanup - ensure tooltip is gone
    hideTooltip(true);
    inventoryVisible = false;
}

/**
 * Update inventory (refresh display)
 */
function updateInventory() {
    // Refresh item display if inventory changed
    if (inventoryPanel) {
        const currentItemCount = inventoryPanel.items.filter(i => i.item).length;
        if (currentItemCount !== playerStats.inventory.length) {
            updateInventoryItems();
        }
    }
}

// Track last inventory count for change detection
let lastInventoryCount = 0;

/**
 * Force inventory refresh (call when items are added/removed)
 */
function refreshInventory() {
    console.log(`🔄 refreshInventory called - inventoryVisible: ${inventoryVisible}, equipmentVisible: ${equipmentVisible}, items: ${playerStats.inventory.length}`);

    // Refresh "I" inventory panel if open
    if (inventoryVisible && inventoryPanel) {
        updateInventoryItems();
    }

    // Refresh "E" equipment panel inventory display if open
    if (equipmentVisible && equipmentPanel) {
        updateEquipmentInventoryItems();
    }

    lastInventoryCount = playerStats.inventory.length;
}

/**
 * Equip item from inventory
 */
function equipItemFromInventory(item, inventoryIndex) {
    // Check if item is equippable
    const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
    if (!equippableTypes.includes(item.type)) {
        showDamageNumber(player.x, player.y - 40, 'Cannot equip this item', 0xff0000);
        return;
    }

    const slot = item.type; // Slot name matches item type

    // If slot already has an item, unequip it first (return to inventory)
    if (playerStats.equipment[slot]) {
        playerStats.inventory.push(playerStats.equipment[slot]);
    }

    // Equip the new item
    playerStats.equipment[slot] = item;

    // Remove from inventory
    playerStats.inventory.splice(inventoryIndex, 1);

    // Update stats
    updatePlayerStats();

    // Refresh UIs
    refreshInventory();
    if (equipmentVisible) {
        refreshEquipment();
    }

    // Show feedback
    showDamageNumber(player.x, player.y - 40, `Equipped ${item.name}`, 0x00ffff);
    console.log(`Equipped ${item.name} in ${slot} slot`);

    // Update weapon sprite if weapon was equipped
    if (slot === 'weapon') {
        updateWeaponSprite();
    }
}

/**
 * Use a consumable item (like health potion)
 */
function useConsumable(item, inventoryIndex) {
    if (item.type !== 'consumable' || !item.healAmount) {
        return;
    }

    // Heal the player
    const healAmount = item.healAmount;
    const oldHp = playerStats.hp;
    playerStats.hp = Math.min(playerStats.hp + healAmount, playerStats.maxHp);
    const actualHeal = playerStats.hp - oldHp;

    // Remove item from inventory
    playerStats.inventory.splice(inventoryIndex, 1);

    // UQE Bridge Event
    if (typeof uqe !== 'undefined') {
        uqe.eventBus.emit(UQE_EVENTS.ITEM_PICKUP, { id: item.type, amount: 1 });
    }

    // Refresh inventory UI
    refreshInventory();

    // Show feedback
    if (actualHeal > 0) {
        showDamageNumber(player.x, player.y - 40, `+${actualHeal} HP`, 0x00ff00, false, 'healing');
    } else {
        showDamageNumber(player.x, player.y - 40, 'HP Full', 0xffff00);
    }

    console.log(`Used ${item.name} - healed ${actualHeal} HP`);
}

/**
 * Unequip item from equipment slot
 */
function unequipItem(slot) {
    if (!playerStats.equipment[slot]) return;

    const item = playerStats.equipment[slot];
    playerStats.equipment[slot] = null;

    // Return to inventory
    playerStats.inventory.push(item);

    // Update stats
    updatePlayerStats();

    // Refresh UIs
    refreshInventory();
    refreshEquipment();

    // Show feedback
    showDamageNumber(player.x, player.y - 40, `Unequipped ${item.name}`, 0xffff00);
    console.log(`Unequipped ${item.name} from ${slot} slot`);

    // Update weapon sprite if weapon was unequipped
    if (slot === 'weapon') {
        updateWeaponSprite();
    }
}

/**
 * Update player stats based on equipped items
 */
function updatePlayerStats() {
    // Reset to base stats
    playerStats.attack = playerStats.baseAttack;
    playerStats.defense = playerStats.baseDefense;
    let maxHpBonus = 0;
    let speedBonus = 0;

    // Reset special properties
    playerStats.critChance = 0;
    playerStats.lifesteal = 0;
    playerStats.elementalDamage = null;
    playerStats.resistances = {};
    playerStats.attackSpeedMultiplier = 1.0;

    // Track set pieces for set bonuses
    const setPieces = {};

    // Add bonuses from all equipment
    Object.values(playerStats.equipment).forEach(item => {
        if (!item) return;

        // Attack bonuses (weapon, ring, gloves)
        if (item.attackPower) {
            playerStats.attack += item.attackPower;
        }

        // Defense bonuses (armor, helmet, ring, amulet, boots, gloves, belt)
        if (item.defense) {
            playerStats.defense += item.defense;
        }

        // Max HP bonus (amulet, belt)
        if (item.maxHp) {
            maxHpBonus += item.maxHp;
        }

        // Speed bonus (boots)
        if (item.speed) {
            speedBonus += item.speed;
        }

        // Weapon speed multiplier
        if (item.type === 'weapon' && item.speed) {
            playerStats.attackSpeedMultiplier = item.speed;
        }

        // Special properties
        if (item.critChance) {
            playerStats.critChance += item.critChance;
        }
        if (item.lifesteal) {
            playerStats.lifesteal += item.lifesteal;
        }
        if (item.elementalDamage) {
            // If multiple elemental damages, use the highest
            if (!playerStats.elementalDamage || item.elementalDamage.amount > playerStats.elementalDamage.amount) {
                playerStats.elementalDamage = { ...item.elementalDamage };
            }
        }
        if (item.resistance) {
            Object.keys(item.resistance).forEach(resType => {
                playerStats.resistances[resType] = (playerStats.resistances[resType] || 0) + item.resistance[resType];
            });
        }

        // Track set pieces
        if (item.set) {
            if (!setPieces[item.set]) {
                setPieces[item.set] = [];
            }
            setPieces[item.set].push(item.type);
        }
    });

    // Apply set bonuses
    Object.keys(setPieces).forEach(setName => {
        const setInfo = ITEM_SETS[setName];
        if (!setInfo) return;

        const equippedPieces = setPieces[setName];
        const pieceCount = equippedPieces.length;

        // Find the highest bonus tier we qualify for
        const bonusTiers = Object.keys(setInfo.bonuses).map(Number).sort((a, b) => b - a);
        for (const tier of bonusTiers) {
            if (pieceCount >= tier) {
                const bonus = setInfo.bonuses[tier];

                // Apply percentage bonuses
                if (bonus.attackBonus) {
                    playerStats.attack = Math.floor(playerStats.attack * (1 + bonus.attackBonus));
                }
                if (bonus.defenseBonus) {
                    playerStats.defense = Math.floor(playerStats.defense * (1 + bonus.defenseBonus));
                }
                if (bonus.hpBonus) {
                    maxHpBonus = Math.floor(maxHpBonus * (1 + bonus.hpBonus));
                }
                if (bonus.critBonus) {
                    playerStats.critChance += bonus.critBonus;
                }
                if (bonus.speedBonus) {
                    speedBonus = Math.floor(speedBonus * (1 + bonus.speedBonus));
                }
                if (bonus.lifesteal) {
                    playerStats.lifesteal += bonus.lifesteal;
                }
                if (bonus.resistance) {
                    Object.keys(bonus.resistance).forEach(resType => {
                        playerStats.resistances[resType] = (playerStats.resistances[resType] || 0) + bonus.resistance[resType];
                    });
                }

                break; // Only apply the highest tier
            }
        }
    });

    // Cap crit chance at 50%
    playerStats.critChance = Math.min(0.5, playerStats.critChance);

    // Apply max HP bonus (increase max HP, but don't reduce current HP if it would go below 1)
    if (maxHpBonus > 0) {
        const oldMaxHp = playerStats.maxHp;
        playerStats.maxHp = 100 + maxHpBonus; // Base 100 + bonuses
        // If HP was at max, keep it at new max
        if (playerStats.hp >= oldMaxHp) {
            playerStats.hp = playerStats.maxHp;
        }
    }

    // Store speed bonus for attack speed calculation
    playerStats.speedBonus = speedBonus;
}

/**
 * Toggle equipment visibility
 */
function toggleEquipment() {
    const scene = game.scene.scenes[0];

    // If already open, close it
    if (equipmentVisible) {
        equipmentVisible = false;
        destroyEquipmentUI();
        return;
    }

    // Close all other interfaces before opening
    closeAllInterfaces();

    // Now open equipment
    equipmentVisible = true;
    createEquipmentUI();
}

/**
 * Create equipment UI panel - split into left (equipment) and right (inventory) panels
 */
function createEquipmentUI() {
    const scene = game.scene.scenes[0];

    // Calculate panel dimensions - each panel is half the game width
    const gameWidth = 1024;
    const gameHeight = 768;
    const panelWidth = gameWidth / 2;
    const panelHeight = gameHeight;
    const leftPanelX = panelWidth / 2;
    const rightPanelX = panelWidth + panelWidth / 2;
    const centerY = gameHeight / 2;

    // Left panel - Equipment
    const leftBg = scene.add.rectangle(leftPanelX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xffffff);

    // Right panel - Inventory
    const rightBg = scene.add.rectangle(rightPanelX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xffffff);

    // Divider line between panels (using graphics for reliability)
    const dividerGraphics = scene.add.graphics();
    dividerGraphics.lineStyle(2, 0xffffff, 0.5);
    dividerGraphics.lineBetween(panelWidth, 0, panelWidth, gameHeight);
    dividerGraphics.setScrollFactor(0).setDepth(301);
    const divider = dividerGraphics;

    // Define scrollable area dimensions first
    const inventoryStartY = 90; // Start below title (reduced for less padding)
    const inventoryEndY = gameHeight - 20; // Leave some space at bottom
    const inventoryVisibleHeight = inventoryEndY - inventoryStartY;

    // Create scrollable container for inventory items
    // Container starts higher to show first items fully when scrollPosition = minScroll
    // Need enough space for first item icon (60px) + text label below (20px) + padding
    // When scrollPosition = minScroll (-20), container is at: inventoryStartY - containerOffset - (-20)
    // = inventoryStartY - containerOffset + 20
    // Container offset: at minScroll, we want items at startY to appear at inventoryStartY
    // Similar calculation to shop - using larger offset for better visibility
    const containerOffset = 70; // Increased to ensure first row is fully visible
    const inventoryContainer = scene.add.container(rightPanelX, inventoryStartY - containerOffset);
    inventoryContainer.setScrollFactor(0).setDepth(301);

    // Create mask for the scrollable area (visible area in right panel)
    // Start mask well above inventoryStartY to prevent clipping of first row
    const maskTopOffset = 40; // Increased further to show entire first row sprites
    const inventoryMask = scene.make.graphics();
    inventoryMask.fillStyle(0xffffff);
    inventoryMask.fillRect(rightPanelX - panelWidth / 2, inventoryStartY - maskTopOffset, panelWidth, inventoryVisibleHeight + maskTopOffset);
    inventoryMask.setScrollFactor(0).setDepth(301);
    const maskGeometry = inventoryMask.createGeometryMask();

    // Scroll state
    const minScroll = -40; // Increased to show items with top padding at correct position

    const scrollbarX = rightPanelX + panelWidth / 2 - 22;
    const scrollbar = setupScrollbar({
        scene,
        x: scrollbarX,
        y: inventoryStartY,
        height: inventoryVisibleHeight,
        depth: 303,
        minScroll: minScroll,
        initialScroll: minScroll,
        container: inventoryContainer,
        containerStartY: inventoryStartY,
        containerOffset: containerOffset,
        wheelHitArea: rightBg,
        visibleHeight: inventoryVisibleHeight
    });

    equipmentPanel = {
        leftBg: leftBg,
        rightBg: rightBg,
        divider: divider,
        leftTitle: scene.add.text(leftPanelX, 30, 'EQUIPMENT', {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0),
        rightTitle: scene.add.text(rightPanelX, 30, 'INVENTORY', {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0),
        closeText: scene.add.text(gameWidth - 20, 20, 'Press E to Close', {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(301).setOrigin(1, 0),
        slots: {},
        inventoryItems: [],
        inventoryContainer: inventoryContainer,
        inventoryMask: inventoryMask,
        maskGeometry: maskGeometry,
        scrollbar: scrollbar,
        inventoryStartY: inventoryStartY,
        inventoryVisibleHeight: inventoryVisibleHeight,
        containerOffset: containerOffset, // Store offset so it's accessible in updateEquipmentInventoryItems
        minScroll: minScroll
    };


    // Show equipment slots in left panel
    updateEquipmentSlots();

    // Show inventory items in right panel
    updateEquipmentInventoryItems();
}

/**
 * Update equipment slots display - positioned in left panel
 */
function updateEquipmentSlots() {
    const scene = game.scene.scenes[0];
    if (!equipmentPanel) return;

    // Clear existing slot displays (including backgrounds)
    Object.values(equipmentPanel.slots).forEach(slot => {
        if (slot.bg) slot.bg.destroy();
        if (slot.sprite) slot.sprite.destroy();
        if (slot.label) slot.label.destroy();
        if (slot.nameText) slot.nameText.destroy();
        if (slot.borderRect) {
            try {
                slot.borderRect.destroy();
            } catch (e) {
                console.warn('Error destroying slot borderRect in update:', e);
            }
        }
    });
    equipmentPanel.slots = {};

    // Position slots in left panel
    const leftPanelX = equipmentPanel.leftBg.x;
    const centerY = equipmentPanel.leftBg.y;
    const slotSize = 80;
    const startY = 150; // Start below title (increased from 120 to 150 for more padding)

    // Equipment slots in a grid layout (2 columns for better fit)
    const slotsPerRow = 2;
    const slotSpacing = 120;
    const rowSpacing = 140;
    const startX = leftPanelX - slotSpacing / 2;

    // Row 1: Helmet, Amulet
    const helmetSlot = createEquipmentSlot('helmet', startX, startY, slotSize);
    equipmentPanel.slots.helmet = helmetSlot;

    const amuletSlot = createEquipmentSlot('amulet', startX + slotSpacing, startY, slotSize);
    equipmentPanel.slots.amulet = amuletSlot;

    // Row 2: Armor, Weapon
    const armorSlot = createEquipmentSlot('armor', startX, startY + rowSpacing, slotSize);
    equipmentPanel.slots.armor = armorSlot;

    const weaponSlot = createEquipmentSlot('weapon', startX + slotSpacing, startY + rowSpacing, slotSize);
    equipmentPanel.slots.weapon = weaponSlot;

    // Row 3: Gloves, Ring
    const glovesSlot = createEquipmentSlot('gloves', startX, startY + rowSpacing * 2, slotSize);
    equipmentPanel.slots.gloves = glovesSlot;

    const ringSlot = createEquipmentSlot('ring', startX + slotSpacing, startY + rowSpacing * 2, slotSize);
    equipmentPanel.slots.ring = ringSlot;

    // Row 4: Belt, Boots
    const beltSlot = createEquipmentSlot('belt', startX, startY + rowSpacing * 3, slotSize);
    equipmentPanel.slots.belt = beltSlot;

    const bootsSlot = createEquipmentSlot('boots', startX + slotSpacing, startY + rowSpacing * 3, slotSize);
    equipmentPanel.slots.boots = bootsSlot;

    // Show current stats with bonuses at bottom of left panel
    const statsY = 680;
    let attackBonus = 0;
    let defenseBonus = 0;
    let maxHpBonus = 0;

    Object.values(playerStats.equipment).forEach(item => {
        if (!item) return;
        if (item.attackPower) attackBonus += item.attackPower;
        if (item.defense) defenseBonus += item.defense;
        if (item.maxHp) maxHpBonus += item.maxHp;
    });

    let statsText = `Attack: ${playerStats.baseAttack}`;
    if (attackBonus > 0) statsText += ` + ${attackBonus}`;
    statsText += ` = ${playerStats.attack}\n`;

    statsText += `Defense: ${playerStats.baseDefense}`;
    if (defenseBonus > 0) statsText += ` + ${defenseBonus}`;
    statsText += ` = ${playerStats.defense}`;

    if (maxHpBonus > 0) {
        statsText += `\nMax HP: 100 + ${maxHpBonus} = ${playerStats.maxHp}`;
    }

    if (equipmentPanel.statsText) {
        equipmentPanel.statsText.destroy();
    }
    equipmentPanel.statsText = scene.add.text(leftPanelX, statsY, statsText, {
        fontSize: '16px',
        fill: '#ffffff',
        align: 'center'
    }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);
}

/**
 * Update inventory items display in right panel - show all inventory items
 */
function updateEquipmentInventoryItems() {
    const scene = game.scene.scenes[0];
    if (!equipmentPanel) {
        console.warn('⚠️ updateEquipmentInventoryItems: equipmentPanel is null');
        return;
    }

    console.log(`📦 updateEquipmentInventoryItems: Displaying ${playerStats.inventory.length} items in equipment panel`);

    // Clear existing inventory item displays
    equipmentPanel.inventoryItems.forEach(item => {
        // Remove event handlers and disable interactivity before destroying
        if (item.bg && item.bg.active) {
            item.bg.removeAllListeners();
            item.bg.disableInteractive();
            item.bg.destroy();
        }
        if (item.sprite && item.sprite.active) {
            item.sprite.removeAllListeners();
            item.sprite.disableInteractive();
            item.sprite.destroy();
        }
        if (item.nameText && item.nameText.active) {
            item.nameText.destroy();
        }
        if (item.text && item.text.active) {
            item.text.destroy();
        }
        if (item.label && item.label.active) {
            item.label.destroy();
        }
        if (item.borderRect) {
            try {
                item.borderRect.destroy();
            } catch (e) {
                console.warn('Error destroying borderRect in update:', e);
            }
        }
    });
    equipmentPanel.inventoryItems = [];

    // Clear container
    if (equipmentPanel.inventoryContainer) {
        equipmentPanel.inventoryContainer.removeAll(true);
    }

    // Define container offset and inventory start Y early (needed for item positioning)
    const containerOffset = (equipmentPanel && typeof equipmentPanel.containerOffset === 'number')
        ? equipmentPanel.containerOffset
        : 80; // Default fallback value
    const inventoryStartY = (equipmentPanel && typeof equipmentPanel.inventoryStartY === 'number')
        ? equipmentPanel.inventoryStartY
        : 100; // Default fallback

    // Show all inventory items (not just equippable ones)
    const inventoryItems = playerStats.inventory;

    if (inventoryItems.length === 0) {
        const rightPanelXValue = equipmentPanel.rightBg ? equipmentPanel.rightBg.x : 768;
        const emptyText = scene.add.text(rightPanelXValue, 200, 'Inventory is empty', {
            fontSize: '16px',
            fill: '#888888',
            fontStyle: 'italic'
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);
        equipmentPanel.inventoryItems.push({ label: emptyText });
        // Hide scrollbar when empty
        if (equipmentPanel.scrollbarTrack) equipmentPanel.scrollbarTrack.setVisible(false);
        if (equipmentPanel.scrollbarThumb) equipmentPanel.scrollbarThumb.setVisible(false);
        return;
    }

    // Display items in a scrollable grid in right panel
    const rightPanelXValue = equipmentPanel.rightBg ? equipmentPanel.rightBg.x : 768;
    const itemSize = 60;
    const spacing = 15;
    const itemsPerRow = 6;
    // Calculate grid width and center it in the right panel
    const gridWidth = itemsPerRow * itemSize + (itemsPerRow - 1) * spacing;
    const startX = -gridWidth / 2 + itemSize / 2; // Relative to container center
    // Items start position: similar to shop, use topPadding to ensure first row is visible
    // At minScroll (-50), container is at: inventoryStartY - containerOffset - minScroll = 90 - 70 - (-50) = 70
    // We want items at startY to appear at or near inventoryStartY (90)
    // So: containerY + startY ≈ inventoryStartY, startY ≈ inventoryStartY - containerY = 90 - 70 = 20
    // But we use topPadding approach like shop for consistency
    const topPadding = 45; // Increased to ensure first row isn't clipped by mask
    const startY = topPadding;


    // Define equippable types once for the function
    const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];

    // Calculate total content height
    const totalRows = Math.ceil(inventoryItems.length / itemsPerRow);
    const rowHeight = itemSize + spacing + 20; // itemSize + spacing + text space
    const totalContentHeight = totalRows * rowHeight;

    console.log(`📦 Equipment panel: Rendering ${inventoryItems.length} items (${totalRows} rows)`);
    console.log(`   Container exists: ${!!equipmentPanel.inventoryContainer}, active: ${equipmentPanel.inventoryContainer?.active}`);

    inventoryItems.forEach((item, index) => {
        console.log(`  - Equipment panel item ${index}: ${item.name} (type: ${item.type})`);
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * (itemSize + spacing);
        const y = startY + row * (itemSize + 40); // Increased spacing for labels (total row height 100)


        // Get item sprite key based on type
        let spriteKey = 'item_weapon';
        if (item.type === 'weapon') {
            // For weapons, use weapon-specific sprite based on weaponType
            const weaponType = item.weaponType || 'Sword';
            const weaponKey = `weapon_${weaponType.toLowerCase()}`;
            // Check if weapon-specific sprite exists, otherwise fallback to item_weapon
            if (scene.textures.exists(weaponKey)) {
                spriteKey = weaponKey;
            } else {
                spriteKey = 'item_weapon'; // Fallback
            }
        } else if (item.type === 'armor') spriteKey = 'item_armor';
        else if (item.type === 'helmet') spriteKey = 'item_helmet';
        else if (item.type === 'ring') spriteKey = 'item_ring';
        else if (item.type === 'amulet') spriteKey = 'item_amulet';
        else if (item.type === 'boots') spriteKey = 'item_boots';
        else if (item.type === 'gloves') spriteKey = 'item_gloves';
        else if (item.type === 'belt') spriteKey = 'item_belt';
        else if (item.type === 'consumable') spriteKey = 'item_consumable';
        else if (item.type === 'gold') spriteKey = 'item_gold';
        else {
            // Use default item sprite for unknown types
            spriteKey = 'item_weapon'; // Fallback
        }

        // Create item sprite with background (add to container)
        // Note: Items in container use relative coordinates, and container has setScrollFactor(0)
        const itemBg = scene.add.rectangle(x, y, itemSize, itemSize, 0x222222, 0.8)
            .setScrollFactor(0).setDepth(300).setStrokeStyle(1, 0x444444);

        const itemSprite = scene.add.sprite(x, y, spriteKey);
        itemSprite.setScrollFactor(0).setDepth(302).setScale(0.8);

        // Add quality border around the sprite
        const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
        const borderWidth = 2;
        const spriteSize = itemSize * 0.8; // Match sprite scale
        const borderRect = scene.add.rectangle(x, y, spriteSize + borderWidth * 2, spriteSize + borderWidth * 2, qualityColor, 0)
            .setStrokeStyle(borderWidth, qualityColor)
            .setScrollFactor(0)
            .setDepth(300.5); // Above itemBg but below sprite

        // Store border for cleanup
        item.borderRect = borderRect;

        // Item name below sprite
        const itemNameText = scene.add.text(x, y + itemSize / 2 + 5, item.name, {
            fontSize: '11px',
            fill: '#ffffff',
            wordWrap: { width: itemSize + 10 }
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0);

        // Add all items to container
        equipmentPanel.inventoryContainer.add([itemBg, itemSprite, borderRect, itemNameText]);

        console.log(`   Added item ${index} to container at relative position (${x}, ${y})`);

        // Make clickable - equip if equippable, otherwise show tooltip
        const isEquippable = equippableTypes.includes(item.type);

        itemSprite.setInteractive({ useHandCursor: true });
        itemBg.setInteractive({ useHandCursor: true });

        // Calculate absolute position for tooltip (container position + item position)
        const getAbsoluteX = () => rightPanelXValue + x;
        const getAbsoluteY = () => equipmentPanel.inventoryContainer.y + y;

        const onHoverIn = (pointer) => {
            if (pointer) pointer.event.stopPropagation();
            showTooltip(item, getAbsoluteX(), getAbsoluteY(), 'inventory');
        };
        const onHoverOut = () => {
            hideTooltip();
        };
        const onClickItem = (pointer) => {
            if (pointer) pointer.event.stopPropagation();
            hideTooltip(true); // Hide tooltip immediately
            if (isEquippable) {
                // Equip the item
                const invIndex = playerStats.inventory.indexOf(item);
                if (invIndex !== -1) {
                    equipItemFromInventory(item, invIndex);
                }
            }
        };

        itemSprite.on('pointerover', onHoverIn);
        itemSprite.on('pointerout', onHoverOut);
        itemSprite.on('pointerdown', onClickItem);
        itemBg.on('pointerover', onHoverIn);
        itemBg.on('pointerout', onHoverOut);
        itemBg.on('pointerdown', onClickItem);

        equipmentPanel.inventoryItems.push({
            bg: itemBg,
            sprite: itemSprite,
            nameText: itemNameText,
            borderRect: borderRect,
            item: item
        });
    });

    // Apply mask to container (only if mask exists)
    if (equipmentPanel.inventoryContainer) {
        if (equipmentPanel.maskGeometry) {
            equipmentPanel.inventoryContainer.setMask(equipmentPanel.maskGeometry);
            console.log(`📦 Mask applied to container`);
        } else {
            console.warn(`⚠️ No maskGeometry found for equipment panel container`);
        }
        // Ensure container is visible
        equipmentPanel.inventoryContainer.setVisible(true);
    }

    // Reset container position to show first items (important: reset before setting scroll)
    // Use the same calculation as when container was created
    // (containerOffset and inventoryStartY are already defined at the top of the function)
    if (equipmentPanel.inventoryContainer) {
        // Reset container to initial position
        // Container should be positioned so that items at y=0 in container are visible
        // When scrollPosition = minScroll, container is at: inventoryStartY - containerOffset - minScroll
        // For items at y=0 to be at world y=inventoryStartY, container should be at: inventoryStartY
        // But we use offset to allow scrolling up. So: container = inventoryStartY - containerOffset when at top
        const rightPanelXValue = equipmentPanel.rightBg ? equipmentPanel.rightBg.x : 768;
        equipmentPanel.inventoryContainer.x = rightPanelXValue;
        // Position container: at minScroll (-40), container is at inventoryStartY - containerOffset - (-40)
        // Container position is managed by setScrollPosition, but we ensure it's initialized correctly
        equipmentPanel.inventoryContainer.y = inventoryStartY - containerOffset;
        console.log(`📦 Equipment panel container positioned at (${equipmentPanel.inventoryContainer.x}, ${equipmentPanel.inventoryContainer.y})`);
        console.log(`   startY: ${inventoryStartY}, offset: ${containerOffset}, rightPanelX: ${rightPanelXValue}`);
        console.log(`   Container children count: ${equipmentPanel.inventoryContainer.list.length}`);
        if (equipmentPanel.inventoryContainer.list.length > 0) {
            const firstChild = equipmentPanel.inventoryContainer.list[0];
            console.log(`   First child position: (${firstChild.x}, ${firstChild.y}), visible: ${firstChild.visible}`);
        }
    }

    // Force container to be visible and active
    if (equipmentPanel.inventoryContainer) {
        equipmentPanel.inventoryContainer.setVisible(true);
        equipmentPanel.inventoryContainer.setActive(true);
        console.log(`📦 Container visibility: visible=${equipmentPanel.inventoryContainer.visible}, active=${equipmentPanel.inventoryContainer.active}`);
    }

    // Update scrollbar visibility and size
    const visibleHeight = equipmentPanel.inventoryVisibleHeight; // Needed for maxScrollValue calculation
    const maxScrollValue = Math.max(0, totalContentHeight - visibleHeight - containerOffset);
    if (equipmentPanel.scrollbar) {
        equipmentPanel.scrollbar.updateMaxScroll(maxScrollValue, totalContentHeight);
        // Reset scroll position to minScroll (top)
        equipmentPanel.scrollbar.setScroll(equipmentPanel.minScroll || 0);
    }
}

/**
 * Create an equipment slot display
 */
function createEquipmentSlot(slotName, x, y, size) {
    const scene = game.scene.scenes[0];
    const item = playerStats.equipment[slotName];

    // Slot background
    const slotBg = scene.add.rectangle(x, y, size, size, 0x333333, 0.8)
        .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x666666);

    // Make slotBg interactive FIRST (before adding sprite/nameText on top)
    slotBg.setInteractive({ useHandCursor: true });

    // Slot label (positioned above slot with more spacing)
    const label = scene.add.text(x, y - size / 2 - 25, slotName.toUpperCase(), {
        fontSize: '14px',
        fill: '#aaaaaa',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

    let sprite = null;
    let nameText = null;
    let borderRect = null;

    // If item is equipped, show it
    if (item) {
        // Get item sprite key based on type
        let spriteKey = 'item_weapon';
        if (item.type === 'weapon') {
            // For weapons, use weapon-specific sprite based on weaponType
            const weaponType = item.weaponType || 'Sword';
            const weaponKey = `weapon_${weaponType.toLowerCase()}`;
            console.log(`🔍 Equipment screen - Weapon: ${item.name}, weaponType: ${weaponType}, weaponKey: ${weaponKey}`);
            console.log(`   Full item object:`, JSON.stringify(item, null, 2));
            // Check if weapon-specific sprite exists, otherwise fallback to item_weapon
            const textureExists = scene.textures.exists(weaponKey);
            console.log(`   Texture ${weaponKey} exists: ${textureExists}`);
            if (textureExists) {
                spriteKey = weaponKey;
                console.log(`✅ Using weapon sprite: ${weaponKey}`);
            } else {
                console.log(`⚠️ Weapon sprite ${weaponKey} not found, using fallback item_weapon`);
                spriteKey = 'item_weapon'; // Fallback
            }
        } else if (item.type === 'armor') spriteKey = 'item_armor';
        else if (item.type === 'helmet') spriteKey = 'item_helmet';
        else if (item.type === 'ring') spriteKey = 'item_ring';
        else if (item.type === 'amulet') spriteKey = 'item_amulet';
        else if (item.type === 'boots') spriteKey = 'item_boots';
        else if (item.type === 'gloves') spriteKey = 'item_gloves';
        else if (item.type === 'belt') spriteKey = 'item_belt';

        // Create item sprite (non-interactive - slotBg handles all interactions)
        sprite = scene.add.sprite(x, y, spriteKey);
        sprite.setScrollFactor(0).setDepth(302).setScale(0.9);

        // Add quality border around the sprite (don't tint - preserve original colors)
        const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
        const borderWidth = 3;
        const spriteSize = size * 0.9; // Match sprite scale
        borderRect = scene.add.rectangle(x, y, spriteSize + borderWidth * 2, spriteSize + borderWidth * 2, qualityColor, 0)
            .setStrokeStyle(borderWidth, qualityColor)
            .setScrollFactor(0)
            .setDepth(301.5); // Above slotBg (301) but below sprite (302)

        // Item name (positioned below slot, but not too far to avoid overlap with next row)
        nameText = scene.add.text(x, y + size / 2 + 3, item.name, {
            fontSize: '10px',
            fill: '#ffffff',
            wordWrap: { width: size + 20 }
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0);

        // Make slotBg interactive and add event handlers
        slotBg.setInteractive({ useHandCursor: true });

        // Add tooltip handlers for equipped items
        const onPointerOver = () => {
            showTooltip(item, x, y, 'equipment');
        };

        const onPointerOut = () => {
            hideTooltip();
        };

        slotBg.on('pointerover', onPointerOver);
        slotBg.on('pointerout', onPointerOut);
        slotBg.on('pointerdown', () => {
            unequipItem(slotName);
            hideTooltip(true);
        });
    } else {
        // Empty slot - show placeholder with tooltip on hover
        nameText = scene.add.text(x, y, 'Empty', {
            fontSize: '12px',
            fill: '#666666',
            fontStyle: 'italic'
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

        // Make empty slot interactive to show tooltip
        slotBg.setInteractive({ useHandCursor: true });
        // Tooltip functionality removed
    }

    return {
        bg: slotBg,
        label: label,
        sprite: sprite,
        nameText: nameText,
        borderRect: borderRect || null // Store border for cleanup
    };
}




/**
 * Update equipment (refresh display)
 */
function updateEquipment() {
    // Equipment UI updates when items change
    // This is handled by refreshEquipment()
}

/**
 * Force equipment refresh (call when items are equipped/unequipped)
 */
function refreshEquipment() {
    if (equipmentVisible && equipmentPanel) {
        // Remove old stats text
        if (equipmentPanel.statsText) {
            equipmentPanel.statsText.destroy();
        }
        updateEquipmentSlots();
        updateEquipmentInventoryItems(); // Refresh available items too
    }
}

/**
 * Destroy equipment UI
 */
function destroyEquipmentUI() {
    const scene = game.scene.scenes[0];

    // Always hide tooltip first when closing
    hideTooltip(true);

    if (equipmentPanel) {
        // Destroy panel backgrounds
        if (equipmentPanel.leftBg && equipmentPanel.leftBg.active) {
            equipmentPanel.leftBg.destroy();
        }
        if (equipmentPanel.rightBg && equipmentPanel.rightBg.active) {
            equipmentPanel.rightBg.destroy();
        }
        if (equipmentPanel.divider && equipmentPanel.divider.active) {
            equipmentPanel.divider.destroy();
        }

        // Destroy scrollbar
        if (equipmentPanel.scrollbar) {
            equipmentPanel.scrollbar.destroy();
        }

        // Destroy titles and text
        if (equipmentPanel.leftTitle && equipmentPanel.leftTitle.active) {
            equipmentPanel.leftTitle.destroy();
        }
        if (equipmentPanel.rightTitle && equipmentPanel.rightTitle.active) {
            equipmentPanel.rightTitle.destroy();
        }
        if (equipmentPanel.closeText && equipmentPanel.closeText.active) {
            equipmentPanel.closeText.destroy();
        }
        if (equipmentPanel.statsText && equipmentPanel.statsText.active) {
            equipmentPanel.statsText.destroy();
        }

        // Destroy all slot elements including backgrounds
        Object.values(equipmentPanel.slots).forEach(slot => {
            if (slot.bg && slot.bg.active) {
                slot.bg.removeAllListeners();
                slot.bg.disableInteractive();
                slot.bg.destroy();
            }
            if (slot.sprite && slot.sprite.active) {
                slot.sprite.destroy();
            }
            if (slot.label && slot.label.active) {
                slot.label.destroy();
            }
            if (slot.nameText && slot.nameText.active) {
                slot.nameText.destroy();
            }
            if (slot.borderRect) {
                try {
                    slot.borderRect.destroy();
                } catch (e) {
                    console.warn('Error destroying slot borderRect:', e);
                }
            }
        });

        // Destroy inventory item displays (including label)
        equipmentPanel.inventoryItems.forEach(item => {
            // Remove event handlers and disable interactivity before destroying
            if (item.bg && item.bg.active !== false) {
                item.bg.removeAllListeners();
                item.bg.disableInteractive();
                item.bg.destroy();
            }
            if (item.sprite && item.sprite.active !== false) {
                item.sprite.removeAllListeners();
                item.sprite.disableInteractive();
                item.sprite.destroy();
            }
            if (item.nameText && item.nameText.active !== false) {
                item.nameText.destroy();
            }
            if (item.text && item.text.active !== false) {
                item.text.destroy();
            }
            if (item.label && item.label.active !== false) {
                item.label.destroy();
            }
            if (item.borderRect) {
                try {
                    item.borderRect.destroy();
                } catch (e) {
                    console.warn('Error destroying item borderRect:', e);
                }
            }
        });

        // Slot borders are already destroyed in the loop above, but this is a safety check
        Object.values(equipmentPanel.slots).forEach(slot => {
            if (slot.borderRect) {
                try {
                    slot.borderRect.destroy();
                } catch (e) {
                    console.warn('Error destroying slot borderRect in safety check:', e);
                }
            }
        });

        // Remove scroll event handlers
        if (equipmentPanel.scrollHandlers) {
            scene.input.off('pointerdown', equipmentPanel.scrollHandlers.pointerDown);
            scene.input.off('pointermove', equipmentPanel.scrollHandlers.pointerMove);
            scene.input.off('pointerup', equipmentPanel.scrollHandlers.pointerUp);
            scene.input.off('wheel', equipmentPanel.scrollHandlers.wheel);
        }

        // Destroy scrollable container and mask
        if (equipmentPanel.inventoryContainer && equipmentPanel.inventoryContainer.active) {
            equipmentPanel.inventoryContainer.destroy();
        }
        if (equipmentPanel.inventoryMask && equipmentPanel.inventoryMask.active) {
            equipmentPanel.inventoryMask.destroy();
        }

        // Destroy scrollbar
        if (equipmentPanel.scrollbarTrack && equipmentPanel.scrollbarTrack.active) {
            equipmentPanel.scrollbarTrack.destroy();
        }
        if (equipmentPanel.scrollbarThumb && equipmentPanel.scrollbarThumb.active) {
            equipmentPanel.scrollbarThumb.destroy();
        }

        equipmentPanel.slots = {};
        equipmentPanel.inventoryItems = [];
        equipmentPanel = null;
    }

    // Hide any visible tooltips
    hideTooltip(true);
}

// ============================================
// QUEST SYSTEM
// ============================================

/**
 * Initialize starting quests
 */
function initializeQuests() {
    if (!questManager) return;

    // Get starter and available quests from QuestManager
    const starterQuests = questManager.getStarterQuests();
    const availablePool = questManager.getAvailableQuests();

    // No longer automatically assigning side/starter quests to playerStats.quests.active.
    // They remain in the pool until picked up from an NPC.

    // Ensure available list contains starter quests that haven't been completed/started
    playerStats.quests.available = [...starterQuests, ...availablePool].filter(q =>
        !playerStats.quests.completed.includes(q.id) &&
        !playerStats.quests.active.some(active => active.id === q.id)
    );

    // Initial main quest setup (if none active/completed)
    const allMainQuests = questManager.getMainQuests();
    if (allMainQuests.length > 0) {
        const hasMainStarted = (playerStats.quests.main.length > 0) ||
            (playerStats.quests.completed && playerStats.quests.completed.some(id => id.startsWith('main_')));

        if (!hasMainStarted) {
            // Keep the very first main quest active by default for player guidance
            // BUT SKIP IF MIGRATED TO UQE
            const firstMain = allMainQuests[0];
            const isMigrated = typeof uqe !== 'undefined' && uqe.allDefinitions[firstMain.id];

            if (!isMigrated) {
                firstMain.startValue = questManager.getStatValue(firstMain.type, playerStats);
                playerStats.quests.main.push(firstMain);
                console.log(`✅ Started primary main quest: ${firstMain.title}`);
            } else {
                console.log(`ℹ️ [UQE Bridge] Skipping legacy auto-start for migrated quest: ${firstMain.id}`);
            }
        }
    }

    console.log(`✅ Quests initialized: 0 initial side, ${playerStats.quests.available.length} available, ${playerStats.quests.main.length} main`);
}

/**
 * Check quest progress and complete quests
 */
function checkQuestProgress() {
    // Check main quests
    for (let i = playerStats.quests.main.length - 1; i >= 0; i--) {
        const quest = playerStats.quests.main[i];
        const index = i;
        // Update progress using QuestManager
        if (questManager) {
            quest.progress = questManager.calculateProgress(quest, playerStats);
        }

        // Cap progress at target
        if (quest.progress > quest.target) {
            quest.progress = quest.target;
        }

        // Check if quest is complete
        if (quest.progress >= quest.target && !quest.completed) {
            completeQuest(quest, index);
        }
    }

    // Check side quests
    for (let i = playerStats.quests.active.length - 1; i >= 0; i--) {
        const quest = playerStats.quests.active[i];
        const index = i;
        // Update progress using QuestManager
        if (questManager) {
            quest.progress = questManager.calculateProgress(quest, playerStats);
        }

        // Cap progress at target
        if (quest.progress > quest.target) {
            quest.progress = quest.target;
        }

        // Check if quest is complete
        if (quest.progress >= quest.target && !quest.completed) {
            completeQuest(quest, index);
        }
    }
}

/**
 * Advance a quest manually (used for story quests via dialog)
 */
function advanceQuest(questId) {
    if (!playerStats.questStats.storyProgress) {
        playerStats.questStats.storyProgress = {};
    }

    playerStats.questStats.storyProgress[questId] = true;
    checkQuestProgress();
}

/**
 * Move all available side quests to active list
 */
function acceptAllAvailableQuests() {
    if (!playerStats.quests.available || playerStats.quests.available.length === 0) return;

    playerStats.quests.available.forEach(quest => {
        quest.startValue = questManager.getStatValue(quest.type, playerStats);
        playerStats.quests.active.push(quest);
        console.log(`Quest accepted: ${quest.title}`);
    });

    playerStats.quests.available = [];

    // Show notification
    showDamageNumber(player.x, player.y - 60, `Accepted ${playerStats.quests.active.length} Quests`, 0x00ff00);

    // Refresh log if visible
    if (questVisible) {
        refreshQuestLog();
    }
}

/**
 * Explicitly accept a main quest from dialogue
 */
function acceptMainQuest(questId) {
    if (questManager) {
        const quest = questManager.getQuest(questId);
        if (quest) {
            // Check if already active or completed
            const isActive = playerStats.quests.main.some(q => q.id === questId);
            const isCompleted = playerStats.quests.completed.includes(questId);

            if (!isActive && !isCompleted) {
                console.log(`✅ acceptMainQuest: Adding ${questId} to main list`);
                console.log(`   Current main quests before:`, playerStats.quests.main.map(q => q.id));
                quest.startValue = questManager.getStatValue(quest.type, playerStats);
                playerStats.quests.main.push(quest);
                console.log(`   Current main quests after:`, playerStats.quests.main.map(q => q.id));
                console.log(`Main quest accepted: ${quest.title}`);
                showNewQuestModal(quest);

                // Refresh log if visible
                if (questVisible) {
                    refreshQuestLog();
                }

                // UI will refresh indicators in the next update loop
                return true;
            }
        }
    }
    return false;
}

/**
 * Explicitly accept a side quest (non-main) from dialogue
 */
function acceptSideQuest(questId) {
    if (questManager) {
        // Find quest in AVAILABLE list
        const questIdx = playerStats.quests.available.findIndex(q => q.id === questId);
        if (questIdx !== -1) {
            const quest = playerStats.quests.available[questIdx];

            // Move from available to active
            playerStats.quests.available.splice(questIdx, 1);
            quest.startValue = questManager.getStatValue(quest.type, playerStats);
            playerStats.quests.active.push(quest);

            console.log(`Side quest accepted: ${quest.title}`);
            showNewQuestModal(quest);

            // Refresh log if visible
            if (questVisible) {
                refreshQuestLog();
            }
            return true;
        }
    }
    return false;
}

/**
 * Complete a quest and give rewards
 */
function completeQuest(quest, index) {
    quest.completed = true;

    // Give rewards
    if (quest.rewards.xp) {
        playerStats.xp += quest.rewards.xp;
        showDamageNumber(player.x, player.y - 40, `Quest Complete! +${quest.rewards.xp} XP`, 0x00ffff);
    }
    if (quest.rewards.gold) {
        playerStats.gold += quest.rewards.gold;
    }

    // Handle quest chains
    if (quest.chainId && quest.chainStep) {
        if (!playerStats.questChains[quest.chainId]) {
            playerStats.questChains[quest.chainId] = { currentStep: 0 };
        }
        playerStats.questChains[quest.chainId].currentStep = quest.chainStep;

        // Check if next chain quest should be added
        const nextQuest = getNextChainQuest(quest.chainId, quest.chainStep);
        if (nextQuest) {
            nextQuest.startValue = questManager.getStatValue(nextQuest.type, playerStats);
            playerStats.quests.active.push(nextQuest);
            console.log(`New chain quest unlocked: ${nextQuest.title}`);
            // Store to show after completed modal closes
            pendingNewQuest = nextQuest;
        }
    }

    // Move to completed (store full quest object, not just ID)
    if (!playerStats.quests.completedQuests) {
        playerStats.quests.completedQuests = [];
    }
    playerStats.quests.completedQuests.push(quest);
    playerStats.quests.completed.push(quest.id);

    // Remove from appropriate list
    const isMain = quest.id.startsWith('main_');
    if (isMain) {
        playerStats.quests.main.splice(index, 1);

        // We no longer automatically push the next main quest.
        // The player must pick it up from an NPC.
        // However, we can still log that it's "unlocked" for debugging.
        const allMainQuests = questManager ? questManager.getMainQuests() : [];
        const nextStep = (quest.step || 0) + 1;
        const nextMain = allMainQuests.find(q => q.chapter === quest.chapter && q.step === nextStep);
        if (nextMain) {
            console.log(`Next main quest available to pick up: ${nextMain.title}`);
        }
    } else {
        playerStats.quests.active.splice(index, 1);
    }

    // Check level up after XP reward
    checkLevelUp();

    // Show quest completed modal (or queue if in combat)
    if (isInCombat()) {
        pendingCompletedQuest = quest;
    } else {
        showQuestCompletedModal(quest);
    }

    // Refresh quest log if visible
    if (questVisible) {
        refreshQuestLog();
    }

    console.log(`✅ Quest completed: ${quest.title}`);
    playSound('level_up');
}

/**
 * Get next quest in a chain
 */
function getNextChainQuest(chainId, currentStep) {
    if (questManager) {
        return questManager.getNextInChain(chainId, currentStep);
    }
    return null;
}


/**
 * Check if player is in combat (has nearby monsters)
 */
function isInCombat() {
    if (!monsters || monsters.length === 0) {
        return false;
    }

    const combatRange = 150; // Distance to consider "in combat" (larger than attack range)

    for (const monster of monsters) {
        if (!monster || !monster.active) continue;

        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            monster.x, monster.y
        );

        if (distance <= combatRange) {
            return true;
        }
    }

    return false;
}

/**
 * Toggle quest log visibility
 */
function toggleQuestLog() {
    // Don't allow opening quest log during combat
    if (isInCombat()) {
        return;
    }

    const scene = game.scene.scenes[0];

    // If already open, close it
    if (questVisible) {
        questVisible = false;
        destroyQuestLogUI();
        return;
    }

    // Close all other interfaces before opening
    closeAllInterfaces();

    // Now open quest log
    questVisible = true;
    createQuestLogUI();
}

/**
 * Create quest log UI panel
 */
function createQuestLogUI() {
    const scene = game.scene.scenes[0];

    // Create background panel (centered on screen)
    const panelWidth = 900;
    const panelHeight = 600;
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;

    // Background
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xffffff);

    // Title
    const title = scene.add.text(centerX, centerY - panelHeight / 2 + 15, 'QUEST LOG', {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0);

    // Close text
    const closeText = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press Q to Close', {
        fontSize: '14px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(301).setOrigin(1, 0);

    // Tab buttons (four tabs: Main, Current, Available, Completed)
    const tabY = centerY - panelHeight / 2 + 60;
    const tabWidth = 110;
    const tabSpacing = 5;
    const totalTabWidth = (tabWidth * 4) + (tabSpacing * 3);
    const tabStartX = centerX - totalTabWidth / 2 + tabWidth / 2;

    // Reset default tab to 'main'
    questLogTab = 'main';

    const mainTabBtn = scene.add.rectangle(tabStartX, tabY, tabWidth, 35, 0x333333, 0.9)
        .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });

    const mainTabText = scene.add.text(tabStartX, tabY, 'Story', {
        fontSize: '16px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

    const currentTabBtn = scene.add.rectangle(tabStartX + tabWidth + tabSpacing, tabY, tabWidth, 35, 0x333333, 0.9)
        .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });

    const currentTabText = scene.add.text(tabStartX + tabWidth + tabSpacing, tabY, 'Active', {
        fontSize: '16px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

    const availableTabBtn = scene.add.rectangle(tabStartX + (tabWidth + tabSpacing) * 2, tabY, tabWidth, 35, 0x333333, 0.9)
        .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });

    const availableTabText = scene.add.text(tabStartX + (tabWidth + tabSpacing) * 2, tabY, 'Available', {
        fontSize: '16px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

    const completedTabBtn = scene.add.rectangle(tabStartX + (tabWidth + tabSpacing) * 3, tabY, tabWidth, 35, 0x333333, 0.9)
        .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });

    const completedTabText = scene.add.text(tabStartX + (tabWidth + tabSpacing) * 3, tabY, 'Completed', {
        fontSize: '16px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

    // Tab click handlers
    const switchToMain = () => {
        questLogTab = 'main';
        selectedQuestIndex = 0;
        updateTabButtons();
        updateQuestLogItems();
    };

    const switchToCurrent = () => {
        questLogTab = 'current';
        selectedQuestIndex = 0; // Reset selection
        updateTabButtons();
        updateQuestLogItems();
    };

    const switchToAvailable = () => {
        questLogTab = 'available';
        selectedQuestIndex = 0; // Reset selection

        // Trigger for UI tutorial quest
        playerStats.questStats.availableTabClicked = (playerStats.questStats.availableTabClicked || 0) + 1;
        checkQuestProgress(); // Check if "Exploring Options" is complete

        updateTabButtons();
        updateQuestLogItems();
    };

    const switchToCompleted = () => {
        questLogTab = 'completed';
        selectedQuestIndex = 0; // Reset selection
        updateTabButtons();
        updateQuestLogItems();
    };

    const updateTabButtons = () => {
        // Reset all tabs to inactive style
        mainTabBtn.setStrokeStyle(2, 0x666666);
        mainTabText.setStyle({ fill: '#aaaaaa', fontStyle: 'normal' });
        currentTabBtn.setStrokeStyle(2, 0x666666);
        currentTabText.setStyle({ fill: '#aaaaaa', fontStyle: 'normal' });
        availableTabBtn.setStrokeStyle(2, 0x666666);
        availableTabText.setStyle({ fill: '#aaaaaa', fontStyle: 'normal' });
        completedTabBtn.setStrokeStyle(2, 0x666666);
        completedTabText.setStyle({ fill: '#aaaaaa', fontStyle: 'normal' });

        // Set active tab style
        if (questLogTab === 'main') {
            mainTabBtn.setStrokeStyle(2, 0xffffff);
            mainTabText.setStyle({ fill: '#ffffff', fontStyle: 'bold' });
        } else if (questLogTab === 'current') {
            currentTabBtn.setStrokeStyle(2, 0xffffff);
            currentTabText.setStyle({ fill: '#ffffff', fontStyle: 'bold' });
        } else if (questLogTab === 'available') {
            availableTabBtn.setStrokeStyle(2, 0xffffff);
            availableTabText.setStyle({ fill: '#ffffff', fontStyle: 'bold' });
        } else if (questLogTab === 'completed') {
            completedTabBtn.setStrokeStyle(2, 0xffffff);
            completedTabText.setStyle({ fill: '#ffffff', fontStyle: 'bold' });
        }
    };

    mainTabBtn.on('pointerdown', switchToMain);
    mainTabText.setInteractive({ useHandCursor: true });
    mainTabText.on('pointerdown', switchToMain);

    currentTabBtn.on('pointerdown', switchToCurrent);
    currentTabText.setInteractive({ useHandCursor: true });
    currentTabText.on('pointerdown', switchToCurrent);

    availableTabBtn.on('pointerdown', switchToAvailable);
    availableTabText.setInteractive({ useHandCursor: true });
    availableTabText.on('pointerdown', switchToAvailable);

    completedTabBtn.on('pointerdown', switchToCompleted);
    completedTabText.setInteractive({ useHandCursor: true });
    completedTabText.on('pointerdown', switchToCompleted);

    // Container for quest list (to allow scrolling)
    const listStartX = centerX - panelWidth / 2 + 20;
    const listStartY = centerY - panelHeight / 2 + 100;
    const listWidth = 310;
    const listHeight = panelHeight - 200;

    const listContainer = scene.add.container(listStartX, listStartY);
    listContainer.setScrollFactor(0).setDepth(301);

    // Mask for quest list
    const listMask = scene.add.graphics();
    listMask.fillStyle(0xffffff);
    listMask.fillRect(listStartX, listStartY, listWidth, listHeight);
    listMask.setScrollFactor(0).setDepth(299).setVisible(false); // Add to display list but keep invisible
    const maskGeometry = listMask.createGeometryMask();
    listContainer.setMask(maskGeometry);

    // Scrollbar using unified utility
    const scrollbar = setupScrollbar({
        scene,
        x: listStartX + listWidth + 10,
        y: listStartY,
        height: listHeight,
        depth: 303,
        minScroll: 0,
        initialScroll: 0,
        container: listContainer,
        containerStartY: listStartY,
        containerOffset: 0,
        wheelHitArea: bg, // Scroll when over the panel
        visibleHeight: listHeight,
        // Re-render quest list items on scroll so visible items update
        onScroll: (newPosition) => {
            updateQuestLogItems();
        }
    });

    // Divider between list and details (starts below tabs)
    const dividerX = centerX - panelWidth / 2 + 350;
    const dividerTopY = centerY - panelHeight / 2 + 100; // Below tab bar (was 90)
    const dividerBottomPadding = 40;
    const dividerHeight = panelHeight - 140; // Height of content area
    const divider = scene.add.rectangle(dividerX, dividerTopY + dividerHeight / 2, 2, dividerHeight, 0x666666, 1)
        .setScrollFactor(0).setDepth(301);

    questPanel = {
        bg: bg,
        title: title,
        closeText: closeText,
        mainTabBtn: mainTabBtn,
        mainTabText: mainTabText,
        currentTabBtn: currentTabBtn,
        currentTabText: currentTabText,
        availableTabBtn: availableTabBtn,
        availableTabText: availableTabText,
        completedTabBtn: completedTabBtn,
        completedTabText: completedTabText,
        divider: divider,
        container: listContainer,
        mask: listMask,
        maskGeometry: maskGeometry,
        scrollbar: scrollbar,
        scrollY: 0,
        listStartX: listStartX,
        listStartY: listStartY,
        listWidth: listWidth,
        listHeight: listHeight,
        updateTabButtons: updateTabButtons,
        questListElements: [],
        questDetailElements: []
    };

    // Initialize tab buttons
    updateTabButtons();

    // Show quests
    updateQuestLogItems();
}

/**
 * Update quest log items display
 */
/**
 * Update quest log items display
 */
let isUpdatingQuestLog = false; // Recursion guard
function updateQuestLogItems() {
    if (isUpdatingQuestLog) return; // Prevent recursive calls
    isUpdatingQuestLog = true;

    const scene = game.scene.scenes[0];
    if (!questPanel) {
        isUpdatingQuestLog = false;
        return;
    }

    // Clear existing quest displays
    if (questPanel.container) {
        questPanel.container.removeAll(true);
    }
    questPanel.questListElements = [];

    questPanel.questDetailElements.forEach(element => {
        if (element) element.destroy();
    });
    questPanel.questDetailElements = [];

    const centerX = questPanel.bg.x;
    const centerY = questPanel.bg.y;
    const panelWidth = questPanel.bg.width;
    const panelHeight = questPanel.bg.height;

    // List dimensions (from questPanel)
    const listWidth = questPanel.listWidth;
    const listHeight = questPanel.listHeight;
    const listStartX = questPanel.listStartX;
    const listStartY = questPanel.listStartY;
    const dividerX = centerX - panelWidth / 2 + 350;

    // Right panel: Quest details
    const detailStartX = dividerX + 20;
    const detailStartY = listStartY;
    const detailWidth = panelWidth - (detailStartX - (centerX - panelWidth / 2)) - 20;

    // Get quests based on current tab
    let quests = [];
    if (questLogTab === 'main') {
        // Story quests: UQE quests that have a 'step' field (main story progression)
        const storyQuests = [];
        if (typeof uqe !== 'undefined' && uqe.activeQuests) {
            uqe.activeQuests.forEach(q => {
                const def = uqe.allDefinitions[q.id];
                if (def && def.step) { // Has step = story quest
                    const totalProgress = q.objectives.reduce((sum, obj) => sum + obj.progress, 0);
                    const totalTarget = q.objectives.reduce((sum, obj) => sum + obj.target, 0);
                    storyQuests.push({
                        id: q.id,
                        title: q.title,
                        description: q.description,
                        progress: totalProgress,
                        target: totalTarget,
                        completed: q.completed,
                        rewards: q.rewards || {},
                        objectives: q.objectives
                    });
                }
            });
        }
        quests = storyQuests;
        console.log(`📋 Rendering Story tab: found ${quests.length} story quests from UQE`);
    } else if (questLogTab === 'current') {
        // Active tab: ALL active UQE quests
        const activeQuests = [];
        if (typeof uqe !== 'undefined' && uqe.activeQuests) {
            uqe.activeQuests.forEach(q => {
                const totalProgress = q.objectives.reduce((sum, obj) => sum + obj.progress, 0);
                const totalTarget = q.objectives.reduce((sum, obj) => sum + obj.target, 0);
                activeQuests.push({
                    id: q.id,
                    title: q.title,
                    description: q.description,
                    progress: totalProgress,
                    target: totalTarget,
                    completed: q.completed,
                    rewards: q.rewards || {},
                    objectives: q.objectives
                });
            });
        }
        quests = activeQuests;
        console.log(`📋 Rendering Active tab: found ${quests.length} quests from UQE`);
    } else if (questLogTab === 'available') {
        // Get available quests from UQE (not active, not completed, prereqs met)
        const availableQuests = [];
        if (typeof uqe !== 'undefined' && uqe.allDefinitions) {
            const uqeCompletedIds = uqe.completedQuests.map(q => q.id);
            const uqeActiveIds = uqe.activeQuests.map(q => q.id);

            console.log(`🔍 [Available Debug] Total definitions: ${Object.keys(uqe.allDefinitions).length}`);
            console.log(`🔍 [Available Debug] Active IDs: [${uqeActiveIds.join(', ')}]`);
            console.log(`🔍 [Available Debug] Completed IDs: [${uqeCompletedIds.join(', ')}]`);

            Object.values(uqe.allDefinitions).forEach(questDef => {
                const isActive = uqeActiveIds.includes(questDef.id);
                const isCompleted = uqeCompletedIds.includes(questDef.id);

                // Check prerequisites
                let prereqMet = true;
                if (questDef.requires) {
                    prereqMet = uqeCompletedIds.includes(questDef.requires);
                }

                console.log(`🔍 [Available Debug] Quest ${questDef.id}: active=${isActive}, completed=${isCompleted}, prereqMet=${prereqMet}, requires=${questDef.requires || 'none'}`);

                // Show if not active, not completed, and prereqs met
                if (!isActive && !isCompleted && prereqMet) {
                    // Calculate total target from objectives
                    const totalTarget = questDef.objectives.reduce((sum, obj) => sum + (obj.target || 1), 0);
                    availableQuests.push({
                        id: questDef.id,
                        title: questDef.title,
                        description: questDef.description,
                        giver: questDef.giver,
                        objectives: questDef.objectives,
                        rewards: questDef.rewards || {},
                        isUQE: true,
                        progress: 0, // Not started yet
                        target: totalTarget
                    });
                }
            });
        } else {
            console.log(`⚠️ [Available Debug] UQE not available or no allDefinitions`);
        }
        quests = availableQuests;
        console.log(`📋 Rendering Available tab: found ${quests.length} quests from UQE`);
    } else {
        // Get completed quests from UQE
        const completedQuests = [];
        if (typeof uqe !== 'undefined' && uqe.completedQuests) {
            uqe.completedQuests.forEach(q => {
                const totalTarget = q.objectives.reduce((sum, obj) => sum + obj.target, 0);
                completedQuests.push({
                    id: q.id,
                    title: q.title,
                    description: q.description,
                    completed: true,
                    progress: totalTarget, // Completed = full progress
                    target: totalTarget,
                    rewards: q.rewards || {},
                    objectives: q.objectives
                });
            });
        }
        quests = completedQuests;
        console.log(`📋 Rendering Completed tab: found ${quests.length} quests from UQE`);
    }

    // Ensure selectedQuestIndex is valid
    if (selectedQuestIndex >= quests.length) {
        selectedQuestIndex = Math.max(0, quests.length - 1);
    }
    if (quests.length === 0) {
        selectedQuestIndex = -1;
    }

    // Quest list on left (RENDERED INTO CONTAINER FOR SCROLLING)
    if (quests.length === 0) {
        let noQuestsMessage = 'No active side quests';
        if (questLogTab === 'main') {
            noQuestsMessage = 'No active story quests';
        } else if (questLogTab === 'available') {
            noQuestsMessage = 'No available quests';
        } else if (questLogTab === 'completed') {
            noQuestsMessage = 'No completed quests';
        }
        const noQuestsText = scene.add.text(listWidth / 2, listHeight / 2,
            noQuestsMessage, {
            fontSize: '16px',
            fill: '#888888',
            fontStyle: 'italic'
        }).setOrigin(0.5, 0.5);
        questPanel.container.add(noQuestsText);

        // Disable scrollbar when no quests
        if (questPanel.scrollbar) {
            questPanel.scrollbar.updateMaxScroll(0, listHeight);
            questPanel.scrollbar.setVisible(false);
        }
    } else {
        const questItemHeight = 50;
        const totalContentHeight = quests.length * questItemHeight;

        // Update scrollbar
        if (questPanel.scrollbar) {
            const maxScroll = Math.max(0, totalContentHeight - listHeight);
            questPanel.scrollbar.updateMaxScroll(maxScroll, totalContentHeight);
        }

        // Optimization: only render quests that are currently visible (plus a buffer)
        const scrollY = questPanel.scrollbar ? questPanel.scrollbar.getScroll() : 0;
        const startIndex = Math.floor(scrollY / questItemHeight);
        const endIndex = Math.min(quests.length, Math.ceil((scrollY + listHeight) / questItemHeight));

        // Render visible quests into the container
        for (let i = startIndex; i < endIndex; i++) {
            const quest = quests[i];
            const isSelected = (i === selectedQuestIndex);

            // USE ABSOLUTE POSITION WITHIN CONTAINER (scrollbar moves the container)
            const itemY = i * questItemHeight + questItemHeight / 2;

            // Quest item background (relative to container)
            const itemBg = scene.add.rectangle(listWidth / 2, itemY, listWidth - 10, questItemHeight - 5,
                isSelected ? 0x444444 : 0x2a2a2a, 0.9)
                .setStrokeStyle(2, isSelected ? 0x00aaff : 0x555555)
                .setScrollFactor(0).setDepth(302)
                .setInteractive({ useHandCursor: true });

            // Quest title
            const titleText = scene.add.text(10, itemY, quest.title, {
                fontSize: '16px',
                fill: isSelected ? '#ffffff' : '#cccccc',
                fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(302).setOrigin(0, 0.5);

            // Add to container
            questPanel.container.add([itemBg, titleText]);

            // Progress indicator for current and main quests
            const isTrackedTab = (questLogTab === 'current' || questLogTab === 'main');
            if (isTrackedTab && quest.progress !== undefined && quest.target !== undefined) {
                const progressPercent = Math.min(quest.progress / quest.target, 1);
                const progressText = scene.add.text(listWidth - 15, itemY, `${Math.round(progressPercent * 100)}%`, {
                    fontSize: '12px',
                    fill: '#00ff00'
                }).setScrollFactor(0).setDepth(302).setOrigin(1, 0.5);
                questPanel.container.add(progressText);
            } else if (questLogTab === 'completed') {
                const completedIcon = scene.add.text(listWidth - 15, itemY, '✓', {
                    fontSize: '20px',
                    fill: '#00ff00'
                }).setScrollFactor(0).setDepth(302).setOrigin(1, 0.5);
                questPanel.container.add(completedIcon);
            }

            // Click handler
            const selectQuest = () => {
                selectedQuestIndex = i;
                updateQuestLogItems();
            };

            itemBg.on('pointerdown', selectQuest);
        }
    }

    // Quest details on right (REMAINS ABSOLUTE, NOT IN SCROLLING CONTAINER)
    if (quests.length > 0 && selectedQuestIndex >= 0 && selectedQuestIndex < quests.length && selectedQuestIndex !== -1) {
        const quest = quests[selectedQuestIndex];
        let detailY = detailStartY;

        // Quest title
        const detailTitle = scene.add.text(detailStartX, detailY, quest.title, {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold',
            wordWrap: { width: detailWidth - 20 }
        }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
        questPanel.questDetailElements.push(detailTitle);
        detailY += 35;

        // Quest description
        const detailDesc = scene.add.text(detailStartX, detailY, quest.description, {
            fontSize: '16px',
            fill: '#cccccc',
            wordWrap: { width: detailWidth - 20 }
        }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
        questPanel.questDetailElements.push(detailDesc);
        detailY += 50;

        // Objectives section (Unified Quest Engine / V2)
        if (quest.objectives) {
            const objLabel = scene.add.text(detailStartX, detailY, 'Objectives:', {
                fontSize: '18px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
            questPanel.questDetailElements.push(objLabel);
            detailY += 30;

            quest.objectives.forEach(obj => {
                const statusStr = obj.completed ? '✅' : '⏳';
                const objProgress = obj.progress !== undefined ? obj.progress : 0;
                const objText = scene.add.text(detailStartX + 20, detailY, `${statusStr} ${obj.label}: ${objProgress}/${obj.target}`, {
                    fontSize: '14px',
                    fill: obj.completed ? '#00ff00' : '#cccccc'
                }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
                questPanel.questDetailElements.push(objText);
                detailY += 25;
            });
            detailY += 15;
        }

        // Progress section (for current and main quests)
        const isProgressTab = (questLogTab === 'current' || questLogTab === 'main');
        if (isProgressTab && quest.progress !== undefined && quest.target !== undefined) {
            const progressLabel = scene.add.text(detailStartX, detailY, 'Progress:', {
                fontSize: '18px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
            questPanel.questDetailElements.push(progressLabel);
            detailY += 30;

            // Progress bar background
            const progressBarBgWidth = detailWidth - 20;
            const progressBarBgX = detailStartX + progressBarBgWidth / 2;
            const progressBarBgY = detailY + 15;
            const progressBarBg = scene.add.rectangle(progressBarBgX, progressBarBgY, progressBarBgWidth, 25, 0x333333, 0.8)
                .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x666666);
            questPanel.questDetailElements.push(progressBarBg);

            // Progress bar fill (left-aligned)
            const progressPercent = Math.min(quest.progress / quest.target, 1);
            const progressBarWidth = progressBarBgWidth * progressPercent;
            // Calculate left edge of background bar
            const progressBarLeftX = progressBarBgX - progressBarBgWidth / 2;
            // Position fill bar starting from left edge
            const progressBar = scene.add.rectangle(
                progressBarLeftX + progressBarWidth / 2,
                progressBarBgY,
                progressBarWidth,
                21,
                0x00ff00
            ).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);
            questPanel.questDetailElements.push(progressBar);

            // Progress text
            const progressText = scene.add.text(detailStartX + (detailWidth - 20) / 2, detailY + 15,
                `${quest.progress}/${quest.target}`, {
                fontSize: '16px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(303).setOrigin(0.5, 0.5);
            questPanel.questDetailElements.push(progressText);
            detailY += 50;
        }

        // Rewards section
        detailY += 10;
        const rewardsLabel = scene.add.text(detailStartX, detailY, 'Rewards:', {
            fontSize: '18px',
            fill: '#ffd700',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
        questPanel.questDetailElements.push(rewardsLabel);
        detailY += 30;

        let rewardsText = '';
        if (quest.rewards.xp) {
            rewardsText += `+${quest.rewards.xp} XP`;
        }
        if (quest.rewards.gold) {
            if (rewardsText) rewardsText += '\n';
            rewardsText += `+${quest.rewards.gold} Gold`;
        }

        const rewards = scene.add.text(detailStartX, detailY, rewardsText, {
            fontSize: '16px',
            fill: '#ffd700'
        }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
        questPanel.questDetailElements.push(rewards);

        // Accept button for available quests
        if (questLogTab === 'available') {
            detailY += 60;
            const acceptBtn = scene.add.rectangle(detailStartX + (detailWidth - 20) / 2, detailY, 200, 40, 0x00aa00, 0.9)
                .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x00ff00).setInteractive({ useHandCursor: true });

            const acceptBtnText = scene.add.text(detailStartX + (detailWidth - 20) / 2, detailY, 'Accept Quest', {
                fontSize: '18px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

            const acceptQuest = () => {
                // Accept quest via UQE
                if (typeof uqe !== 'undefined' && quest.isUQE) {
                    uqe.acceptQuest(quest.id);
                    console.log(`✅ [UQE] Quest accepted from Available tab: ${quest.id}`);
                } else {
                    // Fallback for legacy quests (if any)
                    const questIndex = playerStats.quests.available.findIndex(q => q.id === quest.id);
                    if (questIndex !== -1) {
                        const questToAccept = playerStats.quests.available[questIndex];
                        playerStats.quests.available.splice(questIndex, 1);
                        if (!playerStats.quests.active) playerStats.quests.active = [];
                        questToAccept.progress = 0;
                        if (!playerStats.quests.active.find(q => q.id === questToAccept.id)) {
                            playerStats.quests.active.push(questToAccept);
                        }
                    }
                }

                // Refresh quest log display
                updateQuestLogItems();
                playSound('item_pickup');
            };

            acceptBtn.on('pointerdown', acceptQuest);
            acceptBtnText.setInteractive({ useHandCursor: true });
            acceptBtnText.on('pointerdown', acceptQuest);

            questPanel.questDetailElements.push(acceptBtn, acceptBtnText);
        }
    } else if (quests.length === 0) {
        // No quests message already shown in list
    }

    isUpdatingQuestLog = false; // Reset recursion guard
}

/**
 * Update quest log (refresh display)
 */
function updateQuestLog() {
    // Quest log updates are handled by refreshQuestLog()
}

/**
 * Force quest log refresh
 */
function refreshQuestLog() {
    if (questVisible && questPanel) {
        updateQuestLogItems();
    }
}

/**
 * Destroy quest log UI
 */
function destroyQuestLogUI() {
    const scene = game.scene.scenes[0];

    if (questPanel) {
        if (questPanel.bg) questPanel.bg.destroy();
        if (questPanel.title) questPanel.title.destroy();
        if (questPanel.closeText) questPanel.closeText.destroy();
        if (questPanel.mainTabBtn) questPanel.mainTabBtn.destroy();
        if (questPanel.mainTabText) questPanel.mainTabText.destroy();
        if (questPanel.currentTabBtn) questPanel.currentTabBtn.destroy();
        if (questPanel.currentTabText) questPanel.currentTabText.destroy();
        if (questPanel.availableTabBtn) questPanel.availableTabBtn.destroy();
        if (questPanel.availableTabText) questPanel.availableTabText.destroy();
        if (questPanel.completedTabBtn) questPanel.completedTabBtn.destroy();
        if (questPanel.completedTabText) questPanel.completedTabText.destroy();
        if (questPanel.completedTabText) questPanel.completedTabText.destroy();
        if (questPanel.divider) questPanel.divider.destroy();

        // New UI components
        if (questPanel.container) questPanel.container.destroy();
        if (questPanel.mask) questPanel.mask.destroy();
        if (questPanel.scrollbar) questPanel.scrollbar.destroy();

        questPanel.questListElements.forEach(element => {
            if (element) element.destroy();
        });

        questPanel.questDetailElements.forEach(element => {
            if (element) element.destroy();
        });

        questPanel.questListElements = [];
        questPanel.questDetailElements = [];
        questPanel = null;
    }
}

/**
 * Show quest completed modal
 */
function showQuestCompletedModal(quest) {
    // Don't show quest completed modal during combat
    if (isInCombat()) {
        return;
    }

    const scene = game.scene.scenes[0];

    // Hide any existing modal
    if (questCompletedModal) {
        hideQuestCompletedModal();
    }

    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;
    const modalWidth = 500;
    const modalHeight = 400;

    // Background overlay
    const overlay = scene.add.rectangle(centerX, centerY, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.8)
        .setScrollFactor(0).setDepth(600).setInteractive();

    // Modal background
    const modalBg = scene.add.rectangle(centerX, centerY, modalWidth, modalHeight, 0x1a1a1a, 0.98)
        .setScrollFactor(0).setDepth(601).setStrokeStyle(4, 0x00ff00);

    // Title
    const title = scene.add.text(centerX, centerY - modalHeight / 2 + 40, 'QUEST COMPLETED!', {
        fontSize: '32px',
        fill: '#00ff00',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5, 0);

    // Quest title
    const questTitle = scene.add.text(centerX, centerY - modalHeight / 2 + 90, quest.title, {
        fontSize: '24px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5, 0);

    // Quest description
    const questDesc = scene.add.text(centerX, centerY - modalHeight / 2 + 130, quest.description, {
        fontSize: '16px',
        fill: '#cccccc',
        wordWrap: { width: modalWidth - 60 }
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5, 0);

    // Rewards section
    let rewardsText = 'Rewards:\n';
    if (quest.rewards.xp) {
        rewardsText += `+${quest.rewards.xp} XP\n`;
    }
    if (quest.rewards.gold) {
        rewardsText += `+${quest.rewards.gold} Gold`;
    }

    const rewards = scene.add.text(centerX, centerY + 50, rewardsText, {
        fontSize: '20px',
        fill: '#ffd700',
        fontStyle: 'bold',
        align: 'center'
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5, 0.5);

    // Close button
    const closeBtn = scene.add.rectangle(centerX, centerY + modalHeight / 2 - 50, 150, 40, 0x333333, 0.9)
        .setScrollFactor(0).setDepth(602).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });

    const closeBtnText = scene.add.text(centerX, centerY + modalHeight / 2 - 50, 'Close', {
        fontSize: '18px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(603).setOrigin(0.5, 0.5);

    // Close on click
    const closeModal = () => {
        hideQuestCompletedModal();
        // Show new quest modal if there's a pending one
        if (pendingNewQuest) {
            const questToShow = pendingNewQuest;
            pendingNewQuest = null; // Clear before showing (in case showNewQuestModal fails)
            showNewQuestModal(questToShow);
        }
    };

    closeBtn.on('pointerdown', closeModal);
    closeBtnText.setInteractive({ useHandCursor: true });
    closeBtnText.on('pointerdown', closeModal);

    // Close on ESC key
    const escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const escHandler = () => {
        if (questCompletedModal) {
            hideQuestCompletedModal();
            escKey.removeListener('down', escHandler);
            // Show new quest modal if there's a pending one
            if (pendingNewQuest) {
                const questToShow = pendingNewQuest;
                pendingNewQuest = null; // Clear before showing
                showNewQuestModal(questToShow);
            }
        }
    };
    escKey.on('down', escHandler);

    questCompletedModal = {
        overlay: overlay,
        modalBg: modalBg,
        title: title,
        questTitle: questTitle,
        questDesc: questDesc,
        rewards: rewards,
        closeBtn: closeBtn,
        closeBtnText: closeBtnText,
        escKey: escKey,
        escHandler: escHandler
    };
}

/**
 * Hide quest completed modal
 */
function hideQuestCompletedModal() {
    if (questCompletedModal) {
        if (questCompletedModal.overlay) questCompletedModal.overlay.destroy();
        if (questCompletedModal.modalBg) questCompletedModal.modalBg.destroy();
        if (questCompletedModal.title) questCompletedModal.title.destroy();
        if (questCompletedModal.questTitle) questCompletedModal.questTitle.destroy();
        if (questCompletedModal.questDesc) questCompletedModal.questDesc.destroy();
        if (questCompletedModal.rewards) questCompletedModal.rewards.destroy();
        if (questCompletedModal.closeBtn) questCompletedModal.closeBtn.destroy();
        if (questCompletedModal.closeBtnText) questCompletedModal.closeBtnText.destroy();
        if (questCompletedModal.escKey && questCompletedModal.escHandler) {
            questCompletedModal.escKey.removeListener('down', questCompletedModal.escHandler);
        }
        questCompletedModal = null;
    }
    // Note: Don't show pending new quest here - let the close handlers do it
    // This allows the close handlers to control the flow
}

/**
 * Show new quest modal
 */
function showNewQuestModal(quest) {
    // Don't show new quest modal during combat
    if (isInCombat()) {
        return;
    }

    // CRITICAL: Don't show if quest completed modal is still open
    // Wait for it to close first
    if (questCompletedModal) {
        console.log('⏳ Quest completed modal is open, queuing new quest modal');
        // Store it to show after completed modal closes
        pendingNewQuest = quest;
        return;
    }

    const scene = game.scene.scenes[0];

    // Hide any existing modal
    if (newQuestModal) {
        hideNewQuestModal();
    }

    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;
    const modalWidth = 500;
    const modalHeight = 450;

    // Background overlay
    const overlay = scene.add.rectangle(centerX, centerY, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.8)
        .setScrollFactor(0).setDepth(600).setInteractive();

    // Modal background
    const modalBg = scene.add.rectangle(centerX, centerY, modalWidth, modalHeight, 0x1a1a1a, 0.98)
        .setScrollFactor(0).setDepth(601).setStrokeStyle(4, 0x00aaff);

    // Title
    const title = scene.add.text(centerX, centerY - modalHeight / 2 + 40, 'NEW QUEST!', {
        fontSize: '32px',
        fill: '#00aaff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5, 0);

    // Quest title
    const questTitle = scene.add.text(centerX, centerY - modalHeight / 2 + 90, quest.title, {
        fontSize: '24px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5, 0);

    // Quest description
    const questDesc = scene.add.text(centerX, centerY - modalHeight / 2 + 130, quest.description, {
        fontSize: '16px',
        fill: '#cccccc',
        wordWrap: { width: modalWidth - 60 }
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5, 0);

    // Progress info
    const progressInfo = scene.add.text(centerX, centerY - 30, `Progress: 0/${quest.target}`, {
        fontSize: '16px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5, 0.5);

    // Rewards section
    let rewardsText = 'Rewards:\n';
    if (quest.rewards.xp) {
        rewardsText += `+${quest.rewards.xp} XP\n`;
    }
    if (quest.rewards.gold) {
        rewardsText += `+${quest.rewards.gold} Gold`;
    }

    const rewards = scene.add.text(centerX, centerY + 20, rewardsText, {
        fontSize: '18px',
        fill: '#ffd700',
        fontStyle: 'bold',
        align: 'center'
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5, 0.5);

    // Accept button
    const acceptBtn = scene.add.rectangle(centerX - 90, centerY + modalHeight / 2 - 50, 150, 40, 0x00aa00, 0.9)
        .setScrollFactor(0).setDepth(602).setStrokeStyle(2, 0x00ff00).setInteractive({ useHandCursor: true });

    const acceptBtnText = scene.add.text(centerX - 90, centerY + modalHeight / 2 - 50, 'Accept', {
        fontSize: '18px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(603).setOrigin(0.5, 0.5);

    // Cancel button
    const cancelBtn = scene.add.rectangle(centerX + 90, centerY + modalHeight / 2 - 50, 150, 40, 0xaa0000, 0.9)
        .setScrollFactor(0).setDepth(602).setStrokeStyle(2, 0xff0000).setInteractive({ useHandCursor: true });

    const cancelBtnText = scene.add.text(centerX + 90, centerY + modalHeight / 2 - 50, 'Cancel', {
        fontSize: '18px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(603).setOrigin(0.5, 0.5);

    // Store quest reference for accept handler
    const questRef = quest;

    // Accept handler
    const acceptQuest = () => {
        // Quest is already added, just close modal
        hideNewQuestModal();
    };

    // Cancel handler
    const cancelQuest = () => {
        // Remove quest from active list and move to available
        const questIndex = playerStats.quests.active.findIndex(q => q.id === questRef.id);
        if (questIndex !== -1) {
            const quest = playerStats.quests.active[questIndex];
            playerStats.quests.active.splice(questIndex, 1);

            // Initialize available array if needed
            if (!playerStats.quests.available) {
                playerStats.quests.available = [];
            }

            // Only add to available if not already there
            if (!playerStats.quests.available.find(q => q.id === quest.id)) {
                playerStats.quests.available.push(quest);
            }
        }
        hideNewQuestModal();
    };

    acceptBtn.on('pointerdown', acceptQuest);
    acceptBtnText.setInteractive({ useHandCursor: true });
    acceptBtnText.on('pointerdown', acceptQuest);

    cancelBtn.on('pointerdown', cancelQuest);
    cancelBtnText.setInteractive({ useHandCursor: true });
    cancelBtnText.on('pointerdown', cancelQuest);

    // Close on ESC key (same as cancel)
    const escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const escHandler = () => {
        if (newQuestModal) {
            cancelQuest();
            escKey.removeListener('down', escHandler);
        }
    };
    escKey.on('down', escHandler);

    newQuestModal = {
        overlay: overlay,
        modalBg: modalBg,
        title: title,
        questTitle: questTitle,
        questDesc: questDesc,
        progressInfo: progressInfo,
        rewards: rewards,
        acceptBtn: acceptBtn,
        acceptBtnText: acceptBtnText,
        cancelBtn: cancelBtn,
        cancelBtnText: cancelBtnText,
        escKey: escKey,
        escHandler: escHandler
    };
}

/**
 * Hide new quest modal
 */
function hideNewQuestModal() {
    if (newQuestModal) {
        if (newQuestModal.overlay) newQuestModal.overlay.destroy();
        if (newQuestModal.modalBg) newQuestModal.modalBg.destroy();
        if (newQuestModal.title) newQuestModal.title.destroy();
        if (newQuestModal.questTitle) newQuestModal.questTitle.destroy();
        if (newQuestModal.questDesc) newQuestModal.questDesc.destroy();
        if (newQuestModal.progressInfo) newQuestModal.progressInfo.destroy();
        if (newQuestModal.rewards) newQuestModal.rewards.destroy();
        if (newQuestModal.acceptBtn) newQuestModal.acceptBtn.destroy();
        if (newQuestModal.acceptBtnText) newQuestModal.acceptBtnText.destroy();
        if (newQuestModal.cancelBtn) newQuestModal.cancelBtn.destroy();
        if (newQuestModal.cancelBtnText) newQuestModal.cancelBtnText.destroy();
        if (newQuestModal.escKey && newQuestModal.escHandler) {
            newQuestModal.escKey.removeListener('down', newQuestModal.escHandler);
        }
        newQuestModal = null;
    }
}

// Quest preview modal for NPC dialog offers
let questPreviewModal = null;

/**
 * Show quest preview modal from NPC dialog (before accepting)
 * @param {string} questId - The quest ID to preview
 * @param {Function} onAccept - Callback when quest is accepted
 * @param {Function} onDecline - Callback when quest is declined
 */
function showQuestPreviewModal(questId, onAccept, onDecline) {
    const scene = game.scene.scenes[0];

    // Get quest definition from UQE
    const questDef = uqe.allDefinitions[questId];
    if (!questDef) {
        console.error(`Quest ${questId} not found in UQE definitions`);
        if (onDecline) onDecline();
        return;
    }

    // Hide any existing preview modal
    if (questPreviewModal) {
        hideQuestPreviewModal();
    }

    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;
    const modalWidth = 520;
    const modalHeight = 480;

    // Background overlay
    const overlay = scene.add.rectangle(centerX, centerY, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.85)
        .setScrollFactor(0).setDepth(700).setInteractive();

    // Modal background
    const modalBg = scene.add.rectangle(centerX, centerY, modalWidth, modalHeight, 0x1a1a1a, 0.98)
        .setScrollFactor(0).setDepth(701).setStrokeStyle(4, 0xffd700);

    // Header
    const header = scene.add.text(centerX, centerY - modalHeight / 2 + 30, 'QUEST OFFER', {
        fontSize: '24px',
        fill: '#ffd700',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(702).setOrigin(0.5, 0);

    // Quest title
    const questTitle = scene.add.text(centerX, centerY - modalHeight / 2 + 70, questDef.title, {
        fontSize: '22px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(702).setOrigin(0.5, 0);

    // Quest description
    const questDesc = scene.add.text(centerX, centerY - modalHeight / 2 + 105, questDef.description, {
        fontSize: '15px',
        fill: '#cccccc',
        wordWrap: { width: modalWidth - 50 },
        align: 'center'
    }).setScrollFactor(0).setDepth(702).setOrigin(0.5, 0);

    // Objectives section
    let objY = centerY - 60;
    const objLabel = scene.add.text(centerX - modalWidth / 2 + 30, objY, 'Objectives:', {
        fontSize: '18px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(702).setOrigin(0, 0);
    objY += 28;

    const objectiveTexts = [];
    questDef.objectives.forEach(obj => {
        const objText = scene.add.text(centerX - modalWidth / 2 + 45, objY, `⏳ ${obj.label}: 0/${obj.target}`, {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(702).setOrigin(0, 0);
        objectiveTexts.push(objText);
        objY += 22;
    });

    // Rewards section
    objY += 15;
    const rewardsLabel = scene.add.text(centerX - modalWidth / 2 + 30, objY, 'Rewards:', {
        fontSize: '18px',
        fill: '#ffd700',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(702).setOrigin(0, 0);
    objY += 28;

    const rewardTexts = [];
    if (questDef.rewards) {
        if (questDef.rewards.xp) {
            const xpText = scene.add.text(centerX - modalWidth / 2 + 45, objY, `+${questDef.rewards.xp} XP`, {
                fontSize: '14px',
                fill: '#00ff00'
            }).setScrollFactor(0).setDepth(702).setOrigin(0, 0);
            rewardTexts.push(xpText);
            objY += 22;
        }
        if (questDef.rewards.gold) {
            const goldText = scene.add.text(centerX - modalWidth / 2 + 45, objY, `+${questDef.rewards.gold} Gold`, {
                fontSize: '14px',
                fill: '#ffd700'
            }).setScrollFactor(0).setDepth(702).setOrigin(0, 0);
            rewardTexts.push(goldText);
        }
    }

    // Accept button
    const acceptBtn = scene.add.rectangle(centerX - 90, centerY + modalHeight / 2 - 50, 150, 45, 0x00aa00, 0.95)
        .setScrollFactor(0).setDepth(702).setStrokeStyle(2, 0x00ff00).setInteractive({ useHandCursor: true });

    const acceptBtnText = scene.add.text(centerX - 90, centerY + modalHeight / 2 - 50, 'Accept Quest', {
        fontSize: '16px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(703).setOrigin(0.5, 0.5);

    // Decline button
    const declineBtn = scene.add.rectangle(centerX + 90, centerY + modalHeight / 2 - 50, 150, 45, 0x666666, 0.95)
        .setScrollFactor(0).setDepth(702).setStrokeStyle(2, 0xaaaaaa).setInteractive({ useHandCursor: true });

    const declineBtnText = scene.add.text(centerX + 90, centerY + modalHeight / 2 - 50, 'Decline', {
        fontSize: '16px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(703).setOrigin(0.5, 0.5);

    // Accept handler
    const acceptHandler = () => {
        hideQuestPreviewModal();
        if (onAccept) onAccept();
    };

    // Decline handler  
    const declineHandler = () => {
        hideQuestPreviewModal();
        if (onDecline) onDecline();
    };

    acceptBtn.on('pointerover', () => acceptBtn.setFillStyle(0x00cc00));
    acceptBtn.on('pointerout', () => acceptBtn.setFillStyle(0x00aa00));
    acceptBtn.on('pointerdown', acceptHandler);
    acceptBtnText.setInteractive({ useHandCursor: true }).on('pointerdown', acceptHandler);

    declineBtn.on('pointerover', () => declineBtn.setFillStyle(0x888888));
    declineBtn.on('pointerout', () => declineBtn.setFillStyle(0x666666));
    declineBtn.on('pointerdown', declineHandler);
    declineBtnText.setInteractive({ useHandCursor: true }).on('pointerdown', declineHandler);

    // ESC to decline
    const escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const escHandler = () => {
        if (questPreviewModal) {
            declineHandler();
            escKey.removeListener('down', escHandler);
        }
    };
    escKey.on('down', escHandler);

    questPreviewModal = {
        overlay, modalBg, header, questTitle, questDesc,
        objLabel, objectiveTexts, rewardsLabel, rewardTexts,
        acceptBtn, acceptBtnText, declineBtn, declineBtnText,
        escKey, escHandler
    };
}

/**
 * Hide quest preview modal
 */
function hideQuestPreviewModal() {
    if (questPreviewModal) {
        if (questPreviewModal.overlay) questPreviewModal.overlay.destroy();
        if (questPreviewModal.modalBg) questPreviewModal.modalBg.destroy();
        if (questPreviewModal.header) questPreviewModal.header.destroy();
        if (questPreviewModal.questTitle) questPreviewModal.questTitle.destroy();
        if (questPreviewModal.questDesc) questPreviewModal.questDesc.destroy();
        if (questPreviewModal.objLabel) questPreviewModal.objLabel.destroy();
        questPreviewModal.objectiveTexts.forEach(t => t.destroy());
        if (questPreviewModal.rewardsLabel) questPreviewModal.rewardsLabel.destroy();
        questPreviewModal.rewardTexts.forEach(t => t.destroy());
        if (questPreviewModal.acceptBtn) questPreviewModal.acceptBtn.destroy();
        if (questPreviewModal.acceptBtnText) questPreviewModal.acceptBtnText.destroy();
        if (questPreviewModal.declineBtn) questPreviewModal.declineBtn.destroy();
        if (questPreviewModal.declineBtnText) questPreviewModal.declineBtnText.destroy();
        if (questPreviewModal.escKey && questPreviewModal.escHandler) {
            questPreviewModal.escKey.removeListener('down', questPreviewModal.escHandler);
        }
        questPreviewModal = null;
    }
}

// ============================================
// NPC SYSTEM
// ============================================

/**
 * Initialize NPCs in the world
 */
function initializeNPCs() {
    const scene = game.scene.scenes[0];

    // Clear existing NPCs first to prevent duplicates
    npcs.forEach(npc => {
        if (npc && npc.active) npc.destroy();
    });
    npcs = [];

    const tileSize = scene.tileSize || 32;
    const mapWidth = scene.mapWidth || 40;
    const mapHeight = scene.mapHeight || 40;
    const centerX = Math.floor(mapWidth / 2);
    const centerY = Math.floor(mapHeight / 2);

    // Helper function to check if position is inside a building
    function isPositionInBuilding(x, y) {
        const npcSize = 16; // Half of NPC sprite size
        for (const building of buildings) {
            if (x + npcSize > building.x &&
                x - npcSize < building.x + building.width &&
                y + npcSize > building.y &&
                y - npcSize < building.y + building.height) {
                return true;
            }
        }
        return false;
    }

    // Helper function to find a valid position near a target
    function findValidPosition(targetX, targetY, attempts = 50) {
        for (let i = 0; i < attempts; i++) {
            const offsetX = Phaser.Math.Between(-5, 5) * tileSize;
            const offsetY = Phaser.Math.Between(-5, 5) * tileSize;
            const testX = targetX + offsetX;
            const testY = targetY + offsetY;

            // Check bounds
            if (testX < tileSize || testX > (mapWidth - 1) * tileSize ||
                testY < tileSize || testY > (mapHeight - 1) * tileSize) {
                continue;
            }

            // Check if not in building
            if (!isPositionInBuilding(testX, testY)) {
                return { x: testX, y: testY };
            }
        }
        // Fallback: return original position (will be adjusted manually if needed)
        return { x: targetX, y: targetY };
    }

    // Position NPCs in town near buildings, ensuring they're not inside buildings
    const npcData = [
        {
            id: 'npc_001',
            name: 'Elder Malik',
            title: 'Village Elder',
            targetX: centerX * tileSize,  // Center square
            targetY: (centerY - 3) * tileSize, // Above center, clear of Inn
            dialogId: 'elder_intro',
            questGiver: true
        },
        {
            id: 'npc_002',
            name: 'Merchant Lysa',
            title: 'Trader',
            targetX: (centerX + 6) * tileSize,  // Near shop (to the right)
            targetY: (centerY + 6) * tileSize, // Below shop
            dialogId: 'merchant_shop',
            merchant: true,
            questGiver: true
        },
        {
            id: 'npc_003',
            name: 'Guard Thorne',
            title: 'Guard Officer',
            targetX: centerX * tileSize,
            targetY: (mapHeight - 6) * tileSize,
            dialogId: 'guard_info',
            questGiver: true
        },
        {
            id: 'npc_004',
            name: 'Captain Kael',
            title: 'Captain of the Guard',
            targetX: (centerX - 5) * tileSize,
            targetY: (mapHeight - 9) * tileSize,
            dialogId: 'generic_npc',
            questGiver: true
        },
        {
            id: 'npc_005',
            name: 'Mage Elara',
            title: 'Village Mage',
            targetX: (centerX + 5) * tileSize,
            targetY: (centerY - 5) * tileSize,
            dialogId: 'generic_npc',
            questGiver: true
        },
        {
            id: 'npc_006',
            name: 'Blacksmith Brond',
            title: 'Master Smith',
            targetX: 6 * tileSize,
            targetY: 20 * tileSize,
            dialogId: 'generic_npc',
            questGiver: true
        }
    ];

    // Find valid positions for each NPC
    const positionedNPCs = npcData.map(data => {
        const pos = findValidPosition(data.targetX, data.targetY);
        return {
            id: data.id,
            name: data.name,
            title: data.title,
            x: pos.x,
            y: pos.y,
            dialogId: data.dialogId,
            questGiver: data.questGiver,
            merchant: data.merchant
        };
    });

    positionedNPCs.forEach(data => {
        // Determine which spritesheet to use based on NPC name
        let spriteKey = 'npc'; // Default fallback
        if (data.name === 'Elder Malik') {
            spriteKey = 'npc_elder_malik';
        } else if (data.name === 'Merchant Lysa') {
            spriteKey = 'npc_lysa';
        } else if (data.name === 'Guard Thorne') {
            spriteKey = 'npc_captain_thorne';
        } else if (data.name === 'Guard Kael') {
            spriteKey = 'npc_captain_kael';
        } else if (data.name === 'Captain Kael') {
            spriteKey = 'npc_captain_kael';
        } else if (data.name === 'Mage Elara') {
            spriteKey = 'npc_mage_elara';
        } else if (data.name === 'Blacksmith Brond') {
            spriteKey = 'npc_blacksmith_brond';
        }

        // Check if spritesheet exists, fallback to default 'npc' if not
        if (!scene.textures.exists(spriteKey)) {
            console.warn(`⚠️ Spritesheet ${spriteKey} not found, using default NPC sprite`);
            spriteKey = 'npc';
        }

        const npc = scene.physics.add.sprite(data.x, data.y, spriteKey);
        npc.setDepth(30); // Same depth as monsters
        npc.setCollideWorldBounds(true);

        // If using a spritesheet, set to first frame (idle frame)
        if (spriteKey !== 'npc' && scene.textures.exists(spriteKey)) {
            npc.setFrame(0); // Use first frame as idle
            // NPCs at full size (64px)
        }

        // Store NPC data
        npc.npcId = data.id;
        npc.name = data.name;
        npc.title = data.title;
        npc.dialogId = data.dialogId;
        npc.questGiver = data.questGiver || false;
        npc.merchant = data.merchant || false;
        npc.interactionRadius = 50; // pixels
        npc.interactionIndicator = null;
        npc.showIndicator = false;
        npc.spriteKey = spriteKey; // Store sprite key for reference

        npcs.push(npc);
    });

    console.log('✅ NPCs initialized:', npcs.length, 'NPCs');
}

/**
 * Toggle settings panel
 */
function toggleSettings() {
    const scene = game.scene.scenes[0];

    // If already open, close it
    if (settingsVisible) {
        settingsVisible = false;
        destroySettingsUI();
        return;
    }

    // Close all other interfaces before opening
    closeAllInterfaces();

    // Now open settings
    settingsVisible = true;
    createSettingsUI();
}

/**
 * Create settings UI panel
 */
function createSettingsUI() {
    const scene = game.scene.scenes[0];

    // Create background panel (centered on screen)
    const panelWidth = 500;
    const panelHeight = 400;
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;

    // Background
    settingsPanel = {
        bg: scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xffffff),
        title: scene.add.text(centerX, centerY - panelHeight / 2 + 20, 'SETTINGS', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0),
        closeText: scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press ESC to Close', {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(301).setOrigin(1, 0),
        elements: []
    };

    // Music toggle setting
    const settingY = centerY - panelHeight / 2 + 80;
    const settingSpacing = 60;

    // Music label
    const musicLabel = scene.add.text(centerX - 100, settingY, 'Music:', {
        fontSize: '20px',
        fill: '#ffffff'
    }).setScrollFactor(0).setDepth(301).setOrigin(0, 0.5);

    // Music toggle button
    const toggleWidth = 100;
    const toggleHeight = 40;
    const toggleX = centerX + 50;

    const toggleBg = scene.add.rectangle(toggleX, settingY, toggleWidth, toggleHeight, musicEnabled ? 0x00aa00 : 0x666666, 1)
        .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });

    const toggleText = scene.add.text(toggleX, settingY, musicEnabled ? 'ON' : 'OFF', {
        fontSize: '18px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(302).setOrigin(0.5);

    // Toggle button click handler
    toggleBg.on('pointerdown', () => {
        musicEnabled = !musicEnabled;

        // Save to persistent storage
        saveSettings();

        // Update button appearance
        toggleBg.setFillStyle(musicEnabled ? 0x00aa00 : 0x666666);
        toggleText.setText(musicEnabled ? 'ON' : 'OFF');

        // Apply music setting immediately
        if (musicEnabled) {
            // Start appropriate music for current map
            if (scene.sound) {
                let musicKey = null;
                let musicName = '';

                if (currentMap === 'town' && scene.cache.audio.exists('village_music')) {
                    musicKey = 'village_music';
                    musicName = 'village';
                } else if (currentMap === 'wilderness' && scene.cache.audio.exists('wilderness_music')) {
                    musicKey = 'wilderness_music';
                    musicName = 'wilderness';
                } else if (currentMap === 'dungeon' && scene.cache.audio.exists('dungeon_music')) {
                    musicKey = 'dungeon_music';
                    musicName = 'dungeon';
                }

                if (musicKey) {
                    try {
                        // Stop any currently playing music
                        if (villageMusic && villageMusic.isPlaying) {
                            villageMusic.stop();
                            villageMusic.destroy();
                            villageMusic = null;
                        }
                        if (wildernessMusic && wildernessMusic.isPlaying) {
                            wildernessMusic.stop();
                            wildernessMusic.destroy();
                            wildernessMusic = null;
                        }
                        if (dungeonMusic && dungeonMusic.isPlaying) {
                            dungeonMusic.stop();
                            dungeonMusic.destroy();
                            dungeonMusic = null;
                        }

                        // Start appropriate music
                        const music = scene.sound.add(musicKey, {
                            volume: 0.5,
                            loop: true,
                            seek: 0
                        });

                        if (currentMap === 'town') {
                            villageMusic = music;
                        } else if (currentMap === 'wilderness') {
                            wildernessMusic = music;
                        } else if (currentMap === 'dungeon') {
                            dungeonMusic = music;
                        }

                        music.play();
                        console.log(`🎵 Music enabled - started ${musicName} music`);
                    } catch (e) {
                        console.error('❌ Error starting music:', e);
                    }
                }
            }
        } else {
            // Stop all music if playing
            if (villageMusic && villageMusic.isPlaying) {
                villageMusic.stop();
                villageMusic.destroy();
                villageMusic = null;
            }
            if (wildernessMusic && wildernessMusic.isPlaying) {
                wildernessMusic.stop();
                wildernessMusic.destroy();
                wildernessMusic = null;
            }
            if (dungeonMusic && dungeonMusic.isPlaying) {
                dungeonMusic.stop();
                dungeonMusic.destroy();
                dungeonMusic = null;
            }
            console.log('🎵 Music disabled - stopped all music');
        }
    });

    // Hover effects
    toggleBg.on('pointerover', () => {
        toggleBg.setStrokeStyle(2, 0xffff00);
    });
    toggleBg.on('pointerout', () => {
        toggleBg.setStrokeStyle(2, 0xffffff);
    });

    settingsPanel.elements.push(musicLabel, toggleBg, toggleText);
}

/**
 * Destroy settings UI panel
 */
function destroySettingsUI() {
    if (!settingsPanel) return;

    const scene = game.scene.scenes[0];

    // Destroy all elements
    if (settingsPanel.bg) settingsPanel.bg.destroy();
    if (settingsPanel.title) settingsPanel.title.destroy();
    if (settingsPanel.closeText) settingsPanel.closeText.destroy();

    settingsPanel.elements.forEach(element => {
        if (element && element.active) {
            element.destroy();
        }
    });

    settingsPanel = null;
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    try {
        const settings = {
            musicEnabled: musicEnabled
        };
        localStorage.setItem('pfaustino_rpg_settings', JSON.stringify(settings));
        console.log('💾 Settings saved to localStorage');
    } catch (e) {
        console.error('❌ Error saving settings:', e);
    }
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('pfaustino_rpg_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.musicEnabled !== undefined) {
                musicEnabled = settings.musicEnabled;
                console.log('💾 Settings loaded from localStorage:', settings);
            }
        }
    } catch (e) {
        console.error('❌ Error loading settings:', e);
    }
}

/**
 * Update NPC interaction indicators
 */
function updateNPCIndicators() {
    const scene = game.scene.scenes[0];

    // Only show NPC indicators in town (NPCs don't exist in wilderness/dungeon)
    if (currentMap !== 'town') {
        // Clean up any lingering indicators
        npcs.forEach(npc => {
            if (npc.interactionIndicator && npc.interactionIndicator.active) {
                npc.interactionIndicator.destroy();
                npc.interactionIndicator = null;
                npc.showIndicator = false;
            }
        });
        return;
    }

    npcs.forEach(npc => {
        if (!npc || !npc.active) return;

        // Ensure NPC has required properties
        if (npc.interactionRadius === undefined) {
            npc.interactionRadius = 50;
        }
        if (npc.showIndicator === undefined) {
            npc.showIndicator = false;
        }

        // Check distance to player
        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            npc.x, npc.y
        );

        const inRange = distance <= npc.interactionRadius;

        // Show/hide interaction indicator
        let iconText = '!';
        let iconColor = '#ffff00'; // Yellow for quests

        if (npc.questGiver) {
            const npcName = npc.name || npc.title;

            // Check UQE for available quests for this NPC
            let hasQuestAvailable = false;
            if (typeof uqe !== 'undefined' && uqe.allDefinitions) {
                const uqeCompletedIds = uqe.completedQuests.map(q => q.id);
                const uqeActiveIds = uqe.activeQuests.map(q => q.id);

                // Get quests for this NPC that are available (not active, not completed, prereqs met)
                const npcQuests = Object.values(uqe.allDefinitions).filter(q => q.giver === npcName);
                hasQuestAvailable = npcQuests.some(questDef => {
                    const isActive = uqeActiveIds.includes(questDef.id);
                    const isCompleted = uqeCompletedIds.includes(questDef.id);
                    let prereqMet = true;
                    if (questDef.requires) {
                        prereqMet = uqeCompletedIds.includes(questDef.requires);
                    }
                    return !isActive && !isCompleted && prereqMet;
                });
            }

            if (!hasQuestAvailable) {
                iconText = '💬'; // No available quests, just chat
                iconColor = '#ffffff';
            }
        } else {
            iconText = '💬'; // Regular NPC info
            iconColor = '#ffffff';
        }

        const shouldShow = inRange || iconText === '!';

        if (shouldShow) {
            if (!npc.showIndicator) {
                // Convert NPC world position to screen coordinates
                const camera = scene.cameras.main;
                const screenX = npc.x - camera.scrollX;
                const screenY = (npc.y - 45) - camera.scrollY;

                // Create indicator
                npc.interactionIndicator = scene.add.text(screenX, screenY, iconText, {
                    fontSize: '24px',
                    fill: iconColor,
                    stroke: '#000000',
                    strokeThickness: 3,
                    fontStyle: 'bold'
                }).setOrigin(0.5, 0.5).setDepth(20).setScrollFactor(0);

                // Add pulsing animation
                scene.tweens.add({
                    targets: npc.interactionIndicator,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                npc.showIndicator = true;
            } else if (npc.interactionIndicator) {
                // REAL-TIME UPDATE: Check if icon should change
                // (e.g. from ! to 💬 if quest accepted, which might then hide it if out of range)
                if (npc.interactionIndicator.text !== iconText) {
                    npc.interactionIndicator.setText(iconText);
                    npc.interactionIndicator.setFill(iconColor);
                }
            }
        } else if (npc.showIndicator) {
            if (npc.interactionIndicator) {
                npc.interactionIndicator.destroy();
                npc.interactionIndicator = null;
            }
            npc.showIndicator = false;
        }

        // Update indicator position to follow NPC (convert world to screen coordinates)
        if (npc.interactionIndicator && npc.interactionIndicator.active && npc.active) {
            // For objects with setScrollFactor(0), calculate screen position from world position
            // When camera follows player, screen position = world position - camera scroll
            const camera = scene.cameras.main;
            npc.interactionIndicator.x = npc.x - camera.scrollX;
            npc.interactionIndicator.y = (npc.y - 45) - camera.scrollY;
        }
    });
}

/**
 * Update building interaction indicators
 */
function updateBuildingIndicators() {
    const scene = game.scene.scenes[0];

    buildings.forEach((building, index) => {
        if (!building.rect || !building.rect.active) {
            if (building.type && ['inn', 'tavern', 'blacksmith'].includes(building.type)) {
                console.log(`⚠️ Building ${index} (${building.type}) has no active rect`);
            }
            return;
        }

        // Ensure building has centerX and centerY (for backwards compatibility)
        if (building.centerX === undefined || building.centerY === undefined) {
            building.centerX = building.x + building.width / 2;
            building.centerY = building.y + building.height / 2;
        }

        // Ensure building has interaction properties
        if (building.interactionRadius === undefined) {
            building.interactionRadius = 120; // Increased from 80
        }
        if (building.showIndicator === undefined) {
            building.showIndicator = false;
        }

        // Check distance to player from building center
        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            building.centerX, building.centerY
        );

        const inRange = distance <= building.interactionRadius;

        // Show/hide interaction indicator
        if (inRange && !building.showIndicator) {
            // Create indicator (door icon or exclamation mark)
            building.interactionIndicator = scene.add.text(building.centerX, building.y - 20, '🚪', {
                fontSize: '20px',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 3,
                fontStyle: 'bold'
            }).setOrigin(0.5, 0.5).setDepth(30).setScrollFactor(0);

            // Add pulsing animation
            scene.tweens.add({
                targets: building.interactionIndicator,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            building.showIndicator = true;
            if (['inn', 'tavern', 'blacksmith'].includes(building.type)) {
                console.log(`✅ Showing indicator for ${building.type} (distance: ${distance.toFixed(0)})`);
            }
        } else if (!inRange && building.showIndicator) {
            if (building.interactionIndicator) {
                building.interactionIndicator.destroy();
                building.interactionIndicator = null;
            }
            building.showIndicator = false;
        }

        // Update indicator position to follow building
        if (building.interactionIndicator && building.interactionIndicator.active) {
            building.interactionIndicator.x = building.centerX;
            building.interactionIndicator.y = building.y - 20;
        }
    });
}

/**
 * Check for building interaction when F is pressed
 */
function checkBuildingInteraction() {
    if (currentMap !== 'town') {
        console.log('❌ Not in town, skipping building interaction');
        return;
    }
    if (dialogVisible || shopVisible || inventoryVisible || settingsVisible || buildingPanelVisible) {
        console.log('❌ UI already open, skipping building interaction');
        return;
    }

    console.log(`🔍 Checking building interaction. Total buildings: ${buildings.length}`);

    // Find nearest building in range
    let closestBuilding = null;
    let closestDistance = Infinity;

    buildings.forEach((building, index) => {
        if (!building.rect || !building.rect.active) {
            console.log(`⚠️ Building ${index} (${building.type}) has no active rect`);
            return;
        }

        // Ensure building has centerX and centerY
        if (building.centerX === undefined || building.centerY === undefined) {
            building.centerX = building.x + building.width / 2;
            building.centerY = building.y + building.height / 2;
        }
        if (building.interactionRadius === undefined) {
            building.interactionRadius = 120; // Increased from 80
        }

        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            building.centerX, building.centerY
        );

        console.log(`  Building ${index}: ${building.type} at (${building.centerX.toFixed(0)}, ${building.centerY.toFixed(0)}), distance: ${distance.toFixed(0)}, radius: ${building.interactionRadius}`);

        if (distance <= building.interactionRadius && distance < closestDistance) {
            closestDistance = distance;
            closestBuilding = building;
            console.log(`  ✅ ${building.type} is in range!`);
        }
    });

    if (closestBuilding) {
        console.log(`🏠 Opening UI for ${closestBuilding.type} (distance: ${closestDistance.toFixed(0)})`);
        openBuildingUI(closestBuilding);
    } else {
        console.log('❌ No building in range');
    }
}

/**
 * Check for NPC interaction when F is pressed
 */
function checkNPCInteraction() {
    if (dialogVisible) {
        // If dialog is open, close it
        closeDialog();
        return;
    }

    // Find nearest NPC in range
    let closestNPC = null;
    let closestDistance = Infinity;

    npcs.forEach(npc => {
        if (!npc.active) return;

        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            npc.x, npc.y
        );

        if (distance <= npc.interactionRadius && distance < closestDistance) {
            closestDistance = distance;
            closestNPC = npc;
        }
    });

    if (closestNPC && closestNPC.dialogId) {
        startDialog(closestNPC);
    }
}

// ============================================
// DIALOG SYSTEM
// ============================================

/**
 * Sample dialog data (in a real game, this would be loaded from JSON)
 */
const dialogDatabase = {
    'elder_intro': {
        npcName: 'Elder Malik',
        npcTitle: 'Village Elder',
        nodes: {
            'start': {
                text: 'Welcome, traveler! I am Elder Malik, the leader of this village. How may I assist you?',
                choices: [
                    // All UQE quests are dynamically injected at dialog open time
                    { text: 'How do I survive out there?', next: 'controls_tutorial' },
                    { text: 'Tell me about this place', next: 'about_place' },
                    { text: 'Goodbye', next: 'end' }
                ]
            },
            'controls_tutorial': {
                text: 'Ah, a wise question! Let me share the essential knowledge:\n\n' +
                    '⚔️ MOVEMENT: WASD or Arrow Keys\n' +
                    '🗡️ ATTACK: Spacebar (attack nearby enemies)\n' +
                    '✨ SPECIAL ATTACKS: 1-9 (use learned abilities)\n' +
                    '📜 QUEST LOG: Q (view your active quests)\n' +
                    '🎒 INVENTORY: I (manage your items)\n' +
                    '💾 SAVE GAME: F5\n' +
                    '📂 LOAD GAME: F9\n' +
                    '❓ HELP: H (quick controls reminder)\n\n' +
                    'Remember: Talk to villagers for quests, and defeat monsters to grow stronger!',
                choices: [
                    { text: 'Tell me more about this place', next: 'about_place' },
                    { text: 'Thank you, Elder', next: 'end' }
                ]
            },
            'about_place': {
                text: 'Hearthwell has stood for generations, a beacon of peace in these lands. But lately... the ground shakes, and strange creatures emerge from below.',
                choices: [
                    { text: 'What are these tremors?', next: 'lore_tremors' },
                    { text: 'What creatures have appeared?', next: 'lore_creatures' },
                    { text: 'Is there a way to stop this?', next: 'lore_solution' },
                    { text: 'Thank you for the information', next: 'end' }
                ]
            },
            'lore_tremors': {
                text: 'The tremors began three moons ago. At first, we thought it mere earthquakes, but then came the Echo—a resonance that warps reality itself. Our scholars believe something ancient stirs beneath the earth, something connected to a relic called the Shattered Aegis.',
                choices: [
                    { text: 'What is the Shattered Aegis?', next: 'lore_aegis' },
                    { text: 'Tell me about the Echo', next: 'lore_echo' },
                    { text: 'I understand. Thank you.', next: 'end' }
                ]
            },
            'lore_aegis': {
                text: 'Long ago, a divine shield called the Aegis protected our world from chaos. When it shattered, its fragments—the Shards of Resonance—scattered across the land. Each shard pulses with ancient power. Some say gathering them could restore the Aegis... or unleash something far worse.',
                choices: [
                    { text: 'Where can I find these shards?', next: 'lore_shards' },
                    { text: 'What happens if they fall into wrong hands?', next: 'lore_danger' },
                    { text: 'I will seek them out.', next: 'end' }
                ]
            },
            'lore_echo': {
                text: 'The Echo is a corruption that seeps from the broken Aegis. It twists creatures into monstrous forms—the Echo Mites and Echo Rats you see in our mines are proof. Those exposed too long become lost to its influence, hearing whispers that drive them mad.',
                choices: [
                    { text: 'How do I protect myself?', next: 'lore_protection' },
                    { text: 'Are the miners safe?', next: 'lore_miners' },
                    { text: 'I will be careful.', next: 'end' }
                ]
            },
            'lore_creatures': {
                text: 'We have seen Echo Mites—small crystalline insects that drain life force. Echo Rats, larger and more aggressive, lurk in the shadows. And rumors speak of an Echo Beholder in the deepest mines—a creature of pure corruption with a gaze that paralyzes.',
                choices: [
                    { text: 'How do I defeat them?', next: 'lore_combat' },
                    { text: 'Where do they come from?', next: 'lore_origin' },
                    { text: 'I will face them bravely.', next: 'end' }
                ]
            },
            'lore_solution': {
                text: 'The Resonance Keepers of old sought to reunite the shards. One such Keeper, Warden Sylara, resides near the forest\\s edge. Seek her wisdom—she may know how to end this corruption. But beware, for others seek the shards for darker purposes.',
                choices: [
                    { text: 'Who are these others?', next: 'lore_enemies' },
                    { text: 'Where can I find Sylara?', next: 'lore_sylara' },
                    { text: 'I will seek her out.', next: 'end' }
                ]
            },
            'lore_shards': {
                text: 'The first shard, the Shard of Resonance, lies within the Undermines—our old mine system now overrun with Echo corruption. Clear the creatures and you may find it at the heart of the infestation.',
                choices: [
                    { text: 'I will venture into the Undermines.', next: 'end' }
                ]
            },
            'lore_danger': {
                text: 'In the wrong hands, the shards could tear reality asunder. Some cultists already worship the Echo as a god. They seek to gather the shards and complete what they call \"The Unmaking.\" We cannot let this happen.',
                choices: [
                    { text: 'I will stop them.', next: 'end' }
                ]
            },
            'lore_protection': {
                text: 'Keep moving—the Echo feeds on stillness. Resonance Crystals can shield you briefly, and our blacksmith can forge protective gear from corrupted materials, turning their power against them.',
                choices: [
                    { text: 'I will speak to the blacksmith.', next: 'end' }
                ]
            },
            'lore_miners': {
                text: 'Sadly, many were lost before we sealed the deeper tunnels. Some may yet live, driven mad by the Echo\\s whispers. If you find them, there may yet be hope for their salvation.',
                choices: [
                    { text: 'I will look for survivors.', next: 'end' }
                ]
            },
            'lore_combat': {
                text: 'Strike fast and true. Echo creatures are vulnerable to consistent damage—they regenerate slowly but can overwhelm with numbers. The Beholder\\s gaze can be interrupted by breaking line of sight. Good luck, adventurer.',
                choices: [
                    { text: 'Thank you for the advice.', next: 'end' }
                ]
            },
            'lore_origin': {
                text: 'They emerge from rifts in reality—tears where the Echo bleeds through. These rifts appear near shard fragments. Destroy the source, and the creatures fade. Let the rifts grow, and they become permanent.',
                choices: [
                    { text: 'I will seal them.', next: 'end' }
                ]
            },
            'lore_enemies': {
                text: 'The Shadow Concord—cultists who believe the Aegis\\s destruction was divine will. They see the Echo as salvation. Their leader, a fallen Keeper called Thessaly the Lost, has already claimed two shards.',
                choices: [
                    { text: 'I will stop Thessaly.', next: 'end' }
                ]
            },
            'lore_sylara': {
                text: 'Warden Sylara protects a sacred grove east of the village. She is a druid of the old ways, one of the last who remembers how to harmonize with the shards. Speak to her before descending into the Undermines.',
                choices: [
                    { text: 'I will find her.', next: 'end' }
                ]
            },
            'end': {
                text: 'Farewell, traveler. May your journey be safe.',
                choices: []
            }
        }
    },
    'merchant_shop': {
        npcName: 'Merchant Lysa',
        npcTitle: 'Village Trader',
        nodes: {
            'start': {
                text: 'Welcome to my shop! I have the finest wares in the village. Are you looking to buy something, or perhaps you could help me with a business favor?',
                choices: [
                    { text: 'I\'d like to browse your wares', next: 'shop' },
                    {
                        text: 'About that favor...',
                        next: 'favors',
                        isQuest: true,
                        condition: (stats) => stats.quests.available.some(q => q.giver === 'Merchant Lysa')
                    },
                    { text: 'Goodbye', next: 'end' }
                ]
            },
            'favors': {
                text: 'Business has been tough with the tremors. I need more inventory to stay afloat. Could you help me gather some items or perhaps earn some extra gold for me?',
                choices: [
                    {
                        text: 'I can gather items for you',
                        action: 'quest_accept_side',
                        questId: 'quest_002',
                        next: 'end',
                        condition: (stats) => !isQuestActive('quest_002') && !isQuestCompleted('quest_002')
                    },
                    {
                        text: 'I can help you with gold',
                        action: 'quest_accept_side',
                        questId: 'quest_004',
                        next: 'end',
                        condition: (stats) => !isQuestActive('quest_004') && !isQuestCompleted('quest_004')
                    },
                    { text: 'Maybe another time', next: 'end' }
                ]
            },
            'shop': {
                text: 'Here are my wares. What would you like to buy?',
                choices: [
                    { text: 'Open Shop', action: 'open_shop' },
                    { text: 'Nevermind', next: 'start' }
                ]
            },
            'end': {
                text: 'Come back anytime!',
                choices: []
            }
        }
    },
    'guard_info': {
        npcName: 'Guard Thorne',
        npcTitle: 'Guard Captain',
        nodes: {
            'start': {
                text: 'Halt! I am Captain Thorne, head of the village guard. State your business.',
                choices: [
                    {
                        text: 'I want to help with the monsters',
                        next: 'hunting',
                        isQuest: true,
                        condition: (stats) => !isQuestActive('quest_001') && !isQuestCompleted('quest_001')
                    },
                    { text: 'Tell me about the monsters', next: 'help' },
                    { text: 'Just passing through', next: 'end' }
                ]
            },
            'hunting': {
                text: 'A volunteer? Excellent. My guards are spread thin. If you can eliminate some of the local pests, I\'ll make sure the village compensates you.',
                choices: [
                    { text: 'I\'ll take the contract', action: 'quest_accept_side', questId: 'quest_001', next: 'end' },
                    { text: 'Not right now', next: 'end' }
                ]
            },
            'help': {
                text: 'The monsters have been getting bolder since the quakes started. They seem drawn to the tremors. Stay safe out there.',
                choices: [
                    { text: 'I will', next: 'end' }
                ]
            },
            'end': {
                text: 'Stay vigilant!',
                choices: []
            }
        }
    },
    'generic_npc': {
        npcName: 'NPC',
        npcTitle: 'Villager',
        nodes: {
            'start': {
                text: 'Greetings. How can I help you?',
                choices: [
                    { text: 'Goodbye', next: 'end' }
                ]
            },
            'end': {
                text: 'Farewell.',
                choices: []
            }
        }
    }
};


/**
 * Deep clone dialog data while preserving functions (like condition)
 * JSON.parse/stringify destroys functions, so we need this custom clone
 */
function deepCloneDialog(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof obj === 'function') return obj; // Preserve functions!
    if (Array.isArray(obj)) return obj.map(item => deepCloneDialog(item));

    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepCloneDialog(obj[key]);
        }
    }
    return cloned;
}

/**
 * Start dialog with an NPC
 */
function startDialog(npc) {
    let dialogData = dialogDatabase[npc.dialogId];
    if (!dialogData) {
        dialogData = dialogDatabase['generic_npc'];
    }

    // Clone to avoid modifying the original database - use custom clone to preserve functions
    const activeDialog = deepCloneDialog(dialogData);

    activeDialog.npcName = npc.name || activeDialog.npcName;
    activeDialog.npcTitle = npc.title || activeDialog.npcTitle;

    // UQE Bridge Event - EMIT EARLY so TalkObjectives complete BEFORE we check quest state
    if (typeof uqe !== 'undefined') {
        uqe.eventBus.emit(UQE_EVENTS.NPC_TALK, { id: npc.name });
        // Run UQE update to process any completed quests immediately
        uqe.update();
    }

    // Check for available main quests from this NPC
    // IMPORTANT: We gather state AFTER the NPC_TALK event so we have fresh quest state
    if (typeof uqe !== 'undefined' && uqe.allDefinitions) {
        // Gather current quest state from UQE
        const uqeCompletedIds = uqe.completedQuests.map(q => q.id);
        const uqeActiveIds = uqe.activeQuests.map(q => q.id);

        // Get all quests for this NPC from UQE definitions
        // Skip Merchant Lysa - she has a custom 'About that favor...' sub-menu
        const npcQuests = Object.values(uqe.allDefinitions).filter(q =>
            q.giver === npc.name && npc.name !== 'Merchant Lysa'
        );

        // Inject available quests (not active, not completed, prerequisites met)
        npcQuests.forEach(questDef => {
            const isActive = uqeActiveIds.includes(questDef.id);
            const isCompleted = uqeCompletedIds.includes(questDef.id);

            // Check if prerequisites are met (requires field)
            let prereqMet = true;
            if (questDef.requires) {
                prereqMet = uqeCompletedIds.includes(questDef.requires);
            }

            // Only show quest if: not active, not completed, and prereqs met
            if (!isActive && !isCompleted && prereqMet) {
                activeDialog.nodes.start.choices.unshift({
                    text: questDef.title,
                    isQuest: true,
                    action: 'quest_accept_v2',
                    questId: questDef.id,
                    next: 'quest_accepted',
                    condition: (stats) => !isQuestActive(questDef.id) && !isQuestCompleted(questDef.id)
                });

                // Create the acceptance node if not already present
                if (!activeDialog.nodes.quest_accepted) {
                    activeDialog.nodes.quest_accepted = {
                        text: `Excellent. Here's what I need you to do: ${questDef.description}`,
                        choices: [{ text: 'I\'ll get right on it', next: 'end' }]
                    };
                }
            }
        });
    }

    currentDialog = activeDialog;
    currentDialogNode = 'start';
    currentShopNPC = npc; // Store reference for shop
    dialogVisible = true;

    createDialogUI(npc);
    showDialogNode('start');
}

/**
 * Show a specific dialog node
 */
function showDialogNode(nodeId) {
    if (!currentDialog || !currentDialog.nodes[nodeId]) {
        closeDialog();
        return;
    }

    currentDialogNode = nodeId;
    const node = currentDialog.nodes[nodeId];

    updateDialogUI(node);

    // If no choices, auto-close after a moment
    if (node.choices.length === 0) {
        game.scene.scenes[0].time.delayedCall(2000, () => {
            closeDialog();
        });
    }
}

/**
 * Create dialog UI panel
 */
function createDialogUI(npc) {
    const scene = game.scene.scenes[0];

    const panelWidth = 700;
    const panelHeight = 620;
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2 + 50;

    dialogPanel = {
        bg: scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0xffffff),
        npcNameText: scene.add.text(centerX - panelWidth / 2 + 20, centerY - panelHeight / 2 + 20,
            `${npc.name}${npc.title ? ' - ' + npc.title : ''}`, {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(401).setOrigin(0, 0),
        dialogText: null,
        choiceButtons: []
    };
}

/**
 * Update dialog UI with current node
 */
function updateDialogUI(node) {
    const scene = game.scene.scenes[0];
    if (!dialogPanel) return;

    // Clear previous dialog text and choices
    if (dialogPanel.dialogText) {
        dialogPanel.dialogText.destroy();
    }
    dialogPanel.choiceButtons.forEach(btn => {
        if (btn.bg) btn.bg.destroy();
        if (btn.text) btn.text.destroy();
    });
    dialogPanel.choiceButtons = [];

    const centerX = dialogPanel.bg.x;
    const centerY = dialogPanel.bg.y;
    const panelWidth = 700;
    const panelHeight = 620; // Increased to fit longer text like tutorials

    // Dialog text
    dialogPanel.dialogText = scene.add.text(
        centerX - panelWidth / 2 + 20,
        centerY - panelHeight / 2 + 70,
        node.text,
        {
            fontSize: '18px',
            fill: '#ffffff',
            wordWrap: { width: panelWidth - 40 }
        }
    ).setScrollFactor(0).setDepth(401).setOrigin(0, 0);

    // Choice buttons - position below dialog text with proper spacing
    const textBounds = dialogPanel.dialogText.getBounds();
    const startY = textBounds.bottom + 30; // 30px padding after text
    const buttonHeight = 40;
    const buttonSpacing = 10;

    let visibleChoiceCount = 0;
    node.choices.forEach((choice) => {
        // Skip choices that don't meet their condition
        if (choice.condition) {
            try {
                const result = choice.condition(playerStats);
                console.log(`[UQE] Choice '${choice.text}' (Quest: ${choice.questId || 'none'}, Action: ${choice.action || 'next'}) condition: ${result}`);
                if (!result) return;
            } catch (err) {
                console.error(`❌ [Dialog] Condition error for '${choice.text}':`, err);
                return; // Hide on error for safety
            }
        }

        const buttonY = startY + visibleChoiceCount * (buttonHeight + buttonSpacing);
        visibleChoiceCount++;
        const buttonWidth = panelWidth - 40;

        // Button background
        const buttonBg = scene.add.rectangle(
            centerX,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x333333,
            0.9
        ).setScrollFactor(0).setDepth(401)
            .setStrokeStyle(2, 0x666666)
            .setInteractive({ useHandCursor: true });

        // Button text
        const isQuest = choice.isQuest;
        const displayText = isQuest ? `(!) ${choice.text}` : choice.text;

        const buttonText = scene.add.text(
            centerX,
            buttonY,
            displayText,
            {
                fontSize: '16px',
                fill: '#ffffff'
            }
        ).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

        // Apply yellow color to the marker if it's a quest
        if (isQuest) {
            buttonText.setFill('#ffff00');
        }

        // Button hover effects
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x444444);
        });
        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x333333);
        });

        // Button click handler
        buttonBg.on('pointerdown', () => {
            const questId = choice.questId;
            const action = choice.action;

            if (action === 'open_shop') {
                openShop(currentShopNPC);
            } else if (action === 'quest_advance' || action === 'quest_accept' || action === 'quest_accept_side' || action === 'quest_accept_v2') {
                // UNIFIED UQE BRIDGE REDIRECT with PREVIEW MODAL
                const questEngine = window.uqe;
                if (questId && typeof questEngine !== 'undefined' && questEngine.allDefinitions[questId]) {
                    console.log(`🔗 [UQE Bridge] Showing preview for quest: ${questId}`);

                    // Store current NPC for reopening dialog on decline
                    const currentNPC = dialogPanel ? dialogPanel.npc : null;

                    // Close dialog first
                    closeDialog();

                    // Show quest preview modal
                    showQuestPreviewModal(questId,
                        // On Accept
                        () => {
                            questEngine.acceptQuest(questId);

                            // Sync: Remove from legacy lists if it exists there
                            playerStats.quests.main = playerStats.quests.main.filter(q => q.id !== questId);
                            playerStats.quests.active = playerStats.quests.active.filter(q => q.id !== questId);
                            playerStats.quests.available = playerStats.quests.available.filter(q => q.id !== questId);

                            showDamageNumber(player.x, player.y - 40, "Quest Accepted!", 0x00ff00);
                            playSound('item_pickup');

                            // Update the quest tracker HUD to show the new quest
                            updateQuestTrackerHUD();
                        },
                        // On Decline - reopen dialog with NPC
                        () => {
                            if (currentNPC) {
                                startDialog(currentNPC);
                            }
                        }
                    );
                } else if (action === 'quest_advance') {
                    advanceQuest(questId);
                    if (choice.next) {
                        showDialogNode(choice.next);
                    } else {
                        closeDialog();
                    }
                } else if (action === 'quest_accept') {
                    acceptMainQuest(questId);
                    if (choice.next) {
                        showDialogNode(choice.next);
                    } else {
                        closeDialog();
                    }
                } else if (action === 'quest_accept_side') {
                    acceptSideQuest(questId);
                    if (choice.next) {
                        showDialogNode(choice.next);
                    } else {
                        closeDialog();
                    }
                }
            } else if (action === 'accept_all') {
                acceptAllAvailableQuests();
                if (choice.next) {
                    showDialogNode(choice.next);
                } else {
                    closeDialog();
                }
            } else if (choice.next) {
                showDialogNode(choice.next);
            } else {
                closeDialog();
            }
        });

        dialogPanel.choiceButtons.push({
            bg: buttonBg,
            text: buttonText,
            choice: choice
        });
    });

    // Dynamically resize panel to fit content
    const bottomPadding = 30;
    const topY = dialogPanel.npcNameText.y - 20;
    let panelBottom;

    if (visibleChoiceCount > 0) {
        const lastButtonY = startY + (visibleChoiceCount - 1) * (buttonHeight + buttonSpacing);
        panelBottom = lastButtonY + buttonHeight / 2 + bottomPadding;
    } else {
        // No buttons - just use text bottom
        panelBottom = textBounds.bottom + bottomPadding;
    }

    const actualHeight = panelBottom - topY;
    const newCenterY = topY + actualHeight / 2;

    dialogPanel.bg.setSize(panelWidth, actualHeight);
    dialogPanel.bg.setPosition(centerX, newCenterY);
}

/**
 * Close dialog
 */
function closeDialog() {
    if (dialogPanel) {
        if (dialogPanel.bg) dialogPanel.bg.destroy();
        if (dialogPanel.npcNameText) dialogPanel.npcNameText.destroy();
        if (dialogPanel.dialogText) dialogPanel.dialogText.destroy();

        dialogPanel.choiceButtons.forEach(btn => {
            if (btn.bg) btn.bg.destroy();
            if (btn.text) btn.text.destroy();
        });

        dialogPanel = null;
    }

    currentDialog = null;
    currentDialogNode = null;
    currentShopNPC = null;
    dialogVisible = false;
}

// ============================================
// SHOP SYSTEM
// ============================================

/**
 * Shop inventory (items available for purchase)
 */
const shopInventory = [
    { type: 'weapon', name: 'Iron Sword', quality: 'Common', attackPower: 5, price: 50 },
    { type: 'weapon', name: 'Steel Blade', quality: 'Uncommon', attackPower: 8, price: 100 },
    { type: 'armor', name: 'Leather Armor', quality: 'Common', defense: 3, price: 40 },
    { type: 'armor', name: 'Chain Mail', quality: 'Uncommon', defense: 5, price: 80 },
    { type: 'helmet', name: 'Iron Helmet', quality: 'Common', defense: 2, price: 30 },
    { type: 'helmet', name: 'Steel Helmet', quality: 'Uncommon', defense: 4, price: 60 },
    { type: 'ring', name: 'Bronze Ring', quality: 'Common', attackPower: 1, defense: 1, price: 40 },
    { type: 'ring', name: 'Silver Ring', quality: 'Uncommon', attackPower: 3, defense: 2, price: 80 },
    { type: 'amulet', name: 'Copper Amulet', quality: 'Common', defense: 2, maxHp: 10, price: 50 },
    { type: 'amulet', name: 'Gold Amulet', quality: 'Uncommon', defense: 4, maxHp: 20, price: 100 },
    { type: 'boots', name: 'Leather Boots', quality: 'Common', defense: 1, speed: 5, price: 25 },
    { type: 'boots', name: 'Steel Boots', quality: 'Uncommon', defense: 3, speed: 10, price: 50 },
    { type: 'consumable', name: 'Health Potion', quality: 'Common', healAmount: 50, price: 20 }
];

/**
 * Open shop UI
 */
function openShop(npc) {
    if (!npc || !npc.merchant) return;

    // Close all other interfaces before opening shop
    closeAllInterfaces();
    closeDialog(); // Also close dialog if open

    shopVisible = true;
    currentShopNPC = npc; // Set current merchant
    createShopUI(npc);
}


/**
 * Create shop UI panel - split into left (shop items) and right (player inventory) panels
 */
function createShopUI(npc) {
    const scene = game.scene.scenes[0];

    // Calculate panel dimensions - each panel is half the game width
    const gameWidth = 1024;
    const gameHeight = 768;
    const panelWidth = gameWidth / 2;
    const panelHeight = gameHeight;
    const leftPanelX = panelWidth / 2;
    const rightPanelX = panelWidth + panelWidth / 2;
    const centerY = gameHeight / 2;

    // Left panel - Shop Items
    const leftBg = scene.add.rectangle(leftPanelX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0xffffff);

    // Right panel - Player Inventory
    const rightBg = scene.add.rectangle(rightPanelX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0xffffff);

    // Divider line between panels
    const dividerGraphics = scene.add.graphics();
    dividerGraphics.lineStyle(2, 0xffffff, 0.5);
    dividerGraphics.lineBetween(panelWidth, 0, panelWidth, gameHeight);
    dividerGraphics.setScrollFactor(0).setDepth(401);
    const divider = dividerGraphics;

    // --- Right Panel: Player Inventory ---
    const inventoryStartY = 100;
    const inventoryEndY = gameHeight - 20;
    const inventoryVisibleHeight = inventoryEndY - inventoryStartY;
    const inventoryContainerOffset = 60;
    const inventoryContainer = scene.add.container(rightPanelX, inventoryStartY - inventoryContainerOffset);
    inventoryContainer.setScrollFactor(0).setDepth(401);

    const inventoryMaskTopOffset = 30;
    const inventoryMask = scene.make.graphics();
    inventoryMask.fillStyle(0xffffff);
    inventoryMask.fillRect(rightPanelX - panelWidth / 2, inventoryStartY - inventoryMaskTopOffset, panelWidth, inventoryVisibleHeight + inventoryMaskTopOffset);
    inventoryMask.setScrollFactor(0);
    const inventoryMaskGeometry = inventoryMask.createGeometryMask();
    inventoryContainer.setMask(inventoryMaskGeometry);

    const inventoryScrollbar = setupScrollbar({
        scene,
        x: rightPanelX + panelWidth / 2 - 22,
        y: inventoryStartY,
        height: inventoryVisibleHeight,
        depth: 403,
        minScroll: -30,
        initialScroll: -30,
        container: inventoryContainer,
        containerStartY: inventoryStartY,
        containerOffset: inventoryContainerOffset,
        wheelHitArea: rightBg,
        visibleHeight: inventoryVisibleHeight
    });

    // --- Left Panel: Shop Items ---
    const shopStartY = 100;
    const shopVisibleHeight = gameHeight - 120;
    const shopItemsContainer = scene.add.container(leftPanelX, shopStartY);
    shopItemsContainer.setScrollFactor(0).setDepth(401);

    const shopMask = scene.make.graphics();
    shopMask.fillStyle(0xffffff);
    shopMask.fillRect(leftPanelX - panelWidth / 2, shopStartY, panelWidth, shopVisibleHeight);
    shopMask.setScrollFactor(0);
    const shopMaskGeometry = shopMask.createGeometryMask();
    shopItemsContainer.setMask(shopMaskGeometry);

    const shopItemsScrollbar = setupScrollbar({
        scene,
        x: leftPanelX + panelWidth / 2 - 22,
        y: shopStartY,
        height: shopVisibleHeight,
        depth: 403,
        minScroll: 0,
        initialScroll: 0,
        container: shopItemsContainer,
        containerStartY: shopStartY,
        containerOffset: 0,
        wheelHitArea: leftBg,
        visibleHeight: shopVisibleHeight
    });

    shopPanel = {
        leftBg: leftBg,
        rightBg: rightBg,
        divider: divider,
        leftTitle: scene.add.text(leftPanelX, 30, `${npc.name}'s Shop`, {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0),
        rightTitle: scene.add.text(rightPanelX, 30, 'Your Inventory (Click to Sell)', {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0),
        closeText: scene.add.text(gameWidth - 20, 20, 'Press F to Close', {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(401).setOrigin(1, 0),
        goldText: null,
        items: [],
        inventoryItems: [],
        shopItemsContainer: shopItemsContainer,
        shopItemsScrollbar: shopItemsScrollbar,
        inventoryContainer: inventoryContainer,
        inventoryScrollbar: inventoryScrollbar,
        inventoryVisibleHeight: inventoryVisibleHeight,
        shopVisibleHeight: shopVisibleHeight,
        inventoryContainerOffset: inventoryContainerOffset,
        minScroll: -30,
        shopMask: shopMask,
        inventoryMask: inventoryMask
    };



    // Show current gold - positioned in left panel (moved up to avoid overlap with title)
    shopPanel.goldText = scene.add.text(leftPanelX - panelWidth / 2 + 20, 15, `Gold: ${playerStats.gold}`, {
        fontSize: '20px',
        fill: '#ffd700',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(401).setOrigin(0, 0);

    updateShopItems();
    updateShopInventoryItems();
}

/**
 * Update shop items display
 */
function updateShopItems() {
    const scene = game.scene.scenes[0];
    if (!shopPanel || !currentShopNPC) return;

    // Clear existing shop items
    shopPanel.items.forEach(item => {
        if (item.bg && item.bg.active) item.bg.destroy();
        if (item.sprite && item.sprite.active) item.sprite.destroy();
        if (item.nameText && item.nameText.active) item.nameText.destroy();
        if (item.statsText && item.statsText.active) item.statsText.destroy();
        if (item.priceText && item.priceText.active) item.priceText.destroy();
        if (item.buyButton && item.buyButton.active) item.buyButton.destroy();
        if (item.buyText && item.buyText.active) item.buyText.destroy();
        if (item.borderRect && item.borderRect.active) item.borderRect.destroy();
    });
    shopPanel.items = [];
    if (shopPanel.shopItemsContainer) {
        shopPanel.shopItemsContainer.removeAll(true);
    }

    const itemsToDisplay = (currentShopNPC && currentShopNPC.inventory) ? currentShopNPC.inventory : shopInventory;

    const panelWidth = shopPanel.leftBg.width;
    const panelHeight = shopPanel.leftBg.height; // This is the full panel height, not just visible area
    const leftPanelX = shopPanel.leftBg.x;
    const startY = 50; // Relative to container
    const itemHeight = 100; // Increased to accommodate stats/price
    const spacing = 20; // Increased spacing between rows

    const visibleAreaHeight = shopPanel.shopVisibleHeight;

    // Update gold display
    if (shopPanel.goldText) {
        shopPanel.goldText.setText(`Gold: ${playerStats.gold}`);
    }

    itemsToDisplay.forEach((item, index) => {

        const itemY = startY + index * (itemHeight + spacing);
        const itemWidth = panelWidth - 60;
        const x = 0; // Center of container (which is at leftPanelX)

        const itemBg = scene.add.rectangle(x, itemY, itemWidth, itemHeight, 0x333333, 0.8)
            .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x666666);

        // Item sprite - map item types to sprite keys
        let spriteKey = 'item_weapon'; // Default fallback
        if (item.type === 'weapon') spriteKey = 'item_weapon';
        else if (item.type === 'armor') spriteKey = 'item_armor';
        else if (item.type === 'helmet') spriteKey = 'item_helmet';
        else if (item.type === 'ring') spriteKey = 'item_ring';
        else if (item.type === 'amulet') spriteKey = 'item_amulet';
        else if (item.type === 'boots') spriteKey = 'item_boots';
        else if (item.type === 'gloves') spriteKey = 'item_gloves';
        else if (item.type === 'belt') spriteKey = 'item_belt';
        else if (item.type === 'consumable') spriteKey = 'item_consumable';

        // Check if sprite key exists, use fallback if not
        let finalSpriteKey = spriteKey;
        if (!scene.textures.exists(spriteKey)) {
            console.warn(`Shop: Sprite key "${spriteKey}" not found for item type "${item.type}", checking fallbacks...`);
            // Try common fallbacks that should always exist (generated textures)
            const fallbacks = ['item_weapon', 'item_armor', 'item_helmet', 'item_ring', 'item_amulet', 'item_boots', 'item_consumable'];
            let foundFallback = false;
            for (const fallback of fallbacks) {
                if (scene.textures.exists(fallback)) {
                    finalSpriteKey = fallback;
                    foundFallback = true;
                    console.warn(`Shop: Using fallback "${fallback}" for item "${item.name}"`);
                    break;
                }
            }
            if (!foundFallback) {
                console.error(`Shop: No fallback sprites found! Item: ${item.name}, Type: ${item.type}. Will create placeholder.`);
                // Use a default that should exist
                finalSpriteKey = 'item_weapon';
            }
        }

        let itemSprite;
        let borderRect = null; // Declare outside try block so it's accessible later

        try {
            itemSprite = scene.add.sprite(x - itemWidth / 2 + 30, itemY, finalSpriteKey);
            if (itemSprite) {
                itemSprite.setScrollFactor(0).setDepth(402).setScale(1.2);

                // Check if this is a custom image (not a generated fallback)
                // Custom images: weapon, armor, helmet, amulet, boots, gloves, belt, ring, consumable
                const customImageKeys = ['item_weapon', 'item_armor', 'item_helmet', 'item_amulet', 'item_boots', 'item_gloves', 'item_belt', 'item_ring', 'item_consumable'];
                const isCustomImage = customImageKeys.includes(finalSpriteKey) && finalSpriteKey === spriteKey;

                // Don't tint custom images - they already have their own colors
                // Only tint generated fallback sprites to show quality
                if (!isCustomImage) {
                    const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
                    itemSprite.setTint(qualityColor);
                }
                // Custom images are left untinted to preserve their appearance

                // Add quality border around the sprite
                const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
                const borderWidth = 3;
                const spriteSize = 32 * 1.2; // Match sprite scale
                borderRect = scene.add.rectangle(x - itemWidth / 2 + 30, itemY, spriteSize + borderWidth * 2, spriteSize + borderWidth * 2, qualityColor, 0)
                    .setStrokeStyle(borderWidth, qualityColor)
                    .setScrollFactor(0)
                    .setDepth(401); // Behind sprite but visible

                console.log(`Shop: Successfully created sprite for "${item.name}" using "${finalSpriteKey}"`);
            }
        } catch (error) {
            console.error(`Shop: Failed to create sprite for item "${item.name}":`, error);
            // Create a placeholder rectangle if sprite creation fails
            itemSprite = scene.add.rectangle(x - itemWidth / 2 + 30, itemY, 32, 32, 0x888888, 1.0)
                .setScrollFactor(0).setDepth(402);
        }

        // Item name
        const nameText = scene.add.text(x - itemWidth / 2 + 80, itemY - 15, item.name, {
            fontSize: '18px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(402).setOrigin(0, 0.5);

        // Item stats
        let statsText = '';
        const stats = [];
        if (item.attackPower) stats.push(`Attack: +${item.attackPower}`);
        if (item.defense) stats.push(`Defense: +${item.defense}`);
        if (item.maxHp) stats.push(`Max HP: +${item.maxHp}`);
        if (item.speed) stats.push(`Speed: +${item.speed}`);
        if (item.healAmount) stats.push(`Heals: ${item.healAmount} HP`);
        statsText = stats.join(' | ');

        const statsTextObj = scene.add.text(x - itemWidth / 2 + 80, itemY + 15, statsText, {
            fontSize: '14px',
            fill: '#cccccc'
        }).setScrollFactor(0).setDepth(402).setOrigin(0, 0.5);

        // Price
        const priceText = scene.add.text(x + itemWidth / 2 - 140, itemY, `${item.price} Gold`, {
            fontSize: '18px',
            fill: '#ffd700',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

        // Buy button
        const buyButton = scene.add.rectangle(
            x + itemWidth / 2 - 60,
            itemY,
            80,
            40,
            0x00aa00,
            0.9
        ).setScrollFactor(0).setDepth(401)
            .setStrokeStyle(2, 0x00ff00)
            .setInteractive({ useHandCursor: true });

        const buyText = scene.add.text(x + itemWidth / 2 - 60, itemY, 'Buy', {
            fontSize: '16px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

        // Button hover
        buyButton.on('pointerover', () => {
            buyButton.setFillStyle(0x00cc00);
        });
        buyButton.on('pointerout', () => {
            buyButton.setFillStyle(0x00aa00);
        });

        // Buy handler
        buyButton.on('pointerdown', () => {
            buyItem(item, item.price);
        });

        // Hover effects
        const onBuyHoverIn = () => {
            // Tooltip position needs to be absolute, so add container's world Y
            showTooltip(item, leftPanelX, shopPanel.shopItemsContainer.y + itemY, 'shop_buy');
        };
        const onBuyHoverOut = () => {
            hideTooltip();
        };

        itemBg.setInteractive({ useHandCursor: true });
        itemSprite.setInteractive({ useHandCursor: true });
        if (borderRect) borderRect.setInteractive({ useHandCursor: true });

        itemBg.on('pointerover', onBuyHoverIn);
        itemBg.on('pointerout', onBuyHoverOut);
        itemSprite.on('pointerover', onBuyHoverIn);
        itemSprite.on('pointerout', onBuyHoverOut);
        if (borderRect) {
            borderRect.on('pointerover', onBuyHoverIn);
            borderRect.on('pointerout', onBuyHoverOut);
        }

        shopPanel.shopItemsContainer.add([itemBg, itemSprite, borderRect, nameText, statsTextObj, priceText, buyButton, buyText]);

        shopPanel.items.push({
            bg: itemBg,
            sprite: itemSprite,
            nameText: nameText,
            statsText: statsTextObj,
            priceText: priceText,
            buyButton: buyButton,
            buyText: buyText,
            borderRect: borderRect, // Store border for cleanup
            item: item,
            baseY: itemY // Store base position for scrolling (relative to container)
        });
    });

    const totalContentHeight = itemsToDisplay.length * (itemHeight + spacing) + startY;

    if (shopPanel.shopItemsScrollbar) {
        shopPanel.shopItemsScrollbar.updateMaxScroll(Math.max(0, totalContentHeight - visibleAreaHeight), totalContentHeight);
    }
}

/**
 * Buy item from shop
 */
function buyItem(item, price) {
    if (playerStats.gold < price) {
        showDamageNumber(player.x, player.y - 40, 'Not enough gold!', 0xff0000);
        return;
    }

    // Hide any tooltips before refreshing
    hideTooltip(true);

    // Create item copy for inventory
    const purchasedItem = {
        ...item,
        id: `shop_${Date.now()}_${Math.random()}`
    };

    playerStats.gold -= price;
    playerStats.inventory.push(purchasedItem);

    // Update gold display
    if (shopPanel.goldText) {
        shopPanel.goldText.setText(`Gold: ${playerStats.gold}`);
    }

    showDamageNumber(player.x, player.y - 40, `Bought ${item.name}!`, 0x00ff00);

    // Refresh shop UI
    updateShopItems();
    updateShopInventoryItems(); // Update right panel inventory

    // Refresh inventory if open (this will also hide tooltips)
    if (inventoryVisible) {
        refreshInventory();
    }
}

/**
 * Update shop inventory items display (right panel - player inventory for selling)
 */
function updateShopInventoryItems() {
    const scene = game.scene.scenes[0];
    if (!shopPanel) return;

    // Clear existing inventory items
    shopPanel.inventoryItems.forEach(item => {
        if (item.bg && item.bg.active) item.bg.destroy();
        if (item.sprite && item.sprite.active) item.sprite.destroy();
        if (item.nameText && item.nameText.active) item.nameText.destroy();
        if (item.priceText && item.priceText.active) item.priceText.destroy();
        if (item.borderRect && item.borderRect.active) item.borderRect.destroy();
    });
    shopPanel.inventoryItems = [];

    // Clear container
    if (shopPanel.inventoryContainer) {
        shopPanel.inventoryContainer.removeAll(true);
    }

    const rightPanelX = shopPanel.rightBg.x;
    const inventoryItems = playerStats.inventory;

    if (inventoryItems.length === 0) {
        const emptyText = scene.add.text(rightPanelX, 200, 'Inventory is empty', {
            fontSize: '16px',
            fill: '#888888',
            fontStyle: 'italic'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);
        shopPanel.inventoryItems.push({ label: emptyText });
        // Hide scrollbar when empty
        if (shopPanel.scrollbarTrack) shopPanel.scrollbarTrack.setVisible(false);
        if (shopPanel.scrollbarThumb) shopPanel.scrollbarThumb.setVisible(false);
        return;
    }

    // Display items in a grid in right panel with dynamic row heights
    const itemSize = 60;
    const spacing = 15;
    const itemsPerRow = 6;
    const gridWidth = itemsPerRow * itemSize + (itemsPerRow - 1) * spacing;
    const startX = -gridWidth / 2 + itemSize / 2; // Relative to container center
    const topPadding = 45; // Increased to ensure first row isn't cut off
    const startY = topPadding;


    // First, create all items and measure their heights
    const itemData = [];
    inventoryItems.forEach((item, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * (itemSize + spacing);

        // Create temporary text to measure height (we'll recreate it properly below)
        const tempNameText = scene.add.text(0, 0, item.name, {
            fontSize: '11px',
            fill: '#ffffff',
            wordWrap: { width: itemSize + 10 }
        });
        const nameTextHeight = tempNameText.height;
        tempNameText.destroy();

        // Calculate total item height: sprite + name + price + spacing
        const spriteHeight = itemSize;
        const nameStartOffset = 5;
        const priceHeight = 10;
        const priceSpacing = 4; // Reduced from 8 to 4 for tighter spacing between label and price
        const itemTotalHeight = spriteHeight + nameStartOffset + nameTextHeight + priceSpacing + priceHeight;

        itemData.push({
            item: item,
            row: row,
            col: col,
            x: x,
            nameTextHeight: nameTextHeight,
            itemTotalHeight: itemTotalHeight
        });
    });

    // Group items by row and find the tallest item in each row
    const rowHeights = {};
    const totalRows = Math.ceil(inventoryItems.length / itemsPerRow);

    for (let r = 0; r < totalRows; r++) {
        const rowItems = itemData.filter(data => data.row === r);
        const maxHeight = Math.max(...rowItems.map(data => data.itemTotalHeight));
        rowHeights[r] = maxHeight;
    }

    // Calculate cumulative Y positions for each row
    const rowYPositions = {};
    let currentY = startY;
    for (let r = 0; r < totalRows; r++) {
        rowYPositions[r] = currentY;
        currentY += rowHeights[r] + spacing; // Add spacing between rows
    }

    // Calculate total content height based on actual row heights
    // Include top padding in total height calculation

    // Now create items with proper positioning
    itemData.forEach((data, index) => {
        const { item, row, col, x, nameTextHeight } = data;
        const y = rowYPositions[row];

        // Get item sprite key based on type
        let spriteKey = 'item_weapon';
        if (item.type === 'weapon') {
            // For weapons, use weapon-specific sprite based on weaponType
            const weaponType = item.weaponType || 'Sword';
            const weaponKey = `weapon_${weaponType.toLowerCase()}`;
            // Check if weapon-specific sprite exists, otherwise fallback to item_weapon
            if (scene.textures.exists(weaponKey)) {
                spriteKey = weaponKey;
            } else {
                spriteKey = 'item_weapon'; // Fallback
            }
        } else if (item.type === 'armor') spriteKey = 'item_armor';
        else if (item.type === 'helmet') spriteKey = 'item_helmet';
        else if (item.type === 'ring') spriteKey = 'item_ring';
        else if (item.type === 'amulet') spriteKey = 'item_amulet';
        else if (item.type === 'boots') spriteKey = 'item_boots';
        else if (item.type === 'gloves') spriteKey = 'item_gloves';
        else if (item.type === 'belt') spriteKey = 'item_belt';
        else if (item.type === 'consumable') spriteKey = 'item_consumable';
        else if (item.type === 'gold') spriteKey = 'item_gold';

        // Create item sprite with background (add to container)
        const itemBg = scene.add.rectangle(x, y, itemSize, itemSize, 0x222222, 0.8)
            .setScrollFactor(0).setDepth(400).setStrokeStyle(1, 0x444444);

        const itemSprite = scene.add.sprite(x, y, spriteKey);
        itemSprite.setScrollFactor(0).setDepth(402).setScale(0.8);

        // Add quality border
        const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
        const borderWidth = 2;
        const spriteSize = itemSize * 0.8;
        const borderRect = scene.add.rectangle(x, y, spriteSize + borderWidth * 2, spriteSize + borderWidth * 2, qualityColor, 0)
            .setStrokeStyle(borderWidth, qualityColor)
            .setScrollFactor(0)
            .setDepth(400.5);

        // Item name below sprite
        const itemNameText = scene.add.text(x, y + itemSize / 2 + 5, item.name, {
            fontSize: '11px',
            fill: '#ffffff',
            wordWrap: { width: itemSize + 10 }
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0);

        // Calculate sell price (typically 50% of buy price, or a base value)
        const sellPrice = item.price ? Math.floor(item.price * 0.5) : calculateItemSellPrice(item);
        // Position price below item name using actual measured height
        // Start of name (5px below sprite center) + actual name height + reduced spacing
        const priceY = y + itemSize / 2 + 5 + nameTextHeight + 4; // Reduced from 8 to 4 for tighter spacing
        const priceText = scene.add.text(x, priceY, `${sellPrice}G`, {
            fontSize: '10px',
            fill: '#ffd700'
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0);

        // Add all items to container (this fixes the positioning issue)
        shopPanel.inventoryContainer.add([itemBg, itemSprite, borderRect, itemNameText, priceText]);

        // Hover effects for selling
        const onSellHoverIn = (pointer) => {
            if (pointer) pointer.event.stopPropagation();
            showTooltip(item, rightPanelX + x, shopPanel.inventoryContainer.y + y, 'shop_sell');
        };
        const onSellHoverOut = () => {
            hideTooltip();
        };

        itemSprite.setInteractive({ useHandCursor: true });
        itemBg.setInteractive({ useHandCursor: true });
        borderRect.setInteractive({ useHandCursor: true });

        itemSprite.on('pointerover', onSellHoverIn);
        itemSprite.on('pointerout', onSellHoverOut);
        itemBg.on('pointerover', onSellHoverIn);
        itemBg.on('pointerout', onSellHoverOut);
        borderRect.on('pointerover', onSellHoverIn);
        borderRect.on('pointerout', onSellHoverOut);

        const sellItem = () => {
            // Remove item from inventory
            const itemIndex = playerStats.inventory.indexOf(item);
            if (itemIndex > -1) {
                playerStats.inventory.splice(itemIndex, 1);
                playerStats.gold += sellPrice;

                // Update displays
                updateShopItems();
                updateShopInventoryItems();

                showDamageNumber(player.x, player.y - 40, `Sold ${item.name} for ${sellPrice} Gold!`, 0x00ff00);
                addChatMessage(`Sold ${item.name} for ${sellPrice} Gold`, 0xffd700, '💰');
            }
        };

        itemSprite.on('pointerdown', sellItem);
        itemBg.on('pointerdown', sellItem);
        borderRect.on('pointerdown', sellItem);

        // Hover effects
        const hoverIn = () => {
            itemBg.setStrokeStyle(2, 0xffff00);
            itemBg.setFillStyle(0x333333, 1.0);
        };
        const hoverOut = () => {
            itemBg.setStrokeStyle(1, 0x444444);
            itemBg.setFillStyle(0x222222, 0.8);
        };

        itemSprite.on('pointerover', hoverIn);
        itemBg.on('pointerover', hoverIn);
        borderRect.on('pointerover', hoverIn);
        itemSprite.on('pointerout', hoverOut);
        itemBg.on('pointerout', hoverOut);
        borderRect.on('pointerout', hoverOut);

        shopPanel.inventoryItems.push({
            bg: itemBg,
            sprite: itemSprite,
            nameText: itemNameText,
            priceText: priceText,
            borderRect: borderRect,
            item: item
        });
    });

    // Calculate and update scroll limits
    const inventoryTotalHeight = currentY - spacing;
    if (shopPanel.inventoryScrollbar) {
        shopPanel.inventoryScrollbar.updateMaxScroll(Math.max(0, inventoryTotalHeight - shopPanel.inventoryVisibleHeight - shopPanel.inventoryContainerOffset), inventoryTotalHeight);
        // Reset scroll position to top
        shopPanel.inventoryScrollbar.setScroll(shopPanel.minScroll || 0);
    }
}


/**
 * Calculate sell price for an item (if it doesn't have a price property)
 */
function calculateItemSellPrice(item) {
    // Base prices by quality
    const qualityMultiplier = {
        'Common': 10,
        'Uncommon': 25,
        'Rare': 50,
        'Epic': 100,
        'Legendary': 200
    };

    let basePrice = qualityMultiplier[item.quality] || 10;

    // Add value based on stats
    if (item.attackPower) basePrice += item.attackPower * 2;
    if (item.defense) basePrice += item.defense * 2;
    if (item.maxHp) basePrice += item.maxHp;
    if (item.speed) basePrice += item.speed * 3;
    if (item.healAmount) basePrice += item.healAmount;

    return Math.floor(basePrice * 0.5); // 50% of calculated value
}

/**
 * Close shop
 */
function closeShop() {
    // Hide tooltips first
    hideTooltip(true);

    if (shopPanel) {
        // Destroy panel backgrounds
        if (shopPanel.leftBg && shopPanel.leftBg.active) shopPanel.leftBg.destroy();
        if (shopPanel.rightBg && shopPanel.rightBg.active) shopPanel.rightBg.destroy();
        if (shopPanel.divider && shopPanel.divider.active) shopPanel.divider.destroy();
        if (shopPanel.leftTitle && shopPanel.leftTitle.active) shopPanel.leftTitle.destroy();
        if (shopPanel.rightTitle && shopPanel.rightTitle.active) shopPanel.rightTitle.destroy();
        if (shopPanel.closeText && shopPanel.closeText.active) shopPanel.closeText.destroy();
        if (shopPanel.goldText && shopPanel.goldText.active) shopPanel.goldText.destroy();
        if (shopPanel.shopMask && shopPanel.shopMask.active) shopPanel.shopMask.destroy();
        if (shopPanel.inventoryMask && shopPanel.inventoryMask.active) shopPanel.inventoryMask.destroy();
        if (shopPanel.shopItemsContainer && shopPanel.shopItemsContainer.active) shopPanel.shopItemsContainer.destroy();
        if (shopPanel.inventoryContainer && shopPanel.inventoryContainer.active) shopPanel.inventoryContainer.destroy();


        // Destroy scrollbars
        if (shopPanel.shopItemsScrollbar) shopPanel.shopItemsScrollbar.destroy();
        if (shopPanel.inventoryScrollbar) shopPanel.inventoryScrollbar.destroy();

        // Destroy all shop item elements (left panel)
        shopPanel.items.forEach(item => {
            if (item.bg && item.bg.active) item.bg.destroy();
            if (item.sprite && item.sprite.active) item.sprite.destroy();
            if (item.nameText && item.nameText.active) item.nameText.destroy();
            if (item.statsText && item.statsText.active) item.statsText.destroy();
            if (item.priceText && item.priceText.active) item.priceText.destroy();
            if (item.buyButton && item.buyButton.active) item.buyButton.destroy();
            if (item.buyText && item.buyText.active) item.buyText.destroy();
            if (item.borderRect && item.borderRect.active) item.borderRect.destroy();
        });

        // Destroy all inventory item elements (right panel)
        shopPanel.inventoryItems.forEach(item => {
            if (item.bg && item.bg.active) item.bg.destroy();
            if (item.sprite && item.sprite.active) item.sprite.destroy();
            if (item.nameText && item.nameText.active) item.nameText.destroy();
            if (item.priceText && item.priceText.active) item.priceText.destroy();
            if (item.borderRect && item.borderRect.active) item.borderRect.destroy();
            if (item.label && item.label.active) item.label.destroy();
        });

        shopPanel.items = [];
        shopPanel.inventoryItems = [];
        shopPanel = null;
    }

    shopVisible = false;
    currentShopNPC = null;
    console.log('🛒 Shop closed');
}

// ============================================
// BUILDING INTERACTION SYSTEM
// ============================================

/**
 * Open building UI based on building type
 */
function openBuildingUI(building) {
    const scene = game.scene.scenes[0];
    currentBuilding = building;
    buildingPanelVisible = true;

    console.log(`🏠 Opening building UI for type: ${building.type}`);

    switch (building.type) {
        case 'inn':
            createInnUI();
            break;
        case 'blacksmith':
            createBlacksmithUI();
            break;
        case 'tavern':
            createTavernUI();
            break;
        case 'market':
            // Market uses shop system (Merchant Lysa), so just show a message
            showDamageNumber(player.x, player.y - 40, 'Visit Merchant Lysa for shopping!', 0xffff00);
            buildingPanelVisible = false;
            currentBuilding = null;
            break;
        case 'shop':
            // Shop uses NPC system (Merchant Lysa), so just show a message
            showDamageNumber(player.x, player.y - 40, 'Visit Merchant Lysa for shopping!', 0xffff00);
            buildingPanelVisible = false;
            currentBuilding = null;
            break;
        default:
            console.log(`⚠️ Building type ${building.type} not implemented yet`);
            showDamageNumber(player.x, player.y - 40, `${building.type} not yet available`, 0xff0000);
            buildingPanelVisible = false;
            currentBuilding = null;
    }
}

/**
 * Close building UI
 */
function closeBuildingUI() {
    if (buildingPanel) {
        // Destroy all UI elements
        if (buildingPanel.bg && buildingPanel.bg.active) buildingPanel.bg.destroy();
        if (buildingPanel.title && buildingPanel.title.active) buildingPanel.title.destroy();
        if (buildingPanel.closeText && buildingPanel.closeText.active) buildingPanel.closeText.destroy();

        // Destroy buttons
        if (buildingPanel.buttons) {
            buildingPanel.buttons.forEach(btn => {
                // Common elements
                if (btn.bg && btn.bg.active) btn.bg.destroy();
                if (btn.text && btn.text.active) btn.text.destroy();

                // Tavern-specific: destroy item button elements
                if (btn.sprite && btn.sprite.active) btn.sprite.destroy();
                if (btn.name && btn.name.active) btn.name.destroy();
                if (btn.price && btn.price.active) btn.price.destroy();
                if (btn.buyBg && btn.buyBg.active) btn.buyBg.destroy();
                if (btn.buyText && btn.buyText.active) btn.buyText.destroy();

                // Blacksmith-specific: destroy slot elements
                if (btn.label && btn.label.active) btn.label.destroy();
                if (btn.emptyText && btn.emptyText.active) btn.emptyText.destroy();
                if (btn.upgradeBg && btn.upgradeBg.active) btn.upgradeBg.destroy();
                if (btn.upgradeText && btn.upgradeText.active) btn.upgradeText.destroy();
            });
        }

        // Destroy tavern-specific item buttons
        if (buildingPanel.itemButtons) {
            buildingPanel.itemButtons.forEach(itemBtn => {
                if (itemBtn.bg && itemBtn.bg.active) itemBtn.bg.destroy();
                if (itemBtn.sprite && itemBtn.sprite.active) itemBtn.sprite.destroy();
                if (itemBtn.name && itemBtn.name.active) itemBtn.name.destroy();
                if (itemBtn.price && itemBtn.price.active) itemBtn.price.destroy();
                if (itemBtn.buyBg && itemBtn.buyBg.active) itemBtn.buyBg.destroy();
                if (itemBtn.buyText && itemBtn.buyText.active) itemBtn.buyText.destroy();
            });
        }

        // Destroy text elements
        if (buildingPanel.textElements) {
            buildingPanel.textElements.forEach(elem => {
                if (elem && elem.active) elem.destroy();
            });
        }

        // Destroy other elements (for blacksmith, etc.)
        if (buildingPanel.otherElements) {
            buildingPanel.otherElements.forEach(elem => {
                if (elem && elem.active) elem.destroy();
            });
        }

        buildingPanel = null;
    }

    buildingPanelVisible = false;
    currentBuilding = null;
    console.log('🏠 Building UI closed');
}

/**
 * Create Inn UI - Restore HP/mana, save game
 */
function createInnUI() {
    const scene = game.scene.scenes[0];
    const gameWidth = 1024;
    const gameHeight = 768;
    const panelWidth = 500;
    const panelHeight = 400;
    const centerX = gameWidth / 2;
    const centerY = gameHeight / 2;

    // Background panel
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0x8B4513);

    // Title
    const title = scene.add.text(centerX, centerY - 150, "The Cozy Inn", {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

    // Close text
    const closeText = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press F to Close', {
        fontSize: '14px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(401).setOrigin(1, 0);

    // Welcome message
    const welcomeText = scene.add.text(centerX, centerY - 80, 'Welcome, traveler! Rest and save your progress.', {
        fontSize: '16px',
        fill: '#cccccc',
        wordWrap: { width: panelWidth - 40 }
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

    // Current stats display
    const statsText = scene.add.text(centerX, centerY - 20,
        `HP: ${playerStats.hp}/${playerStats.maxHp} | Mana: ${playerStats.mana}/${playerStats.maxMana} | Gold: ${playerStats.gold}`, {
        fontSize: '14px',
        fill: '#ffffff'
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

    // Rest button (restore HP/mana for gold)
    const restCost = 50;
    const restButtonBg = scene.add.rectangle(centerX - 100, centerY + 60, 180, 50, 0x4a4a4a, 1)
        .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x8B4513)
        .setInteractive({ useHandCursor: true });

    const restButtonText = scene.add.text(centerX - 100, centerY + 60, `Rest (${restCost} Gold)`, {
        fontSize: '16px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

    const restAction = () => {
        if (playerStats.gold >= restCost) {
            if (playerStats.hp < playerStats.maxHp || playerStats.mana < playerStats.maxMana) {
                playerStats.gold -= restCost;
                playerStats.hp = playerStats.maxHp;
                playerStats.mana = playerStats.maxMana;
                updatePlayerStats();
                statsText.setText(`HP: ${playerStats.hp}/${playerStats.maxHp} | Mana: ${playerStats.mana}/${playerStats.maxMana} | Gold: ${playerStats.gold}`);
                showDamageNumber(player.x, player.y - 40, 'Fully Restored!', 0x00ff00);
                addChatMessage('Restored HP and Mana', 0x00ff00, '💤');
            } else {
                showDamageNumber(player.x, player.y - 40, 'Already at full health!', 0xffff00);
            }
        } else {
            showDamageNumber(player.x, player.y - 40, 'Not enough gold!', 0xff0000);
        }
    };

    restButtonBg.on('pointerdown', restAction);
    restButtonText.setInteractive({ useHandCursor: true });
    restButtonText.on('pointerdown', restAction);

    // Hover effects for rest button
    restButtonBg.on('pointerover', () => {
        restButtonBg.setFillStyle(0x5a5a5a, 1);
    });
    restButtonBg.on('pointerout', () => {
        restButtonBg.setFillStyle(0x4a4a4a, 1);
    });

    // Save button
    const saveButtonBg = scene.add.rectangle(centerX + 100, centerY + 60, 180, 50, 0x4a4a4a, 1)
        .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x8B4513)
        .setInteractive({ useHandCursor: true });

    const saveButtonText = scene.add.text(centerX + 100, centerY + 60, 'Save Game', {
        fontSize: '16px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

    const saveAction = () => {
        saveGame();
        showDamageNumber(player.x, player.y - 40, 'Game Saved!', 0x00ff00);
        addChatMessage('Game saved successfully', 0x00ff00, '💾');
    };

    saveButtonBg.on('pointerdown', saveAction);
    saveButtonText.setInteractive({ useHandCursor: true });
    saveButtonText.on('pointerdown', saveAction);

    // Hover effects for save button
    saveButtonBg.on('pointerover', () => {
        saveButtonBg.setFillStyle(0x5a5a5a, 1);
    });
    saveButtonBg.on('pointerout', () => {
        saveButtonBg.setFillStyle(0x4a4a4a, 1);
    });

    buildingPanel = {
        bg: bg,
        title: title,
        closeText: closeText,
        buttons: [
            { bg: restButtonBg, text: restButtonText },
            { bg: saveButtonBg, text: saveButtonText }
        ],
        textElements: [welcomeText, statsText]
    };
}

/**
 * Create Blacksmith UI - Upgrade/enchant equipment
 */
function createBlacksmithUI() {
    const scene = game.scene.scenes[0];
    const gameWidth = 1024;
    const gameHeight = 768;
    const panelWidth = 600;
    const panelHeight = 500;
    const centerX = gameWidth / 2;
    const centerY = gameHeight / 2;

    // Background panel
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0x696969);

    // Title
    const title = scene.add.text(centerX, centerY - 200, "Blacksmith's Forge", {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

    // Close text
    const closeText = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press F to Close', {
        fontSize: '14px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(401).setOrigin(1, 0);

    // Welcome message
    const welcomeText = scene.add.text(centerX, centerY - 140, 'I can upgrade your equipment for a price.', {
        fontSize: '16px',
        fill: '#cccccc',
        wordWrap: { width: panelWidth - 40 }
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

    // Equipment display area
    const equipmentY = centerY - 40;
    const slotSize = 60;
    const slotSpacing = 80;
    const startX = centerX - (slotSpacing * 2);

    const equipmentSlots = ['weapon', 'armor', 'helmet'];
    const slotButtons = [];

    equipmentSlots.forEach((slotType, index) => {
        const slotX = startX + (index * slotSpacing);
        const equippedItem = playerStats.equipment[slotType];

        // Slot background
        const slotBg = scene.add.rectangle(slotX, equipmentY, slotSize, slotSize, 0x333333, 1)
            .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x666666);

        // Slot label
        const slotLabel = scene.add.text(slotX, equipmentY + 40, slotType.toUpperCase(), {
            fontSize: '12px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

        if (equippedItem) {
            // Show equipped item
            const itemSprite = scene.add.sprite(slotX, equipmentY, `item_${slotType}`);
            itemSprite.setScrollFactor(0).setDepth(402).setScale(0.6);

            // Upgrade button
            const upgradeCost = Math.floor(equippedItem.price * 0.3) || 100;
            const upgradeButtonBg = scene.add.rectangle(slotX, equipmentY + 80, 100, 30, 0x4a4a4a, 1)
                .setScrollFactor(0).setDepth(401).setStrokeStyle(1, 0x8B4513)
                .setInteractive({ useHandCursor: true });

            const upgradeButtonText = scene.add.text(slotX, equipmentY + 80, `Upgrade\n${upgradeCost}G`, {
                fontSize: '11px',
                fill: '#ffffff',
                align: 'center'
            }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

            const upgradeAction = () => {
                if (playerStats.gold >= upgradeCost) {
                    playerStats.gold -= upgradeCost;

                    // Store old values for feedback
                    const oldAttack = equippedItem.attackPower || 0;
                    const oldDefense = equippedItem.defense || 0;

                    // Increase item stats by 10%
                    if (equippedItem.attackPower) {
                        equippedItem.attackPower = Math.floor(equippedItem.attackPower * 1.1);
                    }
                    if (equippedItem.defense) {
                        equippedItem.defense = Math.floor(equippedItem.defense * 1.1);
                    }

                    // Also increase maxHp, speed, and other stats if they exist
                    if (equippedItem.maxHp) {
                        equippedItem.maxHp = Math.floor(equippedItem.maxHp * 1.1);
                    }
                    if (equippedItem.speed) {
                        equippedItem.speed = Math.floor(equippedItem.speed * 1.1);
                    }

                    updatePlayerStats();
                    updateEquipment();

                    // Show detailed upgrade message
                    let upgradeMsg = `${equippedItem.name} Upgraded!`;
                    if (oldAttack > 0 && equippedItem.attackPower) {
                        upgradeMsg += ` Attack: ${oldAttack} → ${equippedItem.attackPower}`;
                    }
                    if (oldDefense > 0 && equippedItem.defense) {
                        upgradeMsg += ` Defense: ${oldDefense} → ${equippedItem.defense}`;
                    }
                    showDamageNumber(player.x, player.y - 40, upgradeMsg, 0x00ff00);
                    addChatMessage(`${equippedItem.name} upgraded (+10% stats)`, 0x00ff00, '⚒️');

                    // Update button cost
                    const newCost = Math.floor(equippedItem.price * 0.3) || 100;
                    upgradeButtonText.setText(`Upgrade\n${newCost}G`);

                    // Refresh the blacksmith UI to show updated stats
                    // Close and reopen to refresh
                    closeBuildingUI();
                    setTimeout(() => {
                        if (currentBuilding && currentBuilding.type === 'blacksmith') {
                            createBlacksmithUI();
                        }
                    }, 50);
                } else {
                    showDamageNumber(player.x, player.y - 40, 'Not enough gold!', 0xff0000);
                }
            };

            upgradeButtonBg.on('pointerdown', upgradeAction);
            upgradeButtonText.setInteractive({ useHandCursor: true });
            upgradeButtonText.on('pointerdown', upgradeAction);

            slotButtons.push({ bg: slotBg, label: slotLabel, sprite: itemSprite, upgradeBg: upgradeButtonBg, upgradeText: upgradeButtonText });
        } else {
            // Empty slot
            const emptyText = scene.add.text(slotX, equipmentY, 'Empty', {
                fontSize: '12px',
                fill: '#666666'
            }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

            slotButtons.push({ bg: slotBg, label: slotLabel, emptyText: emptyText });
        }
    });

    buildingPanel = {
        bg: bg,
        title: title,
        closeText: closeText,
        buttons: slotButtons,
        textElements: [welcomeText]
    };
}

/**
 * Create Tavern UI - Buy consumables, hear rumors
 */
function createTavernUI() {
    const scene = game.scene.scenes[0];
    const gameWidth = 1024;
    const gameHeight = 768;
    const panelWidth = 500;
    const panelHeight = 400;
    const centerX = gameWidth / 2;
    const centerY = gameHeight / 2;

    // Background panel
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0x654321);

    // Title
    const title = scene.add.text(centerX, centerY - 150, "The Rusty Tankard", {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

    // Close text
    const closeText = scene.add.text(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 20, 'Press F to Close', {
        fontSize: '14px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(401).setOrigin(1, 0);

    // Welcome message
    const welcomeText = scene.add.text(centerX, centerY - 80, 'Welcome! What can I get for you?', {
        fontSize: '16px',
        fill: '#cccccc',
        wordWrap: { width: panelWidth - 40 }
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

    // Consumables for sale
    const consumables = [
        { name: 'Health Potion', price: 25, type: 'consumable', healAmount: 50 },
        { name: 'Mana Potion', price: 20, type: 'consumable', manaAmount: 30 }
    ];

    const itemY = centerY - 20;
    const itemSpacing = 80;
    const startX = centerX - 100;
    const itemButtons = [];

    consumables.forEach((item, index) => {
        const itemX = startX + (index * itemSpacing);

        // Item display
        const itemBg = scene.add.rectangle(itemX, itemY, 70, 70, 0x333333, 1)
            .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x654321);

        const itemSprite = scene.add.sprite(itemX, itemY, 'item_consumable');
        itemSprite.setScrollFactor(0).setDepth(402).setScale(0.7);

        // Item name
        const itemName = scene.add.text(itemX, itemY + 50, item.name, {
            fontSize: '12px',
            fill: '#ffffff'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

        // Price
        const priceText = scene.add.text(itemX, itemY + 65, `${item.price} Gold`, {
            fontSize: '11px',
            fill: '#ffd700'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);

        // Buy button
        const buyButtonBg = scene.add.rectangle(itemX, itemY + 95, 60, 25, 0x4a4a4a, 1)
            .setScrollFactor(0).setDepth(401).setStrokeStyle(1, 0x654321)
            .setInteractive({ useHandCursor: true });

        const buyButtonText = scene.add.text(itemX, itemY + 95, 'Buy', {
            fontSize: '12px',
            fill: '#ffffff'
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

        const buyAction = () => {
            if (playerStats.gold >= item.price) {
                if (playerStats.inventory.length < 30) { // Max inventory size
                    playerStats.gold -= item.price;
                    playerStats.inventory.push({ ...item, id: `consumable_${Date.now()}_${Math.random()}` });
                    updatePlayerStats();
                    showDamageNumber(player.x, player.y - 40, `Bought ${item.name}!`, 0x00ff00);
                    addChatMessage(`Bought ${item.name}`, 0x00ff00, '🍺');
                } else {
                    showDamageNumber(player.x, player.y - 40, 'Inventory full!', 0xff0000);
                }
            } else {
                showDamageNumber(player.x, player.y - 40, 'Not enough gold!', 0xff0000);
            }
        };

        buyButtonBg.on('pointerdown', buyAction);
        buyButtonText.setInteractive({ useHandCursor: true });
        buyButtonText.on('pointerdown', buyAction);

        // Hover effects
        buyButtonBg.on('pointerover', () => {
            buyButtonBg.setFillStyle(0x5a5a5a, 1);
        });
        buyButtonBg.on('pointerout', () => {
            buyButtonBg.setFillStyle(0x4a4a4a, 1);
        });

        itemButtons.push({ bg: itemBg, sprite: itemSprite, name: itemName, price: priceText, buyBg: buyButtonBg, buyText: buyButtonText });
    });

    // Rumors button
    const rumorButtonBg = scene.add.rectangle(centerX, centerY + 120, 200, 40, 0x4a4a4a, 1)
        .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x654321)
        .setInteractive({ useHandCursor: true });

    const rumorButtonText = scene.add.text(centerX, centerY + 120, 'Hear Rumors (Free)', {
        fontSize: '14px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

    const rumors = [
        'I heard there\'s a powerful weapon hidden in the deepest dungeon...',
        'The monsters have been more aggressive lately. Be careful out there!',
        'Some say there\'s a secret passage behind the blacksmith\'s shop.',
        'A legendary adventurer once lived in this town. Their treasure is still out there somewhere...'
    ];

    // Create rumor display text (initially hidden)
    const rumorDisplayText = scene.add.text(centerX, centerY + 60, '', {
        fontSize: '14px',
        fill: '#ffff00',
        wordWrap: { width: panelWidth - 60 },
        align: 'center',
        fontStyle: 'italic'
    }).setScrollFactor(0).setDepth(403).setOrigin(0.5, 0.5);
    rumorDisplayText.setVisible(false);

    const rumorAction = () => {
        const randomRumor = rumors[Math.floor(Math.random() * rumors.length)];
        rumorDisplayText.setText(randomRumor);
        rumorDisplayText.setVisible(true);
        addChatMessage(randomRumor, 0xffff00, '💬');

        // Hide after 5 seconds
        scene.time.delayedCall(5000, () => {
            if (rumorDisplayText && rumorDisplayText.active) {
                rumorDisplayText.setVisible(false);
            }
        });
    };

    rumorButtonBg.on('pointerdown', rumorAction);
    rumorButtonText.setInteractive({ useHandCursor: true });
    rumorButtonText.on('pointerdown', rumorAction);

    // Hover effects
    rumorButtonBg.on('pointerover', () => {
        rumorButtonBg.setFillStyle(0x5a5a5a, 1);
    });
    rumorButtonBg.on('pointerout', () => {
        rumorButtonBg.setFillStyle(0x4a4a4a, 1);
    });

    buildingPanel = {
        bg: bg,
        title: title,
        closeText: closeText,
        buttons: [...itemButtons, { bg: rumorButtonBg, text: rumorButtonText }],
        textElements: [welcomeText, rumorDisplayText],
        // Tavern-specific: store item buttons for proper cleanup
        itemButtons: itemButtons
    };
}

// ============================================
// SAVE/LOAD SYSTEM
// ============================================

/**
 * Save game to localStorage
 */
function saveGame() {
    // Build dungeon seeds object from cache
    const dungeonSeeds = {};
    Object.keys(dungeonCache).forEach(key => {
        if (dungeonCache[key] && dungeonCache[key].seed) {
            dungeonSeeds[key] = dungeonCache[key].seed;
        }
    });

    const saveData = {
        playerStats: {
            hp: playerStats.hp,
            maxHp: playerStats.maxHp,
            mana: playerStats.mana,
            maxMana: playerStats.maxMana,
            stamina: playerStats.stamina,
            maxStamina: playerStats.maxStamina,
            xp: playerStats.xp,
            level: playerStats.level,
            baseAttack: playerStats.baseAttack,
            baseDefense: playerStats.baseDefense,
            gold: playerStats.gold,
            inventory: playerStats.inventory,
            equipment: playerStats.equipment,
            quests: playerStats.quests,
            questStats: playerStats.questStats
        },
        playerPosition: {
            x: player.x,
            y: player.y
        },
        currentMap: currentMap,
        dungeonLevel: dungeonLevel,
        dungeonSeeds: dungeonSeeds,
        dungeonCompletions: dungeonCompletions,
        uqeQuests: uqe.getSaveData(),
        timestamp: Date.now()
    };

    try {
        localStorage.setItem('rpg_savegame', JSON.stringify(saveData));
        showDamageNumber(player.x, player.y - 40, 'Game Saved!', 0x00ffff);
        console.log('✅ Game saved to localStorage');
        return true;
    } catch (e) {
        console.error('Failed to save game:', e);
        showDamageNumber(player.x, player.y - 40, 'Save Failed!', 0xff0000);
        return false;
    }
}

/**
 * Load game from localStorage
 */
function loadGame() {
    try {
        const saveDataStr = localStorage.getItem('rpg_savegame');
        if (!saveDataStr) {
            console.log('No save game found');
            return false;
        }

        const saveData = JSON.parse(saveDataStr);

        // Restore player stats
        Object.assign(playerStats, saveData.playerStats);

        // Restore UQE Quests
        if (saveData.uqeQuests) {
            uqe.loadSaveData(saveData.uqeQuests);
        }

        // Restore player position
        if (saveData.playerPosition) {
            player.x = saveData.playerPosition.x;
            player.y = saveData.playerPosition.y;
        }

        // Restore dungeon state
        if (saveData.dungeonSeeds) {
            console.log('📦 Restoring dungeon seeds from save:', saveData.dungeonSeeds);
            // Rebuild cache from seeds (lazy - only store seeds, regenerate when needed)
            Object.keys(saveData.dungeonSeeds).forEach(key => {
                const seed = saveData.dungeonSeeds[key];
                const level = parseInt(key.replace('level_', ''));
                dungeonCache[key] = { seed: seed, level: level };
                console.log(`  - ${key}: seed=${seed}, level=${level}`);
            });
            console.log('📦 Dungeon cache after restore:', Object.keys(dungeonCache));
        } else {
            console.warn('⚠️ No dungeon seeds found in save data');
        }

        if (saveData.dungeonCompletions) {
            dungeonCompletions = saveData.dungeonCompletions;
        }

        if (saveData.dungeonLevel) {
            dungeonLevel = saveData.dungeonLevel;
        }

        // Restore map and recreate if needed
        // IMPORTANT: Use saveData.currentMap (where player saved) not current currentMap (where player is now)
        const savedMap = saveData.currentMap;
        if (savedMap) {
            // Always use transitionToMap to ensure proper cleanup, even if we're already on that map
            // This ensures buildings/NPCs from previous map are properly destroyed
            const savedLevel = saveData.dungeonLevel || 1;

            // IMPORTANT: For dungeons, ensure cache is properly set up before transition
            if (savedMap === 'dungeon' && saveData.dungeonSeeds) {
                const dungeonKey = `level_${savedLevel}`;
                // Double-check that the seed is in cache before transitioning
                if (saveData.dungeonSeeds[dungeonKey] && (!dungeonCache[dungeonKey] || !dungeonCache[dungeonKey].seed)) {
                    console.log(`🔧 Ensuring seed is in cache for ${dungeonKey} before transition...`);
                    dungeonCache[dungeonKey] = {
                        seed: saveData.dungeonSeeds[dungeonKey],
                        level: savedLevel
                    };
                }
            }

            // Store player position before transition (transitionToMap might move player)
            const savedPlayerPos = saveData.playerPosition ? {
                x: saveData.playerPosition.x,
                y: saveData.playerPosition.y
            } : null;

            // Transition to the saved map (this will clean up everything)
            transitionToMap(savedMap, savedLevel);

            // Restore player position after map transition
            if (savedPlayerPos) {
                player.x = savedPlayerPos.x;
                player.y = savedPlayerPos.y;
            }

            // For town, also ensure NPCs are initialized
            if (savedMap === 'town') {
                initializeNPCs();
            }

            // For wilderness, spawn monsters
            if (savedMap === 'wilderness') {
                const scene = game.scene.scenes[0];
                if (scene && scene.mapWidth && scene.mapHeight && scene.tileSize) {
                    spawnInitialMonsters.call(scene, scene.mapWidth * scene.tileSize, scene.mapHeight * scene.tileSize);
                }
            }
        }

        // Update player stats (recalculate attack/defense from equipment)
        updatePlayerStats();

        // Refresh UIs
        refreshInventory();
        refreshEquipment();
        refreshQuestLog();

        // Update weapon sprite to show equipped weapon
        updateWeaponSprite();

        showDamageNumber(player.x, player.y - 40, 'Game Loaded!', 0x00ff00);
        console.log('✅ Game loaded from localStorage');
        return true;
    } catch (e) {
        console.error('Failed to load game:', e);
        showDamageNumber(player.x, player.y - 40, 'Load Failed!', 0xff0000);
        return false;
    }
}

/**
 * Check for save on page load
 */
function checkAutoLoad() {
    // Auto-load if save exists (optional - you might want to make this manual)
    // loadGame();
}

// ============================================
// ABILITIES & SPELLS SYSTEM
// ============================================

/**
 * Ability definitions
 */
const ABILITY_DEFINITIONS = {
    heal: {
        name: 'Heal',
        manaCost: 20,
        cooldown: 3000, // 3 seconds
        healAmount: 30,
        icon: 'heal_effect',
        color: 0x00ff00,
        description: 'Restores 30 HP'
    },
    fireball: {
        name: 'Fireball',
        manaCost: 15,
        cooldown: 2000, // 2 seconds
        damage: 25,
        range: 150,
        icon: 'fireball_effect',
        color: 0xff4400,
        description: 'Deals 25 damage to nearby enemies'
    },
    shield: {
        name: 'Shield',
        manaCost: 10,
        cooldown: 5000, // 5 seconds
        duration: 3000, // 3 seconds
        defenseBonus: 10,
        icon: 'shield_effect',
        color: 0x0088ff,
        description: 'Increases defense by 10 for 3 seconds'
    }
};

/**
 * Create ability bar UI
 */
function createAbilityBar() {
    const scene = game.scene.scenes[0];
    if (!scene) {
        console.error('Cannot create ability bar - scene not available');
        return;
    }

    const screenWidth = scene.cameras.main.width;
    const screenHeight = scene.cameras.main.height;

    console.log('Creating ability bar...');

    const abilityBarY = screenHeight - 80;
    const abilitySpacing = 80;
    const startX = screenWidth / 2 - (Object.keys(ABILITY_DEFINITIONS).length - 1) * abilitySpacing / 2;

    abilityBar = {
        buttons: [],
        cooldownOverlays: []
    };

    let index = 0;
    Object.keys(ABILITY_DEFINITIONS).forEach(abilityId => {
        const ability = ABILITY_DEFINITIONS[abilityId];
        const x = startX + index * abilitySpacing;

        // Button background
        const buttonBg = scene.add.rectangle(x, abilityBarY, 60, 60, 0x333333, 0.9)
            .setScrollFactor(0).setDepth(200).setStrokeStyle(2, 0x666666);

        // Ability icon
        const icon = scene.add.sprite(x, abilityBarY, ability.icon);
        icon.setScrollFactor(0).setDepth(201).setScale(0.8);
        icon.setTint(ability.color);

        // Key binding text (1, 2, 3)
        const keyText = scene.add.text(x - 20, abilityBarY - 20, (index + 1).toString(), {
            fontSize: '14px',
            fill: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#000000',
            padding: { x: 3, y: 2 }
        }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

        // Cooldown overlay (initially hidden)
        const cooldownOverlay = scene.add.rectangle(x, abilityBarY, 60, 60, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(203).setVisible(false);

        // Cooldown text
        const cooldownText = scene.add.text(x, abilityBarY, '', {
            fontSize: '18px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(204).setOrigin(0.5, 0.5).setVisible(false);

        // Mana cost text
        const manaText = scene.add.text(x, abilityBarY + 25, `${ability.manaCost} MP`, {
            fontSize: '10px',
            fill: '#00aaff'
        }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

        abilityBar.buttons.push({
            id: abilityId,
            bg: buttonBg,
            icon: icon,
            keyText: keyText,
            cooldownOverlay: cooldownOverlay,
            cooldownText: cooldownText,
            manaText: manaText
        });

        index++;
    });

    console.log(`✅ Ability bar created with ${abilityBar.buttons.length} abilities`);
}

/**
 * Cast an ability
 */
function castAbility(abilityId, time) {
    console.log(`Attempting to cast ability: ${abilityId} at time ${time}`);

    const ability = ABILITY_DEFINITIONS[abilityId];
    if (!ability) {
        console.warn(`Ability not found: ${abilityId}`);
        return;
    }

    const abilityState = playerStats.abilities[abilityId];
    if (!abilityState) {
        console.warn(`Ability state not found: ${abilityId}`);
        return;
    }

    // Check cooldown (allow first use if lastUsed is 0)
    const timeSinceLastUse = abilityState.lastUsed === 0 ? ability.cooldown + 1 : time - abilityState.lastUsed;
    if (timeSinceLastUse < ability.cooldown) {
        const remainingCooldown = Math.ceil((ability.cooldown - timeSinceLastUse) / 1000);
        showDamageNumber(player.x, player.y - 40, `Cooldown: ${remainingCooldown}s`, 0xff0000);
        console.log(`Ability on cooldown: ${remainingCooldown}s remaining`);
        return;
    }

    // Check mana
    if (playerStats.mana < ability.manaCost) {
        showDamageNumber(player.x, player.y - 40, 'Not enough mana!', 0xff0000);
        console.log(`Not enough mana! Need ${ability.manaCost}, have ${playerStats.mana}`);
        return;
    }

    console.log(`Casting ${ability.name}...`);

    // Cast ability
    playerStats.mana -= ability.manaCost;
    abilityState.lastUsed = time;

    // Apply ability effects
    if (abilityId === 'heal') {
        const healAmount = ability.healAmount;
        const oldHp = playerStats.hp;
        playerStats.hp = Math.min(playerStats.hp + healAmount, playerStats.maxHp);
        const actualHeal = playerStats.hp - oldHp;

        if (actualHeal > 0) {
            showDamageNumber(player.x, player.y - 40, `+${actualHeal} HP`, 0x00ff00, false, 'healing');
            addChatMessage(`Healed ${actualHeal} HP`, 0x00ff00, '💚');

            // Visual effect
            createHealEffect(player.x, player.y);
            playSound('heal_cast');
            console.log(`Healed for ${actualHeal} HP (Mana: ${playerStats.mana}/${playerStats.maxMana})`);
        } else {
            showDamageNumber(player.x, player.y - 40, 'Already at full health!', 0xffff00);
        }
    } else if (abilityId === 'fireball') {
        // Play fireball cast animation if available
        const scene = game.scene.scenes[0];
        if (scene.anims.exists('fireball_cast')) {
            // Stop any current animation
            player.anims.stop();

            // Set texture to fireball sprite sheet if needed
            if (scene.textures.exists('player_fireball')) {
                player.setTexture('player_fireball');
            }

            // Play fireball animation
            player.play('fireball_cast');
            console.log('Playing fireball_cast animation');

            // Resume walking animation after fireball animation completes
            player.once('animationcomplete', (animation) => {
                if (animation && animation.key === 'fireball_cast') {
                    // Switch back to walking texture
                    const walkTextureKey = `player_walk_${player.facingDirection}`;
                    if (scene.textures.exists(walkTextureKey)) {
                        player.setTexture(walkTextureKey);
                    }

                    if (player.isMoving && scene.anims.exists(`walk_${player.facingDirection}`)) {
                        player.play(`walk_${player.facingDirection}`);
                    } else {
                        // Show first frame of current direction when stopped
                        player.setFrame(0);
                    }
                }
            });
        } else {
            console.log('Fireball_cast animation not found - checking textures:', {
                hasFireballTexture: scene.textures.exists('player_fireball'),
                hasFireballAnim: scene.anims.exists('fireball_cast')
            });
        }

        // Find nearby monsters
        let hitCount = 0;
        monsters.forEach(monster => {
            if (!monster.active || monster.hp <= 0) return;

            const distance = Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y);
            if (distance <= ability.range) {
                const damage = ability.damage;
                monster.hp -= damage;
                monster.hp = Math.max(0, monster.hp);

                // Create magic hit effects (blue/purple particles)
                createHitEffects(monster.x, monster.y, false, 'magic');

                // Show magic damage number
                showDamageNumber(monster.x, monster.y - 20, `-${damage}`, 0x4400ff, false, 'magic');
                const monsterName = monster.monsterType || 'Monster';
                addChatMessage(`Fireball hit ${monsterName} for ${damage} damage`, 0x4400ff, '⚡');

                // Visual effect
                createFireballEffect(monster.x, monster.y);
                hitCount++;

                // Check if monster died
                if (monster.hp <= 0 && !monster.isDead) {
                    handleMonsterDeath(monster);
                }
            }
        });

        if (hitCount > 0) {
            showDamageNumber(player.x, player.y - 40, `Fireball! (${hitCount} hits)`, 0xff4400);
            playSound('fireball_cast');
            console.log(`Fireball hit ${hitCount} monster(s)`);
        } else {
            showDamageNumber(player.x, player.y - 40, 'No targets in range', 0xffff00);
            console.log('Fireball: No monsters in range');
        }
    } else if (abilityId === 'shield') {
        // Apply temporary defense bonus
        playerStats.defense += ability.defenseBonus;
        showDamageNumber(player.x, player.y - 40, `Shield Active! +${ability.defenseBonus} Defense`, 0x0088ff);
        addChatMessage(`Shield active (+${ability.defenseBonus} Defense)`, 0x0088ff, '🛡️');

        // Visual effect
        createShieldEffect(player.x, player.y);
        playSound('heal_cast'); // Reuse heal sound for shield
        console.log(`Shield activated! Defense: ${playerStats.defense} (Mana: ${playerStats.mana}/${playerStats.maxMana})`);

        // Remove bonus after duration
        game.scene.scenes[0].time.delayedCall(ability.duration, () => {
            playerStats.defense -= ability.defenseBonus;
            showDamageNumber(player.x, player.y - 40, 'Shield expired', 0x888888);
            addChatMessage('Shield expired', 0x888888, '🛡️');
            console.log(`Shield expired. Defense: ${playerStats.defense}`);
        });
    }

    console.log(`Ability cast: ${ability.name} (Mana remaining: ${playerStats.mana}/${playerStats.maxMana})`);
}

/**
 * Update ability cooldowns and UI
 */
function updateAbilityCooldowns(time) {
    if (!abilityBar) return;

    abilityBar.buttons.forEach(button => {
        const abilityState = playerStats.abilities[button.id];
        if (!abilityState) return;

        const ability = ABILITY_DEFINITIONS[button.id];
        const timeSinceLastUse = time - abilityState.lastUsed;
        const remainingCooldown = ability.cooldown - timeSinceLastUse;

        // Update cooldown display
        if (remainingCooldown > 0) {
            const seconds = Math.ceil(remainingCooldown / 1000);
            button.cooldownOverlay.setVisible(true);
            button.cooldownText.setText(seconds.toString()).setVisible(true);
            button.icon.setTint(0x666666); // Gray out icon
        } else {
            button.cooldownOverlay.setVisible(false);
            button.cooldownText.setVisible(false);

            // Check if player has enough mana
            const abilityDef = ABILITY_DEFINITIONS[button.id];
            if (playerStats.mana >= abilityDef.manaCost) {
                button.icon.setTint(abilityDef.color); // Normal color
            } else {
                button.icon.setTint(0x666666); // Gray out if not enough mana
            }
        }
    });
}

/**
 * Create visual effects for abilities
 */
function createHealEffect(x, y) {
    const scene = game.scene.scenes[0];
    const effect = scene.add.sprite(x, y, 'heal_effect');
    effect.setDepth(20).setScale(1.5);

    scene.tweens.add({
        targets: effect,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        duration: 500,
        onComplete: () => effect.destroy()
    });
}

function createFireballEffect(x, y) {
    const scene = game.scene.scenes[0];
    const effect = scene.add.sprite(x, y, 'fireball_effect');
    effect.setDepth(20).setScale(1);

    scene.tweens.add({
        targets: effect,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 300,
        onComplete: () => effect.destroy()
    });
}

function createShieldEffect(x, y) {
    const scene = game.scene.scenes[0];
    const effect = scene.add.sprite(x, y, 'shield_effect');
    effect.setDepth(20).setScale(1.2);

    // Pulsing animation
    scene.tweens.add({
        targets: effect,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 1000,
        yoyo: true,
        repeat: 2,
        onComplete: () => effect.destroy()
    });
}

// ============================================
// SOUND SYSTEM
// ============================================

/**
 * Play a sound effect
 * Uses scene.sound.play() which creates a new sound instance each time
 * This allows the same sound to be played multiple times simultaneously
 */
function playSound(soundName) {
    if (!soundsEnabled) {
        return;
    }

    const scene = game.scene.scenes[0];
    if (!scene || !scene.sound) {
        return;
    }

    // Use scene.sound.play() which creates a new sound instance each time
    // This ensures sounds can be played multiple times without issues
    try {
        // Check if sound exists in cache
        if (scene.cache.audio.exists(soundName)) {
            // Play sound with volume - creates a new instance each time
            scene.sound.play(soundName, { volume: 0.7 });
            console.log(`🔊 Playing: ${soundName}`); // Debug logging
        } else {
            // Sound not in cache
            console.log(`⚠️ Sound not found: ${soundName} (not in cache - check loading errors)`);
        }
    } catch (e) {
        console.warn(`❌ Error playing sound ${soundName}:`, e.message);
    }
}

/**
 * Initialize sound system (called after assets load)
 */
function initializeSounds() {
    const scene = game.scene.scenes[0];
    if (!scene || !scene.sound) {
        console.log('💡 Sound system not available');
        return;
    }

    // Create sound objects if they loaded successfully
    const soundFiles = [
        'attack_swing', 'hit_monster', 'hit_player', 'monster_die',
        'item_pickup', 'level_up', 'fireball_cast', 'heal_cast'
    ];

    console.log('🔊 Initializing sound system...');
    soundFiles.forEach(soundName => {
        try {
            const sound = scene.sound.get(soundName);
            if (sound) {
                soundEffects[soundName] = sound;
                sound.setVolume(0.7); // Set volume (increased from 0.5)
                console.log(`  ✅ Loaded: ${soundName}`);
            } else {
                console.log(`  ⚠️ Not found: ${soundName}`);
            }
        } catch (e) {
            console.log(`  ❌ Error loading ${soundName}:`, e.message);
        }
    });

    const loadedCount = Object.keys(soundEffects).length;
    if (loadedCount > 0) {
        console.log(`✅ Sound system initialized: ${loadedCount}/${soundFiles.length} sounds loaded`);
    } else {
        console.log('💡 No sound files loaded. Check browser console for loading errors.');
        console.log('💡 Make sure audio files are in: phaser_starter/assets/audio/');
    }
}


// ============================================
// ASSETS WINDOW
// ============================================

/**
 * Toggle assets window visibility
 */
function toggleAssetsWindow() {
    if (assetsVisible) {
        destroyAssetsWindow();
    } else {
        createAssetsWindow();
    }
}

/**
 * Create assets window UI
 */
function createAssetsWindow() {
    if (assetsVisible) return;

    const scene = game.scene.scenes[0];
    // Center on camera viewport (screen coordinates, not world coordinates)
    const centerX = scene.cameras.main.centerX;
    const centerY = scene.cameras.main.centerY;
    const panelWidth = 900;
    const panelHeight = 750;

    // Store panelHeight for use in updateAssetsWindow
    if (!assetsPanel) {
        assetsPanel = {};
    }
    assetsPanel.panelHeight = panelHeight;

    // Create panel background - use high depth to appear above all UI elements
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95);
    bg.setStrokeStyle(3, 0x00aaff);
    bg.setScrollFactor(0); // Fixed to camera/screen
    bg.setDepth(250); // Higher than all other UI (bars are 100-101, ability bar is 200-204)

    // Title
    const title = scene.add.text(centerX, centerY - panelHeight / 2 + 30, 'Assets Status', {
        fontSize: '28px',
        fill: '#00aaff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0); // Fixed to camera/screen
    title.setDepth(251);

    // Close instruction
    const closeText = scene.add.text(centerX, centerY + panelHeight / 2 - 20, 'Press CTRL+A to close', {
        fontSize: '14px',
        fill: '#888888',
        fontFamily: 'Arial'
    });
    closeText.setOrigin(0.5);
    closeText.setScrollFactor(0); // Fixed to camera/screen
    closeText.setDepth(251);

    // Store panel elements
    assetsPanel.bg = bg;
    assetsPanel.title = title;
    assetsPanel.closeText = closeText;
    assetsPanel.soundItems = [];
    assetsPanel.imageItems = [];
    assetsPanel.summary = null;

    assetsVisible = true;
    updateAssetsWindow();
}

/**
 * Spawn initial monsters across the entire map
 */
function spawnInitialMonsters(mapWidth, mapHeight) {
    // Use data-driven monster types if available from Method 2
    let monsterTypes = [
        { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10, isProcedural: false },
        { name: 'Orc', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20, isProcedural: false },
        { name: 'Skeleton', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15, isProcedural: false },
        { name: 'Spider', textureKey: 'monster_spider', hp: 20, attack: 4, speed: 70, xp: 8, isProcedural: false },
        { name: 'Slime', textureKey: 'monster_slime', hp: 15, attack: 3, speed: 30, xp: 5, isProcedural: false },
        { name: 'Wolf', textureKey: 'monster_wolf', hp: 40, attack: 7, speed: 65, xp: 18, isProcedural: false },
        { name: 'Dragon', textureKey: 'monster_dragon', hp: 80, attack: 12, speed: 35, xp: 40, isProcedural: false },
        { name: 'Ghost', textureKey: 'monster_ghost', hp: 35, attack: 6, speed: 55, xp: 12, isProcedural: false },
        { name: 'Echo_Mite', textureKey: 'monster_echo_mite', hp: 15, attack: 3, speed: 60, xp: 5, isProcedural: false }
    ];

    if (monsterRenderer && Object.keys(monsterRenderer.monsterBlueprints).length > 0) {
        const uniqueBlueprints = Array.from(new Set(Object.values(monsterRenderer.monsterBlueprints)));

        uniqueBlueprints.forEach(bp => {
            monsterTypes.push({
                name: bp.name,
                id: bp.id,
                hp: bp.stats.hp,
                attack: bp.stats.attack,
                speed: bp.stats.speed,
                xp: bp.stats.xp,
                textureKey: bp.id,
                isProcedural: true
            });
        });
    }

    // Spawn monsters spread across entire map, avoiding player spawn area
    const playerSpawnX = 400;
    const playerSpawnY = 300;
    const minDistanceFromPlayer = MONSTER_AGGRO_RADIUS;

    for (let i = 0; i < MAX_MONSTERS; i++) {
        let spawnX, spawnY;
        let attempts = 0;
        const maxAttempts = 50;

        // Try to find a spawn point away from player
        do {
            spawnX = Phaser.Math.Between(50, mapWidth - 50);
            spawnY = Phaser.Math.Between(50, mapHeight - 50);
            attempts++;
        } while (
            attempts < maxAttempts &&
            Phaser.Math.Distance.Between(spawnX, spawnY, playerSpawnX, playerSpawnY) < minDistanceFromPlayer
        );

        const typeIndex = Math.floor(Math.random() * monsterTypes.length);
        const type = monsterTypes[typeIndex];

        spawnMonster.call(this, spawnX, spawnY, type);
    }
}

/**
 * Spawn a single monster at the given position
 * Supports optional overrides for scaled stats (dungeons)
 */
function spawnMonster(x, y, type, hpOverride, attackOverride, xpOverride, isBoss = false) {
    const scene = game.scene.scenes[0];
    let monster;

    // Check if we should use Method 2 (procedural blueprints)
    const canUseMethod2 = monsterRenderer && (monsterRenderer.monsterBlueprints[type.name] || monsterRenderer.monsterBlueprints[type.name.toLowerCase()] || (type.id && monsterRenderer.monsterBlueprints[type.id]));

    if (type.isProcedural && canUseMethod2) {
        const blueprintId = type.id && monsterRenderer.monsterBlueprints[type.id] ? type.id :
            (monsterRenderer.monsterBlueprints[type.name] ? type.name : type.name.toLowerCase());

        console.log(`👾 Spawning Method 2 monster: ${type.name} (${blueprintId})`);
        monster = monsterRenderer.createMonster(x, y, blueprintId);
        monster.setData('isMethod2', true);
        monster.setData('blueprintId', blueprintId);

        if (monster) {
            // Add name and stats for common game logic
            monster.name = type.name;
            monster.monsterId = type.id;
            monster.monsterType = type.name.toLowerCase();
            monster.blueprintId = blueprintId; // Crucial for animation skip check
            monster.setDepth(5); // Ensure they appear above tiles
            monster.stats = { ...type };

            // Common properties initialized below the if/else
        }
    } else {
        // FALLBACK TO METHOD 1 (Spritesheets)
        // Use directional sprite if available, otherwise fall back to old texture
        const monsterType = type.name.toLowerCase();
        const initialTexture = `monster_${monsterType}_south`; // Start facing south
        const fallbackTexture = type.textureKey; // Old procedural texture

        const textureToUse = scene.textures.exists(initialTexture) ? initialTexture : fallbackTexture;
        monster = scene.physics.add.sprite(x, y, textureToUse);
        monster.setDepth(5); // Monsters above tiles but below player
    }

    if (monster) {
        // Shared properties for ALL monsters (Method 1 & 2)
        monster.name = type.name;
        monster.monsterId = type.id;
        monster.monsterType = type.name.toLowerCase();
        monster.hp = hpOverride !== undefined ? hpOverride : type.hp;
        monster.maxHp = monster.hp;
        monster.attack = attackOverride !== undefined ? attackOverride : type.attack;
        monster.speed = type.speed;
        monster.xpReward = xpOverride !== undefined ? xpOverride : (type.xp || 10);
        monster.lastAttackTime = 0;
        monster.attackCooldown = isBoss ? 1500 : 1000;
        monster.attackRange = isBoss ? 70 : 50;
        monster.isBoss = isBoss;
        monster.isDead = false;

        if (isBoss) {
            monster.setScale(1.5);
            if (monster.setTint) {
                monster.setTint(0xff0000); // Red tint for boss (if it's a sprite)
            }
        }

        // Add physics properties (ensure body exists)
        if (monster.body) {
            monster.body.setCollideWorldBounds(true);
        }

        // Add simple animation (gentle pulsing for some types)
        if (type.name === 'Slime' || type.name === 'Ghost' || isBoss) {
            scene.tweens.add({
                targets: monster,
                scaleX: isBoss ? 1.6 : 1.1,
                scaleY: isBoss ? 1.6 : 1.1,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Create monster HP bar above sprite
        const monsterHpBarWidth = 30;
        const monsterHpBarHeight = 4;
        monster.hpBarBg = scene.add.rectangle(0, 0, monsterHpBarWidth, monsterHpBarHeight, 0x000000, 0.8)
            .setDepth(6).setOrigin(0.5, 0.5).setScrollFactor(1);
        monster.hpBar = scene.add.rectangle(0, 0, monsterHpBarWidth - 2, monsterHpBarHeight - 2, 0xff0000)
            .setDepth(7).setOrigin(0, 0.5).setScrollFactor(1);

        monster.isBoss = false;
        monster.isDead = false;

        monsters.push(monster);
        return monster;
    }
}

/**
 * Spawn a scaled monster (for dungeons with level scaling)
 */
function spawnMonsterScaled(x, y, type, scaledHp, scaledAttack, scaledXp) {
    return spawnMonster(x, y, type, scaledHp, scaledAttack, scaledXp);
}

/**
 * Update assets window content
 */
function updateAssetsWindow() {
    if (!assetsVisible || !assetsPanel) return;

    const scene = game.scene.scenes[0];

    // Clear existing items
    assetsPanel.soundItems.forEach(item => {
        if (item.status) item.status.destroy();
        if (item.name) item.name.destroy();
        if (item.path) item.path.destroy();
    });
    assetsPanel.imageItems.forEach(item => {
        if (item.status) item.status.destroy();
        if (item.name) item.name.destroy();
        if (item.path) item.path.destroy();
    });
    assetsPanel.soundItems = [];
    assetsPanel.imageItems = [];

    // Center on camera viewport (screen coordinates, not world coordinates)
    const centerX = scene.cameras.main.centerX;
    const centerY = scene.cameras.main.centerY;
    const panelWidth = 900;
    const panelHeight = assetsPanel.panelHeight || 750;
    const startY = centerY - panelHeight / 2 + 80;
    const lineHeight = 22; // Slightly more compact
    const leftMargin = centerX - panelWidth / 2 + 20;
    const rightMargin = centerX + panelWidth / 2 - 20;

    // Define expected assets
    const expectedSounds = [
        { key: 'attack_swing', path: 'assets/audio/attack_swing.wav' },
        { key: 'hit_monster', path: 'assets/audio/hit_monster.mp3' },
        { key: 'hit_player', path: 'assets/audio/hit_player.mp3' },
        { key: 'monster_die', path: 'assets/audio/monster_die.mp3' },
        { key: 'item_pickup', path: 'assets/audio/item_pickup.wav' },
        { key: 'level_up', path: 'assets/audio/level_up.wav' },
        { key: 'fireball_cast', path: 'assets/audio/fireball_cast.wav' },
        { key: 'heal_cast', path: 'assets/audio/heal_cast.wav' }
    ];

    const expectedImages = [
        { key: 'player', path: 'assets/player.png', isGenerated: true },
        { key: 'monster', path: 'assets/monster.png', isGenerated: true },
        { key: 'grass', path: 'assets/tiles/tile_floor_grass.png', isGenerated: true },
        { key: 'dirt', path: 'assets/tiles/tile_floor_dirt.png', isGenerated: true },
        { key: 'stone', path: 'assets/tiles/tile_floor_stone.png', isGenerated: true },
        { key: 'wall', path: 'assets/tiles/wall.png', isGenerated: true },
        { key: 'item_weapon', path: 'N/A (generated)', isGenerated: true },
        { key: 'item_armor', path: 'N/A (generated)', isGenerated: true },
        { key: 'item_consumable', path: 'N/A (generated)', isGenerated: true },
        { key: 'item_gold', path: 'N/A (generated)', isGenerated: true },
        { key: 'npc', path: 'N/A (generated)', isGenerated: true },
        { key: 'fireball_effect', path: 'N/A (generated)', isGenerated: true },
        { key: 'heal_effect', path: 'N/A (generated)', isGenerated: true },
        { key: 'shield_effect', path: 'N/A (generated)', isGenerated: true }
    ];

    // Section headers
    const soundsHeader = scene.add.text(leftMargin, startY, 'SOUNDS:', {
        fontSize: '18px',
        fill: '#00aaff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    soundsHeader.setScrollFactor(0); // Fixed to camera/screen
    soundsHeader.setDepth(251);
    assetsPanel.soundsHeader = soundsHeader;

    // Check sounds
    let yPos = startY + 30;
    expectedSounds.forEach((sound, index) => {
        const exists = scene.cache.audio.exists(sound.key);
        const statusText = exists ? '✅' : '❌';
        const statusColor = exists ? '#00ff00' : '#ff0000';

        const status = scene.add.text(leftMargin, yPos, statusText, {
            fontSize: '14px',
            fill: statusColor,
            fontFamily: 'Arial'
        });
        status.setScrollFactor(0); // Fixed to camera/screen
        status.setDepth(251);

        const name = scene.add.text(leftMargin + 25, yPos, sound.key, {
            fontSize: '13px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        name.setScrollFactor(0); // Fixed to camera/screen
        name.setDepth(251);

        const path = scene.add.text(leftMargin + 180, yPos, sound.path, {
            fontSize: '11px',
            fill: '#888888',
            fontFamily: 'Arial'
        });
        path.setScrollFactor(0); // Fixed to camera/screen
        path.setDepth(251);

        assetsPanel.soundItems.push({ status, name, path });
        yPos += lineHeight;
    });

    // Images header
    yPos += 15;
    const imagesHeader = scene.add.text(leftMargin, yPos, 'IMAGES:', {
        fontSize: '18px',
        fill: '#00aaff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    imagesHeader.setScrollFactor(0); // Fixed to camera/screen
    imagesHeader.setDepth(251);
    assetsPanel.imagesHeader = imagesHeader;

    // Check images
    yPos += 35;
    expectedImages.forEach((image, index) => {
        const exists = scene.textures.exists(image.key);
        const isRealImage = exists && !image.isGenerated; // This is approximate - generated textures also exist
        const statusText = exists ? (isRealImage ? '✅' : '🔄') : '❌';
        const statusColor = isRealImage ? '#00ff00' : (exists ? '#ffaa00' : '#ff0000');
        const statusLabel = isRealImage ? '✅ Loaded' : (exists ? '🔄 Generated' : '❌ Missing');

        const status = scene.add.text(leftMargin, yPos, statusText, {
            fontSize: '14px',
            fill: statusColor,
            fontFamily: 'Arial'
        });
        status.setScrollFactor(0); // Fixed to camera/screen
        status.setDepth(251);

        const name = scene.add.text(leftMargin + 25, yPos, image.key, {
            fontSize: '13px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        name.setScrollFactor(0); // Fixed to camera/screen
        name.setDepth(251);

        const path = scene.add.text(leftMargin + 180, yPos, image.path, {
            fontSize: '11px',
            fill: '#888888',
            fontFamily: 'Arial'
        });
        path.setScrollFactor(0); // Fixed to camera/screen
        path.setDepth(251);

        assetsPanel.imageItems.push({ status, name, path });
        yPos += lineHeight;
    });

    // Summary
    yPos += 15;
    const soundsLoaded = expectedSounds.filter(s => scene.cache.audio.exists(s.key)).length;
    const soundsTotal = expectedSounds.length;
    const imagesLoaded = expectedImages.filter(i => scene.textures.exists(i.key)).length;
    const imagesTotal = expectedImages.length;

    const summary = scene.add.text(centerX, yPos,
        `Summary: ${soundsLoaded}/${soundsTotal} sounds loaded, ${imagesLoaded}/${imagesTotal} images available`, {
        fontSize: '14px',
        fill: '#00aaff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    summary.setOrigin(0.5);
    summary.setScrollFactor(0); // Fixed to camera/screen
    summary.setDepth(251);
    assetsPanel.summary = summary;
}

/**
 * Destroy assets window UI
 */
function destroyAssetsWindow() {
    if (!assetsVisible || !assetsPanel) return;

    const scene = game.scene.scenes[0];

    if (assetsPanel.bg && assetsPanel.bg.active) assetsPanel.bg.destroy();
    if (assetsPanel.title && assetsPanel.title.active) assetsPanel.title.destroy();
    if (assetsPanel.closeText && assetsPanel.closeText.active) assetsPanel.closeText.destroy();
    if (assetsPanel.summary && assetsPanel.summary.active) assetsPanel.summary.destroy();

    if (assetsPanel.soundItems) {
        assetsPanel.soundItems.forEach(item => {
            if (item.status && item.status.active) item.status.destroy();
            if (item.name && item.name.active) item.name.destroy();
            if (item.path && item.path.active) item.path.destroy();
        });
    }

    if (assetsPanel.imageItems) {
        assetsPanel.imageItems.forEach(item => {
            if (item.status && item.status.active) item.status.destroy();
            if (item.name && item.name.active) item.name.destroy();
            if (item.path && item.path.active) item.path.destroy();
        });
    }

    // Also destroy section headers if they exist
    if (assetsPanel.soundsHeader && assetsPanel.soundsHeader.active) assetsPanel.soundsHeader.destroy();
    if (assetsPanel.imagesHeader && assetsPanel.imagesHeader.active) assetsPanel.imagesHeader.destroy();

    assetsPanel = null;
    assetsVisible = false;
}

// ============================================
// GRASS DEBUG WINDOW
// ============================================

/**
 * Toggle grass debug window visibility
 */
function toggleGrassDebugWindow() {
    console.log('🔍 Toggling grass debug window. Current state:', grassDebugVisible);
    if (grassDebugVisible) {
        destroyGrassDebugWindow();
    } else {
        createGrassDebugWindow();
    }
}

/**
 * Create grass debug window UI
 */
function createGrassDebugWindow() {
    if (grassDebugVisible) {
        console.log('⚠️ Grass debug window already visible');
        return;
    }

    console.log('🔍 Creating grass debug window...');
    const scene = game.scene.scenes[0];
    // Center on camera viewport (screen coordinates, not world coordinates)
    const centerX = scene.cameras.main.centerX;
    const centerY = scene.cameras.main.centerY;
    const panelWidth = 1000;
    const panelHeight = 800;

    // Create panel background - use high depth to appear above all UI elements
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95);
    bg.setStrokeStyle(3, 0x00ff00);
    bg.setScrollFactor(0); // Fixed to camera/screen
    bg.setDepth(250); // Higher than all other UI
    console.log('✅ Created debug window background at depth 250');

    // Title
    const title = scene.add.text(centerX, centerY - panelHeight / 2 + 30, 'Grass Spritesheet Debug', {
        fontSize: '28px',
        fill: '#00ff00',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(251);

    // Close instruction
    const closeText = scene.add.text(centerX, centerY + panelHeight / 2 - 20, 'Press CTRL+M to close', {
        fontSize: '14px',
        fill: '#888888',
        fontFamily: 'Arial'
    });
    closeText.setOrigin(0.5);
    closeText.setScrollFactor(0);
    closeText.setDepth(251);

    // Add frame size input
    const inputY = centerY - panelHeight / 2 + 60;
    const inputLabel = scene.add.text(centerX - 200, inputY, 'Frame Size:', {
        fontSize: '16px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    inputLabel.setOrigin(0, 0.5);
    inputLabel.setScrollFactor(0);
    inputLabel.setDepth(251);

    // Create input field background
    const inputBg = scene.add.rectangle(centerX - 50, inputY, 100, 30, 0x333333, 0.9);
    inputBg.setStrokeStyle(2, 0x00ff00);
    inputBg.setScrollFactor(0);
    inputBg.setDepth(251);
    inputBg.setInteractive({ useHandCursor: true });

    // Create input text (we'll use a DOM input element)
    // Calculate absolute position based on canvas position
    const canvas = scene.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    const inputElement = document.createElement('input');
    inputElement.type = 'number';
    inputElement.min = '32';
    inputElement.max = '96';
    inputElement.value = '96';
    inputElement.style.position = 'fixed';
    inputElement.style.left = (canvasRect.left + centerX - 50) + 'px';
    inputElement.style.top = (canvasRect.top + inputY - 15) + 'px';
    inputElement.style.width = '100px';
    inputElement.style.height = '30px';
    inputElement.style.backgroundColor = '#333333';
    inputElement.style.color = '#00ff00';
    inputElement.style.border = '2px solid #00ff00';
    inputElement.style.textAlign = 'center';
    inputElement.style.fontSize = '16px';
    inputElement.style.fontFamily = 'Arial';
    inputElement.style.zIndex = '10000';
    document.body.appendChild(inputElement);
    console.log('✅ Created input element at position:', inputElement.style.left, inputElement.style.top);

    // Update button
    const updateButton = scene.add.rectangle(centerX + 100, inputY, 120, 30, 0x00aa00, 0.9);
    updateButton.setStrokeStyle(2, 0x00ff00);
    updateButton.setScrollFactor(0);
    updateButton.setDepth(251);
    updateButton.setInteractive({ useHandCursor: true });

    const updateButtonText = scene.add.text(centerX + 100, inputY, 'Update', {
        fontSize: '14px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    updateButtonText.setOrigin(0.5);
    updateButtonText.setScrollFactor(0);
    updateButtonText.setDepth(252);

    updateButton.on('pointerdown', () => {
        const newFrameSize = parseInt(inputElement.value);
        if (newFrameSize >= 32 && newFrameSize <= 96) {
            console.log('🔄 Updating grass spritesheet with frame size:', newFrameSize);
            reloadGrassSpritesheet(newFrameSize);
        } else {
            alert('Please enter a value between 32 and 96');
        }
    });

    updateButton.on('pointerover', () => {
        updateButton.setFillStyle(0x00cc00);
    });
    updateButton.on('pointerout', () => {
        updateButton.setFillStyle(0x00aa00);
    });

    // Store panel elements
    grassDebugPanel = {
        bg: bg,
        title: title,
        closeText: closeText,
        spritesheetImage: null,
        frameImages: [],
        infoText: null,
        inputElement: inputElement,
        inputLabel: inputLabel,
        inputBg: inputBg,
        updateButton: updateButton,
        updateButtonText: updateButtonText,
        currentFrameSize: 32
    };

    grassDebugVisible = true;

    console.log('✅ Grass debug window created, calling updateGrassDebugWindow...');
    try {
        updateGrassDebugWindow();
        console.log('✅ updateGrassDebugWindow completed');
    } catch (error) {
        console.error('❌ Error in updateGrassDebugWindow:', error);
        const errorText = scene.add.text(centerX, centerY, 'Error updating window:\n' + error.message, {
            fontSize: '18px',
            fill: '#ff0000',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: panelWidth - 40 }
        });
        errorText.setOrigin(0.5);
        errorText.setScrollFactor(0);
        errorText.setDepth(251);
        if (!grassDebugPanel.infoText) {
            grassDebugPanel.infoText = errorText;
        }
    }
}

/**
 * Update grass debug window content
 */
function updateGrassDebugWindow() {
    if (!grassDebugVisible || !grassDebugPanel) {
        console.warn('⚠️ Cannot update grass debug window - not visible or panel missing');
        return;
    }

    const scene = game.scene.scenes[0];
    if (!scene) {
        console.error('❌ No scene available');
        return;
    }

    console.log('🔄 Updating grass debug window...');
    // Clear existing content
    if (grassDebugPanel.spritesheetImage && grassDebugPanel.spritesheetImage.active) {
        grassDebugPanel.spritesheetImage.destroy();
    }
    if (grassDebugPanel.spritesheetLabel && grassDebugPanel.spritesheetLabel.active) {
        grassDebugPanel.spritesheetLabel.destroy();
    }
    if (grassDebugPanel.framesLabel && grassDebugPanel.framesLabel.active) {
        grassDebugPanel.framesLabel.destroy();
    }
    grassDebugPanel.frameImages.forEach(item => {
        if (item.image && item.image.active) item.image.destroy();
        if (item.label && item.label.active) item.label.destroy();
        if (item.border && item.border.active) item.border.destroy();
    });
    grassDebugPanel.frameImages = [];
    if (grassDebugPanel.infoText && grassDebugPanel.infoText.active) {
        grassDebugPanel.infoText.destroy();
    }

    const centerX = scene.cameras.main.centerX;
    const centerY = scene.cameras.main.centerY;
    const panelWidth = 1000;
    const panelHeight = 800;

    // Check if grass texture exists - use debug texture if available, otherwise main grass texture
    const currentFrameSize = grassDebugPanel ? grassDebugPanel.currentFrameSize : 96;
    const debugTextureKey = 'grass_debug_' + currentFrameSize;
    let grassTexture;
    let usingDebugTexture = false;

    if (scene.textures.exists(debugTextureKey)) {
        console.log('Using debug texture for display:', debugTextureKey);
        grassTexture = scene.textures.get(debugTextureKey);
        usingDebugTexture = true;
    } else if (scene.textures.exists('grass')) {
        grassTexture = scene.textures.get('grass');
    } else {
        grassTexture = null;
    }

    // Store for use in display code
    if (grassDebugPanel) {
        grassDebugPanel.usingDebugTexture = usingDebugTexture;
        grassDebugPanel.debugTextureKey = debugTextureKey;
    }

    if (!grassTexture) {
        const errorText = scene.add.text(centerX, centerY, '❌ Grass texture not found!\n\nCheck console for available textures.', {
            fontSize: '24px',
            fill: '#ff0000',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: panelWidth - 40 }
        });
        errorText.setOrigin(0.5);
        errorText.setScrollFactor(0);
        errorText.setDepth(251);
        grassDebugPanel.infoText = errorText;
        return;
    }

    console.log('✅ Grass texture found, continuing with update...');

    // Get texture info
    const frameTotal = grassTexture.frameTotal || 1;
    const sourceImage = grassTexture.source[0];
    const sourceWidth = sourceImage ? sourceImage.width : 32;
    const sourceHeight = sourceImage ? sourceImage.height : 32;

    // Get the actual image source URL
    let imageUrl = 'Unknown';
    if (sourceImage && sourceImage.image) {
        if (sourceImage.image.src) {
            imageUrl = sourceImage.image.src;
        } else if (sourceImage.image.currentSrc) {
            imageUrl = sourceImage.image.currentSrc;
        } else if (sourceImage.image.baseURI) {
            imageUrl = sourceImage.image.baseURI;
        }
    }

    // Also check the texture's key and cache
    const textureKey = grassTexture.key;
    const cacheEntry = scene.cache.image ? scene.cache.image.get(textureKey) : null;
    if (cacheEntry && cacheEntry.src) {
        imageUrl = cacheEntry.src;
    }

    // Calculate expected frames based on source size and current frame size
    // (currentFrameSize was already declared earlier in this function at line 5918)
    const expectedFramesX = Math.floor(sourceWidth / currentFrameSize);
    const expectedFramesY = Math.floor(sourceHeight / currentFrameSize);
    const expectedTotalFrames = expectedFramesX * expectedFramesY;

    console.log('📊 Grass texture analysis:');
    console.log('  Texture key:', textureKey);
    console.log('  Image URL:', imageUrl);
    console.log('  Source dimensions:', sourceWidth, 'x', sourceHeight);
    console.log('  Current frame size:', currentFrameSize);
    console.log('  Expected frames (' + currentFrameSize + 'x' + currentFrameSize + '):', expectedFramesX, 'x', expectedFramesY, '=', expectedTotalFrames);
    console.log('  Actual frames detected:', frameTotal);
    console.log('  Texture keys:', Object.keys(grassTexture.frames || {}));
    console.log('  Source image:', sourceImage);
    console.log('  Cache entry:', cacheEntry);

    // Display info
    const infoY = centerY - panelHeight / 2 + 120;
    let infoMessage = `Frames: ${frameTotal} | Source Size: ${sourceWidth}x${sourceHeight} | Frame Size: ${currentFrameSize}x${currentFrameSize}`;
    if (usingDebugTexture) {
        infoMessage += `\n(Using debug texture for display - game still uses original)`;
    }
    infoMessage += `\n\n📎 Image URL:\n${imageUrl}`;

    // Check if this is a generated texture (canvas) vs loaded image
    if (sourceImage && sourceImage.image && sourceImage.image.isCanvas) {
        infoMessage += `\n\n⚠️ This is a GENERATED texture (canvas), not a loaded image!`;
        infoMessage += `\nThe spritesheet failed to load. Check console for load errors.`;
    }
    if (expectedTotalFrames > 1 && frameTotal === 1) {
        infoMessage += `\n\n⚠️ Expected ${expectedTotalFrames} frames but only ${frameTotal} detected!`;
        infoMessage += `\nTry adjusting the frame size above.`;
    } else if (expectedTotalFrames === 1 && sourceWidth > currentFrameSize) {
        infoMessage += `\n\n💡 Try a smaller frame size to see more frames!`;
    } else if (frameTotal > 1) {
        infoMessage += `\n\n✅ Spritesheet loaded successfully with ${frameTotal} frames!`;
    }
    const infoText = scene.add.text(centerX, infoY, infoMessage, {
        fontSize: '14px',
        fill: '#00ff00',
        fontFamily: 'Arial',
        align: 'center',
        wordWrap: { width: panelWidth - 40 }
    });
    infoText.setOrigin(0.5);
    infoText.setScrollFactor(0);
    infoText.setDepth(251);
    grassDebugPanel.infoText = infoText;

    // Display full spritesheet (scaled down if too large)
    const spritesheetY = infoY + 60;
    const maxSpritesheetWidth = panelWidth - 100;
    const maxSpritesheetHeight = 300;
    let spritesheetScale = 1;

    if (sourceWidth > maxSpritesheetWidth) {
        spritesheetScale = maxSpritesheetWidth / sourceWidth;
    }
    if (sourceHeight * spritesheetScale > maxSpritesheetHeight) {
        spritesheetScale = maxSpritesheetHeight / sourceHeight;
    }

    console.log('Creating spritesheet image with scale:', spritesheetScale);

    // Try to display the full spritesheet - use frame 0 or the source image
    let spritesheetImage;
    try {
        // Use debug texture if available, otherwise use main grass texture
        const displayKey = grassDebugPanel.usingDebugTexture ? grassDebugPanel.debugTextureKey : 'grass';

        // For spritesheets, we can display the source image directly
        if (frameTotal > 1) {
            // It's a spritesheet - try to show the source
            spritesheetImage = scene.add.image(centerX, spritesheetY, displayKey, 0);
            spritesheetImage.setScale(spritesheetScale);
        } else {
            // Single texture
            spritesheetImage = scene.add.image(centerX, spritesheetY, displayKey);
            spritesheetImage.setScale(spritesheetScale);
        }
        spritesheetImage.setScrollFactor(0);
        spritesheetImage.setDepth(251);
        spritesheetImage.setOrigin(0.5);
        console.log('✅ Spritesheet image created');
    } catch (e) {
        console.error('❌ Error creating spritesheet image:', e);
        const errorMsg = scene.add.text(centerX, spritesheetY, 'Error displaying spritesheet', {
            fontSize: '18px',
            fill: '#ff0000',
            fontFamily: 'Arial'
        });
        errorMsg.setOrigin(0.5);
        errorMsg.setScrollFactor(0);
        errorMsg.setDepth(251);
        grassDebugPanel.spritesheetImage = errorMsg;
    }

    // Add label for spritesheet
    const spritesheetLabel = scene.add.text(centerX, spritesheetY - (sourceHeight * spritesheetScale / 2) - 20,
        'Full Spritesheet:', {
        fontSize: '16px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    spritesheetLabel.setOrigin(0.5);
    spritesheetLabel.setScrollFactor(0);
    spritesheetLabel.setDepth(251);

    if (spritesheetImage) {
        grassDebugPanel.spritesheetImage = spritesheetImage;
    }
    grassDebugPanel.spritesheetLabel = spritesheetLabel;

    // Display individual frames in a grid
    const framesStartY = spritesheetY + (sourceHeight * spritesheetScale / 2) + 60;
    const framesLabel = scene.add.text(centerX, framesStartY - 30, 'Individual Frames:', {
        fontSize: '16px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    framesLabel.setOrigin(0.5);
    framesLabel.setScrollFactor(0);
    framesLabel.setDepth(251);
    grassDebugPanel.framesLabel = framesLabel;

    // Calculate grid layout
    const frameSize = 64; // Display size for each frame
    const framesPerRow = Math.floor((panelWidth - 100) / (frameSize + 20));
    const frameSpacing = (panelWidth - 100) / framesPerRow;
    const startX = centerX - (framesPerRow - 1) * frameSpacing / 2;

    let currentY = framesStartY;
    let currentX = startX;
    let framesInCurrentRow = 0;

    console.log('Creating', frameTotal, 'frame images...');

    for (let i = 0; i < frameTotal; i++) {
        try {
            // Create frame image
            let frameImage;
            // currentFrameSize is already declared in function scope
            const displayKey = grassDebugPanel.usingDebugTexture ? grassDebugPanel.debugTextureKey : 'grass';

            if (frameTotal > 1) {
                // It's a spritesheet - use frame index
                frameImage = scene.add.image(currentX, currentY, displayKey, i);
            } else {
                // Single texture - no frame index
                frameImage = scene.add.image(currentX, currentY, displayKey);
            }
            frameImage.setScale(frameSize / currentFrameSize); // Scale to display size
            frameImage.setScrollFactor(0);
            frameImage.setDepth(251);
            frameImage.setOrigin(0.5);

            // Add frame number label
            const frameLabel = scene.add.text(currentX, currentY + frameSize / 2 + 10, `Frame ${i}`, {
                fontSize: '12px',
                fill: '#cccccc',
                fontFamily: 'Arial'
            });
            frameLabel.setOrigin(0.5);
            frameLabel.setScrollFactor(0);
            frameLabel.setDepth(251);

            // Add border around frame
            const frameBorder = scene.add.rectangle(currentX, currentY, frameSize + 4, frameSize + 4, 0x000000, 0);
            frameBorder.setStrokeStyle(2, 0x00ff00);
            frameBorder.setScrollFactor(0);
            frameBorder.setDepth(250);

            grassDebugPanel.frameImages.push({ image: frameImage, label: frameLabel, border: frameBorder });
        } catch (e) {
            console.error(`Error creating frame ${i}:`, e);
            // Create error placeholder
            const errorText = scene.add.text(currentX, currentY, `Error\nFrame ${i}`, {
                fontSize: '10px',
                fill: '#ff0000',
                fontFamily: 'Arial',
                align: 'center'
            });
            errorText.setOrigin(0.5);
            errorText.setScrollFactor(0);
            errorText.setDepth(251);
            grassDebugPanel.frameImages.push({ image: null, label: errorText, border: null });
        }

        // Move to next position
        framesInCurrentRow++;
        currentX += frameSpacing;

        if (framesInCurrentRow >= framesPerRow) {
            framesInCurrentRow = 0;
            currentX = startX;
            currentY += frameSize + 50; // Move to next row
        }
    }

    console.log('✅ Created', grassDebugPanel.frameImages.length, 'frame displays');
}

/**
 * Reload grass spritesheet with new frame size
 */
function reloadGrassSpritesheet(frameSize) {
    const scene = game.scene.scenes[0];

    console.log('🔄 Reloading grass spritesheet with frame size:', frameSize);

    // Use a temporary key first to avoid breaking existing references
    const tempKey = 'grass_debug_' + frameSize;

    // Check if temp texture already exists
    if (scene.textures.exists(tempKey)) {
        console.log('✅ Using cached texture for frame size:', frameSize);
        // Just update the display with existing texture
        if (grassDebugPanel) {
            grassDebugPanel.currentFrameSize = frameSize;
        }
        // Update display using temp texture
        updateGrassDebugWindow();
        return;
    }

    // Load with new frame size to temporary key
    scene.load.spritesheet(tempKey, 'assets/tiles/grass.png', {
        frameWidth: frameSize,
        frameHeight: frameSize
    });

    // Wait for load to complete
    const onComplete = () => {
        console.log('✅ Grass spritesheet loaded with frame size:', frameSize);

        if (grassDebugPanel) {
            grassDebugPanel.currentFrameSize = frameSize;
        }

        // Update the input value
        if (grassDebugPanel && grassDebugPanel.inputElement) {
            grassDebugPanel.inputElement.value = frameSize;
        }

        // Update display (will use tempKey for display)
        updateGrassDebugWindow();

        // Clean up listeners
        scene.load.off('filecomplete-spritesheet-' + tempKey, onComplete);
        scene.load.off('loaderror', onError);
    };

    const onError = (file) => {
        if (file.key === tempKey) {
            console.error('❌ Failed to reload grass spritesheet with frame size:', frameSize);
            alert('Failed to reload spritesheet. Check console for details.');
            scene.load.off('filecomplete-spritesheet-' + tempKey, onComplete);
            scene.load.off('loaderror', onError);
        }
    };

    scene.load.once('filecomplete-spritesheet-' + tempKey, onComplete);
    scene.load.once('loaderror', onError);

    scene.load.start();
}

/**
 * Destroy grass debug window
 */
function destroyGrassDebugWindow() {
    if (!grassDebugVisible || !grassDebugPanel) return;

    const scene = game.scene.scenes[0];

    if (grassDebugPanel.bg && grassDebugPanel.bg.active) grassDebugPanel.bg.destroy();
    if (grassDebugPanel.title && grassDebugPanel.title.active) grassDebugPanel.title.destroy();
    if (grassDebugPanel.closeText && grassDebugPanel.closeText.active) grassDebugPanel.closeText.destroy();
    if (grassDebugPanel.infoText && grassDebugPanel.infoText.active) grassDebugPanel.infoText.destroy();
    if (grassDebugPanel.spritesheetImage && grassDebugPanel.spritesheetImage.active) grassDebugPanel.spritesheetImage.destroy();
    if (grassDebugPanel.spritesheetLabel && grassDebugPanel.spritesheetLabel.active) grassDebugPanel.spritesheetLabel.destroy();
    if (grassDebugPanel.framesLabel && grassDebugPanel.framesLabel.active) grassDebugPanel.framesLabel.destroy();
    if (grassDebugPanel.inputLabel && grassDebugPanel.inputLabel.active) grassDebugPanel.inputLabel.destroy();
    if (grassDebugPanel.inputBg && grassDebugPanel.inputBg.active) grassDebugPanel.inputBg.destroy();
    if (grassDebugPanel.updateButton && grassDebugPanel.updateButton.active) grassDebugPanel.updateButton.destroy();
    if (grassDebugPanel.updateButtonText && grassDebugPanel.updateButtonText.active) grassDebugPanel.updateButtonText.destroy();

    // Remove DOM input element
    if (grassDebugPanel.inputElement && grassDebugPanel.inputElement.parentNode) {
        grassDebugPanel.inputElement.parentNode.removeChild(grassDebugPanel.inputElement);
    }

    grassDebugPanel.frameImages.forEach(item => {
        if (item.image && item.image.active) item.image.destroy();
        if (item.label && item.label.active) item.label.destroy();
        if (item.border && item.border.active) item.border.destroy();
    });

    grassDebugPanel = null;
    grassDebugVisible = false;
}

// ============================================
// MULTIPLE MONSTER TYPES
// ============================================
// Monster types are now implemented in the create() function
// Each monster type has different stats, colors, and XP rewards

/**
 * Create monster animations from sprite sheets
 * Supports walking (4 directions), idle, attack, and death animations
 * For now, uses static directional images (will upgrade to animated sprite sheets when ready)
 */
function createMonsterAnimations() {
    const scene = this;
    const frameRate = 8; // Animation speed

    // Monster types that will have animations
    const monsterTypes = ['goblin', 'orc', 'skeleton', 'slime', 'wolf', 'dragon', 'ghost', 'spider', 'echo_mite'];

    monsterTypes.forEach(type => {
        // For now, we're using static directional images
        // When animated sprite sheets are ready, we'll load those instead
        // Walking animations (4 directions) - check for sprite sheets first
        ['south', 'north', 'east', 'west'].forEach(direction => {
            const spriteSheetKey = `monster_${type}_walk_${direction}`;
            const staticImageKey = `monster_${type}_${direction}`;
            const animKey = `${type}_walk_${direction}`;

            // Check for animated sprite sheet first
            if (scene.textures.exists(spriteSheetKey)) {
                scene.anims.create({
                    key: animKey,
                    frames: scene.anims.generateFrameNumbers(spriteSheetKey, { start: 0, end: -1 }),
                    frameRate: frameRate,
                    repeat: -1,
                    yoyo: false
                });
            }
            // Static images are already loaded, no animation needed - just use setTexture()
        });

        // Idle animation (breathing/idle cycle)
        const idleTextureKey = `monster_${type}_idle`;
        const idleAnimKey = `${type}_idle`;
        if (scene.textures.exists(idleTextureKey)) {
            scene.anims.create({
                key: idleAnimKey,
                frames: scene.anims.generateFrameNumbers(idleTextureKey, { start: 0, end: -1 }),
                frameRate: 4, // Slower for idle
                repeat: -1,
                yoyo: false
            });
        }

        // Attack animations (4 directions) - check for sprite sheets first
        ['south', 'north', 'east', 'west'].forEach(direction => {
            const attackSpriteSheetKey = `monster_${type}_attack_${direction}`;
            const attackAnimKey = `${type}_attack_${direction}`;

            // Check for animated sprite sheet first
            if (scene.textures.exists(attackSpriteSheetKey)) {
                scene.anims.create({
                    key: attackAnimKey,
                    frames: scene.anims.generateFrameNumbers(attackSpriteSheetKey, { start: 0, end: -1 }),
                    frameRate: 12, // Faster for attack
                    repeat: 0 // Play once
                });
                console.log(`✅ Created attack animation: ${attackAnimKey} from ${attackSpriteSheetKey}`);
            } else {
                console.log(`⚠️ Attack spritesheet not found: ${attackSpriteSheetKey}`);
            }
        });

        // Death animation
        const deathTextureKey = `monster_${type}_death`;
        const deathAnimKey = `${type}_death`;
        if (scene.textures.exists(deathTextureKey)) {
            scene.anims.create({
                key: deathAnimKey,
                frames: scene.anims.generateFrameNumbers(deathTextureKey, { start: 0, end: -1 }),
                frameRate: 8,
                repeat: 0 // Play once
            });
        }
    });

    console.log('✅ Monster animation system initialized');
}

/**
 * Update monster animations based on movement and state
 */
function updateMonsterAnimation(monster, delta) {
    const scene = game.scene.scenes[0];
    if (!monster || !monster.active || monster.isDead) return;

    // Method 2 monsters (procedural) handle their own animations in their update method
    if (monster.blueprintId || monster.getData('isMethod2')) return;

    // Initialize direction tracking if not present
    if (!monster.facingDirection) {
        monster.facingDirection = 'south';
    }
    if (monster.isMoving === undefined) {
        monster.isMoving = false;
    }
    if (monster.animationState === undefined) {
        monster.animationState = 'idle'; // 'idle', 'walking', 'attacking', 'dying'
    }

    // Don't change animation if attacking or dying
    if (monster.animationState === 'attacking' || monster.animationState === 'dying') {
        return;
    }

    // Determine direction from velocity
    const velX = monster.body.velocity.x;
    const velY = monster.body.velocity.y;
    const isMoving = Math.abs(velX) > 5 || Math.abs(velY) > 5;

    let newDirection = monster.facingDirection;
    if (isMoving) {
        // Determine facing direction based on velocity
        if (Math.abs(velY) > Math.abs(velX)) {
            newDirection = velY > 0 ? 'south' : 'north';
        } else {
            newDirection = velX > 0 ? 'east' : 'west';
        }
    }

    // Update animation state
    const newState = isMoving ? 'walking' : 'idle';

    // Only update if direction or state changed
    if (newDirection !== monster.facingDirection || newState !== monster.animationState || isMoving !== monster.isMoving) {
        monster.facingDirection = newDirection;
        monster.animationState = newState;
        monster.isMoving = isMoving;

        // Get monster type name (lowercase)
        const monsterType = (monster.monsterType || 'goblin').toLowerCase();

        if (isMoving) {
            // Play walking animation (sprite sheet) or use static directional image
            const walkAnimKey = `${monsterType}_walk_${newDirection}`;
            if (scene.anims.exists(walkAnimKey)) {
                // Animated sprite sheet available
                monster.play(walkAnimKey);
            } else {
                // Use static directional image
                const staticTextureKey = `monster_${monsterType}_${newDirection}`;
                if (scene.textures.exists(staticTextureKey)) {
                    monster.setTexture(staticTextureKey);
                } else {
                    // Ultimate fallback: use old procedural texture
                    const fallbackKey = `monster_${monsterType}`;
                    if (scene.textures.exists(fallbackKey)) {
                        monster.setTexture(fallbackKey);
                    }
                }
            }
        } else {
            // Play idle animation or show static sprite
            const idleAnimKey = `${monsterType}_idle`;
            if (scene.anims.exists(idleAnimKey)) {
                monster.play(idleAnimKey);
            } else {
                // Fallback: show static directional image
                const staticTextureKey = `monster_${monsterType}_${newDirection}`;
                if (scene.textures.exists(staticTextureKey)) {
                    monster.setTexture(staticTextureKey);
                } else {
                    // Ultimate fallback: use old procedural texture
                    const fallbackKey = `monster_${monsterType}`;
                    if (scene.textures.exists(fallbackKey)) {
                        monster.setTexture(fallbackKey);
                    }
                }
            }
        }
    }
}

/**
 * Play monster attack animation
 */
function playMonsterAttackAnimation(monster) {
    const scene = game.scene.scenes[0];
    if (!monster || !monster.active) return;

    // Method 2 monsters (procedural) handle their own animations if needed, 
    // or use simpler visual cues for now.
    if (monster.blueprintId || monster.getData('isMethod2')) return;

    const monsterType = (monster.monsterType || 'goblin').toLowerCase();

    // Get the direction the monster is facing (default to south if not set)
    const direction = monster.facingDirection || 'south';
    const attackAnimKey = `${monsterType}_attack_${direction}`;

    monster.animationState = 'attacking';

    console.log(`🎬 Attempting to play attack animation: ${attackAnimKey} for ${monsterType} facing ${direction}`);

    // Try directional attack animation first
    if (scene.anims.exists(attackAnimKey)) {
        console.log(`✅ Found directional attack animation: ${attackAnimKey}`);
        monster.play(attackAnimKey);

        // Return to walking/idle after attack completes
        monster.once('animationcomplete', (animation) => {
            if (animation && animation.key === attackAnimKey) {
                monster.animationState = 'idle';
                updateMonsterAnimation(monster, 0); // Update to correct state
            }
        });
    } else {
        // Fallback: try non-directional attack animation
        const fallbackAttackKey = `${monsterType}_attack`;
        console.log(`⚠️ Directional animation not found, trying fallback: ${fallbackAttackKey}`);
        if (scene.anims.exists(fallbackAttackKey)) {
            monster.play(fallbackAttackKey);
            monster.once('animationcomplete', (animation) => {
                if (animation && animation.key === fallbackAttackKey) {
                    monster.animationState = 'idle';
                    updateMonsterAnimation(monster, 0);
                }
            });
        } else {
            console.log(`❌ No attack animation found for ${monsterType}`);
            // No attack animation available, just reset state after a short delay
            scene.time.delayedCall(300, () => {
                if (monster && monster.active) {
                    monster.animationState = 'idle';
                    updateMonsterAnimation(monster, 0);
                }
            });
        }
    }
}

/**
 * Play monster death animation
 */
function playMonsterDeathAnimation(monster) {
    const scene = game.scene.scenes[0];
    if (!monster || !monster.active) return;

    // Method 2 monsters (procedural) handle death via existing tween/fade logic
    if (monster.blueprintId || monster.getData('isMethod2')) return;

    const monsterType = (monster.monsterType || 'goblin').toLowerCase();
    const deathAnimKey = `${monsterType}_death`;

    monster.animationState = 'dying';

    if (scene.anims.exists(deathAnimKey)) {
        monster.play(deathAnimKey);
    }
    // If no death animation, the existing fade/rotate tween will handle it
}

/**
 * TODO: Next features to add:
 * 
 * 1. ✅ Combat system (DONE!)
 * 2. ✅ Item drops and pickup (DONE!)
 * 3. ✅ Inventory system (press 'I') - DONE!
 * 4. ✅ Equipment system (press 'E') - DONE!
 * 5. ✅ Quest system (press 'Q') - DONE!
 * 6. ✅ NPCs and Dialog system (press 'F') - DONE!
 * 5. Quest system (press 'Q') - Phase 5
 * 6. Multiple monster types
 * 7. Special abilities/spells
 */

/**
 * Show a temporary HUD notification for quest progress
 */// ============================================
// QUEST TRACKER HUD (WoW-style persistent tracker)
// ============================================
let questTrackerHUD = null;
let questTrackerEntries = {}; // keyed by quest ID

/**
 * Initialize/Update the persistent quest tracker HUD
 */
function updateQuestTrackerHUD() {
    const scene = game.scene.scenes[0];
    if (!scene) return;

    const screenWidth = scene.cameras.main.width;
    const startX = screenWidth - 300;
    let startY = 120;

    // Get active quests from UQE
    const activeQuests = (typeof uqe !== 'undefined' && uqe.activeQuests) ? uqe.activeQuests : [];

    // Remove entries for quests no longer active
    Object.keys(questTrackerEntries).forEach(questId => {
        if (!activeQuests.find(q => q.id === questId)) {
            const entry = questTrackerEntries[questId];
            if (entry.titleBg) entry.titleBg.destroy();
            if (entry.title) entry.title.destroy();
            entry.objectives.forEach(obj => {
                if (obj.bg) obj.bg.destroy();
                if (obj.text) obj.text.destroy();
            });
            delete questTrackerEntries[questId];
        }
    });

    // Create/update entries for each active quest
    let yOffset = 0;
    activeQuests.forEach(quest => {
        if (!questTrackerEntries[quest.id]) {
            // Create new entry with background
            const titleBg = scene.add.rectangle(startX + 130, startY + yOffset + 8, 280, 18, 0x000000, 0.65)
                .setScrollFactor(0).setDepth(199).setOrigin(0.5, 0.5);

            const titleText = scene.add.text(startX, startY + yOffset, quest.title, {
                fontSize: '14px',
                fill: '#ffd700',
                fontStyle: 'bold',
                fontFamily: 'Inter, Arial, sans-serif'
            }).setScrollFactor(0).setDepth(200).setOrigin(0, 0);

            questTrackerEntries[quest.id] = {
                titleBg: titleBg,
                title: titleText,
                objectives: [],
                yStart: startY + yOffset
            };
            yOffset += 20;

            // Create objective entries with backgrounds
            quest.objectives.forEach((obj, idx) => {
                const objBg = scene.add.rectangle(startX + 130, startY + yOffset + 7, 280, 16, 0x000000, 0.55)
                    .setScrollFactor(0).setDepth(199).setOrigin(0.5, 0.5);

                const objStr = `  ${obj.completed ? '✅' : '⏳'} ${obj.label}: ${obj.progress}/${obj.target}`;
                const objText = scene.add.text(startX, startY + yOffset, objStr, {
                    fontSize: '12px',
                    fill: obj.completed ? '#00ff00' : '#cccccc',
                    fontFamily: 'Inter, Arial, sans-serif'
                }).setScrollFactor(0).setDepth(200).setOrigin(0, 0);

                questTrackerEntries[quest.id].objectives.push({
                    bg: objBg,
                    text: objText,
                    objId: obj.id,
                    lastProgress: obj.progress
                });
                yOffset += 18;
            });
            yOffset += 8; // Spacing between quests
        } else {
            // Update existing entry
            const entry = questTrackerEntries[quest.id];
            entry.yStart = startY + yOffset;
            // Update title background and text positions
            if (entry.titleBg) entry.titleBg.y = startY + yOffset + 8;
            entry.title.y = startY + yOffset;
            yOffset += 20;

            // Update objective texts and backgrounds
            quest.objectives.forEach((obj, idx) => {
                if (entry.objectives[idx]) {
                    const objEntry = entry.objectives[idx];
                    const objStr = `  ${obj.completed ? '✅' : '⏳'} ${obj.label}: ${obj.progress}/${obj.target}`;
                    objEntry.text.setText(objStr);
                    objEntry.text.setFill(obj.completed ? '#00ff00' : '#cccccc');
                    objEntry.text.y = startY + yOffset;
                    if (objEntry.bg) objEntry.bg.y = startY + yOffset + 7;
                    yOffset += 18;
                }
            });
            yOffset += 8;
        }
    });
}

/**
 * Handle objective update - flash the updated objective
 */
function handleObjectiveUpdate(data) {
    const obj = data.objective;
    const questId = obj.parentQuest ? obj.parentQuest.id : null;

    if (!questId || !questTrackerEntries[questId]) {
        updateQuestTrackerHUD(); // Create tracker if doesn't exist
        return;
    }

    const scene = game.scene.scenes[0];
    const entry = questTrackerEntries[questId];

    // Find the objective entry and update it
    entry.objectives.forEach(objEntry => {
        if (objEntry.objId === obj.id) {
            // Update text
            const objStr = `  ${obj.completed ? '✅' : '⏳'} ${obj.label}: ${obj.progress}/${obj.target}`;
            objEntry.text.setText(objStr);

            // Flash effect - brief highlight on update
            if (objEntry.lastProgress !== obj.progress) {
                objEntry.text.setFill(obj.completed ? '#00ff00' : '#ffff00'); // Flash yellow
                scene.time.delayedCall(500, () => {
                    if (objEntry.text && objEntry.text.active) {
                        objEntry.text.setFill(obj.completed ? '#00ff00' : '#cccccc');
                    }
                });
                objEntry.lastProgress = obj.progress;
            }

            // If completed, mark green
            if (obj.completed) {
                objEntry.text.setFill('#00ff00');
            }
        }
    });
}

/**
 * Clear the quest tracker HUD
 */
function clearQuestTrackerHUD() {
    Object.keys(questTrackerEntries).forEach(questId => {
        const entry = questTrackerEntries[questId];
        if (entry.titleBg) entry.titleBg.destroy();
        if (entry.title) entry.title.destroy();
        entry.objectives.forEach(obj => {
            if (obj.bg) obj.bg.destroy();
            if (obj.text) obj.text.destroy();
        });
    });
    questTrackerEntries = {};
}

// Legacy compatibility - keep old function but redirect to new system  
let activeHUDNotifications = [];
function showQuestUpdateHUD(message, isComplete) {
    // This is now handled by the persistent tracker
    // Just trigger an update
    updateQuestTrackerHUD();
}

// ============================================
// DIALOG & LORE SYSTEM INTEGRATION
// ============================================

// Global manager instances
let milestoneManager = null;
let loreManager = null;
let dialogManager = null;

/**
 * Initialize the Dialog & Lore System
 * Call this from your game's create() function after other systems are ready
 * @param {Phaser.Scene} scene - The current Phaser scene
 */
function initializeDialogLoreSystem(scene) {
    console.log('🎭 Initializing Dialog & Lore System...');

    // Create managers
    milestoneManager = new MilestoneManager(scene);
    loreManager = new LoreManager(scene);
    dialogManager = new DialogManager(scene);

    // Attach to scene for access by managers
    scene.milestoneManager = milestoneManager;
    scene.loreManager = loreManager;
    scene.dialogManager = dialogManager;

    // Initialize from cached data
    milestoneManager.init();
    loreManager.init();
    dialogManager.init();

    // Set up event listeners for milestone triggers
    setupMilestoneListeners(scene);

    // Set up F key for NPC interaction
    setupNPCInteractionKey(scene);

    // Trigger game start milestone
    milestoneManager.onGameStart();

    console.log('✅ Dialog & Lore System initialized');
    console.log('💡 Press F near an NPC to talk');

    return { milestoneManager, loreManager, dialogManager };
}

/**
 * Set up event listeners for milestone triggers
 */
function setupMilestoneListeners(scene) {
    // Listen for quest completion events (from existing quest system)
    scene.events.on('quest_completed', (questId) => {
        if (milestoneManager) {
            milestoneManager.onQuestComplete(questId);
        }
    });

    // Listen for UQE quest completion
    scene.events.on('uqe_quest_completed', (quest) => {
        if (milestoneManager && quest && quest.id) {
            milestoneManager.onQuestComplete(quest.id);
        }
    });

    // Listen for level up
    scene.events.on('player_level_up', (level) => {
        if (milestoneManager) {
            milestoneManager.onLevelUp(level);
        }
    });

    // Listen for dialog quest acceptance
    scene.events.on('dialog_accept_quest', (questId) => {
        console.log('📜 Quest accepted via dialog:', questId);
        // TODO: Integrate with quest activation system
    });

    // Listen for milestone quest unlocks
    scene.events.on('milestone_quest_unlock', (questIds) => {
        console.log('🔓 Milestone unlocking quests:', questIds);
        // TODO: Integrate with quest activation system
    });
}

/**
 * Talk to an NPC - shows appropriate dialog based on game state
 * @param {string} npcId - The NPC's ID from npc.json
 * @returns {boolean} - True if dialog was started
 */
function talkToNPC(npcId) {
    if (!dialogManager) {
        console.warn('DialogManager not initialized. Call initializeDialogLoreSystem first.');
        return false;
    }

    return dialogManager.startDialog(npcId);
}

/**
 * Check if dialog system is active (blocks other input)
 */
function isDialogActive() {
    return dialogManager ? dialogManager.isActive() : false;
}

/**
 * Get lore stats for UI display
 */
function getLoreStats() {
    return loreManager ? loreManager.getStats() : { total: 0, unlocked: 0, percentage: 0 };
}

/**
 * Get unlocked lore for Codex UI
 */
function getUnlockedLore() {
    return loreManager ? loreManager.getUnlockedLore() : [];
}

/**
 * Get lore categories for Codex UI
 */
function getLoreCategories() {
    return loreManager ? loreManager.getCategoryCounts() : {};
}

// ============================================
// NPC INTERACTION KEY SETUP
// ============================================

// Track the F key for NPC interaction
let npcInteractKey = null;

/**
 * Set up F key for NPC interaction
 * @param {Phaser.Scene} scene - The current Phaser scene
 */
function setupNPCInteractionKey(scene) {
    // Create F key input
    npcInteractKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    // Add key press handler
    npcInteractKey.on('down', () => {
        // Don't process if dialog is already active
        if (isDialogActive()) return;

        // Don't process if player doesn't exist
        if (!player) return;

        // Check for nearby NPC
        const nearbyNPC = getNearbyNPC(player.x, player.y, 80);

        if (nearbyNPC && nearbyNPC.data) {
            console.log('🗣️ Starting dialog with:', nearbyNPC.data.name);
            talkToNPC(nearbyNPC.data.id);
        } else {
            // Optional: show "no one nearby" message
            console.log('No NPC nearby to talk to');
        }
    });

    console.log('⌨️ F key registered for NPC interaction');
}

// ============================================
// NPC INTERACTION HELPER
// ============================================

/**
 * Check if player is near an NPC and can interact
 * Call this from your update() loop or NPC click handler
 * @param {number} playerX - Player X position
 * @param {number} playerY - Player Y position
 * @param {number} interactRadius - Distance for interaction (default 50px)
 * @returns {object|null} - Nearest NPC within radius, or null
 */
function getNearbyNPC(playerX, playerY, interactRadius = 50) {
    let nearestNPC = null;
    let nearestDist = interactRadius;

    for (const npc of npcs) {
        if (!npc || !npc.sprite) continue;

        const dist = Phaser.Math.Distance.Between(
            playerX, playerY,
            npc.sprite.x, npc.sprite.y
        );

        if (dist < nearestDist) {
            nearestDist = dist;
            nearestNPC = npc;
        }
    }

    return nearestNPC;
}

/**
 * Handle 'F' key for NPC interaction
 * Add this to your key handlers in update()
 */
function handleNPCInteraction(scene) {
    if (!player || isDialogActive()) return;

    const nearbyNPC = getNearbyNPC(player.x, player.y, 60);

    if (nearbyNPC && nearbyNPC.data) {
        console.log('Interacting with NPC:', nearbyNPC.data.name);
        talkToNPC(nearbyNPC.data.id);
    }
}

// Export functions to global scope
window.initializeDialogLoreSystem = initializeDialogLoreSystem;
window.talkToNPC = talkToNPC;
window.isDialogActive = isDialogActive;
window.getLoreStats = getLoreStats;
window.getUnlockedLore = getUnlockedLore;
window.getLoreCategories = getLoreCategories;
window.getNearbyNPC = getNearbyNPC;
window.handleNPCInteraction = handleNPCInteraction;

console.log('🎭 Dialog & Lore System functions loaded. Call initializeDialogLoreSystem(scene) to activate.');
