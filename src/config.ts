/**
 * Game configuration
 */
export const GameConfig = {
  // Game dimensions
  width: 800,
  height: 800,

  // Player configuration (as percentages of game size)
  player: {
    radiusPercent: 0.01,
    speed: 300, // pixels per second
    health: 100,
    projectileSpeed: 400, // Faster than enemies
    shooting: {
      cooldown: 200, // milliseconds between shots when holding
    },
    accuracy: {
      baseAccuracy: 0.95, // 95% base accuracy (0.0 to 1.0)
      spreadAngle: 0.1, // Maximum spread angle in radians (about 5.7 degrees)
    }
  },

  // Familiar/Pet configuration
  familiar: {
    radiusPercent: 0.008, // Slightly smaller than player
    speedRatio: 0.4, // 90% of player speed
    followDistance: 60, // Distance to maintain from player
    tetherRadius: 100, // Radius for tether buff activation
    buffs: {
      damageReduction: 0.8, // 20% reduction (multiplier)
      healInterval: 1000, // ms
      healAmount: 1, // health per interval
    }
  },

  // Base enemy configuration
  enemy: {
    base: {
      radiusPercent: 0.01,
      speed: 50,
      health: 50,
      shooting: {
        cooldown: 800,
        projectileSpeed: 150,
        accuracy: {
          baseAccuracy: 0.8,
          spreadAngle: 0.15,
        }
      }
    },
    // Type specific overrides
    stationary: {
      speed: 0,
      health: 50,
      shooting: {
        cooldown: 800,
      }
    },
    patrol: {
      speed: 50,
      health: 60,
      shooting: {
        cooldown: 1200,
      }
    },
    chase: {
      speed: 40,
      health: 40,
      shooting: {
        cooldown: 1600,
      }
    },
    tactical: {
      speed: 200,
      health: 45,
      shooting: {
        cooldown: 800,
      }
    },
    fast: {
      speed: 75,
      health: 30,
      shooting: {
        cooldown: 560, // 0.7 * base
        projectileSpeed: 180, // 1.2 * base
      }
    }
  },

  // Projectile configuration
  projectile: {
    speed: 300, // pixels per second
    damage: 10,
    damageFromPlayer: 25, // Damage player deals to enemies
  },

  // Obstacle configuration
  obstacle: {
    count: 10,
    size: 64, // Size of the square obstacle
  },

  // Map/Spawn configuration
  map: {
    spawnZoneWidthRatio: 0.15, // 15% of width for spawn zones
  }
} as const;
