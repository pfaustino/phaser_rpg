# Dynamic Quest System Guide

**Philosophy:** NO HARDCODING. Everything is Data-Driven.

This game uses the **Unified Quest Engine (UQE)**, which is designed to be fully data-driven. You should **never** hardcode quest offers, markers, or completion logic in JavaScript or even `dialogs.json` (unless for specific flavor overrides).

## 1. Architecture Overview

-   **Definitions**: `quests_v2.json` contains ALL quest data (title, description, giver, objectives, rewards, prerequisites).
-   **State Management**: `UnifiedQuestSystem.js` (UQE) traces quest states (Locked -> Available -> Active -> Completed).
-   **Visuals (Markers)**: `updateNPCIndicators` (in `game.js`) AUTOMATICALLY checks UQE for available quests and draws `!` or `?`.
-   **Interaction (Dialogs)**: `startDialog` (in `game.js`) AUTOMATICALLY injects "Accept Quest" buttons into NPC dialogs if UQE says a quest is available.

## 2. The Auto-Injector (UQE Bridge)

When you talk to an NPC, the game runs this logic:
1.  **Check UQE Definitions**: "Does this NPC (`giver`) have any quests defined in `quests_v2.json`?"
2.  **Filter Availability**: "For each quest, is it: Not Active? Not Completed? Are Prerequisites Met?"
3.  **Inject Button**: If YES, it prepends a choice to the dialog:
    *   **Text**: `[Quest Title]` (or generic flavor text if configured)
    *   **Action**: `quest_accept_v2`
    *   **Logic**: No custom code needed. The button click triggers UQE to accept the quest.

**Benefit:** If you change a quest's prerequisite in `quests_v2.json`, BOTH the Marker and the Dialog availability update automatically.

## 3. How to Add a New Quest (Correct Way)

**Step 1: Edit `quests_v2.json`**
Add your new quest block.
```json
"main_03_001": {
    "id": "main_03_001",
    "title": "The New Threat",
    "description": "Investigate the northern caves.",
    "giver": "Captain Thorne",
    "requires": "main_02_004",  <-- PREVIOUS QUEST ID
    "objectives": [ ... ],
    "rewards": { ... }
}
```

**Step 2: Reload the Game**
*   **Marker**: Captain Thorne will automatically show a `!` when `main_02_004` is complete.
*   **Dialog**: Captain Thorne will automatically match the marker and offer "The New Threat".

**Step 3: (Optional) Flavor Text**
If you hate the default "The New Threat" button text, you *can* edit `dialogs.json`, but ONLY to override the text.
*Warning:* If you manually add a quest choice in `dialogs.json`, you MUST ensure its `condition` matches the UQE logic perfectly.
*Recommendation:* Stick to the auto-injector for 99% of quests.

## 4. Troubleshooting

*   **"I see a marker but no dialog option"**: The Auto-Injector might be disabled or the NPC name in `dialogs.json` doesn't match the `giver` name in `quests_v2.json` exactly (check spaces!).
*   **"I see a dialog option but no marker"**: You likely HARDCODED the quest offer in `dialogs.json`. **Code Smell!** Remove the hardcoded entry and let the Auto-Injector handle it.
*   **"Marker won't appear"**: Check `requires`. Use `uqe.completedQuests` in the console to see if you actually finished the prerequisite.

## 5. Quest Creation Checklist
- [ ] Defined in `quests_v2.json`?
- [ ] `giver` name matches NPC name exactly?
- [ ] `requires` points to a valid, reachable quest ID?
- [ ] `objectives` logic is supported (kill, collect, talk, explore, etc.)?

**DO NOT** add `if (quest_001) showButton()` logic in `game.js`. usage of `uqe` is mandatory.
