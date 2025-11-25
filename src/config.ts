/**
 * Game configuration
 */
export const GameConfig = {
  // Game dimensions
  width: 320,
  height: 320,

  // Player configuration (as percentages of game size)
  player: {
    radiusPercent: 0.01,
    speed: 100, // pixels per second
    accuracy: {
      baseAccuracy: 0.95, // 95% base accuracy (0.0 to 1.0)
      spreadAngle: 0.1, // Maximum spread angle in radians (about 5.7 degrees)
    }
  },

  // Enemy configuration (as percentages of game size)
  enemy: {
    radiusPercent: 0.01, // Same size as player by default
    speed: 50, // pixels per second (slower than player)
    shooting: {
      cooldown: 1000, // milliseconds between shots (default)
      projectileSpeed: 150, // pixels per second (default)
      accuracy: {
        baseAccuracy: 0.8, // 80% base accuracy (0.0 to 1.0)
        spreadAngle: 0.15, // Maximum spread angle in radians
      }
    }
  },

  // Projectile configuration
  projectile: {
    speed: 200, // pixels per second
  },

  // Obstacle configuration
  obstacle: {
    count: 10,
    size: 32, // Size of the square obstacle
  },

  // Map/Spawn configuration
  map: {
    spawnZoneWidthRatio: 0.15, // 15% of width for spawn zones
  }
} as const;

