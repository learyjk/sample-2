import { Engine, Vector } from 'excalibur';
import type { IEnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Projectile } from '@/Actors/Projectile';
import { GameConfig } from '@/config';
import { Player } from '@/Actors/Player';

/**
 * A simple behavior: enemy stays in place and shoots at the player periodically
 */
export class StationaryShooterBehavior implements IEnemyBehavior {
  private lastShotTime: number = 0;
  private shootCooldown: number = GameConfig.enemy.shooting.cooldown;

  updateMovement(enemy: Enemy, _engine: Engine, _delta: number): void {
    // Stationary - no movement
    enemy.vel = Vector.Zero;
  }

  updateShooting(enemy: Enemy, engine: Engine, delta: number): void {
    this.lastShotTime += delta;

    if (this.lastShotTime >= this.shootCooldown) {
      const player = engine.currentScene.actors.find(actor => actor instanceof Player) as Player | undefined;

      if (player) {
        this.shootAtTarget(enemy, engine, player.pos);
        this.lastShotTime = 0;
      }
    }
  }

  private shootAtTarget(enemy: Enemy, engine: Engine, targetPos: Vector): void {
    const direction = targetPos.sub(enemy.pos).normalize();
    const distance = enemy.pos.distance(targetPos);
    
    // Add accuracy spread
    const spreadAmount = GameConfig.enemy.shooting.accuracy.spreadAngle * 
                        (1 - GameConfig.enemy.shooting.accuracy.baseAccuracy);
    const randomAngle = (Math.random() - 0.5) * spreadAmount * 2;
    
    const cos = Math.cos(randomAngle);
    const sin = Math.sin(randomAngle);
    const spreadDirection = new Vector(
      direction.x * cos - direction.y * sin,
      direction.x * sin + direction.y * cos
    );

    const targetPosition = enemy.pos.add(spreadDirection.scale(distance));
    const projectile = new Projectile(
      enemy.pos.clone(),
      targetPosition,
      undefined,
      true, // isEnemyProjectile
      GameConfig.enemy.shooting.projectileSpeed
    );
    
    engine.add(projectile);
  }
}

