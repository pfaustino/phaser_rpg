# Phaser RPG Quests Documentation

This document catalogs the current quest system and outlines future expansion plans for quest types and chains.

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
