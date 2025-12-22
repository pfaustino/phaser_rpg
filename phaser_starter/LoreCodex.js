/**
 * LoreCodex.js - Lore Codex System
 * A UI for viewing unlocked lore entries discovered through NPC conversations
 */

// ============================================
// LORE CODEX DATA
// ============================================

/**
 * All lore entries organized by category
 * Each entry contains: id, title, content, category, source (NPC who reveals it)
 */
const LORE_ENTRIES = {
    'lore_tremors': {
        id: 'lore_tremors',
        title: 'The Tremors',
        category: 'The Echo',
        source: 'Elder Malik',
        content: 'The tremors began three moons ago. At first, we thought it mere earthquakes, but then came the Echo—a resonance that warps reality itself. Our scholars believe something ancient stirs beneath the earth, something connected to a relic called the Shattered Aegis.'
    },
    'lore_aegis': {
        id: 'lore_aegis',
        title: 'The Shattered Aegis',
        category: 'Ancient Relics',
        source: 'Elder Malik',
        content: 'Long ago, a divine shield called the Aegis protected our world from chaos. When it shattered, its fragments—the Shards of Resonance—scattered across the land. Each shard pulses with ancient power. Some say gathering them could restore the Aegis... or unleash something far worse.'
    },
    'lore_echo': {
        id: 'lore_echo',
        title: 'The Echo',
        category: 'The Echo',
        source: 'Elder Malik',
        content: 'The Echo is a corruption that seeps from the broken Aegis. It twists creatures into monstrous forms—the Echo Mites and Echo Rats you see in our mines are proof. Those exposed too long become lost to its influence, hearing whispers that drive them mad.'
    },
    'lore_creatures': {
        id: 'lore_creatures',
        title: 'Echo Creatures',
        category: 'Bestiary',
        source: 'Elder Malik',
        content: 'We have seen Echo Mites—small crystalline insects that drain life force. Echo Rats, larger and more aggressive, lurk in the shadows. And rumors speak of an Echo Beholder in the deepest mines—a creature of pure corruption with a gaze that paralyzes.'
    },
    'lore_solution': {
        id: 'lore_solution',
        title: 'Hope for Salvation',
        category: 'Characters',
        source: 'Elder Malik',
        content: 'The Resonance Keepers of old sought to reunite the shards. One such Keeper, Warden Sylara, resides near the forest\'s edge. Seek her wisdom—she may know how to end this corruption. But beware, for others seek the shards for darker purposes.'
    },
    'lore_shards': {
        id: 'lore_shards',
        title: 'Shard Locations',
        category: 'Ancient Relics',
        source: 'Elder Malik',
        content: 'The first shard, the Shard of Resonance, lies within the Undermines—our old mine system now overrun with Echo corruption. Clear the creatures and you may find it at the heart of the infestation.'
    },
    'lore_danger': {
        id: 'lore_danger',
        title: 'The Unmaking',
        category: 'The Shadow Concord',
        source: 'Elder Malik',
        content: 'In the wrong hands, the shards could tear reality asunder. Some cultists already worship the Echo as a god. They seek to gather the shards and complete what they call "The Unmaking." We cannot let this happen.'
    },
    'lore_protection': {
        id: 'lore_protection',
        title: 'Defending Against the Echo',
        category: 'Survival',
        source: 'Elder Malik',
        content: 'Keep moving—the Echo feeds on stillness. Resonance Crystals can shield you briefly, and our blacksmith can forge protective gear from corrupted materials, turning their power against them.'
    },
    'lore_miners': {
        id: 'lore_miners',
        title: 'The Lost Miners',
        category: 'Characters',
        source: 'Elder Malik',
        content: 'Sadly, many were lost before we sealed the deeper tunnels. Some may yet live, driven mad by the Echo\'s whispers. If you find them, there may yet be hope for their salvation.'
    },
    'lore_combat': {
        id: 'lore_combat',
        title: 'Fighting Echo Creatures',
        category: 'Bestiary',
        source: 'Elder Malik',
        content: 'Strike fast and true. Echo creatures are vulnerable to consistent damage—they regenerate slowly but can overwhelm with numbers. The Beholder\'s gaze can be interrupted by breaking line of sight. Good luck, adventurer.'
    },
    'lore_origin': {
        id: 'lore_origin',
        title: 'The Rifts',
        category: 'The Echo',
        source: 'Elder Malik',
        content: 'They emerge from rifts in reality—tears where the Echo bleeds through. These rifts appear near shard fragments. Destroy the source, and the creatures fade. Let the rifts grow, and they become permanent.'
    },
    'lore_enemies': {
        id: 'lore_enemies',
        title: 'The Shadow Concord',
        category: 'The Shadow Concord',
        source: 'Elder Malik',
        content: 'The Shadow Concord—cultists who believe the Aegis\'s destruction was divine will. They see the Echo as salvation. Their leader, a fallen Keeper called Thessaly the Lost, has already claimed two shards.'
    },
    'lore_sylara': {
        id: 'lore_sylara',
        title: 'Warden Sylara',
        category: 'Characters',
        source: 'Elder Malik',
        content: 'Warden Sylara protects a sacred grove east of the village. She is a druid of the old ways, one of the last who remembers how to harmonize with the shards. Speak to her before descending into the Undermines.'
    }
};

// Lore categories with display colors
const LORE_CATEGORIES = {
    'The Echo': { color: '#9966ff', icon: '⚡' },
    'Ancient Relics': { color: '#ffcc00', icon: '🔮' },
    'Bestiary': { color: '#ff6666', icon: '👁️' },
    'Characters': { color: '#66ccff', icon: '👤' },
    'The Shadow Concord': { color: '#cc33ff', icon: '🌑' },
    'Survival': { color: '#66ff66', icon: '🛡️' }
};

// ============================================
// LORE CODEX UI
// ============================================

let codexPanel = null;
let codexVisible = false;

/**
 * Get all unlocked lore entries from localStorage
 */
function getCodexUnlockedLore() {
    const unlocked = [];

    console.log('📜 [Lore Debug] Scanning localStorage for lore entries...');
    console.log('📜 [Lore Debug] Total localStorage keys:', localStorage.length);
    console.log('📜 [Lore Debug] LORE_ENTRIES has:', Object.keys(LORE_ENTRIES).length, 'entries');
    console.log('📜 [Lore Debug] LORE_ENTRIES keys:', Object.keys(LORE_ENTRIES));

    // Scan all localStorage keys for lore_read_ entries
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log('📜 [Lore Debug] Checking key:', key);
        if (key && key.startsWith('lore_read_')) {
            try {
                const readNodes = JSON.parse(localStorage.getItem(key) || '[]');
                console.log('📜 [Lore Debug] Found lore key:', key, '-> nodes:', readNodes);
                readNodes.forEach(nodeId => {
                    console.log('📜 [Lore Debug] Checking nodeId:', nodeId, 'exists in LORE_ENTRIES:', !!LORE_ENTRIES[nodeId]);
                    if (LORE_ENTRIES[nodeId] && !unlocked.find(e => e.id === nodeId)) {
                        unlocked.push(LORE_ENTRIES[nodeId]);
                        console.log('📜 [Lore Debug] Added to unlocked:', nodeId);
                    }
                });
            } catch (e) {
                console.warn('Error parsing lore key:', key, e);
            }
        }
    }

    console.log('📜 [Lore Debug] Total unlocked entries:', unlocked.length);

    return unlocked;
}

/**
 * Get lore entries grouped by category
 */
function getLoreByCategory() {
    const unlocked = getCodexUnlockedLore();
    const grouped = {};

    unlocked.forEach(entry => {
        if (!grouped[entry.category]) {
            grouped[entry.category] = [];
        }
        grouped[entry.category].push(entry);
    });

    return grouped;
}

/**
 * Toggle the Lore Codex visibility
 */
function toggleLoreCodex() {
    if (codexVisible) {
        closeLoreCodex();
    } else {
        openLoreCodex();
    }
}

/**
 * Open the Lore Codex UI
 */
function openLoreCodex() {
    if (codexVisible) return;

    const scene = game.scene.scenes[0];
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;
    const panelWidth = 700;
    const panelHeight = 500;

    codexPanel = {
        elements: []
    };

    // Background overlay
    const overlay = scene.add.rectangle(centerX, centerY, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(500).setInteractive();
    codexPanel.elements.push(overlay);

    // Main panel
    const bg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
        .setScrollFactor(0).setDepth(501).setStrokeStyle(3, 0xffffff);
    codexPanel.elements.push(bg);

    // Title
    const title = scene.add.text(centerX, centerY - panelHeight / 2 + 30, '📜 LORE CODEX', {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(502).setOrigin(0.5, 0.5);
    codexPanel.elements.push(title);

    // Close instruction
    const closeText = scene.add.text(centerX, centerY + panelHeight / 2 - 25, 'Press L or ESC to close', {
        fontSize: '14px',
        fill: '#888888'
    }).setScrollFactor(0).setDepth(502).setOrigin(0.5, 0.5);
    codexPanel.elements.push(closeText);

    // Get lore entries
    const loreByCategory = getLoreByCategory();
    const categories = Object.keys(loreByCategory);
    const totalUnlocked = getCodexUnlockedLore().length;
    const totalEntries = Object.keys(LORE_ENTRIES).length;

    // Progress counter
    const progressText = scene.add.text(centerX, centerY - panelHeight / 2 + 60,
        `Entries Discovered: ${totalUnlocked}/${totalEntries}`, {
        fontSize: '16px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(502).setOrigin(0.5, 0.5);
    codexPanel.elements.push(progressText);

    // Lore list area with scrolling
    const listStartY = centerY - panelHeight / 2 + 100;
    const listPadding = 30;
    const listHeight = panelHeight - 160; // Height of visible scroll area
    const listTop = listStartY;
    const listBottom = listStartY + listHeight;

    // Create scrollable content container
    codexPanel.scrollableItems = [];
    codexPanel.scrollOffset = 0;
    let currentY = 0; // Relative Y position within scroll content

    if (categories.length === 0) {
        // No lore unlocked yet
        const noLoreText = scene.add.text(centerX, centerY,
            'No lore discovered yet.\n\nTalk to NPCs and explore dialog options\nto unlock lore entries!', {
            fontSize: '18px',
            fill: '#888888',
            align: 'center'
        }).setScrollFactor(0).setDepth(502).setOrigin(0.5, 0.5);
        codexPanel.elements.push(noLoreText);
    } else {
        // Show categories and entries as scrollable items
        categories.forEach(category => {
            const catInfo = LORE_CATEGORIES[category] || { color: '#ffffff', icon: '📄' };

            // Category header
            const catHeader = scene.add.text(centerX - panelWidth / 2 + listPadding, listStartY + currentY,
                `${catInfo.icon} ${category}`, {
                fontSize: '18px',
                fill: catInfo.color,
                fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(502).setOrigin(0, 0);
            codexPanel.elements.push(catHeader);
            codexPanel.scrollableItems.push({ element: catHeader, baseY: currentY });
            currentY += 30;

            // Entries in this category
            loreByCategory[category].forEach(entry => {
                const entryText = scene.add.text(centerX - panelWidth / 2 + listPadding + 25, listStartY + currentY,
                    `• ${entry.title}`, {
                    fontSize: '15px',
                    fill: '#cccccc'
                }).setScrollFactor(0).setDepth(502).setOrigin(0, 0);

                // Make entry clickable
                entryText.setInteractive({ useHandCursor: true });
                entryText.on('pointerover', () => entryText.setFill('#ffffff'));
                entryText.on('pointerout', () => entryText.setFill('#cccccc'));
                entryText.on('pointerdown', () => showLoreDetail(entry));

                codexPanel.elements.push(entryText);
                codexPanel.scrollableItems.push({ element: entryText, baseY: currentY });
                currentY += 25;
            });

            currentY += 10; // Space between categories
        });
    }

    // Store scroll boundaries
    codexPanel.contentHeight = currentY;
    codexPanel.listHeight = listHeight;
    codexPanel.listStartY = listStartY;
    codexPanel.listTop = listTop;
    codexPanel.listBottom = listBottom;

    // Create scrollbar (only if content overflows)
    const maxScroll = Math.max(0, codexPanel.contentHeight - codexPanel.listHeight);
    if (maxScroll > 0) {
        const scrollbarX = centerX + panelWidth / 2 - 20;
        const scrollbarHeight = listHeight;
        const thumbHeight = Math.max(30, (listHeight / codexPanel.contentHeight) * listHeight);

        // Scrollbar track
        const scrollTrack = scene.add.rectangle(scrollbarX, listStartY + listHeight / 2, 8, scrollbarHeight, 0x333333)
            .setScrollFactor(0).setDepth(503).setOrigin(0.5, 0.5);
        codexPanel.elements.push(scrollTrack);

        // Scrollbar thumb
        const scrollThumb = scene.add.rectangle(scrollbarX, listStartY + thumbHeight / 2, 8, thumbHeight, 0x666666)
            .setScrollFactor(0).setDepth(504).setOrigin(0.5, 0.5)
            .setInteractive({ useHandCursor: true, draggable: true });
        codexPanel.elements.push(scrollThumb);
        codexPanel.scrollThumb = scrollThumb;
        codexPanel.thumbHeight = thumbHeight;
        codexPanel.scrollbarHeight = scrollbarHeight;

        // Thumb drag handling
        scene.input.setDraggable(scrollThumb);
        scrollThumb.on('drag', (pointer, dragX, dragY) => {
            // Clamp thumb position
            const minY = listStartY + thumbHeight / 2;
            const maxY = listStartY + listHeight - thumbHeight / 2;
            const clampedY = Math.max(minY, Math.min(maxY, dragY));
            scrollThumb.setY(clampedY);

            // Calculate scroll offset from thumb position
            const scrollRatio = (clampedY - minY) / (maxY - minY);
            codexPanel.scrollOffset = scrollRatio * maxScroll;

            // Update content positions
            codexPanel.scrollableItems.forEach(item => {
                const newY = codexPanel.listStartY + item.baseY - codexPanel.scrollOffset;
                item.element.setY(newY);
                const visible = newY >= codexPanel.listTop - 20 && newY <= codexPanel.listBottom + 20;
                item.element.setVisible(visible);
            });
        });

        // Thumb hover effects
        scrollThumb.on('pointerover', () => scrollThumb.setFillStyle(0x888888));
        scrollThumb.on('pointerout', () => scrollThumb.setFillStyle(0x666666));
    }

    // Helper function to update thumb position
    function updateScrollThumb() {
        if (codexPanel.scrollThumb && maxScroll > 0) {
            const scrollRatio = codexPanel.scrollOffset / maxScroll;
            const minY = listStartY + codexPanel.thumbHeight / 2;
            const maxY = listStartY + listHeight - codexPanel.thumbHeight / 2;
            codexPanel.scrollThumb.setY(minY + scrollRatio * (maxY - minY));
        }
    }

    // Mouse wheel scroll handler
    codexPanel.wheelHandler = (pointer, gameObjects, deltaX, deltaY) => {
        if (!codexVisible) return;

        const scrollSpeed = 30;
        codexPanel.scrollOffset += deltaY > 0 ? scrollSpeed : -scrollSpeed;

        // Clamp scroll offset
        codexPanel.scrollOffset = Math.max(0, Math.min(codexPanel.scrollOffset, maxScroll));

        // Update positions of scrollable items
        codexPanel.scrollableItems.forEach(item => {
            const newY = codexPanel.listStartY + item.baseY - codexPanel.scrollOffset;
            item.element.setY(newY);

            // Hide items outside visible area
            const visible = newY >= codexPanel.listTop - 20 && newY <= codexPanel.listBottom + 20;
            item.element.setVisible(visible);
        });

        // Update thumb position
        updateScrollThumb();
    };
    scene.input.on('wheel', codexPanel.wheelHandler);

    // ESC key handler using keyboard event listener
    codexPanel.escHandler = (event) => {
        if (event.keyCode === 27 && codexVisible) { // 27 = ESC
            event.preventDefault();
            event.stopPropagation();
            closeLoreCodex();
        }
    };
    document.addEventListener('keydown', codexPanel.escHandler, true);

    codexVisible = true;
}

/**
 * Close the Lore Codex UI
 */
function closeLoreCodex() {
    if (!codexPanel) return;

    const scene = game.scene.scenes[0];

    codexPanel.elements.forEach(el => el.destroy());

    // Remove ESC handler
    if (codexPanel.escHandler) {
        document.removeEventListener('keydown', codexPanel.escHandler, true);
    }
    // Remove wheel handler
    if (codexPanel.wheelHandler && scene) {
        scene.input.off('wheel', codexPanel.wheelHandler);
    }
    if (codexPanel.detailElements) {
        codexPanel.detailElements.forEach(el => el.destroy());
    }

    codexPanel = null;
    codexVisible = false;
}

/**
 * Show detailed view of a single lore entry
 */
function showLoreDetail(entry) {
    const scene = game.scene.scenes[0];
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;
    const panelWidth = 600;
    const panelHeight = 400;

    // Clear previous detail if any
    if (codexPanel.detailElements) {
        codexPanel.detailElements.forEach(el => el.destroy());
    }
    codexPanel.detailElements = [];

    // Detail background
    const detailBg = scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x252525, 0.98)
        .setScrollFactor(0).setDepth(510).setStrokeStyle(2, 0xffffff);
    codexPanel.detailElements.push(detailBg);

    const catInfo = LORE_CATEGORIES[entry.category] || { color: '#ffffff', icon: '📄' };

    // Entry title
    const titleText = scene.add.text(centerX, centerY - panelHeight / 2 + 40, entry.title, {
        fontSize: '24px',
        fill: catInfo.color,
        fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(511).setOrigin(0.5, 0.5);
    codexPanel.detailElements.push(titleText);

    // Category and source
    const metaText = scene.add.text(centerX, centerY - panelHeight / 2 + 70,
        `${catInfo.icon} ${entry.category} • Learned from ${entry.source}`, {
        fontSize: '14px',
        fill: '#888888'
    }).setScrollFactor(0).setDepth(511).setOrigin(0.5, 0.5);
    codexPanel.detailElements.push(metaText);

    // Content
    const contentText = scene.add.text(centerX, centerY - 20, entry.content, {
        fontSize: '16px',
        fill: '#dddddd',
        wordWrap: { width: panelWidth - 60 },
        align: 'center',
        lineSpacing: 6
    }).setScrollFactor(0).setDepth(511).setOrigin(0.5, 0.5);
    codexPanel.detailElements.push(contentText);

    // Back button
    const backBtn = scene.add.text(centerX, centerY + panelHeight / 2 - 40, '← Back to Codex', {
        fontSize: '16px',
        fill: '#aaaaaa'
    }).setScrollFactor(0).setDepth(511).setOrigin(0.5, 0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setFill('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setFill('#aaaaaa'));
    backBtn.on('pointerdown', () => {
        codexPanel.detailElements.forEach(el => el.destroy());
        codexPanel.detailElements = [];
    });
    codexPanel.detailElements.push(backBtn);
}

/**
 * Setup the codex keybind
 */
function setupLoreCodexKeys(scene) {
    scene.input.keyboard.on('keydown-L', () => {
        // Don't open if dialog is active
        if (typeof dialogVisible !== 'undefined' && dialogVisible) return;
        if (typeof shopVisible !== 'undefined' && shopVisible) return;
        toggleLoreCodex();
    });
}

// Export for global access
window.toggleLoreCodex = toggleLoreCodex;
window.openLoreCodex = openLoreCodex;
window.closeLoreCodex = closeLoreCodex;
window.setupLoreCodexKeys = setupLoreCodexKeys;
window.LORE_ENTRIES = LORE_ENTRIES;

// Auto-initialize when game is ready
let loreCodexInitialized = false;
const loreCodexInitInterval = setInterval(() => {
    if (typeof game !== 'undefined' && game.scene && game.scene.scenes[0] && game.scene.scenes[0].input) {
        if (!loreCodexInitialized) {
            setupLoreCodexKeys(game.scene.scenes[0]);
            loreCodexInitialized = true;
            console.log('📜 Lore Codex L key initialized');
            clearInterval(loreCodexInitInterval);
        }
    }
}, 500);

console.log('📜 LoreCodex.js loaded');
