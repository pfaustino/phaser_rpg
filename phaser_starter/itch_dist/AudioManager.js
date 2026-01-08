/**
 * AudioManager.js
 * Handles background music, sound effects, and volume settings.
 */
window.AudioManager = {
    musicEnabled: true,
    musicVolume: 0.5,
    sfxVolume: 0.7,

    // Tracks
    villageMusic: null,
    wildernessMusic: null,
    dungeonMusic: null,

    init(scene) {
        this.scene = scene;
        // Load settings from localStorage
        this.musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
        this.musicVolume = localStorage.getItem('musicVolume') ? parseFloat(localStorage.getItem('musicVolume')) : 0.5;
        this.sfxVolume = localStorage.getItem('sfxVolume') ? parseFloat(localStorage.getItem('sfxVolume')) : 0.7;

        console.log(`🎵 AudioManager initialized. Music: ${this.musicEnabled}, Vol: ${this.musicVolume}`);
    },

    updateMusicVolume(volume) {
        console.log(`🔊 Updating Music Volume: ${volume.toFixed(2)}`);
        this.musicVolume = volume;
        localStorage.setItem('musicVolume', volume.toString());

        // Update active tracks immediately
        if (this.villageMusic) this.villageMusic.setVolume(volume);
        if (this.wildernessMusic) this.wildernessMusic.setVolume(volume);
        if (this.dungeonMusic) this.dungeonMusic.setVolume(volume);

        // If volume > 0, ensure it's unmuted. 
        if (volume > 0 && !this.musicEnabled) {
            this.toggleMusic(true);
        } else if (volume === 0 && this.musicEnabled) {
            this.toggleMusic(false);
        }
    },

    updateSFXVolume(volume) {
        this.sfxVolume = volume;
        localStorage.setItem('sfxVolume', volume.toString());
    },

    toggleMusic(enabled) {
        console.log(`🎵 Toggling music: ${enabled ? 'ON' : 'OFF'} (Global Volume: ${this.musicVolume})`);

        this.musicEnabled = enabled;
        localStorage.setItem('musicEnabled', enabled.toString());

        // Update specific music tracks
        if (this.villageMusic) {
            if (enabled && !this.villageMusic.isPlaying) {
                console.log('🎵 Resuming Village Music from toggleMusic');
                this.villageMusic.play();
            }
            this.villageMusic.setMute(!enabled);
            this.villageMusic.setVolume(this.musicVolume);
        }

        if (this.wildernessMusic) {
            if (enabled && !this.wildernessMusic.isPlaying) {
                console.log('🎵 Resuming Wilderness Music from toggleMusic');
                this.wildernessMusic.play();
            }
            this.wildernessMusic.setMute(!enabled);
            this.wildernessMusic.setVolume(this.musicVolume);
        }

        if (this.dungeonMusic) {
            if (enabled && !this.dungeonMusic.isPlaying) {
                console.log('🎵 Resuming Dungeon Music from toggleMusic');
                this.dungeonMusic.play();
            }
            this.dungeonMusic.setMute(!enabled);
            this.dungeonMusic.setVolume(this.musicVolume);
        }

        // Refresh current track if enabled but nothing is assigned yet
        if (enabled && typeof MapManager !== 'undefined') {
            this.playBackgroundMusic(MapManager.currentMap);

            if (this.scene && this.scene.sound) {
                console.log('🔊 Ensuring main sound manager is unmuted');
                this.scene.sound.mute = false;
            }
        }
    },

    playBackgroundMusic(mapType) {
        if (!this.musicEnabled) {
            console.log('🎵 Music disabled, skipping playBackgroundMusic');
            return;
        }

        console.log(`🎵 playBackgroundMusic: ${mapType} (Vol: ${this.musicVolume})`);

        // Stop other tracks
        if (this.villageMusic && this.villageMusic.isPlaying && mapType !== 'town') this.villageMusic.stop();
        if (this.wildernessMusic && this.wildernessMusic.isPlaying && mapType !== 'wilderness') this.wildernessMusic.stop();
        if (this.dungeonMusic && this.dungeonMusic.isPlaying && !(['dungeon', 'tower_dungeon', 'temple_ruins'].includes(mapType))) this.dungeonMusic.stop();

        if (!this.scene || !this.scene.sound) {
            console.warn('⚠️ playBackgroundMusic: No scene/sound manager');
            return;
        }

        try {
            if (mapType === 'town') {
                if (!this.villageMusic) {
                    this.villageMusic = this.scene.sound.add('village_music', { loop: true, volume: this.musicVolume });
                    console.log('🎵 Added Village Music instance');
                }
                if (!this.villageMusic.isPlaying) {
                    this.villageMusic.play();
                    console.log('🎵 Playing Village Music');
                }
            } else if (mapType === 'wilderness') {
                if (!this.wildernessMusic) {
                    this.wildernessMusic = this.scene.sound.add('wilderness_music', { loop: true, volume: this.musicVolume });
                    console.log('🎵 Added Wilderness Music instance');
                }
                if (!this.wildernessMusic.isPlaying) {
                    this.wildernessMusic.play();
                    console.log('🎵 Playing Wilderness Music');
                }
            } else if (mapType === 'dungeon' || mapType === 'tower_dungeon' || mapType === 'temple_ruins') {
                if (!this.dungeonMusic) {
                    this.dungeonMusic = this.scene.sound.add('dungeon_music', { loop: true, volume: this.musicVolume });
                    console.log('🎵 Added Dungeon Music instance');
                }
                if (!this.dungeonMusic.isPlaying) {
                    this.dungeonMusic.play();
                    console.log('🎵 Playing Dungeon Music');
                }
            }
        } catch (e) {
            console.error('❌ playBackgroundMusic Error:', e);
        }
    },

    // Helper to play sound effect
    playSound(key) {
        if (!this.scene) return;
        this.scene.sound.play(key, { volume: this.sfxVolume });
    }
};

// Global Aliases for Compatibility
window.updateMusicVolume = (v) => window.AudioManager.updateMusicVolume(v);
window.updateSFXVolume = (v) => window.AudioManager.updateSFXVolume(v);
window.toggleMusic = (e) => window.AudioManager.toggleMusic(e);
window.playBackgroundMusic = (m) => window.AudioManager.playBackgroundMusic(m);
// Map old variables to the manager (using getters/setters if we want to be fancy, or just references)
Object.defineProperty(window, 'musicEnabled', { get: () => window.AudioManager.musicEnabled, set: (v) => window.AudioManager.musicEnabled = v });
Object.defineProperty(window, 'musicVolume', { get: () => window.AudioManager.musicVolume, set: (v) => window.AudioManager.musicVolume = v });
Object.defineProperty(window, 'sfxVolume', { get: () => window.AudioManager.sfxVolume, set: (v) => window.AudioManager.sfxVolume = v });
// Track aliases (read-only mostly)
Object.defineProperty(window, 'villageMusic', { get: () => window.AudioManager.villageMusic, set: (v) => window.AudioManager.villageMusic = v });
Object.defineProperty(window, 'wildernessMusic', { get: () => window.AudioManager.wildernessMusic, set: (v) => window.AudioManager.wildernessMusic = v });
Object.defineProperty(window, 'dungeonMusic', { get: () => window.AudioManager.dungeonMusic, set: (v) => window.AudioManager.dungeonMusic = v });
