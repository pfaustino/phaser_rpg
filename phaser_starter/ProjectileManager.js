/**
 * ProjectileManager.js
 * 
 * Handles all ranged combat mechanics:
 * - Spawning projectiles (arrows, fireballs, bolts)
 * - Physics movement and rotation
 * - Collision detection with monsters/walls
 * - Cleanup of old projectiles
 */

class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = null;
        this.nextFireTime = 0;
    }

    /**
     * Initialize the physics group for projectiles
     */
    init() {
        if (this.projectiles) {
            console.warn('⚠️ ProjectileManager: Re-initializing existing group!');
        }
        this.projectiles = this.scene.physics.add.group({
            classType: Phaser.GameObjects.Sprite,
            runChildUpdate: true
        });

        // Add collision with world bounds
        this.scene.physics.world.on('worldbounds', (body) => {
            if (body.gameObject && body.gameObject.isProjectile) {
                console.log('💥 Projectile hit World Bounds (Ignored for Debug)');
                // this.destroyProjectile(body.gameObject); // DISABLE for debugging
            }
        });

        console.log('✅ ProjectileManager initialized');
    }

    /**
     * Fire a projectile from a source towards a target angle
     * @param {Object} startPos - {x, y}
     * @param {number} angle - Angle in radians
     * @param {Object} config - Weapon config { speed, projectileType, damage, range }
     */
    fireProjectile(startPos, angle, config) {
        console.log(`🔥 fireProjectile called: Type=${config.projectileType}, Speed=${config.speed}`);
        const now = this.scene.time.now;
        if (now < this.nextFireTime) {
            console.log(`⏳ Cooldown active: ${now} < ${this.nextFireTime}`);
            return false;
        }

        // Log World Bounds
        const bounds = this.scene.physics.world.bounds;
        console.log(`🌍 World Bounds: x=${bounds.x}, y=${bounds.y}, w=${bounds.width}, h=${bounds.height}`);

        if (!this.projectiles) this.init();

        // Get projectile sprite key based on type
        let spriteKey = 'item_weapon'; // Fallback

        // Map projectile types to assets
        switch (config.projectileType) {
            case 'fireball':
                spriteKey = 'fireball_effect'; // Should be a particle/effect sprite
                break;
            case 'arrow':
                spriteKey = 'arrow';
                break;
            case 'bolt':
                spriteKey = 'arrow';
                break;
        }

        // Texture safety check
        if (!this.scene.textures.exists(spriteKey)) {
            console.warn(`⚠️ Projectile texture '${spriteKey}' missing, falling back to 'item_weapon'`);
            spriteKey = 'item_weapon';
        }

        const projectile = this.projectiles.get(startPos.x, startPos.y, spriteKey);

        if (projectile) {
            projectile.setActive(true);
            projectile.setVisible(true);
            projectile.isProjectile = true;
            projectile.damage = (config.damage !== undefined) ? config.damage : 10;
            projectile.startPos = { x: startPos.x, y: startPos.y };
            projectile.maxRange = config.range || 500;
            projectile.isCritical = Math.random() < (config.critChance || 0.05);

            // Physics setup
            this.scene.physics.velocityFromRotation(angle, config.speed || 400, projectile.body.velocity);
            projectile.setRotation(angle);

            projectile.hasHit = false; // Reset hit flag
            projectile.body.enable = true; // Re-enable body
            projectile.body.checkCollision.none = false; // Re-enable collisions
            projectile.body.setCircle(10);
            projectile.body.setCollideWorldBounds(true);
            projectile.body.onWorldBounds = true;

            // Optional: visual tweaks based on type
            if (config.projectileType === 'fireball') {
                projectile.setTint(0xffaa00);
                projectile.setScale(1.5);
            } else {
                projectile.setTint(0xffffff);
                projectile.setScale(0.8);
            }

            // Ensure visibility over map
            projectile.setDepth(2000); // Try extremely high depth

            console.log(`🏹 Projectile Spawned: x=${projectile.x}, y=${projectile.y}, depth=${projectile.depth}, visible=${projectile.visible}, alpha=${projectile.alpha}, texture=${projectile.texture.key}, frame=${projectile.frame.name}`);
            console.log(`   Velocity: x=${projectile.body.velocity.x}, y=${projectile.body.velocity.y}`);

            // DEBUG: Force a visible red box attached to the projectile
            // This proves if the object exists and moves, independent of the sprite texture
            // Uncommented for debug
            const debugRect = this.scene.add.rectangle(0, 0, 20, 20, 0xff0000, 1);
            projectile.debugRect = debugRect; // Attach to projectile to update in loop

            // Play sound
            if (typeof playSound === 'function') {
                const soundName = config.projectileType === 'fireball' ? 'fireball_cast' : 'bow_hit'; // 'bow_release' if available
                playSound(soundName);
            }

            // Cooldown handling
            this.nextFireTime = now + (config.cooldown || 500);

            return true;
        }
        return false;
    }

    /**
     * Update loop (called from game.js update)
     */
    update(time, delta) {
        if (!this.projectiles) return;

        const activeCount = this.projectiles.countActive(true);
        if (activeCount > 0) {
            // console.log(`🔄 ProjectileManager.update. Active: ${activeCount}`);
        }

        this.projectiles.getChildren().forEach((projectile) => {
            if (projectile && projectile.active) {
                // Range check
                const dist = Phaser.Math.Distance.Between(
                    projectile.x, projectile.y,
                    projectile.startPos.x, projectile.startPos.y
                );

                if (dist > projectile.maxRange) {
                    console.log('📏 Projectile exceeded range');
                    if (projectile.debugRect) projectile.debugRect.destroy();
                    this.destroyProjectile(projectile);
                    return; // Continue forEach
                }

                // Update Debug Rect
                if (projectile.debugRect) {
                    projectile.debugRect.setPosition(projectile.x, projectile.y);
                    projectile.debugRect.setDepth(2001);
                    // console.log(`🏹 Proj Update: x=${projectile.x.toFixed(1)}, y=${projectile.y.toFixed(1)}`);
                }

                // Add visual trail for fireballs
                if (projectile.isProjectile && projectile.texture.key === 'fireball_effect') {
                    // Simple particle effect simulation if particles aren't available
                    if (Math.random() < 0.3 && this.scene.add) {
                        const particle = this.scene.add.circle(projectile.x, projectile.y, 4, 0xffaa00, 0.6);
                        this.scene.tweens.add({
                            targets: particle,
                            alpha: 0,
                            scale: 0.1,
                            duration: 300,
                            onComplete: () => particle.destroy()
                        });
                    }
                }
            }
        });

        // handle collisions (checked every frame like game.js)
        if (window.monsters) {
            this.scene.physics.overlap(this.projectiles, window.monsters, (projectile, monster) => {
                this.handleMonsterCollision(projectile, monster);
            });
        }

        // Wall collision
        if (window.MapManager && window.MapManager.wallGroup) {
            this.scene.physics.collide(this.projectiles, window.MapManager.wallGroup, (projectile, wall) => {
                this.handleWallCollision(projectile, wall);
            });
        }
    }

    /**
     * Handle collision with monster
     */
    handleMonsterCollision(obj1, obj2) {
        let projectile, monster;

        // Dynamic identification: Projectiles have the isProjectile flag
        if (obj1.isProjectile) {
            projectile = obj1;
            monster = obj2;
        } else {
            projectile = obj2;
            monster = obj1;
        }

        if (!projectile || !monster || !projectile.active || !monster.active) return;

        // STRICT single-hit verify
        if (projectile.hasHit) {
            return;
        }

        // Mark as hit immediately
        projectile.hasHit = true;

        // Stop physics interaction immediately
        if (projectile.body) {
            projectile.body.checkCollision.none = true;
            projectile.body.enable = false;
        }

        projectile.setActive(false);
        projectile.setVisible(false);

        // Debug collision
        console.log('🎯 Projectile hit monster!', monster.id || monster.name);

        // Deal damage
        let damage = projectile.damage || 10; // Default to 10 if undefined


        // Crit multiplier
        if (projectile.isCritical) {
            damage *= 2;
        }

        // Apply damage to monster
        monster.hp -= damage;
        monster.hp = Math.max(0, monster.hp);

        // Visuals
        const color = projectile.isCritical ? 0xff0000 : 0xffff00;
        const text = projectile.isCritical ? `- ${damage} CRIT!` : ` - ${damage} `;

        if (typeof showDamageNumber === 'function') {
            showDamageNumber(monster.x, monster.y - 20, text, color, projectile.isCritical, 'physical');
        }

        // Hit effect
        if (typeof createHitEffects === 'function') {
            createHitEffects(monster.x, monster.y, projectile.isCritical, 'physical', 'Ranged');
        }

        // Simple knockback
        const angle = projectile.rotation;
        monster.x += Math.cos(angle) * 10;
        monster.y += Math.sin(angle) * 10;

        // Destroy projectile
        this.destroyProjectile(projectile);

        // Trigger death if needed (handled in game.js usually, but good to ensure)
        if (monster.hp <= 0) {
            if (typeof window.handleMonsterDeath === 'function') {
                console.log(`💀 Monster ${monster.id} killed by projectile.invoking death.`);
                window.handleMonsterDeath(monster);
            } else if (typeof handleMonsterDeath === 'function') {
                handleMonsterDeath(monster);
            } else {
                console.error('❌ handleMonsterDeath not found!');
            }
        }
    }

    /**
     * Handle collision with walls/environment
     */
    handleWallCollision(projectile, wall) {
        if (!projectile.active) return;
        console.log('🧱 Projectile hit Wall at', wall.x, wall.y);
        this.destroyProjectile(projectile);
    }

    destroyProjectile(projectile) {
        console.log(`💀 Reacting to destroyProjectile.POS: ${projectile.x}, ${projectile.y} `);
        // Impact effect
        if (this.scene && this.scene.add) {
            const burst = this.scene.add.circle(projectile.x, projectile.y, 5, 0xffffff, 0.8);
            this.scene.tweens.add({
                targets: burst,
                scale: 2,
                alpha: 0,
                duration: 100,
                onComplete: () => burst.destroy()
            });
        }

        if (projectile.debugRect) {
            projectile.debugRect.destroy();
        }
        projectile.destroy();
    }
}

// Global instance placeholder
window.ProjectileManager = null;
