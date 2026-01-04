# Dynamic Quest System Guide

**Philosophy:** NO HARDCODING. Everything is Data-Driven.

This game uses the **Unified Quest Engine (UQE)**, which is designed to be fully data-driven. You should **never** hardcode quest offers, markers, or completion logic in JavaScript or even `dialogs.json` (unless for specific flavor overrides).

## 1. Architecture Overview

-   **Definitions**: `quests_v2.json` contains ALL quest data (title, description, giver, objectives, rewards, prerequisites).
-   **State Management**: `UnifiedQuestSystem.js` (UQE) traces quest states (Locked -> Available -> Active -> Completed).
-   **Visuals (Markers)**: `updateNPCIndicators` (in `game.js`) AUTOMATICALLY checks UQE for available quests and draws `!` or `?`.
-   **Interaction (Dialogs)**: `startDialog` (in `game.js`) AUTOMATICALLY injects "Accept Quest" buttons into NPC dialogs if UQE says a quest is available.

## 2. File Dependencies & Co-dependencies

The quest system relies on several other data files. Ensure IDs match exactly across these files.

| Quest Field | Dependency File | Description |
| :--- | :--- | :--- |
| `giver` | `npc.json` / `dialogs.json` | The Name of the NPC offering the quest. Must match the dialog Node Name or NPC definition. |
| `objectives.monsterId` | `monsters.json` | For `kill` objectives. Must match the `id` in `monsters.json` (e.g., `procedural_orc`). |
| `objectives.itemId` | `items.json` | For `collect` objectives. Must match the `id` in `items.json`. |
| `objectives.targetObjectId` | `interactables.json` | For `interact` objectives. Must match the `id` in `interactables.json` (e.g., `obelisk_town_center`). |
| `objectives.locationId` | `MapManager.js` (Logic) | For `explore_location`. These are currently logical IDs checked during map transitions or region overlapping. |
| `rewards.loreUnlock` | `milestones.json` | [Concept] If a quest rewards lore, it may trigger a milestone ID or referencing `lore.json`. |

## 3. Quest Types & Objective Schemas

When defining `objectives` in `quests_v2.json`, you must use one of the following supported `type`s.

### `talk`
Speak to a specific NPC.
```json
{
    "id": "talk_malik",
    "type": "talk",
    "npcId": "Elder Malik",
    "label": "Speak with Elder Malik",
    "target": 1
}
```

### `kill`
Defeat a specific number of monsters.
```json
{
    "id": "kill_slimes",
    "type": "kill",
    "monsterId": "procedural_slime", // Must match monsters.json
    "label": "Defeat Slimes",
    "target": 5
}
```

### `collect`
Gather items. The system automatically tracks inventory additions.
```json
{
    "id": "collect_herbs",
    "type": "collect",
    "itemId": "healing_herb", // Must match items.json
    "label": "Gather Healing Herbs",
    "target": 3
}
```

### `explore_location`
Visit a specific named region or map zone.
```json
{
    "id": "find_ruins",
    "type": "explore_location",
    "locationId": "temple_ruins",
    "label": "Locate the Temple Ruins",
    "target": 1
}
```

### `interact`
Interact with a world object (requires `F` key interaction).
```json
{
    "id": "touch_obelisk",
    "type": "interact",
    "targetObjectId": "obelisk_town_center", // Must match interactables.json
    "label": "Activate the Obelisk",
    "target": 1
}
```

### `survive`
Survive for a duration (often used with `startEvent`).
```json
{
    "id": "survive_ambush",
    "type": "survive",
    "label": "Survive the Ambush",
    "target": 60 // Seconds
}
```

### `level`
Reach a specific player level.
```json
{
    "id": "reach_L5",
    "type": "level",
    "label": "Reach Level 5",
    "target": 5
}
```

### `dynamic_spawn`
Spawns special temporary visual items/effects to collect (e.g., Mana Flux).
```json
{
    "id": "collect_flux",
    "type": "dynamic_spawn",
    "itemId": "stabilized_flux",
    "label": "Stabilize Mana Fluxes",
    "target": 12,
    "spawnConfig": { ... }  // see example in quests_v2.json
}
```

## 4. Requirements & Chains

Quests are linked via the `requires` field.

-   **Linear Chains**: Quests in a main story usually require the ID of the previous quest.
    *   Example: `main_01_002` requires `main_01_001`.
-   **Locking**: A quest will NOT appear (no marker, no dialog) until its `requires` quest is strictly `COMPLETED`.
-   **Step**: The `step` field is useful for UI ordering but does not enforce logic; `requires` is the logic enforcer.

## 5. The Auto-Injector (UQE Bridge)

When you talk to an NPC, the game runs this logic:
1.  **Check UQE Definitions**: "Does this NPC (`giver`) have any quests defined in `quests_v2.json`?"
2.  **Filter Availability**: "For each quest, is it: Not Active? Not Completed? Are Prerequisites Met?"
3.  **Inject Button**: If YES, it prepends a choice to the dialog:
    *   **Text**: `[Quest Title]` (or generic flavor text if configured)
    *   **Action**: `quest_accept_v2`
    *   **Logic**: No custom code needed. The button click triggers UQE to accept the quest.

## 6. How to Add a New Quest (Correct Way)

**Step 1: Edit `quests_v2.json`**
Add your new quest block.
```json
"main_03_001": {
    "id": "main_03_001",
    "title": "The New Threat",
    "description": "Investigate the northern caves.",
    "giver": "Captain Thorne",
    "requires": "main_02_004",
    "objectives": [ ... ],
    "rewards": { ... }
}
```

**Step 2: Reload the Game**
*   **Marker**: Captain Thorne will automatically show a `!` when `main_02_004` is complete.
*   **Dialog**: Captain Thorne will automatically match the marker and offer "The New Threat".

## 7. Troubleshooting

*   **"I see a marker but no dialog option"**: The Auto-Injector might be disabled or the NPC name in `dialogs.json` doesn't match the `giver` name in `quests_v2.json` exactly (check spaces!).
*   **"I see a dialog option but no marker"**: You likely HARDCODED the quest offer in `dialogs.json`. **Code Smell!** Remove the hardcoded entry and let the Auto-Injector handle it.
*   **"Marker won't appear"**: Check `requires`. Use `uqe.completedQuests` in the console to see if you actually finished the prerequisite.
