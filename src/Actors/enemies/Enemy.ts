import { Actor, Engine, Vector, CollisionType, Color, PreCollisionEvent } from 'excalibur';
import { GameConfig } from '@/config';
import { EnemyCollisionGroupConfig } from '@/CollisionGroups';
import { Projectile } from '@/Actors/Projectile';
import type { IEnemyBehavior } from './EnemyBehavior';
import type { EnemyConfig } from './EnemyConfig';

export class Enemy extends Actor {
  private behavior: IEnemyBehavior | null = null;
  private config: EnemyConfig | null = null;
  public health: number = GameConfig.enemy.health;

  constructor(position?: Vector, configOrBehavior?: EnemyConfig | IEnemyBehavior) {
    // Handle both old (behavior) and new (config) API for backwards compatibility
    let config: EnemyConfig | null = null;
    let behavior: IEnemyBehavior | null = null;

    if (configOrBehavior) {
      // Check if it's a config (has 'id' property) or behavior
      if ('id' in configOrBehavior) {
        config = configOrBehavior as EnemyConfig;
        behavior = config.behavior;
      } else {
        behavior = configOrBehavior as IEnemyBehavior;
      }
    }

    // Calculate radius - use config override, appearance override, or default
    const radius = config?.stats?.radius
      || config?.appearance?.radius
      || GameConfig.width * GameConfig.enemy.radiusPercent;

    // Use provided position or default to (0, 0)
    const pos = position || new Vector(0, 0);

    // Determine appearance
    const color = config?.appearance?.color || Color.Red;
    const sprite = config?.appearance?.sprite;

    super({
      name: 'Enemy',
      pos,
      radius,
      color: sprite ? undefined : color, // Only set color if no sprite
      collisionType: CollisionType.Active,
      collisionGroup: EnemyCollisionGroupConfig,
    });

    // Store config and behavior
    this.config = config;
    this.behavior = behavior;

    // Set health from config
    if (config?.stats?.health) {
      this.health = config.stats.health;
    }
  }

  /**
   * Set the behavior for this enemy
   */
  public setBehavior(behavior: IEnemyBehavior): void {
    this.behavior = behavior;
    if (this.scene && this.scene.engine) {
      behavior.onInitialize?.(this, this.scene.engine);
    }
  }

  /**
   * Get the enemy's config (if created from config)
   */
  public getConfig(): EnemyConfig | null {
    return this.config;
  }

  /**
   * Get enemy type ID
   */
  public getTypeId(): string | null {
    return this.config?.id || null;
  }

  public onInitialize(engine: Engine): void {
    // Setup listeners like Galaga Baddie
    this.on('precollision', (evt) => this.onPreCollision(evt));

    // Set sprite/graphic if provided in config
    if (this.config?.appearance?.sprite) {
      this.graphics.use(this.config.appearance.sprite);
    }

    // Initialize behavior if it exists
    if (this.behavior) {
      this.behavior.onInitialize?.(this, engine);
    }
  }

  public onPreUpdate(engine: Engine, delta: number): void {
    // Update behavior if it exists
    if (this.behavior) {
      this.behavior.updateMovement(this, engine, delta);
      this.behavior.updateShooting(this, engine, delta);
    }
  }

  // Fires before excalibur collision resolution (like Galaga Baddie)
  private onPreCollision(evt: PreCollisionEvent): void {
    // Check if we were hit by a projectile (check evt.other.owner for the Actor)
    if (evt.other.owner instanceof Projectile) {
      // Only take damage from player projectiles
      if (!evt.other.owner.isEnemyProjectile) {
        // Projectile handles calling takeDamage on us, or we can do it here.
        // But Projectile.ts has the logic to kill itself.
        // Let's rely on Projectile.ts to handle the impact logic to avoid double damage if both handle it.
        // Or better, we define takeDamage and let Projectile call it.
      }
    }
  }

  public takeDamage(amount: number): void {
    this.health -= amount;
    console.log(`Enemy took ${amount} damage. Health: ${this.health}`);
    if (this.health <= 0) {
      this.kill();
      console.log('Enemy died!');
    }
  }
}