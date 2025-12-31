/**
 * TextureManager.js
 * Handles generation of procedural textures and asset management.
 */

const TextureManager = {
    /**
     * Generate procedural monster textures with different shapes and styles
     * @param {Phaser.Scene} scene - The Phaser scene instance to use for texture generation
     */
    generateProceduralMonsters: function (scene) {
        if (!scene) {
            console.error('TextureManager: No scene provided to generateProceduralMonsters');
            return;
        }

        const size = 32;
        const center = size / 2;

        // Define monster types with visual characteristics
        const monsterDefs = [
            {
                key: 'monster_goblin',
                name: 'Goblin',
                bodyColor: 0x8b4513, // Brown
                accentColor: 0x654321,
                shape: 'circle',
                features: ['ears', 'eyes'],
                size: 0.9
            },
            {
                key: 'monster_orc',
                name: 'Orc',
                bodyColor: 0x228b22, // Forest green
                accentColor: 0x006400,
                shape: 'square',
                features: ['tusks', 'eyes'],
                size: 1.1
            },
            {
                key: 'monster_skeleton',
                name: 'Skeleton',
                bodyColor: 0xf5f5dc, // Beige
                accentColor: 0xffffff,
                shape: 'circle',
                features: ['bones', 'skull'],
                size: 0.95
            },
            {
                key: 'monster_spider',
                name: 'Spider',
                bodyColor: 0x2f2f2f, // Dark gray
                accentColor: 0x1a1a1a,
                shape: 'circle',
                features: ['legs', 'eyes'],
                size: 0.8
            },
            {
                key: 'monster_slime',
                name: 'Slime',
                bodyColor: 0x00ff00, // Green
                accentColor: 0x00cc00,
                shape: 'blob',
                features: ['glow', 'eyes'],
                size: 1.0
            },
            {
                key: 'monster_wolf',
                name: 'Wolf',
                bodyColor: 0x808080, // Gray
                accentColor: 0x555555,
                shape: 'oval',
                features: ['ears', 'snout', 'eyes'],
                size: 1.0
            },
            {
                key: 'monster_dragon',
                name: 'Dragon',
                bodyColor: 0x8b0000, // Dark red
                accentColor: 0xff4500,
                shape: 'circle',
                features: ['wings', 'spikes', 'eyes'],
                size: 1.2
            },
            {
                key: 'monster_ghost',
                name: 'Ghost',
                bodyColor: 0xe0e0e0, // Light gray
                accentColor: 0xffffff,
                shape: 'blob',
                features: ['glow', 'eyes'],
                size: 1.0,
                alpha: 0.7
            },
            {
                key: 'monster_echo_mite',
                name: 'Echo_Mite',
                bodyColor: 0x8b4513, // Brownish
                accentColor: 0xff0000,
                shape: 'blob',
                features: ['eyes', 'legs'],
                size: 0.8
            }
        ];

        // Generate texture for each monster type
        monsterDefs.forEach(def => {
            // Check if texture already exists to avoid recreation
            if (scene.textures.exists(def.key)) {
                return;
            }

            const g = scene.add.graphics();
            const scale = def.size;
            const radius = (size / 2) * scale;
            const alpha = def.alpha !== undefined ? def.alpha : 1.0;

            // Shadow
            g.fillStyle(0x000000, 0.3);
            g.fillCircle(center + 1, center + 1, radius);

            // Main body based on shape
            if (def.shape === 'circle') {
                g.fillStyle(def.bodyColor, alpha);
                g.fillCircle(center, center, radius);
                g.lineStyle(2, def.accentColor, alpha);
                g.strokeCircle(center, center, radius);
            } else if (def.shape === 'square') {
                const halfSize = radius;
                g.fillStyle(def.bodyColor, alpha);
                g.fillRect(center - halfSize, center - halfSize, halfSize * 2, halfSize * 2);
                g.lineStyle(2, def.accentColor, alpha);
                g.strokeRect(center - halfSize, center - halfSize, halfSize * 2, halfSize * 2);
            } else if (def.shape === 'oval') {
                g.fillStyle(def.bodyColor, alpha);
                g.fillEllipse(center, center, radius * 1.5, radius);
                g.lineStyle(2, def.accentColor, alpha);
                g.strokeEllipse(center, center, radius * 1.5, radius);
            } else if (def.shape === 'blob') {
                // Irregular blob shape
                g.fillStyle(def.bodyColor, alpha);
                g.fillCircle(center, center, radius);
                // Add blob bumps
                g.fillCircle(center - radius * 0.3, center - radius * 0.3, radius * 0.4);
                g.fillCircle(center + radius * 0.3, center - radius * 0.2, radius * 0.3);
                g.lineStyle(2, def.accentColor, alpha);
                g.strokeCircle(center, center, radius);
            }

            // Add features
            if (def.features.includes('eyes')) {
                // Two eyes
                g.fillStyle(0xffffff, alpha);
                g.fillCircle(center - radius * 0.3, center - radius * 0.2, radius * 0.15);
                g.fillCircle(center + radius * 0.3, center - radius * 0.2, radius * 0.15);
                g.fillStyle(0x000000, alpha);
                g.fillCircle(center - radius * 0.3, center - radius * 0.2, radius * 0.08);
                g.fillCircle(center + radius * 0.3, center - radius * 0.2, radius * 0.08);
            }

            // New Echo Rat Sprite - only load if not exists and strict check not needed here as load handles duplicate checks well usually, 
            // but for safety in preload phase this is fine.
            // Note: calling load in preload vs create matters. 
            // If this is called in preload, scene.load works. 
            // If called in create, scene.load.start() might be needed for new files.
            // Assuming this is still called in preload as before.
            if (!scene.textures.exists('monster_echo_rat')) {
                scene.load.spritesheet('monster_echo_rat', 'assets/animations/EchoRat.png', {
                    frameWidth: 32,
                    frameHeight: 32
                });
            }

            if (def.features.includes('ears')) {
                // Pointed ears
                g.fillStyle(def.bodyColor, alpha);
                g.fillTriangle(
                    center - radius * 0.6, center - radius * 0.5,
                    center - radius * 0.3, center - radius * 0.8,
                    center - radius * 0.2, center - radius * 0.4
                );
                g.fillTriangle(
                    center + radius * 0.6, center - radius * 0.5,
                    center + radius * 0.3, center - radius * 0.8,
                    center + radius * 0.2, center - radius * 0.4
                );
            }

            if (def.features.includes('tusks')) {
                // Orc tusks
                g.fillStyle(0xffffff, alpha);
                g.fillRect(center - radius * 0.4, center + radius * 0.3, radius * 0.15, radius * 0.2);
                g.fillRect(center + radius * 0.25, center + radius * 0.3, radius * 0.15, radius * 0.2);
            }

            if (def.features.includes('bones')) {
                // Skeleton bones
                g.lineStyle(2, def.accentColor, alpha);
                // Ribs
                for (let i = -2; i <= 2; i++) {
                    g.lineBetween(center + i * radius * 0.2, center - radius * 0.3,
                        center + i * radius * 0.2, center + radius * 0.3);
                }
            }

            if (def.features.includes('skull')) {
                // Skull details
                g.lineStyle(1, def.accentColor, alpha);
                // Jaw line
                g.strokeEllipse(center, center + radius * 0.4, radius * 0.6, radius * 0.3);
            }

            if (def.features.includes('legs')) {
                // Spider legs (8 legs)
                g.lineStyle(2, def.accentColor, alpha);
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const startX = center + Math.cos(angle) * radius * 0.6;
                    const startY = center + Math.sin(angle) * radius * 0.6;
                    const endX = center + Math.cos(angle) * radius * 1.2;
                    const endY = center + Math.sin(angle) * radius * 1.2;
                    g.lineBetween(startX, startY, endX, endY);
                }
            }

            if (def.features.includes('wings')) {
                // Dragon wings
                g.fillStyle(def.accentColor, alpha * 0.6);
                g.fillTriangle(
                    center - radius * 0.8, center,
                    center - radius * 1.2, center - radius * 0.5,
                    center - radius * 1.2, center + radius * 0.5
                );
                g.fillTriangle(
                    center + radius * 0.8, center,
                    center + radius * 1.2, center - radius * 0.5,
                    center + radius * 1.2, center + radius * 0.5
                );
            }

            if (def.features.includes('spikes')) {
                // Spikes on back
                g.fillStyle(def.accentColor, alpha);
                for (let i = -1; i <= 1; i++) {
                    g.fillTriangle(
                        center + i * radius * 0.4, center - radius * 0.6,
                        center + i * radius * 0.4 - radius * 0.15, center - radius * 0.9,
                        center + i * radius * 0.4 + radius * 0.15, center - radius * 0.9
                    );
                }
            }

            if (def.features.includes('snout')) {
                // Wolf snout
                g.fillStyle(def.accentColor, alpha);
                g.fillEllipse(center, center + radius * 0.4, radius * 0.3, radius * 0.2);
            }

            if (def.features.includes('glow')) {
                // Glowing effect
                g.fillStyle(def.bodyColor, alpha * 0.3);
                g.fillCircle(center, center, radius * 1.3);
            }

            // Generate texture
            g.generateTexture(def.key, size, size);
            g.destroy();
        });

        // Load gold pickup sound (if not already loaded)
        // Note: checking for audio existence in cache is complex in some Phaser versions, 
        // but load.audio is generally safe to call in preload.
        // If this runs in Create, we shouldn't be calling this.load.audio without starting loader.
        // Assuming this function is called in PRELOAD.
        scene.load.audio('gold_pickup', 'assets/audio/gold-pickup.mp3');

        // Expose monster definitions globally
        if (typeof window !== 'undefined') {
            window.monsterDefinitions = monsterDefs;
        }

        console.log('✅ TextureManager: Procedural textures generated');
    }
};
