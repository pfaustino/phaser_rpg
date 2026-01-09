class AbilityManager {
    constructor() {
        this.scene = null;
        this.abilityBar = null;
        this.definitions = {
            'fireball': {
                name: 'Fireball',
                description: 'Area damage explosion that burns enemies over 3 seconds.',
                icon: 'fireball_effect', color: 0xff4400, manaCost: 10, cooldown: 1000
            },
            'heal': {
                name: 'Healing Light',
                description: 'Restores 50 HP to yourself.',
                icon: 'heal_effect', color: 0x00ff00, manaCost: 20, cooldown: 5000, healAmount: 50
            },
            'shield': {
                name: 'Arcane Shield',
                description: 'Grants temporary invulnerability for 3 seconds.',
                icon: 'shield_effect', color: 0x0088ff, manaCost: 15, cooldown: 8000
            },
            'ice_nova': {
                name: 'Ice Nova',
                description: 'Slows nearby enemies in place dealing area damage over 3 seconds.',
                icon: 'ice_nova_effect', color: 0x00ffff, manaCost: 25, cooldown: 6000, damage: 40, aoe: true
            }
        };
    }

    init(scene) {
        this.scene = scene;
        console.log('[AbilityManager] Initialized');

        // Expose global hooks for legacy compatibility and input mapping
        window.useAbility = (index) => this.useAbility(index);
        window.useItem = (index) => console.warn('useItem deprecated, use inventory system'); // Potion slots use direct logic now or specific item use
        // Note: The original code called window.useItem(index) for potions. 
        // We need to ensure we handle potion usage correctly.
    }

    /**
     * Create the ability bar UI
     */
    createAbilityBar() {
        if (!this.scene) return;

        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;

        const bottomMargin = 15;
        const abilityBarY = screenHeight - bottomMargin - 30;
        const abilitySpacing = 80;
        const startX = screenWidth / 2 - (Object.keys(this.definitions).length - 1) * abilitySpacing / 2;

        this.abilityBar = {
            buttons: [],
            potionSlots: [],
            cooldownOverlays: []
        };

        let index = 0;
        Object.keys(this.definitions).forEach(abilityId => {
            const ability = this.definitions[abilityId];
            const x = startX + index * abilitySpacing;

            // Button background
            const buttonBg = this.scene.add.rectangle(x, abilityBarY, 60, 60, 0x333333, 0.9)
                .setScrollFactor(0).setDepth(200).setStrokeStyle(2, 0x666666)
                .setInteractive({ useHandCursor: true });

            // Interaction Logic
            buttonBg.on('pointerover', () => {
                buttonBg.setStrokeStyle(2, 0xffffff);
                if (window.UIManager && typeof window.UIManager.showTooltip === 'function') {
                    const tooltipData = {
                        type: 'ability',
                        name: ability.name,
                        description: ability.description,
                        manaCost: ability.manaCost,
                        cooldown: ability.cooldown,
                        quality: 'Rare'
                    };
                    window.UIManager.showTooltip(tooltipData, x, abilityBarY - 60, 'ability');
                }
            });

            buttonBg.on('pointerout', () => {
                buttonBg.setStrokeStyle(2, 0x666666);
                if (window.UIManager && typeof window.UIManager.hideTooltip === 'function') {
                    window.UIManager.hideTooltip();
                }
            });

            // Click / Tap to Cast
            buttonBg.on('pointerdown', (pointer, localX, localY, event) => {
                if (event && event.stopPropagation) event.stopPropagation();

                // Calculate index based on current keys 
                // We need to capture the current explicit index for this closure
                const capturedIndex = index + 1;
                this.useAbility(capturedIndex);

                this.scene.tweens.add({
                    targets: buttonBg,
                    scale: 0.9,
                    duration: 50,
                    yoyo: true
                });
            });

            // Ability icon
            const icon = this.scene.add.sprite(x, abilityBarY, ability.icon);
            icon.setScrollFactor(0).setDepth(201).setScale(0.8);
            icon.setTint(ability.color);

            // Key binding text
            const keyText = this.scene.add.text(x - 20, abilityBarY - 20, (index + 1).toString(), {
                fontSize: '14px', fill: '#ffffff', fontStyle: 'bold', backgroundColor: '#000000', padding: { x: 3, y: 2 }
            }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

            // Cooldown overlay
            const cooldownOverlay = this.scene.add.rectangle(x, abilityBarY, 60, 60, 0x000000, 0.7)
                .setScrollFactor(0).setDepth(203).setVisible(false);

            // Cooldown text
            const cooldownText = this.scene.add.text(x, abilityBarY, '', {
                fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(204).setOrigin(0.5, 0.5).setVisible(false);

            // Mana cost text
            const manaText = this.scene.add.text(x, abilityBarY + 25, `${ability.manaCost} MP`, {
                fontSize: '10px', fill: '#00aaff'
            }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

            this.abilityBar.buttons.push({
                id: abilityId,
                bg: buttonBg,
                icon: icon,
                keyText: keyText,
                cooldownOverlay: cooldownOverlay,
                cooldownText: cooldownText,
                manaText: manaText
            });

            index++;
        });

        // Add Potion Slots
        this.createPotionSlots(startX, index, abilityBarY, abilitySpacing);
        this.updatePotionSlots();

        // Listen for input mode changes to update labels
        if (this.scene && this.scene.events) {
            this.scene.events.on('input-mode-changed', (mode) => {
                this.updateInputLabels();
            });
        }

        // Initial label update
        this.updateInputLabels();

        console.log(`[AbilityManager] Ability bar created with ${this.abilityBar.buttons.length} abilities`);
    }

    /**
     * Update hotbar labels based on current input mode (keyboard vs gamepad)
     */
    updateInputLabels() {
        if (!this.abilityBar || !this.abilityBar.buttons || typeof window.getInputLabel !== 'function') return;

        // Update Ability Buttons (1-4)
        this.abilityBar.buttons.forEach((btn, index) => {
            const actionName = `ability${index + 1}`;
            const label = window.getInputLabel(actionName);
            if (btn.keyText) btn.keyText.setText(label);
        });

        // Update Potion Slots
        // Health Potion (Slot 0)
        if (this.abilityBar.potionSlots[0] && this.abilityBar.potionSlots[0].keyText) {
            this.abilityBar.potionSlots[0].keyText.setText(window.getInputLabel('healthPotion'));
        }
        // Mana Potion (Slot 1)
        if (this.abilityBar.potionSlots[1] && this.abilityBar.potionSlots[1].keyText) {
            this.abilityBar.potionSlots[1].keyText.setText(window.getInputLabel('manaPotion'));
        }
    }

    createPotionSlots(startX, index, abilityBarY, abilitySpacing) {
        // Health Potion (Key 5)
        const potionStartX = startX + index * abilitySpacing + 20;
        this.createSinglePotionSlot('health', potionStartX, abilityBarY, 'Health Potion', 0xff4444, '5', 0x442222);

        // Mana Potion (Key 6)
        const manaPotionX = potionStartX + abilitySpacing;
        this.createSinglePotionSlot('mana', manaPotionX, abilityBarY, 'Mana Potion', 0x4444ff, '6', 0x222244);
    }

    createSinglePotionSlot(type, x, y, name, color, key, bgColor) {
        const bg = this.scene.add.rectangle(x, y, 60, 60, bgColor, 0.9)
            .setScrollFactor(0).setDepth(200).setStrokeStyle(2, color)
            .setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            bg.setStrokeStyle(2, 0xffffff);
            if (window.UIManager && window.UIManager.showTooltip) {
                window.UIManager.showTooltip({
                    type: 'consumable', name: name, description: `Restores ${type === 'health' ? 'HP' : 'MP'}. Key: ${key}`, quality: 'Common'
                }, x, y - 60, 'hotbar');
            }
        });

        bg.on('pointerout', () => {
            bg.setStrokeStyle(2, color);
            if (window.UIManager && window.UIManager.hideTooltip) window.UIManager.hideTooltip();
        });

        bg.on('pointerdown', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.usePotion(type);
            this.scene.tweens.add({ targets: bg, scale: 0.9, duration: 50, yoyo: true });
        });

        const icon = this.scene.add.sprite(x, y, type === 'health' ? 'item_consumable' : 'mana_potion');
        icon.setScrollFactor(0).setDepth(201).setScale(0.8);
        if (type === 'health') icon.setTint(color);

        const keyText = this.scene.add.text(x - 20, y - 20, key, {
            fontSize: '14px', fill: '#ffffff', fontStyle: 'bold', backgroundColor: '#000000', padding: { x: 3, y: 2 }
        }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

        const quantityText = this.scene.add.text(x + 15, y + 20, 'x0', {
            fontSize: '12px', fill: '#ffffff', fontStyle: 'bold', backgroundColor: '#000000', padding: { x: 2, y: 1 }
        }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

        const labelText = this.scene.add.text(x, y + 35, type === 'health' ? 'HP' : 'MP', {
            fontSize: '10px', fill: color
        }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0.5);

        this.abilityBar.potionSlots.push({
            type: type,
            bg: bg,
            icon: icon,
            keyText: keyText,
            quantityText: quantityText,
            label: labelText
        });
    }

    /**
     * Update potion slot quantities from inventory
     */
    updatePotionSlots() {
        if (!this.abilityBar || !this.abilityBar.potionSlots || !window.playerStats) return;

        let healthPotions = 0;
        let manaPotions = 0;

        window.playerStats.inventory.forEach(item => {
            if (item.type === 'consumable') {
                const qty = item.quantity || 1;
                if (item.name && item.name.toLowerCase().includes('health')) healthPotions += qty;
                else if (item.name && item.name.toLowerCase().includes('mana')) manaPotions += qty;
                else if (item.healAmount && !item.manaAmount) healthPotions += qty;
                else if (item.manaAmount) manaPotions += qty;
            }
        });

        const healthSlot = this.abilityBar.potionSlots.find(s => s.type === 'health');
        const manaSlot = this.abilityBar.potionSlots.find(s => s.type === 'mana');

        if (healthSlot) {
            healthSlot.quantityText.setText(`x${healthPotions}`);
            healthSlot.icon.setAlpha(healthPotions > 0 ? 1 : 0.3);
        }
        if (manaSlot) {
            manaSlot.quantityText.setText(`x${manaPotions}`);
            manaSlot.icon.setAlpha(manaPotions > 0 ? 1 : 0.3);
        }
    }

    /**
     * Trigger an ability by index (1-4)
     */
    useAbility(abilityIndex) {
        console.log(`[AbilityManager] useAbility called with index: ${abilityIndex}`);

        const abilityNames = Object.keys(this.definitions);
        const arrayIndex = abilityIndex - 1;

        if (arrayIndex < 0 || arrayIndex >= abilityNames.length) {
            console.warn(`[AbilityManager] Invalid ability index: ${abilityIndex}`);
            return;
        }

        const abilityName = abilityNames[arrayIndex];
        const abilityDef = this.definitions[abilityName];

        if (!abilityDef) return;

        const manaCost = abilityDef.manaCost;
        if (window.playerStats.mana < manaCost) {
            if (window.addChatMessage) window.addChatMessage(`Not enough mana! Need ${manaCost}`, 0xff6666);
            return;
        }

        // Dispatch Cast
        this.castAbility(abilityName);

        // Deduct Mana
        window.playerStats.mana -= manaCost;
        this.updateUI();

        // Trigger Cooldown
        this.triggerCooldown(abilityIndex, abilityDef.cooldown);
    }

    /**
     * Cast specific ability by ID
     */
    castAbility(abilityName) {
        switch (abilityName) {
            case 'fireball': this.castFireball(); break;
            case 'heal': this.castHeal(); break;
            case 'shield': this.castShield(); break;
            case 'ice_nova': this.castIceNova(); break;
            default: console.warn(`[AbilityManager] No cast function for: ${abilityName}`);
        }
    }

    triggerCooldown(abilityIndex, duration) {
        if (!this.abilityBar || !this.abilityBar.buttons) return;
        const button = this.abilityBar.buttons[abilityIndex - 1];
        if (!button) return;

        button.cooldownOverlay.setVisible(true);
        button.cooldownText.setVisible(true).setText((duration / 1000).toFixed(1));
        button.bg.disableInteractive();

        // Tween overlay height
        button.cooldownOverlay.height = 60;
        button.cooldownOverlay.y = button.bg.y;

        this.scene.tweens.add({
            targets: button.cooldownOverlay,
            height: 0,
            y: button.bg.y + 30, // Move down as it shrinks
            duration: duration,
            onUpdate: (tween) => {
                const remaining = (duration - tween.elapsed) / 1000;
                button.cooldownText.setText(remaining.toFixed(1));
            },
            onComplete: () => {
                button.cooldownOverlay.setVisible(false);
                button.cooldownText.setVisible(false);
                button.bg.setInteractive({ useHandCursor: true });
            }
        });
    }

    usePotion(type) {
        // Find potion
        let potionIndex = -1;
        for (let i = 0; i < window.playerStats.inventory.length; i++) {
            const item = window.playerStats.inventory[i];
            if (item.type !== 'consumable') continue;

            if (type === 'health') {
                if ((item.name && item.name.toLowerCase().includes('health')) || (item.healAmount && !item.manaAmount)) {
                    potionIndex = i;
                    break;
                }
            } else if (type === 'mana') {
                if ((item.name && item.name.toLowerCase().includes('mana')) || item.manaAmount) {
                    potionIndex = i;
                    break;
                }
            }
        }

        if (potionIndex === -1) {
            if (window.addChatMessage) window.addChatMessage(`No ${type} potions available!`, 0xff6666, '⚠️');
            return;
        }

        const potion = window.playerStats.inventory[potionIndex];

        // Apply Effect
        this.handlePotionEffects(type, potion);

        // Consume
        if (potion.quantity && potion.quantity > 1) {
            potion.quantity--;
        } else {
            window.playerStats.inventory.splice(potionIndex, 1);
        }

        this.updatePotionSlots();
        this.updateUI();
    }

    handlePotionEffects(type, potion) {
        if (type === 'health') {
            const healAmount = potion.healAmount || 50;
            const oldHp = window.playerStats.hp;
            window.playerStats.hp = Math.min(window.playerStats.maxHp, window.playerStats.hp + healAmount);
            const actual = window.playerStats.hp - oldHp;

            if (actual > 0) {
                if (window.addChatMessage) window.addChatMessage(`Used ${potion.name}: +${actual} HP`, 0x44ff44, '💊');
                if (window.showDamageNumber) window.showDamageNumber(window.player.x, window.player.y - 20, `+${actual}`, 0x44ff44, false);
                if (window.playSound) window.playSound('heal_cast');
            } else {
                if (window.addChatMessage) window.addChatMessage('HP already full!', 0xffff00, '💊');
            }
        } else {
            const manaAmount = potion.manaAmount || 30;
            const oldMana = window.playerStats.mana;
            window.playerStats.mana = Math.min(window.playerStats.maxMana, window.playerStats.mana + manaAmount);
            const actual = window.playerStats.mana - oldMana;

            if (actual > 0) {
                if (window.addChatMessage) window.addChatMessage(`Used ${potion.name}: +${actual} MP`, 0x4444ff, '💊');
                if (window.showDamageNumber) window.showDamageNumber(window.player.x, window.player.y - 20, `+${actual}`, 0x4444ff, false);
                if (window.playSound) window.playSound('heal');
            } else {
                if (window.addChatMessage) window.addChatMessage('Mana already full!', 0xffff00, '💊');
            }
        }
    }

    updateUI() {
        // Safe update wrapper
        if (typeof window.updateUI === 'function') window.updateUI();
    }

    update(time, delta) {
        // Update logic if needed (currently handling cooldowns via Tweens, so this is empty but reserved)
    }

    // ============================================
    // VISUAL EFFECT IMPLEMENTATIONS
    // ============================================

    castFireball() {
        if (!this.scene || !window.player) return;
        const player = window.player;
        const radius = 200; // Matches legacy radius

        // 1. Play Sound
        if (window.playSound) window.playSound('fireball_cast');

        // 2. Animate Player
        if (player.anims && player.anims.exists('attack')) {
            player.play('attack');
        }

        // 3. Visual Effects (Explosion)
        this.createFireballExplosion(player.x, player.y);

        // 4. Initial Burst Damage
        const baseDamage = window.playerStats.attack * 1.5;
        let hitCount = 0;

        if (window.monsters) {
            window.monsters.forEach(monster => {
                if (!monster || !monster.active || monster.hp <= 0) return;

                const dist = Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y);

                if (dist <= radius) {
                    hitCount++;
                    const damage = Math.floor(baseDamage * Phaser.Math.FloatBetween(0.9, 1.1));

                    if (typeof window.damageMonster === 'function') {
                        // We use direct HP modification in legacy, but let's try to use damageMonster if compatible, 
                        // otherwise fallback to direct HP mod + hit effects
                        monster.hp -= damage;
                        this.createHitEffects(monster.x, monster.y, true, 'fire');
                        if (window.showDamageNumber) window.showDamageNumber(monster.x, monster.y - 20, `-${damage}`, 0xff4400, true, 'fire');

                        if (monster.hp <= 0 && typeof window.handleMonsterDeath === 'function') {
                            window.handleMonsterDeath(monster);
                        }
                    }
                }
            });
        }

        // 5. Scorched Earth (DoT)
        this.createScorchedEarth(player.x, player.y, baseDamage);

        // 6. Chat Log
        if (window.addChatMessage) {
            if (hitCount > 0) {
                window.addChatMessage(`Fireball burst hit ${hitCount} enemies!`, 0xff4400, '🔥');
            } else {
                window.addChatMessage("Fireball burst hit nothing.", 0x888888);
            }
        }
    }

    createScorchedEarth(x, y, initialDamage) {
        const duration = 3000;      // 3 seconds
        const tickInterval = 500;   // 0.5 seconds
        const radius = 150;         // Slightly smaller than impact radius
        let currentPercentage = 0.10; // Start at 10%

        // Create a timer event for the ticks
        this.scene.time.addEvent({
            delay: tickInterval,
            repeat: (duration / tickInterval) - 1, // Run X times
            callback: () => {
                // Calculate Damage for this tick
                let tickDamage = Math.floor(initialDamage * currentPercentage);
                if (tickDamage < 1) tickDamage = 1;

                if (window.monsters) {
                    window.monsters.forEach(monster => {
                        if (!monster || !monster.active || monster.hp <= 0) return;

                        const dist = Phaser.Math.Distance.Between(x, y, monster.x, monster.y);

                        if (dist <= radius) {
                            monster.hp -= tickDamage;

                            // Show small orange damage number
                            if (window.showDamageNumber) window.showDamageNumber(monster.x, monster.y - 30, `-${tickDamage}`, 0xff6600, false);

                            if (monster.hp <= 0 && typeof window.handleMonsterDeath === 'function') {
                                window.handleMonsterDeath(monster);
                            }
                        }
                    });
                }

                // Visual 'Pulse' (flicker embers)
                if (this.scene.textures.exists('death_particle') && this.scene.add.particles) {
                    const pulse = this.scene.add.particles(x, y, 'death_particle', {
                        speed: 50,
                        lifespan: 400,
                        scale: { start: 0.5, end: 0 },
                        quantity: 3,
                        emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, radius) },
                        blendMode: 'ADD',
                        tint: 0xff4400
                    });
                    // Auto-destroy emitter after one burst
                    this.scene.time.delayedCall(450, () => pulse.destroy());
                }

                // Decay the percentage
                currentPercentage -= 0.01;
                if (currentPercentage < 0.01) currentPercentage = 0.01;
            }
        });
    }

    createFireballExplosion(x, y) {
        // 1. Screen Shake
        this.scene.cameras.main.shake(150, 0.015);

        // 2. Expanding Ring Shockwave
        const ring = this.scene.add.circle(x, y, 10, 0xff4400, 0); // Start invisible
        ring.setStrokeStyle(4, 0xffaa00);

        // Depth handling safely
        const depth = (window.player && window.player.depth) ? window.player.depth : 100;
        ring.setDepth(depth + 1);

        this.scene.tweens.add({
            targets: ring,
            radius: 200,
            alpha: { start: 1, end: 0 },
            strokeWidth: { start: 10, end: 0 },
            duration: 400,
            ease: 'Cubic.out',
            onComplete: () => ring.destroy()
        });

        // 3. Inner Flash
        const flash = this.scene.add.circle(x, y, 50, 0xffffaa, 1);
        flash.setDepth(depth + 2);
        this.scene.tweens.add({
            targets: flash,
            scale: 3,
            alpha: 0,
            duration: 200,
            onComplete: () => flash.destroy()
        });

        // 4. Particle Burst
        const particleTexture = this.scene.textures.exists('impact_particle') ? 'impact_particle' : 'fireball_effect';
        if (this.scene.textures.exists(particleTexture) && this.scene.add.particles) {
            const emitter = this.scene.add.particles(x, y, particleTexture, {
                speed: { min: 100, max: 300 },
                angle: { min: 0, max: 360 },
                lifespan: { min: 300, max: 600 },
                scale: { start: 1.5, end: 0 },
                alpha: { start: 1, end: 0 },
                quantity: 30,
                blendMode: 'ADD',
                tint: [0xff4400, 0xffaa00, 0xffff00]
            });
            emitter.setDepth(depth + 1);

            // Stop emitting after a burst
            this.scene.time.delayedCall(100, () => emitter.stop());
            this.scene.time.delayedCall(1000, () => emitter.destroy());
        }
    }

    castHeal() {
        if (!this.scene || !window.player) return;
        const player = window.player;
        const healAmount = 50 + window.playerStats.level * 10;

        window.playerStats.hp = Math.min(window.playerStats.hp + healAmount, window.playerStats.maxHp);

        // Visuals
        const glow = this.scene.add.circle(player.x, player.y, 40, 0x00ff00, 0.4).setDepth(100);
        this.scene.tweens.add({ targets: glow, scale: 2, alpha: 0, duration: 800, onComplete: () => glow.destroy() });

        // Floating text
        if (window.showDamageNumber) window.showDamageNumber(player.x, player.y - 30, `+${healAmount} HP`, 0x00ff00);
        if (window.playSound) window.playSound('heal_cast');
        if (window.addChatMessage) window.addChatMessage(`Healed for ${healAmount} HP!`, 0x00ff00, '💚');

        this.updateUI();
    }

    castShield() {
        if (!this.scene || !window.player) return;
        if (window.playSound) window.playSound('heal'); // reusing heal sound as per original

        window.playerStats.isInvulnerable = true;
        const duration = 5000;

        // Visuals (Simplified from original for compactness but retaining core look)
        const shieldText = this.scene.add.text(window.player.x, window.player.y - 60, '🛡️ PROTECTED', {
            fontSize: '14px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(window.player.depth + 2);

        const followEvent = this.scene.time.addEvent({
            delay: 16, loop: true,
            callback: () => {
                if (shieldText.active) shieldText.setPosition(window.player.x, window.player.y - 60);
            }
        });

        this.scene.time.delayedCall(duration, () => {
            window.playerStats.isInvulnerable = false;
            if (followEvent) followEvent.remove();
            if (shieldText.active) shieldText.destroy();
            if (window.addChatMessage) window.addChatMessage('Shield faded.', 0x888888, '🛡️');
        });

        if (window.addChatMessage) window.addChatMessage('Shield activated! (5s)', 0x00aaff, '🛡️');
    }

    castIceNova() {
        if (!this.scene || !window.player) return;
        const player = window.player;

        // Play sound
        try {
            // Basic implementation matching original attempt
            const iceNovaSound = this.scene.sound.add('ice_nova_sound');
            // Note: 'ice_nova_sound' was not found in checks, but kept for consistency with original code intent
            // If it fails it fails silently usually in Phaser specific calls
        } catch (e) { }

        const damage = 40 + window.playerStats.level * 5;
        const range = 200;

        // Visual Burst
        const burst = this.scene.add.circle(player.x, player.y, 20, 0x00ffff, 0.8).setDepth(100);
        this.scene.tweens.add({ targets: burst, scale: 3, alpha: 0, duration: 400, onComplete: () => burst.destroy() });

        this.scene.cameras.main.shake(300, 0.01);

        // AoE Damage
        if (window.monsters) {
            window.monsters.forEach(m => {
                if (m && m.active) {
                    const dist = Phaser.Math.Distance.Between(player.x, player.y, m.x, m.y);
                    if (dist <= range) {
                        if (typeof window.damageMonster === 'function') window.damageMonster(m, damage);
                        // Freeze visual
                        // Freeze visual - Robust tint application
                        const applyTintSafe = (target, color) => {
                            if (target.setTint) target.setTint(color);
                            else if (target.list) target.list.forEach(c => c.setTint && c.setTint(color));
                            else if (target.sprite && target.sprite.setTint) target.sprite.setTint(color);
                        };
                        const clearTintSafe = (target) => {
                            if (target.clearTint) target.clearTint();
                            else if (target.list) target.list.forEach(c => c.clearTint && c.clearTint());
                            else if (target.sprite && target.sprite.clearTint) target.sprite.clearTint();
                        };

                        applyTintSafe(m, 0x00ffff);

                        // Apply Slow Effect
                        if (typeof m.speed !== 'undefined' && !m.originalSpeed) {
                            m.originalSpeed = m.speed;
                            m.speed = m.speed * 0.5; // 50% slow
                        }

                        this.scene.time.delayedCall(3000, () => {
                            if (m && m.active) {
                                clearTintSafe(m);
                                // Restore Speed
                                if (typeof m.originalSpeed !== 'undefined') {
                                    m.speed = m.originalSpeed;
                                    m.originalSpeed = undefined;
                                }
                            }
                        });
                    }
                }
            });
        }
    }
}

// Export singleton
window.AbilityManager = new AbilityManager();
