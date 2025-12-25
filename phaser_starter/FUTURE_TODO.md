# Future To-Do List

## Inventory Enhancements

### Category Tabs for Inventory UI
Enhance the existing Inventory UI in `game.js` by adding tabs to improve item management.

**Goal**: Add tabs for **All**, **Weapons**, **Armor**, and **Consumables**.

**Implementation Plan**:
1.  **Modify `game.js`**:
    *   Add global state: `let inventoryTab = 'all';`
    *   **Update `createInventoryUI`**:
        *   Add tab buttons (All, Weapons, Armor, Consumables) at the top of the panel.
        *   Implement styles similar to `createQuestLogUI`.
    *   **Update `updateInventoryItems`**:
        *   Add filtering logic based on `inventoryTab`.
        *   Example logic:
            ```javascript
            let filteredItems = playerStats.inventory;
            if (inventoryTab === 'weapons') {
                filteredItems = playerStats.inventory.filter(i => i.type === 'weapon');
            } else if (inventoryTab === 'armor') {
                 filteredItems = playerStats.inventory.filter(i => 
                    ['armor', 'helmet', 'boots', 'gloves', 'belt', 'ring', 'amulet'].includes(i.type)
                );
            } else if (inventoryTab === 'consumables') {
                filteredItems = playerStats.inventory.filter(i => i.type === 'consumable');
            }
            ```
        *   Update empty state messages to be context-aware.

**Verification**:
*   Verify filtered views work correctly.
*   Ensure tooltips and item interactions function on filtered lists.
