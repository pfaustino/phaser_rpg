# Phaser RPG — Architecture (full scope)

Python/Pygame tile RPG with reusable `rpg_modules` library, monolithic `game.py`, Phaser.js browser port, and optional Flask backend.

## Stack

- **Python:** Pygame 2.6+, optional numpy (audio)  
- **Browser:** Phaser 3 (`phaser_starter/`)  
- **Backend:** Flask + SQLAlchemy (`deep_desert_backend/`) — optional OAuth API  

## Entry points

| Entry | Use |
|-------|-----|
| `run_game.bat` → `working_game.py` | Quick prototype |
| `python game.py` | Full game (~5k lines) |
| `phaser_starter/index.html` | Browser port |
| `deep_desert_backend/app.py` | REST/OAuth API |

## Python game loop (`game.py`)

```text
clock.tick(60) → events → GameState.update(dt, events) → GameState.draw() → flip
```

`GameState` owns map, player, monsters, UI panels, quests, camera, audio.

## Package layout (`rpg_modules/`)

| Package | Responsibility |
|---------|----------------|
| `core/` | Map, dungeon gen, pathfinding, camera, assets, events, audio, `game_flow.py` FSM |
| `entities/` | Player, monsters (types, spawner, factory), NPCs |
| `items/` | Item hierarchy + `ItemGenerator` |
| `quests/` | JSON quests, objectives, rewards |
| `ui/` | Inventory, equipment, dialog, quest log, system menu |
| `animations/` | Procedural monster rendering |
| `savegame.py` | Save/load |

## Data (`data/`)

JSON: quests, dialogs, items, NPCs. Phaser port mirrors with loaders in `phaser_starter/`.

## Phaser port (`phaser_starter/`)

Scene lifecycle: `preload` / `create` / `update`. Managers: MapManager, DialogManager, LootManager, etc.

## Persistence

`rpg_modules/savegame.py` + JSON under `save/`.

## Docs

Per-module READMEs in `docs/`. ADRs: `docs/adr/`.
