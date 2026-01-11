/**
 * LootManager.js
 * Handles spawning of items (quest/drops) and player pickup interactions.
 */

window.LootManager = {
    scene: null,

    init(scene) {
        this.scene = scene;
        debugLog('📦 LootManager initialized');
    },

    /**
     * Spawn a specific quest item at a location
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {object} itemData - Item data object
     */
    spawnQuestItem(x, y, itemData) {
        if (!this.scene) return;

        // Visual enhancement: random offset to prevent perfect stacking
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;

        const spawnX = x + offsetX;
        const spawnY = y + offsetY;

        // Determine Sprite Key
        const spriteKey = ItemManager.getSpriteKey(itemData);

        // Check if texture exists
        if (!this.scene.textures.exists(spriteKey)) {
            console.warn(`⚠️ LootManager: Missing texture '${spriteKey}' for ${itemData.name}. Loading...`);
            // Attempt to load dynamically (fallback)
            if (itemData.sprite) {
                this.scene.load.image(spriteKey, itemData.sprite);
                this.scene.load.once('complete', () => {
                    this._createItemSprite(spawnX, spawnY, spriteKey, itemData);
                });
                this.scene.load.start();
                return;
            }
        }

        this._createItemSprite(spawnX, spawnY, spriteKey, itemData);
    },

    /**
     * Internal helper to create the item sprite
     */
    _createItemSprite(x, y, spriteKey, itemData) {
        const itemSprite = this.scene.physics.add.image(x, y, spriteKey);

        // Scale down if it's a large icon
        itemSprite.setScale(1.0);

        // Add floating animation (tween)
        this.scene.tweens.add({
            targets: itemSprite,
            y: y - 10,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add glow effect / particles
        const particleColor = itemData.quality ? this._getQualityColor(itemData.quality) : 0xffffff;

        // Simple glow particles
        const particles = this.scene.add.particles(0, 0, 'flare_particle', {
            speed: 10,
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            tint: particleColor,
            lifespan: 800,
            frequency: 200,
            follow: itemSprite
        });

        // Store data on sprite for pickup
        itemSprite.itemData = itemData;
        itemSprite.fx = particles; // Store reference to cleanup

        // Add to global items list (if used primarily for cleanup)
        if (window.items) window.items.push({
            ...itemData,
            sprite: itemSprite // Ensure GameObject overwrites any 'sprite' data property
        });

        // Add interaction (Click to pickup) - Note: Collision is handled in game.js usually?
        // But we can make them interactive too.
        itemSprite.setInteractive();
        itemSprite.on('pointerdown', () => {
            // Calculate distance check?
            const d = Phaser.Math.Distance.Between(window.player.x, window.player.y, itemSprite.x, itemSprite.y);
            if (d < 100) {
                this.pickupItem(itemData, window.items.findIndex(i => i.sprite === itemSprite));
            } else {
                if (window.addChatMessage) window.addChatMessage("Too far away.", 0xaaaaaa);
            }
        });

        // Enable hover text
        if (typeof window.enableHoverEffect === 'function') {
            window.enableHoverEffect(itemSprite, this.scene);
        }

        return itemSprite;
    },

    _getQualityColor(quality) {
        return {
            'Common': 0xcccccc,
            'Uncommon': 0x1eff00,
            'Rare': 0x0070dd,
            'Epic': 0xa335ee,
            'Legendary': 0xff8000
        }[quality] || 0xffffff;
    },

    /**
     * Drop items from a killed monster
     */
    dropItemsFromMonster(x, y, monsterXP = 10, isBoss = false) {
        // Drop probability: 40% chance
        if (Math.random() > 0.40 && !isBoss) { // Allow bosses to always drop loot? Logic below doesn't use isBoss param here, but whatever.
            // (Original check was just if (Math.random() > 0.40) return;)
        }

        // QUEST DROPS (Always check, regardless of random loot chance)
        if (window.uqe && window.uqe.activeQuests) {
            window.uqe.activeQuests.forEach(q => {
                // Main 01-003: Crystalline Seepage
                if (q.id === 'main_01_003') {
                    if (Math.random() < 0.40) {
                        this.spawnQuestItem(x, y, {
                            id: 'crystal_shard',
                            name: 'Crystal Shard',
                            type: 'quest_item',
                            quantity: 1,
                            sprite: 'assets/images/crystal-shard.png', // Dynamic load
                            quality: 'Common'
                        });
                    }
                }
                // Main 03-010: Void Essence
                if (q.id === 'main_03_010') {
                    if (Math.random() < 0.50) {
                        this.spawnQuestItem(x, y, {
                            id: 'void_essence',
                            name: 'Void Essence',
                            type: 'quest_item',
                            quantity: 1,
                            quality: 'Rare'
                        });
                    }
                }
            });
        }

        if (Math.random() > 0.40 && !isBoss) return; // Original loot gate (Bypassed for bosses)


        // Determine item level/stats based on monster XP/Diff
        // (Delegating to ItemManager or items.js logic via global generateRandomItem)
        if (typeof window.generateRandomItem === 'function') {
            // 1 to 3 items
            const count = Phaser.Math.Between(1, 2);
            for (let i = 0; i < count; i++) {
                const item = window.generateRandomItem(playerStats.level || 1);
                this.spawnQuestItem(x, y, item);

                // Add chat message
                const color = this._getQualityColor(item.quality);
                if (window.addChatMessage) {
                    window.addChatMessage(`Loot: ${item.name} (${item.quality})`, color, '💎');
                }
            }
        }

        // Also drop Gold (Always)
        const goldAmount = Phaser.Math.Between(5, 10 + (playerStats.level * 2));
        const goldItem = {
            type: 'gold',
            name: 'Gold Coins',
            amount: goldAmount,
            spriteKey: 'item_gold' // Assuming existence
        };
        this.spawnQuestItem(x, y, goldItem);
    },

    /**
     * Pick up an item
     */
    pickupItem(item, index) {
        if (!item || !playerStats) return;

        // Check Gold
        if (item.type === 'gold') {
            playerStats.gold += item.amount;
            if (playerStats.questStats) playerStats.questStats.goldEarned += item.amount;

            this.showFeedback(item, `+${item.amount} Gold`, 0xffd700);

            if (typeof window.playSound === 'function') window.playSound('gold_pickup');

            // UQE Event
            if (window.uqe) window.uqe.eventBus.emit(UQE_EVENTS.GOLD_EARNED, { amount: item.amount });

        } else {
            // Inventory Item
            const isStackable = ItemManager.isStackable(item);
            let stacked = false;

            if (isStackable && item.name) {
                const existing = playerStats.inventory.find(i =>
                    i.type === item.type && i.name === item.name
                );
                if (existing) {
                    existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
                    stacked = true;
                }
            }

            if (!stacked) {
                if (isStackable) item.quantity = item.quantity || 1;
                playerStats.inventory.push(item);
            }

            if (playerStats.questStats) playerStats.questStats.itemsCollected++;

            this.showFeedback(item, `Picked up ${item.name}`, 0x00ff00);
            if (typeof window.playSound === 'function') window.playSound('item_pickup');

            // Update UI
            if (typeof window.refreshInventory === 'function') window.refreshInventory();
            if (typeof window.updatePotionSlots === 'function') window.updatePotionSlots();

            // UQE Event
            if (window.uqe) window.uqe.eventBus.emit(UQE_EVENTS.ITEM_PICKUP, {
                id: item.id || item.name,
                type: item.type,
                amount: 1
            });
        }

        // Cleanup Sprite and FX
        if (item.sprite) {
            if (item.sprite.fx) {
                item.sprite.fx.destroy();
            }
            item.sprite.destroy();

            // Remove from global items list if using one
            if (window.items) {
                const idx = window.items.indexOf(item);
                if (idx > -1) window.items.splice(idx, 1);
            }
        }

        // If index provided relative to a list passed in
        if (typeof index === 'number' && window.items) {
            // (Handled above by instance check primarily)
        }

        // Update stats UI
        if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
    },

    showFeedback(item, text, color) {
        if (typeof window.showDamageNumber === 'function' && window.player) {
            const tx = item.sprite ? item.sprite.x : window.player.x;
            const ty = item.sprite ? item.sprite.y : window.player.y;
            window.showDamageNumber(tx, ty, text, color);
        }
    }
};

// Global Aliases for Compatibility
window.spawnQuestItem = (x, y, data) => window.LootManager.spawnQuestItem(x, y, data);
window.dropItemsFromMonster = (x, y, xp, isBoss) => window.LootManager.dropItemsFromMonster(x, y, xp, isBoss);
window.pickupItem = (item, index) => window.LootManager.pickupItem(item, index);
