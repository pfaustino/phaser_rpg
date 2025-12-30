/**
 * MapManager.js
 * Handles map generation (Town, Wilderness, Dungeon) and transitions.
 */

const MapManager = {
    // State
    buildings: [],
    dungeonWalls: [],
    wallGroup: null, // Phaser StaticGroup
    transitionMarkers: [],
    questZones: {}, // Store quest interaction zones
    currentMap: 'town',

    // History State for Dungeon Returns
    lastMap: null,
    lastPlayerX: 0,
    lastPlayerY: 0,

    // Dungeon State
    currentDungeon: null,
    dungeonLevel: 1,
    dungeonCache: {},
    dungeonCompletions: {},
    dungeonTilesets: {
        floor: null,
        wall: null,
        floorMetadata: null,
        wallMetadata: null,
        floorTileLookup: {},
        wallTileLookup: {}
    },

    // Reference to the main scene
    scene: null,

    init(scene) {
        this.scene = scene;
        this.wallGroup = scene.physics.add.staticGroup();
    },

    /**
     * Create town map with streets, buildings, and NPCs
     */
    createTownMap() {
        const scene = this.scene;
        // Clear wall group
        if (this.wallGroup) this.wallGroup.clear(true, true);

        // Use local constants or access from scene/config? 
        // We'll hardcode for now as they were in game.js
        const tileSize = 32;
        const mapWidth = 40;
        const mapHeight = 40;

        // Clear existing buildings and markers
        this.buildings = [];
        this.transitionMarkers = [];

        // Ensure mana regen is running (assuming global function)
        if (typeof startManaRegen === 'function') startManaRegen();
        if (typeof startHpRegen === 'function') startHpRegen();

        // Create base grass tiles
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
                const bgRect = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x59BD59, 1.0);
                bgRect.setOrigin(0);
                bgRect.setDepth(-1);

                const scaleFactor = 32 / 96;
                let tile;
                if (useFrames) {
                    const frameIndex = Math.floor(Math.random() * grassFrameCount);
                    tile = scene.add.image(x * tileSize, y * tileSize, 'grass', frameIndex).setOrigin(0);
                } else {
                    tile = scene.add.image(x * tileSize, y * tileSize, 'grass').setOrigin(0);
                }
                tile.setScale(scaleFactor);
                tile.setDepth(0);
            }
        }

        // Create main streets
        const centerX = Math.floor(mapWidth / 2);
        const centerY = Math.floor(mapHeight / 2);

        // Horizontal main street
        for (let x = 0; x < mapWidth; x++) {
            for (let dy = -2; dy <= 2; dy++) {
                const y = centerY + dy;
                if (y >= 0 && y < mapHeight) {
                    scene.add.image(x * tileSize, y * tileSize, 'dirt').setOrigin(0).setDepth(0);
                }
            }
        }

        // Vertical main street
        for (let y = 0; y < mapHeight; y++) {
            for (let dx = -2; dx <= 2; dx++) {
                const x = centerX + dx;
                if (x >= 0 && x < mapWidth) {
                    scene.add.image(x * tileSize, y * tileSize, 'dirt').setOrigin(0).setDepth(0);
                }
            }
        }

        // Define spawn/exit
        const entranceX = centerX * tileSize;
        const entranceY = (mapHeight - 7) * tileSize;

        // Spawn Player at Village Center (20, 20)
        const playerSpawnX = centerX * tileSize;
        const playerSpawnY = centerY * tileSize;

        // Hardcoded Building Layout
        // Map is 40x40. Center is 20,20.
        const definedBuildings = [
            // Key Buildings (Upscaled & Aspect Corrected)
            // Tavern (AR 1.40): 10x7
            { type: 'tavern', x: 7, y: 2, width: 10, height: 7 },       // North-West, Left of Road

            // Guild (AR 0.99): 8x8
            { type: 'guild', x: 23, y: 2, width: 8, height: 8 },        // North-East

            // Temple (AR 1.24): 10x8 (Was squished)
            { type: 'temple', x: 2, y: 11, width: 10, height: 8 },      // moved lower to accommodate size

            // Shop (AR 1.16): 7x6
            { type: 'shop', x: 13, y: 13, width: 7, height: 6 },        // West, North of Road

            // Blacksmith (AR 1.18): 7x6
            { type: 'blacksmith', x: 24, y: 13, width: 7, height: 6 },  // East, North of Road

            // Library (AR 1.19): 8x7
            { type: 'library', x: 9, y: 23, width: 8, height: 7 },      // South-West

            // Apothecary (AR 1.20): 7x6
            { type: 'apothecary', x: 24, y: 23, width: 7, height: 6 },  // South-East

            // Residential (Houses - AR ~1.0): 6x6
            { type: 'house', x: 33, y: 5, width: 6, height: 6 },   // East Side 1
            { type: 'house', x: 33, y: 13, width: 6, height: 6 },  // East Side 2
            { type: 'tower', x: 33, y: 24, width: 6, height: 7 },  // East Side 3 (Replaced with Tower)

            { type: 'house', x: 4, y: 33, width: 6, height: 6 },   // Bottom Row 1
            { type: 'house', x: 12, y: 33, width: 6, height: 6 },  // Bottom Row 2
            { type: 'house', x: 24, y: 33, width: 6, height: 6 },  // Bottom Row 3
            { type: 'house', x: 31, y: 33, width: 6, height: 6 },  // Bottom Row 4

            { type: 'house', x: 3, y: 23, width: 6, height: 6 },   // West Side (below Temple)
        ];

        // Place buildings from hardcoded list
        definedBuildings.forEach(def => {
            const bx = def.x;
            const by = def.y;

            const pixelX = bx * tileSize;
            const pixelY = by * tileSize;
            const pixelW = def.width * tileSize;
            const pixelH = def.height * tileSize;

            let buildingVisual;
            if (scene.textures.exists(def.type)) {
                // Use specific texture if available
                buildingVisual = scene.add.image(pixelX + pixelW / 2, pixelY + pixelH / 2, def.type)
                    .setDepth(1)
                    .setDisplaySize(pixelW, pixelH);
            } else if (def.type === 'house') {
                // Randomize house texture
                const houseKeys = ['house1', 'house2', 'house3'];
                const key = Phaser.Utils.Array.GetRandom(houseKeys);
                const textureToUse = scene.textures.exists(key) ? key : 'house';

                buildingVisual = scene.add.image(pixelX + pixelW / 2, pixelY + pixelH / 2, textureToUse)
                    .setDepth(1)
                    .setDisplaySize(pixelW, pixelH);
            } else {
                // Fallback to rectangle
                const color = def.color || 0x888888;
                buildingVisual = scene.add.rectangle(
                    pixelX + pixelW / 2, pixelY + pixelH / 2,
                    pixelW, pixelH, color, 0.9
                ).setDepth(1).setStrokeStyle(2, 0x000000);
            }

            // Store reference 
            const rect = buildingVisual;

            // Label
            const label = scene.add.text(
                pixelX + pixelW / 2, pixelY + pixelH / 2,
                def.type.toUpperCase(),
                { fontSize: '12px', fill: '#ffffff', stroke: '#000000', strokeThickness: 2 }
            ).setDepth(2).setOrigin(0.5);

            // Dynamic interaction radius based on size
            const sizeRadius = Math.max(pixelW, pixelH) / 2;
            const interactionRadius = sizeRadius + 40; // 40px buffer around the building

            this.buildings.push({
                x: pixelX, y: pixelY, width: pixelW, height: pixelH,
                type: def.type, rect: rect, label: label,
                centerX: pixelX + pixelW / 2, centerY: pixelY + pixelH / 2,
                interactionRadius: interactionRadius
            });
        });

        // Entrance Marker
        const entranceMarker = scene.add.rectangle(entranceX, entranceY, tileSize * 4, tileSize * 4, 0x00ff00, 0.7)
            .setDepth(25).setStrokeStyle(5, 0x00ff00);

        const exitText = scene.add.text(entranceX, entranceY, 'TOWN\nEXIT\n[F]', {
            fontSize: '16px', fill: '#ffffff', stroke: '#000000', strokeThickness: 4, align: 'center'
        }).setDepth(26).setOrigin(0.5);

        this.transitionMarkers.push({
            x: entranceX, y: entranceY, radius: tileSize * 2,
            targetMap: 'wilderness', marker: entranceMarker, text: exitText
        });

        scene.mapWidth = mapWidth;
        scene.mapHeight = mapHeight;
        scene.tileSize = tileSize;
        scene.physics.world.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);

        // Spawn Player
        if (typeof player !== 'undefined') {
            player.x = playerSpawnX;
            player.y = playerSpawnY;
        }

        // Initialize NPCs (assuming global function)
        if (typeof initializeNPCs === 'function') initializeNPCs();

        // Create Mana Fluxes (assuming global or we move it later)
        if (typeof createManaFluxes === 'function') createManaFluxes();
        // Initialize NPCs (assuming global function)
        if (typeof initializeNPCs === 'function') initializeNPCs();

        // Create Mana Fluxes (assuming global or we move it later)
        if (typeof createManaFluxes === 'function') createManaFluxes();

        // Strange Energy (MQ-01) - Visual & Trigger
        // MOVED to (22, 18) to be clearly visible in the square, away from the Shop (13-20)

        // CHECK QUEST STATE: Only show if 'main_02_001' (Mysterious Arrival) is active
        // This quest deals with the strange energy in the town square.
        const energyQuestId = 'main_02_001';
        const showEnergy = window.isQuestActive(energyQuestId);

        if (showEnergy) {
            const energyX = 22 * tileSize + 16;
            const energyY = 18 * tileSize + 16;

            // Particle Effect for Strange Energy
            // 1. Ensure a texture exists for particles (using a simple generated graphic)
            if (!scene.textures.exists('energy_particle')) {
                const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
                graphics.fillStyle(0x00ffff, 1);
                graphics.fillCircle(4, 4, 4); // 8x8 circle
                graphics.generateTexture('energy_particle', 8, 8);
            }

            // 2. Create Emitter
            const particles = scene.add.particles(energyX, energyY, 'energy_particle', {
                speed: { min: 20, max: 60 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.5, end: 0 }, // Larger particles
                alpha: { start: 1, end: 0 },
                lifespan: 1200,
                frequency: 80, // More frequent
                blendMode: 'ADD'
            });
            particles.setDepth(5); // Higher depth to sit above ground debris

            // Inner core (Static anchor) - Larger and pulsing
            const core = scene.add.circle(energyX, energyY, 10, 0x00ffff, 0.8).setDepth(6);
            scene.tweens.add({
                targets: core,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.5,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });

            // Interactive Zone trigger
            const energyZone = scene.add.zone(energyX, energyY, 64, 64); // Larger zone
            scene.physics.add.existing(energyZone, true);

            // Store for later interaction setup and indicators
            this.questZones['strange_energy_zone'] = energyZone;
        }
    },

    /**
     * Setup physics interactions for quest zones (Called after player creation)
     * @param {Phaser.Scene} scene - The main scene
     * @param {Phaser.GameObjects.Sprite} player - The player sprite
     */
    setupQuestInteractions(scene, player) {
        console.log('🔧 [MapManager] setupQuestInteractions called');
        if (!player) {
            console.warn('⚠️ [MapManager] setupQuestInteractions called without player');
            return;
        }

        // Strange Energy (MQ-01)
        const energyZone = this.questZones['strange_energy_zone'];
        if (energyZone) {
            console.log('🔹 [MapManager] Found strange_energy_zone. Active:', energyZone.active);
            if (energyZone.body) console.log(`   Zone Body: x=${energyZone.body.x}, y=${energyZone.body.y}, w=${energyZone.body.width}, h=${energyZone.body.height}`);
            else console.warn('⚠️ [MapManager] strange_energy_zone has NO physics body');

            scene.physics.add.overlap(player, energyZone, () => {
                console.log('⚡ [MapManager] Player overlapped strange energy!');
                // Emit exploration event
                if (window.uqe && window.uqe.eventBus) {
                    const eventName = (typeof UQE_EVENTS !== 'undefined') ? UQE_EVENTS.LOCATION_EXPLORED : 'location_explored';
                    console.log(`📡 [MapManager] Emitting ${eventName} for strange_energy_zone`);
                    window.uqe.eventBus.emit(eventName, { id: 'strange_energy_zone', zoneId: 'strange_energy_zone' });
                }
            });
            console.log('✅ [MapManager] Strange Energy interaction setup complete');
        } else {
            console.warn('⚠️ [MapManager] strange_energy_zone NOT FOUND in questZones');
        }

        // Play Town Music
        if (typeof playBackgroundMusic === 'function') playBackgroundMusic('town');
    },

    /**
     * Create wilderness map
     */
    createWildernessMap() {
        const scene = this.scene;
        const tileSize = 32;
        const mapWidth = 50;
        const mapHeight = 50;

        this.buildings = [];
        this.transitionMarkers = [];

        let useFrames = false;
        let grassFrameCount = 1;
        if (scene.textures.exists('grass')) {
            const tex = scene.textures.get('grass');
            if (tex && tex.frameTotal > 0) {
                grassFrameCount = tex.frameTotal;
                useFrames = true;
            }
        }

        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                let tileType = 'grass';
                if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) tileType = 'wall';
                else if (Math.random() < 0.1) tileType = 'dirt';
                else if (Math.random() < 0.15) tileType = 'stone';

                const bgRect = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x59BD59, 1.0);
                bgRect.setOrigin(0).setDepth(-1);

                const scale = 32 / 96;
                if (tileType === 'grass' && useFrames) {
                    scene.add.image(x * tileSize, y * tileSize, 'grass', Math.floor(Math.random() * grassFrameCount))
                        .setOrigin(0).setScale(scale).setDepth(0);
                } else {
                    const t = scene.add.image(x * tileSize, y * tileSize, tileType).setOrigin(0).setDepth(0);
                    if (tileType === 'grass') t.setScale(scale);
                }
            }
        }

        // Town Return Marker
        const exitX = (mapWidth / 2) * tileSize;
        const exitY = 2 * tileSize;
        const exitMarker = scene.add.rectangle(exitX, exitY, tileSize * 2, tileSize * 2, 0x00ff00, 0.5)
            .setDepth(3).setStrokeStyle(3, 0x00ff00);

        const returnText = scene.add.text(exitX, exitY, 'RETURN\nTO TOWN', { fontSize: '12px', fill: '#ffffff', align: 'center' })
            .setDepth(4).setOrigin(0.5);

        this.transitionMarkers.push({
            x: exitX, y: exitY, radius: tileSize * 1.5, targetMap: 'town', marker: exitMarker, text: returnText
        });

        const numDungeons = 2; // Fixed to 2 for now (Tower + Temple)

        for (let i = 0; i < numDungeons; i++) {
            const bx = Phaser.Math.Between(5, mapWidth - 6);
            const by = Phaser.Math.Between(5, mapHeight - 6);
            const dx = bx * tileSize;
            const dy = by * tileSize;

            // Watchtower (Level 8+)
            // Requirement: 'main_01_008' active or completed
            if (i === 0) {
                const towerReq = 'main_01_008';
                // Check both legacy and UQE
                let showTower = window.isQuestActive(towerReq) || window.isQuestCompleted(towerReq);
                if (window.uqe && window.uqe.isQuestActive('main_01_008')) showTower = true;

                if (showTower) {
                    const dMarker = scene.add.rectangle(dx, dy, tileSize * 2, tileSize * 2, 0x444444, 0.8)
                        .setDepth(3).setStrokeStyle(2, 0xffffff);
                    const dText = scene.add.text(dx, dy, 'WATCH\nTOWER', { fontSize: '11px', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 3 })
                        .setDepth(4).setOrigin(0.5);

                    this.transitionMarkers.push({
                        x: dx, y: dy, radius: tileSize * 1.5, targetMap: 'dungeon',
                        dungeonId: 'tower_dungeon',
                        dungeonLevel: 1, marker: dMarker, text: dText
                    });

                    // Emit exploration event if this is the active objective
                    // Logic: If player is near marker, emit 'location_explored'
                    // We'll add a separate checking loop or just assume finding it is enough?
                    // Better: Add a zone or check in update loop. For now, add a zone.
                    const towerZone = scene.add.zone(dx, dy, tileSize * 4, tileSize * 4);
                    scene.physics.add.existing(towerZone, true);
                    scene.physics.add.overlap(scene.player, towerZone, () => {
                        if (window.uqe && window.uqe.eventBus) {
                            window.uqe.eventBus.emit('location_explored', { id: 'watchtower' });
                        }
                    });
                }
            }

            // Temple Ruins (Level 12+)
            // Requirement: 'main_02_003' active or completed
            if (i === 1) {
                const templeReq = 'main_02_003';
                const showTemple = window.isQuestActive(templeReq) || window.isQuestCompleted(templeReq);

                if (showTemple) {
                    const dMarker = scene.add.rectangle(dx, dy, tileSize * 2, tileSize * 2, 0x0088ff, 0.8)
                        .setDepth(3).setStrokeStyle(2, 0xffffff);
                    const dText = scene.add.text(dx, dy, 'TEMPLE\nRUINS', { fontSize: '11px', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 3 })
                        .setDepth(4).setOrigin(0.5);

                    this.transitionMarkers.push({
                        x: dx, y: dy, radius: tileSize * 1.5, targetMap: 'dungeon',
                        dungeonId: 'temple_ruins',
                        dungeonLevel: 1, marker: dMarker, text: dText
                    });
                }
            }
        }

        scene.mapWidth = mapWidth;
        scene.mapHeight = mapHeight;
        scene.tileSize = tileSize;
        scene.physics.world.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);

        if (typeof player !== 'undefined') {
            player.x = exitX;
            player.y = exitY + 50;
        }

        console.log('✅ Wilderness map created');
        if (typeof player !== 'undefined') {
            player.x = exitX;
            player.y = exitY + 50;
        }

        console.log('✅ Wilderness map created');

        // Play Wilderness Music
        if (typeof playBackgroundMusic === 'function') playBackgroundMusic('wilderness');
    },

    /**
     * Create Dungeon Map
     */
    createDungeonMap(dungeonId, level) {
        const scene = this.scene;
        const tileSize = 32;

        try {
            // Load dungeon data
            const dungeonData = scene.cache.json.get('dungeonData');
            const dungeonDef = dungeonData && dungeonData.dungeons ? dungeonData.dungeons[dungeonId] : null;

            if (!dungeonDef) {
                console.error(`Dungeon definition not found for ID: ${dungeonId}`);
                throw new Error("Invalid dungeon ID");
            }

            const dungeonKey = `${dungeonId}_level_${level}`;
            let dungeon;

            if (this.dungeonCache[dungeonKey] && this.dungeonCache[dungeonKey].mapData) {
                dungeon = this.dungeonCache[dungeonKey];
            } else {
                // Use generation parameters from definition
                const gen = dungeonDef.generation || {
                    width: 50, height: 50,
                    roomCount: { min: 8, max: 12 },
                    roomSize: { min: 3, max: 8 },
                    corridorWidth: 1
                };

                // Check if we have a seed in the cache (from loadGame)
                const seed = (this.dungeonCache[dungeonKey] && this.dungeonCache[dungeonKey].seed)
                    ? this.dungeonCache[dungeonKey].seed
                    : null;

                // Parse min/max if needed or pass raw
                dungeon = this.generateDungeon(level, gen, dungeonDef.tileset, seed);
                dungeon.id = dungeonId; // Store ID
                if (dungeon) this.dungeonCache[dungeonKey] = dungeon;
            }

            if (!dungeon) throw new Error("Failed to generate dungeon");
            this.currentDungeon = dungeon;
            this.dungeonLevel = level;

            // Clear walls
            this.dungeonWalls = [];
            if (this.wallGroup) this.wallGroup.clear(true, true);

            // Determine tile keys
            const floorKey = dungeon.tileset && dungeon.tileset.floor ? dungeon.tileset.floor : 'stone';
            const wallKey = dungeon.tileset && dungeon.tileset.wall ? dungeon.tileset.wall : 'wall';
            const hasFloorTex = scene.textures.exists(floorKey);
            const hasWallTex = scene.textures.exists(wallKey);

            // Draw map
            for (let y = 0; y < dungeon.height; y++) {
                for (let x = 0; x < dungeon.width; x++) {
                    if (dungeon.mapData[y][x] === 1) {
                        // Floor
                        if (hasFloorTex) {
                            scene.add.image(x * tileSize, y * tileSize, floorKey)
                                .setOrigin(0).setDepth(-1).setDisplaySize(tileSize, tileSize);
                        } else {
                            // Fallback Floor
                            scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x222222)
                                .setOrigin(0).setDepth(-1);
                        }
                    } else {
                        // Wall
                        let wall;
                        if (hasWallTex) {
                            wall = scene.add.image(x * tileSize, y * tileSize, wallKey)
                                .setOrigin(0).setDepth(0).setDisplaySize(tileSize, tileSize);
                        } else {
                            // Fallback Wall
                            wall = scene.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, 0x444444)
                                .setOrigin(0).setDepth(0);
                        }

                        this.dungeonWalls.push({ x: x * tileSize, y: y * tileSize, width: tileSize, height: tileSize, rect: wall });

                        // Add to physics group for monster collision
                        if (this.wallGroup) {
                            const pWall = this.wallGroup.create(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, null);
                            pWall.setSize(tileSize, tileSize);
                            pWall.setVisible(false); // Invisible physics body, visual is separate
                        }
                    }
                }
            }

            // Exits
            if (dungeon.entrance) {
                const ex = dungeon.entrance.x * tileSize;
                const ey = dungeon.entrance.y * tileSize;
                const exitMarker = scene.add.rectangle(ex, ey, tileSize * 2, tileSize * 2, 0x00ff00, 0.5)
                    .setDepth(2)
                    .setStrokeStyle(4, 0x00ff00);

                const labelText = level === 1 ? 'EXIT TO\nWILDERNESS' : `STAIRS UP\nTO LEVEL ${level - 1}`;
                const exitText = scene.add.text(ex, ey, labelText, {
                    fontSize: '12px', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 3
                }).setDepth(4).setOrigin(0.5);

                this.transitionMarkers.push({
                    x: ex, y: ey, radius: tileSize * 1.5, targetMap: (level === 1) ? (this.lastMap || 'wilderness') : 'dungeon',
                    dungeonId: dungeonId, // Persist ID
                    dungeonLevel: level === 1 ? null : level - 1,
                    marker: exitMarker, text: exitText
                });
                if (typeof player !== 'undefined') {
                    player.x = ex;
                    player.y = ey;
                }
            }

            // Check max levels from definition
            const maxLevels = dungeonDef.levels || 3;
            if (dungeon.exit && level < maxLevels) {
                const ex = dungeon.exit.x * tileSize;
                const ey = dungeon.exit.y * tileSize;
                const nextMarker = scene.add.rectangle(ex, ey, tileSize * 2, tileSize * 2, 0xff0000, 0.5)
                    .setDepth(2)
                    .setStrokeStyle(4, 0xff0000);

                const nextText = scene.add.text(ex, ey, `STAIRS DOWN\nTO LEVEL ${level + 1}`, {
                    fontSize: '12px', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 3
                }).setDepth(4).setOrigin(0.5);

                this.transitionMarkers.push({
                    x: ex, y: ey, radius: tileSize * 1.5, targetMap: 'dungeon',
                    dungeonId: dungeonId, // Persist ID
                    dungeonLevel: level + 1, marker: nextMarker, text: nextText
                });
            }

            scene.mapWidth = dungeon.width;
            scene.mapHeight = dungeon.height;
            scene.physics.world.setBounds(0, 0, dungeon.width * tileSize, dungeon.height * tileSize);

            console.log(`✅ Dungeon Level ${level} created`);

            // Play Dungeon Music
            if (typeof playBackgroundMusic === 'function') playBackgroundMusic('dungeon');

            // Update Pathfinding Grid
            if (typeof pathfinder === 'undefined' && typeof AStarPathfinding !== 'undefined') {
                window.pathfinder = new AStarPathfinding(tileSize);
            }
            if (typeof pathfinder !== 'undefined' && pathfinder) {
                pathfinder.initializeGrid(dungeon.mapData);
            }

        } catch (e) {
            console.error("Error creating dungeon:", e);
            this.createWildernessMap();
        }
    },

    /**
     * Generate Procedural Dungeon Data
     */
    /**
     * Generate Procedural Dungeon Data
     */
    generateDungeon(level, config, tileset, seedOverride = null) {
        // config has width, height, roomCount {min, max}, roomSize {min, max}, corridorWidth
        const width = config.width || 50;
        const height = config.height || 50;
        const seed = seedOverride !== null ? seedOverride : Date.now();

        let seedValue = seed;
        const random = () => {
            seedValue = (seedValue * 9301 + 49297) % 233280;
            return seedValue / 233280;
        };
        const between = (min, max) => Math.floor(random() * (max - min + 1)) + min;

        const dungeon = {
            level, seed, width, height,
            rooms: [], corridors: [], mapData: [],
            entrance: null, exit: null,
            tileset: tileset // Store tileset info
        };

        for (let y = 0; y < height; y++) {
            dungeon.mapData[y] = [];
            for (let x = 0; x < width; x++) {
                dungeon.mapData[y][x] = 1; // Start with all floors (wait, logic was 1=floor?)
                // Actually based on original code:
                // 362: if (dungeon.mapData[y][x] === 1) { // Floor
                // But typically fill with walls (0) and carve floors (1). 
                // Original code line 463: dungeon.mapData[y][x] = 1; // Start with all floors
                // Wait, if it starts with all floors, then it carves walls?
                // Line 516: if (!floorTiles.has) mapData = 0 (Wall).
                // So effectively it fills with walls later.
            }
        }

        const minRooms = config.roomCount ? config.roomCount.min : 8;
        const maxRooms = config.roomCount ? config.roomCount.max : 12;
        const roomCount = between(minRooms, maxRooms);

        const rooms = [];
        for (let i = 0; i < roomCount; i++) {
            let attempts = 0;
            while (attempts < 50) {
                const minSize = config.roomSize ? config.roomSize.min : 3;
                const maxSize = config.roomSize ? config.roomSize.max : 8;

                const rw = between(minSize, maxSize);
                const rh = between(minSize, maxSize);
                const rx = between(2, width - rw - 2);
                const ry = between(2, height - rh - 2);
                const newRoom = { x: rx, y: ry, width: rw, height: rh, centerX: rx + Math.floor(rw / 2), centerY: ry + Math.floor(rh / 2) };

                let overlap = false;
                for (const r of rooms) {
                    if (rx < r.x + r.width && rx + rw > r.x && ry < r.y + r.height && ry + rh > r.y) {
                        overlap = true;
                        break;
                    }
                }
                if (!overlap) {
                    rooms.push(newRoom);
                    break;
                }
                attempts++;
            }
        }
        dungeon.rooms = rooms;
        if (rooms.length < 2) {
            rooms.push({ x: 5, y: 5, width: 5, height: 5, centerX: 7, centerY: 7 });
            rooms.push({ x: width - 10, y: height - 10, width: 5, height: 5, centerX: width - 7, centerY: height - 7 });
        }

        const floorTiles = new Set();
        rooms.forEach(r => {
            for (let y = r.y; y < r.y + r.height; y++) {
                for (let x = r.x; x < r.x + r.width; x++) {
                    floorTiles.add(`${x},${y}`);
                }
            }
        });

        const corridorWidth = config.corridorWidth || 1;

        for (let i = 0; i < rooms.length - 1; i++) {
            const r1 = rooms[i];
            const r2 = rooms[i + 1];
            this.carvePath(r1.centerX, r1.centerY, r2.centerX, r2.centerY, floorTiles, corridorWidth);
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!floorTiles.has(`${x},${y}`)) {
                    dungeon.mapData[y][x] = 0;
                }
            }
        }

        dungeon.entrance = { x: rooms[0].centerX, y: rooms[0].centerY };
        dungeon.exit = { x: rooms[rooms.length - 1].centerX, y: rooms[rooms.length - 1].centerY };
        return dungeon;
    },

    carvePath(x1, y1, x2, y2, floorSet, width = 1) {
        const halfW = Math.floor(width / 2) || 0;
        // Simple L-shape: Horizontal then Vertical

        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        for (let x = minX; x <= maxX; x++) {
            for (let w = -halfW; w <= halfW + (width % 2 === 0 ? -1 : 0); w++) {
                floorSet.add(`${x},${y1 + w}`);
            }
        }

        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        // Connect at x2
        for (let y = minY; y <= maxY; y++) {
            for (let w = -halfW; w <= halfW + (width % 2 === 0 ? -1 : 0); w++) {
                floorSet.add(`${x2 + w},${y}`);
            }
        }
    },


    transitionToMap(targetMap, level = 1, dungeonId = null) {
        const scene = this.scene;

        // Safety: If level is actually the marker object (legacy call from somewhere else), extract data
        if (typeof level === 'object') {
            const config = level;
            level = config.dungeonLevel || 1;
            dungeonId = config.dungeonId || null;
            console.log('[MapManager] Adapted object argument to params', { level, dungeonId });
        }

        // RESET LOGIC: If checking into Level 1 from Wilderness/Town, reset the specific dungeon
        // This makes the dungeon REPEATABLE and ensures boss respawns.
        if (targetMap === 'dungeon' && level === 1 && this.currentMap !== 'dungeon') {
            const idToReset = dungeonId || 'tower_dungeon';
            console.log(`♻️ Resetting dungeon state for ${idToReset}...`);

            // Clear cache for this dungeon
            Object.keys(this.dungeonCache).forEach(key => {
                if (key.startsWith(idToReset)) {
                    delete this.dungeonCache[key];
                }
            });

            // Clear completion flags for this dungeon
            Object.keys(this.dungeonCompletions).forEach(key => {
                // Check if key is just 'level_X' (legacy) or 'id_level_X'
                if (key.startsWith(idToReset) || key.startsWith('level_')) {
                    // Be careful with legacy 'level_' keys if we have multiple dungeons. 
                    // ideally we migrate to prefixed keys.
                    // For now, if we are entering THIS dungeon, we assume legacy keys might belong to it 
                    // or we just clear them to be safe (since we only have one active dungeon usually).
                    delete this.dungeonCompletions[key];
                }
            });

            this.currentDungeon = null;
        }

        // SAVE STATE: When entering dungeon from non-dungeon
        if (targetMap === 'dungeon' && this.currentMap !== 'dungeon') {
            this.lastMap = this.currentMap;
            // Access player from global or scene
            if (typeof player !== 'undefined') {
                this.lastPlayerX = player.x;
                this.lastPlayerY = player.y;
                console.log(`[MapManager] Saved state: ${this.lastMap} @ ${this.lastPlayerX.toFixed(0)},${this.lastPlayerY.toFixed(0)}`);
            }
        }

        // Stop player movement immediately
        if (typeof player !== 'undefined' && player.body) {
            player.body.setVelocity(0, 0);
            if (scene) {
                scene.isMovingToClick = false;
                scene.clickMoveTarget = null;
                scene.clickTargetEntity = null;
            }
        }

        // Clear quest markers
        if (typeof clearAllQuestMarkers === 'function') {
            clearAllQuestMarkers();
        } else if (typeof window.clearAllQuestMarkers === 'function') {
            window.clearAllQuestMarkers();
        }

        if (typeof monsters !== 'undefined') {
            monsters.forEach(m => {
                if (m) {
                    if (m.hpBarBg && m.hpBarBg.active) m.hpBarBg.destroy();
                    if (m.hpBar && m.hpBar.active) m.hpBar.destroy();
                    if (m.active) m.destroy();
                }
            });
            monsters.length = 0;
        }

        this.dungeonWalls = [];

        if (typeof npcs !== 'undefined') {
            npcs.forEach(n => {
                if (n.interactionIndicator && n.interactionIndicator.active) {
                    n.interactionIndicator.destroy();
                }
                if (n.nameText && n.nameText.active) {
                    n.nameText.destroy();
                }
                if (n.active) n.destroy();
            });
            npcs.length = 0;
        }

        this.buildings.forEach(b => {
            if (b.rect && b.rect.active) b.rect.destroy();
            if (b.label && b.label.active) b.label.destroy();
        });
        this.buildings = [];

        this.transitionMarkers.forEach(m => {
            if (m.marker && m.marker.active) m.marker.destroy();
            if (m.text && m.text.active) m.text.destroy();
        });
        this.transitionMarkers = [];

        // Aggressive cleanup: destroy all world objects that aren't the player
        // This catches orphaned graphics, particles, etc.
        const children = scene.children.list.filter(c =>
            c !== player &&
            (c.scrollFactorX > 0 || c.scrollFactorY > 0) &&
            c.type !== 'TilemapLayer' // If using tilemaps, but we use rectangles
        );
        children.forEach(c => c.destroy());

        this.currentMap = targetMap;

        if (targetMap === 'town') {
            this.createTownMap();
        } else if (targetMap === 'wilderness') {
            this.createWildernessMap();
            if (typeof spawnInitialMonsters === 'function') {
                spawnInitialMonsters.call(scene, scene.mapWidth * scene.tileSize, scene.mapHeight * scene.tileSize);
            }
        } else if (targetMap === 'dungeon') {
            this.createDungeonMap(dungeonId || 'tower_dungeon', level); // Default fallback
            if (typeof spawnDungeonMonsters === 'function') {
                spawnDungeonMonsters();
            } else {
                console.log("Spawn dungeon monsters logic missing or global.");
            }
        }

        scene.cameras.main.startFollow(player);
        scene.cameras.main.startFollow(player);
        console.log(`Transitioned to ${targetMap}`);

        // RESTORE STATE: If returning to the previous map
        if (targetMap === this.lastMap && (targetMap === 'town' || targetMap === 'wilderness')) {
            if (typeof player !== 'undefined') {
                player.x = this.lastPlayerX;
                player.y = this.lastPlayerY;
                console.log(`[MapManager] Restored position to ${player.x.toFixed(0)},${player.y.toFixed(0)}`);
            }
            // Optional: clear lastMap so we don't accidentally restore again? 
            // Better to keep it until next dungeon entry overwrites it, or clear it here.
            // Clearing it is safer to prevent weird jumps if we warp around later.
            this.lastMap = null;
        }

        // Notify UQE if exists
        if (window.uqe && window.uqe.eventBus) {
            window.uqe.eventBus.emit('map_entered', { map: targetMap, level: level, dungeonId: dungeonId });
        }
    },

    /**
     * Load and process dungeon tilesets
     */
    loadDungeonTilesets() {
        const scene = this.scene;
        // Parse dungeon tileset metadata and create texture frames
        try {
            if (scene.cache.text.exists('dungeon_floor_metadata')) {
                const floorMetadataText = scene.cache.text.get('dungeon_floor_metadata');
                this.dungeonTilesets.floorMetadata = JSON.parse(floorMetadataText);

                // Create texture frames for floor tiles
                if (scene.textures.exists('dungeon_floor_tileset')) {
                    this.createTilesetFrames('dungeon_floor_tileset', this.dungeonTilesets.floorMetadata, 'floor');
                    console.log('✅ Dungeon floor tileset image loaded and frames created');
                } else {
                    console.warn('⚠️ Dungeon floor tileset image not found');
                }

                this.buildDungeonTileLookup('floor');
                console.log('✅ Dungeon floor tileset metadata loaded');
            } else {
                console.warn('⚠️ Dungeon floor metadata not found in cache');
            }

            if (scene.cache.text.exists('dungeon_wall_metadata')) {
                console.log('📋 Found dungeon_wall_metadata in cache');
                const wallMetadataText = scene.cache.text.get('dungeon_wall_metadata');
                this.dungeonTilesets.wallMetadata = JSON.parse(wallMetadataText);
                console.log('📋 Parsed wall metadata, tiles:', this.dungeonTilesets.wallMetadata?.tileset_data?.tiles?.length || 0);

                // Create texture frames for wall tiles
                if (scene.textures.exists('dungeon_wall_tileset')) {
                    this.createTilesetFrames('dungeon_wall_tileset', this.dungeonTilesets.wallMetadata, 'wall');
                    console.log('✅ Dungeon wall tileset image loaded and frames created');
                } else {
                    console.warn('⚠️ Dungeon wall tileset image not found in textures');
                }

                this.buildDungeonTileLookup('wall');
                console.log('✅ Dungeon wall tileset metadata loaded');
            } else {
                console.warn('⚠️ Dungeon wall metadata not found in cache');
            }
        } catch (e) {
            console.warn('⚠️ Could not load dungeon tileset metadata:', e);
            console.error(e.stack);
        }
    },

    /**
     * Create frames for tileset based on metadata
     */
    createTilesetFrames(textureKey, metadata, type) {
        const scene = this.scene;
        if (!metadata || !metadata.tileset_data || !metadata.tileset_data.tiles) {
            console.error(`❌ Invalid metadata for ${type} tileset`);
            return;
        }

        const texture = scene.textures.get(textureKey);
        const tiles = metadata.tileset_data.tiles;

        tiles.forEach(tile => {
            // Assuming tile has id, x, y, width, height properties
            // If frame already exists, don't recreate? Phaser handles this but good to be safe.
            // ID might be number, convert to string for frame name?
            // Original code likely used tile.id as frame name or similar.
            // Let's assume frame name is just the ID.

            const frameName = tile.id;
            // The metadata likely contains x, y, width, height
            // We need to add the frame to the texture
            if (!texture.has(frameName)) {
                texture.add(frameName, 0, tile.x, tile.y, tile.width, tile.height);
            }
        });
    },

    /**
     * Build lookup map for tiles
     */
    buildDungeonTileLookup(type) {
        // Organize tiles by tags or properties if available
        // For now, we'll just ensure the lookup object is populated with the raw list or categorized
        // Replicating basic functionality: just ensure it's ready for use
        // If the original game logic used specific lookups (e.g., getting a 'corner' tile), 
        // we might need to categorize them. 
        // Given I don't have the original code, I'll assume it maps tags/types to arrays of tile IDs.

        const metadata = type === 'floor' ? this.dungeonTilesets.floorMetadata : this.dungeonTilesets.wallMetadata;
        const lookup = type === 'floor' ? this.dungeonTilesets.floorTileLookup : this.dungeonTilesets.wallTileLookup;

        if (!metadata || !metadata.tileset_data || !metadata.tileset_data.tiles) return;

        // Clear lookup
        for (const key in lookup) delete lookup[key];

        metadata.tileset_data.tiles.forEach(tile => {
            // Assuming tile has 'tags' or 'type' property
            if (tile.tags && Array.isArray(tile.tags)) {
                tile.tags.forEach(tag => {
                    if (!lookup[tag]) lookup[tag] = [];
                    lookup[tag].push(tile.id);
                });
            }
            // Fallback: add by ID
            lookup[tile.id] = tile;
        });
    }
};

if (typeof window !== 'undefined') {
    window.MapManager = MapManager;
}
