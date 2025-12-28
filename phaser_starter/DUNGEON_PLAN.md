# Implementation Plan - Data-Driven Dungeon System

To support the "Temple" and "Tower" quests and future moddability, we will implement a system where dungeon configurations are loaded from `dungeons.json`.

## User Review Required

> [!IMPORTANT]
> This change introduces a new data file `dungeons.json`. Modders must use this format to add new dungeons.
> The existing procedural generation in `MapManager.js` will be adapted to read parameters from this file.

## Proposed Changes

### 1. New Data File: `dungeons.json`
Define the schema for dungeons.
```json
{
  "dungeons": {
    "tower_dungeon": {
      "id": "tower_dungeon",
      "name": "Watchtower Basement",
      "levels": 3,
      "tileset": { "floor": "dungeon_floor", "wall": "dungeon_wall" },
      "generation": {
          "width": 50,
          "height": 50,
          "roomCount": { "min": 8, "max": 12 },
          "roomSize": { "min": 3, "max": 8 },
          "corridorWidth": 1
      },
      "monsters": [
        { "id": "echo_rat", "chance": 0.5 },
        { "id": "skeleton_miner", "minLevel": 2, "chance": 0.3 }
      ],
      "boss": { "level": 3, "monsterId": "echo_beholder" }
    },
    "temple_ruins": {
      "id": "temple_ruins",
      "name": "The Sunken Temple",
      "levels": 2,
      "tileset": { "floor": "temple_floor", "wall": "temple_wall" },
      "generation": {
          "width": 60,
          "height": 60,
          "roomCount": { "min": 10, "max": 15 },
          "roomSize": { "min": 6, "max": 12 },
          "corridorWidth": 2
      },
      "monsters": [ { "id": "corrupted_guardian", "chance": 0.4 }]
    }
  }
}
```

### 2. Update `MapManager.js`
- **Load `dungeons.json`**: In `init` or `preload`.
- **Refactor `createDungeonMap`**: Accept a `dungeonId` instead of just `level`.
- **Procedural Engine**: Update `generateDungeon` to use the parameters from JSON:
    - `width`/`height`: Map dimensions.
    - `roomCount`: Density of the dungeon.
    - `roomSize`: Size of rooms.
- **Quest Integration**: Update markers to use `dungeonId`.

### 3. Update `game.js` (Monster Spawning)
- Update `spawnDungeonMonsters` to accept a list of allowed monsters from the Dungeon Definition, rather than hardcoding.

## Verification Plan

### Automated Tests
- None (Visual/Gameplay feature).

### Manual Verification
1.  **Tower Dungeon**:
    -   Go to the Watchtower in Town (or Wilderness entrance).
    -   Enter Dungeon.
    -   Verify correct monsters spawn (Rats/Skeletons).
    -   Verify depth (3 levels).
2.  **Temple Dungeon**:
    -   Go to Temple Ruins entrance in Wilderness.
    -   Enter Dungeon.
    -   Verify correct monsters (Guardians).
    -   Verify name/theme.
3.  **Moddability**:
    -   Edit `dungeons.json` to change a monster type.
    -   Reload and verify change.
