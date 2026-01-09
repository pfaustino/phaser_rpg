/**
 * DungeonManager.js
 * 
 * Manages dungeon lifecycle:
 * - Spawning monsters based on dungeons.json
 * - Boss spawning logic
 * - Victory conditions, cinematics, and exit portals
 * - Boss loot generation
 */
class DungeonManager {
    constructor() {
        this.scene = null;
    }

    init(scene) {
        this.scene = scene;
        console.log('[DungeonManager] Initialized');

        // Expose global hooks for legacy compatibility
        window.spawnDungeonMonsters = () => this.spawnDungeonMonsters();
        window.spawnBossMonster = (x, y, level) => this.spawnBossMonster(x, y, level);
        window.onBossDefeated = (level, x, y) => this.onBossDefeated(level, x, y);
        window.spawnDungeonExit = (scene, x, y) => this.spawnDungeonExit(scene, x, y);
        window.dropBossLoot = (x, y, level) => this.dropBossLoot(x, y, level);
    }

    /**
     * Spawn monsters in the dungeon based on level and configuration
     */
    spawnDungeonMonsters() {
        debugLog('[DungeonManager] spawnDungeonMonsters called');
        const scene = this.scene;

        // Safety check
        if (!MapManager.currentDungeon || !MapManager.currentDungeon.rooms) {
            debugLog('[DungeonManager] EARLY RETURN - currentDungeon or rooms is null');
            return;
        }

        // Spawn monsters in rooms (not entrance room, not exit room)
        const combatRooms = MapManager.currentDungeon.rooms.slice(1, -1); // Skip first and last room
        debugLog(`[DungeonManager] combatRooms: ${combatRooms.length}, scene.tileSize: ${scene?.tileSize}`);

        combatRooms.forEach(room => {
            // Spawn 1-3 monsters per room
            const monsterCount = Phaser.Math.Between(1, 3);

            // Use fallback tileSize if scene.tileSize is not set
            const tileSize = scene?.tileSize || 32;

            for (let i = 0; i < monsterCount; i++) {
                const x = (room.x + Phaser.Math.Between(1, room.width - 1)) * tileSize;
                const y = (room.y + Phaser.Math.Between(1, room.height - 1)) * tileSize;

                // Spawn random monster type (from dungeon data)
                let dungeonMonsterTypes = [];
                const dungeonId = MapManager.currentDungeon.id || 'tower_dungeon';

                // Get monster pool from data
                const dungeonData = scene.cache.json.get('dungeonData');
                const dungeonDef = dungeonData && dungeonData.dungeons ? dungeonData.dungeons[dungeonId] : null;

                if (dungeonDef && dungeonDef.monsters) {
                    // Use defined monsters
                    dungeonDef.monsters.forEach(mDef => {
                        // Base stats mapping (Legacy/Temporary)
                        let baseStats = {};
                        if (mDef.id === 'echo_rat') baseStats = { name: 'Echo Rat', textureKey: 'monster_echo_mite', hp: 20, attack: 4, speed: 70, xp: 8, monsterType: 'echo_rat' };
                        else if (mDef.id === 'procedural_echo_mite') baseStats = { name: 'Echo Mite', textureKey: 'procedural_echo_mite', hp: 15, attack: 3, speed: 80, xp: 6, monsterType: 'procedural_echo_mite', isProcedural: true };
                        else if (mDef.id === 'skeleton_miner') baseStats = { name: 'Skeleton Miner', textureKey: 'monster_skeleton', hp: 25, attack: 6, speed: 60, xp: 15 };
                        else if (mDef.id === 'corrupted_guardian') baseStats = { name: 'Corrupted Guardian', textureKey: 'monster_orc', hp: 50, attack: 8, speed: 40, xp: 20 };
                        else {
                            // Default fallback
                            baseStats = { name: mDef.id, textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10 };
                        }

                        // Apply level scaling
                        if (mDef.minLevel && MapManager.dungeonLevel < mDef.minLevel) return;

                        dungeonMonsterTypes.push({
                            id: mDef.id, // Ensure ID is passed for blueprint lookup
                            ...baseStats,
                            chance: mDef.chance || 1.0,
                            spawnAmount: mDef.spawnAmount || [1, 2]
                        });
                    });
                }

                // Fallback if no monsters defined
                if (dungeonMonsterTypes.length === 0) {
                    dungeonMonsterTypes = [
                        { name: 'Goblin', textureKey: 'monster_goblin', hp: 30, attack: 5, speed: 50, xp: 10, spawnAmount: [1, 3] }
                    ];
                }

                // weighted random choice
                const totalChance = dungeonMonsterTypes.reduce((sum, m) => sum + (m.chance || 1), 0);
                let roll = Math.random() * totalChance;
                let selectedType = dungeonMonsterTypes[0];

                for (const m of dungeonMonsterTypes) {
                    roll -= (m.chance || 1);
                    if (roll <= 0) {
                        selectedType = m;
                        break;
                    }
                }

                // Procedural Override check
                // Note: relying on global monsterRenderer for now
                if (window.monsterRenderer && Object.keys(window.monsterRenderer.monsterBlueprints).length > 0) {
                    // Try to match by ID
                    const bp = window.monsterRenderer.monsterBlueprints[selectedType.name] || window.monsterRenderer.monsterBlueprints[selectedType.id];
                    if (bp) {
                        selectedType = {
                            name: bp.name,
                            id: bp.id,
                            hp: bp.stats.hp,
                            attack: bp.stats.attack,
                            speed: bp.stats.speed,
                            xp: bp.stats.xp,
                            textureKey: bp.id,
                            generationType: bp.generationType,
                            proceduralConfig: bp.proceduralConfig,
                            isProcedural: true,
                            spawnAmount: bp.stats.spawnAmount || selectedType.spawnAmount
                        };
                    }
                }
                const scaledHp = selectedType.hp + (MapManager.dungeonLevel * 10);
                const scaledAttack = selectedType.attack + (MapManager.dungeonLevel * 2);
                const scaledXp = (selectedType.xp || 10) + (MapManager.dungeonLevel * 5);

                // Determine pack size based on spawnAmount
                const spawnAmount = selectedType.spawnAmount || [1, 1];
                const packSize = Phaser.Math.Between(spawnAmount[0], spawnAmount[1]);

                // Spawn the pack clustered around the spawn point
                for (let p = 0; p < packSize; p++) {
                    const offsetX = p === 0 ? 0 : Phaser.Math.Between(-30, 30);
                    const offsetY = p === 0 ? 0 : Phaser.Math.Between(-30, 30);
                    // Use global spawnMonsterScaled helper (assumed to exist or need extraction)
                    // For now assuming existing global hooks function
                    if (typeof window.spawnMonsterScaled === 'function') {
                        window.spawnMonsterScaled(x + offsetX, y + offsetY, selectedType, scaledHp, scaledAttack, scaledXp);
                    } else {
                        console.warn('[DungeonManager] spawnMonsterScaled not found!');
                    }
                }
            }
        });

        // Spawn boss in exit room
        if (MapManager.currentDungeon.exit && MapManager.currentDungeon.rooms.length > 0) {
            const bossRoom = MapManager.currentDungeon.rooms[MapManager.currentDungeon.rooms.length - 1];
            const bossX = bossRoom.centerX * scene.tileSize;
            const bossY = bossRoom.centerY * scene.tileSize;

            this.spawnBossMonster(bossX, bossY, MapManager.dungeonLevel);
        }
    }

    /**
     * Spawn a boss monster
     */
    spawnBossMonster(x, y, level) {
        const scene = this.scene;

        // Get dungeon definition
        const dungeonId = MapManager.currentDungeon ? MapManager.currentDungeon.id : null;
        const dungeonData = scene.cache.json.get('dungeonData');
        const dungeonDef = dungeonData && dungeonData.dungeons && dungeonId ? dungeonData.dungeons[dungeonId] : null;

        let bossId = 'dragon';
        let bossName = 'Dragon Boss';
        let shouldSpawn = true;

        // Data-driven Check
        if (dungeonDef) {
            if (dungeonDef.bosses) {
                // Find boss for this level
                const levelBoss = dungeonDef.bosses.find(b => b.level === level);
                if (levelBoss) {
                    if (levelBoss.monsterId) {
                        bossId = levelBoss.monsterId;
                        bossName = bossId.replace('_', ' ').toUpperCase();
                    }
                } else {
                    shouldSpawn = false;
                }
            } else if (dungeonDef.boss) {
                // Legacy single boss
                if (dungeonDef.boss.level && dungeonDef.boss.level !== level) {
                    shouldSpawn = false;
                }
                if (dungeonDef.boss.monsterId) {
                    bossId = dungeonDef.boss.monsterId;
                    bossName = bossId.replace('_', ' ').toUpperCase();
                }
            } else {
                // No boss defined at all
                shouldSpawn = false;
            }
        }

        if (!shouldSpawn) {
            debugLog(`info: No boss spawn for ${dungeonId} at level ${level}`);
            return;
        }

        // Determine stats based on ID (or procedural)
        let textureKey = 'monster_dragon_south';
        if (bossId === 'echo_beholder') textureKey = 'monster_echo_mite'; // Placeholder
        else if (bossId === 'corrupted_guardian') textureKey = 'monster_orc';

        // Check if we have a special boss blueprint
        const hasBossBlueprint = window.monsterRenderer && (window.monsterRenderer.monsterBlueprints[bossId] || window.monsterRenderer.monsterBlueprints['Boss']);

        // Always use procedural for bosses if a blueprint exists
        const useProcedural = hasBossBlueprint;

        // Use blueprint stats if available, otherwise fallback to level scaling
        const bp = window.monsterRenderer && (window.monsterRenderer.monsterBlueprints[bossId]);

        const baseHp = (bp && bp.stats) ? bp.stats.hp : (100 + (level * 50));
        const baseAttack = (bp && bp.stats) ? bp.stats.attack : (15 + (level * 5));
        const baseXp = (bp && bp.stats) ? bp.stats.xp : (50 + (level * 25));

        const bossTypeData = {
            name: bossName,
            id: bossId, // Include ID for blueprint lookup
            textureKey: textureKey,
            hp: baseHp,
            attack: baseAttack,
            speed: 80,
            xp: baseXp,
            isProcedural: useProcedural,
            monsterType: bossId // Store type
        };

        const boss = window.spawnMonster(x, y, bossTypeData, bossTypeData.hp, bossTypeData.attack, bossTypeData.xp, true);

        if (boss) {
            debugLog(`👹 Boss spawned at level ${level} (${useProcedural ? 'Procedural' : 'Sprite'})`);
        }
    }

    /**
     * Handle boss defeat - mark dungeon as completed and reset it
     */
    onBossDefeated(level, x, y) {
        // Get Dungeon Info for Victory Check
        const dungeonId = MapManager.currentDungeon ? MapManager.currentDungeon.id : 'tower_dungeon';
        const dungeonKey = `${dungeonId}_level_${level}`;
        const scene = this.scene;

        // Mark dungeon as completed
        MapManager.dungeonCompletions[dungeonKey] = true;
        MapManager.dungeonCompletions[`level_${level}`] = true; // Legacy compat

        // Remove boss health bar if it exists
        if (window.bossHpBar) {
            window.bossHpBar.destroy();
            window.bossHpBar = null;
        }

        const dungeonData = scene.cache.json.get('dungeonData');
        const dungeonDef = dungeonData && dungeonData.dungeons ? dungeonData.dungeons[dungeonId] : null;
        const maxLevels = dungeonDef ? (dungeonDef.levels || 3) : 3;

        // Drop boss loot
        this.dropBossLoot(x, y, level);

        debugLog(`✅ Dungeon level ${level} completed (Max: ${maxLevels})`);

        if (level >= maxLevels) {
            // FINAL VICTORY
            const victoryImage = (dungeonDef && dungeonDef.victory_image) ? dungeonDef.victory_image : null;
            const loreText = (dungeonDef && dungeonDef.storyline_lore) ? dungeonDef.storyline_lore :
                "The ancient evil has been vanquished. The air feels lighter, and the corruption begins to recede.";

            // Show Cinematic after short delay
            scene.time.delayedCall(1500, () => {
                if (typeof window.showVictoryCinematic === 'function') {
                    window.showVictoryCinematic(scene, victoryImage, loreText);
                }
            });

            // Spawn Exit Portal
            this.spawnDungeonExit(scene, x, y - 80);

            // Show completion message
            if (window.showDamageNumber) window.showDamageNumber(window.player.x, window.player.y - 40, 'DUNGEON CONQUERED!', 0xffd700);
            if (window.addChatMessage) window.addChatMessage(`🏆 FINAL BOSS DEFEATED! ${dungeonDef ? dungeonDef.name : 'Dungeon'} Cleared!`, 0xffd700);
        } else {
            // Normal completion
            if (window.showDamageNumber) window.showDamageNumber(window.player.x, window.player.y - 40, 'Level Cleared!', 0x00ffff);
            if (window.addChatMessage) window.addChatMessage(`Dungeon Level ${level} Cleared! Proceed deeper...`, 0x00ffff, '✨');
        }

        // Clear dungeon from cache (force regeneration on next entry)
        const cacheKey = `${dungeonId}_level_${level}`;
        if (MapManager.dungeonCache[cacheKey]) delete MapManager.dungeonCache[cacheKey];

        // Auto-save
        if (typeof window.saveGame === 'function') window.saveGame();
    }

    /**
     * Spawn a magical exit portal after boss defeat
     */
    spawnDungeonExit(scene, x, y) {
        // Create visual portal
        const portal = scene.add.circle(x, y, 40, 0x00ffff, 0.4).setDepth(5);
        const inner = scene.add.circle(x, y, 20, 0xffffff, 0.8).setDepth(6);

        scene.tweens.add({
            targets: portal,
            scale: 1.2, alpha: 0.2,
            duration: 1500, yoyo: true, repeat: -1
        });
        scene.tweens.add({
            targets: inner,
            scale: 0.8, alpha: 1,
            duration: 1000, yoyo: true, repeat: -1
        });

        const label = scene.add.text(x, y - 50, "EXIT DUNGEON\n(Return to Wilderness)", {
            fontSize: '14px', fill: '#00ffff', align: 'center', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);

        // Register with MapManager
        MapManager.transitionMarkers.push({
            x: x, y: y,
            radius: 40,
            targetMap: 'wilderness', // Or 'town' if preferred, but usually wilderness
            marker: portal, // Visual reference
            text: label,
            isExit: true
        });
    }

    /**
     * Drop boss loot (multiple, higher-quality items)
     */
    dropBossLoot(x, y, level) {
        const scene = this.scene;

        // Boss drops 2-4 items, with better quality based on level
        const numItems = 2 + Math.floor(level / 2); // 2 items at level 1, 3 at level 2, 4+ at higher levels
        const qualityRoll = Math.random();

        // Quality distribution: Higher level = better items
        let quality = 'Common';
        if (level >= 3) {
            quality = qualityRoll < 0.3 ? 'Legendary' : qualityRoll < 0.6 ? 'Epic' : 'Rare';
        } else if (level >= 2) {
            quality = qualityRoll < 0.4 ? 'Epic' : qualityRoll < 0.7 ? 'Rare' : 'Uncommon';
        } else {
            quality = qualityRoll < 0.5 ? 'Rare' : qualityRoll < 0.8 ? 'Uncommon' : 'Common';
        }

        const itemTypes = ['weapon', 'armor', 'helmet', 'ring', 'amulet'];

        for (let i = 0; i < numItems; i++) {
            // Random item type
            const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

            // Slightly randomize quality per item (boss can drop mix)
            let itemQuality = quality;
            const qualityVariation = Math.random();
            if (qualityVariation < 0.2 && level > 1) {
                // 20% chance for one tier higher
                const qualityTiers = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
                const currentIndex = qualityTiers.indexOf(quality);
                if (currentIndex < qualityTiers.length - 1) {
                    itemQuality = qualityTiers[currentIndex + 1];
                }
            }

            // Generate Item
            let item = null;
            if (typeof window.generateRandomItemOfType === 'function') {
                item = window.generateRandomItemOfType(itemType, itemQuality);
            }

            if (!item) continue;

            // Create item sprite
            let spriteKey = 'item_gold';
            if (item.type === 'weapon') spriteKey = 'item_weapon';
            else if (item.type === 'armor') spriteKey = 'item_armor';
            else if (item.type === 'helmet') spriteKey = 'item_helmet';
            else if (item.type === 'ring') spriteKey = 'item_ring';
            else if (item.type === 'amulet') spriteKey = 'item_amulet';

            // Find a valid walkable position for the item
            const tileSize = 32;
            let itemX = x;
            let itemY = y;
            let attempts = 0;
            const maxAttempts = 20;

            // Spread items around boss location, ensuring they're on walkable tiles
            const angle = (i / numItems) * Math.PI * 2;
            const baseRadius = 30 + (i * 5);

            while (attempts < maxAttempts) {
                const radius = baseRadius + (attempts * 5); // Expand search radius if needed
                itemX = x + Math.cos(angle) * radius;
                itemY = y + Math.sin(angle) * radius;

                // Check if position is walkable (in dungeon)
                if (MapManager.currentDungeon && MapManager.currentDungeon.mapData) {
                    const tileX = Math.floor(itemX / tileSize);
                    const tileY = Math.floor(itemY / tileSize);

                    // Check bounds
                    if (tileX >= 0 && tileX < MapManager.currentDungeon.width &&
                        tileY >= 0 && tileY < MapManager.currentDungeon.height) {
                        const tileType = MapManager.currentDungeon.mapData[tileY][tileX];
                        if (tileType === 1) { // Floor tile (walkable)
                            break; // Found valid position
                        }
                    }
                } else {
                    break;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    const newAngle = angle + (Math.random() - 0.5) * 0.5;
                    itemX = x + Math.cos(newAngle) * radius;
                    itemY = y + Math.sin(newAngle) * radius;
                }
            }

            const itemSprite = scene.add.sprite(itemX, itemY, spriteKey);
            itemSprite.setDepth(8);

            // Make item interactive for click-to-pickup
            itemSprite.setInteractive();
            itemSprite.isItem = true;
            itemSprite.itemId = item.type + '_' + Date.now() + '_' + i;
            itemSprite.itemData = item;
            item.sprite = itemSprite; // Verify linkage for pickupItem

            // Add to global items list
            if (window.items) window.items.push(item);
            debugLog(`✨ Added boss loot to items list: ${item.name}`);

            // Add Hover Effect
            if (typeof window.enableHoverEffect === 'function') {
                window.enableHoverEffect(itemSprite, scene);
            }
        }

        // Also drop gold
        const goldAmount = 50 + (level * 25);
        if (window.playerStats) window.playerStats.gold += goldAmount;
        if (window.showDamageNumber) window.showDamageNumber(x, y - 20, `+${goldAmount} Gold`, 0xffd700);

        // UQE: Emit gold earned event
        if (typeof window.uqe !== 'undefined' && window.UQE_EVENTS) {
            window.uqe.eventBus.emit(window.UQE_EVENTS.GOLD_EARNED, { amount: goldAmount });
        }

        debugLog(`💰 Boss dropped ${numItems} items (quality: ${quality})`);

        // SPECIAL: Quest Item Drops
        const dungeonId = MapManager.currentDungeon ? MapManager.currentDungeon.id : null;

        // Temple Ruins: Drop Artifact Fragment (Quest: main_02_003)
        // Always drop it if we are in the Temple Ruins and kill the boss
        if (dungeonId === 'temple_ruins') {
            const fragment = {
                type: 'quest_item',
                itemId: 'artifact_fragment',
                name: 'Artifact Fragment',
                description: 'A pulsating shard of ancient energy.',
                sprite: null, // Will be assigned
                x: x,
                y: y + 30 // Drop slightly below boss
            };

            let spriteKey = 'item_fragment';
            if (!scene.textures.exists(spriteKey)) spriteKey = 'item_gold'; // Fallback

            const fSprite = scene.add.sprite(fragment.x, fragment.y, spriteKey);
            fSprite.setDepth(10);
            fSprite.setInteractive();
            fSprite.isItem = true;
            fSprite.itemId = fragment.itemId;
            fSprite.itemData = fragment;
            fragment.sprite = fSprite; // Link sprite

            // Add to global items
            if (window.items) window.items.push(fragment);
            debugLog('✨ Quest Item Dropped: Artifact Fragment (Added to items list)');

            // Hover Effect
            if (typeof window.enableHoverEffect === 'function') {
                window.enableHoverEffect(fSprite, scene);
            }

            // Pulse effect
            scene.tweens.add({
                targets: fSprite,
                alpha: 0.5,
                duration: 800,
                yoyo: true,
                repeat: -1
            });
        }
    }
}

// Export singleton
window.DungeonManager = new DungeonManager();
