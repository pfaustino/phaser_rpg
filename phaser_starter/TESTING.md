# Testing Guide

This document covers testing tools and workflows for the RPG game.

## Quest Debug Commands

Quest debug commands are available in the browser console (F12) for rapid quest testing.

### Getting Started
```javascript
debugQuest.help()  // Show all available commands
```

### Commands Reference

| Command | Description |
|---------|-------------|
| `debugQuest.help()` | Show all debug commands |
| `debugQuest.listActive()` | Show all active quests with progress |
| `debugQuest.listCompleted()` | Show all completed quests |
| `debugQuest.listAll()` | Show all quest definitions |
| `debugQuest.info('quest_id')` | Show detailed quest info |
| `debugQuest.accept('quest_id')` | Accept a quest by ID |
| `debugQuest.complete('quest_id')` | Force complete a quest |
| `debugQuest.skip()` | Skip current main quest |
| `debugQuest.skip('quest_id')` | Skip specific quest |
| `debugQuest.setProgress('quest_id', amount)` | Set objective progress |
| `debugQuest.goto('quest_id')` | Jump directly to a quest |
| `debugQuest.reset()` | Reset ALL quest progress |

### Common Testing Scenarios

#### Test a Specific Quest
```javascript
// Jump directly to the defense quest
debugQuest.goto('main_01_005')
```

#### Check Quest Chain
```javascript
// View what quest requires what
debugQuest.info('main_01_006')
```

#### Speed Through Main Story
```javascript
// Skip current main quest repeatedly
debugQuest.skip()
debugQuest.skip()
debugQuest.skip()
```

#### Set Progress Manually
```javascript
// Set kill count to 4 out of 5
debugQuest.setProgress('main_01_002', 4)
```

#### Fresh Start
```javascript
// Clear all progress and refresh
debugQuest.reset()
// Then refresh the page
```

### Quest ID Reference

#### Main Quest Line
| ID | Title |
|----|-------|
| `main_01_001` | Tremors in the Earth |
| `main_01_002` | Echoes from Below |
| `main_01_003` | Crystalline Seepage |
| `main_01_004` | The Elder's Request |
| `main_01_005` | Resonant Frequencies |
| `main_01_006` | The Path Chosen |
| `main_01_007` | Mana Instability |

#### Side Quest Chains
- **Kill Chain:** `quest_007` → `quest_013` → `quest_019` → `quest_021` → ... → `quest_037`
- **Gold Chain:** `quest_004` → `quest_010` → `quest_016` → `quest_022` → ... → `quest_038`
- **Endurance Chain:** `quest_006` → `quest_012` → `quest_018` → `quest_023` → ... → `quest_039`
- **Collect Chain:** `quest_002` → `quest_008` → `quest_014` → `quest_020` → ... → `quest_040`

## Tips

- Use `goto()` to jump directly to a problem quest without playing through prerequisites
- The `skip()` command with no arguments automatically finds and completes the current main quest
- After `reset()`, refresh the page to properly reinitialize
- Check the console for 🔧 messages confirming commands executed
