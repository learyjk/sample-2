import { Vector } from 'excalibur';
import { Enemy } from './Enemy';
import type { EnemyConfig } from './EnemyConfig';
import { getEnemyConfig, EnemyTypes } from './EnemyTypes';

/**
 * Factory for creating enemies.
 * This provides a clean API for spawning enemies with different types.
 */
export class EnemyFactory {
  /**
   * Create an enemy from a config
   */
  static createFromConfig(config: EnemyConfig, position?: Vector): Enemy {
    return new Enemy(position, config);
  }

  /**
   * Create an enemy by type ID
   */
  static create(typeId: string, position?: Vector): Enemy | null {
    const config = getEnemyConfig(typeId);
    if (!config) {
      console.warn(`Unknown enemy type: ${typeId}`);
      return null;
    }
    return this.createFromConfig(config, position);
  }

  /**
   * Create a random enemy
   */
  static createRandom(position?: Vector): Enemy {
    const configs = Object.values(EnemyTypes);
    const randomConfig = configs[Math.floor(Math.random() * configs.length)];
    return this.createFromConfig(randomConfig, position);
  }
}

