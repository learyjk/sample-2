import { Engine, Vector, Actor } from 'excalibur';
import { Obstacle } from '@/Actors/Obstacle';
import { GameConfig } from '@/config';

/**
 * Grid node for pathfinding
 */
interface GridNode {
  x: number;
  y: number;
  walkable: boolean;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost (g + h)
  parent: GridNode | null;
}

/**
 * Pathfinding configuration
 */
interface PathfindingConfig {
  cellSize: number; // Size of each grid cell in pixels
  obstaclePadding: number; // Extra padding around obstacles for safety
}

/**
 * Default pathfinding configuration
 */
const DEFAULT_CONFIG: PathfindingConfig = {
  cellSize: 16, // 16x16 pixel cells (20x20 grid for 320x320 game)
  obstaclePadding: 8, // 8 pixels padding around obstacles
};

/**
 * Cached path entry
 */
interface CachedPath {
  start: Vector;
  goal: Vector;
  path: Vector[];
  timestamp: number;
}

/**
 * A* Pathfinding system for enemy navigation
 */
export class Pathfinding {
  private static grid: boolean[][] | null = null;
  private static gridWidth: number = 0;
  private static gridHeight: number = 0;
  private static config: PathfindingConfig = DEFAULT_CONFIG;
  private static lastObstacleUpdate: number = 0;
  private static obstacleUpdateInterval: number = 500; // Rebuild grid every 500ms
  private static pathCache: Map<string, CachedPath> = new Map();
  private static cacheTimeout: number = 200; // Cache paths for 200ms
  private static cacheDistanceThreshold: number = 20; // Invalidate if start/goal moved more than this

  /**
   * Build navigation grid from obstacles in the scene
   */
  private static buildGrid(engine: Engine): void {
    const width = GameConfig.width;
    const height = GameConfig.height;
    const cellSize = this.config.cellSize;

    this.gridWidth = Math.ceil(width / cellSize);
    this.gridHeight = Math.ceil(height / cellSize);

    // Initialize grid (all walkable)
    this.grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = true;
      }
    }

    // Mark obstacles as unwalkable
    const obstacles = engine.currentScene.actors.filter(
      (actor) => actor instanceof Obstacle
    ) as Obstacle[];

    for (const obstacle of obstacles) {
      const bounds = obstacle.collider.bounds;
      const padding = this.config.obstaclePadding;

      // Calculate grid cells covered by obstacle (with padding)
      const minX = Math.max(0, Math.floor((bounds.left - padding) / cellSize));
      const maxX = Math.min(
        this.gridWidth - 1,
        Math.floor((bounds.right + padding) / cellSize)
      );
      const minY = Math.max(0, Math.floor((bounds.top - padding) / cellSize));
      const maxY = Math.min(
        this.gridHeight - 1,
        Math.floor((bounds.bottom + padding) / cellSize)
      );

      // Mark cells as unwalkable
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (this.grid[y]) {
            this.grid[y][x] = false;
          }
        }
      }
    }
  }

  /**
   * Ensure grid is up to date
   */
  private static ensureGridUpdated(engine: Engine): void {
    const now = Date.now();
    if (
      !this.grid ||
      now - this.lastObstacleUpdate > this.obstacleUpdateInterval
    ) {
      this.buildGrid(engine);
      this.lastObstacleUpdate = now;
    }
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  private static worldToGrid(worldPos: Vector): { x: number; y: number } {
    return {
      x: Math.floor(worldPos.x / this.config.cellSize),
      y: Math.floor(worldPos.y / this.config.cellSize),
    };
  }

  /**
   * Convert grid coordinates to world coordinates (center of cell)
   */
  private static gridToWorld(gridX: number, gridY: number): Vector {
    return new Vector(
      gridX * this.config.cellSize + this.config.cellSize / 2,
      gridY * this.config.cellSize + this.config.cellSize / 2
    );
  }

  /**
   * Check if a grid position is walkable
   */
  private static isWalkable(x: number, y: number): boolean {
    if (
      x < 0 ||
      x >= this.gridWidth ||
      y < 0 ||
      y >= this.gridHeight ||
      !this.grid
    ) {
      return false;
    }
    return this.grid[y][x];
  }

  /**
   * Get neighbors of a grid node (8-directional)
   */
  private static getNeighbors(node: GridNode): GridNode[] {
    const neighbors: GridNode[] = [];
    const directions = [
      { x: -1, y: -1 }, // Top-left
      { x: 0, y: -1 }, // Top
      { x: 1, y: -1 }, // Top-right
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 }, // Right
      { x: -1, y: 1 }, // Bottom-left
      { x: 0, y: 1 }, // Bottom
      { x: 1, y: 1 }, // Bottom-right
    ];

    for (const dir of directions) {
      const newX = node.x + dir.x;
      const newY = node.y + dir.y;

      if (this.isWalkable(newX, newY)) {
        neighbors.push({
          x: newX,
          y: newY,
          walkable: true,
          g: 0,
          h: 0,
          f: 0,
          parent: null,
        });
      }
    }

    return neighbors;
  }

  /**
   * Calculate heuristic (Manhattan distance)
   */
  private static heuristic(node: GridNode, goal: GridNode): number {
    const dx = Math.abs(node.x - goal.x);
    const dy = Math.abs(node.y - goal.y);
    // Use diagonal distance for more accurate paths
    return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy);
  }

  /**
   * Generate cache key from start and goal positions
   */
  private static getCacheKey(start: Vector, goal: Vector): string {
    const startGrid = this.worldToGrid(start);
    const goalGrid = this.worldToGrid(goal);
    return `${startGrid.x},${startGrid.y}:${goalGrid.x},${goalGrid.y}`;
  }

  /**
   * Check if cached path is still valid
   */
  private static isCacheValid(
    cached: CachedPath,
    start: Vector,
    goal: Vector
  ): boolean {
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      return false;
    }

    const startDist = cached.start.distance(start);
    const goalDist = cached.goal.distance(goal);

    return (
      startDist < this.cacheDistanceThreshold &&
      goalDist < this.cacheDistanceThreshold
    );
  }

  /**
   * Find path using A* algorithm
   * @param start World position to start from
   * @param goal World position to navigate to
   * @param engine Game engine
   * @returns Array of world positions representing the path, or empty array if no path found
   */
  public static findPath(
    start: Vector,
    goal: Vector,
    engine: Engine
  ): Vector[] {
    this.ensureGridUpdated(engine);

    if (!this.grid) {
      return [];
    }

    // Check cache first
    const cacheKey = this.getCacheKey(start, goal);
    const cached = this.pathCache.get(cacheKey);
    if (cached && this.isCacheValid(cached, start, goal)) {
      // Adjust cached path to current start position
      if (cached.path.length > 0) {
        const adjustedPath = [...cached.path];
        // If we've moved significantly, adjust the path
        const distToFirstWaypoint = start.distance(adjustedPath[0]);
        if (distToFirstWaypoint > this.cacheDistanceThreshold * 2) {
          // Path is too stale, recalculate
        } else {
          return adjustedPath;
        }
      }
    }

    const startGrid = this.worldToGrid(start);
    const goalGrid = this.worldToGrid(goal);

    // Check if start or goal are unwalkable
    if (!this.isWalkable(startGrid.x, startGrid.y)) {
      // Try to find nearest walkable cell
      const nearest = this.findNearestWalkable(startGrid.x, startGrid.y);
      if (!nearest) return [];
      startGrid.x = nearest.x;
      startGrid.y = nearest.y;
    }

    if (!this.isWalkable(goalGrid.x, goalGrid.y)) {
      // Try to find nearest walkable cell
      const nearest = this.findNearestWalkable(goalGrid.x, goalGrid.y);
      if (!nearest) return [];
      goalGrid.x = nearest.x;
      goalGrid.y = nearest.y;
    }

    // Initialize start and goal nodes
    const startNode: GridNode = {
      x: startGrid.x,
      y: startGrid.y,
      walkable: true,
      g: 0,
      h: this.heuristic(
        { x: startGrid.x, y: startGrid.y } as GridNode,
        { x: goalGrid.x, y: goalGrid.y } as GridNode
      ),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    const goalNode: GridNode = {
      x: goalGrid.x,
      y: goalGrid.y,
      walkable: true,
      g: 0,
      h: 0,
      f: 0,
      parent: null,
    };

    const openSet: GridNode[] = [startNode];
    const closedSet: Set<string> = new Set();

    while (openSet.length > 0) {
      // Find node with lowest f score
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet.splice(currentIndex, 1)[0];
      const currentKey = `${current.x},${current.y}`;
      closedSet.add(currentKey);

      // Check if we reached the goal
      if (current.x === goalNode.x && current.y === goalNode.y) {
        // Reconstruct path
        const path: Vector[] = [];
        let node: GridNode | null = current;

        while (node) {
          path.unshift(this.gridToWorld(node.x, node.y));
          node = node.parent;
        }

        // Cache the path
        this.pathCache.set(cacheKey, {
          start: start.clone(),
          goal: goal.clone(),
          path: path.map((p) => p.clone()),
          timestamp: Date.now(),
        });

        // Limit cache size (keep only last 50 paths)
        if (this.pathCache.size > 50) {
          const firstKey = this.pathCache.keys().next().value;
          this.pathCache.delete(firstKey);
        }

        return path;
      }

      // Check neighbors
      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Calculate cost (diagonal movement costs more)
        const isDiagonal =
          Math.abs(neighbor.x - current.x) === 1 &&
          Math.abs(neighbor.y - current.y) === 1;
        const moveCost = isDiagonal ? Math.SQRT2 : 1;
        const tentativeG = current.g + moveCost;

        // Check if this neighbor is already in open set
        const existingOpen = openSet.find(
          (n) => n.x === neighbor.x && n.y === neighbor.y
        );

        if (!existingOpen) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, goalNode);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          openSet.push(neighbor);
        } else if (tentativeG < existingOpen.g) {
          // Found a better path to this node
          existingOpen.g = tentativeG;
          existingOpen.f = existingOpen.g + existingOpen.h;
          existingOpen.parent = current;
        }
      }
    }

    // No path found - cache empty path to avoid repeated calculations
    this.pathCache.set(cacheKey, {
      start: start.clone(),
      goal: goal.clone(),
      path: [],
      timestamp: Date.now(),
    });

    return [];
  }

  /**
   * Find nearest walkable cell to an unwalkable position
   */
  private static findNearestWalkable(
    x: number,
    y: number,
    maxRadius: number = 5
  ): { x: number; y: number } | null {
    // Spiral search outward
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const checkX = x + dx;
            const checkY = y + dy;
            if (this.isWalkable(checkX, checkY)) {
              return { x: checkX, y: checkY };
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Get next direction to move toward goal using pathfinding
   * @param enemy The enemy actor
   * @param goal World position to navigate to
   * @param engine Game engine
   * @param lookAhead How many path nodes ahead to look (default 1)
   * @returns Direction vector normalized, or zero vector if no path
   */
  public static getDirectionToGoal(
    enemy: Actor,
    goal: Vector,
    engine: Engine,
    lookAhead: number = 1
  ): Vector {
    const path = this.findPath(enemy.pos, goal, engine);

    if (path.length === 0) {
      return Vector.Zero;
    }

    // If we're very close to the first waypoint, use the next one
    let targetIndex = Math.min(lookAhead, path.length - 1);
    const targetWaypoint = path[targetIndex];

    // If we've reached the waypoint, use the next one
    const distanceToWaypoint = enemy.pos.distance(targetWaypoint);
    if (distanceToWaypoint < this.config.cellSize * 0.5 && path.length > targetIndex + 1) {
      targetIndex++;
    }

    const direction = path[targetIndex].sub(enemy.pos);
    if (direction.size === 0) {
      return Vector.Zero;
    }

    return direction.normalize();
  }

  /**
   * Force rebuild the navigation grid (useful when obstacles change)
   */
  public static rebuildGrid(engine: Engine): void {
    this.buildGrid(engine);
    this.lastObstacleUpdate = Date.now();
  }
}

