import { Engine, Vector } from 'excalibur';
import type { IEnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Projectile } from '@/Actors/Projectile';
import { GameConfig } from '@/config';
import { Player } from '@/Actors/Player';

/**
 * Enemy patrols back and forth horizontally while shooting at the player
 */
export class PatrolShooterBehavior implements IEnemyBehavior {
  private lastShotTime: number = 0;
  private shootCooldown: number = GameConfig.enemy.shooting.cooldown * 1.5; // Slower shooting
  private patrolSpeed: number = GameConfig.enemy.speed;
  private patrolDirection: number = 1; // 1 for right, -1 for left
  private startX: number = 0;
  private patrolRange: number = 100; // pixels

  onInitialize(enemy: Enemy, _engine: Engine): void {
    this.startX = enemy.pos.x;
  }

  updateMovement(enemy: Enemy, engine: Engine, _delta: number): void {
    // Patrol horizontally
    const currentX = enemy.pos.x;
    
    // Reverse direction if we've gone too far
    if (currentX >= this.startX + this.patrolRange) {
      this.patrolDirection = -1;
    } else if (currentX <= this.startX - this.patrolRange) {
      this.patrolDirection = 1;
    }

    // Move horizontally
    enemy.vel = new Vector(this.patrolSpeed * this.patrolDirection, 0);
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

