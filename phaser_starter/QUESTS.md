# Phaser RPG Quests Documentation

This document catalogs the current quest system and outlines future expansion plans for quest types and chains.

---

## Main Story Campaign: The Shattered Aegis

The world's protective barrier, the Shattered Aegis, is failing. This 15-chapter epic follows the player's journey from local investigator to the world's savior.

### Campaign Roadmap
- **Phase 1: The Local Breach (Chapters 1-3)**: Investigate quakes and the Watchtower mines.
- **Phase 2: The Spreading Echo (Chapters 4-6)**: Track corruption through forests and marshes.
- **Phase 3: The Crystalline Plains (Chapters 7-9)**: Traverse desolate peaks to find ancient temples.
- **Phase 4: The Core Descent (Chapters 10-12)**: Enter the heart of the subterranean empire.
- **Phase 5: The Reforging (Chapters 13-15)**: Confront the Echo Primordial and fix the Aegis.

### Chapter 1: Resonance of the Depths
Tremors have begun rocking the town. Crystalline corruption, known as the Echo, is seeping from the Watchtower's basement.

#### Chapter 1 Quests
1.  **Tremors in the Earth**: Talk to the Town Elder.
2.  **Echoes from Below**: Kill 3 Echo Mites in the basement.
3.  **Crystalline Seepage**: Collect 5 Echo Shards.
4.  **The Elder's Request**: Deliver shards to the Blacksmith.
5.  **Resonant Frequencies**: Survive 60s of blacksmith testing.
6.  **A Warrior's Path / Shadow Stitching**: Class-specific investigation.
7.  **Mana Leak**: Stabilize 3 mana fluxes.
8.  **The Subterranean Breach**: Reach Floor -1.
9.  **Infested Veins**: Kill 15 Echo Rats.
10. **Forgotten Miners**: Clear debris and explore mines.
11. **Solidified Corruption**: Collect 10 Echo Crystals.
12. **The First Fragment**: Defeat the Echo Beholder.
13. **Claiming the Shard**: Recover the Shard of Resonance.
14. **Elder's Wisdom**: Report back to the Elder.
15. **Strengthening the Aegis**: Use shard at the Obelisk.
16. **Unexpected Feedback**: Survive the Obelisk backlash (120s).
17. **The Echo's Warning**: Kill 20 Backlash constructs.
18. **Deep Scan**: Explore 2000 tiles.
19. **Resonance Established**: Reach Level 5 to finalize attunement.
20. **Chapter Final**: Prepare for the journey beyond the town.

---

## Current Quest System

The game currently features a robust quest system with automatic progress tracking, a tabbed quest log interface, and support for quest chains.

### Quest Types
| Type | Objective | Progress Source |
| :--- | :--- | :--- |
| `kill` | Defeat a number of monsters | `playerStats.questStats.monstersKilled` |
| `collect` | Gather a number of items | `playerStats.questStats.itemsCollected` |
| `level` | Reach a target level | `playerStats.level` |
| `gold` | Accumulate total gold earned | `playerStats.questStats.goldEarned` |
| `explore` | Travel a number of tiles | `playerStats.questStats.tilesTraveled` |
| `survive` | Stay alive for X seconds | `playerStats.questStats.survivalTime` |

---

## Starter Quests (Pool of 20)

New characters are initialized with a variety of starter quests:

### Core Progression
- **First Steps**: Kill 5 monsters (Beginner Chain 1)
- **Treasure Hunter**: Collect 3 items
- **Rising Power**: Reach level 2 (Beginner Chain 2)
- **Gold Rush**: Earn 100 gold
- **Explorer**: Travel 500 tiles

### Advanced Challenges
- **Monster Slayer / Massacre**: Kill 15/50 monsters
- **Item Collector / Master Collector**: Collect 10/30 items
- **Level Up / Power Seeker**: Reach level 3/5
- **Wanderer / World Traveler**: Travel 1000/2000 tiles
- **Rich Beyond Measure**: Accumulate 500 gold
- **Endurance Test / Unstoppable**: Survive for 5/10 minutes

---

## Quest Chains

Quest chains allow for sequential storytelling and progression. Completing one quest in a chain automatically unlocks the next.

### Beginner Chain
1. **First Steps**: Prove your worth by killing 5 monsters.
2. **Rising Power**: Grow stronger by reaching level 2.
3. **Advanced Training**: Kill 15 monsters to sharpen your skills.
4. **Master Warrior**: Reach level 5 to become a recognized hero.

---

## Technical Implementation: JSON Structure

The quest system is data-driven, defined in `quests.json`. This allows for easy modification and AI integration.

### JSON Schema (UQE v2)

The UQE uses a flat dictionary where each key is a unique Quest ID. Dependencies are handled via the `requires` property.

```json
{
  "quests": {
    "main_01_001": {
      "id": "main_01_001",
      "title": "Tremors in the Earth",
      "description": "...",
      "giver": "Elder Malik",
      "objectives": [
        { "type": "talk", "npcId": "Elder Malik", "label": "Speak with Elder Malik", "target": 1 }
      ],
      "rewards": { "xp": 50, "gold": 20 }
    },
    "main_01_002": {
      "id": "main_01_002",
      "title": "Echoes from Below",
      "requires": "main_01_001", 
      "objectives": [...]
    }
  }
}
```

### How Chain Triggers Work (UQE)

The system uses an event-driven dependency check (`checkNewQuests`):

1.  **Completion**: When a quest is completed, `uqe.update()` detects it and fires `QUEST_COMPLETED`.
2.  **Unlock Check**: The engine scans all defined quests.
3.  **Dependency Met**: If a quest's `requires` ID matches a completed quest ID, it is flagged as **Available**.
4.  **Notification**: An event (`QUEST_AVAILABLE`) is emitted, prompting the UI to show a "New Quest" notification or unlocking the specific NPC dialog.

*Note: Quests starting with `main_` are often excluded from automatic menu popups as they require specific story interaction (like talking to an NPC).*

### Dialog Queue System

To prevent UI overlaps (e.g., Quest Completed appearing over Quest Available), the game uses a **Dialog Queue System**.

1.  **Queue Logic**: `dialogQueue` stores pending UI events ('QUEST_COMPLETED', 'QUEST_AVAILABLE').
2.  **Processing**: The `processDialogQueue()` function runs in the game loop.
3.  **Blocking**: The queue waits if:
    *   Combat is active.
    *   Another dialog is open.
    *   A quest completion modal is open (`questCompletedModal`).
    *   A quest preview modal is open (`questPreviewModal`).
    *   A transient popup is active (`questPopup`).
4.  **Events**: The UQE event bus emits events which are caught by listeners in `create()` and pushed to the queue via `queueDialog()`.

---

## Future Expansion Ideas

### New Quest Types
- **Monster Specific**: "Slay 5 Skeletons" or "Defeat 3 Bosses".
- **Delivery/Interact**: "Talk to Elder Malik" or "Deliver a Potion to the Guards".
- **Dungeon Mastery**: "Reach Floor 5 of the Dungeon" or "Kill the Skeleton King".
- **Crafting**: "Craft a Rare Item" (once crafting is implemented).

### New Quest Chains
1. **The Undead Menace**:
   - *Skeleton Bones*: Kill 10 Skeletons.
   - *Ghostly Echoes*: Survive for 3 minutes in the Haunted Forest.
   - *The Relic Hunter*: Find a Rare Amulet.
   - *Exorcism*: Defeat the Ghost Boss.

2. **The Merchant's Ambition**:
   - *Market Research*: Collect 10 different items.
   - *Trade Relations*: Accumulate 1000 gold.
   - *Valuable Cargo*: Travel 5000 tiles between towns.
   - *Master of Coins*: Reach level 10.

3. **Dungeon Delver**:
   - *Going Dark*: Enter the Dungeon for the first time.
   - *Floor Clearer*: Survive for 5 minutes inside the Dungeon.
   - *Boss Slayer*: Kill your first Dungeon Boss.
   - *Deep Diver*: Reach Dungeon Level 5.
