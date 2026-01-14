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
    dropItemsFromMonster(x, y, monsterXP = 10, isBoss = false, monsterId = null) {
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
                // Main 01-013: Shard of Resonance (From Boss)
                if (q.id === 'main_01_013' && isBoss) {
                    this.spawnQuestItem(x, y, {
                        id: 'shard_resonance',
                        name: 'Shard of Resonance',
                        type: 'quest_item',
                        quantity: 1,
                        sprite: 'assets/images/crystal-shard.png', // Dynamic load
                        quality: 'Epic'
                    });
                }
                // Main 02-007: Dark Orders (Orc Captains)
                if (q.id === 'main_02_007') {
                    if (monsterId === 'procedural_orc_captain' || monsterId === 'orc_captain') {
                        // 100% Drop Rate for Quest Item to reduce frustration
                        this.spawnQuestItem(x, y, {
                            id: 'encrypted_orders',
                            name: 'Encrypted Orders',
                            type: 'quest_item',
                            quantity: 1,
                            sprite: 'assets/images/void-sigil.png',
                            quality: 'Rare'
                        });
                        if (window.addChatMessage) window.addChatMessage("Orders Found!", 0x00ff00, '📜');
                    }
                }
                // Main 02-008: Hidden Path (Camp Key)
                if (q.id === 'main_02_008') {
                    if (monsterId === 'procedural_traitor_lieutenant') {
                        this.spawnQuestItem(x, y, {
                            id: 'camp_key',
                            name: 'Camp Key',
                            type: 'quest_item',
                            quantity: 1,
                            sprite: 'assets/images/item_ring.png',
                            quality: 'Rare'
                        });
                        if (window.addChatMessage) window.addChatMessage("Key Found!", 0x00ff00, '🔑');
                    }
                }
                // Main 01-011: Echo Crystals (Skeletons in Watchtower deep)
                if (q.id === 'main_01_011') {
                    if (monsterId === 'procedural_skeleton' && Math.random() < 0.40) {
                        this.spawnQuestItem(x, y, {
                            id: 'echo_crystal',
                            name: 'Echo Crystal',
                            type: 'quest_item',
                            quantity: 1,
                            sprite: 'assets/images/echo-crystal.png',
                            quality: 'Rare'
                        });
                    }
                }
                // Main 02-011: Stolen Crates (Elite Guards in Stronghold)
                if (q.id === 'main_02_011') {
                    if ((monsterId === 'procedural_elite_guard' || monsterId === 'void_cultist') && Math.random() < 0.50) {
                        this.spawnQuestItem(x, y, {
                            id: 'stolen_crate',
                            name: 'Stolen Crate',
                            type: 'quest_item',
                            quantity: 1,
                            sprite: 'assets/images/item_consumable.png',
                            quality: 'Uncommon',
                            uiTint: 0x8B4513
                        });
                        if (window.addChatMessage) window.addChatMessage("Crate Recovered!", 0x00ff00, '📦');
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

        // SPECIAL BOSS DROPS (Always drop, regardless of quest state)
        if (monsterId === 'general_vex') {
            this.spawnQuestItem(x, y, {
                id: 'void_sigil',
                name: 'Void Sigil',
                type: 'quest_item',
                quantity: 1,
                sprite: 'assets/images/void-sigil.png',
                quality: 'Legendary'
            });
            if (window.addChatMessage) window.addChatMessage("Void Sigil Dropped!", 0x9900ff, '🔮');
        }

        // ---------------------------------------------------------
        // DATA-DRIVEN LOOT (From monsters.json)
        // ---------------------------------------------------------
        if (monsterId && this.scene && this.scene.cache.json.exists('monsterData')) {
            const monsterData = this.scene.cache.json.get('monsterData');

            // Flatten the monster lists if structured as { monsters: [...] }
            const allMonsters = monsterData.monsters ? monsterData.monsters : monsterData;

            if (Array.isArray(allMonsters)) {
                const def = allMonsters.find(m => m.id === monsterId);
                if (def && def.loot && Array.isArray(def.loot)) {
                    // Process explicit loot table on the monster
                    def.loot.forEach(drop => {
                        if (Math.random() <= drop.chance) {
                            const qty = Phaser.Math.Between(drop.min || 1, drop.max || 1);

                            // Construct item object (Minimal, will be hydrated by spawnQuestItem potentially)
                            // Ideally we should look up item name/sprite from items.json, but for now passing ID
                            debugLog(`💎 [Loot] Data-driven drop: ${drop.itemId} x${qty}`);

                            // Quick Quest Item/Specific Item lookup helper or pass raw
                            // If it's the void crystal, we know it's a quest item
                            let type = 'resource';
                            let name = drop.itemId;
                            let quality = 'Common';

                            if (drop.itemId === 'void_source_crystal') {
                                type = 'quest_item';
                                name = 'Void Source Crystal';
                                quality = 'Epic';
                            }

                            this.spawnQuestItem(x, y, {
                                id: drop.itemId,
                                name: name,
                                type: type,
                                quantity: qty,
                                quality: quality,
                                sprite: drop.sprite // Optional overlap
                            });

                            if (window.addChatMessage) window.addChatMessage(`${name} Dropped!`, 0x00ff00, '💎');
                        }
                    });
                }
            }
        }
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
    },

    /**
     * Drop an item from inventory to the ground
     * @param {object} item - Item object from inventory
     * @param {number} index - Index in inventory array
     */
    dropItemFromInventory(item, index) {
        if (!item || !window.playerStats || index < 0) return;

        // Remove from inventory first to prevent duplication issues
        window.playerStats.inventory.splice(index, 1);

        // Spawn in world at player position
        // Use random offset to prevent stacking
        const player = window.player;
        if (player) {
            this.spawnQuestItem(player.x, player.y, item);
        }

        // UI Feedback
        if (window.addChatMessage) window.addChatMessage(`Dropped ${item.name}`, 0xaaaaaa, '🗑️');
        if (typeof window.playSound === 'function') window.playSound('menu_cancel');

        // Update UIs
        if (typeof window.refreshInventory === 'function') window.refreshInventory();
        if (typeof window.updateEquipmentInventoryItems === 'function') window.updateEquipmentInventoryItems();
        if (typeof window.updatePlayerStatsUI === 'function') window.updatePlayerStatsUI();
        // Also update equipment if visible? updateEquipmentInventoryItems covers it.
    }
};

// Global Aliases for Compatibility
window.spawnQuestItem = (x, y, data) => window.LootManager.spawnQuestItem(x, y, data);
window.dropItemsFromMonster = (x, y, xp, isBoss, monsterId) => window.LootManager.dropItemsFromMonster(x, y, xp, isBoss, monsterId);
window.pickupItem = (item, index) => window.LootManager.pickupItem(item, index);
window.dropItemFromInventory = (item, index) => window.LootManager.dropItemFromInventory(item, index);
