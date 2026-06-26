/**
 * DevToolsUI.js — In-game developer tools panel (lower-right DEV button).
 */
window.DevToolsUI = {
    panelOpen: false,
    godMode: false,
    root: null,
    panel: null,
    toggleBtn: null,
    questSelect: null,

    init() {
        if (this.root) return;

        const style = document.createElement('style');
        style.textContent = `
            #dev-tools-root { position: fixed; z-index: 100050; font-family: Arial, sans-serif; pointer-events: none; }
            #dev-tools-toggle {
                position: fixed; right: 12px; bottom: 12px;
                padding: 6px 12px; font-size: 12px; font-weight: bold;
                background: #2a1a3a; color: #c9a0ff; border: 1px solid #7b5ea7;
                border-radius: 4px; cursor: pointer; pointer-events: auto;
                opacity: 0.85; letter-spacing: 0.05em;
            }
            #dev-tools-toggle:hover { opacity: 1; background: #3d2850; }
            #dev-tools-panel {
                position: fixed; right: 12px; bottom: 48px;
                width: 320px; max-height: min(70vh, 520px);
                background: rgba(18, 18, 28, 0.97); color: #e8e8e8;
                border: 2px solid #5a8fd4; border-radius: 6px;
                padding: 12px 14px 14px; overflow-y: auto;
                pointer-events: auto; display: none;
                box-shadow: 0 8px 32px rgba(0,0,0,0.55);
            }
            #dev-tools-panel.open { display: block; }
            #dev-tools-panel h3 {
                margin: 0 0 10px; font-size: 15px; color: #ffd700;
                display: flex; justify-content: space-between; align-items: center;
            }
            #dev-tools-panel .dev-section { margin-bottom: 12px; }
            #dev-tools-panel label { display: block; font-size: 12px; color: #aaa; margin-bottom: 4px; }
            #dev-tools-quest-select {
                width: 100%; box-sizing: border-box; padding: 6px 8px;
                background: #1a2433; color: #fff; border: 1px solid #444; border-radius: 4px;
                font-size: 12px; margin-bottom: 6px;
            }
            #dev-tools-panel .dev-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
            #dev-tools-panel button.dev-btn {
                flex: 1; min-width: 88px; padding: 7px 8px; font-size: 11px;
                background: #2a3344; color: #e0e0e0; border: 1px solid #556;
                border-radius: 4px; cursor: pointer;
            }
            #dev-tools-panel button.dev-btn:hover { background: #3a4558; }
            #dev-tools-panel button.dev-btn.primary { background: #1e4a2e; border-color: #3a8; color: #b8ffc8; }
            #dev-tools-panel button.dev-btn.danger { background: #4a1e1e; border-color: #a44; color: #ffb8b8; }
            #dev-tools-panel button.dev-btn.active { background: #4a3a10; border-color: #ffd700; color: #ffd700; }
            #dev-tools-close {
                background: none; border: none; color: #888; font-size: 18px;
                cursor: pointer; padding: 0 4px; line-height: 1;
            }
            #dev-tools-close:hover { color: #fff; }
            #dev-tools-status { font-size: 11px; color: #88ccff; min-height: 16px; margin-top: 8px; }
        `;
        document.head.appendChild(style);

        this.root = document.createElement('div');
        this.root.id = 'dev-tools-root';

        this.toggleBtn = document.createElement('button');
        this.toggleBtn.id = 'dev-tools-toggle';
        this.toggleBtn.type = 'button';
        this.toggleBtn.textContent = 'DEV';
        this.toggleBtn.title = 'Developer tools';
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });

        this.panel = document.createElement('div');
        this.panel.id = 'dev-tools-panel';
        this.panel.innerHTML = `
            <h3>Dev Tools <button type="button" id="dev-tools-close" title="Close">×</button></h3>
            <div class="dev-section">
                <label for="dev-tools-quest-select">Quest</label>
                <select id="dev-tools-quest-select"><option value="">— select quest —</option></select>
                <div class="dev-row">
                    <button type="button" class="dev-btn primary" data-action="quest-accept">Accept / Enable</button>
                    <button type="button" class="dev-btn" data-action="quest-complete">Complete</button>
                    <button type="button" class="dev-btn" data-action="quest-goto">Jump To</button>
                </div>
            </div>
            <div class="dev-section">
                <label>Player &amp; World</label>
                <div class="dev-row">
                    <button type="button" class="dev-btn" data-action="god-mode">God Mode: OFF</button>
                    <button type="button" class="dev-btn" data-action="gold">+1000 Gold</button>
                </div>
                <div class="dev-row">
                    <button type="button" class="dev-btn danger" data-action="kill-all">Kill All Monsters</button>
                    <button type="button" class="dev-btn" data-action="heal">Full Heal</button>
                </div>
                <div class="dev-row">
                    <button type="button" class="dev-btn" data-action="level-up">Level Up</button>
                    <button type="button" class="dev-btn danger" data-action="quest-reset">Reset All Quests</button>
                </div>
            </div>
            <div id="dev-tools-status"></div>
        `;

        this.root.appendChild(this.toggleBtn);
        this.root.appendChild(this.panel);
        document.body.appendChild(this.root);

        this.questSelect = this.panel.querySelector('#dev-tools-quest-select');
        this.panel.querySelector('#dev-tools-close').addEventListener('click', () => this.closePanel());
        this.panel.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action, btn));
        });

        this.populateQuestSelect();
        debugLog('🛠️ DevToolsUI initialized');
    },

    togglePanel() {
        if (this.panelOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    },

    openPanel() {
        this.populateQuestSelect();
        this.panel.classList.add('open');
        this.panelOpen = true;
        this.syncGodModeButton();
    },

    closePanel() {
        this.panel.classList.remove('open');
        this.panelOpen = false;
    },

    setStatus(msg, isError) {
        const el = this.panel && this.panel.querySelector('#dev-tools-status');
        if (el) {
            el.textContent = msg || '';
            el.style.color = isError ? '#ff8888' : '#88ccff';
        }
    },

    getSelectedQuestId() {
        return this.questSelect ? this.questSelect.value : '';
    },

    populateQuestSelect() {
        if (!this.questSelect || !window.uqe || !window.uqe.allDefinitions) return;

        const current = this.questSelect.value;
        const entries = Object.keys(window.uqe.allDefinitions)
            .map((id) => ({ id, title: window.uqe.allDefinitions[id].title || id }))
            .sort((a, b) => {
                const aMain = a.id.startsWith('main_') ? 0 : 1;
                const bMain = b.id.startsWith('main_') ? 0 : 1;
                if (aMain !== bMain) return aMain - bMain;
                return a.id.localeCompare(b.id);
            });

        this.questSelect.innerHTML = '<option value="">— select quest —</option>';
        entries.forEach(({ id, title }) => {
            const opt = document.createElement('option');
            opt.value = id;
            const active = window.uqe.activeQuests.some((q) => q.id === id);
            const done = window.uqe.completedQuests.some((q) => q.id === id);
            const tag = done ? '✓ ' : active ? '● ' : '';
            opt.textContent = `${tag}${id} — ${title}`;
            this.questSelect.appendChild(opt);
        });

        if (current && window.uqe.allDefinitions[current]) {
            this.questSelect.value = current;
        }
    },

    syncGodModeButton() {
        const btn = this.panel && this.panel.querySelector('[data-action="god-mode"]');
        if (!btn) return;
        btn.textContent = this.godMode ? 'God Mode: ON' : 'God Mode: OFF';
        btn.classList.toggle('active', this.godMode);
    },

    handleAction(action, btn) {
        if (typeof playSound === 'function') playSound('menu_select');

        switch (action) {
            case 'quest-accept':
                this.questAccept();
                break;
            case 'quest-complete':
                this.questComplete();
                break;
            case 'quest-goto':
                this.questGoto();
                break;
            case 'god-mode':
                this.toggleGodMode(btn);
                break;
            case 'gold':
                this.addGold(1000);
                break;
            case 'kill-all':
                this.killAllMonsters();
                break;
            case 'heal':
                this.fullHeal();
                break;
            case 'level-up':
                this.levelUp();
                break;
            case 'quest-reset':
                this.resetQuests();
                break;
            default:
                break;
        }
    },

    questAccept() {
        const id = this.getSelectedQuestId();
        if (!id) {
            this.setStatus('Select a quest first.', true);
            return;
        }
        if (window.debugQuest && window.debugQuest.accept(id)) {
            this.setStatus(`Accepted: ${id}`);
            this.populateQuestSelect();
            if (typeof addChatMessage === 'function') {
                addChatMessage(`Dev: enabled quest ${id}`, 0xc9a0ff, '🛠️');
            }
        } else {
            this.setStatus(`Could not accept ${id}`, true);
        }
    },

    questComplete() {
        const id = this.getSelectedQuestId();
        if (!id) {
            this.setStatus('Select a quest first.', true);
            return;
        }
        if (!window.uqe.activeQuests.some((q) => q.id === id)) {
            window.debugQuest.accept(id);
        }
        if (window.debugQuest && window.debugQuest.complete(id)) {
            this.setStatus(`Completed: ${id}`);
            this.populateQuestSelect();
            if (typeof addChatMessage === 'function') {
                addChatMessage(`Dev: completed quest ${id}`, 0xc9a0ff, '🛠️');
            }
        } else {
            this.setStatus(`Could not complete ${id}`, true);
        }
    },

    questGoto() {
        const id = this.getSelectedQuestId();
        if (!id) {
            this.setStatus('Select a quest first.', true);
            return;
        }
        if (!confirm(`Jump to quest "${id}"? This resets quest progress and completes prerequisites.`)) {
            return;
        }
        if (window.debugQuest && window.debugQuest.goto(id)) {
            this.setStatus(`Jumped to: ${id}`);
            this.populateQuestSelect();
            if (typeof addChatMessage === 'function') {
                addChatMessage(`Dev: jumped to quest ${id}`, 0xc9a0ff, '🛠️');
            }
        } else {
            this.setStatus(`Could not jump to ${id}`, true);
        }
    },

    resetQuests() {
        if (!confirm('Reset ALL quest progress?')) return;
        if (window.debugQuest && window.debugQuest.reset()) {
            this.setStatus('All quests reset.');
            this.populateQuestSelect();
            if (typeof addChatMessage === 'function') {
                addChatMessage('Dev: all quests reset', 0xff8888, '🛠️');
            }
        }
    },

    toggleGodMode(btn) {
        this.godMode = !this.godMode;
        if (window.playerStats) {
            window.playerStats.isInvulnerable = this.godMode;
            if (this.godMode) {
                this.fullHeal(false);
            }
        }
        this.syncGodModeButton();
        const label = this.godMode ? 'ON' : 'OFF';
        this.setStatus(`God mode ${label}`);
        if (typeof addChatMessage === 'function') {
            addChatMessage(`God mode ${label}`, this.godMode ? 0xffd700 : 0xaaaaaa, '🛡️');
        }
    },

    addGold(amount) {
        if (!window.playerStats) return;
        window.playerStats.gold = (window.playerStats.gold || 0) + amount;
        if (typeof goldText !== 'undefined' && goldText.setText) {
            goldText.setText(`Gold: ${window.playerStats.gold}`);
        }
        if (typeof updateUI === 'function') updateUI();
        this.setStatus(`Added ${amount} gold (total: ${window.playerStats.gold})`);
        if (typeof addChatMessage === 'function') {
            addChatMessage(`Dev: +${amount} gold`, 0xffd700, '💰');
        }
    },

    killAllMonsters() {
        const list = [...(window.monsters || [])];
        let count = 0;
        list.forEach((monster) => {
            if (!monster || !monster.active || monster.isDead) return;
            monster.hp = 0;
            if (typeof handleMonsterDeath === 'function') {
                handleMonsterDeath(monster);
            } else if (monster.destroy) {
                monster.destroy();
            }
            count++;
        });
        this.setStatus(`Killed ${count} monster(s).`);
        if (typeof addChatMessage === 'function') {
            addChatMessage(`Dev: killed ${count} monsters`, 0xff6666, '💀');
        }
    },

    fullHeal(showStatus = true) {
        const ps = window.playerStats;
        if (!ps) return;
        ps.hp = ps.maxHp;
        ps.mana = ps.maxMana;
        ps.stamina = ps.maxStamina;
        if (typeof updatePlayerStatsUI === 'function') updatePlayerStatsUI();
        if (typeof updateAbilityBar === 'function') updateAbilityBar();
        if (showStatus) {
            this.setStatus('Fully healed.');
            if (typeof addChatMessage === 'function') {
                addChatMessage('Dev: full heal', 0x88ff88, '❤️');
            }
        }
    },

    levelUp() {
        if (typeof window.cheatLevelUp === 'function') {
            window.cheatLevelUp();
            this.setStatus('Level up triggered.');
            if (typeof addChatMessage === 'function') {
                addChatMessage('Dev: level up', 0x88ccff, '⬆️');
            }
        } else {
            this.setStatus('Level up cheat not available.', true);
        }
    }
};
