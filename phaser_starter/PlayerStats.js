/**
 * PlayerStats.js
 * Handles calculation and management of player statistics.
 */

window.PlayerStatsManager = {
    /**
     * Recalculate player stats based on base stats + equipment + level
     */
    recalculateStats() {
        if (typeof playerStats === 'undefined' || !playerStats) return;

        // Base Stats
        // specific to class or default
        const baseStats = {
            maxHp: 100 + ((playerStats.level || 1) * 10),
            maxMana: 50 + ((playerStats.level || 1) * 5),
            baseAttack: 10 + ((playerStats.level || 1) * 2),
            baseDefense: 0 + ((playerStats.level || 1) * 1),
            speed: 200 // Default base speed
        };

        // Reset to base (preserve current HP/Mana values, just update caps)
        playerStats.maxHp = baseStats.maxHp;
        playerStats.maxMana = baseStats.maxMana;
        playerStats.baseAttack = baseStats.baseAttack;
        playerStats.baseDefense = baseStats.baseDefense;
        playerStats.speed = baseStats.speed;
        playerStats.speedBonus = 0;

        // Apply Equipment Bonuses
        if (playerStats.equipment) {
            Object.values(playerStats.equipment).forEach(item => {
                if (!item) return;

                // Add stats
                if (item.maxHp) playerStats.maxHp += item.maxHp;
                // if (item.maxMana) playerStats.maxMana += item.maxMana; 
                if (item.attackPower) playerStats.baseAttack += item.attackPower;
                if (item.defense) playerStats.baseDefense += item.defense;

                // Speed
                if (item.speed) {
                    playerStats.speed += item.speed;
                    playerStats.speedBonus += item.speed;
                }
            });
        }

        // Apply active buffs/potions? (Not implemented yet, but placeholder)

        // Sanity Checks
        playerStats.speed = Math.max(100, playerStats.speed);

        debugLog(`📊 Stats Recalculated: Speed=${playerStats.speed} (Base: 200 + Bonus: ${playerStats.speedBonus})`);
    },

    init(scene) {
        this.scene = scene;
    },

    /**
     * Calculate total XP needed to reach the NEXT level
     * Curve: 500 * Level + 250 * Level^2 (Significantly steeper to prevent over-leveling)
     */
    getXPNeededForLevel(level) {
        return 500 * level + 250 * Math.pow(level, 2);
    },

    /**
     * Add XP to player and check for level up
     * @param {number} amount - Amount of XP to add
     */
    addXp(amount) {
        if (!amount || amount <= 0) return;

        // Safety check for NaN or undefined XP
        if (typeof playerStats.xp !== 'number' || isNaN(playerStats.xp)) {
            console.warn('⚠️ [GameState] Fixed corrupted XP value (was NaN/undefined)');
            playerStats.xp = 0;
        }

        // AUTO-REPAIR: Check if XP is lower than the minimum required for the current level
        const minXP = playerStats.level > 1 ? this.getXPNeededForLevel(playerStats.level - 1) : 0;
        if (playerStats.xp < minXP) {
            console.warn(`⚠️ [GameState] Detected XP Desync! Level ${playerStats.level} requires ${minXP} XP, but found ${playerStats.xp}. Repairing...`);
            playerStats.xp = minXP;
        }

        playerStats.xp += amount;

        // Visual feedback (requires window.player)
        if (typeof showDamageNumber === 'function' && window.player) {
            showDamageNumber(window.player.x, window.player.y - 50, `+${amount} XP`, 0xb478ff, false, 'xp');
        }

        // Check for level up immediately
        this.checkLevelUp();

        // Update UI (requires global updateUI)
        if (typeof updateUI === 'function') updateUI();
    },

    /**
     * Check for level up
     */
    checkLevelUp() {
        // Check loop to handle multiple level ups at once (e.g. big boss XP)
        let leveledUp = false;

        while (true) {
            const xpNeeded = this.getXPNeededForLevel(playerStats.level);

            if (playerStats.xp >= xpNeeded) {
                playerStats.level++;
                playerStats.maxHp += 20;
                playerStats.hp = playerStats.maxHp; // Full heal on level up
                playerStats.maxMana += 10;
                playerStats.mana = playerStats.maxMana;
                playerStats.attack += 2;
                playerStats.defense += 1;

                // Recalculate derived stats
                this.recalculateStats();

                leveledUp = true;
                debugLog(`Level up! Now level ${playerStats.level}`);
            } else {
                break;
            }
        }

        if (leveledUp) {
            // Check if any UI is open OR if explicitly blocked OR if dialogs are queued
            const isQueueActive = (typeof window.dialogQueue !== 'undefined' && window.dialogQueue.length > 0);
            const uiOpen = (window.UIManager && window.UIManager.isAnyWindowOpen());

            if (uiOpen || window.blockLevelUpEffect || isQueueActive) {
                debugLog('⏳ Level Up Queued (UI Open, Blocked, or Dialog Queued)');
                window.pendingLevelUp = true;
                window.pendingLevelUpStats = { level: playerStats.level }; // store for display
            } else {
                this.createLevelUpEffect(playerStats.level);
            }

            // UQE: Emit level up event
            if (typeof uqe !== 'undefined') {
                uqe.eventBus.emit(UQE_EVENTS.LEVEL_UP, { level: playerStats.level });
                uqe.update();
            }
        }
    },

    /**
     * Trigger visual and audio effects for Level Up
     */
    createLevelUpEffect(newLevel) {
        const scene = this.scene || (window.game && window.game.scene.scenes[0]);
        if (!scene) return;

        // 1. Get Audio Duration for Sync
        let duration = 2500; // Default fallback (ms)

        // Check if audio exists and get duration
        if (scene.cache.audio.exists('level_up')) {
            const audioData = scene.cache.audio.get('level_up');
            if (audioData && audioData.duration) {
                duration = audioData.duration * 1000;
            }
        }

        debugLog(`🎵 Level Up Effect Sync: ${duration.toFixed(0)}ms`);

        // Guard: Prevent playing if blocked or UI open (Double check)
        const uiOpen = (window.UIManager && window.UIManager.isAnyWindowOpen());
        const isQueueActive = (typeof window.dialogQueue !== 'undefined' && window.dialogQueue.length > 0);

        if (window.blockLevelUpEffect || uiOpen || isQueueActive) {
            debugLog('🛑 Level Up Effect BLOCKED (Safety Guard)');
            window.pendingLevelUp = true;
            if (!window.pendingLevelUpStats && playerStats) {
                window.pendingLevelUpStats = { level: playerStats.level };
            }
            return;
        }

        // 2. Sound
        if (typeof playSound === 'function') playSound('level_up');

        // 3. Floating Text
        const levelText = scene.add.text(window.player.x, window.player.y - 60, 'LEVEL UP!', {
            fontSize: '32px',
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 6,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(2000);

        // Animate Text
        scene.tweens.add({
            targets: levelText,
            y: window.player.y - 120, // Float higher
            alpha: { from: 1, to: 0 },
            scaleX: 1.5,
            scaleY: 1.5,
            duration: duration,
            ease: 'Quad.easeOut',
            onComplete: () => levelText.destroy()
        });

        // 4. Particle Explosion
        const particleConfig = {
            speed: { min: 100, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.7, end: 0 },
            blendMode: 'ADD',
            lifespan: Math.min(duration, 1500),
            gravityY: 50,
            quantity: 30
        };

        let texture = 'gui_gem_socket';
        if (!scene.textures.exists(texture)) texture = 'fireball_effect';

        const emitter = scene.add.particles(0, 0, texture, particleConfig);
        emitter.setPosition(window.player.x, window.player.y);
        emitter.explode(40);

        setTimeout(() => emitter.destroy(), duration + 100);

        // 5. Chat Message
        if (window.addChatMessage) {
            window.addChatMessage(`Level Up! Now Level ${newLevel}`, 0x00ffff, '⭐');
            window.addChatMessage('HP & Mana Restored!', 0x00ff00, '💚');
        }
    },

    /**
     * Check for pending level ups
     */
    checkPendingLevelUp() {
        if (window.pendingLevelUp) {
            const isQueueActive = (typeof window.dialogQueue !== 'undefined' && window.dialogQueue.length > 0);
            const uiOpen = (window.UIManager && window.UIManager.isAnyWindowOpen());

            if (!uiOpen && !window.blockLevelUpEffect && !isQueueActive) {
                debugLog('✅ Triggering Queued Level Up');
                this.createLevelUpEffect(window.pendingLevelUpStats ? window.pendingLevelUpStats.level : playerStats.level);
                window.pendingLevelUp = false;
                window.pendingLevelUpStats = null;
            }
        }
    }
};

// Global Alias for backward compatibility if needed, though strictly we should use the manager
window.recalculatePlayerStats = () => window.PlayerStatsManager.recalculateStats();
// Global Aliases for Game.js Compatibility
window.addXp = (amount) => window.PlayerStatsManager.addXp(amount);
window.checkLevelUp = () => window.PlayerStatsManager.checkLevelUp();
window.createLevelUpEffect = (level) => window.PlayerStatsManager.createLevelUpEffect(level);
window.checkPendingLevelUp = () => window.PlayerStatsManager.checkPendingLevelUp();
window.getXPNeededForLevel = (level) => window.PlayerStatsManager.getXPNeededForLevel(level);
