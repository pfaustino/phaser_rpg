# Modularization Plan for `game.js`

This plan aims to break down the massive `game.js` file (14k+ lines) into smaller, more manageable modules. This will improve code readability, make testing easier, and facilitate collaborative development.

## Safety-First Approach

> [!IMPORTANT]
> To avoid breaking the game, we will follow an incremental, "verify-as-we-go" approach. We will not move to the next step until the current one is confirmed working.

1.  **Mandatory Backups**: Before any major change, we will ensure a fresh backup of the working `game.js` exists.
2.  **Incremental Extraction**: Instead of moving everything at once, we'll move one clear category (e.g., just `QUALITY_COLORS` first) to verify the linkage.
3.  **Global Namespace Preservation**: During extraction, we will ensure all extracted variables remain available on the `window` object to prevent "not defined" errors in the remaining 14k lines of `game.js`.
4.  **Verification Steps**: After each script inclusion in `index.html`, we'll check the console (if possible) or use `grep` to ensure no broken references were introduced.

## Proposed Changes

### Core Modules

#### [NEW] [Constants.js](file:///c:/rpg/phaser_starter/Constants.js)
- Extract all game configuration and static data from `game.js`.
- Includes `WEAPON_TYPES`, `PREFIXES`, `SUFFIXES`, `ITEM_SETS`, `QUALITY_COLORS`, and map/monster settings.

#### [NEW] [GameState.js](file:///c:/rpg/phaser_starter/GameState.js)
- Extract global state variables from the top of `game.js`.
- Includes `playerStats`, `inventoryVisible`, `currentMap`, `dungeonLevel`, etc.
- Provides a centralized state management object.

#### [NEW] [Utils.js](file:///c:/rpg/phaser_starter/Utils.js)
- Move pure utility functions from `game.js`.
- Includes item generation helpers (`getMaterialForQuality`, `buildItemName`), visual effect helpers, and mathematical utilities.

### Integration

#### [MODIFY] [index.html](file:///c:/rpg/phaser_starter/index.html)
- Include the new script files in the correct dependency order:
  1. `Constants.js`
  2. `GameState.js`
  3. `Utils.js`
  4. `quests.js`
  5. `game.js`

#### [MODIFY] [game.js](file:///c:/rpg/phaser_starter/game.js)
- Remove the extracted code.
- Update references to use the new global modules (e.g., `window.Constants`, `window.GameState`).

## Verification Plan

### Automated Checks
- **Script Dependency Check**: Use `grep` to verify that `game.js` no longer contains the extracted code but still has valid references.
- **Syntax Validation**: Ensure the new `.js` files are syntactically correct.

### Manual Verification
- **Functional Testing**: The user should verify the game loads and plays exactly as before after each incremental step.
  - Verify player movement and combat.
  - Check inventory and equipment systems.
  - Verify quest progress and completion.
- **Console Monitoring**: Monitor the browser console for any "not defined" errors or failed script loads.
sa