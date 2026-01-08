/**
 * PlayerStats.js
 * Handles calculation and management of player statistics.
 */

window.PlayerStatsManager = {
    /**
     * Recalculate player stats based on base stats + equipment + level
     */
    recalculateStats() {
        if (typeof playerStats === 'undefined' || !playerStats) return;

        // Base Stats
        // specific to class or default
        const baseStats = {
            maxHp: 100 + ((playerStats.level || 1) * 10),
            maxMana: 50 + ((playerStats.level || 1) * 5),
            baseAttack: 10 + ((playerStats.level || 1) * 2),
            baseDefense: 0 + ((playerStats.level || 1) * 1),
            speed: 200 // Default base speed
        };

        // Reset to base (preserve current HP/Mana values, just update caps)
        playerStats.maxHp = baseStats.maxHp;
        playerStats.maxMana = baseStats.maxMana;
        playerStats.baseAttack = baseStats.baseAttack;
        playerStats.baseDefense = baseStats.baseDefense;
        playerStats.speed = baseStats.speed;
        playerStats.speedBonus = 0;

        // Apply Equipment Bonuses
        if (playerStats.equipment) {
            Object.values(playerStats.equipment).forEach(item => {
                if (!item) return;

                // Add stats
                if (item.maxHp) playerStats.maxHp += item.maxHp;
                // if (item.maxMana) playerStats.maxMana += item.maxMana; 
                if (item.attackPower) playerStats.baseAttack += item.attackPower;
                if (item.defense) playerStats.baseDefense += item.defense;

                // Speed
                if (item.speed) {
                    playerStats.speed += item.speed;
                    playerStats.speedBonus += item.speed;
                }
            });
        }

        // Apply active buffs/potions? (Not implemented yet, but placeholder)

        // Sanity Checks
        playerStats.speed = Math.max(100, playerStats.speed);

        console.log(`📊 Stats Recalculated: Speed=${playerStats.speed} (Base: 200 + Bonus: ${playerStats.speedBonus})`);
    }
};

// Global Alias for backward compatibility if needed, though strictly we should use the manager
window.recalculatePlayerStats = () => window.PlayerStatsManager.recalculateStats();
