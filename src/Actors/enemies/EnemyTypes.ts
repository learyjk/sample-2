import { Color } from 'excalibur';
import type { EnemyConfig } from './EnemyConfig';
import { StationaryShooterBehavior, PatrolShooterBehavior, ChaseShooterBehavior } from './behaviors';
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
      speed: 0, // Doesn't move
    },
    shooting: {
      enabled: true,
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
      speed: GameConfig.enemy.speed,
    },
    shooting: {
      enabled: true,
      cooldown: GameConfig.enemy.shooting.cooldown * 1.5, // Slower shooting
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
      speed: GameConfig.enemy.speed * 0.8, // Slightly slower
    },
    shooting: {
      enabled: true,
      cooldown: GameConfig.enemy.shooting.cooldown * 2, // Slower shooting while chasing
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
      speed: GameConfig.enemy.speed * 1.5, // Faster
    },
    shooting: {
      enabled: true,
      cooldown: GameConfig.enemy.shooting.cooldown * 0.7, // Faster shooting
      projectileSpeed: GameConfig.enemy.shooting.projectileSpeed * 1.2, // Faster projectiles
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

