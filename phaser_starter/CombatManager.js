/**
 * CombatManager.js
 * Handles all combat logic: Player attacks, Monster attacks, Damage calculation, and Death.
 */

window.CombatManager = {
    scene: null,

    init(scene) {
        this.scene = scene;
        debugLog('⚔️ CombatManager initialized');
    },

    /**
     * Player attack function
     * Handles both Melee (default) and Ranged (via ProjectileManager)
     */
    playerAttack(time, isRightClick = false, aimAngle = null) {
        const scene = this.scene || window.game.scene.scenes[0];
        const player = window.player;

        if (!player || !player.active) return;

        const stats = window.GameState.playerStats;

        // Fallback for time
        if (!time) time = scene.time.now;

        // Fix for Post-Load Attack Bug (Future Timestamp)
        if (stats.lastAttackTime > time) {
            stats.lastAttackTime = 0;
        }

        // Check cooldown
        if (time - stats.lastAttackTime < stats.attackCooldown) {
            return;
        }

        // --- RANGED / PROJECTILE LOGIC ---
        const equippedWeapon = (stats.equipment && stats.equipment.weapon) ? stats.equipment.weapon : {};

        // Debug
        // debugLog('[Combat] Attack with:', equippedWeapon.name);

        let projectileType = equippedWeapon.projectile;
        let projectileSpeed = equippedWeapon.projectileSpeed;
        let projectileRange = equippedWeapon.range;

        // Try to lookup from ItemManager definitions if missing on instance
        if (!projectileType && equippedWeapon.weaponType && window.ItemManager && window.ItemManager.definitions) {
            const def = window.ItemManager.definitions.weaponTypes[equippedWeapon.weaponType];
            if (def && def.projectile) {
                projectileType = def.projectile;
                projectileSpeed = def.projectileSpeed;
                projectileRange = def.range;
            }
        }

        // Fire Projectile if type exists
        if (projectileType && window.projectileManager) {
            let angle;
            let targetX, targetY;

            if (aimAngle !== null) {
                angle = aimAngle;
                targetX = player.x + Math.cos(angle) * 100;
                targetY = player.y + Math.sin(angle) * 100;
            } else {
                targetX = scene.input.activePointer.worldX;
                targetY = scene.input.activePointer.worldY;
                angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
            }

            const fired = window.projectileManager.fireProjectile(
                { x: player.x, y: player.y },
                angle,
                {
                    projectileType: projectileType,
                    speed: projectileSpeed,
                    range: projectileRange,
                    damage: stats.attack || 10,
                    critChance: stats.critChance || 0.05
                }
            );

            if (fired) {
                stats.lastAttackTime = time;
                this._updatePlayerFacing(player, targetX, targetY);
                return; // Skip melee logic
            }
        }

        // --- MELEE LOGIC ---

        // Combo tracking
        const timeSinceLastAttack = time - stats.lastAttackTime;
        if (timeSinceLastAttack < stats.comboResetTime && stats.comboCount > 0) {
            stats.comboCount++;
        } else {
            stats.comboCount = 1;
        }
        stats.lastAttackTime = time;
        stats.comboTimer = 0;

        // Weapon properties
        const weaponQuality = equippedWeapon.quality || 'Common';
        const weaponType = equippedWeapon.weaponType || 'Sword';

        // Visuals: Trail & Sound
        const facingDirection = player.facingDirection || 'south';
        if (window.createWeaponSwingTrail) window.createWeaponSwingTrail(player.x, player.y, facingDirection, weaponQuality);

        const swingSound = (typeof window.getWeaponHitSound === 'function') ? window.getWeaponHitSound(weaponType) : 'attack_swing';
        if (window.playSound) window.playSound(swingSound);

        // Visuals: Animation
        if (window.animateWeaponStrike) window.animateWeaponStrike(facingDirection, weaponType);

        // Player Animation
        this._playPlayerAttackAnimation(player, scene);

        // --- HIT DETECTION ---
        const attackRange = 50;
        let closestMonster = null;
        let closestDistance = attackRange;

        if (window.monsters) {
            window.monsters.forEach(monster => {
                if (monster.hp <= 0) return;
                const dist = Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y);
                if (dist < closestDistance) {
                    closestDistance = dist;
                    closestMonster = monster;
                }
            });
        }

        if (closestMonster) {
            this.damageMonster(closestMonster, stats.attack, weaponType);
        }
    },

    /**
     * Apply damage to a monster
     */
    damageMonster(monster, baseDamage, weaponType = 'Unarmed') {
        const variation = Phaser.Math.FloatBetween(0.9, 1.1);
        let damage = Math.max(1, Math.floor(baseDamage * variation));

        // Crit Check
        const isCritical = Math.random() < (window.playerStats.critChance || 0.05);
        if (isCritical) damage = Math.floor(damage * 2);

        // Apply
        monster.hp = Math.max(0, monster.hp - damage);

        // Visuals
        this.createHitEffects(monster.x, monster.y, isCritical, 'physical', weaponType);

        // Camera Shake
        if (isCritical) {
            if (window.shakeCamera) window.shakeCamera(200, 0.01);
        } else if (damage > baseDamage * 1.5) {
            if (window.shakeCamera) window.shakeCamera(100, 0.005);
        }

        // Numbers & Text
        const color = isCritical ? 0xff0000 : 0xffff00;
        const text = isCritical ? `-${damage} CRIT!` : `-${damage}`;
        if (window.showDamageNumber) window.showDamageNumber(monster.x, monster.y - 20, text, color, isCritical, 'physical');

        const mName = monster.monsterType || 'Monster';
        const msg = isCritical ? `${text} on ${mName}` : `Hit ${mName} for ${damage} damage`;
        if (window.addChatMessage) window.addChatMessage(msg, color, '⚔️');

        // Sound
        const hitSound = (typeof window.getWeaponHitSound === 'function') ? window.getWeaponHitSound(weaponType) : 'hit_monster';
        if (window.playSound) window.playSound(hitSound);

        // Flash Effect
        if (monster.setTintFill) {
            monster.setTintFill(0xffffff);
            if (this.scene) this.scene.time.delayedCall(80, () => {
                if (monster && monster.active && monster.clearTint) monster.clearTint();
            });
        } else if (monster.setTint) {
            monster.setTint(isCritical ? 0xff0000 : 0xffffff);
            if (this.scene) this.scene.time.delayedCall(100, () => {
                if (monster && monster.active && monster.clearTint) monster.clearTint();
            });
        }

        // Death Check (handled in update loop usually, but we can verify here)
        // (game.js update loop calls handleMonsterDeath if hp <= 0)
    },

    /**
     * Monster Attacks Player
     */
    monsterAttackPlayer(monster, time) {
        if (!window.player || !window.player.active) return;
        if (window.isGamePaused) return;
        if (window.playerStats && window.playerStats.isInvulnerable) return;

        // Cooldown
        if (time - monster.lastAttackTime < monster.attackCooldown) return;
        monster.lastAttackTime = time;

        // Facings
        this._updateMonsterFacing(monster, window.player);

        // Animation
        if (window.playMonsterAttackAnimation) window.playMonsterAttackAnimation(monster);

        // Damage Calc
        const baseDamage = Number(monster.attack) || 0;
        const defense = Number(window.playerStats.defense) || 0;
        let actualDamage = Math.max(1, Math.floor(baseDamage * (100 / (100 + defense)))); // % mitigation

        // Apply
        window.playerStats.hp = Math.max(0, window.playerStats.hp - actualDamage);

        // Effects
        this.createHitEffects(window.player.x, window.player.y, false, 'physical');
        if (window.playSound) window.playSound('hit_player');
        if (window.shakeCamera) window.shakeCamera(150, 0.008);

        // UI
        if (window.showDamageNumber) window.showDamageNumber(window.player.x, window.player.y - 20, `-${actualDamage}`, 0xff0000, false, 'physical');
        const mName = monster.monsterType || 'Monster';
        if (window.addChatMessage) window.addChatMessage(`Took ${actualDamage} damage from ${mName}`, 0xff6b6b, '🛡️');

        // Flash Player
        if (window.player.setTintFill) {
            window.player.setTintFill(0xffffff);
            if (this.scene) this.scene.time.delayedCall(80, () => { if (window.player) window.player.clearTint(); });
        } else {
            window.player.setTint(0xff0000);
            if (this.scene) this.scene.time.delayedCall(100, () => { if (window.player) window.player.clearTint(); });
        }

        // Death Check
        if (window.playerStats.hp <= 0) {
            debugLog('💀 Player died via CombatManager');
            if (window.showFallenDialog) window.showFallenDialog();
        }
    },

    /**
     * Handle Monster Death
     */
    handleMonsterDeath(monster) {
        if (!monster || monster.isDead) return;

        debugLog(`💀 Monster Death: ${monster.id}`);
        monster.isDead = true;

        // UI Cleanup
        if (monster.hpBarBg) { monster.hpBarBg.destroy(); monster.hpBarBg = null; }
        if (monster.hpBar) { monster.hpBar.destroy(); monster.hpBar = null; }
        if (monster.levelLabel) { monster.levelLabel.destroy(); monster.levelLabel = null; }

        // Stats
        if (!window.playerStats.questStats.monstersKilled) window.playerStats.questStats.monstersKilled = 0;
        window.playerStats.questStats.monstersKilled++;

        // XP
        const baseXp = monster.xpReward || 10;
        const difficulty = window.GameState?.currentDifficulty || 'normal';
        const mult = (window.Constants?.DIFFICULTY?.[difficulty]?.xpMult) || 1;
        const xpGain = Math.floor(baseXp * mult);

        if (window.addXp) window.addXp(xpGain); // Uses PlayerStatsManager
        else if (window.PlayerStatsManager) window.PlayerStatsManager.addXp(xpGain);

        // Loot
        if (window.dropItemsFromMonster) window.dropItemsFromMonster(monster.x, monster.y, baseXp, monster.isBoss);

        // Visuals (Death Anim)
        if (window.createDeathEffects) window.createDeathEffects(monster.x, monster.y);
        if (window.playSound) window.playSound('monster_die');

        // Remove
        if (this.scene) {
            this.scene.tweens.add({
                targets: monster,
                alpha: 0,
                y: monster.y - 20,
                duration: 500,
                onComplete: () => {
                    if (monster.active) {
                        monster.destroy();
                        if (window.monsters) {
                            const idx = window.monsters.indexOf(monster);
                            if (idx > -1) window.monsters.splice(idx, 1);
                        }
                    }
                }
            });
        }

        // UQE Event
        if (window.uqe && window.uqe.eventBus) {
            window.uqe.eventBus.emit('monster_killed', {
                id: monster.monsterId || monster.id || 'unknown',
                type: monster.monsterType || monster.type || 'unknown'
            });
        }

        // Milestones
        if (window.milestoneManager) {
            window.milestoneManager.checkTriggers('stat_change', { stat: 'monsters_killed', value: window.playerStats.questStats.monstersKilled });
            if (monster.isBoss) window.milestoneManager.checkTriggers('boss_kill', { bossId: monster.monsterId });
        }

        // Boss Logic
        if (monster.isBoss && window.onBossDefeated && window.MapManager && window.MapManager.currentMap === 'dungeon') {
            window.onBossDefeated(window.MapManager.dungeonLevel, monster.x, monster.y);
        }
    },

    /**
     * Create Hit Particles
     */
    createHitEffects(x, y, isCritical, damageType = 'physical', weaponType = 'Unarmed') {
        const scene = this.scene || window.game.scene.scenes[0];
        if (!scene) return;

        const particleCount = isCritical ? 30 : 16;
        const baseSize = isCritical ? 5 : 3;

        // Color Logic
        let colors = [0xffd700, 0xff8800]; // Default
        if (damageType === 'physical') {
            if (weaponType === 'Staff' || weaponType === 'Wand') colors = [0x00ffff, 0x0088ff, 0xaa00ff];
            else if (weaponType === 'Sword') colors = [0xffffff, 0xaaaaaa, 0xff0000];
            else if (weaponType === 'Axe') colors = [0xff0000, 0x880000, 0xffffff];
            else if (weaponType === 'Dagger') colors = [0xffff00, 0xffffff];
        } else if (damageType === 'magic') {
            colors = isCritical ? [0x4400ff, 0x8800ff, 0xaa88ff] : [0x4400ff, 0x6600ff];
        }

        for (let i = 0; i < particleCount; i++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.FloatBetween(50, 120);
            const dist = Phaser.Math.FloatBetween(5, 30);
            const color = Phaser.Utils.Array.GetRandom(colors);
            const size = Phaser.Math.FloatBetween(baseSize, baseSize + 2);

            const p = scene.add.circle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, size, color, 1).setDepth(201);
            p.setBlendMode(Phaser.BlendModes.ADD);

            scene.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * speed * 1.5,
                y: y + Math.sin(angle) * speed * 1.5,
                alpha: 0,
                scale: 0.1,
                duration: Phaser.Math.Between(400, 700),
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy()
            });
        }
    },

    // --- Helpers ---
    _updatePlayerFacing(player, targetX, targetY) {
        if (Math.abs(targetX - player.x) > Math.abs(targetY - player.y)) {
            player.facingDirection = targetX > player.x ? 'east' : 'west';
        } else {
            player.facingDirection = targetY > player.y ? 'south' : 'north';
        }
        if (this.scene && this.scene.textures.exists(`player_walk_${player.facingDirection}`)) {
            player.setTexture(`player_walk_${player.facingDirection}`);
        }
    },

    _updateMonsterFacing(monster, player) {
        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        if (Math.abs(dy) > Math.abs(dx)) {
            monster.facingDirection = dy > 0 ? 'south' : 'north';
        } else {
            monster.facingDirection = dx > 0 ? 'east' : 'west';
        }
    },

    _playPlayerAttackAnimation(player, scene) {
        if (scene.anims.exists('attack')) {
            player.anims.stop();
            if (scene.textures.exists('player_attack')) player.setTexture('player_attack');
            player.play('attack');
            player.once('animationcomplete', (animation) => {
                if (animation.key === 'attack') {
                    if (scene.textures.exists(`player_walk_${player.facingDirection}`)) {
                        player.setTexture(`player_walk_${player.facingDirection}`);
                    }
                }
            });
        }
    }
};

// Global Aliases
window.playerAttack = (time, right, angle) => window.CombatManager.playerAttack(time, right, angle);
window.monsterAttackPlayer = (monster, time) => window.CombatManager.monsterAttackPlayer(monster, time);
window.handleMonsterDeath = (monster) => window.CombatManager.handleMonsterDeath(monster);
window.createHitEffects = (x, y, crit, type, weapon) => window.CombatManager.createHitEffects(x, y, crit, type, weapon);
