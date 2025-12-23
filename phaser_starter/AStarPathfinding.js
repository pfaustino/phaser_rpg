/**
 * AStarPathfinding.js
 * A* pathfinding implementation for dungeon monster navigation
 */

class AStarPathfinding {
    constructor(tileSize = 32) {
        this.tileSize = tileSize;
        this.grid = null;
        this.gridWidth = 0;
        this.gridHeight = 0;
    }

    /**
     * Initialize the pathfinding grid directly from map data
     * @param {Array<Array<number>>} mapData - Grid where 0 is wall, 1 is floor
     */
    initializeGrid(mapData) {
        if (!mapData || mapData.length === 0) return;

        this.gridHeight = mapData.length;
        this.gridWidth = mapData[0].length;
        this.grid = [];

        for (let y = 0; y < this.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                // In mapData: 1 = floor (walkable), 0 = wall (blocked)
                const tile = mapData[y][x];
                this.grid[y][x] = (tile === 1);
            }
        }

        console.log(`🗺️ A* Grid initialized from map data: ${this.gridWidth}x${this.gridHeight}`);
    }

    /**
     * Convert pixel coordinates to grid coordinates
     */
    pixelToGrid(px, py) {
        return {
            x: Math.floor(px / this.tileSize),
            y: Math.floor(py / this.tileSize)
        };
    }

    /**
     * Convert grid coordinates to pixel coordinates (center of tile)
     */
    gridToPixel(gx, gy) {
        return {
            x: gx * this.tileSize + this.tileSize / 2,
            y: gy * this.tileSize + this.tileSize / 2
        };
    }

    /**
     * Check if a grid position is walkable
     */
    isWalkable(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
            return false;
        }
        return this.grid[y][x];
    }

    /**
     * Get Manhattan distance heuristic
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Find path using A* algorithm
     * @param {number} startX - Start X in pixels
     * @param {number} startY - Start Y in pixels
     * @param {number} endX - End X in pixels
     * @param {number} endY - End Y in pixels
     * @returns {Array} Array of {x, y} waypoints in pixels, or empty if no path
     */
    findPath(startX, startY, endX, endY) {
        if (!this.grid) return [];

        const start = this.pixelToGrid(startX, startY);
        const end = this.pixelToGrid(endX, endY);

        // If start or end is not walkable, return empty
        if (!this.isWalkable(start.x, start.y) || !this.isWalkable(end.x, end.y)) {
            return [];
        }

        // If same tile, return direct path
        if (start.x === end.x && start.y === end.y) {
            return [{ x: endX, y: endY }];
        }

        // A* implementation
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const nodeKey = (x, y) => `${x},${y}`;

        openSet.push(start);
        gScore.set(nodeKey(start.x, start.y), 0);
        fScore.set(nodeKey(start.x, start.y), this.heuristic(start, end));

        // 8-directional movement (including diagonals)
        const neighbors = [
            { dx: 0, dy: -1, cost: 1 },   // N
            { dx: 1, dy: -1, cost: 1.4 }, // NE
            { dx: 1, dy: 0, cost: 1 },    // E
            { dx: 1, dy: 1, cost: 1.4 },  // SE
            { dx: 0, dy: 1, cost: 1 },    // S
            { dx: -1, dy: 1, cost: 1.4 }, // SW
            { dx: -1, dy: 0, cost: 1 },   // W
            { dx: -1, dy: -1, cost: 1.4 } // NW
        ];

        let iterations = 0;
        const maxIterations = 1000; // Prevent infinite loops

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;

            // Get node with lowest fScore
            openSet.sort((a, b) => {
                const fa = fScore.get(nodeKey(a.x, a.y)) || Infinity;
                const fb = fScore.get(nodeKey(b.x, b.y)) || Infinity;
                return fa - fb;
            });

            const current = openSet.shift();
            const currentKey = nodeKey(current.x, current.y);

            // Check if we reached the goal
            if (current.x === end.x && current.y === end.y) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node) {
                    const pixel = this.gridToPixel(node.x, node.y);
                    path.unshift(pixel);
                    node = cameFrom.get(nodeKey(node.x, node.y));
                }
                // Simplify path - remove intermediate waypoints on straight lines
                return this.simplifyPath(path);
            }

            closedSet.add(currentKey);

            // Check all neighbors
            for (const neighbor of neighbors) {
                const nx = current.x + neighbor.dx;
                const ny = current.y + neighbor.dy;
                const nKey = nodeKey(nx, ny);

                // Skip if in closed set or not walkable
                if (closedSet.has(nKey) || !this.isWalkable(nx, ny)) {
                    continue;
                }

                // For diagonal movement, ensure we can actually pass through
                if (neighbor.dx !== 0 && neighbor.dy !== 0) {
                    if (!this.isWalkable(current.x + neighbor.dx, current.y) ||
                        !this.isWalkable(current.x, current.y + neighbor.dy)) {
                        continue; // Can't cut corners
                    }
                }

                const tentativeG = (gScore.get(currentKey) || 0) + neighbor.cost;
                const existingG = gScore.get(nKey);

                if (existingG === undefined || tentativeG < existingG) {
                    // This path is better
                    cameFrom.set(nKey, current);
                    gScore.set(nKey, tentativeG);
                    fScore.set(nKey, tentativeG + this.heuristic({ x: nx, y: ny }, end));

                    if (!openSet.find(n => n.x === nx && n.y === ny)) {
                        openSet.push({ x: nx, y: ny });
                    }
                }
            }
        }

        // No path found
        return [];
    }

    /**
     * Simplify path by removing intermediate points on straight lines
     */
    simplifyPath(path) {
        if (path.length <= 2) return path;

        const simplified = [path[0]];

        for (let i = 1; i < path.length - 1; i++) {
            const prev = simplified[simplified.length - 1];
            const curr = path[i];
            const next = path[i + 1];

            // Check if direction changes
            const dx1 = Math.sign(curr.x - prev.x);
            const dy1 = Math.sign(curr.y - prev.y);
            const dx2 = Math.sign(next.x - curr.x);
            const dy2 = Math.sign(next.y - curr.y);

            if (dx1 !== dx2 || dy1 !== dy2) {
                simplified.push(curr);
            }
        }

        simplified.push(path[path.length - 1]);
        return simplified;
    }
}

// Export globally
window.AStarPathfinding = AStarPathfinding;
