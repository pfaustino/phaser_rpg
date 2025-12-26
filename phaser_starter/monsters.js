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
    /**
     * Update monster behavior (AI)
     * Handles aggro, movement, and attack triggers for both Wilderness and Dungeons
     */
    updateMonsterBehavior(monster, player, time, delta, currentMap, pathfinder, monsterAttackPlayerCallback) {
        if (!monster || !monster.active || !monster.body) return;

        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            monster.x, monster.y
        );

        // Update animation based on movement
        const isMoving = monster.body.velocity.x !== 0 || monster.body.velocity.y !== 0;
        this.update(monster, isMoving);

        // Aggro Logic (Hysteresis)
        const MONSTER_AGGRO_RADIUS = 200;
        const MONSTER_DEAGGRO_RADIUS = 400;

        if (distance < MONSTER_AGGRO_RADIUS) {
            monster.isAggro = true;
        } else if (distance > MONSTER_DEAGGRO_RADIUS) {
            monster.isAggro = false;
        }

        // Movement Logic
        if (monster.isAggro && distance > 32) { // 32 is "stop distance" to prevent clipping
            const monsterSpeed = monster.speed || 50;

            if (currentMap === 'dungeon' && pathfinder) {
                // --- Dungeon: Use Pathfinding ---
                // Update path every 500ms or if no path
                if (!monster.lastPathTime || time - monster.lastPathTime > 500 || !monster.currentPath) {
                    monster.currentPath = pathfinder.findPath(monster.x, monster.y, player.x, player.y);
                    monster.lastPathTime = time;

                    // Remove first point if it's too close
                    if (monster.currentPath && monster.currentPath.length > 0) {
                        const firstPoint = monster.currentPath[0];
                        const distToFirst = Phaser.Math.Distance.Between(monster.x, monster.y, firstPoint.x, firstPoint.y);
                        if (distToFirst < 16) monster.currentPath.shift();
                    }
                }

                // Follow the path
                if (monster.currentPath && monster.currentPath.length > 0) {
                    const nextPoint = monster.currentPath[0];
                    const distToPoint = Phaser.Math.Distance.Between(monster.x, monster.y, nextPoint.x, nextPoint.y);

                    if (distToPoint < 5) {
                        monster.currentPath.shift(); // Reached waypoint
                    } else {
                        this.scene.physics.moveTo(monster, nextPoint.x, nextPoint.y, monsterSpeed);
                    }
                } else {
                    // Fallback to direct movement if path fails or finished
                    this.scene.physics.moveToObject(monster, player, monsterSpeed);
                }
            } else {
                // --- Wilderness / No Pathfinder: Direct Movement ---
                this.scene.physics.moveToObject(monster, player, monsterSpeed);
            }
        } else {
            // Stop if not aggro or too close
            monster.body.setVelocity(0);
        }

        // Attack Logic (Unified)
        // Ensure attack range is generous enough (50) vs stop distance (32) to function
        if (distance <= monster.attackRange && monster.hp > 0) {
            // Call the attack function (passed as callback or assume global)
            if (typeof monsterAttackPlayerCallback === 'function') {
                monsterAttackPlayerCallback(monster, time);
            } else if (typeof monsterAttackPlayer !== 'undefined') {
                // Fallback to global if callback not provided
                monsterAttackPlayer(monster, time);
            }
        }
    }
}

// End of class definition
