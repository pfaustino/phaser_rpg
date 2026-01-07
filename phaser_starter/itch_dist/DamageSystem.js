/**
 * DamageSystem.js
 * 
 * Manages floating damage numbers and related visual effects (experience, healing).
 * This system is self-contained and updates its own entities.
 */

// Global state for damage numbers
window.damageNumbers = []; // Array of {x, y, text, timer, color, textObject}

/**
 * Show a floating damage number (or generic text)
 * @param {number} x - World X position
 * @param {number} y - World Y position
 * @param {string|number} text - Text to display
 * @param {number} color - Hex color (e.g. 0xff0000)
 * @param {boolean} isCritical - Whether to show critical hit effect
 * @param {string} type - 'physical', 'magical', 'healing', 'xp'
 */
window.showDamageNumber = function (x, y, text, color, isCritical = false, type = 'physical') {
    console.log(`DamageSystem: Showing ${text} at ${x},${y}`);
    if (!window.game || !window.game.scene || !window.game.scene.scenes || window.game.scene.scenes.length === 0) {
        console.warn('DamageSystem: No scene found!');
        return;
    }
    const scene = window.game.scene.scenes[0];
    if (!scene || !scene.add) return;

    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

    // Add icons/symbols based on type
    let displayText = text;
    if (type === 'healing') {
        displayText = `↑ ${text}`; // Upward arrow for healing
    } else if (type === 'xp') {
        displayText = `✨ ${text}`; // Sparkle for XP
    } else if (type === 'magic') {
        displayText = `⚡ ${text}`; // Lightning bolt for magic
    } else if (type === 'physical') {
        displayText = `⚔ ${text}`; // Sword for physical
    }

    const fontSize = isCritical ? '28px' : '20px';
    const strokeThickness = isCritical ? 4 : 2;

    const textObj = scene.add.text(x, y, displayText, {
        fontSize: fontSize,
        fill: colorHex,
        stroke: '#000000',
        strokeThickness: strokeThickness,
        fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20000); // Increased depth to show over UI

    // Add bounce effect for critical hits
    if (isCritical) {
        scene.tweens.add({
            targets: textObj,
            scale: 1.5,
            duration: 100,
            yoyo: true,
            ease: 'Bounce'
        });
    }

    // Create sparkle effect for XP
    if (type === 'xp' && typeof window.createSparkleEffect === 'function') {
        window.createSparkleEffect(x, y);
    } else if (type === 'xp') {
        // Fallback internal sparkle if global not found
        createLocalSparkleEffect(scene, x, y);
    }

    window.damageNumbers.push({
        x: x,
        y: y,
        text: displayText,
        timer: isCritical ? 4.0 : 2.8, // Doubled duration (was 2.0/1.4)
        color: color,
        textObject: textObj,
        isCritical: isCritical,
        type: type
    });
};

/**
 * Update damage numbers physics/animation
 * Should be called from the game update loop
 */
window.updateDamageNumbers = function (time, delta) {
    const deltaSeconds = delta / 1000;

    for (let i = window.damageNumbers.length - 1; i >= 0; i--) {
        const dn = window.damageNumbers[i];
        dn.timer -= deltaSeconds;

        // Different movement based on type
        let floatSpeed;
        if (dn.type === 'healing') {
            floatSpeed = 25; // Healing moves upward faster
        } else if (dn.type === 'xp') {
            floatSpeed = dn.isCritical ? 20 : 15; // XP floats up
        } else {
            floatSpeed = dn.isCritical ? 20 : 15; // Damage floats up
        }
        dn.y -= floatSpeed * deltaSeconds;

        // Update text object position (Phaser handles camera scrolling automatically)
        if (dn.textObject && dn.textObject.active) {
            dn.textObject.x = dn.x;
            dn.textObject.y = dn.y;

            // Fade out - use appropriate timer duration
            const fadeDuration = dn.isCritical ? 4.0 : 2.8;
            const alpha = Math.min(1, dn.timer / fadeDuration);
            dn.textObject.setAlpha(alpha);

            // Add subtle pulsing effect for critical hits
            if (dn.isCritical && dn.timer > 0.5) {
                const pulse = 1 + Math.sin(time * 0.02) * 0.1;
                dn.textObject.setScale(pulse);
            }
        }

        if (dn.timer <= 0) {
            if (dn.textObject && dn.textObject.active) {
                dn.textObject.destroy();
            }
            window.damageNumbers.splice(i, 1);
        }
    }
};

/**
 * Local helper for sparkle effect if not found globally
 */
function createLocalSparkleEffect(scene, x, y) {
    // Simple particle burst
    if (scene.textures.exists('hit_spark')) {
        const emitter = scene.add.particles(x, y, 'hit_spark', {
            speed: { min: 50, max: 100 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            quantity: 5,
            blendMode: 'ADD'
        });
        scene.time.delayedCall(500, () => emitter.destroy());
    }
}
