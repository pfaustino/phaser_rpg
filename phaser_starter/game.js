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
    input: {
        gamepad: true
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
// Global State Variables
// Global State Variables
// (Moved to GameState.js)
// (Moved to GameState.js: questTrackerEntries, lastPlayerX/Y, monsters, items, npcs, isGamePaused)
let spaceKey;

let questMarkers = new Map(); // Quest objective markers (key: targetId, value: {sprite, tween})
let lastQuestMarkerUpdate = 0; // Throttle marker updates
let specialZones = []; // Populated from zones.json

// Monster spawn settings

// Monster spawn settings
// Monster spawn settings
// (Moved to Constants.js)

// Player stats
// Player stats
// (Moved to GameState.js)

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
// damageNumbers moved to DamageSystem.js
let comboText = null; // Combo counter display

let comboIndicator = null; // Combo visual indicator
let attackSpeedIndicator = null; // Attack speed bonus indicator
let weaponSprite = null; // Weapon sprite that follows player

// System chat box
let systemChatBox = null;
let chatMessages = [];
const MAX_CHAT_MESSAGES = 50;

// Inventory UI
var inventoryVisible = false;
let inventoryKey;
var inventoryPanel = null;
let inventoryItems = []; // Array of item display objects
// Tooltip state
let currentTooltip = null;
let tooltipHideTimer = null;

// Equipment UI
var equipmentVisible = false;
let equipmentKey;
var equipmentPanel = null;


// Settings UI
var settingsVisible = false;
let settingsKey;
var settingsPanel = null;
let musicEnabled = true; // Default to enabled

// Background music
let villageMusic = null;
let wildernessMusic = null;
let dungeonMusic = null;

// Quest UI
let questVisible = false;
let questKey;
let questPanel = null;
var questCompletedModal = null;
var newQuestModal = null;
let selectedQuestIndex = 0;
let questLogTab = 'current'; // 'current' or 'completed'
var pendingNewQuest = null; // Store new quest to show after completed modal closes
let pendingCompletedQuest = null; // Store completed quest to show after combat ends
let questManager = null; // Manager for data-driven quests
let monsterRenderer = null; // Renderer for data-driven monsters
let pathfinder = null; // A* Pathfinding system

// Dialog UI
var dialogVisible = false;
var dialogPanel = null;
let currentDialog = null;
let currentDialogNode = null;
let interactKey; // 'F' key for interaction

// Shop UI
var shopVisible = false;
var shopPanel = null;
let currentShopNPC = null;

// Building UI
var buildingPanelVisible = false;
var buildingPanel = null;
let currentBuilding = null;

// Assets window UI
let assetsVisible = false;
let assetsPanel = null;
let assetsKey; // CTRL+A key combination

// Grass debug window UI
let grassDebugVisible = false;
let grassDebugPanel = null;
let grassDebugKey; // CTRL+M key combination

// Mana Flux System
let manaFluxes = []; // Array of mana flux objects


// Dialog Queue System
let dialogQueue = [];
let isDialogQueueProcessing = false;
let questPopup = null; // Track popup reference

// Abilities system
let abilityBar = null;
let abilityButtons = [];

// Sound system
let soundsEnabled = true;
let soundEffects = {};
let audioUnlocked = false; // Track if audio context has been unlocked

// Global NPC Registry (Name -> Data)
let npcRegistry = {};

// Item quality colors
// Item quality colors
// (Moved to Constants.js)

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
    this.load.json('milestoneData', 'milestones.json');
    this.load.json('npcData', 'npc.json');
    this.load.json('zoneData', 'zones.json');



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

    // Dynamic NPC Loader
    this.load.on('filecomplete-json-npcData', (key, type, data) => {
        console.log('✅ NPC Data loaded! Loading NPC assets dynamically...');
        if (Array.isArray(data)) {
            data.forEach(npc => {
                // Load Sprite
                if (npc.spriteKey && npc.spritePath) {
                    if (!this.textures.exists(npc.spriteKey)) {
                        this.load.spritesheet(npc.spriteKey, npc.spritePath, {
                            frameWidth: npc.frameWidth || 64,
                            frameHeight: npc.frameHeight || 64
                        });
                        console.log(`   + Loaded NPC sprite: ${npc.name} (${npc.spriteKey})`);
                    }
                }
                // Load Portrait
                if (npc.portraitKey && npc.portraitPath) {
                    if (!this.textures.exists(npc.portraitKey)) {
                        this.load.image(npc.portraitKey, npc.portraitPath);
                        console.log(`   + Loaded NPC portrait: ${npc.name} (${npc.portraitKey})`);
                    }
                }
            });
        }
    });

    // Hardcoded loads REMOVED (Handled by above listener now)

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

    // Dynamic Quest Asset Loader (for modding support)
    this.load.on('filecomplete-json-questDataV2', (key, type, data) => {
        console.log('✅ Quest Data V2 loaded! Loading quest assets dynamically...');
        if (data && data.quests) {
            Object.values(data.quests).forEach(quest => {
                if (quest.assets && Array.isArray(quest.assets)) {
                    quest.assets.forEach(asset => {
                        // Skip if already loaded (unless we want to allow overrides)
                        if (this.textures.exists(asset.key) && asset.type !== 'audio') {
                            console.log(`   Detailed: Asset ${asset.key} already exists, skipping.`);
                            return;
                        }

                        console.log(`   + Loading quest asset: ${asset.key} (${asset.path})`);

                        switch (asset.type) {
                            case 'image':
                                this.load.image(asset.key, asset.path);
                                break;
                            case 'spritesheet':
                                this.load.spritesheet(asset.key, asset.path, {
                                    frameWidth: asset.frameWidth,
                                    frameHeight: asset.frameHeight
                                });
                                break;
                            case 'audio':
                                this.load.audio(asset.key, asset.path);
                                break;
                            default:
                                console.warn(`   ⚠️ Unknown asset type: ${asset.type} for ${asset.key}`);
                        }
                    });
                }
            });
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
    this.load.image('mana_potion', 'assets/images/mana-potion.png');
    this.load.image('character-fallen', 'assets/images/character-fallen.png');
    // item_fragment and item_crystal are now loaded dynamically from quests_v2.json
    this.load.audio('bell_toll', 'assets/audio/bell-toll-407826.mp3');

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
    this.load.spritesheet('monster_orc_attack_west', 'assets/animations/Orc-Attack-West.png', { frameWidth: 32, frameHeight: 32 });

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
    // wall.png removed - file doesn't exist

    // Load dungeon tilesets with alpha support
    // PNG images should automatically preserve transparency
    this.load.image('dungeon_floor_tileset', 'assets/tiles/dungeon/dungeon_floor_tileset.png');
    this.load.image('dungeon_wall_tileset', 'assets/tiles/dungeon/dungeon_wall_tileset.png');
    this.load.image('dungeon_entrance', 'assets/dungeon_entrance.png');
    this.load.text('dungeon_floor_metadata', 'assets/tiles/dungeon/dungeon_floor_metadata.json');
    this.load.text('dungeon_wall_metadata', 'assets/tiles/dungeon/dungeon_wall_metadata.json');

    // Generate fallback graphics AFTER preload completes
    // This prevents "texture key already in use" errors
    this.load.once('complete', () => {
        console.log('📦 Preload complete - generating fallback textures if needed...');

        // Create fallback player sprite (yellow circle with border) - only if not loaded
        if (!this.textures.exists('player')) {
            this.add.graphics()
                .fillStyle(0xffff00)
                .fillCircle(16, 16, 14)
                .lineStyle(2, 0x000000)
                .strokeCircle(16, 16, 14)
                .generateTexture('player', 32, 32);
            console.log('  ✅ Generated fallback player texture');
        }

        // Create wall tile (dark gray with border) - only if not loaded from file
        if (!this.textures.exists('wall')) {
            this.add.graphics()
                .fillStyle(0x505050)
                .fillRect(0, 0, 32, 32)
                .lineStyle(2, 0x303030)
                .strokeRect(0, 0, 32, 32)
                .fillStyle(0x606060)
                .fillRect(2, 2, 28, 2)
                .fillRect(2, 2, 2, 28)
                .generateTexture('wall', 32, 32);
            console.log('  ✅ Generated fallback wall texture');
        }

        // Create dirt tile (brown) - only if not loaded from file  
        if (!this.textures.exists('dirt')) {
            this.add.graphics()
                .fillStyle(0x8b4513)
                .fillRect(0, 0, 32, 32)
                .fillStyle(0x654321)
                .fillRect(4, 4, 24, 24)
                .fillStyle(0x9d5a2a)
                .fillRect(8, 8, 16, 16)
                .generateTexture('dirt', 32, 32);
            console.log('  ✅ Generated fallback dirt texture');
        }

        // Create stone tile (light gray checkerboard pattern) - only if not loaded from file
        if (!this.textures.exists('stone')) {
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
            console.log('  ✅ Generated fallback stone texture');
        }

        // Procedural monster generation - create different monster types with unique appearances
        // Procedural monster generation - create different monster types with unique appearances
        if (typeof TextureManager !== 'undefined') {
            TextureManager.generateProceduralMonsters(this);
        } else {
            console.error('TextureManager not loaded in callback!');
        }
    });

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

    // Wall, dirt, stone fallbacks are now generated in the load.once('complete') callback above

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
    this.load.audio('attack_swing', 'assets/audio/sword-slice.mp3');
    this.load.audio('hit_monster', 'assets/audio/hit_monster.mp3');
    this.load.audio('hit_player', 'assets/audio/hit_player.mp3');
    this.load.audio('monster_die', 'assets/audio/monster_die.mp3');
    this.load.audio('item_pickup', 'assets/audio/item_pickup.wav');
    this.load.audio('level_up', 'assets/audio/level_up.wav');
    this.load.audio('fireball_cast', 'assets/audio/fireball_cast.wav');
    this.load.audio('heal_cast', 'assets/audio/heal_cast.wav');

    // Weapon-specific hit sounds
    this.load.audio('sword_hit', 'assets/audio/sword-slice.mp3');
    this.load.audio('axe_hit', 'assets/audio/axe-slash.mp3');
    this.load.audio('mace_hit', 'assets/audio/mace-attack.mp3');
    this.load.audio('dagger_hit', 'assets/audio/dagger-hit.mp3');
    this.load.audio('staff_hit', 'assets/audio/staff-swing.mp3');
    this.load.audio('bow_hit', 'assets/audio/bow-release.mp3');

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

    // Sound Effects
    this.load.audio('attack', 'assets/audio/attack_swing.wav');
    this.load.audio('fireball', 'assets/audio/fireball_cast.wav');
    this.load.audio('ice_nova_sound', 'assets/audio/ice-nova.mp3');
    this.load.audio('heal', 'assets/audio/heal_cast.wav'); // Used for potions too
    this.load.audio('hit_monster', 'assets/audio/hit_monster.mp3');
    this.load.audio('hit_player', 'assets/audio/hit_player.mp3');
    this.load.audio('item_pickup', 'assets/audio/item_pickup.wav');
    this.load.audio('level_up', 'assets/audio/level-up.mp3'); // or level_up.wav
    this.load.audio('monster_die', 'assets/audio/monster_die.mp3');
    this.load.audio('new_quest', 'assets/audio/new-quest.mp3');
    this.load.audio('quest_complete', 'assets/audio/quest-completed.mp3');
    this.load.audio('gold_pickup', 'assets/audio/gold-pickup.mp3');

    // Verify loading
    this.load.on('filecomplete-audio-attack', () => console.log('✅ Loaded attack sound'));
    this.load.on('filecomplete-audio-level_up', () => console.log('✅ Loaded level_up sound'));


    // Generate procedural textures using the new manager
    if (typeof TextureManager !== 'undefined') {
        TextureManager.generateProceduralMonsters(this);
    } else {
        console.error('TextureManager not loaded!');
    }

    console.log('✅ Assets loaded: player (yellow), procedural monsters, grass (green), wall (gray), dirt (brown), stone (light gray)');
    console.log('✅ Item sprites created: weapon (blue), armor (green), consumable (red), gold (yellow)');
    console.log('✅ NPC sprite created: npc (cyan)');
    console.log('✅ Ability effects created: fireball, heal, shield');
    console.log('💡 To use real images: uncomment image loading lines in preload() and add assets/ folder');
}



/**
 * Create Mana Fluxes for the "Mana Instability" quest
 */
function createManaFluxes() {
    const scene = game.scene.scenes[0];
    const locations = [
        { x: 10, y: 15 }, // Near top-left
        { x: 30, y: 10 }, // Near top-right
        { x: 20, y: 30 }  // Near bottom center
    ];

    locations.forEach((loc, index) => {
        const x = loc.x * 32;
        const y = loc.y * 32;

        // Visual: Purple glow/particle
        // Use a simple circle if no particle texture, or 'flare' if avail
        // We'll use a tinted rock or existing sprite if possible, or just a circle

        // Using a particle emitter would be nice, but simple sprite is safer for now
        // We'll use a small circle graphic
        const flux = scene.add.circle(x, y, 10, 0xAA00FF, 0.7);
        flux.setDepth(5);

        // Add a pulsing tween
        scene.tweens.add({
            targets: flux,
            scale: 1.5,
            alpha: 0.4,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Add an inner core
        const core = scene.add.circle(x, y, 5, 0xFFFFFF, 0.9);
        core.setDepth(6);

        manaFluxes.push({
            id: `flux_${index}`,
            x: x,
            y: y,
            sprite: flux,
            core: core,
            active: true
        });
    });

    console.log('✨ Created 3 Mana Fluxes');
}

/**
 * Check for interaction with Mana Fluxes
 */
function checkManaFluxInteraction() {
    // Only allow if quest "Mana Instability" (main_01_007) is active
    // We check via UQE or legacy
    let questActive = false;
    if (window.uqe) {
        // Check if quest is in active list
        // uqe.activeQuests is usually a map or array
        // We can use the global helper or check uqe state
        if (window.uqe.isQuestActive) {
            questActive = window.uqe.isQuestActive('main_01_007');
        } else if (window.isQuestActive) {
            questActive = window.isQuestActive('main_01_007');
        }
    }

    if (!questActive) return false;

    const scene = game.scene.scenes[0];
    const interactionRadius = 60;

    for (const flux of manaFluxes) {
        if (!flux.active) continue;

        const distance = Phaser.Math.Distance.Between(player.x, player.y, flux.x, flux.y);

        if (distance < interactionRadius) {
            // Stabilize it!
            flux.active = false;

            // Visual feedback
            flux.sprite.setFillStyle(0x00FFFF); // Turn blue (stabilized)
            flux.core.setFillStyle(0x0088FF);

            // Pulse burst
            const burst = scene.add.circle(flux.x, flux.y, 5, 0x00FFFF, 1);
            scene.tweens.add({
                targets: burst,
                scale: 5,
                alpha: 0,
                duration: 500,
                onComplete: () => burst.destroy()
            });

            // Message
            showDamageNumber(player.x, player.y - 40, "Flux Stabilized!", 0x00FFFF);
            addChatMessage("You stabilized the Mana Flux!", 0x00FFFF, "✨");
            // playSound('level_up'); // Optional

            // UQE Event
            if (window.uqe && window.uqe.eventBus) {
                // Emit event that matches the quest objective
                // Objective looked for 'stabilized_flux' item pickup or similar

                // We'll emit 'item_pickup' with 'stabilized_flux'
                window.uqe.eventBus.emit('item_pickup', { id: 'stabilized_flux', amount: 1 });

                // Also emit a specific custom event just in case
                window.uqe.eventBus.emit('mana_flux_stabilized', { id: flux.id });

                console.log('⚡ Emitted item_pickup: stabilized_flux');
            }

            return true; // Handled interaction
        }
    }

    return false;
}

/**
 * Check for interaction with Special Zones (e.g. Town Square Investigation)
 */
function checkZoneInteraction() {
    // Initialize zones from JSON if not already done
    if (specialZones.length === 0 && game.scene.scenes[0].cache.json.exists('zoneData')) {
        const zoneData = game.scene.scenes[0].cache.json.get('zoneData');
        if (Array.isArray(zoneData)) {
            specialZones = zoneData;
            console.log(`Initialized ${specialZones.length} zones from JSON`);
        }
    }

    if (!player) return false;

    let interacted = false;

    specialZones.forEach(zone => {
        // Only check if objective is active (or if zone is always active)
        let isActive = zone.alwaysActive || false;

        // Check UQE
        if (window.uqe && window.uqe.questLog) {
            Object.values(window.uqe.questLog).forEach(q => {
                if (q.status === 'ACTIVE' && q.objectives) {
                    q.objectives.forEach(obj => {
                        if (obj.id === zone.requiredObjectiveId && !obj.isComplete) isActive = true;
                    });
                }
            });
        }

        if (isActive) {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, zone.x, zone.y);
            if (dist <= zone.radius && !interacted) {
                // Interaction radius met
                if (window.uqe) {
                    interacted = true;

                    // Generic Action Handler
                    const performAction = (action) => {
                        if (action.type === 'event') {
                            window.uqe.eventBus.emit(UQE_EVENTS[action.eventName], action.data || { id: zone.id });
                            if (action.feedback) showDamageNumber(player.x, player.y - 60, action.feedback, 0x00ffff);
                        } else if (action.type === 'give_item') {
                            if (playerStats.inventory) {
                                if (!playerStats.inventory[action.itemId]) playerStats.inventory[action.itemId] = 0;
                                playerStats.inventory[action.itemId] += action.amount;
                                if (action.feedback) showDamageNumber(player.x, player.y - 80, action.feedback, 0xffd700);
                            }
                        } else if (action.type === 'composite') {
                            if (action.actions) {
                                action.actions.forEach(subAction => performAction(subAction));
                            }
                        }
                    };

                    // Execute defined interaction
                    if (zone.onInteract) {
                        performAction(zone.onInteract);
                    } else {
                        // Fallback default
                        window.uqe.eventBus.emit(UQE_EVENTS.LOCATION_EXPLORED, { id: zone.id });
                        showDamageNumber(player.x, player.y - 60, "Investigated!", 0x00ffff);
                    }
                }
            }
        }
    });

    return interacted;
}

/**
 * Update indicators for special zones
 */
function updateZoneIndicators() {
    const scene = game.scene.scenes[0];
    if (!specialZones) return;

    specialZones.forEach(zone => {
        let isActive = false;
        if (window.uqe && window.uqe.questLog) {
            Object.values(window.uqe.questLog).forEach(q => {
                if (q.status === 'ACTIVE' && q.objectives) {
                    q.objectives.forEach(obj => {
                        if (obj.id === zone.id && !obj.isComplete) isActive = true;
                    });
                }
            });
        }

        if (isActive) {
            if (!zone.indicator) {
                zone.indicator = scene.add.text(zone.x, zone.y, zone.label ? '✨' : '✨', {
                    fontSize: '32px',
                    align: 'center'
                })
                    .setOrigin(0.5)
                    .setDepth(5);

                // Add pulsing animation
                scene.tweens.add({
                    targets: zone.indicator,
                    scale: 1.2,
                    alpha: 0.8,
                    yoyo: true,
                    repeat: -1,
                    duration: 800
                });
            }
            zone.indicator.setVisible(true);
        } else {
            if (zone.indicator) zone.indicator.setVisible(false);
        }
    });
}


function spawnDungeonMonsters() {
    const scene = game.scene.scenes[0];
    if (!MapManager.currentDungeon || !MapManager.currentDungeon.rooms) return;

    // Spawn monsters in rooms (not entrance room, not exit room)
    const combatRooms = MapManager.currentDungeon.rooms.slice(1, -1); // Skip first and last room

    combatRooms.forEach(room => {
        // Spawn 1-3 monsters per room
        const monsterCount = Phaser.Math.Between(1, 3);

        for (let i = 0; i < monsterCount; i++) {
            const x = (room.x + Phaser.Math.Between(1, room.width - 1)) * scene.tileSize;
            const y = (room.y + Phaser.Math.Between(1, room.height - 1)) * scene.tileSize;

            // Spawn random monster type (scaled by level)
            // Early floors (1-2) spawn Echo creatures for main quest
            let dungeonMonsterTypes = [];

            if (MapManager.dungeonLevel <= 2) {
                // Floor 1-2: Echo creatures for main quest line
                dungeonMonsterTypes = [
                    { name: 'Echo Rat', textureKey: 'monster_echo_mite', hp: 20, attack: 4, speed: 70, xp: 8, isProcedural: false, monsterType: 'echo_rat', spawnAmount: [3, 5] },
                    { name: 'Echo Rat', textureKey: 'monster_echo_mite', hp: 20, attack: 4, speed: 70, xp: 8, isProcedural: false, monsterType: 'echo_rat', spawnAmount: [3, 5] },
                    { name: 'Echo Mite', textureKey: 'monster_echo_mite', hp: 15, attack: 3, speed: 60, xp: 5, isProcedural: false, monsterType: 'echo_mite', spawnAmount: [2, 4] }
                ];
            } else {
                // Deeper floors: Standard dungeon monsters
                dungeonMonsterTypes = [
                    { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10, isProcedural: false, spawnAmount: [1, 3] },
                    { name: 'Orc', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20, isProcedural: false, spawnAmount: [1, 2] },
                    { name: 'Skeleton', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15, isProcedural: false, spawnAmount: [1, 2] }
                ];
            }

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
                            isProcedural: true,
                            spawnAmount: bp.stats.spawnAmount || [1, 1]
                        });
                    }
                });
            }

            const selectedType = Phaser.Utils.Array.GetRandom(dungeonMonsterTypes);
            const scaledHp = selectedType.hp + (MapManager.dungeonLevel * 10);
            const scaledAttack = selectedType.attack + (MapManager.dungeonLevel * 2);
            const scaledXp = (selectedType.xp || 10) + (MapManager.dungeonLevel * 5);

            // Determine pack size based on spawnAmount
            const spawnAmount = selectedType.spawnAmount || [1, 1];
            const packSize = Phaser.Math.Between(spawnAmount[0], spawnAmount[1]);

            console.log(`🦇 Dungeon pack spawn: ${selectedType.name} x${packSize}`);

            // Spawn the pack clustered around the spawn point
            for (let p = 0; p < packSize; p++) {
                const offsetX = p === 0 ? 0 : Phaser.Math.Between(-30, 30);
                const offsetY = p === 0 ? 0 : Phaser.Math.Between(-30, 30);
                spawnMonsterScaled(x + offsetX, y + offsetY, selectedType, scaledHp, scaledAttack, scaledXp);
            }
        }
    });

    // Spawn boss in exit room
    if (MapManager.currentDungeon.exit && MapManager.currentDungeon.rooms.length > 0) {
        const bossRoom = MapManager.currentDungeon.rooms[MapManager.currentDungeon.rooms.length - 1];
        const bossX = bossRoom.centerX * scene.tileSize;
        const bossY = bossRoom.centerY * scene.tileSize;

        spawnBossMonster(bossX, bossY, MapManager.dungeonLevel);
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
    MapManager.dungeonCompletions[dungeonKey] = true;

    // Clear dungeon from cache (force regeneration on next entry)
    delete MapManager.dungeonCache[dungeonKey];
    MapManager.currentDungeon = null;

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
            if (MapManager.currentDungeon && MapManager.currentDungeon.mapData) {
                const tileX = Math.floor(itemX / tileSize);
                const tileY = Math.floor(itemY / tileSize);

                // Check bounds
                if (tileX >= 0 && tileX < MapManager.currentDungeon.width &&
                    tileY >= 0 && tileY < MapManager.currentDungeon.height) {
                    const tileType = MapManager.currentDungeon.mapData[tileY][tileX];
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

        // Make item interactive for click-to-pickup
        // Reverting to default hit area to debug specific hit test issues
        itemSprite.setInteractive();
        itemSprite.isItem = true;
        itemSprite.itemId = item.type + '_' + Date.now() + '_' + i;
        itemSprite.itemData = item;

        // Add Hover Effect
        if (typeof window.enableHoverEffect === 'function') {
            window.enableHoverEffect(itemSprite, scene);
        }
        // Store item data (match structure used by dropItemsFromMonster)
        item.sprite = itemSprite;
        item.x = itemSprite.x;
        item.y = itemSprite.y;

        items.push(item);

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

    // Initialize Map Manager
    if (typeof MapManager !== 'undefined') {
        MapManager.init(this);
        console.log('✅ MapManager initialized');
    } else {
        console.error('❌ MapManager not found!');
    }

    // Initialize procedural monster renderer (Method 2)
    monsterRenderer = new MonsterRenderer(this);
    if (this.cache.json.exists('monsterData')) {
        monsterRenderer.init(this.cache.json.get('monsterData'));
    }

    // Load items data (weapon types, hit sounds, materials, etc.)
    if (typeof loadItemsData === 'function') {
        loadItemsData().then(() => {
            console.log('✅ Items system initialized');
        }).catch(err => {
            console.warn('⚠️ Items data failed to load, using defaults');
        });
    }

    // Initialize controller/gamepad support
    if (typeof loadControllerConfig === 'function') {
        loadControllerConfig().then(() => {
            if (typeof initController === 'function') {
                initController(this);
            }
        });
    }

    // Load persistent settings (independent of save game)
    loadSettings();

    // Initialize Global NPC Registry
    if (this.cache.json.exists('npcData')) {
        const npcList = this.cache.json.get('npcData');
        npcList.forEach(npc => {
            npcRegistry[npc.name] = npc;
        });
        console.log(`✅ NPC Registry initialized with ${Object.keys(npcRegistry).length} NPCs`);
    } else {
        console.warn('⚠️ npcData not found in cache - NPC portraits may be missing');
    }

    // Initialize Quest Manager
    questManager = new QuestManager(this);
    questManager.init();

    // Initialize Lore & Milestones
    this.loreManager = new LoreManager(this);
    this.loreManager.init();

    this.dialogManager = new DialogManager(this);
    this.dialogManager.init();

    // Load dialog data from JSON
    loadDialogs();

    this.milestoneManager = new MilestoneManager(this);
    if (this.cache.json.exists('milestoneData')) {
        this.milestoneManager.init(this.cache.json.get('milestoneData'));
    }

    // Initialize Codex UI Keys
    if (window.setupLoreCodexKeys) {
        window.setupLoreCodexKeys(this);
    }

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

            // Always update the tracker HUD to remove the completed quest
            updateQuestTrackerHUD();
            // Refresh Log UI
            if (questVisible) updateQuestLogItems();

            // Show UI Notification (via Queue)
            // Deferred logic is now handled by the queue system automatically
            console.log('✅ Queueing quest completion dialog');
            queueDialog('QUEST_COMPLETED', quest);
        });

        // Handle Objective Progress HUD - WoW-style persistent tracker
        uqe.eventBus.on(UQE_EVENTS.OBJECTIVE_UPDATED, (data) => {
            handleObjectiveUpdate(data);
        });

        // Handle Quest Accepted - update tracker HUD for auto-accepted quests
        uqe.eventBus.on(UQE_EVENTS.QUEST_ACCEPTED, (quest) => {
            console.log(`📋 [UQE Bridge] Quest Accepted: ${quest.title}`);
            addChatMessage(`Quest Started: ${quest.title}`, 0x00ffff, '📜');
            updateQuestTrackerHUD();
            if (questVisible) updateQuestLogItems();
        });

        // Handle Quest Available - show notification for chain quests
        uqe.eventBus.on(UQE_EVENTS.QUEST_AVAILABLE, (data) => {
            console.log(`🔔 [UQE Bridge] New quest available: ${data.questId}`);
            const def = data.definition;
            addChatMessage(`New Quest Available: ${def.title}`, 0x00ffff, '📜');

            // Queue the popup/preview
            queueDialog('QUEST_AVAILABLE', def);
        });

        // Initialize starter quests for new games (if no UQE quests active yet)
        // This runs after save data might have been loaded
        setTimeout(() => {
            if (uqe.activeQuests.length === 0 && uqe.completedQuests.length === 0) {
                console.log('🎮 [UQE Bridge] New game detected - initializing starter quest');
                uqe.initializeStarterQuests([
                    'main_01_001' // Tremors in the Earth (talk to Elder Malik) - starts main story
                ]);
                updateQuestTrackerHUD();
            } else {
                console.log(`✅ [UQE Bridge] Existing save - ${uqe.activeQuests.length} active, ${uqe.completedQuests.length} completed`);
            }
        }, 100);
    }

    // Parse dungeon tileset metadata and create texture frames
    if (typeof MapManager !== 'undefined') {
        MapManager.loadDungeonTilesets();
    }

    // Start with town map
    // Create initial map
    if (typeof MapManager !== 'undefined') {
        MapManager.createTownMap();
    } else {
        console.error('❌ MapManager not defined!');
    }

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
    const fullControlsText = 'WASD: Move | SPACE: Attack/Pickup | 1-3: Abilities | I: Inventory | E: Equipment \nQ: Quests | F: Interact | F5: Save | F9: Load | H: Help | CTRL+A: Assets';
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

    // Add F8 for Visual Debugging (Input Hit Areas)
    this.debugKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F8);

    // Add 'F' key for interaction
    interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    // Add 'ESC' key for settings
    settingsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Add save/load keys
    this.saveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F5);
    this.loadKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F9);

    // Add 'H' key for help/controls toggle
    this.helpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    // Add ability keys (1, 2, 3) and potion keys (4, 5)
    this.abilityOneKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.abilityTwoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.abilityThreeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.potionFourKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    this.potionFiveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);

    // Ensure keyboard triggers cast abilities/potions (Restoring functionality)
    this.input.keyboard.on('keydown-ONE', () => { if (window.useAbility) window.useAbility(1); });
    this.input.keyboard.on('keydown-TWO', () => { if (window.useAbility) window.useAbility(2); });
    this.input.keyboard.on('keydown-THREE', () => { if (window.useAbility) window.useAbility(3); });
    this.input.keyboard.on('keydown-FOUR', () => { if (window.useAbility) window.useAbility(4); });
    this.input.keyboard.on('keydown-FIVE', () => { if (window.usePotion) window.usePotion('health'); });
    this.input.keyboard.on('keydown-SIX', () => { if (window.usePotion) window.usePotion('mana'); });

    // Add CTRL+A for assets window
    assetsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.ctrlKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);

    // Add CTRL+M for grass debug window
    grassDebugKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    console.log('✅ Grass debug key (M) initialized:', grassDebugKey);

    // Initialize Controller System
    if (typeof loadControllerConfig === 'function') {
        loadControllerConfig().then(() => {
            if (typeof initController === 'function') {
                initController(this);
            }
        });
    }

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

    // Handle clicks on interactive objects (Monsters, NPCs)
    // Initialize click tracking variables
    this.lastEntityClickTime = 0;
    this.lastWindowCloseTime = 0;

    this.input.on('gameobjectdown', (pointer, gameObject) => {
        // Only handle primary button (left click)
        if (pointer.button !== 0) return;

        console.log('👉 GameObject Down:', gameObject.type, 'Key:', gameObject.texture ? gameObject.texture.key : 'no-texture', 'Depth:', gameObject.depth, 'isItem:', gameObject.isItem);

        // Block interaction if any UI window is open
        if (isAnyWindowOpen()) {
            console.log('⛔ Interaction blocked by open window');
            return;
        }

        // Check if it's an NPC or Monster
        if (gameObject.npcId || gameObject.monsterId) {
            console.log('🎯 Clicked on entity:', gameObject.name || gameObject.monsterType);

            // Record click time to prevent update loop from immediately overriding this
            // with a "ground click" event
            this.lastEntityClickTime = this.time.now;
            // Also track window close time to prevent click-through
            // this.lastWindowCloseTime = 0; // This line is now initialized outside.

            // Set as target for movement/interaction
            this.clickMoveTarget = { x: gameObject.x, y: gameObject.y };
            this.clickTargetEntity = gameObject; // Store the specific entity
            this.isMovingToClick = true;

            // Prevent the general pointerdown event (ground click) from overriding this
            pointer.event.stopPropagation();
        }
        // Handle Item Clicks
        else if (gameObject.isItem) {
            console.log('🎒 Clicked on item:', gameObject.itemData ? gameObject.itemData.name : 'Unknown Item');

            this.lastEntityClickTime = this.time.now;

            // Set target for movement to item
            this.clickMoveTarget = { x: gameObject.x, y: gameObject.y };
            this.clickTargetEntity = gameObject;
            this.isMovingToClick = true;

            pointer.event.stopPropagation();
        }
    });

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

    // Game Title
    this.add.text(this.scale.width / 2, 10, 'RPG ADVENTURE: SHATTERED AEGIS', {
        fontFamily: 'Cinzel, "Times New Roman", serif',
        fontSize: '24px',
        color: '#ffcc00',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true }
    })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(30000);

    // Version Number
    this.add.text(this.scale.width - 10, 10, 'v0.9.141', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        align: 'right'
    })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(30000);

    console.log('Game created');
}

/**
 * Handle World Interaction (F Key / Controller A)
 * Returns true if an interaction occurred (blocking other actions)
 */
function triggerWorldInteraction() {
    // Check for transition markers first
    let nearMarker = false;

    // Check for zone interactions (Quests)
    if (typeof checkZoneInteraction === 'function' && checkZoneInteraction()) {
        return true;
    }

    // Check Mana Flux interactions first (closest priority)
    if (typeof checkManaFluxInteraction === 'function' && checkManaFluxInteraction()) {
        return true; // Handled
    }

    // Check transition markers
    for (const marker of MapManager.transitionMarkers) {
        if (!marker || !marker.x || !marker.y) continue;
        const distance = Phaser.Math.Distance.Between(player.x, player.y, marker.x, marker.y);
        if (distance <= marker.radius) {
            const targetLevel = marker.dungeonLevel || 1;

            // Check if trying to go to next level - require previous level boss to be defeated
            if (marker.targetMap === 'dungeon' && targetLevel > 1) {
                const previousLevel = targetLevel - 1;
                const previousLevelKey = `level_${previousLevel}`;
                const previousLevelCompleted = MapManager.dungeonCompletions[previousLevelKey] || false;

                if (!previousLevelCompleted) {
                    showDamageNumber(player.x, player.y - 40, `Defeat Level ${previousLevel} Boss First!`, 0xff0000);
                    console.log(`❌ Cannot go to level ${targetLevel} - level ${previousLevel} boss not defeated`);
                    return true;
                }

                // Also require all monsters to be defeated
                const livingMonsters = monsters.filter(m => m.active && !m.isDead);
                if (livingMonsters.length > 0) {
                    showDamageNumber(player.x, player.y - 40, `Defeat All Monsters! (${livingMonsters.length} Left)`, 0xff0000);
                    console.log(`❌ Cannot go to level ${targetLevel} - ${livingMonsters.length} monsters remaining`);
                    return true;
                }
            }

            console.log(`🚪 Transitioning to ${marker.targetMap} level ${targetLevel}`);
            try {
                MapManager.transitionToMap(marker.targetMap, targetLevel);
            } catch (e) {
                console.error('❌ Error during transition:', e);
            }
            return true;
        }
    }

    // If not near a marker, check building or NPC interaction

    // If building UI is open, close it (handled by caller usually, but good check)
    if (typeof buildingPanelVisible !== 'undefined' && buildingPanelVisible) {
        if (typeof closeBuildingUI === 'function') closeBuildingUI();
        return true;
    }

    // Check MapManager.buildings first (in town), then NPCs
    if (typeof MapManager.currentMap !== 'undefined' && MapManager.currentMap === 'town') {
        if (typeof checkBuildingInteraction === 'function') {
            checkBuildingInteraction();
            // If building UI opened, return true
            if (typeof buildingPanelVisible !== 'undefined' && buildingPanelVisible) return true;
        }
    }

    if (typeof checkNPCInteraction === 'function') {
        const dialogOpened = checkNPCInteraction();
        if (dialogOpened) return true;
    }

    return false;
}
window.triggerWorldInteraction = triggerWorldInteraction;

/**
 * Handle Item Pickup (Spacebar / Controller A)
 * Returns true if an item was picked up
 */
function triggerItemPickup() {
    let itemPickedUp = false;

    // Check for nearby items first
    items.forEach((item, index) => {
        if (!item.sprite || !item.sprite.active) return;

        // Skip if already picked up this frame
        if (itemPickedUp) return;

        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            item.sprite.x, item.sprite.y
        );

        // Pick up item if player is close (within 30 pixels)
        if (distance < 30) {
            pickupItem(item, index);
            itemPickedUp = true;
        }
    });

    return itemPickedUp;
}
window.triggerItemPickup = triggerItemPickup;

/**
 * Update loop (like pygame game loop)
 */
function update(time, delta) {
    // Update Damage/Healing Numbers
    if (window.updateDamageNumbers) {
        window.updateDamageNumbers(time, delta);
    }

    // If game is paused (e.g. death dialog), stop all game logic
    if (typeof isGamePaused !== 'undefined' && isGamePaused) {
        return;
    }
    // Update Unified Quest Engine
    if (window.uqe) {
        window.uqe.update();
    }

    // Update Zone Indicators
    if (typeof updateZoneIndicators === 'function') {
        updateZoneIndicators();
    }

    // Check for Zone Interactions
    if (typeof checkZoneInteraction === 'function') {
        checkZoneInteraction();
    }

    // Handle gamepad/controller input
    if (typeof handleGamepadInput === 'function') {
        handleGamepadInput();
    }

    // Mana Instability Quest Update
    updateManaFluxNodes();

    // Defense Quest Wave Spawner
    updateDefenseQuestSpawner(time);

    // Quest Markers (bobbing arrows above objectives)
    updateQuestMarkers(time);

    // Check for pending quest completion (delayed by combat)
    if (pendingCompletedQuest) {
        // If undefined, assume not in combat to be safe, otherwise check
        const inCombin = (typeof isInCombat === 'function') ? isInCombat() : false;

        if (!inCombin && !questCompletedModal) {
            console.log('⚔️ Combat over - showing deferred quest completion modal');
            const quest = pendingCompletedQuest;
            pendingCompletedQuest = null;

            showQuestCompletedPopupEnhanced({
                title: quest.title,
                rewards: quest.rewards,
                description: quest.description
            });
        }
    }

    // --- Survival Timer ---
    // Initialize accumulator if needed
    if (this.survivalAccumulator === undefined) {
        this.survivalAccumulator = 0;
    }

    // Add delta time (ms)
    this.survivalAccumulator += delta;

    // Check for 1-second intervals
    if (this.survivalAccumulator >= 1000) {
        const seconds = Math.floor(this.survivalAccumulator / 1000);
        this.survivalAccumulator -= (seconds * 1000);

        // Emit event to UQE for quests (Quest 006: Survivor)
        if (window.uqe && window.uqe.eventBus) {
            window.uqe.eventBus.emit('time_survived', { seconds: seconds });
        }

        // Check milestones directly (since MilestoneManager triggers manually)
        if (window.milestoneManager) {
            window.milestoneManager.checkTriggers('survive_time', { seconds: seconds });
        }
    }
    // ----------------------

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

    // Process dialog queue
    processDialogQueue();

    // Player movement (like your movement system)
    // Don't allow movement when shop/inventory/dialog/settings/building is open

    // Check if controller is providing input (don't reset if controller is active)
    const controllerActive = typeof isControllerConnected === 'function' && isControllerConnected();
    const hasControllerMovement = controllerActive && (Math.abs(player.body.velocity.x) > 0 || Math.abs(player.body.velocity.y) > 0);

    // Only reset velocity if no controller movement
    if (!hasControllerMovement) {
        player.setVelocity(0);
    }

    if (shopVisible || inventoryVisible || dialogVisible || settingsVisible || buildingPanelVisible) {
        // Don't process movement when UI is open, but continue with other updates
        // Reset velocity when in UI (even if controller was moving)
        player.setVelocity(0);
    } else {
        // Normal movement processing
        let moving = false;
        let newDirection = player.facingDirection; // Default to current direction

        // Keyboard Movement supersedes mouse movement
        if (cursors.left.isDown || this.wasd.A.isDown) {
            player.setVelocityX(-speed);
            newDirection = 'west';
            moving = true;
            this.isMovingToClick = false; // Cancel click movement
        } else if (cursors.right.isDown || this.wasd.D.isDown) {
            player.setVelocityX(speed);
            newDirection = 'east';
            moving = true;
            this.isMovingToClick = false; // Cancel click movement
        }

        if (cursors.up.isDown || this.wasd.W.isDown) {
            player.setVelocityY(-speed);
            newDirection = 'north';
            moving = true;
            this.isMovingToClick = false; // Cancel click movement
        } else if (cursors.down.isDown || this.wasd.S.isDown) {
            player.setVelocityY(speed);
            newDirection = 'south';
            moving = true;
            this.isMovingToClick = false; // Cancel click movement
        }

        // Mouse/Touch Movement (Click-to-Move)
        const pointer = this.input.activePointer;

        // Check for click input to set target
        // We use pointer down to set the target (works for click and drag/hold)
        if (pointer.isDown && pointer.button === 0) {
            // DEBUG: Log everything under the pointer
            const debugHitTest = this.input.hitTestPointer(pointer);
            if (debugHitTest.length > 0) {
                console.log('🖱️ Pointer Down Hit Test Results:', debugHitTest.length, 'objects');
                debugHitTest.forEach((obj, idx) => {
                    console.log(`   [${idx}] Type: ${obj.type}, Depth: ${obj.depth}, Item: ${obj.isItem}, Monster: ${obj.monsterId}, NPC: ${obj.npcId}, Name: ${obj.name}`);
                });
            } else {
                console.log('🖱️ Pointer Down: No objects detected under cursor');
            }

            // Robust UI Check: Block if cursor is over any high-depth object (UI > 100)
            const hitObjects = this.input.hitTestPointer(pointer);
            const isOverUI = hitObjects.some(obj => {
                const isUI = obj.depth > 100 && !obj.monsterId && !obj.npcId;
                if (isUI) console.log('🛑 Blocking UI Object:', obj.type, 'Depth:', obj.depth, 'Name:', obj.name);
                return isUI;
            });

            if (isOverUI) {
                return;
            }

            // Check if clicking on UI (HUD area at top) 
            if (pointer.y > 60) {
                // Block movement if any UI window is open (except HUD)
                if (!isAnyWindowOpen()) {
                    // Check if we specifically clicked an entity recently (within 250ms)
                    if (this.time.now - this.lastEntityClickTime < 250) {
                        return;
                    }

                    // Check if a window just closed recently (within 500ms)
                    // This prevents clicks on "Accept/Complete" buttons from registering as movement
                    if (this.lastWindowCloseTime && this.time.now - this.lastWindowCloseTime < 500) {
                        console.log('🛑 Movement blocked due to recent window close. Delta:', this.time.now - this.lastWindowCloseTime);
                        return;
                    }

                    console.log('Movement Triggered. WindowsOpen:', isAnyWindowOpen(), 'LastCloseDelta:', this.time.now - (this.lastWindowCloseTime || 0));

                    // Set target position
                    this.clickMoveTarget = { x: pointer.worldX, y: pointer.worldY };
                    this.isMovingToClick = true;
                    // Reset target entity when clicking on empty ground
                    this.clickTargetEntity = null;
                }
            }
        }

        // Process movement towards target if active
        if (!moving && this.isMovingToClick && this.clickMoveTarget) {
            const distance = Phaser.Math.Distance.Between(player.x, player.y, this.clickMoveTarget.x, this.clickMoveTarget.y);

            if (distance > 10) {
                // Determine effective target range based on entity type
                let targetRange = 10;
                if (this.clickTargetEntity) {
                    // Update target position in case entity moved
                    this.clickMoveTarget = { x: this.clickTargetEntity.x, y: this.clickTargetEntity.y };

                    if (this.clickTargetEntity.monsterId) {
                        targetRange = 40; // Attack range (reliable for 50px check)
                    } else if (this.clickTargetEntity.npcId) {
                        targetRange = 40; // Interaction range (reliable for 50px check)
                    } else if (this.clickTargetEntity.isItem) {
                        targetRange = 20; // Move closer for items
                    }
                }

                // Move towards target if outside range
                const distToTarget = Phaser.Math.Distance.Between(player.x, player.y, this.clickMoveTarget.x, this.clickMoveTarget.y);

                if (distToTarget > targetRange) {
                    this.physics.moveTo(player, this.clickMoveTarget.x, this.clickMoveTarget.y, speed);
                    moving = true;

                    // Update direction based on velocity
                    if (Math.abs(player.body.velocity.x) > Math.abs(player.body.velocity.y)) {
                        newDirection = player.body.velocity.x > 0 ? 'east' : 'west';
                    } else {
                        newDirection = player.body.velocity.y > 0 ? 'south' : 'north';
                    }
                } else {
                    // Reached target (or close enough to interact)
                    player.setVelocity(0);
                    this.isMovingToClick = false;

                    // Trigger interaction if we have a target entity
                    if (this.clickTargetEntity) {
                        const entity = this.clickTargetEntity;
                        this.clickTargetEntity = null; // Clear target after interaction

                        // Handle Monster Attack
                        if (entity.monsterId) {
                            console.log('⚔️ Auto-attacking monster:', entity.name);
                            // Face the monster
                            const angle = Phaser.Math.Angle.Between(player.x, player.y, entity.x, entity.y);
                            if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
                                player.facingDirection = Math.cos(angle) > 0 ? 'east' : 'west';
                            } else {
                                player.facingDirection = Math.sin(angle) > 0 ? 'south' : 'north';
                            }
                            // Trigger attack
                            playerAttack();
                        }
                        // Handle NPC Interaction
                        else if (entity.npcId) {
                            console.log('💬 Auto-interacting with NPC:', entity.name);
                            checkNPCInteraction();
                        }
                        // Handle Item Pickup
                        else if (entity.isItem) {
                            console.log('🎒 Auto-pickup item:', entity.itemData ? entity.itemData.name : 'Unknown Item');

                            // Iterate to find the index
                            const itemIndex = items.findIndex(i => i.sprite === entity || i === entity.itemData);
                            if (entity.itemData) {
                                pickupItem(entity.itemData, itemIndex !== -1 ? itemIndex : -1);
                            } else {
                                // Fallback if itemData missing
                                console.warn('Item missing itemData', entity);
                                if (entity.destroy) entity.destroy();
                            }
                        }
                    }
                }
            } else {
                // Reached target (generic move)
                player.setVelocity(0);
                this.isMovingToClick = false;
            }
        }

        // Check if controller is providing movement
        if (controllerActive && !moving) {
            const velX = player.body.velocity.x;
            const velY = player.body.velocity.y;
            if (velX !== 0 || velY !== 0) {
                moving = true;
                // Determine direction from controller velocity
                if (Math.abs(velX) > Math.abs(velY)) {
                    newDirection = velX < 0 ? 'west' : 'east';
                } else if (velY !== 0) {
                    newDirection = velY < 0 ? 'north' : 'south';
                }
            }
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
    if (MapManager.currentMap === 'town' && MapManager.buildings.length > 0) {
        const playerSize = 12; // Smaller collision box for easier navigation (matches dungeon)
        const deltaTime = delta / 1000;

        // Store original velocities before collision check
        const originalVelX = player.body.velocity.x;
        const originalVelY = player.body.velocity.y;

        // Check if player is currently overlapping with any MapManager.buildings
        let isTouchingBuilding = false;
        let touchingBuildings = [];

        for (const building of MapManager.buildings) {
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
        for (const building of MapManager.buildings) {
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

            for (const building of MapManager.buildings) {
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

            for (const building of MapManager.buildings) {
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

                    // For vertical MapManager.buildings: allow Y movement (sliding along) OR X movement away from building
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
                            // Moving away from vertical building - check if it would collide with other MapManager.buildings
                            const testX = player.x + originalVelX * deltaTime;
                            let wouldCollideWithOther = false;
                            for (const otherBuilding of MapManager.buildings) {
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
                            for (const otherBuilding of MapManager.buildings) {
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

                    // For horizontal MapManager.buildings: allow X movement (sliding along) OR Y movement away from building
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
                            for (const otherBuilding of MapManager.buildings) {
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
                            for (const otherBuilding of MapManager.buildings) {
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
        // This allows sliding along MapManager.buildings when moving diagonally
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
    if (MapManager.currentMap === 'dungeon' && MapManager.dungeonWalls.length > 0) {
        const playerSize = 12; // Smaller collision box for easier navigation (was 16)
        const deltaTime = delta / 1000;

        // Store original velocities before collision check
        const originalVelX = player.body.velocity.x;
        const originalVelY = player.body.velocity.y;

        // Check if player is currently overlapping with any walls
        let isTouchingWall = false;
        let touchingWalls = [];

        for (const wall of MapManager.dungeonWalls) {
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
        for (const wall of MapManager.dungeonWalls) {
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

            for (const wall of MapManager.dungeonWalls) {
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

            for (const wall of MapManager.dungeonWalls) {
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
                            for (const otherWall of MapManager.dungeonWalls) {
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
                            for (const otherWall of MapManager.dungeonWalls) {
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
                            for (const otherWall of MapManager.dungeonWalls) {
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
                            for (const otherWall of MapManager.dungeonWalls) {
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
                            for (const otherWall of MapManager.dungeonWalls) {
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
    // Player attack or item pickup (Spacebar)
    // Priority: Pick up items if nearby, otherwise attack
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        // Try pickup first
        if (!triggerItemPickup()) {
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

    // Potion keys (4, 5)
    if (scene.potionFourKey && Phaser.Input.Keyboard.JustDown(scene.potionFourKey)) {
        usePotion('health');
    }
    if (scene.potionFiveKey && Phaser.Input.Keyboard.JustDown(scene.potionFiveKey)) {
        usePotion('mana');
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
            triggerWorldInteraction();
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

    // Toggle Debug Visualization (F8)
    if (scene.debugKey && Phaser.Input.Keyboard.JustDown(scene.debugKey)) {
        scene.debugMode = !scene.debugMode;
        console.log(`🔧 Debug Mode: ${scene.debugMode ? 'ON' : 'OFF'}`);
        addChatMessage(`Debug Mode: ${scene.debugMode ? 'Enabled' : 'Disabled'}`, 0xff00ff);

        // Physics Debug
        if (!scene.physics.world.debugGraphic) {
            scene.physics.world.createDebugGraphic();
        }
        scene.physics.world.debugGraphic.visible = scene.debugMode;

        // Input Hit Area Debug - GLOBAL SCAN
        let count = 0;
        scene.children.list.forEach(child => {
            if (child.input && child.input.enabled) {
                if (scene.debugMode) {
                    scene.input.enableDebug(child, 0xffff00);
                    count++;
                } else {
                    scene.input.removeDebug(child);
                }
            }
            // Also check containers
            if (child.type === 'Container' && child.list) {
                child.list.forEach(grandchild => {
                    if (grandchild.input && grandchild.input.enabled) {
                        if (scene.debugMode) {
                            scene.input.enableDebug(grandchild, 0xffff00);
                            count++;
                        } else {
                            scene.input.removeDebug(grandchild);
                        }
                    }
                });
            }
        });
        console.log(`FOUND ${count} interactive objects.`);
        console.log('Items List Size:', items.length);
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

    // Track survival time - handled in main update loop above (line ~4227)
    // Removed duplicate emission to prevent double counting

    // Check quest progress
    checkQuestProgress();

    // Monster respawn system - only in wilderness
    if (MapManager.currentMap === 'wilderness' && monsters.length < MONSTER_RESPAWN_THRESHOLD) {
        const scene = game.scene.scenes[0];
        const mapWidth = scene.mapWidth * scene.tileSize;
        const mapHeight = scene.mapHeight * scene.tileSize;
        const monstersNeeded = MAX_MONSTERS - monsters.length;

        // Use data-driven monster types if available
        let monsterTypes = [
            { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10, isProcedural: false, spawnAmount: [1, 3] },
            { name: 'Orc', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20, isProcedural: false, spawnAmount: [1, 2] },
            { name: 'Skeleton', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15, isProcedural: false, spawnAmount: [1, 2] },
            { name: 'Spider', textureKey: 'monster_spider', hp: 20, attack: 4, speed: 70, xp: 8, isProcedural: false, spawnAmount: [3, 5] },
            { name: 'Slime', textureKey: 'monster_slime', hp: 15, attack: 3, speed: 30, xp: 5, isProcedural: false, spawnAmount: [2, 4] },
            { name: 'Wolf', textureKey: 'monster_wolf', hp: 40, attack: 7, speed: 65, xp: 18, isProcedural: false, spawnAmount: [2, 3] },
            { name: 'Dragon', textureKey: 'monster_dragon', hp: 80, attack: 12, speed: 35, xp: 40, isProcedural: false, spawnAmount: [1, 1] },
            { name: 'Echo_Mite', textureKey: 'monster_echo_mite', hp: 15, attack: 3, speed: 60, xp: 5, isProcedural: false, spawnAmount: [2, 4] },
            { name: 'Ghost', textureKey: 'monster_ghost', hp: 35, attack: 6, speed: 55, xp: 12, isProcedural: false, spawnAmount: [1, 2] }
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
                    isProcedural: true,
                    spawnAmount: bp.stats.spawnAmount || [1, 1]
                });
            });
        }

        // Spawn monsters away from player (using pack spawning)
        let spawned = 0;
        while (spawned < monstersNeeded) {
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

            // Determine pack size based on spawnAmount
            const spawnAmount = type.spawnAmount || [1, 1];
            const packSize = Phaser.Math.Between(spawnAmount[0], spawnAmount[1]);

            console.log(`🐺 Pack spawn: ${type.name} x${packSize} (range: ${spawnAmount[0]}-${spawnAmount[1]})`);

            // Spawn the pack clustered around the spawn point
            for (let p = 0; p < packSize && spawned < monstersNeeded; p++) {
                // Offset each pack member slightly from the center
                const offsetX = p === 0 ? 0 : Phaser.Math.Between(-40, 40);
                const offsetY = p === 0 ? 0 : Phaser.Math.Between(-40, 40);
                spawnMonster.call(scene, spawnX + offsetX, spawnY + offsetY, type);
                spawned++;
            }
        }
    }

    // Update NPC indicators
    updateNPCIndicators();

    // Update building indicators (only in town)
    if (MapManager.currentMap === 'town') {
        updateBuildingIndicators();
    }

    // Update transition marker visibility (pulse effect when near)
    MapManager.transitionMarkers.forEach(marker => {
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
    // Add collision against dungeon walls
    if (MapManager.currentMap === 'dungeon' && MapManager.wallGroup && monsters.length > 0) {
        this.physics.collide(monsters, MapManager.wallGroup);
    }

    monsters.forEach((monster, index) => {
        // Skip if monster is invalid or destroyed
        if (!monster || !monster.active || !monster.body) {
            return;
        }

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

        // UNIFIED COMBAT LOGIC (Handled by MonsterRenderer in monsters.js)
        // This ensures wilderness and dungeon behavior is consistent
        if (monsterRenderer && typeof monsterRenderer.updateMonsterBehavior === 'function') {
            // Pass context and callbacks
            monsterRenderer.updateMonsterBehavior(
                monster,
                player,
                time,
                delta,
                MapManager.currentMap,
                pathfinder,
                monsterAttackPlayer // Pass the global attack function
            );
        } else {
            console.warn('⚠️ MonsterRenderer not initialized or missing updateMonsterBehavior');
        }

        // Monster attack player if in range


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
    // Check if combat just ended and show pending quest modals
    const currentlyInCombat = isInCombat();
    if (!currentlyInCombat && (pendingCompletedQuest || pendingNewQuest)) {
        // Combat ended, show pending quest modals
        if (pendingCompletedQuest) {
            const questToShow = pendingCompletedQuest;
            pendingCompletedQuest = null;
            showQuestCompletedPopupEnhanced(questToShow);
        } else if (pendingNewQuest) {
            // Only show new quest if no completed quest was pending
            const questToShow = pendingNewQuest;
            pendingNewQuest = null;
            showNewQuestModal(questToShow);
        }
    }
}

/**
 * Handle monster death (XP, quests, loot, animations)
 */
function handleMonsterDeath(monster) {
    if (!monster || monster.isDead) return;
    monster.isDead = true;

    const scene = game.scene.scenes[0];

    // --- Stats & Events ---
    // Update kill stats
    if (!playerStats.questStats.monstersKilled) playerStats.questStats.monstersKilled = 0;
    playerStats.questStats.monstersKilled++;

    // Emit UQE event (for Quests)
    if (window.uqe && window.uqe.eventBus) {
        window.uqe.eventBus.emit('monster_killed', {
            id: monster.monsterId || monster.id || 'unknown',
            type: monster.monsterType || monster.type || 'unknown'
        });
    }

    // Emit Milestone event
    if (window.milestoneManager) {
        window.milestoneManager.checkTriggers('stat_change', {
            stat: 'monsters_killed',
            value: playerStats.questStats.monstersKilled
        });

        if (monster.isBoss) {
            window.milestoneManager.checkTriggers('boss_kill', {
                bossId: monster.monsterId
            });
        }
    }
    // ----------------------

    // Check if this was a boss in a dungeon
    if (monster.isBoss && MapManager.currentMap === 'dungeon') {
        onBossDefeated(MapManager.dungeonLevel, monster.x, monster.y);
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

    // Track quest progress - (legacy stat, UQE event already emitted above)

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

    // Play weapon-specific attack swing sound
    const swingSound = (typeof getWeaponHitSound === 'function') ? getWeaponHitSound(weaponType) : 'attack_swing';
    playSound(swingSound);

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
        createHitEffects(closestMonster.x, closestMonster.y, isCritical, 'physical', weaponType);

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

        // Play weapon-specific hit sound (uses items.js getWeaponHitSound)
        const hitSound = (typeof getWeaponHitSound === 'function') ? getWeaponHitSound(weaponType) : 'hit_monster';
        console.log(`🔊 Weapon hit: type=${weaponType}, sound=${hitSound}`);
        playSound(hitSound);

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

    // Check for player death
    if (playerStats.hp <= 0) {
        showFallenDialog();
    }

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
        showFallenDialog();
    }
}

/**
 * Create hit particle effects at impact point
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {boolean} isCritical - Whether this is a critical hit
 * @param {string} damageType - 'physical' or 'magic' (default: 'physical')
 */
function createHitEffects(x, y, isCritical = false, damageType = 'physical', weaponType = 'Unarmed') {
    const scene = game.scene.scenes[0];

    // Create particle emitter for hit sparks
    if (!scene.textures.exists('hit_spark')) {
        // Fallback or ensure texture exists
    }

    const particleCount = isCritical ? 30 : 16; // Increased count
    const baseSize = isCritical ? 5 : 3;

    // Color-coded by weapon type / damage type
    let colors;

    // Override colors based on weapon type if physical
    if (damageType === 'physical') {
        if (weaponType === 'Unarmed') {
            colors = [0xffffff, 0xcccccc]; // White dust
        } else if (weaponType === 'Staff' || weaponType === 'Wand') {
            colors = [0x00ffff, 0x0088ff, 0xaa00ff]; // Magic
        } else if (weaponType === 'Sword') {
            colors = [0xffffff, 0xaaaaaa, 0xff0000]; // Steel and blood
        } else if (weaponType === 'Hammer' || weaponType === 'Mace') {
            colors = [0xff8800, 0x884400, 0xffff44]; // Impact/Sparks
        } else if (weaponType === 'Axe') {
            colors = [0xff0000, 0x880000, 0xffffff]; // Blood and steel
        } else if (weaponType === 'Dagger') {
            colors = [0xffff00, 0xffffff]; // Quick flash
        } else {
            // Default Physical
            colors = isCritical
                ? [0xff0000, 0xff8800, 0xffd700, 0xffffff]
                : [0xffd700, 0xff8800, 0xffff00];
        }
    } else if (damageType === 'magic') {
        // Blue/purple for magic damage
        colors = isCritical
            ? [0x4400ff, 0x8800ff, 0xaa88ff, 0xffffff] // Purple/blue/white for critical magic
            : [0x4400ff, 0x6600ff, 0x8888ff]; // Blue/purple for normal magic
    } else {
        // Default Fallback
        colors = [0xffd700, 0xff8800];
    }

    // Create particles manually (Phaser 3 particle system)
    for (let i = 0; i < particleCount; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = Phaser.Math.FloatBetween(50, 120); // Faster spread
        const distance = Phaser.Math.FloatBetween(5, 30); // Larger initial area
        const color = Phaser.Utils.Array.GetRandom(colors);
        const size = Phaser.Math.FloatBetween(baseSize, baseSize + 2); // Larger variable size

        const particle = scene.add.circle(
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance,
            size,
            color,
            1.0
        ).setDepth(201);

        // Add additive blending for "glow" effect
        particle.setBlendMode(Phaser.BlendModes.ADD);

        // Animate particle
        scene.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * speed * 1.5,
            y: y + Math.sin(angle) * speed * 1.5,
            alpha: 0,
            scale: { from: 1, to: 0.1 },
            duration: Phaser.Math.Between(400, 700), // Longer duration
            ease: 'Quad.easeOut',
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
    // Check if weaponSprite is destroyed (properties missing) or null
    // If it has no scene, or scene is undefined, it's likely destroyed
    if (weaponSprite && (!weaponSprite.scene || !weaponSprite.active)) {
        weaponSprite = null;
    }

    if (!weaponSprite) {
        // Recreate weapon sprite if missing (e.g. after map transition)
        const scene = game.scene.scenes[0];
        if (typeof player !== 'undefined' && player && player.active && scene) {
            weaponSprite = scene.add.sprite(player.x, player.y, 'weapon_sword');
            weaponSprite.setScale(1.0);
            weaponSprite.setDepth(player.depth + 1); // 11
            weaponSprite.setOrigin(0.5, 1.0);
            weaponSprite.setVisible(false);
            weaponSprite.isAnimating = false;
            console.log('🔧 Recreated weaponSprite after transition');
        } else {
            return; // Cannot create
        }
    }

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

// Damage system moved to DamageSystem.js

/**
 * Add a message to the chat log
 * @param {string} text - Message text
 * @param {number} color - Color hex code
 * @param {string} icon - Optional emoji icon
 */
function addChatMessage(text, color = 0xffffff, icon = '') {
    // Ensure system chat box exists
    if (!systemChatBox || !systemChatBox.container) return;

    const scene = game.scene.scenes[0];
    const fullText = icon ? `${icon} ${text}` : text;
    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

    console.log(`💬 Chat: ${fullText}`);

    // Create text object
    const msgText = scene.add.text(systemChatBox.padding, 0, fullText, {
        fontSize: '14px',
        fill: colorHex,
        wordWrap: { width: systemChatBox.width - systemChatBox.padding * 2 }
    }).setScrollFactor(0).setDepth(302);

    // Add to container
    systemChatBox.container.add(msgText);

    // Add to messages array
    systemChatBox.messages.push({
        text: msgText,
        height: msgText.height,
        y: 0
    });

    // Prune old messages if too many (keep last 50)
    if (systemChatBox.messages.length > 50) {
        const removed = systemChatBox.messages.shift();
        if (removed.text) removed.text.destroy();
    }

    // Reposition all messages
    repositionChatMessages();

    // Scroll to bottom
    updateChatScroll();
}
window.addChatMessage = addChatMessage;

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
/**
 * Calculate total XP needed to reach the NEXT level
 * Curve: 100 * Level + 25 * Level^2 (Proposal B - Quadratic)
 * Example:
 * Lvl 1->2: 125 XP (Total 125)
 * Lvl 2->3: 300 XP (Total 300)
 * Lvl 3->4: 525 XP (Total 525)
 */
function getXPNeededForLevel(level) {
    return 100 * level + 25 * Math.pow(level, 2);
}

/**
 * Check if any UI window is currently open
 * Used to block movement/interaction when clicking on UI
 */
function isAnyWindowOpen() {
    return inventoryVisible ||
        equipmentVisible ||
        settingsVisible ||
        questVisible ||
        dialogVisible ||
        shopVisible ||
        buildingPanelVisible ||
        assetsVisible ||
        grassDebugVisible ||
        (questCompletedModal && questCompletedModal.visible) ||
        (newQuestModal && newQuestModal.visible) ||
        (questPreviewModal !== null);
}

/**
 * Update UI bars
 */
function updateUI() {
    try {
        const stats = playerStats;
        const maxBarWidth = 200 - 4; // Consistent max width for all bars
        const scene = game.scene.scenes[0];

        // Update HP bar
        const hpPercent = Math.max(0, Math.min(1, stats.hp / stats.maxHp));
        hpBar.width = maxBarWidth * hpPercent;

        // Update Mana bar
        const manaPercent = Math.max(0, Math.min(1, stats.mana / stats.maxMana));
        manaBar.width = maxBarWidth * manaPercent;

        // Debugging UI: Check for weird values
        if (Math.random() < 0.01) {
            // Only log occasionally
            if (isNaN(manaPercent) || manaPercent < 0) {
                console.error(`[UI Error] Invalid mana percent: ${manaPercent}, Mana: ${stats.mana}, Max: ${stats.maxMana}`);
            } else {
                // console.log(`[UI Debug] Mana: ${stats.mana}/${stats.maxMana} (${(manaPercent * 100).toFixed(1)}%), Width: ${manaBar.width}`);
            }
        }

        // Update Stamina bar
        const staminaPercent = Math.max(0, Math.min(1, stats.stamina / stats.maxStamina));
        staminaBar.width = maxBarWidth * staminaPercent;

        // Update XP bar (Quadratic Curve)
        const nextLevelXP = getXPNeededForLevel(stats.level);
        const prevLevelXP = stats.level > 1 ? getXPNeededForLevel(stats.level - 1) : 0;

        // Calculate progress within current level
        const xpInCurrentLevel = Math.max(0, stats.xp - prevLevelXP);
        const xpRequiredForCurrentLevel = nextLevelXP - prevLevelXP;

        const xpPercent = Math.max(0, Math.min(1, xpInCurrentLevel / xpRequiredForCurrentLevel));
        xpBar.width = maxBarWidth * xpPercent;

        // Update stats text
        statsText.setText(`Level ${stats.level} | HP: ${Math.ceil(stats.hp)}/${stats.maxHp} | XP: ${Math.floor(xpInCurrentLevel)}/${xpRequiredForCurrentLevel}`);

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
    } catch (e) {
        console.error("Error in updateUI:", e);
    }
}

/**
 * Check for level up
 */
function checkLevelUp() {
    const stats = playerStats;
    // Check loop to handle multiple level ups at once (e.g. big boss XP)
    let leveledUp = false;

    while (true) {
        const xpNeeded = getXPNeededForLevel(stats.level);

        if (stats.xp >= xpNeeded) {
            stats.level++;
            stats.maxHp += 20;
            stats.hp = stats.maxHp; // Full heal on level up
            stats.maxMana += 10;
            stats.mana = stats.maxMana;
            stats.attack += 2;
            stats.defense += 1;
            leveledUp = true;
            console.log(`Level up! Now level ${stats.level}`);
        } else {
            break;
        }
    }

    if (leveledUp) {
        showDamageNumber(player.x, player.y - 40, 'LEVEL UP!', 0x00ffff);
        addChatMessage(`Level Up! Now Level ${stats.level}`, 0x00ffff, '⭐');
        addChatMessage('HP & Mana Restored!', 0x00ff00, '💚');

        // UQE: Emit level up event
        if (typeof uqe !== 'undefined') {
            uqe.eventBus.emit(UQE_EVENTS.LEVEL_UP, { level: stats.level });
            uqe.update(); // Check for quest completion
        }
    }
}

// ============================================
// ENHANCED ITEM SYSTEM
// Item generation logic has been moved to items.js
// ============================================



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
                    // Skip 'any' type - those count all items, no special drops needed
                    if (obj.itemId === 'any') return;

                    // 30% chance to drop quest-specific item
                    if (Math.random() < 0.3) {
                        // Create proper item name from itemId (e.g. "crystal_shard" -> "Crystal Shard")
                        const itemName = obj.itemId
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, c => c.toUpperCase());

                        droppedItem = {
                            id: obj.itemId,
                            type: 'quest_item',
                            name: itemName,
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

        else if (item.type === 'consumable') {
            spriteKey = (item.name === 'Mana Potion') ? 'mana_potion' : 'item_consumable';
        }
        else if (item.type === 'quest_item') {
            // Use specific sprite for quest items based on ID
            // Map item ID to sprite key: crystal_shard -> item_crystal
            if (item.id === 'crystal_shard') spriteKey = 'item_crystal';
            else if (item.id === 'artifact_fragment') spriteKey = 'item_fragment';
            else spriteKey = 'item_consumable'; // Fallback
        }

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

        // Make item interactive for click-to-pickup
        // Reverting to default hit area to debug specific hit test issues
        itemSprite.setInteractive();
        itemSprite.isItem = true;
        itemSprite.itemId = item.type + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        itemSprite.itemData = item;

        // Add Hover Effect
        if (typeof window.enableHoverEffect === 'function') {
            window.enableHoverEffect(itemSprite, scene);
        }

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

        // Play sound
        playSound('gold_pickup');

        // UQE Bridge Event - for Gold Rush quest tracking
        if (typeof uqe !== 'undefined') {
            uqe.eventBus.emit(UQE_EVENTS.GOLD_EARNED, { amount: item.amount });
        }
    } else {
        // Add item to inventory (with stacking for consumables)
        console.log(`📦 Adding item to inventory: ${item.name} (type: ${item.type})`);
        console.log(`   Before: ${playerStats.inventory.length} items`);

        // Check if this is a stackable consumable
        let stacked = false;
        if (item.type === 'consumable' && item.name) {
            // Find existing stack of same item
            const existingStack = playerStats.inventory.find(i =>
                i.type === 'consumable' && i.name === item.name
            );
            if (existingStack) {
                existingStack.quantity = (existingStack.quantity || 1) + 1;
                stacked = true;
                console.log(`   Stacked with existing: now x${existingStack.quantity}`);
            }
        }

        if (!stacked) {
            // Set initial quantity for consumables
            if (item.type === 'consumable') {
                item.quantity = item.quantity || 1;
            }
            playerStats.inventory.push(item);
        }

        console.log(`   After: ${playerStats.inventory.length} items`);
        console.log(`   Inventory contents:`, playerStats.inventory.map(i => `${i.name}${i.quantity ? ' x' + i.quantity : ''}`));
        playerStats.questStats.itemsCollected++;
        showDamageNumber(item.sprite.x, item.sprite.y, `Picked up ${item.name}`, 0x00ff00);
        playSound('item_pickup');
        console.log(`Picked up: ${item.name} (Inventory: ${playerStats.inventory.length} items)`);

        // Refresh inventory UI if open - this will update the display with the new item
        refreshInventory();

        // Update potion slot quantities
        updatePotionSlots();

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
 * Toggle settings visibility
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
 * Create Settings UI panel
 */
/**
 * Create Settings UI panel
 */
function createSettingsUI() {
    const scene = game.scene.scenes[0];
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;
    const panelWidth = 400;
    const panelHeight = 460;

    // Background
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(10000).setStrokeStyle(3, 0xffffff); // Depth 10000 to be on top

    // Title
    const title = scene.add.text(centerX, centerY - panelHeight / 2 + 30, 'SETTINGS', {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(10001).setOrigin(0.5);

    settingsPanel = { // Use global settingsPanel
        bg: bg,
        title: title,
        elements: []
    };

    let currentY = centerY - 100;
    const spacing = 60;

    // --- Music Toggle ---
    const musicStatus = musicEnabled ? 'ON' : 'OFF';
    const musicColor = musicEnabled ? '#00ff00' : '#ff0000';

    const musicBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x333333)
        .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true });

    const musicBtnText = scene.add.text(centerX, currentY, `Music: ${musicStatus}`, {
        fontSize: '20px', fill: musicColor
    }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

    musicBtnBg.on('pointerdown', () => {
        musicEnabled = !musicEnabled;
        musicBtnText.setText(`Music: ${musicEnabled ? 'ON' : 'OFF'}`);
        musicBtnText.setColor(musicEnabled ? '#00ff00' : '#ff0000');
        if (typeof toggleMusic === 'function') {
            toggleMusic(musicEnabled);
        } else if (scene.sound) {
            scene.sound.mute = !musicEnabled;
        }
        playSound('menu_select');
    });

    settingsPanel.elements.push(musicBtnBg, musicBtnText);
    currentY += spacing;

    // --- Save Game ---
    const saveBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x004400)
        .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x00ff00);
    const saveBtnText = scene.add.text(centerX, currentY, 'SAVE GAME', {
        fontSize: '20px', fill: '#00ff00', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

    saveBtnBg.on('pointerdown', () => {
        if (typeof window.saveGame === 'function') window.saveGame();
        playSound('menu_select');
    });
    settingsPanel.elements.push(saveBtnBg, saveBtnText);

    currentY += spacing;

    // --- Load Game ---
    const loadBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x000044)
        .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x4444ff);
    const loadBtnText = scene.add.text(centerX, currentY, 'LOAD GAME', {
        fontSize: '20px', fill: '#aaaaff', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

    loadBtnBg.on('pointerdown', () => {
        if (typeof window.loadGame === 'function') {
            window.toggleSettings(); // Close menu
            window.loadGame();
        }
        playSound('menu_select');
    });
    settingsPanel.elements.push(loadBtnBg, loadBtnText);

    currentY += spacing;

    // --- New Game ---
    const newGameBtnBg = scene.add.rectangle(centerX, currentY, 200, 50, 0x330000)
        .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0xff0000);
    const newGameBtnText = scene.add.text(centerX, currentY, 'NEW GAME', {
        fontSize: '20px', fill: '#ff4444', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

    newGameBtnBg.on('pointerdown', () => {
        if (confirm("Are you sure? This will DELETE your save file!")) {
            localStorage.clear();
            location.reload();
        }
    });
    settingsPanel.elements.push(newGameBtnBg, newGameBtnText);

    // --- Close ---
    const closeBtnBg = scene.add.rectangle(centerX, centerY + panelHeight / 2 - 40, 100, 40, 0x444444)
        .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true });
    const closeText = scene.add.text(centerX, centerY + panelHeight / 2 - 40, 'Close', {
        fontSize: '18px', fill: '#ffffff'
    }).setScrollFactor(0).setDepth(10002).setOrigin(0.5);

    closeBtnBg.on('pointerdown', () => {
        window.toggleSettings();
        playSound('menu_select');
    });
    settingsPanel.elements.push(closeBtnBg, closeText);
}


/**
 * Destroy Settings UI
 */
function destroySettingsUI() {
    if (settingsPanel) {
        if (settingsPanel.bg) settingsPanel.bg.destroy();
        if (settingsPanel.title) settingsPanel.title.destroy();
        if (settingsPanel.elements) {
            settingsPanel.elements.forEach(el => el.destroy());
        }
        settingsPanel = null;
    }
}

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
        else if (item.type === 'consumable') spriteKey = (item.name === 'Mana Potion') ? 'mana_potion' : 'item_consumable';
        else if (item.type === 'gold') spriteKey = 'item_gold';
        else if (item.type === 'quest_item') {
            // Specific mapping for quest items
            if (item.id === 'crystal_shard') spriteKey = 'item_crystal';
            else if (item.id === 'artifact_fragment') spriteKey = 'item_fragment';
            else spriteKey = 'item_consumable';
        }

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

        // Create item name text (small, below sprite) - include quantity for stacked items
        const displayName = (item.quantity && item.quantity > 1) ? `${item.name} x${item.quantity}` : item.name;
        const itemText = scene.add.text(x, y + slotSize / 2 + 5, displayName, {
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

    // Set up controller navigation for inventory items
    if (typeof setMenuItems === 'function') {
        setMenuItems(inventoryPanel.items, slotsPerRow);
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
    const itemSetsForTooltip = getItemSets();
    if (item.set && itemSetsForTooltip && itemSetsForTooltip[item.set]) {
        tooltipLines.push('');
        tooltipLines.push(`Set: ${item.set}`);
        const setInfo = itemSetsForTooltip[item.set];
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

    // Clear controller menu selection
    if (typeof clearMenuSelection === 'function') {
        clearMenuSelection();
    }

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
    const itemSetsForBonus = getItemSets();
    Object.keys(setPieces).forEach(setName => {
        const setInfo = itemSetsForBonus[setName];
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
    const statsY = 660;
    let attackBonus = 0;
    let defenseBonus = 0;
    let maxHpBonus = 0;
    let speedBonus = 0;
    let critBonus = 0;
    let lifestealBonus = 0;

    Object.values(playerStats.equipment).forEach(item => {
        if (!item) return;
        if (item.attackPower) attackBonus += item.attackPower;
        if (item.defense) defenseBonus += item.defense;
        if (item.maxHp) maxHpBonus += item.maxHp;
        if (item.speed) speedBonus += item.speed;
        if (item.critChance) critBonus += item.critChance;
        if (item.lifesteal) lifestealBonus += item.lifesteal;
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

    if (speedBonus > 0) {
        statsText += `\nSpeed: +${speedBonus}`;
    }

    if (critBonus > 0) {
        statsText += `\nCrit: +${(critBonus * 100).toFixed(1)}%`;
    }

    if (lifestealBonus > 0) {
        statsText += `\nLifesteal: +${(lifestealBonus * 100).toFixed(1)}%`;
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
        else if (item.type === 'consumable') spriteKey = (item.name === 'Mana Potion') ? 'mana_potion' : 'item_consumable';
        else if (item.type === 'gold') spriteKey = 'item_gold';
        else if (item.type === 'quest_item') {
            // Specific mapping for quest items
            if (item.id === 'crystal_shard') spriteKey = 'item_crystal';
            else if (item.id === 'artifact_fragment') spriteKey = 'item_fragment';
            else spriteKey = 'item_consumable';
        }
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

        // Item name below sprite (include quantity for stacked items)
        const displayName = (item.quantity && item.quantity > 1) ? `${item.name} x${item.quantity}` : item.name;
        const itemNameText = scene.add.text(x, y + itemSize / 2 + 5, displayName, {
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

    // Set up controller navigation for equipment inventory items
    if (typeof setMenuItems === 'function') {
        setMenuItems(equipmentPanel.inventoryItems, 6);
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

    // Clear controller menu selection
    if (typeof clearMenuSelection === 'function') {
        clearMenuSelection();
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
                // Show preview modal FIRST
                showQuestPreviewModalEnhanced(questId,
                    // On Accept
                    () => {
                        console.log(`✅ acceptMainQuest: Adding ${questId} to main list`);
                        quest.startValue = questManager.getStatValue(quest.type, playerStats);
                        playerStats.quests.main.push(quest);
                        console.log(`Main quest accepted: ${quest.title}`);

                        showDamageNumber(player.x, player.y - 60, "Quest Accepted!", 0x00ff00);
                        playSound('item_pickup');
                        updateQuestTrackerHUD();
                        if (questVisible) refreshQuestLog();
                    },
                    // On Decline
                    () => { }
                );
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

            // Show preview modal FIRST
            showQuestPreviewModalEnhanced(questId,
                // On Accept
                () => {
                    // Move from available to active
                    playerStats.quests.available.splice(questIdx, 1);
                    quest.startValue = questManager.getStatValue(quest.type, playerStats);
                    playerStats.quests.active.push(quest);

                    console.log(`Side quest accepted: ${quest.title}`);
                    showDamageNumber(player.x, player.y - 60, "Quest Accepted!", 0x00ff00);
                    playSound('item_pickup');
                    updateQuestTrackerHUD();

                    if (questVisible) refreshQuestLog();
                },
                // On Decline
                () => { }
            );
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
        showQuestCompletedPopupEnhanced(quest);
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

                let textXOffset = 20;

                // Render icon if present
                if (obj.icon) {
                    const iconSprite = scene.add.sprite(detailStartX + 20, detailY + 10, obj.icon)
                        .setScrollFactor(0).setDepth(302).setScale(0.6); // Scale to fit text line
                    questPanel.questDetailElements.push(iconSprite);
                    textXOffset += 25; // Shift text to make room for icon
                }

                const objText = scene.add.text(detailStartX + textXOffset, detailY, `${statusStr} ${obj.label}: ${objProgress}/${obj.target}`, {
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

        // Record closure time to prevent click-through
        if (game.scene.scenes[0]) {
            const s = game.scene.scenes[0];
            s.lastWindowCloseTime = s.time.now;
            console.log('🚫 Dialog closed at:', s.lastWindowCloseTime);
        }
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

        // Record closure time to prevent click-through
        if (game.scene.scenes[0]) {
            const s = game.scene.scenes[0];
            s.lastWindowCloseTime = s.time.now;
            console.log('🚫 Dialog closed at:', s.lastWindowCloseTime);
        }
    }
}

// Quest preview modal for NPC dialog offers
var questPreviewModal = null;

/**
 * Show quest preview modal from NPC dialog (before accepting)
 * @param {string} questId - The quest ID to preview
 * @param {Function} onAccept - Callback when quest is accepted
 * @param {Function} onDecline - Callback when quest is declined
 */
function showQuestPreviewModal(questId, onAccept, onDecline) {
    console.log('[Quest Debug] START showQuestPreviewModal with ID:', questId);
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

    // Force cleanup of any orphaned overlay
    const existingOverlay = scene.children.list.find(c => c.name === 'QuestPreviewOverlay');
    if (existingOverlay) {
        console.warn('⚠️ Found orphaned QuestPreviewOverlay - destroying it');
        existingOverlay.destroy();
    }

    // Background overlay
    const overlay = scene.add.rectangle(centerX, centerY, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.85)
        .setScrollFactor(0).setDepth(700).setInteractive().setName('QuestPreviewOverlay');

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
        console.log('✅ Quest Preview: Accept Clicked');
        hideQuestPreviewModal();
        if (onAccept) {
            console.log('   -> Calling onAccept callback');
            onAccept();
        } else {
            console.warn('   -> No onAccept callback provided!');
        }
    };

    // Decline handler  
    const declineHandler = () => {
        console.log('❌ Quest Preview: Decline Clicked');
        hideQuestPreviewModal();
        if (onDecline) onDecline();
    };

    acceptBtn.setName('QuestAcceptBtn');
    console.log('--- Registering Accept Handler ---');
    acceptBtn.on('pointerover', () => acceptBtn.setFillStyle(0x00cc00));
    acceptBtn.on('pointerout', () => acceptBtn.setFillStyle(0x00aa00));
    acceptBtn.on('pointerdown', acceptHandler);
    console.log(`--- AcceptBtn Listeners: ${acceptBtn.listenerCount('pointerdown')} ---`);

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

    // Assign to global variable for management
    console.log('[Quest Debug] Assigning questPreviewModal global...');
    console.log('[Quest Debug] acceptBtn is:', acceptBtn);
    questPreviewModal = {
        overlay, modalBg, header, questTitle, questDesc,
        objLabel, objectiveTexts, rewardsLabel, rewardTexts,
        acceptBtn, acceptBtnText, declineBtn, declineBtnText,
        escKey, escHandler
    };
    // Explicitly expose to window for controller access
    window.questPreviewModal = questPreviewModal;
    console.log('[Quest Debug] window.questPreviewModal assigned. Keys:', Object.keys(window.questPreviewModal));

    return questPreviewModal;
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
        if (questPreviewModal.objectiveTexts) questPreviewModal.objectiveTexts.forEach(t => t.destroy());
        if (questPreviewModal.rewardsLabel) questPreviewModal.rewardsLabel.destroy();
        if (questPreviewModal.rewardTexts) questPreviewModal.rewardTexts.forEach(t => t.destroy());
        if (questPreviewModal.acceptBtn) questPreviewModal.acceptBtn.destroy();
        if (questPreviewModal.acceptBtnText) questPreviewModal.acceptBtnText.destroy();
        if (questPreviewModal.declineBtn) questPreviewModal.declineBtn.destroy();
        if (questPreviewModal.declineBtnText) questPreviewModal.declineBtnText.destroy();
        if (questPreviewModal.escKey && questPreviewModal.escHandler) {
            questPreviewModal.escKey.removeListener('down', questPreviewModal.escHandler);
        }
    }

    // Cleanup global
    questPreviewModal = null;
    window.questPreviewModal = null;

    // Record closure time to prevent click-through
    if (game.scene.scenes[0]) {
        const s = game.scene.scenes[0];
        s.lastWindowCloseTime = s.time.now;
        console.log('🚫 Quest Preview closed at:', s.lastWindowCloseTime);
    }
}

// ============================================
// NPC SYSTEM
// ============================================

/**
 * Initialize NPCs in the world
 */
/**
 * Initialize NPCs from JSON data
 */
function initializeNPCs(passedScene) {
    const scene = passedScene || game.scene.scenes[0];
    if (!scene) return;

    // Clear existing NPCs
    npcs.forEach(npc => {
        if (npc && npc.active) npc.destroy();
    });
    npcs = [];

    const npcData = scene.cache.json.get('npcData');
    if (!npcData) {
        console.error('❌ Failed to load NPC data from JSON');
        return;
    }

    console.log(`Initialising ${npcData.length} NPCs from JSON...`);

    // Determine map dimensions safely (fallback to 1280x1280 for town)
    const mapWidth = (typeof map !== 'undefined' && map && map.widthInPixels) ? map.widthInPixels : 1280;
    const mapHeight = (typeof map !== 'undefined' && map && map.heightInPixels) ? map.heightInPixels : 1280;

    npcData.forEach(data => {
        // Calculate position
        let x = 0, y = 0;

        if (data.spawnType === 'center') {
            x = (mapWidth / 2) + (data.offsetX || 0) * 32;
            y = (mapHeight / 2) + (data.offsetY || 0) * 32;
        } else if (data.spawnType === 'bottom') {
            x = (mapWidth / 2) + (data.offsetX || 0) * 32;
            y = mapHeight - 100 + (data.offsetY || 0) * 32;
        } else if (data.spawnType === 'absolute') {
            x = (data.targetX || 0) * 32;
            y = (data.targetY || 0) * 32;
        } else {
            // Default to center
            x = (mapWidth / 2);
            y = (mapHeight / 2);
        }

        // Determine sprite key (Use JSON key, fallback to 'npc' if missing in texture manager)
        let spriteKey = data.spriteKey || 'npc';
        if (!scene.textures.exists(spriteKey)) {
            console.warn(`⚠️ NPC Sprite '${spriteKey}' not found for ${data.name}, falling back to 'npc'`);
            spriteKey = 'npc';
        }

        const npc = scene.physics.add.sprite(x, y, spriteKey);
        npc.setDepth(30);
        npc.setCollideWorldBounds(true);
        // Make interactive for click-to-interact
        npc.setInteractive();

        // Set frame 0 (idle) if available
        if (scene.textures.exists(spriteKey) && spriteKey !== 'npc') {
            npc.setFrame(0);
        }

        // Store NPC properties
        npc.npcId = data.id;
        npc.name = data.name;
        npc.title = data.title;
        npc.dialogId = data.dialogId;
        npc.questGiver = data.questGiver || false;
        npc.merchant = data.merchant || false;
        npc.interactionRadius = 50;
        npc.interactionIndicator = null;
        npc.showIndicator = false;
        npc.spriteKey = spriteKey;
        npc.portraitKey = data.portraitKey; // Store portrait key

        // Add Diablo IV style hover glow
        if (typeof enableHoverEffect === 'function') {
            enableHoverEffect(npc, scene);
        }

        // Add to global list
        npcs.push(npc);
    });

    console.log('✅ NPCs initialized:', npcs.length, 'NPCs');
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
 * Create About window
 */
function createAboutWindow() {
    const scene = game.scene.scenes[0];
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;
    const panelWidth = 500;
    const panelHeight = 400;

    // Create background (ensure it's above settings) // Depth settings: Settings=300+, About=400+
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.98)
        .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0xffffff)
        .setInteractive(); // Block input behind

    const title = scene.add.text(centerX, centerY - panelHeight / 2 + 30, 'About', {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5);

    // About Text
    const aboutTextContent = "This game is a passion project built in countless late nights, and your support helps keep it alive and growing.\n\nIf you enjoy playing and want to see more updates, new features, and ongoing improvements, please consider donating to support the development.";

    const aboutText = scene.add.text(centerX, centerY - 40, aboutTextContent, {
        fontSize: '18px',
        fill: '#cccccc',
        align: 'center',
        wordWrap: { width: panelWidth - 60 }
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5);

    // Donate Button
    const btnY = centerY + 100;
    const donateBtn = scene.add.rectangle(centerX, btnY, 200, 50, 0x00aa00, 1)
        .setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x00ff00)
        .setInteractive({ useHandCursor: true });

    const donateText = scene.add.text(centerX, btnY, 'Donate Now', {
        fontSize: '20px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(402).setOrigin(0.5);

    donateBtn.on('pointerover', () => donateBtn.setFillStyle(0x00cc00));
    donateBtn.on('pointerout', () => donateBtn.setFillStyle(0x00aa00));
    donateBtn.on('pointerdown', () => {
        window.open('https://www.paypal.com/ncp/payment/WJEPNLAWSXUV4', '_blank');
    });

    // Close Button
    const closeBtnY = centerY + panelHeight / 2 - 40;
    const closeBtnText = scene.add.text(centerX, closeBtnY, 'Close', {
        fontSize: '16px',
        fill: '#aaaaaa',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(401).setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    closeBtnText.on('pointerover', () => closeBtnText.setColor('#ffffff'));
    closeBtnText.on('pointerout', () => closeBtnText.setColor('#aaaaaa'));

    // Group elements for cleanup
    const elements = [bg, title, aboutText, donateBtn, donateText, closeBtnText];

    const closeAbout = () => {
        elements.forEach(el => el.destroy());
    };

    closeBtnText.on('pointerdown', closeAbout);
}

/**
 * Update NPC interaction indicators
 */
function updateNPCIndicators() {
    const scene = game.scene.scenes[0];

    // Only show NPC indicators in town (NPCs don't exist in wilderness/dungeon)
    if (MapManager.currentMap !== 'town') {
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
                // Check if this NPC is a target for an ACTIVE quest objective (e.g. "Talk to X")
                let hasActiveObjective = false;
                if (typeof uqe !== 'undefined' && uqe.activeQuests) {
                    hasActiveObjective = uqe.activeQuests.some(q => {
                        // Check incomplete objectives
                        // Quest object might have 'objectives' array of UqeObjective instances
                        // We check their definition data or properties
                        return q.objectives.some(obj => {
                            // Check if objective is incomplete and targets this NPC
                            // Matches 'npcId' field in objective definition
                            return !obj.completed && obj.npcId === npcName;
                        });
                    });
                }

                if (hasActiveObjective) {
                    iconText = '?';
                    iconColor = '#ffffff'; // White ? for interaction
                } else {
                    iconText = '💬'; // No available quests, just chat
                    iconColor = '#ffffff';
                }
            }
        } else {
            // Check non-quest-givers too (e.g. just targets)
            let hasActiveObjective = false;
            if (typeof uqe !== 'undefined' && uqe.activeQuests) {
                hasActiveObjective = uqe.activeQuests.some(q => {
                    return q.objectives.some(obj => {
                        return !obj.completed && obj.npcId === npc.name;
                    });
                });
            }

            if (hasActiveObjective) {
                iconText = '?';
                iconColor = '#ffffff';
            } else {
                iconText = '💬'; // Regular NPC info
                iconColor = '#ffffff';
            }
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

    MapManager.buildings.forEach((building, index) => {
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
    if (MapManager.currentMap !== 'town') {
        console.log('❌ Not in town, skipping building interaction');
        return;
    }
    if (dialogVisible || shopVisible || inventoryVisible || settingsVisible || buildingPanelVisible) {
        console.log('❌ UI already open, skipping building interaction');
        return;
    }

    console.log(`🔍 Checking building interaction. Total MapManager.buildings: ${MapManager.buildings.length}`);

    // Find nearest building in range
    let closestBuilding = null;
    let closestDistance = Infinity;

    MapManager.buildings.forEach((building, index) => {
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
        return true; // Handled
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

    if (closestNPC) {
        console.log(`[DEBUG_DIALOG] Nearest NPC: ${closestNPC.name} (Dist: ${closestDistance.toFixed(1)}, Radius: ${closestNPC.interactionRadius})`);
        addChatMessage(`[DEBUG] Nearest: ${closestNPC.name} (${closestDistance.toFixed(0)}/${closestNPC.interactionRadius})`, 0xaaaaaa);
    } else {
        console.log(`[DEBUG_DIALOG] No NPC found in range`);
    }

    if (closestNPC && closestNPC.dialogId) {
        console.log(`[DEBUG_DIALOG] Starting dialog with ${closestNPC.name} (ID: ${closestNPC.dialogId})`);
        startDialog(closestNPC);
        return true; // Found an NPC to interact with
    }

    return false; // No interaction
}

// ============================================
// DIALOG SYSTEM
// ============================================

/**
 * Dialog database - loaded from dialogs.json
 */
let dialogDatabase = {};

/**
 * Load dialogs from JSON file
 */
async function loadDialogs() {
    try {
        const response = await fetch('dialogs.json');
        dialogDatabase = await response.json();
        console.log('💬 Dialogs loaded:', Object.keys(dialogDatabase).length, 'dialogs');
    } catch (e) {
        console.error('❌ Failed to load dialogs.json:', e);
        // Fallback to empty generic dialog
        dialogDatabase = {
            'generic_npc': {
                npcName: 'NPC',
                npcTitle: 'Villager',
                nodes: {
                    'start': { text: 'Hello there!', choices: [{ text: 'Goodbye', next: 'end' }] },
                    'end': { text: 'Farewell.', choices: [] }
                }
            }
        };
    }
}

/**
 * Evaluate a condition string from dialogs.json
 * Format: "condition_type:parameter"
 * @param {string} conditionStr - The condition string
 * @param {object} stats - Player stats object
 * @returns {boolean} - Whether the condition is met
 */
function evaluateDialogCondition(conditionStr, stats) {
    if (!conditionStr) return true; // No condition = always show

    const [type, param] = conditionStr.split(':');

    switch (type) {
        case 'quest_available':
            // Quest is neither active nor completed
            return !isQuestActive(param) && !isQuestCompleted(param);

        case 'quest_active':
            return isQuestActive(param);

        case 'quest_completed':
            return isQuestCompleted(param);

        case 'quest_not_active':
            return !isQuestActive(param);

        case 'quest_not_completed':
            return !isQuestCompleted(param);

        case 'has_available_quest':
            // Check if any quest from this giver is available
            return stats.quests && stats.quests.available &&
                stats.quests.available.some(q => q.giver === param);

        case 'level_at_least':
            return stats.level >= parseInt(param);

        case 'has_item':
            return stats.inventory && stats.inventory.some(item => item.id === param);

        case 'gold_at_least':
            return stats.gold >= parseInt(param);

        case 'quest_can_complete':
            if (!isQuestActive(param)) return false;
            if (window.uqe) {
                const quest = window.uqe.activeQuests.find(q => q.id === param);
                if (quest) {
                    // Allow completion if only 'talk' objectives remain (which this dialog will satisfy)
                    const incomplete = quest.objectives.filter(o => !o.isComplete());
                    if (incomplete.length === 0) return true;
                    const nonTalkIncomplete = incomplete.filter(o => o.type !== 'talk');
                    return nonTalkIncomplete.length === 0;
                }
            }
            return false;

        case 'quest_objective_active':
            // Param is QUEST_ID:OBJECTIVE_ID. But split(':') only gives the first part?
            // "condition": "quest_objective_active:main_02_004:talk_bram"
            // The initial split only split on first colon. So param is "main_02_004:talk_bram"?
            // Let's verify initial split logic.
            // const [type, param] = conditionStr.split(':'); -> This only splits once if logic is standard destructuring? 
            // NO, split(':') returns array of ALL parts!
            // const [type, param] = ['a', 'b', 'c'] -> param is 'b'. 'c' is lost.
            // I need to fetch the full args.
            // Let's re-parse inside the case if needed, OR fix the splitter.
            // Existing split: const [type, param] = conditionStr.split(':');
            // If conditionStr is "quest_objective_active:Q:O", type="quest_objective_active", param="Q".
            // So I need to use the rest of the string.
            // Better: re-split conditionStr.
            {
                const parts = conditionStr.split(':');
                if (parts.length < 3) return false;
                const qId = parts[1];
                const oId = parts[2];

                if (!isQuestActive(qId)) return false;
                if (window.uqe) {
                    const quest = window.uqe.activeQuests.find(q => q.id === qId);
                    if (quest) {
                        const obj = quest.objectives.find(o => o.id === oId);
                        return obj && !obj.isComplete();
                    }
                }
                return false;
            }

        default:
            console.warn(`Unknown dialog condition type: ${type}`);
            return true;
    }
}


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
    console.log(`[DEBUG_DIALOG] startDialog called for ${npc.name}. DialogID: ${npc.dialogId}. Found data: ${!!dialogData}`);

    if (!dialogData) {
        console.warn(`[DEBUG_DIALOG] Dialog data NOT FOUND for ${npc.dialogId}. Using generic fallback.`);
        addChatMessage(`[DEBUG] Missing dialog: ${npc.dialogId}`, 0xff0000);
        dialogData = dialogDatabase['generic_npc'];
    } else {
        addChatMessage(`[DEBUG] Starting dialog: ${npc.name}`, 0x00ff00);
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
    const portraitHeight = 150; // Height for landscape portrait
    // Height will be recalculated dynamically in updateDialogUI
    const initialPanelHeight = 350;
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2 + 80;

    // Create landscape portrait using NPC's portraitKey if available
    let portraitImage = null;
    if (npc.portraitKey && scene.textures.exists(npc.portraitKey)) {
        portraitImage = scene.add.image(
            centerX,
            centerY - initialPanelHeight / 2 + portraitHeight / 2 + 10,
            npc.portraitKey
        ).setScrollFactor(0).setDepth(402);

        // Scale to fit panel width while maintaining aspect ratio
        const originalWidth = portraitImage.width;
        const originalHeight = portraitImage.height;
        const scaleFactor = (panelWidth - 20) / originalWidth;
        portraitImage.setScale(scaleFactor);
        // Limit height if too tall
        if (portraitImage.displayHeight > portraitHeight) {
            portraitImage.setDisplaySize(panelWidth - 20, portraitHeight);
        }
    }

    dialogPanel = {
        bg: scene.add.rectangle(centerX, centerY, panelWidth, initialPanelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0xffffff),
        portraitImage: portraitImage,
        portraitHeight: portraitImage ? portraitHeight : 0,
        npcNameText: scene.add.text(
            centerX - panelWidth / 2 + 20,
            centerY - initialPanelHeight / 2 + (portraitImage ? portraitHeight + 15 : 15),
            `${npc.name}${npc.title ? ' - ' + npc.title : ''}`, {
            fontSize: '22px',
            fill: '#ffd700',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(401).setOrigin(0, 0),
        dialogText: null,
        choiceButtons: [],
        npc: npc // Store NPC reference
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

    const panelWidth = 700;
    const buttonHeight = 40;
    const buttonSpacing = 10;
    const portraitHeight = dialogPanel.portraitHeight || 0;

    // Count visible choices first
    let visibleChoices = 0;
    node.choices.forEach(choice => {
        if (!choice.condition) {
            visibleChoices++;
        } else {
            try {
                let result;
                if (typeof choice.condition === 'function') {
                    result = choice.condition(playerStats);
                } else {
                    result = evaluateDialogCondition(choice.condition, playerStats);
                }
                console.log(`[DEBUG_DIALOG] Choice '${choice.text}' condition result: ${result} (Condition: ${choice.condition})`);
                if (result) visibleChoices++;
            } catch (err) {
                console.error(`[DEBUG_DIALOG] Error evaluating condition for '${choice.text}':`, err);
            }
        }
    });

    // Calculate dynamic panel height
    const headerHeight = portraitHeight + 50; // Portrait + NPC name area
    // Improve text height estimation: count lines (approx 24px per line) and length
    const lineCount = (node.text.match(/\n/g) || []).length + 1;
    const estHeightByLines = lineCount * 24;
    const estHeightByLength = node.text.length * 0.6;
    const textHeight = Math.max(80, Math.min(600, Math.max(estHeightByLines, estHeightByLength))); // Increased max from 150 to 600
    const choicesHeight = visibleChoices * (buttonHeight + buttonSpacing) + 20;
    const dynamicPanelHeight = headerHeight + textHeight + choicesHeight + 20;

    // Update panel size and position
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2 + 50;

    dialogPanel.bg.setPosition(centerX, centerY);
    dialogPanel.bg.setSize(panelWidth, dynamicPanelHeight);

    // Reposition portrait at top (full width, centered)
    if (dialogPanel.portraitImage) {
        dialogPanel.portraitImage.setPosition(
            centerX,
            centerY - dynamicPanelHeight / 2 + portraitHeight / 2 + 10
        );
    }

    // Reposition NPC name below portrait
    dialogPanel.npcNameText.setPosition(
        centerX - panelWidth / 2 + 20,
        centerY - dynamicPanelHeight / 2 + portraitHeight + 15
    );

    // Dialog text (positioned after NPC name)
    const textX = centerX - panelWidth / 2 + 20;
    const textY = centerY - dynamicPanelHeight / 2 + portraitHeight + 45;
    dialogPanel.dialogText = scene.add.text(
        textX,
        textY,
        node.text,
        {
            fontSize: '16px',
            fill: '#ffffff',
            wordWrap: { width: panelWidth - 40 }
        }
    ).setScrollFactor(0).setDepth(401).setOrigin(0, 0);

    // Choice buttons - start after the text area
    const startY = centerY - dynamicPanelHeight / 2 + headerHeight + textHeight;

    let visibleChoiceCount = 0;
    node.choices.forEach((choice) => {
        // Skip choices that don't meet their condition
        if (choice.condition) {
            try {
                // Support both string conditions (from JSON) and legacy function conditions
                let result;
                if (typeof choice.condition === 'function') {
                    result = choice.condition(playerStats);
                } else {
                    result = evaluateDialogCondition(choice.condition, playerStats);
                }
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

        // Button text with indicators
        const isQuest = choice.isQuest;
        const isLore = choice.action === 'unlock_lore' && choice.loreId;

        // Check if lore is already unlocked
        let loreAlreadyUnlocked = false;
        if (isLore) {
            try {
                const unlockedLore = JSON.parse(localStorage.getItem('rpg_unlocked_lore') || '[]');
                loreAlreadyUnlocked = unlockedLore.includes(choice.loreId);
            } catch (e) { /* ignore */ }
        }

        // Build display text with appropriate prefix
        let displayText = choice.text;
        if (isQuest) {
            displayText = `(!) ${choice.text}`;
        } else if (isLore) {
            displayText = loreAlreadyUnlocked ? `✓ ${choice.text}` : `○ ${choice.text}`;
        }

        const buttonText = scene.add.text(
            centerX,
            buttonY,
            displayText,
            {
                fontSize: '16px',
                fill: '#ffffff'
            }
        ).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);

        // Apply colors based on type
        if (isQuest) {
            buttonText.setFill('#ffff00'); // Yellow for quests
        } else if (isLore) {
            buttonText.setFill(loreAlreadyUnlocked ? '#88ff88' : '#9370DB'); // Green if read, purple if new
        }

        // Button hover effects
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x444444);
        });
        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x333333);
        });

        // Button click handler
        buttonBg.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) {
                pointer.event.stopPropagation();
            }

            const questId = choice.questId;
            const action = choice.action;

            // Handle lore unlock action
            if (action === 'unlock_lore' && choice.loreId) {
                if (window.loreManager && typeof window.loreManager.unlock === 'function') {
                    window.loreManager.unlock(choice.loreId);
                    console.log(`📖 [Dialog] Unlocked lore: ${choice.loreId}`);
                } else {
                    // Fallback: directly add to localStorage
                    try {
                        const unlockedLore = JSON.parse(localStorage.getItem('rpg_unlocked_lore') || '[]');
                        if (!unlockedLore.includes(choice.loreId)) {
                            unlockedLore.push(choice.loreId);
                            localStorage.setItem('rpg_unlocked_lore', JSON.stringify(unlockedLore));
                            console.log(`📖 [Dialog] Unlocked lore (fallback): ${choice.loreId}`);
                            addChatMessage(`New lore discovered: Press L to read`, 0x9370DB, '📜');
                        }
                    } catch (e) {
                        console.warn('Failed to save lore unlock:', e);
                    }
                }
            }

            if (action === 'open_shop') {
                openShop(currentShopNPC);
            } else if (action === 'choose_class') {
                chooseClass(choice.className);
                if (choice.next) showDialogNode(choice.next);
                if (choice.next) showDialogNode(choice.next);
                else closeDialog();
            } else if (action === 'complete_objective') {
                // Handle single objective completion (e.g. Interrogation)
                if (window.uqe && choice.questId && choice.objectiveId) {
                    const quest = window.uqe.activeQuests.find(q => q.id === choice.questId);
                    if (quest) {
                        const obj = quest.objectives.find(o => o.id === choice.objectiveId);
                        if (obj && !obj.isComplete()) {
                            obj.progress = obj.target;
                            obj.completed = true;
                            // Check if this completes the whole quest
                            quest.checkCompletion();
                            window.uqe.update();

                            addChatMessage(`Objective updated: ${obj.description || choice.objectiveId}`, 0x00ff00);
                        }
                    }
                }
                if (choice.next) showDialogNode(choice.next);
                else closeDialog();

            } else if (action === 'quest_complete' || action === 'quest_turnin' || action === 'complete_quest') {
                // Handle quest completion via dialog
                console.log('✅ Action was quest completion - closing dialog to unblock queue');

                // Complete the quest via UQE
                if (window.uqe && choice.questId) {
                    window.uqe.completeQuest(choice.questId); // Assuming completeQuest helper exists in UQE wrapper or use uqe.activeQuests logic
                    // Actually UQE engine has completeQuest? No, engine.update() handles it.
                    // But for manual turn-in, we might need to force it or set a flag?
                    // NO wait, UQE automatically completes once all objectives are done.
                    // BUT for 'talk' objectives, they auto-complete on talk.
                    // If the quest requires a "Turn In" action, implying the final step was manual?
                    // Re-checking UQE: `Quest.checkCompletion()` checks if all objectives are complete.
                    // If the dialogue IS the final objective (Talk), it should have completed by now?
                    // Wait, `startDialog` emits `NPC_TALK`. If the last objective was `talk`, it completes. `uqe.update()` moves it to completed.
                    // So `action: complete_quest` might be redundant or just for UI feedback/closing.
                    // BUT, if we want to ensure it is marked complete, we can call it.
                    // Does UQE have `completeQuest`?
                    // Checking UQE class... it has no `completeQuest` method exposed on `uqe`?
                    // It has `acceptQuest`.
                    // It has `update` which calls `checkCompletion`.
                    // If we want to FORCE completion, we might need to find the quest and set `completed = true`?
                    // OR set the remaining 'talk' objective to complete.

                    const quest = window.uqe.activeQuests.find(q => q.id === choice.questId);
                    if (quest) {
                        // Mark all objectives as complete?
                        // Or just force complete.
                        quest.objectives.forEach(o => o.progress = o.target);
                        quest.objectives.forEach(o => o.completed = true);
                        quest.checkCompletion(); // This sets quest.completed = true
                        window.uqe.update(); // This moves it to completedQuests
                    }
                }

                closeDialog();
            } else if (action === 'quest_advance' || action === 'quest_accept' || action === 'quest_accept_side' || action === 'quest_accept_v2' || action === 'quest_accept_main') {
                // UNIFIED UQE BRIDGE REDIRECT with PREVIEW MODAL
                const questEngine = window.uqe;
                if (questId && typeof questEngine !== 'undefined' && questEngine.allDefinitions[questId]) {
                    console.log(`🔗 [UQE Bridge] Showing preview for quest: ${questId}`);

                    // Store current NPC for reopening dialog after accept/decline
                    const currentNPC = currentShopNPC;

                    // Close dialog first
                    closeDialog();

                    // Show quest preview modal
                    showQuestPreviewModalEnhanced(questId,
                        // On Accept - accept quest then reopen dialog
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

                            // Reopen dialog with NPC so player can continue talking
                            console.log('📋 [Dialog] Accept callback - reopening dialog with:', currentNPC?.name);
                            if (currentNPC) {
                                setTimeout(() => startDialog(currentNPC), 50);
                            }
                        },
                        // On Decline - reopen dialog with NPC
                        () => {
                            console.log('📋 [Dialog] Decline callback - reopening dialog with:', currentNPC?.name);
                            if (currentNPC) {
                                setTimeout(() => startDialog(currentNPC), 50);
                            }
                        }
                    );
                } else {
                    // Quest not found in UQE - should not happen with proper setup
                    console.warn(`⚠️ Quest ${questId} not found in UQE definitions! All quests should be in quests_v2.json.`);
                    addChatMessage(`Quest not found: ${questId}`, 0xff0000, '⚠️');
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
}

/**
 * Close dialog
 */
function closeDialog() {
    if (dialogPanel) {
        if (dialogPanel.bg) dialogPanel.bg.destroy();
        if (dialogPanel.npcNameText) dialogPanel.npcNameText.destroy();
        if (dialogPanel.dialogText) dialogPanel.dialogText.destroy();
        if (dialogPanel.portraitImage) dialogPanel.portraitImage.destroy();

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

    // Record closure time to prevent click-through
    if (game.scene.scenes[0]) {
        const s = game.scene.scenes[0];
        s.lastWindowCloseTime = s.time.now;
        console.log('🚫 Dialog closed at:', s.lastWindowCloseTime);
    }
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
    { type: 'consumable', name: 'Health Potion', quality: 'Common', healAmount: 50, price: 20 },
    { type: 'consumable', name: 'Mana Potion', quality: 'Common', manaAmount: 30, price: 20 }
];

/**
 * Choose player class and set initial stats/equipment
 */
function chooseClass(className) {
    console.log(`⚔️ Class Chosen: ${className}`);
    playerStats.class = className;

    // Reset equipment
    playerStats.equipment = {
        weapon: null, armor: null, helmet: null, ring: null, amulet: null, boots: null, gloves: null, belt: null
    };

    // Set stats and basic gear based on class
    if (className === 'Warrior') {
        playerStats.maxHp = 150;
        playerStats.hp = 150;
        playerStats.maxMana = 30;
        playerStats.mana = 30;
        playerStats.baseAttack = 15;
        playerStats.baseDefense = 10;

        // Starting Gear
        playerStats.equipment.weapon = { name: 'Rusty Sword', quality: 'Common', attackPower: 5, type: 'weapon' };
        playerStats.equipment.armor = { name: 'Worn Chainmail', quality: 'Common', defense: 4, type: 'armor' };

    } else if (className === 'Rogue') {
        playerStats.maxHp = 100;
        playerStats.hp = 100;
        playerStats.maxMana = 50;
        playerStats.mana = 50;
        playerStats.baseAttack = 12;
        playerStats.baseDefense = 5;
        playerStats.speedBonus = 20; // Faster

        // Starting Gear
        playerStats.equipment.weapon = { name: 'Dagger', quality: 'Common', attackPower: 4, type: 'weapon' };
        playerStats.equipment.boots = { name: 'Leather Boots', quality: 'Common', defense: 1, speed: 5, type: 'boots' };

    } else if (className === 'Mage') {
        playerStats.maxHp = 80;
        playerStats.hp = 80;
        playerStats.maxMana = 100;
        playerStats.mana = 100;
        playerStats.baseAttack = 8;
        playerStats.baseDefense = 3;

        // Starting Gear
        playerStats.equipment.weapon = { name: 'Wooden Staff', quality: 'Common', attackPower: 3, stats: { maxMana: 20 }, type: 'weapon' };
        playerStats.equipment.amulet = { name: 'Apprentice Amulet', quality: 'Common', stats: { manaRegen: 1 }, type: 'amulet' };
    }

    // Recalculate derived stats
    updatePlayerStats();

    // Show notification
    addChatMessage(`You have chosen the path of the ${className}!`, 0xffff00, '🌟');
    showDamageNumber(player.x, player.y - 50, "Class Selected!", 0xffff00);

    // Complete the quest "The Path Chosen" (main_01_006)
    if (window.uqe) {
        // Find the active quest and manually complete its objective
        const quest = window.uqe.activeQuests.find(q => q.id === 'main_01_006');
        if (quest && quest.objectives && quest.objectives.length > 0) {
            // Mark the class_selection objective as complete
            quest.objectives.forEach(obj => {
                obj.progress = obj.target;
                obj.completed = true;
            });
            console.log(`✅ Marked main_01_006 objectives complete for class: ${className}`);
        }
        // The UQE update loop will detect completion and handle rewards
    }

    // Close the dialog UI
    closeDialog();
}

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
        else if (item.type === 'consumable') spriteKey = (item.name === 'Mana Potion') ? 'mana_potion' : 'item_consumable';
        else if (item.type === 'quest_item') {
            if (item.id === 'crystal_shard') spriteKey = 'item_crystal';
            else if (item.id === 'artifact_fragment') spriteKey = 'item_fragment';
            else spriteKey = 'item_consumable';
        }

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

    // Check if we can stack with existing consumable
    let stacked = false;
    if (item.type === 'consumable' && item.name) {
        const existingStack = playerStats.inventory.find(i =>
            i.type === 'consumable' && i.name === item.name
        );
        if (existingStack) {
            existingStack.quantity = (existingStack.quantity || 1) + 1;
            stacked = true;
        }
    }

    if (!stacked) {
        // Check inventory space
        if (playerStats.inventory.length >= 30) {
            showDamageNumber(player.x, player.y - 40, 'Inventory full!', 0xff0000);
            return;
        }

        // Create item copy for inventory
        const purchasedItem = {
            ...item,
            id: `shop_${Date.now()}_${Math.random()}`,
            quantity: item.type === 'consumable' ? 1 : undefined
        };
        playerStats.inventory.push(purchasedItem);
    }

    playerStats.gold -= price;

    // Update gold display
    if (shopPanel.goldText) {
        shopPanel.goldText.setText(`Gold: ${playerStats.gold}`);
    }

    showDamageNumber(player.x, player.y - 40, `Bought ${item.name}!`, 0x00ff00);

    // Refresh shop UI
    updateShopItems();
    updateShopInventoryItems(); // Update right panel inventory
    updatePotionSlots(); // Update potion slots if consumable

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
        const displayName = (item.quantity && item.quantity > 1) ? `${item.name} x${item.quantity}` : item.name;
        const tempNameText = scene.add.text(0, 0, displayName, {
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
        else if (item.type === 'consumable') spriteKey = (item.name === 'Mana Potion') ? 'mana_potion' : 'item_consumable';
        else if (item.type === 'gold') spriteKey = 'item_gold';
        else if (item.type === 'quest_item') {
            // Specific mapping for quest items
            if (item.id === 'crystal_shard') spriteKey = 'item_crystal';
            else if (item.id === 'artifact_fragment') spriteKey = 'item_fragment';
            else spriteKey = 'item_consumable';
        }

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

        // Item name below sprite (include quantity for stacked items)
        const shopDisplayName = (item.quantity && item.quantity > 1) ? `${item.name} x${item.quantity}` : item.name;
        const itemNameText = scene.add.text(x, y + itemSize / 2 + 5, shopDisplayName, {
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
            // Find item in inventory
            const itemIndex = playerStats.inventory.indexOf(item);
            if (itemIndex > -1) {
                // Handle stacked items - decrement quantity or remove if last one
                if (item.quantity && item.quantity > 1) {
                    item.quantity--;
                } else {
                    playerStats.inventory.splice(itemIndex, 1);
                }

                playerStats.gold += sellPrice;

                // Update displays
                updateShopItems();
                updateShopInventoryItems();
                updatePotionSlots(); // Update potion slots if consumable

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

    // Set up controller navigation for shop inventory items
    if (typeof setMenuItems === 'function') {
        setMenuItems(shopPanel.inventoryItems, 5);
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

    // Clear controller menu selection
    if (typeof clearMenuSelection === 'function') {
        clearMenuSelection();
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
        case 'watchtower':
            // Watchtower dungeon entrance - check if player has the dungeon quest
            if (isQuestActive('main_01_008')) {
                // Emit dungeon entry token for quest tracking
                if (window.uqe && window.uqe.eventBus) {
                    window.uqe.eventBus.emit('item_pickup', {
                        id: 'dungeon_entry_token',
                        type: 'quest_item',
                        amount: 1
                    });
                    // Force UQE update to process completion and trigger autoAccept quests
                    window.uqe.update();
                }
                showDamageNumber(player.x, player.y - 40, 'Entering Watchtower Dungeon...', 0x00ffff);
                buildingPanelVisible = false;
                currentBuilding = null;
                // Transition to dungeon after short delay (gives time for quest UI to update)
                game.scene.scenes[0].time.delayedCall(800, () => {
                    transitionToMap('dungeon');
                });
            } else {
                showDamageNumber(player.x, player.y - 40, 'The Watchtower basement is sealed.', 0xffff00);
                addChatMessage('You need a reason to enter the Watchtower basement.', 0xffff00, '🔒');
                buildingPanelVisible = false;
                currentBuilding = null;
            }
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

        const spriteKey = (item.name === 'Mana Potion') ? 'mana_potion' : 'item_consumable';
        const itemSprite = scene.add.sprite(itemX, itemY, spriteKey);
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
                // Check if we can stack with existing consumable
                let stacked = false;
                if (item.type === 'consumable' && item.name) {
                    console.log(`🛒 Buying ${item.name}, looking for existing stack...`);
                    console.log(`   Inventory consumables:`, playerStats.inventory
                        .filter(i => i.type === 'consumable')
                        .map(i => `${i.name} (qty:${i.quantity || 1})`));

                    const existingStack = playerStats.inventory.find(i =>
                        i.type === 'consumable' && i.name === item.name
                    );
                    if (existingStack) {
                        console.log(`   Found stack: ${existingStack.name} (qty:${existingStack.quantity || 1})`);
                        existingStack.quantity = (existingStack.quantity || 1) + 1;
                        stacked = true;
                        console.log(`   After increment: qty=${existingStack.quantity}`);
                    } else {
                        console.log(`   No existing stack found for "${item.name}"`);
                    }
                }

                if (!stacked) {
                    if (playerStats.inventory.length >= 30) { // Max inventory size
                        showDamageNumber(player.x, player.y - 40, 'Inventory full!', 0xff0000);
                        return;
                    }
                    const newItem = { ...item, id: `consumable_${Date.now()}_${Math.random()}`, quantity: 1 };
                    playerStats.inventory.push(newItem);
                }

                playerStats.gold -= item.price;
                updatePlayerStats();
                updatePotionSlots(); // Update potion slot quantities
                showDamageNumber(player.x, player.y - 40, `Bought ${item.name}!`, 0x00ff00);
                addChatMessage(`Bought ${item.name}`, 0x00ff00, '🍺');
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
    Object.keys(MapManager.dungeonCache).forEach(key => {
        if (MapManager.dungeonCache[key] && MapManager.dungeonCache[key].seed) {
            dungeonSeeds[key] = MapManager.dungeonCache[key].seed;
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
        currentMap: MapManager.currentMap,
        dungeonLevel: MapManager.dungeonLevel,
        dungeonSeeds: dungeonSeeds,
        dungeonCompletions: MapManager.dungeonCompletions,
        uqeQuests: uqe.getSaveData(),
        timestamp: Date.now()
    };

    try {
        localStorage.setItem('rpg_savegame', JSON.stringify(saveData));

        if (typeof addChatMessage === 'function') addChatMessage('Game Saved!', 0x00ffff, '💾');
        console.log('✅ Game saved to localStorage');
        return true;
    } catch (e) {
        console.error('Failed to save game:', e);

        if (typeof addChatMessage === 'function') addChatMessage('Save Failed!', 0xff0000, '❌');
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

        // Migrate: Consolidate consumables into stacks (for old saves with separate items)
        if (playerStats.inventory && playerStats.inventory.length > 0) {
            const consolidatedInventory = [];
            const consumableStacks = {}; // Map name -> stacked item

            console.log('📦 Migration: Starting consumable consolidation...');
            console.log('   Original inventory:', playerStats.inventory.map(i => `${i.name} (qty:${i.quantity || 1})`));

            playerStats.inventory.forEach(item => {
                if (item.type === 'consumable' && item.name) {
                    if (consumableStacks[item.name]) {
                        // Add to existing stack
                        const oldQty = consumableStacks[item.name].quantity || 1;
                        const addQty = item.quantity || 1;
                        consumableStacks[item.name].quantity = oldQty + addQty;
                        console.log(`   Stacked: ${item.name} (${oldQty} + ${addQty} = ${consumableStacks[item.name].quantity})`);
                    } else {
                        // Create new stack
                        item.quantity = item.quantity || 1;
                        consumableStacks[item.name] = item;
                        consolidatedInventory.push(item);
                        console.log(`   New stack: ${item.name} (qty:${item.quantity})`);
                    }
                } else {
                    // Non-consumable items stay as-is
                    consolidatedInventory.push(item);
                }
            });

            playerStats.inventory = consolidatedInventory;
            console.log('   Final inventory:', playerStats.inventory.map(i => `${i.name} (qty:${i.quantity || 'N/A'})`));
            console.log('📦 Migrated inventory: consolidated consumables into stacks');
        }

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
                MapManager.dungeonCache[key] = { seed: seed, level: level };
                console.log(`  - ${key}: seed=${seed}, level=${level}`);
            });
            console.log('📦 Dungeon cache after restore:', Object.keys(MapManager.dungeonCache));
        } else {
            console.warn('⚠️ No dungeon seeds found in save data');
        }

        if (saveData.dungeonCompletions) {
            MapManager.dungeonCompletions = saveData.dungeonCompletions;
        }

        if (saveData.dungeonLevel) {
            MapManager.dungeonLevel = saveData.dungeonLevel;
        }

        // Restore map and recreate if needed
        // IMPORTANT: Use saveData.currentMap (where player saved) not current MapManager.currentMap (where player is now)
        const savedMap = saveData.currentMap;
        if (savedMap) {
            // Always use transitionToMap to ensure proper cleanup, even if we're already on that map
            // This ensures MapManager.buildings/NPCs from previous map are properly destroyed
            const savedLevel = saveData.dungeonLevel || 1;

            // IMPORTANT: For dungeons, ensure cache is properly set up before transition
            if (savedMap === 'dungeon' && saveData.dungeonSeeds) {
                const dungeonKey = `level_${savedLevel}`;
                // Double-check that the seed is in cache before transitioning
                if (saveData.dungeonSeeds[dungeonKey] && (!MapManager.dungeonCache[dungeonKey] || !MapManager.dungeonCache[dungeonKey].seed)) {
                    console.log(`🔧 Ensuring seed is in cache for ${dungeonKey} before transition...`);
                    MapManager.dungeonCache[dungeonKey] = {
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
            MapManager.transitionToMap(savedMap, savedLevel);

            // Restore player position after map transition
            if (savedPlayerPos) {
                player.x = savedPlayerPos.x;
                player.y = savedPlayerPos.y;
            }

            // For town, also ensure NPCs are initialized
            if (savedMap === 'town') {
                initializeNPCs();

                // FORCE REFRESH FROM JSON (Fix for stale save data)
                try {
                    const scene = game.scene.scenes[0];
                    const npcData = scene.cache.json.get('npcData');
                    if (npcData && Array.isArray(npcData)) {
                        console.log('[Fix] Refreshing NPCs from latest JSON...');
                        npcs.forEach(npc => {
                            // Match by ID if available, otherwise loose match could be dangerous so stick to ID
                            const def = npcData.find(d => d.id === npc.id);
                            if (def) {
                                if (npc.name !== def.name || npc.dialogId !== def.dialogId) {
                                    console.log(`[Fix] Updating NPC ${npc.id}: "${npc.name}" -> "${def.name}", Dialog: "${npc.dialogId}" -> "${def.dialogId}"`);
                                    npc.name = def.name;
                                    npc.dialogId = def.dialogId;
                                    // Update visual name if it exists
                                    if (npc.nameText) npc.nameText.setText(npc.name);
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error refreshing NPCs:', e);
                }
            }
        }



        // For wilderness, spawn monsters
        if (savedMap === 'wilderness') {
            const scene = game.scene.scenes[0];
            if (scene && scene.mapWidth && scene.mapHeight && scene.tileSize) {
                spawnInitialMonsters.call(scene, scene.mapWidth * scene.tileSize, scene.mapHeight * scene.tileSize);
            }
        }


        // Update player stats (recalculate attack/defense from equipment)
        updatePlayerStats();

        // Start passive regeneration
        startManaRegen();

        // Refresh UIs
        refreshInventory();
        refreshEquipment();
        refreshQuestLog();
        updatePotionSlots(); // Update potion slot quantities from loaded inventory

        // Update weapon sprite to show equipped weapon
        updateWeaponSprite();

        if (typeof addChatMessage === 'function') addChatMessage('Game Loaded!', 0x00ff00, '📂');
        console.log('✅ Game loaded from localStorage');

        // Force UI refresh after a slight delay to ensure everything settles
        setTimeout(() => {
            try {
                if (typeof addChatMessage === 'function') addChatMessage('Game Ready', 0x00ff00, '✅');
            } catch (e) { console.error('Delayed load notification error', e); }
        }, 500);

        // Expose debug tool
        window.debugFixNPCs = function () {
            console.log('🔧 Running NPC Fixer...');
            const scene = game.scene.scenes[0];
            const npcData = scene.cache.json.get('npcData');

            if (!npcData) {
                console.error('❌ npcData not found in cache!');
                return;
            }

            console.log(`Found ${npcData.length} NPC definitions in JSON.`);
            let updated = 0;

            npcs.forEach(npc => {
                const def = npcData.find(d => d.id === npc.id);
                if (def) {
                    // Check for mismatches
                    if (npc.name !== def.name || npc.dialogId !== def.dialogId) {
                        console.log(`Mismatch for ${npc.id}:`);
                        console.log(`  Current: Name="${npc.name}", Dialog="${npc.dialogId}"`);
                        console.log(`  Target:  Name="${def.name}", Dialog="${def.dialogId}"`);

                        npc.name = def.name;
                        npc.dialogId = def.dialogId;
                        if (npc.nameText) npc.nameText.setText(def.name);

                        console.log('  ✅ Fixed!');
                        updated++;
                    }
                } else {
                    console.warn(`⚠️ NPC ${npc.id} (${npc.name}) has no matching definition in JSON!`);
                }
            });

            console.log(`🔧 Fix complete. Updated ${updated} NPCs.`);
            addChatMessage(`Fixed ${updated} NPCs. Try talking now!`, 0x00ff00);
        };

        return true;
    } catch (e) {
        console.error('Failed to load game:', e);

        if (typeof addChatMessage === 'function') addChatMessage('Load Failed! Check Console.', 0xff0000, '❌');
        return false;
    }
}

/**
 * Show "You have Fallen" dialog
 */
let fallenDialogContainer = null;

/**
 * Show "You have Fallen" dialog
 */
function showFallenDialog() {
    // If dialog is already open, do nothing
    if (fallenDialogContainer) return;

    const scene = game.scene.scenes[0];
    console.log('💀 Displaying Fallen Dialog');

    // Play death sound
    try {
        scene.sound.play('bell_toll', { volume: 0.5 });
    } catch (e) {
        console.warn('Could not play death sound:', e);
    }

    // Pause physics/input
    scene.physics.pause();
    isGamePaused = true;

    // --- 1. Background Container (Visuals) ---
    fallenDialogContainer = scene.add.container(0, 0);
    fallenDialogContainer.setScrollFactor(0);
    fallenDialogContainer.setDepth(9000); // High depth for background

    const screenWidth = scene.scale.width;
    const screenHeight = scene.scale.height;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;

    // Dark Overlay (blocks input from world, but we want button to work)
    const overlay = scene.add.rectangle(centerX, centerY, screenWidth, screenHeight, 0x000000, 0.7);
    overlay.setInteractive(); // Blocks clicks from reaching game world

    // Dialog Window Background
    const dialogWidth = 600;
    const dialogHeight = 500;
    const dialogBg = scene.add.rectangle(centerX, centerY, dialogWidth, dialogHeight, 0x111111);
    dialogBg.setStrokeStyle(4, 0x660000); // Dark red border

    // Header Text
    const fallenText = scene.add.text(centerX, centerY - 180, 'YOU HAVE FALLEN', {
        fontSize: '42px',
        fill: '#ff0000',
        fontFamily: 'Cinzel, serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
    });
    fallenText.setOrigin(0.5);

    // Fallen Image (Constrained size)
    const fallenImage = scene.add.image(centerX, centerY, 'character-fallen');
    // Scale image to fit inside dialog
    const maxImgWidth = dialogWidth - 100;
    const maxImgHeight = 250;

    const scaleX = maxImgWidth / fallenImage.width;
    const scaleY = maxImgHeight / fallenImage.height;
    const finalScale = Math.min(scaleX, scaleY, 1.0);

    fallenImage.setScale(finalScale);
    fallenImage.setOrigin(0.5);

    // Add visuals to container
    fallenDialogContainer.add([overlay, dialogBg, fallenText, fallenImage]);

    // --- 2. Respawn Button (Separate to ensure input works) ---
    // We create this OUTSIDE the container to avoid any container input masking issues
    const btnY = centerY + 180;
    const btnWidth = 220;
    const btnHeight = 60;

    // Store reference on the container for easy cleanup
    fallenDialogContainer.respawnBtn = scene.add.rectangle(centerX, btnY, btnWidth, btnHeight, 0x333333);
    fallenDialogContainer.respawnBtn.setScrollFactor(0);
    fallenDialogContainer.respawnBtn.setDepth(9005); // VISIBLY HIGHER than container
    fallenDialogContainer.respawnBtn.setStrokeStyle(2, 0xffffff);

    // Explicit interactive hit area to be absolutely sure
    fallenDialogContainer.respawnBtn.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, btnWidth, btnHeight),
        Phaser.Geom.Rectangle.Contains
    );

    fallenDialogContainer.respawnText = scene.add.text(centerX, btnY, 'RESPAWN', {
        fontSize: '28px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    fallenDialogContainer.respawnText.setScrollFactor(0);
    fallenDialogContainer.respawnText.setDepth(9006); // Topmost
    fallenDialogContainer.respawnText.setOrigin(0.5);

    // Hover effects
    fallenDialogContainer.respawnBtn.on('pointerover', () => {
        console.log('👆 Hovering Respawn Button');
        if (fallenDialogContainer && fallenDialogContainer.respawnBtn) {
            fallenDialogContainer.respawnBtn.setFillStyle(0x555555);
            scene.input.setDefaultCursor('pointer');
        }
    });

    fallenDialogContainer.respawnBtn.on('pointerout', () => {
        if (fallenDialogContainer && fallenDialogContainer.respawnBtn) {
            fallenDialogContainer.respawnBtn.setFillStyle(0x333333);
            scene.input.setDefaultCursor('default');
        }
    });

    // Shared Respawn Logic
    const handleRespawn = () => {
        console.log('✨ Respawn Action Triggered - Starting Fade');

        // 1. Disable button instantly to prevent double-clicks
        if (fallenDialogContainer && fallenDialogContainer.respawnBtn) {
            fallenDialogContainer.respawnBtn.disableInteractive();
            // Visual feedback: button looks "pressed"
            fallenDialogContainer.respawnBtn.setFillStyle(0x222222);
            scene.input.setDefaultCursor('default');

            if (fallenDialogContainer.respawnText) {
                fallenDialogContainer.respawnText.setText("RESPAWNING...");
            }
        }

        // 2. Create Black Fader Overlay (Highest Depth)
        // Note: We leave fillAlpha as 1 (default) and control visibility via .setAlpha()
        const fader = scene.add.rectangle(centerX, centerY, screenWidth, screenHeight, 0x000000);
        fader.setScrollFactor(0);
        fader.setDepth(10000); // Top of everything
        fader.setAlpha(0); // Start fully transparent

        // 3. Tween Alpha 0 -> 1 (5 seconds)
        scene.tweens.add({
            targets: fader,
            alpha: 1,
            duration: 5000,
            ease: 'Power2',
            onComplete: () => {
                // 4. Respawn Logic (Executed after screen is black)
                console.log('🌑 Screen is black - Executing Respawn Stats Reset');

                // Restore stats
                playerStats.hp = playerStats.maxHp;
                playerStats.mana = playerStats.maxMana;
                playerStats.stamina = playerStats.maxStamina;

                // Update UI
                if (typeof updatePlayerStatsUI === 'function') updatePlayerStatsUI();
                if (typeof updateAbilityBar === 'function') updateAbilityBar();

                // Clean up dialog elements
                if (fallenDialogContainer) {
                    if (fallenDialogContainer.respawnBtn) fallenDialogContainer.respawnBtn.destroy();
                    if (fallenDialogContainer.respawnText) fallenDialogContainer.respawnText.destroy();
                    fallenDialogContainer.destroy();
                    fallenDialogContainer = null;
                }

                // Unpause game
                scene.physics.resume();
                isGamePaused = false;

                showDamageNumber(player.x, player.y - 50, "Respawned!", 0xffff00);
                console.log('✅ Respawn Complete');

                // 5. Cleanup Fader (Chain a quick fade out for smoothness, or destroy)
                // User said "destroy dialog and respawn", implying we return to game.
                // A quick fade out is nicer than a hard cut.
                scene.tweens.add({
                    targets: fader,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => {
                        fader.destroy();
                    }
                });
            }
        });
    };

    // Attach click handler
    fallenDialogContainer.respawnBtn.on('pointerdown', handleRespawn);

    // Make text interactive too
    fallenDialogContainer.respawnText.setInteractive({ useHandCursor: true });
    fallenDialogContainer.respawnText.on('pointerdown', handleRespawn);
}

/**
 * Check for save on page load
 */
function checkAutoLoad() {
    // Auto-load if save exists (optional - you might want to make this manual)
    // loadGame();
}


// ============================================
// REGENERATION SYSTEM
// ============================================

let regenTimerEvent = null;
let hpRegenTimerEvent = null;

/**
 * Starts the passive regeneration loop
 * Rate: 1 MP per 2 seconds
 */
function startManaRegen() {
    console.log('✨ Starting Mana Regeneration System');
    // Safety check for game/scene
    if (!game || !game.scene || !game.scene.scenes || !game.scene.scenes[0]) {
        console.warn('⚠️ Cannot start mana regen: Scene not ready');
        return;
    }

    const scene = game.scene.scenes[0];

    // Clear existing timer if any
    if (regenTimerEvent) {
        regenTimerEvent.remove();
    }

    regenTimerEvent = scene.time.addEvent({
        delay: 2000, // 2 seconds
        loop: true,
        callback: () => {
            if (typeof playerStats !== 'undefined' && playerStats.mana < playerStats.maxMana) {
                playerStats.mana = Math.min(playerStats.maxMana, playerStats.mana + 1);
                if (typeof updateAbilityBar === 'function') {
                    updateAbilityBar(); // Update UI
                }
            }
        }
    });
}

/**
 * Starts the passive HP regeneration loop
 * Rate: 1 HP per 5 seconds
 */
function startHpRegen() {
    console.log('❤️ Starting HP Regeneration System');
    // Safety check for game/scene
    if (!game || !game.scene || !game.scene.scenes || !game.scene.scenes[0]) {
        console.warn('⚠️ Cannot start hp regen: Scene not ready');
        return;
    }

    const scene = game.scene.scenes[0];

    // Clear existing timer if any
    if (hpRegenTimerEvent) {
        hpRegenTimerEvent.remove();
    }

    hpRegenTimerEvent = scene.time.addEvent({
        delay: 5000, // 5 seconds
        loop: true,
        callback: () => {
            if (typeof playerStats !== 'undefined' && playerStats.hp < playerStats.maxHp && !isGamePaused) {
                playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + 1);

                // Update Main UI
                if (typeof updateUI === 'function') {
                    updateUI();
                }

                // Update Player Floating Bar
                if (typeof player !== 'undefined' && player && player.hpBar && player.hpBarBg && player.active) {
                    player.hpBar.width = (playerStats.hp / playerStats.maxHp) * (player.hpBarBg.width - 2);
                }
            }
        }
    });
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
        description: 'Deals damage in a line'
    },
    ice_nova: {
        name: 'Ice Nova',
        manaCost: 20,
        cooldown: 3000, // 3 seconds
        damage: 15,
        range: 150,
        icon: 'fireball_effect', // Reusing effect sprite by color tinting
        color: 0x00ffff,
        description: 'Freezes enemies and deals damage'
    },
    shield: {
        name: 'Shield',
        manaCost: 30,
        cooldown: 5000, // 5 seconds
        duration: 3000,
        icon: 'shield_effect',
        color: 0xffd700,
        description: 'Reduces damage taken'
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

    // Add Health Potion slot (key 4)
    const potionStartX = startX + index * abilitySpacing + 20; // Small gap after abilities

    // Health Potion slot
    const healthPotionBg = scene.add.rectangle(potionStartX, abilityBarY, 60, 60, 0x442222, 0.9)
        .setScrollFactor(0).setDepth(200).setStrokeStyle(2, 0xff4444);

    const healthPotionIcon = scene.add.sprite(potionStartX, abilityBarY, 'item_consumable');
    healthPotionIcon.setScrollFactor(0).setDepth(201).setScale(0.8);
    healthPotionIcon.setTint(0xff4444);

    const healthKeyText = scene.add.text(potionStartX - 20, abilityBarY - 20, '5', {
        fontSize: '14px',
        fill: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 3, y: 2 }
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

    const healthQuantityText = scene.add.text(potionStartX + 15, abilityBarY + 20, 'x0', {
        fontSize: '12px',
        fill: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 2, y: 1 }
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

    const healthLabelText = scene.add.text(potionStartX, abilityBarY + 35, 'HP', {
        fontSize: '10px',
        fill: '#ff4444'
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

    // Mana Potion slot (key 5)
    const manaPotionX = potionStartX + abilitySpacing;

    const manaPotionBg = scene.add.rectangle(manaPotionX, abilityBarY, 60, 60, 0x222244, 0.9)
        .setScrollFactor(0).setDepth(200).setStrokeStyle(2, 0x4444ff);

    const manaPotionIcon = scene.add.sprite(manaPotionX, abilityBarY, 'mana_potion');
    manaPotionIcon.setScrollFactor(0).setDepth(201).setScale(0.8);
    // manaPotionIcon.setTint(0x4444ff); // Use original sprite colors

    const manaKeyText = scene.add.text(manaPotionX - 20, abilityBarY - 20, '6', {
        fontSize: '14px',
        fill: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 3, y: 2 }
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

    const manaQuantityText = scene.add.text(manaPotionX + 15, abilityBarY + 20, 'x0', {
        fontSize: '12px',
        fill: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 2, y: 1 }
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

    const manaLabelText = scene.add.text(manaPotionX, abilityBarY + 35, 'MP', {
        fontSize: '10px',
        fill: '#4444ff'
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

    // Store potion slots for updates
    abilityBar.potionSlots = {
        health: {
            bg: healthPotionBg,
            icon: healthPotionIcon,
            keyText: healthKeyText,
            quantityText: healthQuantityText,
            labelText: healthLabelText
        },
        mana: {
            bg: manaPotionBg,
            icon: manaPotionIcon,
            keyText: manaKeyText,
            quantityText: manaQuantityText,
            labelText: manaLabelText
        }
    };

    // Initial update
    updatePotionSlots();

    console.log(`✅ Ability bar created with ${abilityBar.buttons.length} abilities + 2 potion slots`);
}

/**
 * Update potion slot quantities from inventory
 */
function updatePotionSlots() {
    if (!abilityBar || !abilityBar.potionSlots) return;

    // Count health and mana potions in inventory (including stacked quantities)
    let healthPotions = 0;
    let manaPotions = 0;

    playerStats.inventory.forEach(item => {
        if (item.type === 'consumable') {
            const qty = item.quantity || 1; // Default to 1 if no quantity property
            if (item.name && item.name.toLowerCase().includes('health')) {
                healthPotions += qty;
            } else if (item.name && item.name.toLowerCase().includes('mana')) {
                manaPotions += qty;
            } else if (item.healAmount && !item.manaAmount) {
                // Health potion if it heals HP but not mana
                healthPotions += qty;
            } else if (item.manaAmount) {
                manaPotions += qty;
            }
        }
    });
    // Update quantity text
    abilityBar.potionSlots.health.quantityText.setText(`x${healthPotions}`);
    abilityBar.potionSlots.mana.quantityText.setText(`x${manaPotions}`);

    // Dim slot if no potions
    abilityBar.potionSlots.health.icon.setAlpha(healthPotions > 0 ? 1 : 0.3);
    abilityBar.potionSlots.mana.icon.setAlpha(manaPotions > 0 ? 1 : 0.3);
}

/**
 * Use a potion from inventory
 * @param {string} potionType - 'health' or 'mana'
 */
function usePotion(potionType) {
    // Find the first matching potion in inventory
    let potionIndex = -1;

    for (let i = 0; i < playerStats.inventory.length; i++) {
        const item = playerStats.inventory[i];
        if (item.type !== 'consumable') continue;

        if (potionType === 'health') {
            if ((item.name && item.name.toLowerCase().includes('health')) ||
                (item.healAmount && !item.manaAmount)) {
                potionIndex = i;
                break;
            }
        } else if (potionType === 'mana') {
            if ((item.name && item.name.toLowerCase().includes('mana')) ||
                item.manaAmount) {
                potionIndex = i;
                break;
            }
        }
    }

    if (potionIndex === -1) {
        addChatMessage(`No ${potionType} potions available!`, 0xff6666, '⚠️');
        return;
    }

    const potion = playerStats.inventory[potionIndex];

    // Apply effect
    if (potionType === 'health') {
        const healAmount = potion.healAmount || 50;
        const oldHp = playerStats.hp;
        playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + healAmount);
        const actualHeal = playerStats.hp - oldHp;

        if (actualHeal > 0) {
            addChatMessage(`Used ${potion.name || 'Health Potion'}: +${actualHeal} HP`, 0x44ff44, '💊');
            showDamageNumber(player.x, player.y - 20, `+${actualHeal}`, 0x44ff44, false);
            playSound('heal_cast');
        } else {
            addChatMessage('HP already full!', 0xffff00, '💊');
            return; // Don't consume potion if no effect
        }
    } else if (potionType === 'mana') {
        const manaAmount = potion.manaAmount || 30;
        const oldMana = playerStats.mana;
        playerStats.mana = Math.min(playerStats.maxMana, playerStats.mana + manaAmount);
        const actualMana = playerStats.mana - oldMana;

        if (actualMana > 0) {
            addChatMessage(`Used ${potion.name || 'Mana Potion'}: +${actualMana} MP`, 0x4444ff, '💊');
            showDamageNumber(player.x, player.y - 20, `+${actualMana}`, 0x4444ff, false);
            playSound('heal');
        } else {
            addChatMessage('Mana already full!', 0xffff00, '💊');
            return; // Don't consume potion if no effect
        }
    }

    // Decrement potion quantity (or remove if last one)
    if (potion.quantity && potion.quantity > 1) {
        potion.quantity--;
    } else {
        playerStats.inventory.splice(potionIndex, 1);
    }

    // Update potion slot display
    updatePotionSlots();

    // Flash the slot to show it was used
    if (abilityBar && abilityBar.potionSlots) {
        const slot = potionType === 'health' ? abilityBar.potionSlots.health : abilityBar.potionSlots.mana;
        slot.bg.setFillStyle(0xffffff, 0.8);
        const scene = game.scene.scenes[0];
        scene.time.delayedCall(100, () => {
            slot.bg.setFillStyle(potionType === 'health' ? 0x442222 : 0x222244, 0.9);
        });
        updateAbilityBar(); // Update UI
    }
}

function castHeal() {
    // Define scene first
    const scene = game.scene.scenes[0];

    // Play sound
    playSound('heal_cast');

    // Effect: Heal player
    const healAmount = ABILITY_DEFINITIONS.heal.healAmount;
    const oldHp = playerStats.hp;
    playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + healAmount);
    const actualHeal = playerStats.hp - oldHp;

    showDamageNumber(player.x, player.y - 30, `+${actualHeal}`, 0x00ff00, false);

    // Visual effect
    const particles = scene.add.particles(player.x, player.y, 'heal_effect', {
        speed: { min: 50, max: 100 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 800,
        quantity: 10,
        blendMode: 'ADD'
    });

    scene.time.delayedCall(800, () => {
        particles.destroy();
    });
}

/**
 * Update Ability/Mana Bar UI
 */
/**
 * Update Ability/Mana Bar UI
 */
function updateAbilityBar() {
    // Use the central updateUI function to avoid conflicting updates
    // (updateUI sets width, whereas this used to set scaleX, causing double-scaling)
    updateUI();
}

/**
 * Use an ability
 * @param {number} abilityIndex - 1, 2, or 3
 */
window.useAbility = function (abilityIndex) {
    console.log(`[Ability Debug] useAbility called with index: ${abilityIndex}`);
    // Implement ability logic here based on index
    // 1: Heal
    // 2: Fireball
    // 3: Ice Nova
    // 4: Shield

    // Check if ability is unlocked or available (simplified for now)
    const abilityName = abilityIndex === 1 ? 'heal' :
        (abilityIndex === 2 ? 'fireball' :
            (abilityIndex === 3 ? 'ice_nova' : 'shield'));

    // Get definition directly
    const abilityDef = ABILITY_DEFINITIONS[abilityName];
    if (!abilityDef) {
        console.error(`[Ability Debug] Definition not found for ${abilityName} (index ${abilityIndex})`);
        return;
    }

    const manaCost = abilityDef.manaCost;

    if (playerStats.mana < manaCost) {
        addChatMessage(`Not enough mana! Need ${manaCost}`, 0xff6666);
        return;
    }

    /* 
       Note: Actual ability implementation was likely here before. 
       Re-implementing basic dispatch.
    */

    if (abilityIndex === 1) {
        castHeal();
    } else if (abilityIndex === 2) {
        castFireball();
    } else if (abilityIndex === 3) {
        castIceNova();
    } else if (abilityIndex === 4) {
        castShield();
    }

    // Deduct mana
    playerStats.mana -= manaCost;
    updateAbilityBar(); // Update UI

    // Trigger visual cooldown
    triggerAbilityCooldown(abilityIndex);
}

/**
 * Trigger visual cooldown on ability bar
 * @param {number} abilityIndex - 1, 2, or 3
 */
function triggerAbilityCooldown(abilityIndex) {
    if (!abilityBar) { console.warn('[Cooldown Debug] abilityBar missing'); return; }
    if (!abilityBar.buttons) { console.warn('[Cooldown Debug] abilityBar.buttons missing'); return; }

    const button = abilityBar.buttons[abilityIndex - 1];
    if (!button) {
        console.warn(`[Cooldown Debug] Button for index ${abilityIndex} (array index ${abilityIndex - 1}) missing. Total buttons: ${abilityBar.buttons.length}`);
        return;
    }

    console.log(`[Cooldown Debug] Triggering cooldown for ability ${abilityIndex}`);
    const abilityName = abilityIndex === 1 ? 'heal' :
        (abilityIndex === 2 ? 'fireball' :
            (abilityIndex === 3 ? 'ice_nova' : 'shield'));
    const cooldownDuration = ABILITY_DEFINITIONS[abilityName].cooldown;

    // Show overlay
    if (button.cooldownOverlay) {
        button.cooldownOverlay.setVisible(true);
        button.cooldownOverlay.scaleY = 1;

        // Tween the overlay scaling down (e.g. shutter effect) or just alpha
        // Let's do a simple height reduction to represent time
        const scene = game.scene.scenes[0];

        // Remove existing tween if any
        if (button.cooldownTween) {
            button.cooldownTween.remove();
        }

        button.cooldownTween = scene.tweens.add({
            targets: button.cooldownOverlay,
            scaleY: 0,
            duration: cooldownDuration,
            ease: 'Linear',
            onComplete: () => {
                button.cooldownOverlay.setVisible(false);
                button.cooldownOverlay.scaleY = 1; // Reset
            }
        });
    }

    // Show text timer
    if (button.cooldownText) {
        button.cooldownText.setVisible(true);
        button.cooldownText.setText((cooldownDuration / 1000).toFixed(1));

        const scene = game.scene.scenes[0];

        // Update text loop
        if (button.textEvent) {
            button.textEvent.remove();
        }

        let remaining = cooldownDuration;
        button.textEvent = scene.time.addEvent({
            delay: 100,
            repeat: Math.ceil(cooldownDuration / 100) - 1,
            callback: () => {
                remaining -= 100;
                if (remaining <= 0) {
                    button.cooldownText.setVisible(false);
                } else {
                    button.cooldownText.setText((remaining / 1000).toFixed(1));
                }
            }
        });
    }
}

function castFireball() {
    const scene = game.scene.scenes[0];

    // Play sound
    playSound('fireball_cast');

    // Animate player
    if (scene.anims.exists('attack')) {
        player.play('attack');
    }

    // FIREBALL LOGIC: Player-Centered Radial Explosion (PBAOE)
    const radius = 200; // Large area
    let hitCount = 0;

    // Visual Effects
    createFireballExplosion(player.x, player.y);

    // Initial Burst Damage Calculation
    // Nerfed from 2.5x to 1.5x to account for DOT
    const baseDamage = playerStats.attack * 1.5;

    monsters.forEach(monster => {
        if (!monster || !monster.active || monster.hp <= 0) return;

        const dist = Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y);

        if (dist <= radius) {
            // HIT!
            hitCount++;
            const damage = Math.floor(baseDamage * Phaser.Math.FloatBetween(0.9, 1.1));

            monster.hp -= damage;
            createHitEffects(monster.x, monster.y, true, 'fire'); // Force critical visual for fire
            showDamageNumber(monster.x, monster.y - 20, `-${damage}`, 0xff4400, true, 'fire');

            if (monster.hp <= 0) {
                handleMonsterDeath(monster);
            }
        }
    });

    // SCORCHED EARTH MECHANIC (DOT)
    // Pass the baseDamage so ticks are proportional to player power
    createScorchedEarth(player.x, player.y, baseDamage);

    if (hitCount > 0) {
        addChatMessage(`Fireball burst hit ${hitCount} enemies!`, 0xff4400);
    } else {
        addChatMessage("Fireball burst hit nothing.", 0x888888);
    }
}

/**
 * Creates a lingering damage zone that burns enemies over time
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} initialDamage - The damage of the initial hit (used to calc ticks)
 */
function createScorchedEarth(x, y, initialDamage) {
    const scene = game.scene.scenes[0];

    // DOT Configuration
    const duration = 3000;      // 3 seconds
    const tickInterval = 500;   // 0.5 seconds
    const radius = 150;         // Slightly smaller than impact radius
    let currentPercentage = 0.10; // Start at 10%

    /* 
       Note: We don't need a visual object for the zone itself because 
       'createFireballExplosion' already spawned lingering smoke particles 
       at this location. We just need the logic.
    */

    // Create a timer event for the ticks
    const dotTimer = scene.time.addEvent({
        delay: tickInterval,
        repeat: (duration / tickInterval) - 1, // Run X times
        callback: () => {
            // Calculate Damage for this tick
            let tickDamage = Math.floor(initialDamage * currentPercentage);
            if (tickDamage < 1) tickDamage = 1; // Minimum 1 damage

            let hitSomething = false;

            // Scan for enemies in the zone
            monsters.forEach(monster => {
                if (!monster || !monster.active || monster.hp <= 0) return;

                const dist = Phaser.Math.Distance.Between(x, y, monster.x, monster.y);

                if (dist <= radius) {
                    hitSomething = true;
                    monster.hp -= tickDamage;

                    // Show small orange damage number
                    // Use 'false' for critical to make it look normal-sized/small
                    showDamageNumber(monster.x, monster.y - 30, `-${tickDamage}`, 0xff6600, false);

                    if (monster.hp <= 0) {
                        handleMonsterDeath(monster);
                    }
                }
            });

            // Visual 'Pulse' if active (flicker embers)
            if (scene.textures.exists('death_particle')) {
                const pulse = scene.add.particles(x, y, 'death_particle', {
                    speed: 50,
                    lifespan: 400,
                    scale: { start: 0.5, end: 0 },
                    quantity: 3,
                    emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, radius) },
                    blendMode: 'ADD',
                    tint: 0xff4400
                });
                // Auto-destroy emitter after one burst
                scene.time.delayedCall(450, () => pulse.destroy());
            }

            // Decay the percentage for next tick
            currentPercentage -= 0.01;
            if (currentPercentage < 0.01) currentPercentage = 0.01;
        }
    });
}
/**
 * Create visual explosion effects for Fireball
 */
function createFireballExplosion(x, y) {
    const scene = game.scene.scenes[0];

    // 1. Screen Shake (Heavy)
    scene.cameras.main.shake(150, 0.015);

    // 2. Expanding Ring Shockwave
    const ring = scene.add.circle(x, y, 10, 0xff4400, 0); // Start invisible
    ring.setStrokeStyle(4, 0xffaa00);
    ring.setDepth(player.depth + 1);

    scene.tweens.add({
        targets: ring,
        radius: 200,
        alpha: { start: 1, end: 0 },
        strokeWidth: { start: 10, end: 0 },
        duration: 400,
        ease: 'Cubic.out',
        onComplete: () => ring.destroy()
    });

    // 3. Inner Flash
    const flash = scene.add.circle(x, y, 50, 0xffffaa, 1);
    flash.setDepth(player.depth + 2);
    scene.tweens.add({
        targets: flash,
        scale: 3,
        alpha: 0,
        duration: 200,
        onComplete: () => flash.destroy()
    });

    // 4. Particle Burst
    if (scene.textures.exists('impact_particle')) {
        const emitter = scene.add.particles(x, y, 'impact_particle', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 300, max: 600 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            quantity: 30,
            blendMode: 'ADD',
            tint: [0xff4400, 0xffaa00, 0xffff00]
        });
        emitter.setDepth(player.depth + 1);

        // Stop emitting after a burst
        scene.time.delayedCall(100, () => emitter.stop());
        scene.time.delayedCall(1000, () => emitter.destroy());
    }

    // 5. Lingering Burn Effect (Ground Smoke)
    if (scene.textures.exists('death_particle')) {
        const burnEmitter = scene.add.particles(x, y, 'death_particle', {
            speed: 20,
            lifespan: 2000,
            scale: { start: 1, end: 2 },
            alpha: { start: 0.5, end: 0 },
            quantity: 4,
            frequency: 100,
            emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 150) },
            blendMode: 'MULTIPLY', // Darken/Smoke effect
            tint: 0x444444
        });
        burnEmitter.setDepth(player.depth - 1); // On ground

        scene.time.delayedCall(2000, () => {
            burnEmitter.stop();
            scene.time.delayedCall(2500, () => burnEmitter.destroy());
        });
    }
}

function castIceNova() {
    // Define scene and other variables first
    const scene = game.scene.scenes[0];
    // Play sound with 2s duration limit
    const iceNovaSound = scene.sound.add('ice_nova_sound');
    iceNovaSound.play();
    scene.time.delayedCall(2000, () => {
        if (iceNovaSound && iceNovaSound.isPlaying) {
            iceNovaSound.stop();
        }
    });
    // END_SOUND_FIX

    // ICE NOVA LOGIC: PBAOE (Point Blank Area of Effect)
    const radius = 150;
    let hitCount = 0;

    monsters.forEach(monster => {
        if (!monster || !monster.active || monster.hp <= 0) return;

        const dist = Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y);

        if (dist <= radius) {
            hitCount++;
            const baseDamage = playerStats.attack * 1.5;
            const damage = Math.floor(baseDamage * Phaser.Math.FloatBetween(0.8, 1.2));

            monster.hp -= damage;
            createHitEffects(monster.x, monster.y, false, 'ice');
            showDamageNumber(monster.x, monster.y - 20, `-${damage}`, 0x00ffff, false, 'ice');

            // "Freeze" / Slow effect (simulate by reducing speed temp)
            if (monster.speed && !monster.isFrozen) {
                monster.originalSpeed = monster.speed;
                monster.speed *= 0.5;
                monster.isFrozen = true;
                // Tint blue
                if (typeof monster.setTint === 'function') {
                    monster.setTint(0x00ffff);
                }

                // Restore after 3 seconds
                game.scene.scenes[0].time.delayedCall(3000, () => {
                    if (monster && monster.active) {
                        monster.speed = monster.originalSpeed || 50;
                        monster.isFrozen = false;
                        if (typeof monster.clearTint === 'function') {
                            monster.clearTint();
                        }
                    }
                });
            }

            if (monster.hp <= 0) {
                handleMonsterDeath(monster);
            }
        }
    });

    addChatMessage(`Ice Nova froze ${hitCount} enemies!`, 0x00ffff);
}

function castShield() {
    try {
        // Use 'heal' sound as placeholder (shield_cast not loaded)
        playSound('heal');

        // SHIELD LOGIC: Temporary Health / Defense Buff
        const healAmount = 20;
        playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + healAmount);

        if (player && player.active) {
            showDamageNumber(player.x, player.y - 30, `+${healAmount} Shield`, 0xffff00);

            // Add visual indicator (yellow circle)
            const scene = game.scene.scenes[0];
            const shieldSprite = scene.add.circle(player.x, player.y, 30, 0xffff00, 0.3);
            shieldSprite.setDepth(player.depth + 1);

            // Follow player for 5 seconds
            const duration = 5000;
            const startTime = scene.time.now;

            const updateShield = () => {
                if (!player || !player.active || !shieldSprite.active) {
                    if (shieldSprite && shieldSprite.active) shieldSprite.destroy();
                    scene.events.off('update', updateShield);
                    return;
                }

                const elapsed = scene.time.now - startTime;
                if (elapsed > duration) {
                    shieldSprite.destroy();
                    scene.events.off('update', updateShield);
                    addChatMessage("Divine Shield faded.", 0xffff00);
                    return;
                }

                shieldSprite.x = player.x;
                shieldSprite.y = player.y;
                shieldSprite.setAlpha(0.3 + Math.sin(elapsed / 200) * 0.1);
            };

            scene.events.on('update', updateShield);
            addChatMessage("Divine Shield activated!", 0xffff00);
        }
    } catch (error) {
        console.error("Error in castShield:", error);
    }
}

// Expose ability functions globally for controller
window.usePotion = usePotion;
window.useAbility = useAbility;

// ============================================
// DIALOG QUEUE SYSTEM
// ============================================

/**
 * Queue a dialog to be shown later
 */
function queueDialog(type, data) {
    console.log(`📥 Queueing dialog: ${type}`, data);
    dialogQueue.push({ type, data });
}

/**
 * Process the dialog queue
 */
function processDialogQueue() {
    // Check if we can show a dialog
    if (isDialogQueueProcessing) return;
    if (dialogQueue.length === 0) return;

    // Check blocking conditions
    const inCombat = typeof isInCombat === 'function' ? isInCombat() : false;
    if (inCombat) return;

    if (dialogVisible) return;
    if (questCompletedModal) return;
    if (newQuestModal) return;
    if (questPreviewModal) return; // Wait for preview to close
    if (questPopup) return; // Wait for existing popup to clear

    // Safety check for cutscenes or other blocks?

    // Process next item
    const item = dialogQueue[0]; // Peek

    // Start processing
    isDialogQueueProcessing = true;

    console.log(`📤 Processing dialog queue item: ${item.type}`);

    try {
        if (item.type === 'QUEST_COMPLETED') {
            showQuestCompletedPopupEnhanced(item.data);
            // Remove from queue ONLY after showing? 
            // Actually showQuestCompletedPopup creates a modal that blocks via questCompletedModal check
            // So we can remove it from queue now, and the next check will be blocked by the modal
            dialogQueue.shift();
            isDialogQueueProcessing = false;
        } else if (item.type === 'QUEST_AVAILABLE') {
            const questDef = item.data;
            if (typeof showQuestPreviewModal === 'function') {
                // Show the interactive modal
                showQuestPreviewModal(questDef.id,
                    // On Accept
                    () => {
                        if (window.uqe && window.uqe.acceptPendingQuest) {
                            window.uqe.acceptPendingQuest(questDef.id);
                        }
                        showDamageNumber(player.x, player.y - 40, "Quest Accepted!", 0x00ff00);
                        playSound('item_pickup');
                        if (typeof updateQuestTrackerHUD === 'function') updateQuestTrackerHUD();
                        // Modal close handles unblocking
                    },
                    // On Decline
                    () => {
                        console.log(`📋 Quest ${questDef.id} declined`);
                        // Modal close handles unblocking
                    }
                );
            } else {
                // Fallback if modal function missing
                showNewQuestPopup(item.data);
            }

            // Remove from queue - the modal itself blocks the queue loop via questPreviewModal check
            dialogQueue.shift();
            isDialogQueueProcessing = false;
        } else {
            // Unknown type
            console.warn(`Unknown dialog queue type: ${item.type}`);
            dialogQueue.shift();
            isDialogQueueProcessing = false;
        }
    } catch (e) {
        console.error("Error processing dialog queue:", e);
        dialogQueue.shift(); // Remove faulty item
        isDialogQueueProcessing = false;
    }
}

/**
 * Show Quest Completed Popup (Restored & Fixed)
 */
function showQuestCompletedPopup(quest) {
    if (!quest) return;

    const scene = game.scene.scenes[0];
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;

    playSound('quest_complete');

    // Create unique elements for explicit depth control (No Container)
    // Depths: Overlay (1999), BG (2000), Text (2001), Button (2002)

    // Optional: Dark overlay behind the popup to dim the game
    const overlay = scene.add.rectangle(0, 0, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.4)
        .setScrollFactor(0)
        .setDepth(1999)
        .setOrigin(0, 0)
        .setInteractive(); // Block clicks behind

    // Background
    const bg = scene.add.rectangle(centerX, centerY, 400, 200, 0x000000, 0.9)
        .setScrollFactor(0)
        .setDepth(2000)
        .setStrokeStyle(4, 0xffff00);

    // Title
    const title = scene.add.text(centerX, centerY - 60, "QUEST COMPLETED!", {
        fontSize: '28px',
        fill: '#ffd700',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2001).setOrigin(0.5);

    // Quest Name
    const nameText = scene.add.text(centerX, centerY - 10, quest.title, {
        fontSize: '22px',
        fill: '#ffffff'
    }).setScrollFactor(0).setDepth(2001).setOrigin(0.5);

    // Rewards text
    let rewardTextStr = "";
    if (quest.rewards) {
        if (quest.rewards.xp) rewardTextStr += `${quest.rewards.xp} XP  `;
        if (quest.rewards.gold) rewardTextStr += `${quest.rewards.gold} Gold`;
    }

    const rewardText = scene.add.text(centerX, centerY + 30, rewardTextStr, {
        fontSize: '18px',
        fill: '#00ff00'
    }).setScrollFactor(0).setDepth(2001).setOrigin(0.5);

    // Close button
    const closeBtnBg = scene.add.rectangle(centerX, centerY + 70, 120, 40, 0x333333)
        .setScrollFactor(0)
        .setDepth(2002)
        .setStrokeStyle(2, 0x888888)
        .setInteractive({ useHandCursor: true });

    const closeBtnText = scene.add.text(centerX, centerY + 70, "Continue", {
        fontSize: '18px',
        fill: '#ffffff'
    }).setScrollFactor(0).setDepth(2003).setOrigin(0.5);

    // Close Handler
    const handleClose = () => {
        console.log('✅ Quest Completed Popup: Close button clicked');

        // Destroy all elements
        if (questCompletedModal) {
            questCompletedModal.destroy();
        }

        // Check queue again after a short delay
        setTimeout(() => {
            console.log('Checking queue after close...');
            processDialogQueue();
        }, 100);
    };

    closeBtnBg.on('pointerdown', handleClose);
    closeBtnText.setInteractive({ useHandCursor: true }).on('pointerdown', handleClose);

    // Hover effects
    closeBtnBg.on('pointerover', () => closeBtnBg.setFillStyle(0x555555));
    closeBtnBg.on('pointerout', () => closeBtnBg.setFillStyle(0x333333));

    // Store as global blocker with destroy method
    window.questCompletedModal = {
        closeBtn: closeBtnBg,
        destroy: () => {
            if (overlay) overlay.destroy();
            if (bg) bg.destroy();
            if (title) title.destroy();
            if (nameText) nameText.destroy();
            if (rewardText) rewardText.destroy();
            if (closeBtnBg) closeBtnBg.destroy();
            if (closeBtnText) closeBtnText.destroy();
            window.questCompletedModal = null;
            questCompletedModal = null;
        }
    };
    questCompletedModal = window.questCompletedModal;

    console.log('[Quest Debug] questCompletedModal (Standard) assigned with closeBtn');

    // Pulse animation (Manual tween on main elements)
    scene.tweens.add({
        targets: [bg, title, nameText, rewardText, closeBtnBg, closeBtnText],
        scale: { from: 0.8, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 300,
        ease: 'Back.out'
    });
}

/**
 * Show New Quest Available Popup (Restored)
 */
function showNewQuestPopup(quest) {
    if (!quest) return;

    const scene = game.scene.scenes[0];
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 3; // Higher up

    playSound('new_quest');

    // Create container
    const popup = scene.add.container(centerX, centerY).setScrollFactor(0).setDepth(500);
    questPopup = popup; // Set global blocker reference

    // Background
    const bg = scene.add.rectangle(0, 0, 350, 80, 0x000000, 0.8)
        .setStrokeStyle(2, 0x00ffff);
    popup.add(bg);

    // Icon
    const icon = scene.add.text(-140, 0, "!", {
        fontSize: '40px',
        fill: '#ffff00',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    popup.add(icon);

    // Text
    const title = scene.add.text(-110, -15, "New Quest Available:", {
        fontSize: '14px',
        fill: '#aaaaaa'
    }).setOrigin(0, 0.5);

    const name = scene.add.text(-110, 10, quest.title, {
        fontSize: '18px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    popup.add([title, name]);

    // Slide in animation
    popup.y -= 100;
    popup.alpha = 0;

    scene.tweens.add({
        targets: popup,
        y: centerY,
        alpha: 1,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
            // Auto hide after delay
            scene.time.delayedCall(4000, () => {
                if (popup && popup.active) {
                    scene.tweens.add({
                        targets: popup,
                        alpha: 0,
                        y: centerY - 50,
                        duration: 500,
                        onComplete: () => {
                            popup.destroy();
                            if (questPopup === popup) questPopup = null; // Unblock queue
                        }
                    });
                } else {
                    if (questPopup === popup) questPopup = null; // Unblock even if destroyed elsewhere
                }
            });
        }
    });
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
            // Check if audio is in cache (loaded successfully)
            if (scene.cache.audio.exists(soundName)) {
                // Create sound object for later use
                soundEffects[soundName] = scene.sound.add(soundName, { volume: 0.7 });
                console.log(`  ✅ Loaded: ${soundName}`);
            } else {
                console.log(`  ⚠️ Not in cache: ${soundName}`);
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
        { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10, isProcedural: false, spawnAmount: [1, 3] },
        { name: 'Orc', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20, isProcedural: false, spawnAmount: [1, 2] },
        { name: 'Skeleton', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15, isProcedural: false, spawnAmount: [1, 2] },
        { name: 'Spider', textureKey: 'monster_spider', hp: 20, attack: 4, speed: 70, xp: 8, isProcedural: false, spawnAmount: [3, 5] },
        { name: 'Slime', textureKey: 'monster_slime', hp: 15, attack: 3, speed: 30, xp: 5, isProcedural: false, spawnAmount: [2, 4] },
        { name: 'Wolf', textureKey: 'monster_wolf', hp: 40, attack: 7, speed: 65, xp: 18, isProcedural: false, spawnAmount: [2, 3] },
        { name: 'Dragon', textureKey: 'monster_dragon', hp: 80, attack: 12, speed: 35, xp: 40, isProcedural: false, spawnAmount: [1, 1] },
        { name: 'Ghost', textureKey: 'monster_ghost', hp: 35, attack: 6, speed: 55, xp: 12, isProcedural: false, spawnAmount: [1, 2] },
        { name: 'Echo_Mite', textureKey: 'monster_echo_mite', hp: 15, attack: 3, speed: 60, xp: 5, isProcedural: false, spawnAmount: [2, 4] }
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
                isProcedural: true,
                spawnAmount: bp.stats.spawnAmount || [1, 1]
            });
        });
    }

    // Spawn monsters spread across entire map, avoiding player spawn area
    const playerSpawnX = 400;
    const playerSpawnY = 300;
    const minDistanceFromPlayer = MONSTER_AGGRO_RADIUS;

    // Use pack spawning
    let spawned = 0;
    while (spawned < MAX_MONSTERS) {
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

        // Determine pack size based on spawnAmount
        const spawnAmount = type.spawnAmount || [1, 1];
        const packSize = Phaser.Math.Between(spawnAmount[0], spawnAmount[1]);

        console.log(`🐺 Pack spawn: ${type.name} x${packSize} (range: ${spawnAmount[0]}-${spawnAmount[1]})`);

        // Spawn the pack clustered around the spawn point
        for (let p = 0; p < packSize && spawned < MAX_MONSTERS; p++) {
            // Offset each pack member slightly from the center
            const offsetX = p === 0 ? 0 : Phaser.Math.Between(-40, 40);
            const offsetY = p === 0 ? 0 : Phaser.Math.Between(-40, 40);
            spawnMonster.call(this, spawnX + offsetX, spawnY + offsetY, type);
            spawned++;
        }
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
        monster.monsterId = type.id || type.monsterType || type.name.toLowerCase();
        monster.monsterType = type.monsterType || type.name.toLowerCase();
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

        // Make monster interactive for click-to-attack
        monster.setInteractive();

        // Add Hover Effect
        if (typeof window.enableHoverEffect === 'function') {
            window.enableHoverEffect(monster, scene);
        }

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
// let questTrackerEntries = {}; // Moved to top of file

/**
 * Initialize/Update the persistent quest tracker HUD
 */
function updateQuestTrackerHUD() {
    const scene = game.scene.scenes[0];
    if (!scene) return;

    const screenWidth = scene.cameras.main.width;
    const startX = screenWidth - 250;
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

/**
 * Enhanced Quest Completed Popup with Portrait and Details
 */
function showQuestCompletedPopupEnhanced(quest) {
    if (!quest) return;

    const scene = game.scene.scenes[0];
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;

    playSound('quest_complete');

    // Create unique elements for explicit depth control (No Container)
    // Depths: Overlay (1999), BG (2000), Text (2001), Button (2002)

    // Optional: Dark overlay behind the popup to dim the game
    const overlay = scene.add.rectangle(0, 0, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.5)
        .setScrollFactor(0)
        .setDepth(1999)
        .setOrigin(0, 0)
        .setInteractive(); // Block clicks behind

    // Expanded Layout Dimensions
    const modalWidth = 600;
    const modalHeight = 400;

    // Background
    const bg = scene.add.rectangle(centerX, centerY, modalWidth, modalHeight, 0x000000, 0.95)
        .setScrollFactor(0)
        .setDepth(2000)
        .setStrokeStyle(4, 0xffff00);

    // Track all elements for easy destruction
    const elements = [overlay, bg];

    // --- Portrait Section (Left) ---
    // Lookup NPC using registry to get portrait key
    // We try to find the NPC by name in the loaded registry
    let npc = null;
    let giverName = quest.giver;

    // Fallback: If runtime object doesn't have giver, check static definition
    if (!giverName && window.uqe && window.uqe.allDefinitions[quest.id]) {
        giverName = window.uqe.allDefinitions[quest.id].giver;
    }

    if (typeof npcRegistry !== 'undefined' && giverName) {
        npc = npcRegistry[giverName];
    }

    let portrait = null;
    let contentStartX = centerX; // Default to center if no portrait

    if (npc && npc.portraitKey && scene.textures.exists(npc.portraitKey)) {
        contentStartX = centerX + 80; // Shift text right

        // Portrait background/frame
        const portraitBg = scene.add.rectangle(centerX - 180, centerY, 180, 240, 0x222222)
            .setScrollFactor(0).setDepth(2001).setStrokeStyle(2, 0x666666);
        elements.push(portraitBg);

        // Portrait Image
        portrait = scene.add.image(centerX - 180, centerY, npc.portraitKey)
            .setScrollFactor(0).setDepth(2002);

        // Scale portrait to fit 
        const maxPortraitWidth = 170;
        const maxPortraitHeight = 230;

        // Simple scale fit
        if (portrait.width > maxPortraitWidth || portrait.height > maxPortraitHeight) {
            const scaleX = maxPortraitWidth / portrait.width;
            const scaleY = maxPortraitHeight / portrait.height;
            const scale = Math.max(scaleX, scaleY); // Cover strategy
            portrait.setScale(scale);
        }

        // MASKING FIX
        const maskShape = scene.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.setScrollFactor(0);
        maskShape.fillRect(centerX - 180 - maxPortraitWidth / 2, centerY - maxPortraitHeight / 2, maxPortraitWidth, maxPortraitHeight);

        const mask = maskShape.createGeometryMask();
        portrait.setMask(mask);
        elements.push(maskShape);

        elements.push(portrait);

        // NPC Name under portrait
        const npcName = scene.add.text(centerX - 180, centerY + 130, npc.name, {
            fontSize: '16px',
            fill: '#aaaaaa',
            fontStyle: 'italic'
        }).setScrollFactor(0).setDepth(2002).setOrigin(0.5);
        elements.push(npcName);
    }

    // --- Text Content (Right) ---

    // Header "QUEST COMPLETED!"
    const title = scene.add.text(centerX, centerY - 160, "QUEST COMPLETED!", {
        fontSize: '32px',
        fill: '#ffd700',
        fontStyle: 'bold',
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, stroke: true, fill: true }
    }).setScrollFactor(0).setDepth(2003).setOrigin(0.5);
    elements.push(title);

    // Quest Title
    const questTitle = scene.add.text(contentStartX, centerY - 110, quest.title, {
        fontSize: '26px',
        fill: '#ffffff',
        fontStyle: 'bold',
        wordWrap: { width: 350 }
    }).setScrollFactor(0).setDepth(2001).setOrigin(0.5, 0); // Top-center alignment
    elements.push(questTitle);

    // Quest Description
    const descText = scene.add.text(contentStartX, centerY - 70, quest.description || "You have completed this quest.", {
        fontSize: '16px',
        fill: '#cccccc',
        wordWrap: { width: 340 },
        align: 'center'
    }).setScrollFactor(0).setDepth(2001).setOrigin(0.5, 0);
    elements.push(descText);

    // Objectives List
    let objY = centerY;
    if (quest.objectives && quest.objectives.length > 0) {
        quest.objectives.forEach(obj => {
            const objText = scene.add.text(contentStartX, objY, `✓ ${obj.label || 'Objective Complete'}`, {
                fontSize: '15px',
                fill: '#88ff88'
            }).setScrollFactor(0).setDepth(2001).setOrigin(0.5, 0);
            elements.push(objText);
            objY += 22;
        });
    }

    // Rewards text
    let rewardTextStr = "Rewards: ";
    if (quest.rewards) {
        if (quest.rewards.xp) rewardTextStr += `${quest.rewards.xp} XP  `;
        if (quest.rewards.gold) rewardTextStr += `${quest.rewards.gold} Gold`;
    }

    const rewardText = scene.add.text(centerX, centerY + 130, rewardTextStr, {
        fontSize: '22px',
        fill: '#00ff00',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2001).setOrigin(0.5);
    elements.push(rewardText);

    // Close button
    const closeBtnBg = scene.add.rectangle(centerX, centerY + 175, 160, 40, 0x333333)
        .setScrollFactor(0)
        .setDepth(2002)
        .setStrokeStyle(2, 0x888888)
        .setInteractive({ useHandCursor: true });
    elements.push(closeBtnBg);

    const closeBtnText = scene.add.text(centerX, centerY + 175, "Continue", {
        fontSize: '20px',
        fill: '#ffffff'
    }).setScrollFactor(0).setDepth(2003).setOrigin(0.5);
    elements.push(closeBtnText);

    // Close Handler
    const handleClose = () => {
        console.log('✅ Quest Completed Popup: Close button clicked');

        // Destroy all elements
        if (questCompletedModal && questCompletedModal.destroy) {
            questCompletedModal.destroy();
        }

        // Check for pending new quest (from chain)
        if (typeof pendingNewQuest !== 'undefined' && pendingNewQuest) {
            const quest = pendingNewQuest;
            pendingNewQuest = null;
            console.log(`🔗 Showing pending chain quest: ${quest.title}`);

            // Show enhanced preview
            showQuestPreviewModalEnhanced(quest.id,
                () => {
                    // Quest is already in active list (from completeQuest), just confirm
                    showDamageNumber(player.x, player.y - 40, "Quest Accepted!", 0x00ff00);
                    updateQuestTrackerHUD();
                },
                () => {
                    // If declined, remove from active list
                    const qIdx = playerStats.quests.active.findIndex(q => q.id === quest.id);
                    if (qIdx > -1) {
                        playerStats.quests.active.splice(qIdx, 1);
                        playerStats.quests.available.push(quest);
                        console.log(`Quest declined and moved to available: ${quest.title}`);
                    }
                }
            );
        } else {
            // Check queue again
            setTimeout(() => {
                if (typeof processDialogQueue === 'function') {
                    processDialogQueue();
                }
            }, 100);
        }
    };

    closeBtnBg.on('pointerdown', handleClose);
    closeBtnText.setInteractive({ useHandCursor: true }).on('pointerdown', handleClose);

    // Hover effects
    closeBtnBg.on('pointerover', () => closeBtnBg.setFillStyle(0x555555));
    closeBtnBg.on('pointerout', () => closeBtnBg.setFillStyle(0x333333));

    // Store global reference
    window.questCompletedModal = {
        closeBtn: closeBtnBg,
        destroy: () => {
            elements.forEach(el => {
                if (el && el.destroy) el.destroy();
            });
            window.questCompletedModal = null;
            questCompletedModal = null;

            // Record closure time to prevent click-through
            if (game.scene.scenes[0]) {
                const s = game.scene.scenes[0];
                s.lastWindowCloseTime = s.time.now;
                console.log('🚫 Quest Completed Modal (Enhanced) closed at:', s.lastWindowCloseTime);
            }
        }
    };
    questCompletedModal = window.questCompletedModal;

    console.log('[Quest Debug] questCompletedModal (Enhanced) assigned with closeBtn');

    // Pulse animation
    scene.tweens.add({
        targets: elements,
        scale: { from: 0.8, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 300,
        ease: 'Back.out'
    });
}

/**
 * Enhanced Quest Preview Modal with Portrait and Details
 */
function showQuestPreviewModalEnhanced(questId, onAccept, onDecline) {
    console.log(`[Quest Debug] START showQuestPreviewModalEnhanced for ${questId}`);
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
        if (typeof hideQuestPreviewModal === 'function') {
            hideQuestPreviewModal();
        } else {
            // Fallback destroy
            if (questPreviewModal && questPreviewModal.destroy) questPreviewModal.destroy();
            questPreviewModal = null;
        }
    }

    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;

    // Adjusted dimensions for vertical layout
    const modalWidth = 600;
    const portraitHeight = 150;
    const padding = 20;
    const contentHeight = 350; // Text area
    const modalHeight = portraitHeight + contentHeight; // Total height ~500

    // Background overlay
    const overlay = scene.add.rectangle(centerX, centerY, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.70)
        .setScrollFactor(0).setDepth(2100).setInteractive();

    // Modal background
    const modalBg = scene.add.rectangle(centerX, centerY, modalWidth, modalHeight, 0x111111, 0.98)
        .setScrollFactor(0).setDepth(2101).setStrokeStyle(3, 0xffd700);

    const elements = [overlay, modalBg];

    // Top Y coordinate of the modal
    const modalTopY = centerY - modalHeight / 2;
    let currentY = modalTopY + padding;

    // --- Portrait Section (Top) ---
    // Lookup NPC using registry
    let npc = null;
    if (typeof npcRegistry !== 'undefined' && questDef.giver) {
        npc = npcRegistry[questDef.giver];
    }

    // Check if portrait exists
    if (npc && npc.portraitKey && scene.textures.exists(npc.portraitKey)) {
        // Portrait dimensions
        const targetWidth = modalWidth - 20; // 580
        const centerPortraitY = modalTopY + portraitHeight / 2 + 10;

        // Add container/background for portrait area
        const portraitBg = scene.add.rectangle(centerX, centerPortraitY, targetWidth, portraitHeight, 0x222222)
            .setScrollFactor(0).setDepth(2102);

        // Portrait Image
        const portrait = scene.add.image(centerX, centerPortraitY, npc.portraitKey)
            .setScrollFactor(0).setDepth(2102);

        // Scaling logic: "Cover" strategy
        // We want to fill width (580) always.
        const scaleX = targetWidth / portrait.width;
        portrait.setScale(scaleX);

        // Center the image vertically in the box
        portrait.setPosition(centerX, centerPortraitY);

        // MASKING
        const maskShape = scene.make.graphics();
        maskShape.fillStyle(0xffffff);
        // Fix: Mask must also be fixed to camera to match the image
        maskShape.setScrollFactor(0);

        // Draw mask at world coordinates (which map to screen because ScrollFactor is 0)
        maskShape.fillRect(centerX - targetWidth / 2, centerPortraitY - portraitHeight / 2, targetWidth, portraitHeight);

        const mask = maskShape.createGeometryMask();
        portrait.setMask(mask);

        // Ensure mask graphics is destroyed when closing
        elements.push(maskShape);

        // Add a frame around portrait (on top of image)
        const portraitFrame = scene.add.rectangle(centerX, centerPortraitY, targetWidth, portraitHeight, 0x000000, 0)
            .setScrollFactor(0).setDepth(2104).setStrokeStyle(2, 0x444444);

        elements.push(portraitBg, portrait, portraitFrame);

        // NPC Name Overlay on portrait (bottom left of the portrait box)
        const nameY = centerPortraitY + portraitHeight / 2 - 15;
        const nameBg = scene.add.rectangle(centerX, nameY, targetWidth, 30, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(2103);

        const npcName = scene.add.text(centerX, nameY, npc.name, {
            fontSize: '18px',
            fill: '#ffd700',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(2104).setOrigin(0.5);

        elements.push(nameBg, npcName);

        currentY += portraitHeight + 30;
    } else {
        // No portrait, just add a spacer
        currentY += 40;
    }

    // --- Text Content (Below Portrait) ---

    // Header "QUEST OFFER"
    const header = scene.add.text(centerX, currentY, 'QUEST OFFER', {
        fontSize: '24px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0.5, 0);
    elements.push(header);
    currentY += 35;

    // Quest title
    const questTitle = scene.add.text(centerX, currentY, questDef.title, {
        fontSize: '22px',
        fill: '#ffff00', // Yellow title
        fontStyle: 'bold',
        wordWrap: { width: modalWidth - 40 },
        align: 'center'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0.5, 0);
    elements.push(questTitle);
    currentY += questTitle.height + 15;

    // Quest description
    const questDesc = scene.add.text(centerX, currentY, questDef.description || "No description available.", {
        fontSize: '15px',
        fill: '#cccccc',
        wordWrap: { width: modalWidth - 60 },
        align: 'center'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0.5, 0);
    elements.push(questDesc);
    currentY += Math.max(60, questDesc.height + 20); // Minimum height spacing

    // Objectives section
    const objLabel = scene.add.text(centerX - (modalWidth / 2) + 40, currentY, 'Objectives:', {
        fontSize: '16px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0, 0);
    elements.push(objLabel);
    currentY += 25;

    if (questDef.objectives) {
        questDef.objectives.forEach(obj => {
            const objText = scene.add.text(centerX - (modalWidth / 2) + 50, currentY, `⏳ ${obj.label}: 0/${obj.target}`, {
                fontSize: '14px',
                fill: '#aaaaaa'
            }).setScrollFactor(0).setDepth(2103).setOrigin(0, 0);
            elements.push(objText);
            currentY += 20;
        });
    }

    // Rewards section
    currentY += 10;
    const rewardsLabel = scene.add.text(centerX - (modalWidth / 2) + 40, currentY, 'Rewards:', {
        fontSize: '16px',
        fill: '#ffd700', // Gold color
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2103).setOrigin(0, 0);
    elements.push(rewardsLabel);
    currentY += 25;

    if (questDef.rewards) {
        let rewardStr = "";
        if (questDef.rewards.xp) rewardStr += `+${questDef.rewards.xp} XP  `;
        if (questDef.rewards.gold) rewardStr += `+${questDef.rewards.gold} Gold`;

        const rewardText = scene.add.text(centerX - (modalWidth / 2) + 50, currentY, rewardStr, {
            fontSize: '15px',
            fill: '#00ff00'
        }).setScrollFactor(0).setDepth(2103).setOrigin(0, 0);
        elements.push(rewardText);
    }

    // Buttons (Bottom)
    const btnY = centerY + modalHeight / 2 - 40;

    // Accept button
    const acceptBtn = scene.add.rectangle(centerX - 80, btnY, 140, 40, 0x00aa00, 1)
        .setScrollFactor(0).setDepth(2103).setStrokeStyle(2, 0x00ff00).setInteractive({ useHandCursor: true });

    const acceptBtnText = scene.add.text(centerX - 80, btnY, 'Accept', {
        fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2104).setOrigin(0.5);

    elements.push(acceptBtn, acceptBtnText);

    // Decline button
    const declineBtn = scene.add.rectangle(centerX + 80, btnY, 140, 40, 0x666666, 1)
        .setScrollFactor(0).setDepth(2103).setStrokeStyle(2, 0xaaaaaa).setInteractive({ useHandCursor: true });

    const declineBtnText = scene.add.text(centerX + 80, btnY, 'Decline', {
        fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(2104).setOrigin(0.5);

    elements.push(declineBtn, declineBtnText);

    // Handlers
    const acceptHandler = () => {
        elements.forEach(e => e.destroy());
        questPreviewModal = null;

        // Record closure time
        if (game.scene.scenes[0]) {
            game.scene.scenes[0].lastWindowCloseTime = game.scene.scenes[0].time.now;
        }

        if (onAccept) onAccept();
    };

    const declineHandler = () => {
        elements.forEach(e => e.destroy());
        questPreviewModal = null;

        // Record closure time
        if (game.scene.scenes[0]) {
            game.scene.scenes[0].lastWindowCloseTime = game.scene.scenes[0].time.now;
        }

        if (onDecline) onDecline();
    };

    // Events
    acceptBtn.on('pointerover', () => acceptBtn.setFillStyle(0x00cc00));
    acceptBtn.on('pointerout', () => acceptBtn.setFillStyle(0x00aa00));
    acceptBtn.on('pointerdown', acceptHandler);

    declineBtn.on('pointerover', () => declineBtn.setFillStyle(0x888888));
    declineBtn.on('pointerout', () => declineBtn.setFillStyle(0x666666));
    declineBtn.on('pointerdown', declineHandler);

    // Store global reference for destroy and controller access
    window.questPreviewModal = {
        acceptBtn: acceptBtn,
        declineBtn: declineBtn,
        destroy: () => {
            elements.forEach(e => e.destroy());

            // Record closure time
            if (game.scene.scenes[0]) {
                game.scene.scenes[0].lastWindowCloseTime = game.scene.scenes[0].time.now;
            }

            window.questPreviewModal = null;
            questPreviewModal = null;
        }
    };
    questPreviewModal = window.questPreviewModal;

    console.log('[Quest Debug] questPreviewModal assigned with buttons:', {
        acceptBtn: !!acceptBtn,
        declineBtn: !!declineBtn
    });

    // Animation
    scene.tweens.add({
        targets: elements,
        scale: { from: 0.95, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 200,
        ease: 'Back.out'
    });
}

/**
 * Spawn a Mana Flux node
 */
function spawnManaFlux(x, y) {
    if (!x || !y) {
        // Random position near player if not specified
        const radius = 300;
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * (radius - 100);
        x = player.x + Math.cos(angle) * dist;
        y = player.y + Math.sin(angle) * dist;

        // Keep within world bounds (simple check)
        if (x < 50) x = 50;
        if (y < 50) y = 50;
        if (x > 3150) x = 3150; // Approx world size
        if (y > 3150) y = 3150;
    }

    // Create visual representation - Pulsing Blue Star
    const star = game.scene.scenes[0].add.star(x, y, 5, 10, 20, 0x00ffff);
    star.setDepth(5); // Below player but above ground

    // Add physics
    game.scene.scenes[0].physics.add.existing(star);
    star.body.setImmovable(true);
    star.body.setAllowGravity(false); // Top down game, probably no gravity, but safety first

    // Add pulse animation
    game.scene.scenes[0].tweens.add({
        targets: star,
        scale: { from: 1, to: 1.3 },
        alpha: { from: 0.7, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1
    });

    const flux = {
        sprite: star,
        id: 'mana_flux_' + Date.now() + '_' + Math.random()
    };

    manaFluxes.push(flux);
    return flux;
}

/**
 * Update Mana Flux nodes (spawning and collection)
 */
function updateManaFluxNodes() {
    // Only active if quest main_01_007 is active
    if (typeof isQuestActive !== 'function' || !isQuestActive('main_01_007')) {
        // Cleanup if they exist but quest is not active
        if (manaFluxes.length > 0) {
            manaFluxes.forEach(flux => {
                if (flux.sprite) flux.sprite.destroy();
            });
            manaFluxes = [];
        }
        return;
    }

    // Maintain a count of flux nodes around the player
    const MAX_FLUX_NODES = 5;
    if (manaFluxes.length < MAX_FLUX_NODES) {
        // 2% chance per frame to spawn one if below cap
        if (Math.random() < 0.02) {
            spawnManaFlux();
        }
    }

    // Check collision with player
    for (let i = manaFluxes.length - 1; i >= 0; i--) {
        const flux = manaFluxes[i];

        if (!flux.sprite.active) {
            manaFluxes.splice(i, 1);
            continue;
        }

        // Simple distance check for collection
        const dist = Phaser.Math.Distance.Between(player.x, player.y, flux.sprite.x, flux.sprite.y);

        if (dist < 40) { // Collection radius
            // Collect!
            manaFluxes.splice(i, 1);
            flux.sprite.destroy();

            // Visual feedback
            showDamageNumber(player.x, player.y - 40, "+1 Stabilized Flux", 0x00ffff);
            playSound('item_pickup');

            // Send UQE Event
            if (window.uqe) {
                window.uqe.eventBus.emit('item_pickup', {
                    id: 'stabilized_flux',
                    type: 'quest_item',
                    amount: 1
                });
            }
        }
    }
}

// Defense Quest Wave Spawner State
// let defenseSpawnerState = { ... }; // Moved to top of file

/**
 * Update Defense Quest Spawner (for main_01_005 "Resonant Frequencies")
 */
function updateDefenseQuestSpawner(time) {
    const questActive = isQuestActive('main_01_005');

    // Cleanup when quest becomes inactive
    if (!questActive && defenseSpawnerState.active) {
        console.log('🛡️ Defense quest ended - cleaning up spawned monsters');
        defenseSpawnerState.spawnedMonsters.forEach(m => {
            if (m && m.active) {
                if (m.hpBarBg) m.hpBarBg.destroy();
                if (m.hpBar) m.hpBar.destroy();
                m.destroy();
            }
        });
        defenseSpawnerState.spawnedMonsters = [];
        defenseSpawnerState.active = false;
        return;
    }

    // Only run if quest is active
    if (!questActive) return;

    // Initialize if quest just became active
    if (!defenseSpawnerState.active) {
        console.log('🛡️ Defense quest started - initializing wave spawner');
        defenseSpawnerState.active = true;
        defenseSpawnerState.lastSpawnTime = time;
        defenseSpawnerState.spawnedMonsters = [];
    }

    // Clean up dead monsters from our tracking
    defenseSpawnerState.spawnedMonsters = defenseSpawnerState.spawnedMonsters.filter(m => m && m.active && !m.isDead);

    // Check if it's time to spawn a new wave
    const activeCount = defenseSpawnerState.spawnedMonsters.length;
    const timeSinceLastSpawn = time - defenseSpawnerState.lastSpawnTime;

    if (timeSinceLastSpawn >= defenseSpawnerState.waveInterval && activeCount < defenseSpawnerState.maxMonsters) {
        // Spawn a wave!
        const toSpawn = Math.min(
            defenseSpawnerState.monstersPerWave,
            defenseSpawnerState.maxMonsters - activeCount
        );

        console.log(`🛡️ Spawning defense wave: ${toSpawn} Echo Mites`);

        // Echo Mite type for defense quest
        const miteType = {
            id: 'mite',
            name: 'Echo Mite',
            hp: 15,
            attack: 3,
            speed: 60,
            xp: 8,
            textureKey: 'monster_mite',
            isProcedural: false
        };

        for (let i = 0; i < toSpawn; i++) {
            // Spawn around the player at random angles
            const angle = Math.random() * Math.PI * 2;
            const dist = 150 + Math.random() * 100; // 150-250 pixels away
            const spawnX = player.x + Math.cos(angle) * dist;
            const spawnY = player.y + Math.sin(angle) * dist;

            const monster = spawnMonster(spawnX, spawnY, miteType);
            if (monster) {
                defenseSpawnerState.spawnedMonsters.push(monster);
            }
        }

        defenseSpawnerState.lastSpawnTime = time;
    }
}

// ========================================
// QUEST MARKER SYSTEM
// ========================================

/**
 * Create a bobbing quest marker above a target
 * @param {string} targetId - ID of the target (NPC name, location, etc.)
 * @param {Phaser.GameObjects.Sprite|Object} target - The target object with x,y coordinates
 * @param {string} type - 'talk', 'enter', 'turnin'
 */
function createQuestMarker(targetId, target, type = 'talk') {
    const scene = game.scene.scenes[0];
    if (!scene || !target) return;

    // Don't create duplicate markers
    if (questMarkers.has(targetId)) return;

    // Create arrow marker using graphics
    const markerGraphics = scene.add.graphics();

    // Choose color based on type
    let color = 0xffff00; // Yellow for talk
    if (type === 'enter') color = 0x00aaff; // Blue for locations
    if (type === 'turnin') color = 0x00ff00; // Green for turn-in

    // Draw downward arrow
    markerGraphics.fillStyle(color, 1);
    markerGraphics.beginPath();
    markerGraphics.moveTo(0, 0);      // Top point
    markerGraphics.lineTo(-8, -15);   // Left
    markerGraphics.lineTo(-3, -15);   // Inner left
    markerGraphics.lineTo(-3, -25);   // Top left
    markerGraphics.lineTo(3, -25);    // Top right
    markerGraphics.lineTo(3, -15);    // Inner right
    markerGraphics.lineTo(8, -15);    // Right
    markerGraphics.closePath();
    markerGraphics.fillPath();

    // Add outline
    markerGraphics.lineStyle(2, 0x000000, 1);
    markerGraphics.strokePath();

    // Position above target
    const offsetY = -40; // Above the sprite
    markerGraphics.setPosition(target.x, target.y + offsetY);
    markerGraphics.setDepth(500); // Above everything
    markerGraphics.setScrollFactor(1); // Move with camera

    // Add bobbing animation
    const tween = scene.tweens.add({
        targets: markerGraphics,
        y: target.y + offsetY - 10,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // Store marker data
    questMarkers.set(targetId, {
        sprite: markerGraphics,
        tween: tween,
        target: target,
        type: type
    });

    console.log(`📍 Created quest marker for: ${targetId} (${type})`);
}

/**
 * Remove a quest marker
 * @param {string} targetId - ID of the target
 */
function removeQuestMarker(targetId) {
    const marker = questMarkers.get(targetId);
    if (marker) {
        if (marker.tween) marker.tween.stop();
        if (marker.sprite) marker.sprite.destroy();
        questMarkers.delete(targetId);
        console.log(`📍 Removed quest marker for: ${targetId}`);
    }
}

/**
 * Remove all quest markers
 */
function clearAllQuestMarkers() {
    questMarkers.forEach((marker, id) => {
        if (marker.tween) marker.tween.stop();
        if (marker.sprite) marker.sprite.destroy();
    });
    questMarkers.clear();
}
window.clearAllQuestMarkers = clearAllQuestMarkers;

/**
 * Update quest markers - called from update loop (throttled)
 */
function updateQuestMarkers(time) {
    // Throttle updates to every 500ms
    if (time - lastQuestMarkerUpdate < 500) return;
    lastQuestMarkerUpdate = time;

    if (!window.uqe || !window.uqe.activeQuests) return;

    // Build set of currently needed markers
    const neededMarkers = new Map();

    window.uqe.activeQuests.forEach(quest => {
        quest.objectives.forEach(obj => {
            // Skip completed objectives
            if (obj.completed) return;

            if (obj.type === 'talk' && obj.npcId) {
                // Find the NPC
                const npc = npcs.find(n => n.npcName === obj.npcId || n.name === obj.npcId);
                if (npc) {
                    neededMarkers.set(obj.npcId, { target: npc, type: 'talk' });
                }
            } else if (obj.type === 'collect' && obj.itemId === 'dungeon_entry_token') {
                // Mark dungeon entrances (handled separately via transition markers)
                MapManager.transitionMarkers.forEach(tm => {
                    if (tm.targetMap === 'dungeon' && tm.marker) {
                        neededMarkers.set('dungeon_entrance', { target: tm.marker, type: 'enter' });
                    }
                });
            }
        });
    });

    // Remove markers that are no longer needed
    questMarkers.forEach((marker, id) => {
        if (!neededMarkers.has(id)) {
            removeQuestMarker(id);
        }
    });

    // Create markers that are needed but don't exist
    neededMarkers.forEach((data, id) => {
        if (!questMarkers.has(id)) {
            createQuestMarker(id, data.target, data.type);
        } else {
            // Update position for moving targets (NPCs)
            const marker = questMarkers.get(id);
            if (marker && marker.sprite && data.target) {
                marker.sprite.x = data.target.x;
                // Y is handled by tween, but update base
            }
        }
    });
}

// ========================================
// DEBUG QUEST COMMANDS
// ========================================
// Usage: Open browser console and type debugQuest.help()

// Debug tools moved to DebugUtils.js


// ============================================
// HOVER EFFECT UTILS
// ============================================
window.enableHoverEffect = function (gameObject, scene) {
    if (!gameObject || !scene) return;

    // Use Phaser 3.60+ FX (We are on 3.80)
    // This provides a pixel-perfect outline/glow around visible pixels

    // Store reference to the fx
    let glowFx = null;
    let pulseTween = null;

    gameObject.on('pointerover', () => {
        // Remove existing if any (safety)
        if (glowFx) {
            glowFx.destroy();
            glowFx = null;
        }

        // Apply Glow FX
        // Color: 0xffffff (White), Strength: 4, Quality: 0.1
        if (gameObject.postFX) {
            glowFx = gameObject.postFX.addGlow(0xffffff, 4, 0, false, 0.1, 10);

            // Pulse the glow strength
            pulseTween = scene.tweens.add({
                targets: glowFx,
                outerStrength: 6,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    });

    gameObject.on('pointerout', () => {
        if (pulseTween) {
            pulseTween.stop();
            pulseTween = null;
        }
        if (glowFx) {
            // Some objects might be destroyed, so check
            if (gameObject.postFX) gameObject.postFX.remove(glowFx);
            glowFx = null;
        }
    });

    // Cleanup
    gameObject.once('destroy', () => {
        if (pulseTween) pulseTween.stop();
        if (glowFx && gameObject.postFX) {
            gameObject.postFX.remove(glowFx);
        }
    });
};


