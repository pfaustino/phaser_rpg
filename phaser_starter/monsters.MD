# Data-Driven Monster System (Method 2)

This document outlines the design for the "Method 2" monster rendering system, which uses procedural data points defined in a JSON file to construct and animate monsters on the fly.

## Design Philosophy

Unlike the static spritesheets in Method 1, Method 2 relies on **Composition** and **Procedural Animation**. A monster is not a single image, but a collection of "Parts" that are rendered and manipulated independently.

## Data Points (Schema)

The `monsters.json` file defines the blueprints for each monster species.

### Core Properties
- `id`: Unique identifier (e.g., "slime_v2").
- `name`: Display name.
- `baseSize`: Base dimensions for the monster's bounding box.

### Layers (Rendering)
Each monster is composed of ordered layers. Each layer can be a geometric shape or a reference to a small asset (like a specific eye type).
- `type`: 'shape' | 'asset'.
- `shape`: 'circle' | 'rect' | 'ellipse' | 'polygon' | 'pixel_grid'.
- `color`: Hex code (e.g., `#FF0000`).
- `offset`: { x, y } relative to the monster's center.
- `scale`: { x, y }.
- `rotation`: In degrees.
- `zOrder`: Render depth (higher = front).
- `mirror`: Whether to flip on the X-axis for certain orientations.

### Features (Data Points)
These are higher-level descriptors that the `monsters.js` engine will interpret:
- `eyeType`: ['single', 'double', 'spider', 'glowing'].
- `mouthType`: ['fangs', 'beak', 'tentacles', 'none'].
- `limbType`: ['none', 'legs', 'tails', 'wings'].
- `bodyType`: ['blob', 'segmented', 'structured'].

### Animation Logic (Procedural)
Instead of pre-rendered frames, Method 2 uses **Parametric Logic**:
- `idle`: { type: 'wiggle' | 'pulse' | 'float', speed, range }.
- `move`: { type: 'hop' | 'slide' | 'walk', speed, frequency }.
- `attack`: { type: 'stretch' | 'lunge' | 'burst', timing_ms }.

## Example Workflow
1. `monsters.js` reads the JSON entry.
2. It constructs a `Phaser.GameObjects.Container`.
3. It adds the shapes/assets specified in the `layers`.
4. It applies `Tweens` or `Update` logic based on the `animation` data points.
