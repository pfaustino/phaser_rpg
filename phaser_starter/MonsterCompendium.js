class MonsterCompendium {
    constructor(scene) {
        this.scene = scene;
        this.isVisible = false;
        this.container = null;
        this.contentContainer = null;
        this.scrollbar = null;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    initUI() {
        // Prevent double init
        if (this.container) return;

        const width = 1100;
        const height = 650;
        const x = (this.scene.scale.width - width) / 2;
        const y = (this.scene.scale.height - height) / 2;

        // Create main container
        this.container = this.scene.add.container(x, y);
        this.container.setScrollFactor(0); // Fix to camera
        this.container.setDepth(35000); // Higher z-index to stay on top

        // Background
        const bg = this.scene.add.rectangle(0, 0, width, height, 0x111111, 0.95).setOrigin(0)
            .setInteractive()
            .on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
            });
        bg.setStrokeStyle(2, 0x444444);
        this.container.add(bg);

        // Title
        const title = this.scene.add.text(width / 2, 30, "Monster Compendium", {
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(title);

        // Close Button
        const closeBtn = this.scene.add.text(width - 40, 30, "X", {
            fontSize: '28px',
            color: '#FF4444',
            fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.hide());
        this.container.add(closeBtn);

        // Scrollable Area
        const viewX = 50;
        const viewY = 80;
        const viewWidth = width - 100;
        const viewHeight = height - 120;

        // Content Container
        this.contentContainer = this.scene.add.container(0, 0);
        this.contentContainer.setScrollFactor(0); // CRITICAL: Ensure Input uses Screen Coords
        this.contentContainer.setPosition(viewX, viewY);
        this.container.add(this.contentContainer);

        this.renderGrid(viewWidth, viewHeight, viewX, viewY);

        console.log("📖 Compendium UI Initialized. W:", width, "Cols:", 6);
    }

    show() {
        if (this.isVisible) return;

        // Lazy Init
        if (!this.container) {
            this.initUI();
        } else {
            // Re-enable if it was hidden/cached (though current hide sends destroy)
            // But if we change hide() to just setVisible(false), this is needed.
            // For now, based on current hide(), we probably re-create.
            // Let's check hide() implementation.
            // Current hide() destroys container. So initUI() will be called again.
        }

        this.isVisible = true;

        // Notify UIManager
        if (window.UIManager) window.UIManager.compendiumVisible = true;
    }

    hide() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
            this.contentContainer = null;
        }
        if (this.scrollbar) {
            this.scrollbar.destroy();
            this.scrollbar = null;
        }
        this.isVisible = false;

        // Notify UIManager
        if (window.UIManager) window.UIManager.compendiumVisible = false;
    }

    renderGrid(viewWidth, viewHeight, viewX, viewY) {
        const monsters = this.scene.cache.json.get('monsters')?.monsters || [];
        const startX = 60;
        const startY = 60;
        const gapX = 160;
        const gapY = 180;
        const cols = 6;

        monsters.forEach((mon, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const posX = startX + col * gapX;
            const posY = startY + row * gapY;

            // Render Monster
            const renderer = this.scene.monsterRenderer || window.monsterRenderer;
            if (renderer) {
                const monsterVisual = renderer.createMonster(0, 0, mon.id);
                if (monsterVisual) {
                    // CRITICAL FIX: Remove from Physics World
                    // The renderer adds physics by default, but this is a UI element.
                    // Leaving it in the physics world causes the 'isParent' crash during collision updates.
                    if (monsterVisual.body) {
                        this.scene.physics.world.remove(monsterVisual.body);
                        monsterVisual.body.destroy();
                        monsterVisual.body = null;
                    }

                    this.contentContainer.add(monsterVisual);
                    monsterVisual.setPosition(posX, posY);

                    // Start in Idle Animation by default
                    this.playAnimation(monsterVisual, 'idle');

                    // FLATTENED Button Helper (Prevents Nested Input bugs)
                    const createBtn = (bx, by, label, callback) => {
                        // Background (Hit Area)
                        const btnBg = this.scene.add.rectangle(bx, by, 40, 20, 0x004400)
                            .setStrokeStyle(1, 0x00ff00)
                            .setScrollFactor(0) // CRITICAL: Fix input to Camera
                            .setInteractive({ useHandCursor: true })
                            .on('pointerdown', (pointer) => {
                                pointer.event.stopPropagation();
                                console.log(`[COMPENDIUM_INPUT] Clicked Button: ${label}`);
                                callback();
                            });
                        // [COMPENDIUM_INPUT] Log all clicks
                        this.scene.input.on('pointerdown', (pointer, gameObjects) => {
                            console.log(`[COMPENDIUM_INPUT] Pointer Down at Screen(${pointer.x}, ${pointer.y}) World(${pointer.worldX}, ${pointer.worldY})`);
                            if (gameObjects.length > 0) {
                                console.log(`[COMPENDIUM_INPUT] Hit ${gameObjects.length} objects. Top: ${gameObjects[0].type}`);
                            } else {
                                console.log("[COMPENDIUM_INPUT] Hit NOTHING");
                            }
                        });

                        this.scene.input.enableDebug(btnBg); // VISUALIZE HIT AREA

                        // Label
                        const btnText = this.scene.add.text(bx, by, label, {
                            fontSize: '10px',
                            color: '#00ff00'
                        }).setOrigin(0.5);

                        // Hover Logic
                        btnBg.on('pointerover', () => {
                            btnBg.setFillStyle(0x008800);
                            btnText.setColor('#ffffff');
                        });
                        btnBg.on('pointerout', () => {
                            btnBg.setFillStyle(0x004400);
                            btnText.setColor('#00ff00');
                        });

                        // Add directly to main container
                        this.contentContainer.add([btnBg, btnText]);
                    };

                    // Attack Button (Left)
                    createBtn(posX - 25, posY + 35, "Atk", () => {
                        this.playAnimation(monsterVisual, 'attack');
                    });

                    // Move Button (Right)
                    createBtn(posX + 25, posY + 35, "Move", () => {
                        this.playAnimation(monsterVisual, 'move');
                    });

                } else {
                    const fail = this.scene.add.text(posX, posY, "MISSING", { fontSize: '12px', color: '#F00' }).setOrigin(0.5);
                    this.contentContainer.add(fail);
                }
            }

            // Labels - Shifted down to avoid button overlap
            const nameText = this.scene.add.text(posX, posY + 55, mon.name, {
                fontSize: '14px', color: '#FFF', align: 'center', wordWrap: { width: 140 }
            }).setOrigin(0.5);
            this.contentContainer.add(nameText);

            const idText = this.scene.add.text(posX, posY + 72, mon.id, {
                fontSize: '10px', color: '#888', align: 'center'
            }).setOrigin(0.5);
            this.contentContainer.add(idText);
        });

        const totalRows = Math.ceil(monsters.length / cols);
        const contentHeight = startY + (totalRows * gapY);

        // Add Scrollbar
        const absX = this.container.x + viewX;
        const absY = this.container.y + viewY;
        const maskRect = new Phaser.Geom.Rectangle(absX, absY, viewWidth, viewHeight);

        if (typeof Scrollbar !== 'undefined') {
            this.scrollbar = new Scrollbar(this.scene, this.contentContainer, maskRect, contentHeight);
        } else if (typeof setupScrollbar === 'function' && setupScrollbar.length > 1) {
            // Check for the correct setupScrollbar (not the 1-arg one in game.js)
            this.scrollbar = setupScrollbar(this.scene, this.contentContainer, viewWidth, viewHeight, contentHeight, absX, absY);
        } else {
            // Fallback
            this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                this.contentContainer.y = Phaser.Math.Clamp(this.contentContainer.y - deltaY * 0.5, viewY - contentHeight + viewHeight, viewY);
            });
        }
    }

    stopMonsterAnimations(monsterVisual) {
        if (!monsterVisual) return;

        // Disable Physics (if exists)
        if (monsterVisual.body) {
            monsterVisual.body.enable = false;
        }

        // Stop Update
        monsterVisual.active = false;

        // Stop Spritesheet Anims
        if (monsterVisual.anims) monsterVisual.anims.stop();

        // Kill Tweens on Self
        this.scene.tweens.killTweensOf(monsterVisual);

        // Kill Tweens on Children (if Container)
        if (monsterVisual.list) {
            monsterVisual.list.forEach(child => {
                this.scene.tweens.killTweensOf(child);
            });
        }

        // Reset Transforms
        monsterVisual.setScale(1);
        monsterVisual.setAngle(0);
        monsterVisual.setAlpha(1);
        // Reset Position (Relative to parent container placement)
        // Note: We don't have original X/Y stored easily here without extra data.
        // But since we use relative tweens (x + 10), resetting position might be needed if interrupted.
        // For now, let's rely on the tween's yoyo or onComplete to handle visual reset,
        // or store origin.
        if (monsterVisual.getData('originX') === undefined) {
            monsterVisual.setData('originX', monsterVisual.x);
            monsterVisual.setData('originY', monsterVisual.y);
        } else {
            monsterVisual.x = monsterVisual.getData('originX');
            monsterVisual.y = monsterVisual.getData('originY');
        }
    }

    playAnimation(monsterVisual, type) {
        // Ensure origin is stored before stopping/moving
        if (monsterVisual.getData('originX') === undefined) {
            monsterVisual.setData('originX', monsterVisual.x);
            monsterVisual.setData('originY', monsterVisual.y);
        }

        this.stopMonsterAnimations(monsterVisual);
        const bp = monsterVisual.getData('blueprint');
        if (!bp || !bp.appearance) return;

        // Get Definition or Use Fallback
        let animData = bp.appearance.animations ? bp.appearance.animations[type] : null;

        // --- FALLBACKS ---
        if (!animData) {
            if (type === 'attack') {
                animData = { type: 'lunge', distance: 20, duration: 250 };
            } else if (type === 'move') {
                animData = { type: 'hop', height: 10, duration: 300 };
            } else if (type === 'idle') {
                animData = { type: 'pulse', duration: 1500, to: 0.95 }; // Gentle breathe default
            }
        }

        if (!animData) return;

        // Use MonsterRenderer's logic if possible, or replicate it
        if (type === 'idle') {
            if (animData.type === 'float') {
                this.scene.tweens.add({
                    targets: monsterVisual,
                    y: monsterVisual.y - (animData.range || 5),
                    duration: animData.duration || 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else if (animData.type === 'pulse') {
                const property = animData.property || 'scaleY';
                const config = {
                    targets: monsterVisual,
                    duration: animData.duration || 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                };
                config[property] = animData.to || 0.8;
                this.scene.tweens.add(config);
            }
        } else if (type === 'attack') {
            if (animData.type === 'lunge') {
                this.scene.tweens.add({
                    targets: monsterVisual,
                    x: monsterVisual.x + (animData.distance || 15),
                    duration: animData.duration || 300,
                    yoyo: true,
                    repeat: 0,
                    onComplete: () => {
                        this.playAnimation(monsterVisual, 'idle');
                    }
                });
            } else if (animData.type === 'spin') {
                this.scene.tweens.add({
                    targets: monsterVisual,
                    angle: 360,
                    duration: animData.duration || 500,
                    onComplete: () => {
                        monsterVisual.setAngle(0);
                        this.playAnimation(monsterVisual, 'idle');
                    }
                });
            }
        } else if (type === 'move') {
            if (animData.type === 'hop') {
                this.scene.tweens.add({
                    targets: monsterVisual,
                    y: monsterVisual.y - (animData.height || 10),
                    duration: animData.duration || 400,
                    yoyo: true,
                    repeat: 1, // Hop twice? No, repeat 1 means play twice total usually
                    onComplete: () => {
                        this.playAnimation(monsterVisual, 'idle');
                    }
                });
            } else if (animData.type === 'slide') {
                this.scene.tweens.add({
                    targets: monsterVisual,
                    x: monsterVisual.x + 10,
                    duration: 500,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        this.playAnimation(monsterVisual, 'idle');
                    }
                });
            }
        }
    }
}

window.MonsterCompendium = MonsterCompendium;
