import { Actor, Engine, Vector, CollisionType, Color, PreCollisionEvent } from 'excalibur';
import { GameConfig } from '@/config';
import { EnemyCollisionGroupConfig } from '@/CollisionGroups';
import { Projectile } from '@/Actors/Projectile';

export class Enemy extends Actor {
  constructor(position?: Vector) {
    // Calculate enemy radius as percentage of game width
    const radius = GameConfig.width * GameConfig.enemy.radiusPercent;

    // Use provided position or default to (0, 0)
    const pos = position || new Vector(0, 0);

    super({
      pos,
      radius,
      color: Color.Red,
      collisionType: CollisionType.Active, // Active to participate in collision resolution
      collisionGroup: EnemyCollisionGroupConfig,
    });
  }

  public onInitialize(_engine: Engine): void {
    // Setup listeners like Galaga Baddie
    this.on('precollision', (evt) => this.onPreCollision(evt));
  }

  // Fires before excalibur collision resolution (like Galaga Baddie)
  private onPreCollision(evt: PreCollisionEvent): void {
    // Check if we were hit by a projectile (check evt.other.owner for the Actor)
    if (evt.other.owner instanceof Projectile) {
      console.log('💥 Enemy was hit by a bullet! 💥');
      // Enemy hit logic can go here
    }
  }
}