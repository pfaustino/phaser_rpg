/**
 * LoreCodex.js - UI for the Lore Codex
 */

const LORE_ENTRIES = {
    // CHAPTER 1 - THE AWAKENING
    'lore_ch1_intro': {
        title: "The Awakening",
        category: "Main Story",
        text: "The world feels different today. The air hums with a strange energy, and the ground beneath Hearthwell trembles intermittently. Elder Malik has summoned all capable villagers.",
        source: 'Game Start'
    },
    'lore_ch1_hearthwell': {
        title: "Hearthwell Village",
        category: "Places",
        text: "Founded three centuries ago near the Mana Springs. It has always been a sanctuary, but recent tremors threaten its foundations. The villagers are resilient, but fear is growing.",
        source: 'Game Start'
    },
    'lore_ch1_echo_corruption': {
        title: "Echo Corruption",
        category: "Bestiary",
        text: "The local wildlife is being twisted by a crystalline substance. 'Echo Mites' are the first sign—small, aggressive, and feeding on mana. They are not natural.",
        source: 'Quest: First Investigation'
    },
    'lore_tremors': {
        title: "The Tremors",
        category: "History",
        text: "It started as a subtle vibration in the ground, barely noticeable. Over weeks, it grew into violent shakes that cracked foundations and toppled statues. The elders speak of the 'World Heart' beating in distress.",
        source: 'Elder Malik'
    },
    'lore_origin': {
        title: "Origin of the Town",
        category: "History",
        text: "Our town, Hearthwell, was founded three centuries ago by refugees fleeing the 'Shadow Blight'. They chose this valley for its natural mana springs, which were believed to ward off darkness.",
        source: 'Elder Malik'
    },
    'lore_creatures': {
        title: "Creatures of the Wild",
        category: "Monsters",
        text: "The local wildlife has become aggressive. Wolves with glowing red eyes, bears with stone-like hide... Corrupting energy is seeping into everything.",
        source: 'Observation'
    }
};

let codexVisible = false;
let codexPanel = null;
let loreListContainer = null;
let detailContainer = null;
let updateEvent = null;

function openLoreCodex(scene) {
    if (codexVisible) return;
    console.log("📖 Opening Lore Codex...");
    codexVisible = true;

    // Dimensions
    const width = 800;
    const height = 600;

    // Initial Camera Pos
    const cam = scene.cameras.main;
    const x = cam.scrollX + (cam.width - width) / 2;
    const y = cam.scrollY + (cam.height - height) / 2;

    // Create Main Container (No ScrollFactor)
    codexPanel = scene.add.container(x, y).setDepth(2000);

    const bg = scene.add.rectangle(0, 0, width, height, 0x1a1a1a).setOrigin(0);
    const border = scene.add.rectangle(0, 0, width, height, 0x1a1a1a).setStrokeStyle(4, 0x4a4a4a).setOrigin(0);
    codexPanel.add([bg, border]);

    // Header
    const title = scene.add.text(width / 2, 40, "LORE CODEX", {
        fontFamily: 'Arial', fontSize: '32px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);
    codexPanel.add(title);

    // Close Button
    const closeBtn = scene.add.text(width - 40, 40, "X", { fontSize: '24px', color: '#ff0000' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => closeLoreCodex(scene));
    codexPanel.add(closeBtn);

    // Layout
    const listX = 40;
    const listY = 100;
    const listW = 300;
    const listH = 460;

    const detailX = 360;
    const detailY = 100;
    const detailW = 400;
    const detailH = 460;

    // Backgrounds
    const listBg = scene.add.rectangle(listX, listY, listW, listH, 0x000000, 0.5).setOrigin(0);
    const detailBg = scene.add.rectangle(detailX, detailY, detailW, detailH, 0x000000, 0.5).setOrigin(0);
    codexPanel.add([listBg, detailBg]);

    // Content Containers
    loreListContainer = scene.add.container(listX, listY);
    detailContainer = scene.add.container(detailX, detailY);

    // Masks (Detached from panel to avoid offset issues)
    const listMaskData = scene.make.graphics();
    listMaskData.fillRect(0, 0, listW, listH);
    const listMask = listMaskData.createGeometryMask();

    const detailMaskData = scene.make.graphics();
    detailMaskData.fillRect(0, 0, detailW, detailH);
    const detailMask = detailMaskData.createGeometryMask();

    loreListContainer.setMask(listMask);
    detailContainer.setMask(detailMask);

    codexPanel.add([loreListContainer, detailContainer]);

    // Store Offsets/Refs for Update
    codexPanel.dataVals = {
        offsetX: (cam.width - width) / 2,
        offsetY: (cam.height - height) / 2,
        listX: listX,
        listY: listY,
        detailX: detailX,
        detailY: detailY,
        listW: listW,
        listH: listH,
        listMaskData: listMaskData,
        detailMaskData: detailMaskData,
        scrollbar: null
    };

    // Populate
    populateLoreList(scene, listW);

    // Initial Prompt
    const prompt = scene.add.text(detailW / 2, detailH / 2, "Select an entry to read", { color: '#888' }).setOrigin(0.5);
    detailContainer.add(prompt);

    // Start Update Loop
    updateEvent = () => updateCodexPosition(scene);
    scene.events.on('update', updateEvent);
    updateCodexPosition(scene); // First tick
}

function updateCodexPosition(scene) {
    if (!codexPanel || !codexPanel.active) return;

    const cam = scene.cameras.main;
    const d = codexPanel.dataVals;

    const panelX = cam.scrollX + d.offsetX;
    const panelY = cam.scrollY + d.offsetY;

    // Move Panel
    codexPanel.setPosition(panelX, panelY);

    // Move Masks (Absolute World Coords)
    if (d.listMaskData) {
        d.listMaskData.x = panelX + d.listX;
        d.listMaskData.y = panelY + d.listY;
    }
    if (d.detailMaskData) {
        d.detailMaskData.x = panelX + d.detailX;
        d.detailMaskData.y = panelY + d.detailY;
    }

    // Move Scrollbar (Absolute World Coords)
    // We assume scrollbar parts are in the Scene, not the Container
    if (d.scrollbar) {
        const sb = d.scrollbar;
        // The scrollbar was created at an initial X,Y.
        // We need to keep it relative to the panel.
        // ScrollbarUtils usually creates track/thumb at absolute X,Y.

        // Let's create proper offsets if we haven't
        if (!sb.offsetX) {
            sb.offsetX = sb.track.x - (panelX - cam.scrollX); // relative to screen
            sb.offsetY = sb.track.y - (panelY - cam.scrollY);
        }

        // Update Scrollbar Track position
        // Actually, easiest is just: maskX + offset
        // The scrollbar starts at maskX + width + 10

        const sbX = panelX + d.listX + d.listW + 10;
        const sbY = panelY + d.listY + (d.listH / 2); // ScrollbarUtils centers track

        if (sb.track) {
            sb.track.x = sbX;
            sb.track.y = sbY;
        }

        // Thumb follows track but has its own Y offset based on scrolling
        if (sb.thumb) {
            sb.thumb.x = sbX;
            // Thumb Y is managed by the scrollbar logic itself usually
            // But if the whole world moves, thumb.y must move too.
            // ScrollbarUtils updates thumb.y during drag/scroll.
            // We need to apply the DELTA of camera movement to thumb.y

            // Or easier: rebuild scrollbar? No, performance.
            // Let's rely on the fact that if we move the TRACK, maybe we should move thumb too.
            // But ScrollbarUtils stores state.

            // CRITICAL: ScrollbarUtils as written is static.
            // We need to shift the thumb by the same delta as the camera move.
            // panelX changes.

            // Let's calculate delta for this frame? Hard without prev state.
            // Let's force thumb to maintain relative position to track.

            const relativeThumbY = sb.thumb.y - (sb.track.y - (sb.viewportHeight / 2));
            // Wait, this is getting complex.
            // If ScrollbarUtils uses setScrollFactor(0), it handles this auto.
            // But we turned off scroll factor.

            // SIMPLER FIX:
            // Just update the scrollbar's internal mask/container refs? No.

            // Let's just destroy and recreate scrollbar if camera moves? excessive.

            // OK, let's just shift thumb by the difference in panelY from last frame?
            if (d.lastPanelY !== undefined) {
                const dy = panelY - d.lastPanelY;
                sb.thumb.y += dy;
            }
        }
    }

    d.lastPanelX = panelX;
    d.lastPanelY = panelY;
}

function closeLoreCodex(scene) {
    if (!codexVisible) return;
    codexVisible = false;

    if (updateEvent) {
        scene.events.off('update', updateEvent);
        updateEvent = null;
    }

    if (codexPanel) {
        const d = codexPanel.dataVals;
        if (d) {
            if (d.scrollbar) d.scrollbar.destroy();
            if (d.listMaskData) d.listMaskData.destroy();
            if (d.detailMaskData) d.detailMaskData.destroy();
        }

        codexPanel.destroy();
        codexPanel = null;
    }
}

function populateLoreList(scene, width) {
    if (!loreListContainer) return;
    loreListContainer.removeAll(true);

    let unlockedIds = new Set();
    if (scene.loreManager && scene.loreManager.unlockedLore) {
        unlockedIds = scene.loreManager.unlockedLore;
    } else {
        const saved = localStorage.getItem('rpg_lore_unlocked');
        if (saved) JSON.parse(saved).forEach(id => unlockedIds.add(id));
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('lore_read_')) {
                const ids = JSON.parse(localStorage.getItem(key));
                if (Array.isArray(ids)) ids.forEach(id => unlockedIds.add(id));
            }
        });
    }

    const startY = 10;
    let currentY = startY;
    const entries = [];
    unlockedIds.forEach(id => {
        if (LORE_ENTRIES[id]) entries.push({ id, ...LORE_ENTRIES[id] });
    });
    entries.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.title.localeCompare(b.title);
    });

    let currentCategory = null;
    entries.forEach(entry => {
        if (entry.category !== currentCategory) {
            currentCategory = entry.category;
            const catText = scene.add.text(10, currentY, currentCategory.toUpperCase(), {
                fontSize: '14px', color: '#888888', fontStyle: 'bold'
            });
            loreListContainer.add(catText);
            currentY += 25;
        }
        const btn = scene.add.container(10, currentY);
        const bg = scene.add.rectangle(0, 0, width - 30, 30, 0x333333).setOrigin(0).setInteractive({ useHandCursor: true });
        const text = scene.add.text(10, 7, entry.title, { fontSize: '16px', color: '#ffffff' });
        bg.on('pointerover', () => bg.setFillStyle(0x444444));
        bg.on('pointerout', () => bg.setFillStyle(0x333333));
        bg.on('pointerdown', () => showLoreDetail(scene, entry));
        btn.add([bg, text]);
        loreListContainer.add(btn);
        currentY += 35;
    });

    // Scrollbar Setup
    const contentHeight = currentY;
    const viewHeight = 460;
    const d = codexPanel.dataVals;

    if (window.setupScrollbar && contentHeight > viewHeight) {
        if (d.scrollbar) d.scrollbar.destroy();

        const cam = scene.cameras.main;
        // Initial Scrollbar Position (matches current Panel position)
        const panelX = cam.scrollX + d.offsetX;
        const panelY = cam.scrollY + d.offsetY;

        d.scrollbar = window.setupScrollbar(
            scene,
            loreListContainer,
            d.listW,
            d.listH,
            contentHeight,
            panelX + d.listX,
            panelY + d.listY
        );
    }
}

function showLoreDetail(scene, entry) {
    if (!detailContainer) return;
    detailContainer.removeAll(true);
    const width = 400;
    const title = scene.add.text(20, 20, entry.title, {
        fontSize: '24px', color: '#ffd700', fontStyle: 'bold', wordWrap: { width: width - 40 }
    });
    const category = scene.add.text(20, title.y + title.height + 10, `${entry.category} • ${entry.source || 'Unknown'}`, {
        fontSize: '14px', color: '#888888'
    });
    const text = scene.add.text(20, category.y + category.height + 20, entry.text, {
        fontSize: '18px', color: '#e0e0e0', wordWrap: { width: width - 40 }, lineHeight: 28
    });
    detailContainer.add([title, category, text]);
}

function setupLoreCodexKeys(scene) {
    if (!scene || !scene.input) return;
    if (window.loreKeyHandler) scene.input.keyboard.off('keydown-L', window.loreKeyHandler);
    window.loreKeyHandler = () => {
        if (codexVisible) closeLoreCodex(scene);
        else openLoreCodex(scene);
    };
    scene.input.keyboard.on('keydown-L', window.loreKeyHandler);
    console.log('📖 Lore Codex keys initialized');
}

window.setupLoreCodexKeys = setupLoreCodexKeys;
window.LORE_ENTRIES = LORE_ENTRIES;
