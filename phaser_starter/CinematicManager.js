/**
 * CinematicManager.js
 * Handles cinematic overlays, intros, and cutscenes.
 */
class CinematicManager {
    constructor(scene) {
        this.scene = scene;
        this.cinematics = [];
        this.playedCinematics = new Set();
    }

    init(data) {
        if (!data || !data.cinematics) return;
        this.cinematics = data.cinematics;
        this.loadProgress();
        this.setupEventListeners();
        console.log(`🎬 CinematicManager initialized with ${this.cinematics.length} cinematics`);

        // Check for 'game_start' triggers immediately
        // But need to wait for scene to be ready?
        // Actually, init is called in create(), so we can trigger right away if needed.
        // However, we ideally want to wait for the initial fade-in or loading to finish.
        // But let's check immediately for now.
        this.checkTriggers('ms_game_start');
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('played_cinematics');
            if (saved) {
                const parsed = JSON.parse(saved);
                parsed.forEach(id => this.playedCinematics.add(id));
            }
        } catch (e) {
            console.warn('CinematicManager: Failed to load progress', e);
        }
    }

    saveProgress() {
        try {
            const array = Array.from(this.playedCinematics);
            localStorage.setItem('played_cinematics', JSON.stringify(array));
        } catch (e) {
            console.warn('CinematicManager: Failed to save progress', e);
        }
    }

    setupEventListeners() {
        // Listen for Quest Completions from UQE
        if (window.uqe && window.uqe.eventBus) {
            window.uqe.eventBus.on('QUEST_COMPLETED', (quest) => {
                this.checkTriggers(`quest_complete:${quest.id}`);
            });
        }

        // Listen for Milestone Completions via global event or direct hook?
        // MilestoneManager doesn't emit a global event in its current code yet.
        // But we can listen to 'milestone_complete' if we add it, or just rely on 'ms_game_start' which is special.
        // For now, let's assume we might need to call checkTriggers manually from game.js or MilestoneManager.
        // OR better: 'ms_game_start' is handled in init.

        // We can expose a global method to trigger checks
        window.triggerCinematicCheck = (triggerId) => this.checkTriggers(triggerId);
    }

    checkTriggers(triggerId) {
        // Find cinematic providing this trigger
        const cinematic = this.cinematics.find(c => c.trigger === triggerId);

        if (cinematic) {
            if (!this.playedCinematics.has(cinematic.id)) {
                console.log(`🎬 Triggering Cinematic: ${cinematic.title} (${triggerId})`);
                this.playCinematic(cinematic);
            }
        }
    }

    playCinematic(cinematic) {
        this.playedCinematics.add(cinematic.id);
        this.saveProgress();

        const scene = this.scene;
        const width = scene.scale.width;
        const height = scene.scale.height;

        // Container for Cinematic (High Depth)
        const container = scene.add.container(0, 0).setDepth(40000).setScrollFactor(0);

        // 1. Background (Solid Black)
        const bg = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1)
            .setOrigin(0.5).setInteractive(); // Block input
        container.add(bg);

        // 2. Image (if exists)
        let img = null;
        if (cinematic.image && scene.textures.exists(cinematic.image)) {
            img = scene.add.image(width / 2, height / 2 - 50, cinematic.image)
                .setOrigin(0.5).setAlpha(0);

            // Aspect ratio scaling
            // Want to fit within e.g. 800x400
            const maxW = width * 0.8;
            const maxH = height * 0.5;
            const scale = Math.min(maxW / img.width, maxH / img.height);
            img.setScale(scale);

            // subtle border
            const border = scene.add.rectangle(width / 2, height / 2 - 50, img.displayWidth + 10, img.displayHeight + 10, 0xffffff, 0)
                .setStrokeStyle(2, 0x444444).setAlpha(0);

            container.add(border);
            container.add(img);

            scene.tweens.add({
                targets: [img, border],
                alpha: 1,
                duration: 2000,
                delay: 500
            });
        }

        // 3. Title
        const title = scene.add.text(width / 2, 50, cinematic.title, {
            fontSize: '48px', fontFamily: 'serif', fill: '#ffd700',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);
        container.add(title);

        scene.tweens.add({
            targets: title,
            alpha: 1,
            y: 80,
            duration: 2000,
            ease: 'Power2'
        });

        // 4. Text Content (Paragraphs)
        const content = scene.add.text(width / 2, height / 2 + 150, cinematic.text, {
            fontSize: '18px', fontFamily: 'sans-serif', fill: '#cccccc', align: 'center',
            wordWrap: { width: Math.min(800, width * 0.8) },
            stroke: '#000000', strokeThickness: 2,
            lineSpacing: 10
        }).setOrigin(0.5).setAlpha(0);
        container.add(content);

        scene.tweens.add({
            targets: content,
            alpha: 1,
            duration: 2000,
            delay: 1500
        });

        // 5. Continue Button
        const btnY = height - 60;
        const btn = scene.add.text(width / 2, btnY, "- Press SPACE or Click to Continue -", {
            fontSize: '16px', fontFamily: 'monospace', fill: '#444444',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setAlpha(0);
        container.add(btn);

        scene.tweens.add({
            targets: btn,
            alpha: 1,
            duration: 1000,
            delay: 4000,
            yoyo: true,
            repeat: -1
        });

        // Input Handling
        let canClose = false;

        // Allow close after minimum duration
        setTimeout(() => {
            canClose = true;
            btn.setColor('#ffffff'); // Highlight button
        }, 2000); // 2 seconds minimum lock

        const closeCinematic = () => {
            if (!canClose) return;

            // Fade out
            scene.tweens.add({
                targets: container,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    container.destroy();
                    // Resume music if changed?
                    // Triggers?
                }
            });

            // Music handling
            if (cinematic.music && scene.sound && scene.cache.audio.exists(cinematic.music)) {
                // If it's different from current music...
                // Ideally MusicManager handles this, but for now:
                // We could switch tracks.
                // window.playMusic(cinematic.music); // Assuming this helper exists or we implement it
            }
        };

        bg.on('pointerdown', closeCinematic);
        scene.input.keyboard.on('keydown-SPACE', closeCinematic);
        scene.input.keyboard.on('keydown-ENTER', closeCinematic);

        // Auto Close (optional, usually preferred manual)
        // if (cinematic.duration) {
        //     setTimeout(closeCinematic, cinematic.duration + 2000);
        // }
    }
}

// Export
window.CinematicManager = CinematicManager;
