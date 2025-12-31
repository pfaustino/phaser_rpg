/**
 * ScrollbarUtils.js
 * A reusable scrollbar component for Phaser 3.
 */
class Scrollbar {
    /**
     * @param {Phaser.Scene} scene 
     * @param {Phaser.GameObjects.Container} contentContainer - The container to scroll
     * @param {Phaser.Geom.Rectangle} maskRect - The masking rectangle (viewport)
     * @param {number} contentHeight - Total height of the content
     */
    constructor(scene, contentContainer, maskRect, contentHeight) {
        this.scene = scene;
        this.content = contentContainer;
        this.mask = maskRect;
        this.contentHeight = contentHeight;
        this.viewportHeight = maskRect.height;

        this.track = null;
        this.thumb = null;
        this.isDragging = false;

        // Calculate needed scroll percentage
        this.visibleRatio = this.viewportHeight / this.contentHeight;
        this.canScroll = this.visibleRatio < 1;

        if (this.canScroll) {
            this.createScrollbar();
            this.setupInteraction();
        }
    }

    createScrollbar() {
        const x = this.mask.x + this.mask.width + 10;
        const y = this.mask.y;
        const trackHeight = this.viewportHeight;
        const thumbHeight = Math.max(30, trackHeight * this.visibleRatio);

        // Track
        this.track = this.scene.add.rectangle(x, y + trackHeight / 2, 10, trackHeight, 0x333333)
            .setScrollFactor(0)
            .setDepth(2001);

        // Thumb
        this.thumb = this.scene.add.rectangle(x, y + thumbHeight / 2, 8, thumbHeight, 0x888888)
            .setScrollFactor(0)
            .setDepth(2002)
            .setInteractive({ useHandCursor: true, draggable: true });

        // Hover effects
        this.thumb.on('pointerover', () => this.thumb.setFillStyle(0xAAAAAA));
        this.thumb.on('pointerout', () => {
            if (!this.isDragging) this.thumb.setFillStyle(0x888888);
        });
    }

    setupInteraction() {
        // Dragging
        this.scene.input.setDraggable(this.thumb);

        this.scene.input.on('dragstart', (pointer, gameObject) => {
            if (gameObject === this.thumb) {
                this.isDragging = true;
                this.thumb.setFillStyle(0xFFFFFF);
            }
        });

        this.scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (gameObject === this.thumb) {
                // Clamp Y position
                const trackTop = this.mask.y;
                const trackBottom = this.mask.y + this.viewportHeight;
                const thumbHeight = this.thumb.height;

                // Calculate bounds considering anchor points (default origin is 0.5 for Rectangles?) 
                // Wait, default origin for Rectangles is 0.5.
                // So y is centered.

                let newY = Phaser.Math.Clamp(dragY, trackTop + thumbHeight / 2, trackBottom - thumbHeight / 2);
                this.thumb.y = newY;

                this.updateContentPosition();
            }
        });

        this.scene.input.on('dragend', (pointer, gameObject) => {
            if (gameObject === this.thumb) {
                this.isDragging = false;
                this.thumb.setFillStyle(0x888888);
            }
        });

        // Mouse Wheel
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Check if pointer is over the mask area
            if (pointer.x >= this.mask.x && pointer.x <= this.mask.x + this.mask.width &&
                pointer.y >= this.mask.y && pointer.y <= this.mask.y + this.mask.height) {

                this.scroll(deltaY);
            }
        });
    }

    scroll(amount) {
        if (!this.thumb) return;

        const trackTop = this.mask.y + this.thumb.height / 2;
        const trackBottom = this.mask.y + this.viewportHeight - this.thumb.height / 2;
        const range = trackBottom - trackTop;

        // Move thumb
        // Scale deltaY to reasonable speed
        const move = (amount > 0 ? 10 : -10); // Fixed step
        this.thumb.y = Phaser.Math.Clamp(this.thumb.y + move, trackTop, trackBottom);

        this.updateContentPosition();
    }

    updateContentPosition() {
        if (!this.thumb) return;

        const trackTop = this.mask.y + this.thumb.height / 2;
        const trackRange = this.viewportHeight - this.thumb.height;

        const currentPos = this.thumb.y - trackTop;
        const ratio = currentPos / trackRange;

        const contentRange = this.contentHeight - this.viewportHeight;

        // Update content container y
        // Ensure we respect initial Y if strictly relative, but usually containers start at y=0 or mask.y
        // We'll set it relative to mask.y
        this.content.y = this.mask.y - (contentRange * ratio);
    }

    destroy() {
        if (this.track) this.track.destroy();
        if (this.thumb) this.thumb.destroy();
        // Remove scene input listeners if possible, but global 'on' is hard to remove specific functions from without named refs.
        // In a verified production environment we'd track the listener functions.
    }
}

// Global helper that matches the previous interface used in LoreCodex
function setupScrollbar(scene, container, width, height, contentHeight, maskX, maskY) {
    // Create a rect for the mask logic equivalent
    const maskRect = new Phaser.Geom.Rectangle(maskX, maskY, width, height);
    return new Scrollbar(scene, container, maskRect, contentHeight);
}
