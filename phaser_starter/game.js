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
        active: [],      // Active quests
        completed: []    // Completed quest IDs
    },
    questStats: {        // Track quest progress
        monstersKilled: 0,
        itemsCollected: 0,
        goldEarned: 0,
        tilesTraveled: 0,
        survivalTime: 0
    },
    questChains: {}, // Track quest chain progress
    // Abilities system
    abilities: {
        heal: { lastUsed: 0 },
        fireball: { lastUsed: 0 },
        shield: { lastUsed: 0 }
    }
};

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

// System chat box
let systemChatBox = null;
let chatMessages = [];
const MAX_CHAT_MESSAGES = 50;

// Inventory UI
let inventoryVisible = false;
let inventoryKey;
let inventoryPanel = null;
let inventoryItems = []; // Array of item display objects
let inventoryTooltip = null;

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
    const entranceY = (mapHeight - 3) * tileSize; // Exit marker position
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
        market: 0xFFA500       // Orange
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
        // Inn: Upper left quadrant only
        { type: 'inn', x: 5, y: 5, width: 6, height: 5, color: buildingColors.inn, quadrant: 'upperLeft' },
        // Other buildings: Other 3 quadrants (upper right, lower left, lower right)
        { type: 'tavern', x: centerX + 6, y: 5, width: 5, height: 5, color: buildingColors.tavern, quadrant: 'other' },
        { type: 'blacksmith', x: 5, y: centerY + 4, width: 5, height: 4, color: buildingColors.blacksmith, quadrant: 'other' },
        { type: 'shop', x: centerX + 6, y: centerY + 4, width: 5, height: 4, color: buildingColors.shop, quadrant: 'other' },
        { type: 'market', x: centerX + 3, y: centerY - 6, width: 3, height: 3, color: buildingColors.market, quadrant: 'other' }
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
    validBuildings.forEach(building => {
        // Create building rectangle
        const buildingRect = scene.add.rectangle(
            building.x * tileSize + (building.width * tileSize) / 2,
            building.y * tileSize + (building.height * tileSize) / 2,
            building.width * tileSize,
            building.height * tileSize,
            building.color,
            0.9
        ).setDepth(1).setStrokeStyle(2, 0x000000);
        
        // Add building to collision list
        buildings.push({
            x: building.x * tileSize,
            y: building.y * tileSize,
            width: building.width * tileSize,
            height: building.height * tileSize,
            type: building.type,
            rect: buildingRect
        });
        
        // Add building label
        const label = scene.add.text(
            building.x * tileSize + (building.width * tileSize) / 2,
            building.y * tileSize + (building.height * tileSize) / 2,
            building.type.toUpperCase(),
            {
                fontSize: '10px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }
        ).setDepth(2).setOrigin(0.5, 0.5);
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
            if (Math.abs(houseY - centerY) <= 2 || Math.abs(houseX - centerX) <= 2) {
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
            
            buildings.push({
                x: houseX * tileSize,
                y: houseY * tileSize,
                width: houseW * tileSize,
                height: houseH * tileSize,
                type: 'house',
                rect: houseRect
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
        
        // Create entrance marker
        const entrance = scene.add.rectangle(x, y, tileSize * 2, tileSize * 2, 0x444444, 0.8)
            .setDepth(3).setStrokeStyle(3, 0x888888);
        
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
        if (npc && npc.active) npc.destroy();
    });
    npcs = [];
    
    // Clear buildings and transition markers
    buildings.forEach(b => {
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
                    if (playResult) {
                        playResult.then(() => {
                            console.log(`🎵 Started ${musicName} music successfully`);
                        }).catch(err => {
                            console.warn(`⚠️ Could not play ${musicName} music (may need user interaction):`, err);
                        });
                    } else {
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
    
    // Update camera bounds for new map
    const worldWidth = scene.mapWidth * scene.tileSize;
    const worldHeight = scene.mapHeight * scene.tileSize;
    scene.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
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
    
    // Simple seeded random function
    let seedValue = seed;
    const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
    };
    
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
        
        if (isCompleted) {
            // Generate new dungeon (boss was defeated, reset it)
            console.log(`🔄 Dungeon level ${level} was completed, generating new one...`);
            currentDungeon = generateDungeon(level, 40, 40);
            dungeonCache[dungeonKey] = currentDungeon;
        } else if (dungeonCache[dungeonKey] && dungeonCache[dungeonKey].seed) {
            // Regenerate from saved seed
            console.log(`📦 Regenerating dungeon level ${level} from seed ${dungeonCache[dungeonKey].seed}...`);
            currentDungeon = generateDungeon(
                level,
                40, 40,
                dungeonCache[dungeonKey].seed
            );
            dungeonCache[dungeonKey] = currentDungeon;
        } else {
            // Generate new dungeon
            console.log(`🆕 Generating new dungeon level ${level}...`);
            currentDungeon = generateDungeon(level, 40, 40);
            if (!currentDungeon) {
                console.error('❌ generateDungeon returned null');
                return;
            }
            dungeonCache[dungeonKey] = currentDungeon;
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
    if (!metadata || !metadata.tileset_data || !metadata.tileset_data.tiles) {
        return;
    }
    
    const tiles = metadata.tileset_data.tiles;
    const sourceTexture = this.textures.get(tilesetKey);
    
    tiles.forEach(tile => {
        const bbox = tile.bounding_box;
        const frameKey = `dungeon_${type}_${tile.id}`;
        
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
                        let transparentCount = 0;
                        
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            const avg = (r + g + b) / 3;
                            
                            // For walls: remove white/light pixels
                            // For floors: remove green pixels (bright green that shouldn't be there)
                            if (type === 'wall') {
                                // Make pixels transparent if they're very light (threshold 220 for faint patterns)
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
                    } else if (scene.textures.exists('dungeon_wall_tileset') && 
                               scene.textures.get('dungeon_wall_tileset').has(frameKey)) {
                        // Fallback: use frame from tileset
                        tile = scene.add.image(x * tileSize, y * tileSize, 'dungeon_wall_tileset', frameKey);
                        tile.setOrigin(0);
                        tile.setDisplaySize(tileSize, tileSize);
                    } else {
                        // Fallback: use crop method
                        tile = scene.add.image(x * tileSize, y * tileSize, 'dungeon_wall_tileset');
                        tile.setOrigin(0);
                        tile.setCrop(bbox.x, bbox.y, bbox.width, bbox.height);
                        tile.setDisplaySize(tileSize, tileSize);
                    }
                } catch (e) {
                    console.warn(`Failed to create wall tile at (${x}, ${y}):`, e);
                    // Fallback to solid color
                    tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x2a2a2a, 1.0)
                        .setOrigin(0);
                }
            } else {
                // Fallback to solid color if lookup failed
                tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x2a2a2a, 1.0)
                    .setOrigin(0);
            }
        } else {
            // Fallback: use dark colored rectangle (stone-like)
            tile = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x2a2a2a, 1.0)
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
                { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10 },
                { name: 'Orc', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20 },
                { name: 'Skeleton', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15 }
            ];
            
            const selectedType = Phaser.Utils.Array.GetRandom(dungeonMonsterTypes);
            const scaledHp = selectedType.hp + (dungeonLevel * 10);
            const scaledAttack = selectedType.attack + (dungeonLevel * 2);
            const scaledXp = selectedType.xp + (dungeonLevel * 5);
            
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
    
    // Use a specific monster type for boss (dragon is the most powerful, or use orc as fallback)
    // Try to use dragon texture if available, otherwise use orc
    let bossTexture = 'monster_dragon_south';
    let bossType = 'dragon';
    if (!scene.textures.exists(bossTexture)) {
        bossTexture = 'monster_orc_south';
        bossType = 'orc';
        if (!scene.textures.exists(bossTexture)) {
            // Ultimate fallback to generic monster texture
            bossTexture = 'monster';
            bossType = 'goblin';
        }
    }
    
    // Create boss with enhanced stats
    const boss = scene.physics.add.sprite(x, y, bossTexture);
    boss.setScale(1.5); // Bigger than normal monsters
    boss.isBoss = true;
    boss.monsterType = bossType; // Set monster type so animation system works correctly
    boss.hp = 100 + (level * 50);
    boss.maxHp = boss.hp;
    boss.attack = 15 + (level * 5);
    boss.defense = 10 + (level * 3);
    boss.speed = 80;
    boss.xpReward = 50 + (level * 25);
    boss.lastAttackTime = 0;
    boss.attackCooldown = 1500;
    boss.isDead = false;
    boss.facingDirection = 'south'; // Initialize direction
    boss.isMoving = false;
    boss.animationState = 'idle';
    
    // Boss visual indicator
    boss.setTint(0xff0000); // Red tint for boss
    
    monsters.push(boss);
    
    // Create HP bar for boss
    const hpBarBg = scene.add.rectangle(x, y - 25, 40, 4, 0x000000, 0.8).setDepth(15);
    const hpBar = scene.add.rectangle(x - 20, y - 25, 40, 2, 0xff0000).setDepth(16).setOrigin(0, 0.5);
    boss.hpBarBg = hpBarBg;
    boss.hpBar = hpBar;
    
    console.log(`👹 Boss spawned at level ${level}`);
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
    
    console.log(`💰 Boss dropped ${numItems} items (quality: ${quality})`);
}

/**
 * Create game objects (like pygame initialization)
 */
function create() {
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
            const wallMetadataText = this.cache.text.get('dungeon_wall_metadata');
            dungeonTilesets.wallMetadata = JSON.parse(wallMetadataText);
            
            // Create texture frames for wall tiles
            if (this.textures.exists('dungeon_wall_tileset')) {
                createTilesetFrames.call(this, 'dungeon_wall_tileset', dungeonTilesets.wallMetadata, 'wall');
                console.log('✅ Dungeon wall tileset image loaded and frames created');
            } else {
                console.warn('⚠️ Dungeon wall tileset image not found');
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
            if (playResult) {
                playResult.then(() => {
                    console.log('🎵 Started village music on game start successfully');
                }).catch(err => {
                    console.warn('⚠️ Could not play music on start (may need user interaction):', err);
                });
            } else {
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
    
    // Initialize NPCs in town
    initializeNPCs();
    
    // Create UI bars (HP, Mana, Stamina, XP)
    const barWidth = 200;
    const barHeight = 20;
    const barSpacing = 25;
    const barX = 20;
    let barY = 20;
    
    // HP Bar
    hpBarBg = this.add.rectangle(barX + barWidth/2, barY, barWidth, barHeight, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
    hpBar = this.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0xff0000)
        .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);
    
    // Mana Bar
    barY += barSpacing;
    manaBarBg = this.add.rectangle(barX + barWidth/2, barY, barWidth, barHeight, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
    manaBar = this.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0x0000ff)
        .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);
    
    // Stamina Bar
    barY += barSpacing;
    staminaBarBg = this.add.rectangle(barX + barWidth/2, barY, barWidth, barHeight, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
    staminaBar = this.add.rectangle(barX + 2, barY, barWidth - 4, barHeight - 4, 0x00ff00)
        .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);
    
    // XP Bar
    barY += barSpacing;
    xpBarBg = this.add.rectangle(barX + barWidth/2, barY, barWidth, barHeight, 0x000000, 0.7)
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
    
    // Camera follows player - set bounds to allow camera to show full map
    // Camera can scroll to show the entire map, including edges
    const worldWidth = this.mapWidth * this.tileSize;
    const worldHeight = this.mapHeight * this.tileSize;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
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
    
    // Set up mouse wheel event listener for shop scrolling
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (shopVisible && shopPanel && shopPanel.maxScrollY > 0) {
            const scrollSpeed = 90; // One item height
            const oldScroll = shopPanel.scrollY;
            shopPanel.scrollY += deltaY > 0 ? scrollSpeed : -scrollSpeed;
            shopPanel.scrollY = Math.max(0, Math.min(shopPanel.scrollY, shopPanel.maxScrollY));
            if (oldScroll !== shopPanel.scrollY) {
                updateShopItems();
                updateShopInventoryItems(); // Re-render inventory items after scrolling
            }
        }
    });
    
    console.log('Game created');
}

/**
 * Update loop (like pygame game loop)
 */
function update(time, delta) {
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
    // Don't allow movement when shop/inventory/dialog/settings is open
    player.setVelocity(0);
    
    if (shopVisible || inventoryVisible || dialogVisible || settingsVisible) {
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
    
    // Check building collisions (only in town) - allow sliding along walls
    if (currentMap === 'town' && buildings.length > 0) {
        const playerSize = 16; // Half of 32
        const deltaTime = delta / 1000;
        
        // Check collisions separately for X and Y to allow sliding
        let canMoveX = true;
        let canMoveY = true;
        
        // Test X movement (keep Y fixed at current position)
        if (player.body.velocity.x !== 0) {
            const testX = player.x + player.body.velocity.x * deltaTime;
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
        if (player.body.velocity.y !== 0) {
            const testX = player.x; // Use current X position
            const testY = player.y + player.body.velocity.y * deltaTime;
            
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
        
        // Apply movement restrictions - only block the axis that collides
        if (!canMoveX) {
            player.setVelocityX(0);
        }
        if (!canMoveY) {
            player.setVelocityY(0);
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
    } else {
        // Ensure tooltip is hidden when inventory is closed
        hideItemTooltip();
    }
    
    // Update equipment if visible
    if (equipmentVisible) {
        updateEquipment();
    }
    
    // Toggle quest log (Q key)
    if (Phaser.Input.Keyboard.JustDown(questKey)) {
        toggleQuestLog();
    }
    
    // Toggle settings (ESC key)
    if (settingsKey && Phaser.Input.Keyboard.JustDown(settingsKey)) {
        toggleSettings();
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
            
            // If not near a marker, check NPC interaction
            if (!nearMarker) {
                checkNPCInteraction();
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
        }
    }
    scene.lastPlayerTileX = currentTileX;
    scene.lastPlayerTileY = currentTileY;
    
    // Track survival time
    playerStats.questStats.survivalTime += delta;
    
    // Check quest progress
    checkQuestProgress();
    
    // Monster respawn system - only in wilderness
    if (currentMap === 'wilderness' && monsters.length < MONSTER_RESPAWN_THRESHOLD) {
        const scene = game.scene.scenes[0];
        const mapWidth = scene.mapWidth * scene.tileSize;
        const mapHeight = scene.mapHeight * scene.tileSize;
        const monstersNeeded = MAX_MONSTERS - monsters.length;
        
        const monsterTypes = [
            { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10 },
            { name: 'Orc', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20 },
            { name: 'Skeleton', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15 },
            { name: 'Spider', textureKey: 'monster_spider', hp: 20, attack: 4, speed: 70, xp: 8 },
            { name: 'Slime', textureKey: 'monster_slime', hp: 15, attack: 3, speed: 30, xp: 5 },
            { name: 'Wolf', textureKey: 'monster_wolf', hp: 40, attack: 7, speed: 65, xp: 18 },
            { name: 'Dragon', textureKey: 'monster_dragon', hp: 80, attack: 12, speed: 35, xp: 40 },
            { name: 'Ghost', textureKey: 'monster_ghost', hp: 35, attack: 6, speed: 55, xp: 12 }
        ];
        
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
        updateMonsterAnimation(monster, delta);
        
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
                    monster.setVelocityX(0);
                }
                if (wouldCollideY) {
                    monster.setVelocityY(0);
                }
            }
        } else {
            monster.setVelocity(0);
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
            monster.isDead = true;
            
            // Check if this was a boss in a dungeon
            if (monster.isBoss && currentMap === 'dungeon') {
                onBossDefeated(dungeonLevel, monster.x, monster.y);
            }
            
            // Destroy HP bars
            if (monster.hpBarBg) monster.hpBarBg.destroy();
            if (monster.hpBar) monster.hpBar.destroy();
            
            // Play death animation
            playMonsterDeathAnimation(monster);
            
            // Create death particle effects
            createDeathEffects(monster.x, monster.y);
            
            // Death animation - fade out and rotate (enhanced)
            this.tweens.add({
                targets: monster,
                alpha: 0,
                angle: 360,
                scale: 0,
                duration: 500, // Slightly longer for better effect
                ease: 'Power2'
            });
            
            // Give XP (based on monster type)
            const xpGain = monster.xpReward || 10;
            playerStats.xp += xpGain;
            showDamageNumber(monster.x, monster.y, `+${xpGain} XP`, 0xffd700, false, 'xp'); // Gold color for XP
            addChatMessage(`Gained ${xpGain} XP`, 0xffd700, '✨');
            
            // Track quest progress - monster killed
            playerStats.questStats.monstersKilled++;
            
            // Add chat message for monster death
            const monsterName = monster.monsterType || 'Monster';
            addChatMessage(`${monsterName} defeated`, 0xff6b6b, '💀');
            
            // Check level up
            checkLevelUp();
            
            // Drop items when monster dies
            dropItemsFromMonster(monster.x, monster.y);
            
            // Play death sound
            playSound('monster_die');
            
            // Remove monster after animation completes
            this.time.delayedCall(300, () => {
                if (monster && monster.active) {
                    monster.destroy();
                    const index = monsters.indexOf(monster);
                    if (index !== -1) {
                        monsters.splice(index, 1);
                    }
                }
            });
        }
    });
    
    // Items are now manually picked up with Spacebar (handled above)
    // No automatic pickup - player must press Spacebar when near items
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
    
    // Create weapon swing trail
    const facingDirection = player.facingDirection || 'south';
    createWeaponSwingTrail(player.x, player.y, facingDirection, weaponQuality);
    
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
        addChatMessage(damageText, isCritical ? 0xff0000 : 0xffff00, '⚔️');
        playSound('hit_monster');
        
        // Enhanced visual feedback - flash monster with color
        const flashColor = isCritical ? 0xff6666 : 0xffffff; // Red tint for critical
        closestMonster.setTint(flashColor);
        scene.time.delayedCall(100, () => {
            if (closestMonster && closestMonster.active) {
                closestMonster.clearTint();
            }
        });
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
    
    // Calculate damage
    const baseDamage = monster.attack;
    const defense = playerStats.defense;
    const actualDamage = Math.max(1, baseDamage - Math.floor(defense / 2));
    
    // Apply damage to player
    playerStats.hp -= actualDamage;
    playerStats.hp = Math.max(0, playerStats.hp);
    
    // Create hit effects on player (red particles - physical damage)
    createHitEffects(player.x, player.y, false, 'physical');
    
    // Light screen shake when player takes damage
    shakeCamera(150, 0.008);
    
        // Show damage number
        showDamageNumber(player.x, player.y - 20, `-${actualDamage}`, 0xff0000, false, 'physical');
        addChatMessage(`Took ${actualDamage} damage`, 0xff6b6b, '🛡️');
        
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
    
    switch(direction) {
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
    const bg = scene.add.rectangle(chatX + chatWidth/2, chatY + chatHeight/2, chatWidth, chatHeight, 0x000000, 0.85)
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
    }
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
        const defense = quality === 'Common' ? Phaser.Math.Between(3, 6) : Phaser.Math.Between(6, 10);
        return {
            type: 'armor',
            name: `${quality} Armor`,
            quality: quality,
            defense: defense
        };
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
        const defense = quality === 'Common' ? Phaser.Math.Between(1, 3) : Phaser.Math.Between(3, 5);
        return {
            type: 'boots',
            name: `${quality} Boots`,
            quality: quality,
            defense: defense,
            speed: quality === 'Common' ? 5 : 10 // Boots give speed bonus
        };
    }
    else if (rand < 0.90) {
        // 8% - Helmet
        const qualities = ['Common', 'Uncommon'];
        const quality = Phaser.Math.RND.pick(qualities);
        const defense = quality === 'Common' ? Phaser.Math.Between(2, 4) : Phaser.Math.Between(4, 7);
        return {
            type: 'helmet',
            name: `${quality} Helmet`,
            quality: quality,
            defense: defense
        };
    }
    else if (rand < 0.95) {
        // 5% - Weapon
        const qualities = ['Common', 'Uncommon', 'Rare'];
        const quality = Phaser.Math.RND.pick(qualities);
        const attackPower = quality === 'Common' ? Phaser.Math.Between(5, 10) :
                           quality === 'Uncommon' ? Phaser.Math.Between(10, 15) :
                           Phaser.Math.Between(15, 20);
        return {
            type: 'weapon',
            name: `${quality} Sword`,
            quality: quality,
            attackPower: attackPower
        };
    }
    else if (rand < 0.98) {
        // 3% - Belt
        const qualities = ['Common', 'Uncommon'];
        const quality = Phaser.Math.RND.pick(qualities);
        const defense = quality === 'Common' ? Phaser.Math.Between(2, 4) : Phaser.Math.Between(4, 6);
        const maxHp = quality === 'Common' ? 10 : 15;
        return {
            type: 'belt',
            name: `${quality} Belt`,
            quality: quality,
            defense: defense,
            maxHp: maxHp
        };
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
        const defenseBonus = quality === 'Common' ? Phaser.Math.Between(2, 4) :
                            quality === 'Uncommon' ? Phaser.Math.Between(4, 6) :
                            Phaser.Math.Between(6, 10);
        return {
            type: 'amulet',
            name: `${quality} Amulet`,
            quality: quality,
            defense: defenseBonus,
            maxHp: quality === 'Common' ? 10 : quality === 'Uncommon' ? 20 : 30 // Amulets boost HP
        };
    }
}

/**
 * Generate random item of specific type and quality
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
    
    switch(itemType) {
        case 'weapon':
            const weaponPower = 5 + (qLevel * 5) + Phaser.Math.Between(0, 5);
            return {
                type: 'weapon',
                name: `${quality} Sword`,
                quality: quality,
                attackPower: weaponPower
            };
        case 'armor':
            const armorDefense = 3 + (qLevel * 3) + Phaser.Math.Between(0, 3);
            return {
                type: 'armor',
                name: `${quality} Armor`,
                quality: quality,
                defense: armorDefense
            };
        case 'helmet':
            const helmetDefense = 2 + (qLevel * 2) + Phaser.Math.Between(0, 2);
            return {
                type: 'helmet',
                name: `${quality} Helmet`,
                quality: quality,
                defense: helmetDefense
            };
        case 'ring':
            const ringAttack = 1 + (qLevel * 2) + Phaser.Math.Between(0, 2);
            return {
                type: 'ring',
                name: `${quality} Ring`,
                quality: quality,
                attackPower: ringAttack,
                defense: Math.floor(ringAttack / 2)
            };
        case 'amulet':
            const amuletDefense = 2 + (qLevel * 2) + Phaser.Math.Between(0, 2);
            const amuletHp = 10 + (qLevel * 10);
            return {
                type: 'amulet',
                name: `${quality} Amulet`,
                quality: quality,
                defense: amuletDefense,
                maxHp: amuletHp
            };
        default:
            return generateRandomItem(); // Fallback
    }
}

/**
 * Drop items from a killed monster
 */
function dropItemsFromMonster(x, y) {
    const scene = game.scene.scenes[0];
    
    // 70% chance to drop something
    if (Math.random() < 0.7) {
        const item = generateRandomItem();
        
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
    } else {
        // Add item to inventory
        playerStats.inventory.push(item);
        playerStats.questStats.itemsCollected++;
        showDamageNumber(item.sprite.x, item.sprite.y, `Picked up ${item.name}`, 0x00ff00);
        playSound('item_pickup');
        console.log(`Picked up: ${item.name} (Inventory: ${playerStats.inventory.length} items)`);
        
        // Refresh inventory UI if open
        refreshInventory();
    }
    
    // Remove item from ground
    if (item.sprite && item.sprite.active) {
        item.sprite.destroy();
    }
    items.splice(index, 1);
}

/**
 * Toggle inventory visibility
 */
function toggleInventory() {
    const scene = game.scene.scenes[0];
    inventoryVisible = !inventoryVisible;
    
    if (inventoryVisible) {
        createInventoryUI();
    } else {
        destroyInventoryUI();
    }
}

/**
 * Create inventory UI panel
 */
function createInventoryUI() {
    const scene = game.scene.scenes[0];
    
    // Create background panel (centered on screen)
    // Width calculated for 6 columns: 6 slots (60px) + 5 spacings (10px) + padding = ~450px, using 550px for comfortable spacing
    const panelWidth = 550;
    const panelHeight = 400;
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;
    
    // Background
    inventoryPanel = {
        bg: scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xffffff),
        title: scene.add.text(centerX, centerY - panelHeight/2 + 20, 'INVENTORY', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0),
        closeText: scene.add.text(centerX + panelWidth/2 - 20, centerY - panelHeight/2 + 20, 'Press I to Close', {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(301).setOrigin(1, 0),
        items: []
    };
    
    // Show items
    updateInventoryItems();
}

/**
 * Update inventory items display
 */
function updateInventoryItems() {
    const scene = game.scene.scenes[0];
    if (!inventoryPanel) return;
    
    // Always hide tooltip when refreshing inventory items
    hideItemTooltip();
    
        // Clear existing item displays and remove event listeners
        inventoryPanel.items.forEach(item => {
            if (item.sprite && item.sprite.active) {
                // Remove event listeners before destroying
                if (item.sprite._tooltipHandlers) {
                    item.sprite.off('pointerover', item.sprite._tooltipHandlers.onPointerOver);
                    item.sprite.off('pointerout', item.sprite._tooltipHandlers.onPointerOut);
                    item.sprite._tooltipHandlers = null;
                }
                item.sprite.destroy();
            }
            if (item.text && item.text.active) item.text.destroy();
            if (item.borderRect && item.borderRect.active) item.borderRect.destroy();
        });
    inventoryPanel.items = [];
    
    // Ensure tooltip is cleared after destroying items
    hideItemTooltip();
    
    const slotSize = 60;
    const slotsPerRow = 6;
    const spacing = 10;
    const panelWidth = inventoryPanel.bg.width;
    const panelHeight = inventoryPanel.bg.height;
    const panelCenterX = inventoryPanel.bg.x;
    const panelCenterY = inventoryPanel.bg.y;
    
    // Calculate grid start position (centered in panel)
    const gridWidth = slotsPerRow * slotSize + (slotsPerRow - 1) * spacing;
    const startX = panelCenterX - gridWidth / 2 + slotSize / 2;
    const startY = panelCenterY - panelHeight / 2 + 80;
    
    // Display items
    playerStats.inventory.forEach((item, index) => {
        const row = Math.floor(index / slotsPerRow);
        const col = index % slotsPerRow;
        const x = startX + col * (slotSize + spacing);
        const y = startY + row * (slotSize + spacing);
        
        // Get item sprite key
        let spriteKey = 'item_weapon';
        if (item.type === 'weapon') spriteKey = 'item_weapon';
        else if (item.type === 'armor') spriteKey = 'item_armor';
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
        const itemText = scene.add.text(x, y + slotSize/2 + 5, item.name, {
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
            // Hide any existing tooltip first
            hideItemTooltip();
            // Show new tooltip (now includes action hints)
            showItemTooltip(item, x, y);
        };
        
        const onPointerOut = () => {
            hideItemTooltip();
        };
        
        itemSprite.on('pointerover', onPointerOver);
        itemSprite.on('pointerout', onPointerOut);
        
        // Store cleanup handlers
        itemSprite._tooltipHandlers = { onPointerOver, onPointerOut };
        
        // Click to equip (only for equippable items)
        const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
        if (equippableTypes.includes(item.type)) {
            itemSprite.on('pointerdown', () => {
                equipItemFromInventory(item, index);
                hideItemTooltip(); // Hide tooltip after equipping
            });
        }
        // Click to use consumables
        else if (item.type === 'consumable' && item.healAmount) {
            itemSprite.on('pointerdown', () => {
                useConsumable(item, index);
                hideItemTooltip(); // Hide tooltip after using
            });
        }
        
        inventoryPanel.items.push({
            sprite: itemSprite,
            text: itemText,
            borderRect: borderRect,
            item: item
        });
    });
    
    // Show empty message if no items
    if (playerStats.inventory.length === 0) {
        const emptyText = scene.add.text(
            panelCenterX,
            panelCenterY,
            'Inventory is empty\nKill monsters to collect items!',
            {
                fontSize: '18px',
                fill: '#888888',
                align: 'center'
            }
        ).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);
        inventoryPanel.items.push({ text: emptyText });
    }
}

/**
 * Show item tooltip
 */
function showItemTooltip(item, x, y) {
    const scene = game.scene.scenes[0];
    
    // Only show tooltips when inventory is visible
    if (!inventoryVisible || !inventoryPanel) {
        return;
    }
    
    // Always hide any existing tooltip first
    if (inventoryTooltip) {
        hideItemTooltip();
    }
    
    // Build tooltip text - always show basic info
    let tooltipLines = [];
    
    // Always add name if it exists
    if (item.name) {
        tooltipLines.push(item.name);
    } else {
        tooltipLines.push('Unknown Item');
    }
    
    // Always add quality if it exists
    if (item.quality) {
        tooltipLines.push(`Quality: ${item.quality}`);
    }
    
    // Always add type if it exists
    if (item.type) {
        tooltipLines.push(`Type: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`);
    }
    
    // Show relevant stats for each item type
    if (item.type === 'weapon') {
        if (item.attackPower) tooltipLines.push(`Attack: +${item.attackPower}`);
    } else if (item.type === 'armor') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
    } else if (item.type === 'helmet') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
    } else if (item.type === 'ring') {
        if (item.attackPower) tooltipLines.push(`Attack: +${item.attackPower}`);
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
    } else if (item.type === 'amulet') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
        if (item.maxHp) tooltipLines.push(`Max HP: +${item.maxHp}`);
    } else if (item.type === 'boots') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
        if (item.speed) tooltipLines.push(`Speed: +${item.speed}`);
    } else if (item.type === 'gloves') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
        if (item.attackPower) tooltipLines.push(`Attack: +${item.attackPower}`);
    } else if (item.type === 'belt') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
        if (item.maxHp) tooltipLines.push(`Max HP: +${item.maxHp}`);
    } else if (item.type === 'consumable') {
        if (item.healAmount) tooltipLines.push(`Heal: +${item.healAmount} HP`);
    }
    
    // Add action hint based on item type
    const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
    if (equippableTypes.includes(item.type)) {
        tooltipLines.push(''); // Empty line
        tooltipLines.push('Click to equip');
    } else if (item.type === 'consumable') {
        tooltipLines.push(''); // Empty line
        tooltipLines.push('Click to use');
    }
    
    const tooltipText = tooltipLines.join('\n');
    const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
    
    // Create tooltip text first to measure size
    const tooltip = scene.add.text(0, 0, tooltipText, {
        fontSize: '14px',
        fill: '#ffffff',
        wordWrap: { width: 180 },
        align: 'left'
    }).setScrollFactor(0).setDepth(311);
    
    // Get text bounds
    const textBounds = tooltip.getBounds();
    const padding = 10;
    const tooltipWidth = textBounds.width + padding * 2;
    const tooltipHeight = textBounds.height + padding * 2;
    
    // Position tooltip to the right of item, but keep on screen
    let tooltipX = x + 50;
    let tooltipY = y;
    
    // Adjust if tooltip would go off screen
    if (tooltipX + tooltipWidth > scene.cameras.main.width) {
        tooltipX = x - tooltipWidth - 10; // Show to the left instead
    }
    
    // Create tooltip background
    const tooltipBg = scene.add.rectangle(tooltipX + tooltipWidth/2, tooltipY, tooltipWidth, tooltipHeight, 0x000000, 0.95)
        .setScrollFactor(0).setDepth(310).setStrokeStyle(2, qualityColor);
    
    // Position text
    tooltip.x = tooltipX + padding;
    tooltip.y = tooltipY;
    tooltip.setOrigin(0, 0.5);
    
    inventoryTooltip = {
        bg: tooltipBg,
        text: tooltip
    };
}

/**
 * Hide item tooltip
 */
function hideItemTooltip() {
    if (inventoryTooltip) {
        try {
            if (inventoryTooltip.bg) {
                if (inventoryTooltip.bg.active) {
                    inventoryTooltip.bg.destroy();
                } else {
                    // Already destroyed, just clear reference
                }
            }
            if (inventoryTooltip.text) {
                if (inventoryTooltip.text.active) {
                    inventoryTooltip.text.destroy();
                } else {
                    // Already destroyed, just clear reference
                }
            }
        } catch (e) {
            // Ignore errors if already destroyed
            console.warn('Error destroying tooltip:', e);
        }
        inventoryTooltip = null;
    }
    
    // Also check for any orphaned tooltip text objects in the scene
    const scene = game.scene.scenes[0];
    if (scene) {
        // Find and destroy any text objects with tooltip-like content that shouldn't be on the map
        scene.children.list.forEach(child => {
            if (child.type === 'Text' && child.active && child.depth === 311) {
                const text = child.text || '';
                if (text.includes('Attack: +') || text.includes('Defense: +') || text.includes('Heal: +')) {
                    // This looks like an orphaned tooltip, destroy it
                    try {
                        child.destroy();
                    } catch (e) {
                        // Ignore
                    }
                }
            }
        });
    }
}

/**
 * Destroy inventory UI
 */
function destroyInventoryUI() {
    const scene = game.scene.scenes[0];
    
    // Always hide tooltip first when closing inventory
    hideItemTooltip();
    
    if (inventoryPanel) {
        if (inventoryPanel.bg && inventoryPanel.bg.active) inventoryPanel.bg.destroy();
        if (inventoryPanel.title && inventoryPanel.title.active) inventoryPanel.title.destroy();
        if (inventoryPanel.closeText && inventoryPanel.closeText.active) inventoryPanel.closeText.destroy();
        
        inventoryPanel.items.forEach(item => {
            if (item.sprite && item.sprite.active) {
                // Remove event listeners before destroying
                if (item.sprite._tooltipHandlers) {
                    item.sprite.off('pointerover', item.sprite._tooltipHandlers.onPointerOver);
                    item.sprite.off('pointerout', item.sprite._tooltipHandlers.onPointerOut);
                    item.sprite._tooltipHandlers = null;
                }
                item.sprite.destroy();
            }
            if (item.text && item.text.active) item.text.destroy();
        });
        
        inventoryPanel = null;
    }
    
    // Final cleanup - ensure tooltip is gone
    hideItemTooltip();
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
    if (inventoryVisible && inventoryPanel) {
        updateInventoryItems();
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
    
    // Add bonuses from all equipment
    Object.values(playerStats.equipment).forEach(item => {
        if (!item) return;
        
        // Attack bonuses (weapon, ring)
        if (item.attackPower) {
            playerStats.attack += item.attackPower;
        }
        
        // Defense bonuses (armor, helmet, ring, amulet, boots)
        if (item.defense) {
            playerStats.defense += item.defense;
        }
        
        // Max HP bonus (amulet)
        if (item.maxHp) {
            maxHpBonus += item.maxHp;
        }
        
        // Speed bonus (boots)
        if (item.speed) {
            speedBonus += item.speed;
        }
    });
    
    // Apply max HP bonus (increase max HP, but don't reduce current HP if it would go below 1)
    if (maxHpBonus > 0) {
        const oldMaxHp = playerStats.maxHp;
        playerStats.maxHp = 100 + maxHpBonus; // Base 100 + bonuses
        // If HP was at max, keep it at new max
        if (playerStats.hp >= oldMaxHp) {
            playerStats.hp = playerStats.maxHp;
        }
    }
    
    // Speed bonus is stored but not used yet (could affect movement speed)
    // playerStats.speedBonus = speedBonus;
    
    // Store speed bonus for attack speed calculation
    playerStats.speedBonus = speedBonus;
}

/**
 * Toggle equipment visibility
 */
function toggleEquipment() {
    const scene = game.scene.scenes[0];
    equipmentVisible = !equipmentVisible;
    
    if (equipmentVisible) {
        createEquipmentUI();
    } else {
        destroyEquipmentUI();
    }
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
        inventoryItems: []
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
    const startY = 120; // Start below title
    
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
    if (!equipmentPanel) return;
    
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
    
    // Show all inventory items (not just equippable ones)
    const inventoryItems = playerStats.inventory;
    
    if (inventoryItems.length === 0) {
        const rightPanelX = equipmentPanel.rightBg.x;
        const emptyText = scene.add.text(rightPanelX, 200, 'Inventory is empty', {
            fontSize: '16px',
            fill: '#888888',
            fontStyle: 'italic'
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);
        equipmentPanel.inventoryItems.push({ label: emptyText });
        return;
    }
    
    // Display items in a scrollable grid in right panel
    const rightPanelX = equipmentPanel.rightBg.x;
    const itemSize = 60;
    const spacing = 15;
    const itemsPerRow = 6;
    // Calculate grid width and center it in the right panel
    const gridWidth = itemsPerRow * itemSize + (itemsPerRow - 1) * spacing;
    const startX = rightPanelX - gridWidth / 2 + itemSize / 2; // Center in right panel
    const startY = 100; // Start below title
    
    // Define equippable types once for the function
    const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
    
    inventoryItems.forEach((item, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * (itemSize + spacing);
        const y = startY + row * (itemSize + spacing + 20); // Extra spacing for text
        
        // Get item sprite key based on type
        let spriteKey = 'item_weapon';
        if (item.type === 'weapon') spriteKey = 'item_weapon';
        else if (item.type === 'armor') spriteKey = 'item_armor';
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
        
        // Create item sprite with background
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
        const itemNameText = scene.add.text(x, y + itemSize/2 + 5, item.name, {
            fontSize: '11px',
            fill: '#ffffff',
            wordWrap: { width: itemSize + 10 }
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0);
        
        // Make clickable - equip if equippable, otherwise show tooltip
        const isEquippable = equippableTypes.includes(item.type);
        
        itemSprite.setInteractive({ useHandCursor: true });
        itemBg.setInteractive({ useHandCursor: true });
        
        const showTooltip = (pointer) => {
            if (pointer) pointer.event.stopPropagation();
            // Cancel any pending hide
            if (hideTooltipTimeout) {
                const scene = game.scene.scenes[0];
                if (scene && scene.time) {
                    scene.time.removeEvent(hideTooltipTimeout);
                    hideTooltipTimeout = null;
                }
            }
            showEquipmentTooltip(item, x, y, true);
        };
        const hideTooltip = () => {
            console.log('Item pointerout - scheduling hide');
            scheduleHideEquipmentTooltip(300); // Delay hide
        };
        const clickItem = (pointer) => {
            if (pointer) pointer.event.stopPropagation();
            if (isEquippable) {
                // Equip the item
                const invIndex = playerStats.inventory.indexOf(item);
                if (invIndex !== -1) {
                    equipItemFromInventory(item, invIndex);
                }
            } else {
                // Tooltip functionality removed
            }
        };
        
        itemSprite.on('pointerover', showTooltip);
        itemSprite.on('pointerout', hideTooltip);
        itemSprite.on('pointerdown', clickItem);
        itemBg.on('pointerover', showTooltip);
        itemBg.on('pointerout', hideTooltip);
        itemBg.on('pointerdown', clickItem);
        
        equipmentPanel.inventoryItems.push({
            bg: itemBg,
            sprite: itemSprite,
            nameText: itemNameText,
            borderRect: borderRect,
            item: item
        });
    });
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
    const label = scene.add.text(x, y - size/2 - 25, slotName.toUpperCase(), {
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
        if (item.type === 'weapon') spriteKey = 'item_weapon';
        else if (item.type === 'armor') spriteKey = 'item_armor';
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
        nameText = scene.add.text(x, y + size/2 + 3, item.name, {
            fontSize: '10px',
            fill: '#ffffff',
            wordWrap: { width: size + 20 }
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0);
        
        // Make slotBg interactive and add event handlers
        slotBg.setInteractive({ useHandCursor: true });
        // Tooltip functionality removed
        slotBg.on('pointerdown', () => unequipItem(slotName));
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
 * Show equipment tooltip - REMOVED
 */
function showEquipmentTooltip(item, x, y, isFromInventory = false) {
    // Tooltip functionality removed - no longer used
}

/**
 * Show tooltip for empty equipment slot - REMOVED
 */
function showEmptySlotTooltip(slotName, description, x, y) {
    // Tooltip functionality removed - no longer used
}

/**
 * Hide equipment tooltip - REMOVED
 */
function hideEquipmentTooltip() {
    // Tooltip functionality removed - no longer used
}

/**
 * Schedule tooltip hide - REMOVED
 */
function scheduleHideEquipmentTooltip(delay = 500) {
    // Tooltip functionality removed - no longer used
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
    
    // Always add type if it exists
    if (item.type) {
        tooltipLines.push(`Type: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`);
    }
    
    // Show relevant stats for each item type (same logic as showItemTooltip)
    if (item.type === 'weapon') {
        if (item.attackPower) tooltipLines.push(`Attack: +${item.attackPower}`);
    } else if (item.type === 'armor') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
    } else if (item.type === 'helmet') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
    } else if (item.type === 'ring') {
        if (item.attackPower) tooltipLines.push(`Attack: +${item.attackPower}`);
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
    } else if (item.type === 'amulet') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
        if (item.maxHp) tooltipLines.push(`Max HP: +${item.maxHp}`);
    } else if (item.type === 'boots') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
        if (item.speed) tooltipLines.push(`Speed: +${item.speed}`);
    } else if (item.type === 'gloves') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
        if (item.attackPower) tooltipLines.push(`Attack: +${item.attackPower}`);
    } else if (item.type === 'belt') {
        if (item.defense) tooltipLines.push(`Defense: +${item.defense}`);
        if (item.maxHp) tooltipLines.push(`Max HP: +${item.maxHp}`);
    } else if (item.type === 'consumable') {
        if (item.healAmount) tooltipLines.push(`Heal: +${item.healAmount} HP`);
    }
    
    // Add action hint based on context
    const equippableTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'boots', 'gloves', 'belt'];
    if (isFromInventory) {
        if (equippableTypes.includes(item.type)) {
            tooltipLines.push(''); // Empty line
            tooltipLines.push('Click to equip');
        } else if (item.type === 'consumable') {
            tooltipLines.push(''); // Empty line
            tooltipLines.push('Click to use');
        }
    } else {
        // From equipment slot - show unequip hint
        tooltipLines.push(''); // Empty line
        tooltipLines.push('Click to unequip');
    }
    
    // Filter out empty lines and ensure we have content
    const filteredLines = tooltipLines.filter(line => line && line.trim() !== '');
    
    if (filteredLines.length === 0) {
        console.warn('No tooltip lines for item:', item);
        filteredLines.push(item.name || 'Unknown Item');
        filteredLines.push('No additional information');
    }
    
    let tooltipText = filteredLines.join('\n');
    
    // Final safety check
    if (!tooltipText || tooltipText.trim() === '') {
        console.error('Still empty tooltip text after filtering! Item:', item);
        tooltipText = `${item.name || 'Unknown Item'}\nNo additional information`;
    }
    
    const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS['Common'];
    
    // Hide existing tooltip only if it's different from what we're about to show
    if (equipmentTooltip && equipmentTooltip.text) {
        const existingText = equipmentTooltip.text.text || '';
        if (existingText !== tooltipText) {
            console.log('Hiding existing tooltip - different content');
            // Tooltip removed
        } else {
            console.log('Tooltip already showing same content - not recreating');
            return; // Tooltip already showing, don't recreate
        }
    } else if (equipmentTooltip) {
        // Tooltip exists but has no text - destroy it
        // Tooltip removed
    }
    
    // COPY ENTIRE BODY OF showEmptySlotTooltip - exact same code, just different text
    // This eliminates any possibility of function call issues
    
    // Calculate position first, then create text DIRECTLY at final position
    // This avoids WebGL rendering issues with moved text objects
    const padding = 10;
    const estimatedWidth = 200; // Estimate for initial positioning
    let tooltipX = x + 60;
    let tooltipY = y;
    
    // Adjust if tooltip would go off screen (rough estimate)
    if (tooltipX + estimatedWidth > scene.cameras.main.width) {
        tooltipX = x - estimatedWidth - 10;
    }
    
    // Create text DIRECTLY at final position (not at 0,0 then moved)
    // This is critical for WebGL rendering
    const tooltip = scene.add.text(tooltipX + padding, tooltipY, tooltipText, {
        fontSize: '14px',
        fill: '#ffffff',
        color: '#ffffff',
        wordWrap: { width: 200 },
        align: 'left',
        fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(311).setOrigin(0, 0.5).setVisible(true).setAlpha(1.0);
    
    // Get actual bounds now that text is created
    const textBounds = tooltip.getBounds();
    const tooltipWidth = textBounds.width + padding * 2;
    const tooltipHeight = textBounds.height + padding * 2;
    
    // Recalculate position based on actual width
    tooltipX = x + 60;
    if (tooltipX + tooltipWidth > scene.cameras.main.width) {
        tooltipX = x - tooltipWidth - 10;
        tooltip.x = tooltipX + padding; // Update position if needed
    }
    
    const tooltipBg = scene.add.rectangle(tooltipX + tooltipWidth/2, tooltipY, tooltipWidth, tooltipHeight, 0x000000, 0.95)
        .setScrollFactor(0).setDepth(310).setStrokeStyle(2, qualityColor)
        .setInteractive();
    
    // Prevent tooltip from triggering pointerout on items underneath
    // AND cancel any pending hide when mouse enters tooltip
    tooltipBg.on('pointerover', (pointer) => {
        if (pointer) pointer.event.stopPropagation();
        // Cancel any pending hide - user is hovering over tooltip
        if (hideTooltipTimeout) {
            if (scene && scene.time) {
                scene.time.removeEvent(hideTooltipTimeout);
                hideTooltipTimeout = null;
                console.log('Cancelled hide - mouse over tooltip');
            }
        }
    });
    tooltipBg.on('pointerout', (pointer) => {
        if (pointer) pointer.event.stopPropagation();
        // Schedule hide when mouse leaves tooltip
        scheduleHideEquipmentTooltip(300);
    });
    
    tooltip.setInteractive(); // Make text interactive too
    
    // Prevent text from triggering pointerout on items underneath
    // AND cancel any pending hide when mouse enters tooltip text
    tooltip.on('pointerover', (pointer) => {
        if (pointer) pointer.event.stopPropagation();
        // Cancel any pending hide - user is hovering over tooltip
        if (hideTooltipTimeout) {
            if (scene && scene.time) {
                scene.time.removeEvent(hideTooltipTimeout);
                hideTooltipTimeout = null;
                console.log('Cancelled hide - mouse over tooltip text');
            }
        }
    });
    tooltip.on('pointerout', (pointer) => {
        if (pointer) pointer.event.stopPropagation();
        // Schedule hide when mouse leaves tooltip text
        scheduleHideEquipmentTooltip(300);
    });
    
    // Text has canvas, so it should render. renderable property might not exist on text objects.
    // Instead, ensure it's visible and on top of everything
    tooltip.setVisible(true);
    tooltip.setAlpha(1.0);
    tooltip.setDepth(311); // Ensure it's above background (310)
    
    // Bring to top of display list to ensure it renders
    scene.children.bringToTop(tooltip);
    
    // Force text to render - WebGL texture management fix
    // Text has canvas, so ensure style is applied and canvas is refreshed
    if (tooltip.style) {
        // Explicitly set fill multiple ways to ensure it sticks
        tooltip.style.fill = '#ffffff';
        tooltip.style.setFill('#ffffff');
        if (tooltip.style.update) {
            tooltip.style.update(false);
        }
    }
    tooltip.setColor('#ffffff');
    
    // Force text update to refresh the canvas
    if (tooltip.updateText) {
        tooltip.updateText();
    }
    
    // Try setting text again to force canvas refresh
    const currentText = tooltip.text;
    tooltip.setText(currentText);
    
    // Force scene to render this frame
    if (scene.sys && scene.sys.displayList) {
        scene.sys.displayList.queueDepthSort();
    }
    
    // Ensure text is in the scene's display list
    if (scene.children && !scene.children.list.includes(tooltip)) {
        scene.children.add(tooltip);
    }
    if (scene.children && !scene.children.list.includes(tooltipBg)) {
        scene.children.add(tooltipBg);
    }
    
    // DEBUG: Check text state immediately after creation
    console.log('After tooltip creation - text:', tooltip.text, 'fill:', tooltip.style ? tooltip.style.fill : 'no style', 
                'visible:', tooltip.visible, 'active:', tooltip.active, 'renderable:', tooltip.renderable,
                'x:', tooltip.x, 'y:', tooltip.y, 'width:', tooltip.width, 'height:', tooltip.height);
    
    // Check if text canvas is actually rendering
    if (tooltip.canvas) {
        console.log('Text has canvas - width:', tooltip.canvas.width, 'height:', tooltip.canvas.height);
    } else {
        console.warn('Text has NO canvas - this might be the rendering issue!');
    }
    
    // Check again after delay to see if something is changing it
    // Check at 600ms to see if it survives the hide delay (500ms)
    scene.time.delayedCall(600, () => {
        if (tooltip && tooltip.active && equipmentTooltip && equipmentTooltip.text === tooltip) {
            console.log('After 600ms - tooltip still active! text:', tooltip.text, 'fill:', tooltip.style ? tooltip.style.fill : 'no style',
                        'visible:', tooltip.visible, 'active:', tooltip.active);
        } else {
            console.log('After 600ms - tooltip was destroyed or inactive!');
        }
    });
    
    equipmentTooltip = {
        bg: tooltipBg,
        text: tooltip
    };
    
    // OLD CODE BELOW - commented out for testing
    /*
    if (equipmentTooltip) hideEquipmentTooltip();
    
    const tooltip = scene.add.text(0, 0, tooltipText, {
        fontSize: '14px',
        fill: '#ffffff',
        wordWrap: { width: 180 },
        align: 'left'
    }).setScrollFactor(0).setDepth(311);
    
    const textBounds = tooltip.getBounds();
    const padding = 10;
    const tooltipWidth = textBounds.width + padding * 2;
    const tooltipHeight = textBounds.height + padding * 2;
    
    let tooltipX = x + 50;
    let tooltipY = y;
    
    if (tooltipX + tooltipWidth > scene.cameras.main.width) {
        tooltipX = x - tooltipWidth - 10;
    }
    
    const tooltipBg = scene.add.rectangle(tooltipX + tooltipWidth/2, tooltipY, tooltipWidth, tooltipHeight, 0x000000, 0.95)
        .setScrollFactor(0).setDepth(310).setStrokeStyle(2, qualityColor);
    
    tooltip.x = tooltipX + padding;
    tooltip.y = tooltipY;
    tooltip.setOrigin(0, 0.5);
    
    equipmentTooltip = {
        bg: tooltipBg,
        text: tooltip
    };
    */
}

/**
 * Show tooltip for empty equipment slot
 */
function showEmptySlotTooltip(slotName, description, x, y) {
    // Tooltip functionality removed - no longer used
}

/**
 * Hide equipment tooltip - REMOVED
 */
function hideEquipmentTooltip() {
    // Tooltip functionality removed - no longer used
}

/**
 * Schedule tooltip hide - REMOVED
 */
function scheduleHideEquipmentTooltip(delay = 500) {
    // Tooltip functionality removed - no longer used
}

/**
 * Show empty slot tooltip - REMOVED
 */
function showEmptySlotTooltip(slotName, description, x, y) {
    // Tooltip functionality removed - no longer used
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
        
        equipmentPanel.slots = {};
        equipmentPanel.inventoryItems = [];
        equipmentPanel = null;
    }
    
    // Tooltip removed
}

// ============================================
// QUEST SYSTEM
// ============================================

/**
 * Initialize starting quests
 */
function initializeQuests() {
    // Create starter quests with variety
    const starterQuests = [
        {
            id: 'quest_001',
            title: 'First Steps',
            description: 'Kill 5 monsters to prove your worth.',
            type: 'kill',
            target: 5,
            progress: 0,
            rewards: { xp: 50, gold: 25 },
            chainId: 'beginner_chain',
            chainStep: 1
        },
        {
            id: 'quest_002',
            title: 'Treasure Hunter',
            description: 'Collect 3 items from defeated monsters.',
            type: 'collect',
            target: 3,
            progress: 0,
            rewards: { xp: 30, gold: 15 }
        },
        {
            id: 'quest_003',
            title: 'Rising Power',
            description: 'Reach level 2 to unlock new abilities.',
            type: 'level',
            target: 2,
            progress: playerStats.level,
            rewards: { xp: 100, gold: 50 },
            chainId: 'beginner_chain',
            chainStep: 2
        },
        {
            id: 'quest_004',
            title: 'Gold Rush',
            description: 'Earn 100 gold from monster drops.',
            type: 'gold',
            target: 100,
            progress: 0,
            rewards: { xp: 40, gold: 20 }
        },
        {
            id: 'quest_005',
            title: 'Explorer',
            description: 'Travel 500 tiles across the map.',
            type: 'explore',
            target: 500,
            progress: 0,
            rewards: { xp: 60, gold: 30 }
        },
        {
            id: 'quest_006',
            title: 'Survivor',
            description: 'Survive for 2 minutes without dying.',
            type: 'survive',
            target: 120, // seconds
            progress: 0,
            rewards: { xp: 80, gold: 40 }
        }
    ];
    
    // Initialize quest chain tracking
    if (!playerStats.questChains) {
        playerStats.questChains = {};
    }
    
    playerStats.quests.active = starterQuests;
    console.log('✅ Quests initialized:', starterQuests.length, 'active quests');
}

/**
 * Check quest progress and complete quests
 */
function checkQuestProgress() {
    playerStats.quests.active.forEach((quest, index) => {
        let updated = false;
        
        // Update progress based on quest type
        if (quest.type === 'kill') {
            quest.progress = playerStats.questStats.monstersKilled;
            updated = true;
        } else if (quest.type === 'collect') {
            quest.progress = playerStats.questStats.itemsCollected;
            updated = true;
        } else if (quest.type === 'level') {
            quest.progress = playerStats.level;
            updated = true;
        } else if (quest.type === 'gold') {
            quest.progress = playerStats.questStats.goldEarned;
            updated = true;
        } else if (quest.type === 'explore') {
            quest.progress = playerStats.questStats.tilesTraveled;
            updated = true;
        } else if (quest.type === 'survive') {
            quest.progress = Math.floor(playerStats.questStats.survivalTime / 1000); // Convert to seconds
            updated = true;
        }
        
        // Cap progress at target
        if (quest.progress > quest.target) {
            quest.progress = quest.target;
        }
        
        // Check if quest is complete
        if (quest.progress >= quest.target && !quest.completed) {
            completeQuest(quest, index);
        }
    });
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
            playerStats.quests.active.push(nextQuest);
            console.log(`New chain quest unlocked: ${nextQuest.title}`);
        }
    }
    
    // Move to completed
    playerStats.quests.completed.push(quest.id);
    playerStats.quests.active.splice(index, 1);
    
    // Check level up after XP reward
    checkLevelUp();
    
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
    const chainQuests = {
        'beginner_chain': {
            1: null, // Step 1 is "First Steps" - already in starter quests
            2: null, // Step 2 is "Rising Power" - already in starter quests
            3: {
                id: 'quest_chain_001',
                title: 'Advanced Training',
                description: 'Kill 15 monsters to advance your skills.',
                type: 'kill',
                target: 15,
                progress: playerStats.questStats.monstersKilled,
                rewards: { xp: 150, gold: 75 },
                chainId: 'beginner_chain',
                chainStep: 3
            },
            4: {
                id: 'quest_chain_002',
                title: 'Master Warrior',
                description: 'Reach level 5 and become a true warrior.',
                type: 'level',
                target: 5,
                progress: playerStats.level,
                rewards: { xp: 300, gold: 150 },
                chainId: 'beginner_chain',
                chainStep: 4
            }
        }
    };
    
    const chain = chainQuests[chainId];
    if (chain && chain[currentStep + 1]) {
        return chain[currentStep + 1]; // Return next step
    }
    return null;
}

/**
 * Toggle quest log visibility
 */
function toggleQuestLog() {
    const scene = game.scene.scenes[0];
    questVisible = !questVisible;
    
    if (questVisible) {
        createQuestLogUI();
    } else {
        destroyQuestLogUI();
    }
}

/**
 * Create quest log UI panel
 */
function createQuestLogUI() {
    const scene = game.scene.scenes[0];
    
    // Create background panel (centered on screen)
    const panelWidth = 600;
    const panelHeight = 500;
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;
    
    // Background
    questPanel = {
        bg: scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xffffff),
        title: scene.add.text(centerX, centerY - panelHeight/2 + 20, 'QUEST LOG', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0),
        closeText: scene.add.text(centerX + panelWidth/2 - 20, centerY - panelHeight/2 + 20, 'Press Q to Close', {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(301).setOrigin(1, 0),
        questElements: []
    };
    
    // Show quests
    updateQuestLogItems();
}

/**
 * Update quest log items display
 */
function updateQuestLogItems() {
    const scene = game.scene.scenes[0];
    if (!questPanel) return;
    
    // Clear existing quest displays
    questPanel.questElements.forEach(element => {
        if (element) element.destroy();
    });
    questPanel.questElements = [];
    
    const centerX = questPanel.bg.x;
    const centerY = questPanel.bg.y;
    const panelWidth = 600;
    const panelHeight = 500;
    let currentY = centerY - panelHeight/2 + 70;
    const lineHeight = 80;
    const leftMargin = centerX - panelWidth/2 + 30;
    const rightMargin = centerX + panelWidth/2 - 30;
    
    // Show active quests
    if (playerStats.quests.active.length === 0) {
        const noQuestsText = scene.add.text(centerX, currentY, 'No active quests', {
            fontSize: '18px',
            fill: '#888888',
            fontStyle: 'italic'
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0);
        questPanel.questElements.push(noQuestsText);
    } else {
        playerStats.quests.active.forEach((quest, index) => {
            // Quest title
            const titleText = scene.add.text(leftMargin, currentY, quest.title, {
                fontSize: '20px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
            questPanel.questElements.push(titleText);
            
            // Quest description
            const descText = scene.add.text(leftMargin, currentY + 25, quest.description, {
                fontSize: '14px',
                fill: '#cccccc'
            }).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
            questPanel.questElements.push(descText);
            
            // Progress bar background
            const progressBarBgX = centerX;
            const progressBarBgY = currentY + 50;
            const progressBarBgWidth = panelWidth - 60;
            const progressBarBgHeight = 20;
            const progressBarBg = scene.add.rectangle(progressBarBgX, progressBarBgY, progressBarBgWidth, progressBarBgHeight, 0x333333, 0.8)
                .setScrollFactor(0).setDepth(301).setStrokeStyle(2, 0x666666);
            questPanel.questElements.push(progressBarBg);
            
            // Progress bar fill (left-aligned)
            const progressPercent = Math.min(quest.progress / quest.target, 1);
            const progressBarWidth = progressBarBgWidth * progressPercent;
            const progressBarX = progressBarBgX - progressBarBgWidth/2; // Left edge of background
            const progressBar = scene.add.rectangle(
                progressBarX,
                progressBarBgY,
                progressBarWidth,
                16,
                0x00ff00
            ).setScrollFactor(0).setDepth(302).setOrigin(0, 0.5);
            questPanel.questElements.push(progressBar);
            
            // Progress text
            const progressText = scene.add.text(centerX, currentY + 50, `${quest.progress}/${quest.target}`, {
                fontSize: '14px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(303).setOrigin(0.5, 0.5);
            questPanel.questElements.push(progressText);
            
            // Rewards text
            const rewardsText = scene.add.text(leftMargin, currentY + 75, 
                `Rewards: ${quest.rewards.xp ? quest.rewards.xp + ' XP' : ''} ${quest.rewards.gold ? quest.rewards.gold + ' Gold' : ''}`,
                {
                    fontSize: '12px',
                    fill: '#ffd700'
                }
            ).setScrollFactor(0).setDepth(302).setOrigin(0, 0);
            questPanel.questElements.push(rewardsText);
            
            currentY += lineHeight;
        });
    }
    
    // Show completed quests count
    if (playerStats.quests.completed.length > 0) {
        const completedText = scene.add.text(centerX, centerY + panelHeight/2 - 40, 
            `Completed: ${playerStats.quests.completed.length}`, {
            fontSize: '16px',
            fill: '#00ff00',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);
        questPanel.questElements.push(completedText);
    }
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
        
        questPanel.questElements.forEach(element => {
            if (element) element.destroy();
        });
        
        questPanel.questElements = [];
        questPanel = null;
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
    function findValidPosition(targetX, targetY, attempts = 10) {
        for (let i = 0; i < attempts; i++) {
            const offsetX = Phaser.Math.Between(-3, 3) * tileSize;
            const offsetY = Phaser.Math.Between(-3, 3) * tileSize;
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
            targetX: (centerX - 1) * tileSize,  // Near center square
            targetY: (centerY - 5) * tileSize, // Above center, near inn
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
            merchant: true
        },
        {
            id: 'npc_003',
            name: 'Guard Thorne',
            title: 'Guard Captain',
            targetX: centerX * tileSize,  // Near town entrance
            targetY: (mapHeight - 6) * tileSize, // Above entrance marker
            dialogId: 'guard_info'
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
        if (data.name === 'Merchant Lysa') {
            spriteKey = 'npc_lysa';
        } else if (data.name === 'Guard Thorne') {
            spriteKey = 'npc_captain_thorne';
        }
        
        // Check if spritesheet exists, fallback to default 'npc' if not
        if (!scene.textures.exists(spriteKey)) {
            console.warn(`⚠️ Spritesheet ${spriteKey} not found, using default NPC sprite`);
            spriteKey = 'npc';
        }
        
        const npc = scene.physics.add.sprite(data.x, data.y, spriteKey);
        npc.setDepth(5); // Same depth as monsters
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
    settingsVisible = !settingsVisible;
    
    if (settingsVisible) {
        createSettingsUI();
    } else {
        destroySettingsUI();
    }
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
        title: scene.add.text(centerX, centerY - panelHeight/2 + 20, 'SETTINGS', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(301).setOrigin(0.5, 0),
        closeText: scene.add.text(centerX + panelWidth/2 - 20, centerY - panelHeight/2 + 20, 'Press ESC to Close', {
            fontSize: '14px',
            fill: '#aaaaaa'
        }).setScrollFactor(0).setDepth(301).setOrigin(1, 0),
        elements: []
    };
    
    // Music toggle setting
    const settingY = centerY - panelHeight/2 + 80;
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
 * Update NPC interaction indicators
 */
function updateNPCIndicators() {
    const scene = game.scene.scenes[0];
    
    npcs.forEach(npc => {
        if (!npc.active) return;
        
        // Check distance to player
        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            npc.x, npc.y
        );
        
        const inRange = distance <= npc.interactionRadius;
        
        // Show/hide interaction indicator
        if (inRange && !npc.showIndicator) {
            // Create indicator (exclamation mark or speech bubble)
            npc.interactionIndicator = scene.add.text(npc.x, npc.y - 45, '!', {
                fontSize: '24px',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 3,
                fontStyle: 'bold'
            }).setOrigin(0.5, 0.5).setDepth(20);
            
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
        } else if (!inRange && npc.showIndicator) {
            if (npc.interactionIndicator) {
                npc.interactionIndicator.destroy();
                npc.interactionIndicator = null;
            }
            npc.showIndicator = false;
        }
        
        // Update indicator position to follow NPC
        if (npc.interactionIndicator && npc.interactionIndicator.active) {
            npc.interactionIndicator.x = npc.x;
            npc.interactionIndicator.y = npc.y - 45;
        }
    });
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
                    { text: 'Tell me about this place', next: 'about_place' },
                    { text: 'Do you have any quests?', next: 'quests' },
                    { text: 'Goodbye', next: 'end' }
                ]
            },
            'about_place': {
                text: 'This is a peaceful village, though we have been troubled by monsters lately. The brave adventurers who help us are always welcome.',
                choices: [
                    { text: 'I can help with monsters', next: 'quests' },
                    { text: 'Thank you', next: 'end' }
                ]
            },
            'quests': {
                text: 'Yes! We need help clearing the monsters that have been appearing. Would you be willing to help?',
                choices: [
                    { text: 'I\'ll help!', next: 'quest_accepted' },
                    { text: 'Maybe later', next: 'end' }
                ]
            },
            'quest_accepted': {
                text: 'Thank you! Please eliminate 5 monsters and return to me. I will reward you handsomely.',
                choices: [
                    { text: 'I\'ll get started', next: 'end' }
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
        npcTitle: 'Trader',
        nodes: {
            'start': {
                text: 'Welcome to my shop! I have the finest wares in all the land. What would you like?',
                choices: [
                    { text: 'Show me your items', next: 'shop' },
                    { text: 'Just browsing', next: 'end' }
                ]
            },
            'shop': {
                text: 'Here are my wares. What would you like to buy?',
                choices: [
                    { text: 'Open Shop', action: 'open_shop' },
                    { text: 'Maybe later', next: 'end' }
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
                    { text: 'I\'m here to help', next: 'help' },
                    { text: 'Just passing through', next: 'end' }
                ]
            },
            'help': {
                text: 'Good! We need all the help we can get. The monsters have been getting bolder. Stay safe out there.',
                choices: [
                    { text: 'I will', next: 'end' }
                ]
            },
            'end': {
                text: 'Stay vigilant!',
                choices: []
            }
        }
    }
};

/**
 * Start dialog with an NPC
 */
function startDialog(npc) {
    const dialogData = dialogDatabase[npc.dialogId];
    if (!dialogData) {
        console.warn(`Dialog not found: ${npc.dialogId}`);
        return;
    }
    
    currentDialog = dialogData;
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
    const panelHeight = 300;
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2 + 150;
    
    dialogPanel = {
        bg: scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setScrollFactor(0).setDepth(400).setStrokeStyle(3, 0xffffff),
        npcNameText: scene.add.text(centerX - panelWidth/2 + 20, centerY - panelHeight/2 + 20, 
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
    const panelHeight = 300;
    
    // Dialog text
    dialogPanel.dialogText = scene.add.text(
        centerX - panelWidth/2 + 20,
        centerY - panelHeight/2 + 70,
        node.text,
        {
            fontSize: '18px',
            fill: '#ffffff',
            wordWrap: { width: panelWidth - 40 }
        }
    ).setScrollFactor(0).setDepth(401).setOrigin(0, 0);
    
    // Choice buttons
    const startY = centerY + 50;
    const buttonHeight = 40;
    const buttonSpacing = 10;
    
    node.choices.forEach((choice, index) => {
        const buttonY = startY + index * (buttonHeight + buttonSpacing);
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
        const buttonText = scene.add.text(
            centerX,
            buttonY,
            choice.text,
            {
                fontSize: '16px',
                fill: '#ffffff'
            }
        ).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);
        
        // Button hover effects
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x444444);
        });
        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x333333);
        });
        
        // Button click handler
        buttonBg.on('pointerdown', () => {
            if (choice.action === 'open_shop') {
                openShop(currentShopNPC);
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
    
    closeDialog(); // Close dialog first
    shopVisible = true;
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
        scrollY: 0, // Scroll position for shop items
        maxScrollY: 0 // Maximum scroll (calculated in updateShopItems)
    };
    
    // Show current gold - positioned in left panel
    shopPanel.goldText = scene.add.text(leftPanelX - panelWidth/2 + 20, 60, `Gold: ${playerStats.gold}`, {
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
    if (!shopPanel) return;
    
    console.log('🛒 Updating shop items. Shop inventory length:', shopInventory.length);
    
    // Clear existing shop items (including stats text)
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
    
    // Don't clear inventory items here - they should only be cleared in updateShopInventoryItems()
    // This prevents inventory from disappearing when shop items are updated
    
    // Update gold display
    if (shopPanel.goldText) {
        shopPanel.goldText.destroy();
    }
    const leftPanelX = shopPanel.leftBg.x;
    const panelWidth = 512; // Half of 1024
    const panelHeight = 768;
    
    // Gold display - positioned in left panel
    shopPanel.goldText = scene.add.text(leftPanelX - panelWidth/2 + 20, 60, 
        `Gold: ${playerStats.gold}`, {
        fontSize: '20px',
        fill: '#ffd700',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(401).setOrigin(0, 0);
    
    // Display shop items with scrolling in left panel
    const startY = 100;
    const itemHeight = 80;
    const spacing = 10;
    const visibleAreaHeight = panelHeight - 120; // Area for items (minus header)
    
    // Calculate max scroll
    const totalItemsHeight = shopInventory.length * (itemHeight + spacing);
    shopPanel.maxScrollY = Math.max(0, totalItemsHeight - visibleAreaHeight);
    
    // Clamp scroll position
    shopPanel.scrollY = Math.max(0, Math.min(shopPanel.scrollY, shopPanel.maxScrollY));
    
    shopInventory.forEach((item, index) => {
        const itemY = startY + index * (itemHeight + spacing) - shopPanel.scrollY;
        
        // Only render items that are visible (with some padding)
        const visibleTop = 80;
        const visibleBottom = panelHeight - 40;
        if (itemY < visibleTop || itemY > visibleBottom) {
            return; // Skip rendering off-screen items
        }
        
        console.log(`🛒 Rendering shop item ${index}: ${item.name} (type: ${item.type}) at Y: ${itemY}`);
        // Item width for left panel (leave space for scrollbar)
        const itemWidth = panelWidth - 60;
        
        // Item background
        const itemBg = scene.add.rectangle(
            leftPanelX,
            itemY,
            itemWidth,
            itemHeight,
            0x333333,
            0.8
        ).setScrollFactor(0).setDepth(401).setStrokeStyle(2, 0x666666);
        
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
            itemSprite = scene.add.sprite(leftPanelX - itemWidth/2 + 30, itemY, finalSpriteKey);
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
                borderRect = scene.add.rectangle(leftPanelX - itemWidth/2 + 30, itemY, spriteSize + borderWidth * 2, spriteSize + borderWidth * 2, qualityColor, 0)
                    .setStrokeStyle(borderWidth, qualityColor)
                    .setScrollFactor(0)
                    .setDepth(401); // Behind sprite but visible
                
                console.log(`Shop: Successfully created sprite for "${item.name}" using "${finalSpriteKey}"`);
            }
        } catch (error) {
            console.error(`Shop: Failed to create sprite for item "${item.name}":`, error);
            // Create a placeholder rectangle if sprite creation fails
            itemSprite = scene.add.rectangle(leftPanelX - itemWidth/2 + 30, itemY, 32, 32, 0x888888, 1.0)
                .setScrollFactor(0).setDepth(402);
        }
        
        // Item name
        const nameText = scene.add.text(leftPanelX - itemWidth/2 + 80, itemY - 15, item.name, {
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
        
        const statsTextObj = scene.add.text(leftPanelX - itemWidth/2 + 80, itemY + 15, statsText, {
            fontSize: '14px',
            fill: '#cccccc'
        }).setScrollFactor(0).setDepth(402).setOrigin(0, 0.5);
        
        // Price
        const priceText = scene.add.text(leftPanelX + itemWidth/2 - 140, itemY, `${item.price} Gold`, {
            fontSize: '18px',
            fill: '#ffd700',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0.5);
        
        // Buy button
        const buyButton = scene.add.rectangle(
            leftPanelX + itemWidth/2 - 60,
            itemY,
            80,
            40,
            0x00aa00,
            0.9
        ).setScrollFactor(0).setDepth(401)
         .setStrokeStyle(2, 0x00ff00)
         .setInteractive({ useHandCursor: true });
        
        const buyText = scene.add.text(leftPanelX + itemWidth/2 - 60, itemY, 'Buy', {
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
            baseY: startY + index * (itemHeight + spacing) // Store base position for scrolling
        });
    });
    
    // Add scrollbar if needed
    if (shopPanel.maxScrollY > 0) {
        const scrollbarWidth = 20;
        // Position scrollbar within the item area (not the full panel)
        const scrollbarTop = startY; // Start where items start
        const scrollbarBottom = startY + visibleAreaHeight; // End where items end
        const scrollbarHeight = visibleAreaHeight;
        const scrollbarX = leftPanelX + panelWidth/2 - 15; // 15px from right edge of left panel
        const scrollbarCenterY = scrollbarTop + scrollbarHeight / 2; // Center of scrollbar track
        
        // Scrollbar background (positioned correctly within item area)
        if (shopPanel.scrollbarBg) shopPanel.scrollbarBg.destroy();
        shopPanel.scrollbarBg = scene.add.rectangle(scrollbarX, scrollbarCenterY, scrollbarWidth, scrollbarHeight, 0x333333, 0.8)
            .setScrollFactor(0).setDepth(401).setStrokeStyle(1, 0x666666);
        
        // Scrollbar thumb
        const thumbHeight = Math.max(30, (visibleAreaHeight / totalItemsHeight) * scrollbarHeight);
        // Calculate thumb CENTER position - rectangles are centered on their Y position
        // When at top: thumb center should be at scrollbarTop + thumbHeight/2
        // When at bottom: thumb center should be at scrollbarBottom - thumbHeight/2
        const thumbTopMin = scrollbarTop + thumbHeight / 2; // Minimum thumb center Y (at top)
        const thumbBottomMax = scrollbarBottom - thumbHeight / 2; // Maximum thumb center Y (at bottom)
        const thumbRange = thumbBottomMax - thumbTopMin; // Available range for thumb center to move
        
        let thumbCenterY = thumbTopMin; // Default to top position
        
        if (shopPanel.maxScrollY > 0 && thumbRange > 0) {
            // Calculate position: 0 scroll = top, maxScrollY = bottom
            const scrollRatio = Math.min(1, Math.max(0, shopPanel.scrollY / shopPanel.maxScrollY)); // Clamp to 0-1
            thumbCenterY = thumbTopMin + (scrollRatio * thumbRange);
        }
        
        // Ensure thumb reaches exact positions at extremes
        if (shopPanel.scrollY <= 0) {
            thumbCenterY = thumbTopMin; // At top when scrollY = 0
        } else if (shopPanel.scrollY >= shopPanel.maxScrollY) {
            thumbCenterY = thumbBottomMax; // At bottom when fully scrolled
        }
        
        // Final clamp to ensure thumb stays within channel bounds
        thumbCenterY = Math.max(thumbTopMin, Math.min(thumbCenterY, thumbBottomMax));
        
        if (shopPanel.scrollbarThumb) shopPanel.scrollbarThumb.destroy();
        shopPanel.scrollbarThumb = scene.add.rectangle(scrollbarX, thumbCenterY, scrollbarWidth - 4, thumbHeight, 0x666666, 0.9)
            .setScrollFactor(0).setDepth(402).setStrokeStyle(1, 0x999999);
    } else {
        // Remove scrollbar if not needed
        if (shopPanel.scrollbarBg) {
            shopPanel.scrollbarBg.destroy();
            shopPanel.scrollbarBg = null;
        }
        if (shopPanel.scrollbarThumb) {
            shopPanel.scrollbarThumb.destroy();
            shopPanel.scrollbarThumb = null;
        }
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
    hideItemTooltip();
    
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
    
    const rightPanelX = shopPanel.rightBg.x;
    const inventoryItems = playerStats.inventory;
    
    if (inventoryItems.length === 0) {
        const emptyText = scene.add.text(rightPanelX, 200, 'Inventory is empty', {
            fontSize: '16px',
            fill: '#888888',
            fontStyle: 'italic'
        }).setScrollFactor(0).setDepth(401).setOrigin(0.5, 0.5);
        shopPanel.inventoryItems.push({ label: emptyText });
        return;
    }
    
    // Display items in a grid in right panel
    const itemSize = 60;
    const spacing = 15;
    const itemsPerRow = 6;
    const gridWidth = itemsPerRow * itemSize + (itemsPerRow - 1) * spacing;
    const startX = rightPanelX - gridWidth / 2 + itemSize / 2;
    const startY = 100;
    
    inventoryItems.forEach((item, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * (itemSize + spacing);
        const y = startY + row * (itemSize + spacing + 20);
        
        // Get item sprite key based on type
        let spriteKey = 'item_weapon';
        if (item.type === 'weapon') spriteKey = 'item_weapon';
        else if (item.type === 'armor') spriteKey = 'item_armor';
        else if (item.type === 'helmet') spriteKey = 'item_helmet';
        else if (item.type === 'ring') spriteKey = 'item_ring';
        else if (item.type === 'amulet') spriteKey = 'item_amulet';
        else if (item.type === 'boots') spriteKey = 'item_boots';
        else if (item.type === 'gloves') spriteKey = 'item_gloves';
        else if (item.type === 'belt') spriteKey = 'item_belt';
        else if (item.type === 'consumable') spriteKey = 'item_consumable';
        else if (item.type === 'gold') spriteKey = 'item_gold';
        
        // Create item sprite with background
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
        const itemNameText = scene.add.text(x, y + itemSize/2 + 5, item.name, {
            fontSize: '11px',
            fill: '#ffffff',
            wordWrap: { width: itemSize + 10 }
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0);
        
        // Calculate sell price (typically 50% of buy price, or a base value)
        const sellPrice = item.price ? Math.floor(item.price * 0.5) : calculateItemSellPrice(item);
        const priceText = scene.add.text(x, y + itemSize/2 + 18, `${sellPrice}G`, {
            fontSize: '10px',
            fill: '#ffd700'
        }).setScrollFactor(0).setDepth(402).setOrigin(0.5, 0);
        
        // Make clickable to sell
        itemSprite.setInteractive({ useHandCursor: true });
        itemBg.setInteractive({ useHandCursor: true });
        borderRect.setInteractive({ useHandCursor: true });
        
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
    if (shopPanel) {
        // Destroy panel backgrounds
        if (shopPanel.leftBg && shopPanel.leftBg.active) shopPanel.leftBg.destroy();
        if (shopPanel.rightBg && shopPanel.rightBg.active) shopPanel.rightBg.destroy();
        if (shopPanel.divider && shopPanel.divider.active) shopPanel.divider.destroy();
        
        // Destroy titles and text
        if (shopPanel.leftTitle && shopPanel.leftTitle.active) shopPanel.leftTitle.destroy();
        if (shopPanel.rightTitle && shopPanel.rightTitle.active) shopPanel.rightTitle.destroy();
        if (shopPanel.closeText && shopPanel.closeText.active) shopPanel.closeText.destroy();
        if (shopPanel.goldText && shopPanel.goldText.active) shopPanel.goldText.destroy();
        
        // Destroy scrollbar elements
        if (shopPanel.scrollbarBg && shopPanel.scrollbarBg.active) shopPanel.scrollbarBg.destroy();
        if (shopPanel.scrollbarThumb && shopPanel.scrollbarThumb.active) shopPanel.scrollbarThumb.destroy();
        shopPanel.scrollbarBg = null;
        shopPanel.scrollbarThumb = null;
        
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
        
        // Restore player position
        if (saveData.playerPosition) {
            player.x = saveData.playerPosition.x;
            player.y = saveData.playerPosition.y;
        }
        
        // Restore dungeon state
        if (saveData.dungeonSeeds) {
            // Rebuild cache from seeds (lazy - only store seeds, regenerate when needed)
            Object.keys(saveData.dungeonSeeds).forEach(key => {
                const seed = saveData.dungeonSeeds[key];
                const level = parseInt(key.replace('level_', ''));
                dungeonCache[key] = { seed: seed, level: level };
            });
        }
        
        if (saveData.dungeonCompletions) {
            dungeonCompletions = saveData.dungeonCompletions;
        }
        
        if (saveData.dungeonLevel) {
            dungeonLevel = saveData.dungeonLevel;
        }
        
        // Restore map if in dungeon
        if (saveData.currentMap === 'dungeon') {
            // Will be handled by transitionToMap if needed
            currentMap = 'dungeon';
        }
        
        // Update player stats (recalculate attack/defense from equipment)
        updatePlayerStats();
        
        // Refresh UIs
        refreshInventory();
        refreshEquipment();
        refreshQuestLog();
        
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
                addChatMessage(`Fireball hit for ${damage} damage`, 0x4400ff, '⚡');
                
                // Visual effect
                createFireballEffect(monster.x, monster.y);
                hitCount++;
                
                // Check if monster died
                if (monster.hp <= 0 && !monster.isDead) {
                    monster.isDead = true;
                    
                    // Check if this was a boss in a dungeon
                    if (monster.isBoss && currentMap === 'dungeon') {
                        onBossDefeated(dungeonLevel, monster.x, monster.y);
                    }
                    if (monster.hpBarBg) monster.hpBarBg.destroy();
                    if (monster.hpBar) monster.hpBar.destroy();
                    
                    const xpGain = monster.xpReward || 10;
                    playerStats.xp += xpGain;
                    playerStats.questStats.monstersKilled++;
                    showDamageNumber(monster.x, monster.y, `+${xpGain} XP`, 0xffd700, false, 'xp'); // Gold color for XP
                    
                    checkLevelUp();
                    dropItemsFromMonster(monster.x, monster.y);
                    
                    game.scene.scenes[0].time.delayedCall(100, () => {
                        monster.destroy();
                        monsters.splice(monsters.indexOf(monster), 1);
                    });
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
    const title = scene.add.text(centerX, centerY - panelHeight/2 + 30, 'Assets Status', {
        fontSize: '28px',
        fill: '#00aaff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0); // Fixed to camera/screen
    title.setDepth(251);
    
    // Close instruction
    const closeText = scene.add.text(centerX, centerY + panelHeight/2 - 20, 'Press CTRL+A to close', {
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
    const monsterTypes = [
        { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10 },
        { name: 'Orc', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20 },
        { name: 'Skeleton', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15 },
        { name: 'Spider', textureKey: 'monster_spider', hp: 20, attack: 4, speed: 70, xp: 8 },
        { name: 'Slime', textureKey: 'monster_slime', hp: 15, attack: 3, speed: 30, xp: 5 },
        { name: 'Wolf', textureKey: 'monster_wolf', hp: 40, attack: 7, speed: 65, xp: 18 },
        { name: 'Dragon', textureKey: 'monster_dragon', hp: 80, attack: 12, speed: 35, xp: 40 },
        { name: 'Ghost', textureKey: 'monster_ghost', hp: 35, attack: 6, speed: 55, xp: 12 }
    ];
    
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
 */
function spawnMonster(x, y, type) {
    const scene = game.scene.scenes[0];
    
    // Use directional sprite if available, otherwise fall back to old texture
    const monsterType = type.name.toLowerCase();
    const initialTexture = `monster_${monsterType}_south`; // Start facing south
    const fallbackTexture = type.textureKey; // Old procedural texture
    
    const textureToUse = scene.textures.exists(initialTexture) ? initialTexture : fallbackTexture;
    const monster = scene.physics.add.sprite(x, y, textureToUse);
    monster.setDepth(5); // Monsters above tiles but below player
    
    // Add monster stats
    monster.monsterType = type.name;
    monster.hp = type.hp;
    monster.maxHp = type.hp;
    monster.attack = type.attack;
    monster.speed = type.speed;
    monster.xpReward = type.xp;
    monster.lastAttackTime = 0;
    monster.attackCooldown = 1000; // 1 second
    monster.attackRange = 50; // pixels
    
    // Add simple animation (gentle pulsing for some types)
    if (type.name === 'Slime' || type.name === 'Ghost') {
        scene.tweens.add({
            targets: monster,
            scaleX: 1.1,
            scaleY: 1.1,
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
    
    monsters.push(monster);
    return monster;
}

/**
 * Spawn a scaled monster (for dungeons with level scaling)
 */
function spawnMonsterScaled(x, y, type, scaledHp, scaledAttack, scaledXp) {
    const scene = game.scene.scenes[0];
    
    // Use directional sprite if available, otherwise fall back to old texture
    const monsterType = type.name.toLowerCase();
    const initialTexture = `monster_${monsterType}_south`; // Start facing south
    const fallbackTexture = type.textureKey; // Old procedural texture
    
    const textureToUse = scene.textures.exists(initialTexture) ? initialTexture : fallbackTexture;
    const monster = scene.physics.add.sprite(x, y, textureToUse);
    monster.setDepth(5);
    
    monster.monsterType = type.name;
    monster.hp = scaledHp;
    monster.maxHp = scaledHp;
    monster.attack = scaledAttack;
    monster.speed = type.speed;
    monster.xpReward = scaledXp;
    monster.lastAttackTime = 0;
    monster.attackCooldown = 1000;
    monster.attackRange = 50;
    monster.isBoss = false;
    monster.isDead = false;
    
    // Initialize animation properties
    monster.facingDirection = 'south';
    monster.isMoving = false;
    monster.animationState = 'idle';
    
    // Set initial animation state
    updateMonsterAnimation(monster, 0);
    
    // Create HP bar
    const monsterHpBarWidth = 30;
    const monsterHpBarHeight = 4;
    monster.hpBarBg = scene.add.rectangle(0, 0, monsterHpBarWidth, monsterHpBarHeight, 0x000000, 0.8)
        .setDepth(6).setOrigin(0.5, 0.5).setScrollFactor(1);
    monster.hpBar = scene.add.rectangle(0, 0, monsterHpBarWidth - 2, monsterHpBarHeight - 2, 0xff0000)
        .setDepth(7).setOrigin(0, 0.5).setScrollFactor(1);
    
    monsters.push(monster);
    return monster;
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
    const startY = centerY - panelHeight/2 + 80;
    const lineHeight = 22; // Slightly more compact
    const leftMargin = centerX - panelWidth/2 + 20;
    const rightMargin = centerX + panelWidth/2 - 20;
    
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
    const title = scene.add.text(centerX, centerY - panelHeight/2 + 30, 'Grass Spritesheet Debug', {
        fontSize: '28px',
        fill: '#00ff00',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(251);
    
    // Close instruction
    const closeText = scene.add.text(centerX, centerY + panelHeight/2 - 20, 'Press CTRL+M to close', {
        fontSize: '14px',
        fill: '#888888',
        fontFamily: 'Arial'
    });
    closeText.setOrigin(0.5);
    closeText.setScrollFactor(0);
    closeText.setDepth(251);
    
    // Add frame size input
    const inputY = centerY - panelHeight/2 + 60;
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
    const infoY = centerY - panelHeight/2 + 120;
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
            const frameLabel = scene.add.text(currentX, currentY + frameSize/2 + 10, `Frame ${i}`, {
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
    const monsterTypes = ['goblin', 'orc', 'skeleton', 'slime', 'wolf', 'dragon', 'ghost', 'spider'];
    
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
        
        // Attack animation
        const attackTextureKey = `monster_${type}_attack`;
        const attackAnimKey = `${type}_attack`;
        if (scene.textures.exists(attackTextureKey)) {
            scene.anims.create({
                key: attackAnimKey,
                frames: scene.anims.generateFrameNumbers(attackTextureKey, { start: 0, end: -1 }),
                frameRate: 10, // Faster for attack
                repeat: 0 // Play once
            });
        }
        
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
    
    const monsterType = (monster.monsterType || 'goblin').toLowerCase();
    const attackAnimKey = `${monsterType}_attack`;
    
    monster.animationState = 'attacking';
    
    if (scene.anims.exists(attackAnimKey)) {
        monster.play(attackAnimKey);
        
        // Return to walking/idle after attack completes
        monster.once('animationcomplete', (animation) => {
            if (animation && animation.key === attackAnimKey) {
                monster.animationState = 'idle';
                updateMonsterAnimation(monster, 0); // Update to correct state
            }
        });
    }
}

/**
 * Play monster death animation
 */
function playMonsterDeathAnimation(monster) {
    const scene = game.scene.scenes[0];
    if (!monster || !monster.active) return;
    
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
 * 8. Save/Load system
 */
