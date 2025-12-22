/**
 * ScrollbarUtils.js - Universal Scrollbar Utility
 * A reusable scrollbar component for Phaser game panels
 */

/**
 * Unified scrollbar setup utility
 * @param {Object} params Configuration parameters
 * @returns {Object} Scrollbar instance with update methods
 */
function setupScrollbar({
    scene,
    x,
    y,
    width = 12,
    height,
    depth = 1000,
    minScroll = 0,
    initialScroll = 0,
    onScroll, // Callback(newPosition)
    container, // Optional Phaser Container to auto-update .y
    containerStartY, // Required if using container
    containerOffset = 0, // Extra offset for container positioning
    wheelHitArea, // Optional rectangle/object with getBounds() for wheel support
    visibleHeight // Height of the visible area (usually same as scrollbar height)
}) {
    // Create track with origin at top center
    const track = scene.add.rectangle(x, y, width, height, 0x333333, 0.8)
        .setScrollFactor(0).setDepth(depth).setStrokeStyle(1, 0x555555)
        .setInteractive({ useHandCursor: true }).setOrigin(0.5, 0);

    // Thumb height ratio
    let thumbHeight = 40;
    const thumb = scene.add.rectangle(x, y, width - 4, thumbHeight, 0x666666, 1)
        .setScrollFactor(0).setDepth(depth + 1).setStrokeStyle(1, 0x888888)
        .setInteractive({ useHandCursor: true }).setOrigin(0.5, 0);

    let currentScroll = initialScroll;
    let maxScroll = 0;
    let isDragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;

    const setScroll = (newPosition) => {
        // Clamp scroll position between min and max
        currentScroll = Math.max(minScroll, Math.min(maxScroll, newPosition));

        // Update thumb position with precision
        if (maxScroll > minScroll) {
            const scrollRange = maxScroll - minScroll;
            const scrollRatio = (currentScroll - minScroll) / scrollRange;

            // Available movement range for the thumb (leave 2px padding at top and bottom)
            const padding = 2;
            const availableTrackHeight = height - (padding * 2);
            const thumbMoveRange = availableTrackHeight - thumb.height;

            // Map scroll ratio to thumb Y position (relative to track Y + padding)
            if (thumbMoveRange > 0) {
                thumb.y = y + padding + (scrollRatio * thumbMoveRange);
            } else {
                thumb.y = y + padding;
            }
        } else {
            thumb.y = y + 2;
        }

        // Apply scroll logic to container
        if (container && containerStartY !== undefined) {
            container.y = containerStartY - containerOffset - currentScroll;
        }

        if (onScroll) {
            onScroll(currentScroll);
        }
    };


    // Interactions
    const onPointerDown = (pointer) => {
        if (!track.visible) return;

        if (thumb.getBounds().contains(pointer.x, pointer.y)) {
            isDragging = true;
            dragStartY = pointer.y;
            dragStartScroll = currentScroll;
        } else if (track.getBounds().contains(pointer.x, pointer.y)) {
            // Jump to position
            const padding = 2;
            const availableTrackHeight = height - (padding * 2);
            const thumbMoveRange = availableTrackHeight - thumb.height;

            if (thumbMoveRange > 0) {
                // Click position relative to track start (offset by padding and half thumb)
                const clickY = pointer.y - y - padding - (thumb.height / 2);
                const clickRatio = Math.max(0, Math.min(1, clickY / thumbMoveRange));
                const scrollRange = maxScroll - minScroll;
                setScroll(minScroll + clickRatio * scrollRange);
            }
        }
    };

    const onPointerMove = (pointer) => {
        if (isDragging && pointer.isDown) {
            const padding = 2;
            const availableTrackHeight = height - (padding * 2);
            const thumbMoveRange = availableTrackHeight - thumb.height;

            if (thumbMoveRange > 0 && maxScroll > minScroll) {
                const deltaY = pointer.y - dragStartY;
                const scrollChangeRatio = deltaY / thumbMoveRange;
                const scrollRange = maxScroll - minScroll;
                setScroll(dragStartScroll + scrollChangeRatio * scrollRange);
            }
        }
    };


    const onPointerUp = () => { isDragging = false; };

    const onWheel = (pointer, gameObjects, deltaX, deltaY) => {
        if (!track.visible || maxScroll <= minScroll) return;

        const hitArea = wheelHitArea || track;
        const bounds = (hitArea.getBounds ? hitArea.getBounds() : hitArea);

        if (bounds.contains(pointer.x, pointer.y)) {
            setScroll(currentScroll + deltaY * 0.5);
        }
    };

    scene.input.on('pointerdown', onPointerDown);
    scene.input.on('pointermove', onPointerMove);
    scene.input.on('pointerup', onPointerUp);
    scene.input.on('wheel', onWheel);

    const instance = {
        track,
        thumb,
        updateMaxScroll: (newMax, totalContentHeight) => {
            maxScroll = newMax;
            if (totalContentHeight > visibleHeight) {
                const ratio = Math.min(1, visibleHeight / totalContentHeight);
                const padding = 2;
                const usableHeight = height - (padding * 2);

                // Calculate thumb height proportionate to usable track height
                // Ensure min height of 30, but never more than usableHeight
                thumb.height = Math.min(usableHeight, Math.max(30, usableHeight * ratio));

                track.setVisible(true);
                thumb.setVisible(true);
            } else {
                track.setVisible(false);
                thumb.setVisible(false);
            }
            setScroll(currentScroll); // Refresh position
        },

        setScroll,
        getScroll: () => currentScroll,
        destroy: () => {
            scene.input.off('pointerdown', onPointerDown);
            scene.input.off('pointermove', onPointerMove);
            scene.input.off('pointerup', onPointerUp);
            scene.input.off('wheel', onWheel);
            track.destroy();
            thumb.destroy();
        },
        setVisible: (visible) => {
            if (visible && maxScroll > minScroll) {
                track.setVisible(true);
                thumb.setVisible(true);
            } else {
                track.setVisible(false);
                thumb.setVisible(false);
            }
        }
    };

    return instance;
}

// Export for global access
window.setupScrollbar = setupScrollbar;

console.log('📜 ScrollbarUtils.js loaded');
