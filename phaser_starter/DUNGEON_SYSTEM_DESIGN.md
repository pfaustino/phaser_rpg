# Procedural Dungeon System Design

## Overview
This document outlines the design for implementing a procedural dungeon system that integrates with the existing town/wilderness map system.

## Current System Architecture

### Existing Map System
- **Single Scene**: All maps share one Phaser scene
- **Map Types**: `town` and `wilderness` (stored in `currentMap` variable)
- **Transition System**: Uses `transitionMarkers` array with collision detection
- **Map Creation**: Functions `createTownMap()` and `createWildernessMap()` generate maps on-demand
- **Cleanup**: Maps are destroyed and recreated when transitioning (tiles, buildings, NPCs, monsters cleared)

### Current Wilderness Map
- **Size**: Configurable `mapWidth` x `mapHeight` (typically 50x50 tiles)
- **Tile Types**: Grass (90%), Dirt (10%), Stone (5%), Walls (edges)
- **Features**: Random tile variety, exit marker at top center
- **Monsters**: Spawned randomly after map creation
- **No Structure**: Completely open, no rooms or corridors

---

## Proposed Dungeon System

### 1. Architecture Changes

#### Map Type Extension
```javascript
// Current
let currentMap = 'town'; // 'town' or 'wilderness'

// Proposed
let currentMap = 'town'; // 'town', 'wilderness', or 'dungeon'
let currentDungeon = null; // Dungeon data structure
let dungeonLevel = 1; // Current floor level
```

#### New Map Type: 'dungeon'
- Procedurally generated rooms and corridors
- Multiple floors/levels
- Entrance/exit points between levels
- Different from wilderness: structured, enclosed spaces

---

### 2. Dungeon Generation Algorithm

#### Option A: Room-Based Generation (Recommended)
**Algorithm**: Generate rooms, then connect them with corridors

**Steps**:
1. **Room Generation**
   - Create N rooms (5-10 for small dungeon, 10-20 for large)
   - Each room: random width/height (min 3x3, max 8x8 tiles)
   - Place rooms randomly but ensure no overlaps
   - Keep rooms away from map edges (buffer zone)

2. **Corridor Generation**
   - Connect rooms using A* or simple pathfinding
   - Create corridors (1-2 tiles wide)
   - Ensure all rooms are reachable

3. **Wall Placement**
   - Fill entire map with walls
   - Carve out rooms and corridors
   - Add outer walls around dungeon perimeter

4. **Feature Placement**
   - Entrance: First room (always accessible)
   - Exit/Stairs: Last room or random room
   - Treasure rooms: Random rooms with better loot
   - Monster spawns: Random rooms (avoid entrance)

**Advantages**:
- Predictable structure
- Guaranteed connectivity
- Easy to add features
- Good performance

**Disadvantages**:
- Can feel repetitive
- Less organic than cave systems

#### Option B: Cellular Automata (Cave-like)
**Algorithm**: Use cellular automata to create cave-like dungeons

**Steps**:
1. Fill map randomly (45% floor, 55% wall)
2. Apply cellular automata rules (4-5 iterations)
3. Remove isolated regions (keep largest)
4. Add entrance/exit
5. Ensure connectivity

**Advantages**:
- More organic, natural feel
- Unique each time
- Good for cave-themed dungeons

**Disadvantages**:
- Less control over structure
- May create unreachable areas
- Harder to guarantee features

**Recommendation**: Start with **Option A (Room-Based)** for better control and easier feature placement.

---

### 3. Implementation Structure

#### Dungeon Data Structure
```javascript
let currentDungeon = {
    level: 1,
    seed: null, // Optional: for reproducible generation
    rooms: [], // Array of {x, y, width, height, type}
    corridors: [], // Array of corridor paths
    entrance: {x, y}, // Entrance position
    exit: {x, y}, // Exit/stairs position
    mapData: [], // 2D array: 0=wall, 1=floor, 2=door, etc.
    width: 40, // Tiles
    height: 40, // Tiles
    tileSize: 32
};
```

#### Room Types
```javascript
const ROOM_TYPES = {
    ENTRANCE: 'entrance',
    EXIT: 'exit',
    TREASURE: 'treasure',
    COMBAT: 'combat',
    BOSS: 'boss',
    NORMAL: 'normal'
};
```

---

### 4. Integration with Current System

#### A. Map Transition System

**Current Flow**:
```
Town → Wilderness (via transition marker)
Wilderness → Town (via exit marker)
```

**Proposed Flow**:
```
Town → Wilderness (via transition marker)
Wilderness → Town (via exit marker)
Wilderness → Dungeon Entrance (new transition marker)
Dungeon → Dungeon Next Level (stairs)
Dungeon → Wilderness (exit to surface)
```

#### B. Transition Marker Addition

**In Wilderness Map**:
- Add dungeon entrance markers (scattered around map)
- Visual: Stone archway, glowing portal, or cave entrance
- When player enters: Generate new dungeon level

**In Dungeon**:
- Exit marker at entrance (return to wilderness)
- Stairs marker at exit (go deeper)
- Final level: Boss room, then exit to wilderness

#### C. Map Creation Function

```javascript
function createDungeonMap(level = 1) {
    const scene = game.scene.scenes[0];
    const tileSize = 32;
    
    // Generate dungeon structure
    currentDungeon = generateDungeon(level, 40, 40); // 40x40 tiles
    
    // Clear previous map
    clearMap();
    
    // Create tiles from dungeon.mapData
    for (let y = 0; y < currentDungeon.height; y++) {
        for (let x = 0; x < currentDungeon.width; x++) {
            const tileType = currentDungeon.mapData[y][x];
            // 0 = wall, 1 = floor, 2 = door, etc.
            createDungeonTile(x, y, tileType, tileSize);
        }
    }
    
    // Place entrance/exit markers
    createDungeonMarkers();
    
    // Spawn monsters in combat rooms
    spawnDungeonMonsters();
    
    // Update currentMap
    currentMap = 'dungeon';
}
```

#### D. Modified transitionToMap Function

```javascript
function transitionToMap(targetMap, dungeonLevel = 1) {
    // ... existing cleanup code ...
    
    // Create new map
    if (targetMap === 'town') {
        createTownMap();
        initializeNPCs();
    } else if (targetMap === 'wilderness') {
        createWildernessMap();
        spawnInitialMonsters(...);
    } else if (targetMap === 'dungeon') {
        createDungeonMap(dungeonLevel);
        spawnDungeonMonsters();
    }
    
    currentMap = targetMap;
    // ... rest of function ...
}
```

---

### 5. Dungeon-Specific Features

#### A. Tile Types
- **Walls**: Stone/dark tiles (impassable)
- **Floors**: Stone floor tiles (walkable)
- **Doors**: Special tiles (can be locked, require keys)
- **Stairs**: Transition points between levels
- **Traps**: Hidden floor tiles (damage on step)

#### B. Monster Spawning
- **Room-Based**: Monsters spawn in specific rooms (not corridors)
- **Density**: Higher monster density than wilderness
- **Level Scaling**: Stronger monsters on deeper levels
- **Boss Rooms**: Special boss monsters on final level

#### C. Loot System
- **Treasure Rooms**: Guaranteed loot chests
- **Chests**: Spawn in rooms (not corridors)
- **Better Loot**: Higher quality items in dungeons
- **Boss Loot**: Special rewards on boss defeat (resets with dungeon)
- **Keys**: Special items to unlock doors
- **Farming**: Boss resets allow repeated loot farming

#### D. Lighting/Atmosphere
- **Darker**: Lower brightness than wilderness
- **Torches**: Light sources in rooms
- **Fog of War**: Optional - reveal rooms as explored
- **Ambient Sounds**: Echo, dripping water, etc.

---

### 6. Impact on Wilderness Map

#### A. Minimal Changes Required
The wilderness map can remain **mostly unchanged**. Only additions:

1. **Dungeon Entrance Markers**
   ```javascript
   // In createWildernessMap(), add:
   function createDungeonEntrances() {
       const numEntrances = 2-3; // Scattered around map
       for (let i = 0; i < numEntrances; i++) {
           const x = random position (away from edges);
           const y = random position (away from edges);
           
           const entrance = scene.add.rectangle(x, y, tileSize * 2, tileSize * 2, 0x444444, 0.8)
               .setDepth(3).setStrokeStyle(3, 0x888888);
           
           const text = scene.add.text(x, y, 'DUNGEON\nENTRANCE', {...})
               .setDepth(4);
           
           transitionMarkers.push({
               x, y,
               radius: tileSize * 1.5,
               targetMap: 'dungeon',
               marker: entrance,
               text: text
           });
       }
   }
   ```

2. **Visual Distinction**
   - Different visual style (stone archway, cave mouth, etc.)
   - Optional: Quest marker if dungeon is quest-related

#### B. No Breaking Changes
- Wilderness map generation stays the same
- Existing transition system works
- Monsters, items, NPCs unaffected
- Only **additive** changes

---

### 7. Dungeon Generation Code Structure

#### Core Functions

```javascript
// Main generation function
function generateDungeon(level, width, height) {
    const dungeon = {
        level: level,
        width: width,
        height: height,
        rooms: [],
        corridors: [],
        mapData: createEmptyMap(width, height), // All walls
        entrance: null,
        exit: null
    };
    
    // Step 1: Generate rooms
    dungeon.rooms = generateRooms(dungeon, 8-12); // 8-12 rooms
    
    // Step 2: Connect rooms with corridors
    dungeon.corridors = connectRooms(dungeon);
    
    // Step 3: Carve rooms and corridors into map
    carveRooms(dungeon);
    carveCorridors(dungeon);
    
    // Step 4: Place features
    placeEntrance(dungeon);
    placeExit(dungeon);
    placeTreasureRooms(dungeon);
    
    return dungeon;
}

function generateRooms(dungeon, count) {
    const rooms = [];
    const minRoomSize = 3;
    const maxRoomSize = 8;
    const maxAttempts = 200;
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let placed = false;
        
        while (!placed && attempts < maxAttempts) {
            const width = Phaser.Math.Between(minRoomSize, maxRoomSize);
            const height = Phaser.Math.Between(minRoomSize, maxRoomSize);
            const x = Phaser.Math.Between(2, dungeon.width - width - 2);
            const y = Phaser.Math.Between(2, dungeon.height - height - 2);
            
            const newRoom = { x, y, width, height, type: 'normal' };
            
            // Check for overlaps
            if (!rooms.some(room => roomsOverlap(newRoom, room))) {
                rooms.push(newRoom);
                placed = true;
            }
            attempts++;
        }
    }
    
    return rooms;
}

function connectRooms(dungeon) {
    const corridors = [];
    
    // Simple: Connect each room to the next
    for (let i = 0; i < dungeon.rooms.length - 1; {
        const room1 = dungeon.rooms[i];
        const room2 = dungeon.rooms[i + 1];
        
        // Create L-shaped corridor
        const corridor = createLShapedCorridor(
            room1.centerX, room1.centerY,
            room2.centerX, room2.centerY
        );
        
        corridors.push(corridor);
    }
    
    return corridors;
}

function carveRooms(dungeon) {
    dungeon.rooms.forEach(room => {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                dungeon.mapData[y][x] = 1; // Floor
            }
        }
    });
}

function carveCorridors(dungeon) {
    dungeon.corridors.forEach(corridor => {
        corridor.path.forEach(point => {
            dungeon.mapData[point.y][point.x] = 1; // Floor
        });
    });
}
```

---

### 8. Visual Implementation

#### Tile Assets Needed
- **Stone Wall**: Dark gray/stone texture
- **Stone Floor**: Lighter stone floor texture
- **Door**: Special door sprite (optional: animated)
- **Stairs**: Staircase sprite (up/down)

#### Rendering
```javascript
function createDungeonTile(x, y, tileType, tileSize) {
    const scene = game.scene.scenes[0];
    let tile;
    
    switch(tileType) {
        case 0: // Wall
            tile = scene.add.image(x * tileSize, y * tileSize, 'stone_wall')
                .setOrigin(0).setDepth(0);
            break;
        case 1: // Floor
            tile = scene.add.image(x * tileSize, y * tileSize, 'stone_floor')
                .setOrigin(0).setDepth(0);
            break;
        case 2: // Door
            tile = scene.add.image(x * tileSize, y * tileSize, 'door')
                .setOrigin(0).setDepth(1);
            break;
        // ... etc
    }
}
```

---

### 9. Player Experience Flow

#### Example Dungeon Run
1. **Wilderness Exploration**
   - Player finds dungeon entrance marker
   - Visual: Stone archway with "DUNGEON ENTRANCE" text

2. **Entering Dungeon**
   - Player walks into marker
   - Transition: `transitionToMap('dungeon', 1)`
   - Generate Level 1 dungeon
   - Player spawns at entrance

3. **Dungeon Exploration**
   - Explore rooms and corridors
   - Fight monsters (higher density)
   - Find treasure chests
   - Discover stairs to next level

4. **Going Deeper**
   - Player enters stairs marker
   - Transition: `transitionToMap('dungeon', 2)`
   - Generate Level 2 (harder, bigger)
   - Repeat for multiple levels

5. **Exiting Dungeon**
   - Find exit marker (final level or any level)
   - Transition: `transitionToMap('wilderness')`
   - Return to wilderness at entrance location

---

### 10. Advantages of This Approach

#### ✅ Non-Breaking
- Wilderness map unchanged
- Existing systems work
- Only additive features

#### ✅ Scalable
- Easy to add more dungeon types
- Can have multiple dungeons in wilderness
- Level progression system ready

#### ✅ Flexible
- Can make dungeons quest-specific
- Can have hand-crafted dungeons too
- Easy to add features (traps, puzzles, etc.)

#### ✅ Performance
- Dungeons generated once per entry
- Can cache dungeon data
- No impact on wilderness performance

---

### 11. Future Enhancements

#### Phase 1 (Basic)
- Room-based generation
- Basic corridors
- Entrance/exit
- Monster spawning

#### Phase 2 (Enhanced)
- Multiple dungeon types (cave, crypt, tower)
- Locked doors and keys
- Traps
- Boss rooms

#### Phase 3 (Advanced)
- Fog of war
- Mini-map
- Dungeon themes (fire, ice, poison)
- Procedural quests tied to dungeons

---

## Implementation Priority

### Recommended Order:
1. **Dungeon data structure** - Define dungeon object
2. **Room generation** - Basic room placement
3. **Corridor generation** - Connect rooms
4. **Map rendering** - Display dungeon tiles
5. **Transition system** - Add dungeon to map switching
6. **Wilderness entrances** - Add entrance markers
7. **Monster spawning** - Room-based spawns
8. **Multiple levels** - Stairs and level progression

### Estimated Time:
- **Basic System**: 4-6 hours
- **With Features**: 8-12 hours
- **Polished**: 12-16 hours

---

## Dungeon Persistence Strategy

### Current Save System Analysis
The existing save system (`saveGame()` / `loadGame()`) saves:
- ✅ Player stats (HP, mana, XP, level, etc.)
- ✅ Inventory and equipment
- ✅ Player position
- ✅ Quests and quest progress
- ❌ **Does NOT save**: Current map type, map state, monsters, items on ground

**Current Behavior**: On load, player is restored but map is regenerated (town/wilderness recreated).

### Dungeon Persistence Options

#### Option 1: Regenerate on Each Entry (Simplest) ⚡ **RECOMMENDED FOR MVP**
**Behavior**:
- Dungeon regenerated every time player enters
- Exit and re-enter = completely new dungeon
- Save/load = dungeon regenerated (same as current map behavior)

**Implementation**:
```javascript
function transitionToMap(targetMap, dungeonLevel = 1) {
    // ... cleanup ...
    
    if (targetMap === 'dungeon') {
        // Always generate fresh dungeon
        currentDungeon = generateDungeon(dungeonLevel, 40, 40);
        createDungeonMap(dungeonLevel);
    }
}
```

**Pros**:
- ✅ Simplest implementation
- ✅ No memory concerns
- ✅ Always fresh experience
- ✅ Consistent with current map regeneration
- ✅ No save/load complexity

**Cons**:
- ❌ Player loses dungeon progress when exiting
- ❌ Can't return to same dungeon
- ❌ Feels less "realistic"

**Use Case**: Good for MVP, roguelike-style gameplay

---

#### Option 2: Persist Until Game Exit (Session-Based)
**Behavior**:
- Dungeon generated once per session
- Exit and re-enter = same dungeon (until game restarts)
- Save/load = dungeon regenerated (new session)

**Implementation**:
```javascript
let dungeonCache = {}; // Key: "level_1", "level_2", etc.

function transitionToMap(targetMap, dungeonLevel = 1) {
    // ... cleanup ...
    
    if (targetMap === 'dungeon') {
        const cacheKey = `level_${dungeonLevel}`;
        
        // Check cache first
        if (!dungeonCache[cacheKey]) {
            dungeonCache[cacheKey] = generateDungeon(dungeonLevel, 40, 40);
        }
        
        currentDungeon = dungeonCache[cacheKey];
        createDungeonMap(dungeonLevel);
    }
}

// Clear cache on game exit (optional)
function clearDungeonCache() {
    dungeonCache = {};
}
```

**Pros**:
- ✅ Player can return to same dungeon in session
- ✅ Moderate complexity
- ✅ No save/load changes needed
- ✅ Better player experience

**Cons**:
- ❌ Lost on game restart
- ❌ Memory usage (stored in RAM)
- ❌ Need cache management

**Use Case**: Good balance between simplicity and player experience

---

#### Option 3: Full Persistence (Save/Load) 🎯 **BEST FOR FULL GAME**
**Behavior**:
- Dungeon generated once and saved
- Exit and re-enter = same dungeon
- Save/load = same dungeon restored
- **Boss Defeat = Dungeon Reset**: When boss is killed, dungeon resets to new one

**Implementation (Seed-Based - Small Save Files)**:
```javascript
// Save dungeon data - ONLY save seeds and completion state
function saveGame() {
    const saveData = {
        // ... existing save data ...
        currentMap: currentMap,
        dungeonLevel: dungeonLevel,
        
        // ONLY save minimal data - NOT full dungeon structures
        dungeonSeeds: {}, // Key: "level_1" -> seed number
        dungeonCompletions: {}, // Key: "level_1" -> true/false
        openedChests: {}, // Optional: Track opened chests per dungeon
        
        // Example structure:
        // dungeonSeeds: { "level_1": 1234567890, "level_2": 9876543210 }
        // dungeonCompletions: { "level_1": true, "level_2": false }
        
        // DO NOT save:
        // - Full mapData arrays (regenerate from seed)
        // - Room coordinates (regenerate from seed)
        // - Monster positions (regenerate on spawn)
        // - Item positions (regenerate on spawn)
    };
    
    // Build seeds object from cache
    Object.keys(dungeonCache).forEach(key => {
        if (dungeonCache[key] && dungeonCache[key].seed) {
            saveData.dungeonSeeds[key] = dungeonCache[key].seed;
        }
    });
    
    // Save completion states
    saveData.dungeonCompletions = dungeonCompletions;
    
    // ... save to localStorage ...
}

// Load dungeon data - Regenerate from seeds
function loadGame() {
    // ... load existing data ...
    
    // Restore dungeon seeds and completions
    if (saveData.dungeonSeeds) {
        // Rebuild cache from seeds (lazy - only when needed)
        // Don't regenerate all dungeons immediately, just store seeds
        Object.keys(saveData.dungeonSeeds).forEach(key => {
            const level = parseInt(key.replace('level_', ''));
            const seed = saveData.dungeonSeeds[key];
            const isCompleted = saveData.dungeonCompletions?.[key] || false;
            
            // Only cache if not completed (completed dungeons will regenerate)
            if (!isCompleted) {
                // Store seed for later regeneration
                dungeonCache[key] = { seed: seed, level: level };
            }
        });
    }
    
    dungeonCompletions = saveData.dungeonCompletions || {};
    
    // Restore current map if in dungeon
    if (saveData.currentMap === 'dungeon') {
        const dungeonKey = `level_${saveData.dungeonLevel}`;
        const isCompleted = dungeonCompletions[dungeonKey] || false;
        
        if (isCompleted) {
            // Generate new dungeon (was completed)
            currentDungeon = generateDungeon(saveData.dungeonLevel, 40, 40);
            dungeonCache[dungeonKey] = currentDungeon;
        } else if (dungeonCache[dungeonKey] && dungeonCache[dungeonKey].seed) {
            // Regenerate from saved seed
            currentDungeon = generateDungeon(
                saveData.dungeonLevel,
                40, 40,
                dungeonCache[dungeonKey].seed
            );
            dungeonCache[dungeonKey] = currentDungeon; // Update cache
        } else {
            // No saved dungeon, generate new
            currentDungeon = generateDungeon(saveData.dungeonLevel, 40, 40);
            dungeonCache[dungeonKey] = currentDungeon;
        }
        
        createDungeonMap(saveData.dungeonLevel);
    }
}
```

**Boss Defeat Reset System**:
```javascript
// Track dungeon completions
let dungeonCompletions = {}; // Key: "dungeon_1", "dungeon_2", etc.

// When boss is defeated
function onBossDefeated(dungeonLevel) {
    const dungeonKey = `dungeon_${dungeonLevel}`;
    
    // Mark dungeon as completed
    dungeonCompletions[dungeonKey] = true;
    
    // Clear dungeon from cache (force regeneration)
    delete dungeonCache[dungeonKey];
    currentDungeon = null;
    
    // Show completion message
    showDamageNumber(player.x, player.y - 40, 'Dungeon Cleared!', 0x00ffff);
    console.log(`✅ Dungeon level ${dungeonLevel} completed - will reset on next entry`);
    
    // Optional: Auto-save
    saveGame();
}

// Modified transition function to check completion
function transitionToMap(targetMap, level = 1) {
    // ... existing cleanup ...
    
    if (targetMap === 'dungeon') {
        const dungeonKey = `dungeon_${level}`;
        const isCompleted = dungeonCompletions[dungeonKey] || false;
        
        if (isCompleted) {
            // Generate new dungeon (boss was defeated)
            console.log(`🔄 Generating new dungeon level ${level} (previous one was completed)`);
            currentDungeon = generateDungeon(level, 40, 40);
            dungeonCache[dungeonKey] = currentDungeon;
            // Keep completion flag (so we know it was completed before)
        } else {
            // Check cache or generate new
            if (dungeonCache[dungeonKey]) {
                currentDungeon = dungeonCache[dungeonKey];
            } else {
                currentDungeon = generateDungeon(level, 40, 40);
                dungeonCache[dungeonKey] = currentDungeon;
            }
        }
        
        createDungeonMap(level);
        spawnDungeonMonsters();
    }
    
    currentMap = targetMap;
}
```

**Seed-Based Regeneration** (Recommended - Keeps Save Files Small):
```javascript
function generateDungeon(level, width, height, seed = null) {
    // Use seed for reproducible generation
    if (seed) {
        // Restore RNG state from seed (deterministic)
        Phaser.Math.RND.sow([seed]);
    } else {
        // Generate new random seed
        seed = Date.now() + Math.random() * 1000000;
        Phaser.Math.RND.sow([seed]);
    }
    
    // Generate dungeon (same seed = same dungeon)
    const dungeon = {
        level: level,
        seed: seed, // ONLY this gets saved (just a number!)
        width: width,
        height: height,
        rooms: [], // Generated from seed
        corridors: [], // Generated from seed
        mapData: [], // Generated from seed
        entrance: null, // Generated from seed
        exit: null // Generated from seed
    };
    
    // Generate rooms (deterministic from seed)
    dungeon.rooms = generateRooms(dungeon, 8-12);
    dungeon.corridors = connectRooms(dungeon);
    carveRooms(dungeon);
    carveCorridors(dungeon);
    placeEntrance(dungeon);
    placeExit(dungeon);
    
    // NOTE: Monsters, items, chests are NOT part of dungeon structure
    // They spawn dynamically when dungeon is loaded
    
    return dungeon;
}

// Key Point: Same seed = Same dungeon layout
// generateDungeon(1, 40, 40, 12345) always produces identical layout
// generateDungeon(1, 40, 40, 12345) === generateDungeon(1, 40, 40, 12345)
```

**Pros**:
- ✅ Full persistence across sessions
- ✅ Player can return to same dungeon after reload
- ✅ Most realistic experience
- ✅ **Seed-based = TINY save files** (only save numbers, not full structures)
- ✅ **Boss reset system**: Can reset dungeon after completion for replayability
- ✅ **Farming system**: Players can farm bosses for loot repeatedly
- ✅ **Efficient**: Regenerate layout from seed (fast, deterministic)

**Cons**:
- ❌ More complex implementation
- ❌ Need to modify save/load system
- ❌ Need deterministic generation (same seed = same dungeon)
- ❌ Need to handle edge cases (dungeon state changes)

**Save File Size Comparison**:
- **Full Dungeon Data**: ~50-200 KB per dungeon (rooms, corridors, mapData arrays)
- **Seed-Based**: ~100 bytes per dungeon (just a number!)
- **10 Dungeons**: Full = 500KB-2MB, Seed = 1KB

**What Actually Gets Saved**:
```javascript
// Example save data structure (TINY):
{
    dungeonSeeds: {
        "level_1": 1234567890,  // Just a number!
        "level_2": 9876543210
    },
    dungeonCompletions: {
        "level_1": true,  // Just a boolean!
        "level_2": false
    }
}
// Total: ~50 bytes for 10 dungeons vs 500KB+ for full data
```

**Boss Reset Feature**:
- When boss is defeated, mark dungeon as "completed"
- On next entry, generate new dungeon (new seed)
- Player can farm the same dungeon level repeatedly
- Completion state persists across saves
- Each completion = new dungeon layout + new boss loot

**Boss Defeat Detection Example**:
```javascript
// In monster death handler (when monster dies)
function onMonsterDeath(monster) {
    // Check if this was a boss monster
    if (monster.isBoss && currentMap === 'dungeon') {
        const dungeonLevel = dungeonLevel || 1;
        
        // Mark dungeon as completed
        onBossDefeated(dungeonLevel);
        
        // Give boss loot
        dropBossLoot(monster.x, monster.y, dungeonLevel);
        
        // Show completion message
        showDamageNumber(monster.x, monster.y, 'BOSS DEFEATED!', 0xff00ff);
    }
}

// Boss loot generation (better than normal monsters)
function dropBossLoot(x, y, level) {
    // Drop multiple items
    const numItems = 2 + Math.floor(level / 2); // More items on higher levels
    
    for (let i = 0; i < numItems; i++) {
        // Higher quality items from bosses
        const qualityRoll = Math.random();
        let quality = 'Common';
        if (qualityRoll < 0.1) quality = 'Legendary';
        else if (qualityRoll < 0.25) quality = 'Epic';
        else if (qualityRoll < 0.5) quality = 'Rare';
        else if (qualityRoll < 0.75) quality = 'Uncommon';
        
        const item = generateRandomItem(quality);
        dropItem(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-20, 20), item);
    }
    
    // Gold reward
    const goldReward = 100 * level;
    dropItem(x, y, { type: 'gold', amount: goldReward });
}
```

**Player Experience with Boss Reset**:
1. Enter dungeon → Generate Level 1
2. Explore and fight → Progress through rooms
3. Defeat boss → "DUNGEON CLEARED!" message, loot drops
4. Exit dungeon → Completion saved
5. Re-enter same dungeon → **New Level 1 generated** (different layout)
6. Defeat boss again → New loot, can repeat infinitely

**Use Case**: Best for full game release, most player-friendly

---

### Recommended Approach: **Hybrid (Progressive Implementation)**

#### Phase 1: Start with Option 1 (Regenerate)
- Simplest to implement
- Get dungeon system working
- Test gameplay

#### Phase 2: Upgrade to Option 2 (Session-Based)
- Add cache system
- Better player experience
- Still simple (no save/load changes)

#### Phase 3: Upgrade to Option 3 (Full Persistence with Seeds)
- Add seed-based generation
- Modify save/load system
- **Save only seeds (tiny files)**
- Full persistence

### Key Insight: Seed-Based Saves Are Tiny! 🎯

**You DON'T save full dungeon data!** With seed-based generation:
- **Save**: Just the seed number (e.g., `1234567890`)
- **Load**: Regenerate entire dungeon from seed
- **Result**: Same dungeon every time, but save file is tiny

**Example**:
```javascript
// What you SAVE (50 bytes):
{
    dungeonSeeds: { "level_1": 1234567890 },
    dungeonCompletions: { "level_1": false }
}

// What you REGENERATE on load (not saved):
- All rooms (from seed)
- All corridors (from seed)
- Full mapData array (from seed)
- Entrance/exit positions (from seed)

// What you SPAWN dynamically (not saved):
- Monsters (spawn on map load)
- Items (spawn on map load)
- Chests (spawn on map load)
```

**Save File Impact**:
- **Without seeds**: 500KB-2MB for 10 dungeons
- **With seeds**: ~1KB for 10 dungeons
- **Savings**: 99.9% smaller!

---

### Dungeon State Considerations

#### What Should Persist?
- ✅ **Dungeon Layout**: Rooms, corridors, structure (until boss defeated)
- ✅ **Entrance/Exit Positions**: Fixed locations (until boss defeated)
- ✅ **Completion State**: Track which dungeons have been completed
- ❓ **Monsters**: Regenerate or persist? (Recommend: Regenerate)
- ❓ **Items/Chests**: Persist if opened? (Recommend: Track opened chests)
- ❓ **Explored Areas**: Fog of war state? (Future feature)

#### Recommended: **Layout Persists Until Boss Defeat, Then Resets**
- Dungeon structure stays the same (until boss defeated)
- **Boss Defeat = Complete Reset**: New layout, new monsters, new loot
- Monsters respawn (like wilderness)
- Chests can be marked as "opened" (don't respawn in same run)
- Items on ground: Regenerate (like current system)
- **Completion Tracking**: Save which dungeons are completed for reset logic

---

### Implementation Example: Option 2 (Session-Based)

```javascript
// Global dungeon cache
let dungeonCache = {};
let currentDungeon = null;
let dungeonLevel = 1;

function transitionToMap(targetMap, level = 1) {
    // ... existing cleanup ...
    
    if (targetMap === 'dungeon') {
        dungeonLevel = level;
        const cacheKey = `dungeon_${level}`;
        
        // Check if dungeon already generated this session
        if (dungeonCache[cacheKey]) {
            console.log(`📦 Using cached dungeon level ${level}`);
            currentDungeon = dungeonCache[cacheKey];
        } else {
            console.log(`🆕 Generating new dungeon level ${level}`);
            currentDungeon = generateDungeon(level, 40, 40);
            dungeonCache[cacheKey] = currentDungeon; // Cache it
        }
        
        createDungeonMap(level);
        spawnDungeonMonsters();
    }
    
    currentMap = targetMap;
}

// Optional: Clear cache when exiting game
// (Not needed if using Option 1, but useful for Option 2)
```

---

## Summary

The procedural dungeon system integrates seamlessly with the existing map system:

1. **Wilderness stays the same** - Only adds entrance markers
2. **New map type** - `'dungeon'` added to `currentMap`
3. **Room-based generation** - Predictable, controllable structure
4. **Transition system** - Works with existing `transitionToMap()`
5. **Scalable** - Easy to add features and dungeon types
6. **Persistence Strategy** - Choose based on game design:
   - **Option 1**: Regenerate (simplest, MVP)
   - **Option 2**: Session cache (balanced)
   - **Option 3**: Full save/load (most complete)

**Recommended**: Start with **Option 1** for MVP, upgrade to **Option 2** for better UX, then **Option 3** for full release.

The system is designed to be **non-breaking** and **additive**, making it safe to implement without affecting existing functionality.



