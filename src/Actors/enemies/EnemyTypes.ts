import { Color } from 'excalibur';
import type { EnemyConfig } from './EnemyConfig';
import { StationaryShooterBehavior, PatrolShooterBehavior, ChaseShooterBehavior, HideAndShootBehavior } from './behaviors';
import { GameConfig } from '@/config';

/**
 * Registry of all enemy types.
 * Add new enemy types here - they automatically become available through the factory.
 */
export const EnemyTypes: Record<string, EnemyConfig> = {
  // Basic stationary shooter
  STATIONARY_SHOOTER: {
    id: 'stationary_shooter',
    name: 'Stationary Shooter',
    appearance: {
      color: Color.Red,
    },
    behavior: new StationaryShooterBehavior(),
    stats: {
      speed: GameConfig.enemy.stationary.speed,
      health: GameConfig.enemy.stationary.health,
    },
    shooting: {
      enabled: true,
      cooldown: GameConfig.enemy.stationary.shooting.cooldown,
    },
  },

  // Patrol enemy that moves back and forth
  PATROL_SHOOTER: {
    id: 'patrol_shooter',
    name: 'Patrol Shooter',
    appearance: {
      color: Color.Orange,
    },
    behavior: new PatrolShooterBehavior(),
    stats: {
      speed: GameConfig.enemy.patrol.speed,
      health: GameConfig.enemy.patrol.health,
    },
    shooting: {
      enabled: true,
      cooldown: GameConfig.enemy.patrol.shooting.cooldown,
    },
  },

  // Aggressive chaser
  CHASE_SHOOTER: {
    id: 'chase_shooter',
    name: 'Chase Shooter',
    appearance: {
      color: Color.Yellow,
    },
    behavior: new ChaseShooterBehavior(),
    stats: {
      speed: GameConfig.enemy.chase.speed,
      health: GameConfig.enemy.chase.health,
    },
    shooting: {
      enabled: true,
      cooldown: GameConfig.enemy.chase.shooting.cooldown,
    },
  },

  // Tactical enemy that hides behind obstacles
  TACTICAL_SHOOTER: {
    id: 'tactical_shooter',
    name: 'Tactical Shooter',
    appearance: {
      color: Color.Violet,
    },
    behavior: new HideAndShootBehavior(),
    stats: {
      speed: GameConfig.enemy.tactical.speed,
      health: GameConfig.enemy.tactical.health,
    },
    shooting: {
      enabled: true,
      cooldown: GameConfig.enemy.tactical.shooting.cooldown,
    },
  },

  // Example: Fast but weak enemy
  FAST_SHOOTER: {
    id: 'fast_shooter',
    name: 'Fast Shooter',
    appearance: {
      color: Color.Cyan,
    },
    behavior: new StationaryShooterBehavior(), // Could create a new behavior
    stats: {
      speed: GameConfig.enemy.fast.speed,
      health: GameConfig.enemy.fast.health,
    },
    shooting: {
      enabled: true,
      cooldown: GameConfig.enemy.fast.shooting.cooldown,
      projectileSpeed: GameConfig.enemy.fast.shooting.projectileSpeed,
    },
  },
};

/**
 * Get an enemy config by ID
 */
export function getEnemyConfig(typeId: string): EnemyConfig | undefined {
  return EnemyTypes[typeId];
}

/**
 * Get all available enemy types
 */
export function getAllEnemyTypes(): EnemyConfig[] {
  return Object.values(EnemyTypes);
}

