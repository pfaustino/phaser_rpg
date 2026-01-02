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
        this.projectiles = this.scene.physics.add.group({
            classType: Phaser.GameObjects.Sprite,
            runChildUpdate: true
        });

        // Add collision with world bounds
        this.scene.physics.world.on('worldbounds', (body) => {
            if (body.gameObject && body.gameObject.isProjectile) {
                this.destroyProjectile(body.gameObject);
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
        const now = this.scene.time.now;
        if (now < this.nextFireTime) return false;

        if (!this.projectiles) this.init();

        // Get projectile sprite key based on type
        let spriteKey = 'item_weapon'; // Fallback
        let frame = 0;

        // Map projectile types to assets
        switch (config.projectileType) {
            case 'fireball':
                spriteKey = 'fireball_effect'; // Should be a particle/effect sprite
                break;
            case 'arrow':
                spriteKey = 'item_weapon'; // Placeholder, ideally a dedicated arrow sprite
                break;
            case 'bolt':
                spriteKey = 'item_weapon';
                break;
        }

        const projectile = this.projectiles.get(startPos.x, startPos.y, spriteKey);

        if (projectile) {
            projectile.setActive(true);
            projectile.setVisible(true);
            projectile.isProjectile = true;
            projectile.damage = config.damage || 10;
            projectile.startPos = { x: startPos.x, y: startPos.y };
            projectile.maxRange = config.range || 500;
            projectile.isCritical = Math.random() < (config.critChance || 0.05);

            // Physics setup
            this.scene.physics.velocityFromRotation(angle, config.speed || 400, projectile.body.velocity);
            projectile.setRotation(angle);

            // Adjust hit box
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

        this.projectiles.children.iterate((projectile) => {
            if (projectile && projectile.active) {
                // Range check
                const dist = Phaser.Math.Distance.Between(
                    projectile.x, projectile.y,
                    projectile.startPos.x, projectile.startPos.y
                );

                if (dist > projectile.maxRange) {
                    this.destroyProjectile(projectile);
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
    }

    /**
     * Handle collision with monster
     */
    handleMonsterCollision(projectile, monster) {
        if (!projectile.active || !monster.active) return;

        // Deal damage
        let damage = projectile.damage;

        // Crit multiplier
        if (projectile.isCritical) {
            damage *= 2;
        }

        // Apply damage to monster
        monster.hp -= damage;
        monster.hp = Math.max(0, monster.hp);

        // Visuals
        const color = projectile.isCritical ? 0xff0000 : 0xffff00;
        const text = projectile.isCritical ? `-${damage} CRIT!` : `-${damage}`;

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
        if (monster.hp <= 0 && typeof handleMonsterDeath === 'function') {
            handleMonsterDeath(monster);
        }
    }

    /**
     * Handle collision with walls/environment
     */
    handleWallCollision(projectile, wall) {
        if (!projectile.active) return;
        this.destroyProjectile(projectile);
    }

    destroyProjectile(projectile) {
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

        projectile.destroy();
    }
}

// Global instance placeholder
window.ProjectileManager = null;
