class MonsterCompendium {
    constructor(scene) {
        this.scene = scene;
        this.isVisible = false;
        this.container = null;
        this.contentContainer = null;
        this.scrollbar = null;

        // Permanent Input Listener (Shift+O)
        this.scene.input.keyboard.on('keydown-O', (event) => {
            if (this.isVisible && event.shiftKey) {
                console.log("[COMPENDIUM] 🎮 Shift+O detected");
                this.toggleRenderMode();
            }
        });
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
        const x = Math.max(20, (this.scene.scale.width - width) / 2);
        const y = Math.max(20, (this.scene.scale.height - height) / 2);

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

        // Mask for Scrollable Content
        this.contentMask = this.scene.make.graphics();

        // Content Container
        this.contentContainer = this.scene.add.container(0, 0);
        this.contentContainer.setScrollFactor(0); // CRITICAL: Ensure Input uses Screen Coords
        this.contentContainer.setPosition(viewX, viewY);
        this.container.add(this.contentContainer);

        // --- PIXEL ART MODE SETUP ---
        this.proceduralMode = false;

        // Input: Shift+O to toggle mode
        // Input Listener moved to Constructor to prevent duplicates

        // Mode Label

        // Mode Label
        this.modeLabel = this.scene.add.text(width / 2 + 300, 30, "Mode: SHAPES (Shift+O)", {
            fontSize: '12px',
            color: '#888888',
            fontStyle: 'italic'
        }).setOrigin(1, 0.5);
        this.container.add(this.modeLabel);

        this.renderGrid(viewWidth, viewHeight, viewX, viewY);

        console.log("[COMPENDIUM] 📖 UI Initialized. W:", width, "Cols:", 6);
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
        // Notify UIManager
        if (window.UIManager) window.UIManager.compendiumVisible = false;
    }

    toggleRenderMode() {
        this.proceduralMode = !this.proceduralMode;
        console.log(`[COMPENDIUM] 🔄 Toggling Render Mode. New State: ${this.proceduralMode ? 'PIXEL ART' : 'SHAPES'}`);
        if (this.modeLabel) {
            this.modeLabel.setText(this.proceduralMode ? "Mode: PIXEL ART (Shift+O)" : "Mode: SHAPES (Shift+O)");
            this.modeLabel.setColor(this.proceduralMode ? '#00FF00' : '#888888');
        }

        // Recalculate dimensions dynamically
        const viewW = this.scene.scale.width;
        const viewH = this.scene.scale.height;
        const width = Math.min(1100, viewW - 40);
        const height = Math.min(650, viewH - 40);
        const viewX = 50;
        const viewY = 80;
        const viewWidth = width - 100;
        const viewHeight = height - 120;

        this.renderGrid(viewWidth, viewHeight, viewX, viewY);
    }

    renderGrid(viewWidth, viewHeight, viewX, viewY) {
        console.log("[COMPENDIUM] 🔄 renderGrid called");
        try {
            if (this.contentContainer) {
                this.contentContainer.removeAll(true);
            }

            // Ensure mask graphics exists
            if (!this.contentMask) {
                this.contentMask = this.scene.make.graphics();
            }

            // Apply Mask (CRITICAL for visual containment)
            this.contentMask.clear();
            const absX = this.container.x + viewX;
            const absY = this.container.y + viewY;
            this.contentMask.fillStyle(0xffffff);
            this.contentMask.fillRect(absX, absY, viewWidth, viewHeight);

            const mask = this.contentMask.createGeometryMask();
            this.contentContainer.setMask(mask);

            const monsters = this.scene.cache.json.get('monsters')?.monsters || [];
            const startX = 60;
            const startY = 60;
            const gapX = 160;
            const gapY = 180;

            // Dynamic Columns Calculation
            // Available width for items = viewWidth - (startX * 2) roughly, or just fit as many as possible
            const availableWidth = viewWidth - 20; // some padding
            const cols = Math.max(1, Math.floor(availableWidth / gapX));

            monsters.forEach((mon, index) => {
                try {
                    const col = index % cols;
                    const row = Math.floor(index / cols);
                    const posX = startX + col * gapX;
                    const posY = startY + row * gapY;

                    let monsterVisual = null;

                    // --- RENDER LOGIC ---
                    if (this.proceduralMode && window.ProceduralMonster && mon.generationType) {
                        try {
                            const textureKey = window.ProceduralMonster.generate(this.scene, mon.name, 12345 + index, {
                                type: mon.generationType,
                                ...mon.proceduralConfig
                            });
                            monsterVisual = this.scene.add.sprite(posX, posY - 20, textureKey);
                            monsterVisual.setScale(1);
                            monsterVisual.setData('blueprint', mon);
                            window.ProceduralMonster.applyIdleAnimation(this.scene, monsterVisual);
                        } catch (e) {
                            console.error("Procedural gen failed for", mon.name, e);
                        }
                    }

                    // Fallback / Default (Shape Renderer)
                    if ((!this.proceduralMode || !monsterVisual) && !monsterVisual) {
                        const renderer = this.scene.monsterRenderer || window.monsterRenderer;
                        if (renderer) {
                            monsterVisual = renderer.createMonster(posX, posY - 20, mon.id);
                            if (monsterVisual) {
                                if (monsterVisual.body) {
                                    this.scene.physics.world.remove(monsterVisual.body);
                                    monsterVisual.body.destroy();
                                    monsterVisual.body = null;
                                }
                                monsterVisual.disableInteractive();
                                monsterVisual.setScale(1.5);
                                monsterVisual.setData('blueprint', mon);
                                this.playAnimation(monsterVisual, 'idle');
                            } else {
                                // Create Placeholder if renderer fails
                                // monsterVisual = this.scene.add.rectangle(posX, posY-20, 32, 32, 0x555555);
                                // console.warn(`[COMPENDIUM] Renderer returned null for ${mon.id}`);
                            }
                        }
                    }

                    if (monsterVisual) {
                        this.contentContainer.add(monsterVisual);
                    } else {
                        // Debug visuals for missing monsters
                        // this.contentContainer.add(this.scene.add.text(posX, posY, "?", {fontSize:'32px'}).setOrigin(0.5));
                    }

                    // Button Helper
                    const createBtn = (bx, by, label, callback) => {
                        const btnBg = this.scene.add.rectangle(bx, by, 40, 20, 0x004400)
                            .setStrokeStyle(1, 0x00ff00)
                            .setScrollFactor(0)
                            .setInteractive({ useHandCursor: true });

                        const btnText = this.scene.add.text(bx, by, label, {
                            fontSize: '10px', color: '#00ff00'
                        }).setOrigin(0.5).setScrollFactor(0);

                        btnBg.on('pointerdown', (pointer) => {
                            pointer.event.stopPropagation();
                            callback();
                        });

                        btnBg.on('pointerover', () => { btnBg.setFillStyle(0x008800); btnText.setColor('#ffffff'); });
                        btnBg.on('pointerout', () => { btnBg.setFillStyle(0x004400); btnText.setColor('#00ff00'); });

                        this.contentContainer.add([btnBg, btnText]);
                    };

                    // Attack & Move Buttons
                    createBtn(posX - 25, posY + 35, "Atk", () => {
                        if (monsterVisual) {
                            if (this.proceduralMode && window.ProceduralMonster && monsterVisual.texture && mon.generationType) {
                                window.ProceduralMonster.playAttackAnimation(this.scene, monsterVisual, () => {
                                    window.ProceduralMonster.applyIdleAnimation(this.scene, monsterVisual);
                                });
                            } else {
                                this.playAnimation(monsterVisual, 'attack');
                            }
                        }
                    });

                    createBtn(posX + 25, posY + 35, "Move", () => {
                        if (monsterVisual) {
                            if (this.proceduralMode && window.ProceduralMonster && monsterVisual.texture && mon.generationType) {
                                this.scene.tweens.add({
                                    targets: monsterVisual, y: monsterVisual.y - 20, duration: 200, yoyo: true, repeat: 1,
                                    onComplete: () => window.ProceduralMonster.applyIdleAnimation(this.scene, monsterVisual)
                                });
                            } else {
                                this.playAnimation(monsterVisual, 'move');
                            }
                        }
                    });

                    // Labels
                    const nameText = this.scene.add.text(posX, posY + 55, mon.name || "Unknown", { fontSize: '14px', color: '#FFF', align: 'center', wordWrap: { width: 140 } }).setOrigin(0.5);

                    // Format ID for display
                    const displayId = (mon.id || "???").replace('procedural_', '').replace(/_/g, ' ');
                    const idText = this.scene.add.text(posX, posY + 72, displayId, { fontSize: '10px', color: '#888', align: 'center' }).setOrigin(0.5);
                    this.contentContainer.add([nameText, idText]);

                } catch (rowErr) {
                    console.error(`[COMPENDIUM] Error rendering row for ${mon ? mon.name : 'index ' + index}:`, rowErr);
                }
            });

            const totalRows = Math.ceil(monsters.length / cols);
            const contentHeight = startY + (totalRows * gapY);
            const maskRect = new Phaser.Geom.Rectangle(absX, absY, viewWidth, viewHeight);

            // Scrollbar Logic
            if (typeof Scrollbar !== 'undefined') {
                if (this.scrollbar) this.scrollbar.destroy();
                this.scrollbar = new Scrollbar(this.scene, this.contentContainer, maskRect, contentHeight);

                // Fix Scrollbar Depth (Must be ABOVE container)
                // Container is 35000. Scrollbar needs to be > 35000.
                // ScrollbarUtils defaults to 2001. We need to override or modify Scrollbar.
                // Since Scrollbar adds to scene root, we can just setDepth on its elements if we access them.
                if (this.scrollbar.track) this.scrollbar.track.setDepth(35001);
                if (this.scrollbar.thumb) this.scrollbar.thumb.setDepth(35002);

            } else {
                // Fallback Wheel
                this.scene.input.off('wheel');
                this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                    this.contentContainer.y = Phaser.Math.Clamp(this.contentContainer.y - deltaY * 0.5, viewY - contentHeight + viewHeight, viewY);
                });
            }

        } catch (err) {
            console.error("❌ MonsterCompendium RenderGrid Error:", err);
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
        if (!bp) { console.warn("Missing blueprint for", monsterVisual); return; }
        if (!bp.appearance) { console.warn("Missing appearance for", bp.name); return; }

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
