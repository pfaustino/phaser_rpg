/**
 * ProceduralMonster.js
 * Generates unique pixel-art monsters procedurally using mask-based generation
 * with symmetry, multi-color palettes, and animated states.
 * 
 * Based on zfedoran/pixel-sprite-generator algorithm.
 */

const ProceduralMonster = {
    // Texture cache to avoid regenerating (disabled for now to fix shading issues)
    cache: {},
    useCache: false, // Set to true once shading is verified working
    enableOutline: true, // Toggle for 1px outline

    // Clear the texture cache (useful for debugging)
    clearCache: function () {
        this.cache = {};
        console.log('🗑️ ProceduralMonster cache cleared');
    },

    // Monster type templates (mask definitions)
    // Values: 0 = empty, 1 = body (50% fill), 2 = always solid, -1 = always empty
    templates: {
        slime: {
            width: 6,
            height: 6,
            mask: [
                [0, 0, 1, 1, 0, 0],
                [0, 1, 2, 2, 1, 0],
                [1, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 1],
                [0, 1, 2, 2, 1, 0],
                [0, 0, 1, 1, 0, 0]
            ],
            symmetry: 'horizontal'
        },
        goblin: {
            width: 6,
            height: 8,
            mask: [
                [0, 0, 1, 1, 0, 0],  // Head top
                [0, 1, 2, 2, 1, 0],  // Head
                [0, 1, 2, 2, 1, 0],  // Face
                [0, 0, 1, 1, 0, 0],  // Neck
                [0, 1, 2, 2, 1, 0],  // Torso
                [1, 2, 2, 2, 2, 1],  // Body
                [0, 1, 0, 0, 1, 0],  // Legs
                [0, 1, 0, 0, 1, 0]   // Feet
            ],
            symmetry: 'horizontal'
        },
        spider: {
            width: 8,
            height: 6,
            mask: [
                [1, 0, 0, 1, 1, 0, 0, 1],
                [0, 1, 0, 2, 2, 0, 1, 0],
                [0, 0, 1, 2, 2, 1, 0, 0],
                [0, 1, 2, 2, 2, 2, 1, 0],
                [1, 0, 1, 2, 2, 1, 0, 1],
                [1, 0, 0, 1, 1, 0, 0, 1]
            ],
            symmetry: 'horizontal'
        },
        skeleton: {
            width: 6,
            height: 10,
            mask: [
                [0, 0, 2, 2, 0, 0],  // Skull top
                [0, 1, 2, 2, 1, 0],  // Skull
                [0, 0, 1, 1, 0, 0],  // Jaw
                [0, 0, 1, 1, 0, 0],  // Neck
                [0, 1, 2, 2, 1, 0],  // Ribcage
                [0, 1, 1, 1, 1, 0],  // Ribcage
                [0, 0, 1, 1, 0, 0],  // Spine
                [0, 0, 1, 1, 0, 0],  // Pelvis
                [0, 1, 0, 0, 1, 0],  // Legs
                [0, 1, 0, 0, 1, 0]   // Feet
            ],
            symmetry: 'horizontal'
        },
        dragon: {
            width: 10,
            height: 8,
            mask: [
                [0, 0, 1, 1, 0, 0, 0, 0, 0, 0],  // Horns
                [0, 1, 2, 2, 1, 0, 0, 0, 0, 0],  // Head
                [0, 0, 1, 2, 2, 1, 1, 0, 0, 0],  // Neck
                [0, 0, 0, 1, 2, 2, 2, 1, 1, 0],  // Body
                [0, 1, 1, 2, 2, 2, 2, 2, 1, 1],  // Wings/Body
                [0, 0, 1, 1, 2, 2, 2, 1, 0, 0],  // Body
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],  // Legs
                [0, 0, 0, 1, 0, 0, 1, 0, 0, 0]   // Feet/Tail
            ],
            symmetry: 'none'
        },
        wolf: {
            width: 8,
            height: 6,
            mask: [
                [1, 1, 0, 0, 0, 0, 0, 0],  // Ears
                [2, 2, 1, 0, 0, 0, 0, 0],  // Head
                [1, 2, 2, 1, 1, 1, 1, 0],  // Body
                [0, 1, 2, 2, 2, 2, 2, 1],  // Body
                [0, 1, 0, 1, 0, 1, 0, 1],  // Legs
                [0, 1, 0, 1, 0, 1, 0, 1]   // Feet
            ],
            symmetry: 'none'
        },
        ghost: {
            width: 6,
            height: 8,
            mask: [
                [0, 1, 1, 1, 1, 0],
                [1, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 1],
                [1, 1, 2, 2, 1, 1],
                [0, 1, 1, 1, 1, 0],
                [1, 0, 1, 1, 0, 1],
                [0, 1, 0, 0, 1, 0]
            ],
            symmetry: 'horizontal'
        },
        orc: {
            width: 8,
            height: 10,
            mask: [
                [0, 0, 1, 1, 1, 1, 0, 0],
                [0, 1, 2, 2, 2, 2, 1, 0],
                [0, 1, 2, 2, 2, 2, 1, 0],
                [0, 0, 1, 1, 1, 1, 0, 0],
                [0, 1, 2, 2, 2, 2, 1, 0],
                [1, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 2, 1],
                [0, 1, 1, 1, 1, 1, 1, 0],
                [0, 1, 1, 0, 0, 1, 1, 0],
                [0, 1, 1, 0, 0, 1, 1, 0]
            ],
            symmetry: 'horizontal'
        },
        echo_mite: {
            width: 6,
            height: 6,
            mask: [
                [1, 0, 1, 1, 0, 1],
                [0, 1, 2, 2, 1, 0],
                [1, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 1],
                [0, 1, 1, 1, 1, 0],
                [1, 0, 0, 0, 0, 1]
            ],
            symmetry: 'horizontal'
        }
    },

    // Color palettes per monster type
    palettes: {
        slime: [
            { body: 0x44cc44, dark: 0x228822, light: 0x66ff66, eyes: 0xffffff },
            { body: 0x4444cc, dark: 0x222288, light: 0x6666ff, eyes: 0xffffff },
            { body: 0xcc4444, dark: 0x882222, light: 0xff6666, eyes: 0xffffff },
            { body: 0xcc44cc, dark: 0x882288, light: 0xff66ff, eyes: 0xffffff }
        ],
        goblin: [
            { body: 0x55aa55, dark: 0x336633, light: 0x77cc77, eyes: 0xff0000 },
            { body: 0x77aa55, dark: 0x446633, light: 0x99cc77, eyes: 0xffff00 }
        ],
        spider: [
            { body: 0x333333, dark: 0x111111, light: 0x555555, eyes: 0xff0000 },
            { body: 0x553322, dark: 0x331100, light: 0x775544, eyes: 0x00ff00 }
        ],
        skeleton: [
            { body: 0xdddddd, dark: 0xaaaaaa, light: 0xffffff, eyes: 0x000000 },
            { body: 0xccccbb, dark: 0x999988, light: 0xeeeedd, eyes: 0xff0000 }
        ],
        dragon: [
            { body: 0xcc2222, dark: 0x881111, light: 0xff4444, eyes: 0xffff00 },
            { body: 0x2222cc, dark: 0x111188, light: 0x4444ff, eyes: 0xffffff },
            { body: 0x22cc22, dark: 0x118811, light: 0x44ff44, eyes: 0xff0000 }
        ],
        wolf: [
            { body: 0x666666, dark: 0x333333, light: 0x888888, eyes: 0xffff00 },
            { body: 0x886644, dark: 0x553311, light: 0xaa8866, eyes: 0x00ffff }
        ],
        ghost: [
            { body: 0xaaaaff, dark: 0x8888dd, light: 0xccccff, eyes: 0x000000 },
            { body: 0xffaaff, dark: 0xdd88dd, light: 0xffccff, eyes: 0xff0000 }
        ],
        orc: [
            { body: 0x447744, dark: 0x224422, light: 0x669966, eyes: 0xff0000 },
            { body: 0x557755, dark: 0x334433, light: 0x779977, eyes: 0xffff00 }
        ],
        echo_mite: [
            { body: 0x9900ff, dark: 0x6600aa, light: 0xcc44ff, eyes: 0x00ffff },
            { body: 0xff00ff, dark: 0xaa00aa, light: 0xff66ff, eyes: 0xffffff }
        ]
    },

    /**
     * Generate a unique monster sprite
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {string} monsterType - Type of monster (slime, goblin, etc.)
     * @param {number} seed - Optional seed for consistent generation
     * @returns {string} Texture key for the generated sprite
     */
    generate: function (scene, monsterType, seed = null) {
        const type = monsterType.toLowerCase().replace(' ', '_');
        const template = this.templates[type] || this.templates.slime;
        const paletteOptions = this.palettes[type] || this.palettes.slime;

        // Use seed or random
        const rng = seed !== null ? this.seededRandom(seed) : Math.random;
        const palette = paletteOptions[Math.floor(rng() * paletteOptions.length)];

        // Generate unique key
        const key = `proc_monster_${type}_${Date.now()}_${Math.floor(rng() * 10000)}`;

        // Check cache
        if (this.cache[key]) {
            return key;
        }

        // Generate pixel data
        const pixels = this.generatePixels(template, palette, rng);

        // Render to canvas and create texture
        this.renderToTexture(scene, key, pixels, template.width, template.height, 4, palette.dark);

        this.cache[key] = true;
        return key;
    },

    /**
     * Generate pixel data from template
     */
    generatePixels: function (template, palette, rng) {
        const { width, height, mask, symmetry } = template;
        const pixels = [];

        for (let y = 0; y < height; y++) {
            pixels[y] = [];
            for (let x = 0; x < width; x++) {
                const maskValue = mask[y][x];
                let color = null;

                if (maskValue === -1) {
                    color = null; // Transparent
                } else if (maskValue === 2) {
                    color = palette.body; // Always solid
                } else if (maskValue === 1) {
                    // 50% chance of being filled
                    color = rng() > 0.5 ? palette.body : null;
                } else {
                    color = null;
                }

                pixels[y][x] = color;
            }
        }

        // Apply symmetry FIRST (before shading)
        if (symmetry === 'horizontal') {
            const halfWidth = Math.floor(width / 2);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < halfWidth; x++) {
                    pixels[y][width - 1 - x] = pixels[y][x];
                }
            }
        }

        // Apply shading AFTER symmetry so both sides are correct
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (pixels[y][x] !== null) {
                    // Top = light, bottom = dark (simple vertical gradient)
                    const lightFactor = y / height;
                    if (lightFactor < 0.3) {
                        pixels[y][x] = palette.light;
                    } else if (lightFactor > 0.7) {
                        pixels[y][x] = palette.dark;
                    } else {
                        pixels[y][x] = palette.body;
                    }
                }
            }
        }

        // Add eyes (in upper portion)
        const eyeY = Math.floor(height * 0.25);
        const eyeX1 = Math.floor(width * 0.3);
        const eyeX2 = Math.floor(width * 0.7);
        if (pixels[eyeY] && pixels[eyeY][eyeX1] !== null) {
            pixels[eyeY][eyeX1] = palette.eyes;
        }
        if (pixels[eyeY] && pixels[eyeY][eyeX2] !== null) {
            pixels[eyeY][eyeX2] = palette.eyes;
        }

        return pixels;
    },

    /**
     * Render pixel data to a Phaser texture
     */
    renderToTexture: function (scene, key, pixels, width, height, scale = 4, outlineColor = 0x000000) {
        // scale is passed in or default to 4

        // Determine offset and size based on outline
        const offset = this.enableOutline ? 1 : 0;
        const canvasWidth = (width + (offset * 2)) * scale;
        const canvasHeight = (height + (offset * 2)) * scale;

        // Create graphics and render
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

        // Pass 1: Draw Outlines (if enabled)
        if (this.enableOutline && outlineColor !== null) {
            graphics.fillStyle(outlineColor, 1);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (pixels[y][x] !== null) {
                        // Draw outline in 4 cardinal directions
                        // We draw at (x+offset) +/- 1, (y+offset) +/- 1
                        // But simplification: Just draw a block at target positions

                        // Top
                        graphics.fillRect((x + offset) * scale, (y + offset - 1) * scale, scale, scale);
                        // Bottom
                        graphics.fillRect((x + offset) * scale, (y + offset + 1) * scale, scale, scale);
                        // Left
                        graphics.fillRect((x + offset - 1) * scale, (y + offset) * scale, scale, scale);
                        // Right
                        graphics.fillRect((x + offset + 1) * scale, (y + offset) * scale, scale, scale);
                    }
                }
            }
        }

        // Pass 2: Draw Body
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const color = pixels[y][x];
                if (color !== null) {
                    graphics.fillStyle(color, 1);
                    graphics.fillRect((x + offset) * scale, (y + offset) * scale, scale, scale);
                }
            }
        }

        // Generate texture
        graphics.generateTexture(key, canvasWidth, canvasHeight);
        graphics.destroy();
    },

    /**
     * Seeded random number generator
     */
    seededRandom: function (seed) {
        let s = seed;
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    },

    /**
     * Apply idle animation to a monster sprite
     * @param {Phaser.Scene} scene
     * @param {Phaser.GameObjects.Sprite} sprite
     */
    applyIdleAnimation: function (scene, sprite) {
        scene.tweens.add({
            targets: sprite,
            scaleX: sprite.scaleX * 1.05,
            scaleY: sprite.scaleY * 0.95,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    },

    /**
     * Play attack animation
     */
    playAttackAnimation: function (scene, sprite, onComplete) {
        const originalScaleX = sprite.scaleX;
        const originalScaleY = sprite.scaleY;

        scene.tweens.add({
            targets: sprite,
            scaleX: originalScaleX * 1.3,
            scaleY: originalScaleY * 1.3,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                if (onComplete) onComplete();
            }
        });
    },

    /**
     * Play hurt animation (flash red + shake)
     */
    playHurtAnimation: function (scene, sprite) {
        // Flash tint
        sprite.setTint(0xff0000);
        scene.time.delayedCall(100, () => sprite.clearTint());

        // Shake
        const originalX = sprite.x;
        scene.tweens.add({
            targets: sprite,
            x: originalX + 5,
            duration: 50,
            yoyo: true,
            repeat: 2,
            onComplete: () => sprite.x = originalX
        });
    },

    /**
     * Play death animation (fade + shrink)
     */
    playDeathAnimation: function (scene, sprite, onComplete) {
        scene.tweens.add({
            targets: sprite,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 300,
            onComplete: () => {
                if (onComplete) onComplete();
            }
        });
    },

    // ============================================
    // CELLULAR AUTOMATA GENERATOR
    // Creates organic, blob-like shapes
    // ============================================

    /**
     * Monster types that use cellular automata
     */
    caMonsterTypes: ['slime', 'prism_slime', 'echo_mite', 'ghost'],

    /**
     * Generate using cellular automata (organic blobs)
     */
    generateCellularAutomata: function (scene, monsterType, seed = null, config = {}) {
        const rng = seed !== null ? this.seededRandom(seed) : Math.random;
        const paletteOptions = this.palettes[monsterType] || this.palettes.slime;
        const palette = paletteOptions[Math.floor(rng() * paletteOptions.length)];

        const width = 10;
        const height = 10;
        const key = `ca_monster_${monsterType}_${Date.now()}_${Math.floor(rng() * 10000)}`;

        let grid = [];
        let pixelCount = 0;
        let attempts = 0;

        // Data-driven configuration (defaults if not provided)
        const density = config.density || 0.50;
        const minPixels = config.minPixels || 15;
        const scale = (config && config.scale) ? config.scale : 4;

        // Retry loop to ensure we don't return an empty/tiny blob
        while (pixelCount < minPixels && attempts < 5) {
            attempts++;
            pixelCount = 0;

            // Step 1: Random initial state (50% fill), but keep borders empty
            for (let y = 0; y < height; y++) {
                grid[y] = [];
                for (let x = 0; x < width; x++) {
                    // Force borders to be empty
                    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                        grid[y][x] = 0;
                    } else {
                        grid[y][x] = rng() < density ? 1 : 0; // Increased fill rate to prevent die-off
                    }
                }
            }

            // Step 2: Run CA rules (4 iterations - reduced to preserve mass)
            for (let i = 0; i < 4; i++) {
                grid = this.caStep(grid, width, height);
            }

            // Step 3: Apply horizontal symmetry
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < Math.floor(width / 2); x++) {
                    grid[y][width - 1 - x] = grid[y][x];
                }
            }

            // Count mass
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (grid[y][x]) pixelCount++;
                }
            }
        }

        // Step 4: Flood fill cleanup - remove isolated pixels
        grid = this.caCleanup(grid, width, height);

        // Step 5: Convert to colors with vertical gradient shading
        const pixels = [];
        for (let y = 0; y < height; y++) {
            pixels[y] = [];
            for (let x = 0; x < width; x++) {
                if (grid[y][x] === 1) {
                    // Vertical shading: top = light, bottom = dark
                    const lightFactor = y / height;
                    if (lightFactor < 0.3) {
                        pixels[y][x] = palette.light;
                    } else if (lightFactor > 0.7) {
                        pixels[y][x] = palette.dark;
                    } else {
                        pixels[y][x] = palette.body;
                    }
                } else {
                    pixels[y][x] = null;
                }
            }
        }

        // Add eyes
        const eyeY = Math.floor(height * 0.3);
        const eyeX1 = Math.floor(width * 0.3);
        const eyeX2 = Math.floor(width * 0.7);
        if (pixels[eyeY] && pixels[eyeY][eyeX1]) pixels[eyeY][eyeX1] = palette.eyes;
        if (pixels[eyeY] && pixels[eyeY][eyeX2]) pixels[eyeY][eyeX2] = palette.eyes;

        if (pixels[eyeY] && pixels[eyeY][eyeX2]) pixels[eyeY][eyeX2] = palette.eyes;

        this.renderToTexture(scene, key, pixels, width, height, scale, palette.dark);
        this.cache[key] = true;

        console.log(`🧬 Generated CA monster: ${monsterType} -> ${key}`);
        return key;
    },

    /**
     * Single CA step - count neighbors and apply rules
     */
    caStep: function (grid, width, height) {
        const newGrid = [];
        for (let y = 0; y < height; y++) {
            newGrid[y] = [];
            for (let x = 0; x < width; x++) {
                const neighbors = this.caCountNeighbors(grid, x, y, width, height);
                // Smoothing / Majority Vote Rule (Creates rounder, cleaner blobs)
                if (neighbors > 4) {
                    newGrid[y][x] = 1;
                } else if (neighbors < 4) {
                    newGrid[y][x] = 0;
                } else {
                    newGrid[y][x] = grid[y][x];
                }
            }
        }
        return newGrid;
    },

    /**
     * Count 8-connected neighbors
     */
    caCountNeighbors: function (grid, x, y, width, height) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    count += grid[ny][nx];
                } else {
                    count += 0; // Treat border as empty for distinct sprite generation
                }
            }
        }
        return count;
    },

    /**
     * Remove isolated small blobs
     */
    caCleanup: function (grid, width, height) {
        const minBlobSize = 8;
        const visited = [];
        for (let y = 0; y < height; y++) {
            visited[y] = new Array(width).fill(false);
        }

        // Find and keep only blobs >= minBlobSize
        const result = [];
        for (let y = 0; y < height; y++) {
            result[y] = new Array(width).fill(0);
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (grid[y][x] === 1 && !visited[y][x]) {
                    const blob = this.caFloodFill(grid, visited, x, y, width, height);
                    if (blob.length >= minBlobSize) {
                        for (const cell of blob) {
                            result[cell.y][cell.x] = 1;
                        }
                    }
                }
            }
        }
        return result;
    },

    /**
     * Flood fill to find connected blob
     */
    caFloodFill: function (grid, visited, startX, startY, width, height) {
        const stack = [{ x: startX, y: startY }];
        const cells = [];

        while (stack.length > 0) {
            const { x, y } = stack.pop();
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited[y][x] || grid[y][x] === 0) continue;

            visited[y][x] = true;
            cells.push({ x, y });

            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }
        return cells;
    },

    // ============================================
    // COMPONENT-BASED ASSEMBLY
    // Mixes head/body/limb parts for humanoids
    // ============================================

    /**
     * Monster types that use component-based assembly
     */
    componentMonsterTypes: [],

    /**
     * Component templates (small pixel patterns)
     */
    components: {
        heads: [
            // Round head
            {
                width: 4, height: 4, pixels: [
                    [0, 1, 1, 0],
                    [1, 2, 2, 1],
                    [1, 2, 2, 1],
                    [0, 1, 1, 0]
                ]
            },
            // Square head
            {
                width: 4, height: 4, pixels: [
                    [1, 1, 1, 1],
                    [1, 2, 2, 1],
                    [1, 2, 2, 1],
                    [1, 1, 1, 1]
                ]
            },
            // Pointed head
            {
                width: 4, height: 5, pixels: [
                    [0, 1, 1, 0],
                    [1, 2, 2, 1],
                    [1, 2, 2, 1],
                    [1, 2, 2, 1],
                    [0, 1, 1, 0]
                ]
            }
        ],
        bodies: [
            // Standard torso
            {
                width: 6, height: 5, pixels: [
                    [0, 1, 1, 1, 1, 0],
                    [1, 2, 2, 2, 2, 1],
                    [1, 2, 2, 2, 2, 1],
                    [1, 2, 2, 2, 2, 1],
                    [0, 1, 1, 1, 1, 0]
                ]
            },
            // Wide torso
            {
                width: 8, height: 5, pixels: [
                    [0, 1, 1, 1, 1, 1, 1, 0],
                    [1, 2, 2, 2, 2, 2, 2, 1],
                    [1, 2, 2, 2, 2, 2, 2, 1],
                    [1, 2, 2, 2, 2, 2, 2, 1],
                    [0, 1, 1, 1, 1, 1, 1, 0]
                ]
            },
            // Thin torso
            {
                width: 4, height: 6, pixels: [
                    [0, 1, 1, 0],
                    [1, 2, 2, 1],
                    [1, 2, 2, 1],
                    [1, 2, 2, 1],
                    [1, 2, 2, 1],
                    [0, 1, 1, 0]
                ]
            }
        ],
        legs: [
            // Standard legs
            {
                width: 6, height: 4, pixels: [
                    [0, 1, 0, 0, 1, 0],
                    [0, 1, 0, 0, 1, 0],
                    [0, 1, 0, 0, 1, 0],
                    [0, 1, 0, 0, 1, 0]
                ]
            },
            // Wide legs
            {
                width: 6, height: 3, pixels: [
                    [1, 1, 0, 0, 1, 1],
                    [1, 1, 0, 0, 1, 1],
                    [1, 1, 0, 0, 1, 1]
                ]
            }
        ]
    },

    /**
     * Generate using component-based assembly
     */
    generateComponentBased: function (scene, monsterType, seed = null) {
        const rng = seed !== null ? this.seededRandom(seed) : Math.random;
        const paletteOptions = this.palettes[monsterType] || this.palettes.goblin;
        const palette = paletteOptions[Math.floor(rng() * paletteOptions.length)];

        // Pick random components
        const head = this.components.heads[Math.floor(rng() * this.components.heads.length)];
        const body = this.components.bodies[Math.floor(rng() * this.components.bodies.length)];
        const legs = this.components.legs[Math.floor(rng() * this.components.legs.length)];

        // Calculate total size
        const totalHeight = head.height + body.height + legs.height;
        const maxWidth = Math.max(head.width, body.width, legs.width);

        // Assemble components
        const pixels = [];
        let currentY = 0;

        // Add head (centered)
        const headOffset = Math.floor((maxWidth - head.width) / 2);
        for (let y = 0; y < head.height; y++) {
            pixels[currentY + y] = new Array(maxWidth).fill(null);
            for (let x = 0; x < head.width; x++) {
                const val = head.pixels[y][x];
                if (val > 0) {
                    pixels[currentY + y][headOffset + x] = this.componentToColor(val, palette, x, y, head.width, head.height, currentY + y, totalHeight);
                }
            }
        }
        currentY += head.height;

        // Add body (centered)
        const bodyOffset = Math.floor((maxWidth - body.width) / 2);
        for (let y = 0; y < body.height; y++) {
            pixels[currentY + y] = new Array(maxWidth).fill(null);
            for (let x = 0; x < body.width; x++) {
                const val = body.pixels[y][x];
                if (val > 0) {
                    pixels[currentY + y][bodyOffset + x] = this.componentToColor(val, palette, x, y, body.width, body.height, currentY + y, totalHeight);
                }
            }
        }
        currentY += body.height;

        // Add legs (centered)
        const legsOffset = Math.floor((maxWidth - legs.width) / 2);
        for (let y = 0; y < legs.height; y++) {
            pixels[currentY + y] = new Array(maxWidth).fill(null);
            for (let x = 0; x < legs.width; x++) {
                const val = legs.pixels[y][x];
                if (val > 0) {
                    pixels[currentY + y][legsOffset + x] = this.componentToColor(val, palette, x, y, legs.width, legs.height, currentY + y, totalHeight);
                }
            }
        }

        // Add eyes to head area
        const eyeY = Math.floor(head.height * 0.5);
        const eyeX1 = headOffset + Math.floor(head.width * 0.25);
        const eyeX2 = headOffset + Math.floor(head.width * 0.75);
        if (pixels[eyeY] && pixels[eyeY][eyeX1]) pixels[eyeY][eyeX1] = palette.eyes;
        if (pixels[eyeY] && pixels[eyeY][eyeX2]) pixels[eyeY][eyeX2] = palette.eyes;

        const key = `comp_monster_${monsterType}_${Date.now()}_${Math.floor(rng() * 10000)}`;
        const scale = (config && config.scale) ? config.scale : 4;
        this.renderToTexture(scene, key, pixels, maxWidth, totalHeight, scale, palette.dark);
        this.cache[key] = true;

        console.log(`🔧 Generated component monster: ${monsterType} -> ${key}`);
        return key;
    },

    /**
     * Convert component value to color with shading (vertical gradient)
     */
    componentToColor: function (val, palette, x, y, width, height, globalY, totalHeight) {
        if (val === 0) return null;
        // Use global Y position for consistent vertical shading across all parts
        const lightFactor = globalY / totalHeight;
        if (val === 1) {
            // Outline/edge pixels
            return lightFactor < 0.3 ? palette.light : palette.dark;
        }
        // Body pixels - use vertical gradient
        if (lightFactor < 0.25) {
            return palette.light;
        } else if (lightFactor > 0.75) {
            return palette.dark;
        }
        return palette.body;
    },

    // ============================================
    // MAIN GENERATE FUNCTION (updated)
    // ============================================

    /**
     * Generate a unique monster sprite using the best algorithm for the type
     */
    generate: function (scene, monsterType, seed = null, options = {}) {
        const type = monsterType.toLowerCase().replace(' ', '_');

        // Handle legacy call where options might be a string (generationType)
        let generationType = null;
        let config = {};

        if (typeof options === 'string') {
            generationType = options;
        } else if (options && typeof options === 'object') {
            generationType = options.type;
            config = options;
        }

        // Choose algorithm based on explicit type or fallback to hardcoded lists
        if (generationType === 'cellular_automata' || this.caMonsterTypes.includes(type)) {
            return this.generateCellularAutomata(scene, type, seed, config);
        } else if (generationType === 'component_based' || this.componentMonsterTypes.includes(type)) {
            return this.generateComponentBased(scene, type, seed, config);
        } else {
            // Default: mask-based generation
            return this.generateMaskBased(scene, type, seed, config);
        }
    },

    /**
     * Original mask-based generation (renamed)
     */
    generateMaskBased: function (scene, monsterType, seed = null, config = null) {
        const type = monsterType.toLowerCase().replace(' ', '_');
        const template = this.templates[type] || this.templates.slime;
        const paletteOptions = this.palettes[type] || this.palettes.slime;

        const rng = seed !== null ? this.seededRandom(seed) : Math.random;
        const palette = paletteOptions[Math.floor(rng() * paletteOptions.length)];

        const key = `proc_monster_${type}_${Date.now()}_${Math.floor(rng() * 10000)}`;

        if (this.useCache && this.cache[key]) {
            return key;
        }

        const pixels = this.generatePixels(template, palette, rng);
        const scale = (config && config.scale) ? config.scale : 4;
        this.renderToTexture(scene, key, pixels, template.width, template.height, scale, palette.dark);

        this.cache[key] = true;
        console.log(`🎨 Generated mask-based monster: ${type} -> ${key}`);
        return key;
    }
};

// Export for use in game.js
window.ProceduralMonster = ProceduralMonster;
