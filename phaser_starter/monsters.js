/**
 * MonsterRenderer - Handles Method 2 procedural rendering
 */
class MonsterRenderer {
    constructor(scene) {
        this.scene = scene;
        this.monsterBlueprints = {};
    }

    /**
     * Initialize with data from monsters.json
     */
    init(data) {
        if (data && data.monsters) {
            data.monsters.forEach(m => {
                this.monsterBlueprints[m.name] = m;
                // Also allow lookup by ID
                if (m.id) this.monsterBlueprints[m.id] = m;
            });
            console.log('✅ MonsterRenderer initialized with', data.monsters.length, 'blueprints');
        }
    }

    /**
     * Create a procedural monster using Method 2
     */
    createMonster(x, y, blueprintId) {
        const bp = this.monsterBlueprints[blueprintId];
        if (!bp) {
            console.warn('⚠️ No blueprint found for:', blueprintId);
            return null;
        }

        const appearance = bp.appearance;
        const container = this.scene.add.container(x, y);

        // Add physics (if needed - assuming it matches existing monster logic)
        this.scene.physics.add.existing(container);

        // Set up the body based on layers
        appearance.layers.sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(layer => {
            let element;
            if (layer.type === 'shape') {
                element = this.createShape(layer);
            }

            if (element) {
                if (layer.offset) {
                    element.x = layer.offset.x;
                    element.y = layer.offset.y;
                }
                container.add(element);
            }
        });

        // Store metadata for animations
        container.setData('blueprint', bp);
        container.setData('isMethod2', true);

        // Initial animation
        this.applyAnimations(container);

        return container;
    }

    createShape(layer) {
        const g = this.scene.add.graphics();
        const color = Phaser.Display.Color.HexStringToColor(layer.color || '#FFFFFF').color;
        const alpha = layer.alpha !== undefined ? layer.alpha : 1.0;

        g.fillStyle(color, alpha);

        if (layer.shape === 'ellipse' || layer.shape === 'circle') {
            const w = layer.width || (layer.radius * 2) || 32;
            const h = layer.height || (layer.radius * 2) || 32;
            g.fillEllipse(0, 0, w, h);
        } else if (layer.shape === 'rect') {
            g.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
        } else if (layer.shape === 'triangle' && layer.points) {
            g.fillTriangle(
                layer.points[0], layer.points[1],
                layer.points[2], layer.points[3],
                layer.points[4], layer.points[5]
            );
        }

        return g;
    }

    applyAnimations(container) {
        const bp = container.getData('blueprint');
        if (!bp || !bp.appearance.animations) return;

        const anims = bp.appearance.animations;

        // Idle animation
        if (anims.idle) {
            const idle = anims.idle;
            if (idle.type === 'pulse') {
                const property = idle.property || 'scaleY';
                const tweenConfig = {
                    targets: container,
                    duration: idle.duration || 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                };
                tweenConfig[property] = idle.to || 0.8;
                this.scene.tweens.add(tweenConfig);
            } else if (idle.type === 'float') {
                this.scene.tweens.add({
                    targets: container,
                    y: container.y - (idle.range || 10),
                    duration: idle.duration || 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        }

        // We'll store move data for update loop handling if needed, 
        // but for now let's implement basic tween-based movement feel if walking
        // Actually, 'hop' and 'slide' are better handled in the game's update loop or via continuous tweens
    }

    /**
     * Update animations based on movement state
     */
    update(container, isMoving) {
        const bp = container.getData('blueprint');
        if (!bp || !bp.appearance.animations) return;

        const walk = bp.appearance.animations.walk;
        if (!walk) return;

        if (isMoving) {
            if (walk.type === 'hop' && !container.getData('isHopping')) {
                container.setData('isHopping', true);
                this.scene.tweens.add({
                    targets: container,
                    y: container.y - 10,
                    duration: 200 / (walk.speed || 1),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Quad.easeOut'
                });
            } else if (walk.type === 'jitter') {
                container.x += (Math.random() - 0.5) * (walk.range || 2);
                container.y += (Math.random() - 0.5) * (walk.range || 2);
            }
            // 'slide' is mostly visual, maybe a slight tilt?
        } else {
            if (container.getData('isHopping')) {
                this.scene.tweens.killTweensOf(container, 'y');
                container.setData('isHopping', false);
                // Reset y if needed, but the scene will update it based on physics
            }
        }
    }
}

// End of class definition
