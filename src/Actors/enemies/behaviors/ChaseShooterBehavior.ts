import { Engine, Vector } from 'excalibur';
import type { IEnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Projectile } from '@/Actors/Projectile';
import { GameConfig } from '@/config';
import { Player } from '@/Actors/Player';

/**
 * Enemy chases the player while shooting at them
 */
export class ChaseShooterBehavior implements IEnemyBehavior {
  private lastShotTime: number = 0;
  private shootCooldown: number = GameConfig.enemy.shooting.cooldown * 2; // Slower shooting while chasing
  private chaseSpeed: number = GameConfig.enemy.speed * 0.8; // Slightly slower than base speed
  private minDistance: number = 50; // Don't get too close

  updateMovement(enemy: Enemy, engine: Engine, _delta: number): void {
    const player = engine.currentScene.actors.find(actor => actor instanceof Player) as Player | undefined;

    if (player) {
      const direction = player.pos.sub(enemy.pos);
      const distance = direction.size;

      // Only chase if not too close
      if (distance > this.minDistance) {
        const normalizedDirection = direction.normalize();
        enemy.vel = normalizedDirection.scale(this.chaseSpeed);
      } else {
        // Stop if too close
        enemy.vel = Vector.Zero;
      }
    } else {
      enemy.vel = Vector.Zero;
    }
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

