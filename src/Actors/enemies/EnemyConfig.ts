import type { Color, Graphic } from 'excalibur';
import type { IEnemyBehavior } from './EnemyBehavior';

/**
 * Configuration for an enemy type.
 * This bundles all the properties that define an enemy: appearance, behavior, stats, etc.
 */
export interface EnemyConfig {
  /** Unique identifier for this enemy type */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Visual appearance - can be a color, sprite, or graphic */
  appearance: {
    color?: Color;
    sprite?: Graphic;
    radius?: number; // Override default radius
  };
  
  /** Behavior/AI pattern */
  behavior: IEnemyBehavior;
  
  /** Stats and properties */
  stats: {
    speed?: number; // Movement speed (overrides default)
    health?: number; // Hit points
    radius?: number; // Collision radius (if not in appearance)
  };
  
  /** Shooting configuration (if enemy can shoot) */
  shooting?: {
    enabled: boolean;
    cooldown?: number; // Override default cooldown
    projectileSpeed?: number; // Override default projectile speed
    accuracy?: {
      baseAccuracy?: number;
      spreadAngle?: number;
    };
  };
}

