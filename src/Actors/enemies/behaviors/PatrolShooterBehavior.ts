import { Engine, Vector } from 'excalibur';
import type { IEnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Projectile } from '@/Actors/Projectile';
import { GameConfig } from '@/config';
import { Player } from '@/Actors/Player';
import { ObstacleAvoidance } from '../utils/ObstacleAvoidance';
import { ParticleSystem } from '@/utils/ParticleSystem';

export class PatrolShooterBehavior implements IEnemyBehavior {
  private lastShotTime: number = 0;
  private shootCooldown: number = GameConfig.enemy.patrol.shooting.cooldown; // Slower shooting
  private patrolSpeed: number = GameConfig.enemy.patrol.speed;
  private patrolDirection: Vector = new Vector(1, 0); // Current patrol direction
  private startPos: Vector = Vector.Zero;
  private patrolRange: number = 100; // pixels
  private currentWaypoint: Vector | null = null;
  private waypointReachedDistance: number = 20; // Distance threshold to consider waypoint reached
  private lastDirectionChange: number = 0;
  private directionChangeInterval: number = 3000; // Change direction every 3 seconds

  onInitialize(enemy: Enemy, _engine: Engine): void {
    this.startPos = enemy.pos.clone();
    this.pickRandomDirection();
  }

  /**
   * Pick a random patrol direction and set a waypoint
   */
  private pickRandomDirection(): void {
    // Pick a random angle (0 to 2π)
    const angle = Math.random() * Math.PI * 2;
    this.patrolDirection = new Vector(Math.cos(angle), Math.sin(angle)).normalize();

    // Set a waypoint in the patrol direction
    const waypointDistance = this.patrolRange + Math.random() * 50; // 100-150 pixels
    this.currentWaypoint = this.startPos.add(this.patrolDirection.scale(waypointDistance));

    // Clamp waypoint to game bounds
    const margin = 20;
    this.currentWaypoint.x = Math.max(margin, Math.min(GameConfig.width - margin, this.currentWaypoint.x));
    this.currentWaypoint.y = Math.max(margin, Math.min(GameConfig.height - margin, this.currentWaypoint.y));

    this.lastDirectionChange = Date.now();
  }

  updateMovement(enemy: Enemy, engine: Engine, _delta: number): void {
    // Check if we should change direction (time-based or waypoint reached)
    const now = Date.now();
    const shouldChangeDirection =
      now - this.lastDirectionChange > this.directionChangeInterval ||
      (this.currentWaypoint && enemy.pos.distance(this.currentWaypoint) < this.waypointReachedDistance);

    if (shouldChangeDirection) {
      this.pickRandomDirection();
    }

    // Calculate desired movement direction toward current waypoint
    let desiredVelocity: Vector;
    if (this.currentWaypoint) {
      const toWaypoint = this.currentWaypoint.sub(enemy.pos);
      if (toWaypoint.size > this.waypointReachedDistance) {
        desiredVelocity = toWaypoint.normalize().scale(this.patrolSpeed);
      } else {
        // Close to waypoint, use patrol direction
        desiredVelocity = this.patrolDirection.scale(this.patrolSpeed);
      }
    } else {
      // No waypoint, use patrol direction
      desiredVelocity = this.patrolDirection.scale(this.patrolSpeed);
    }

    // Apply obstacle avoidance only when obstacles are detected
    // This allows natural patrol movement with obstacle avoidance
    const adjustedVelocity = ObstacleAvoidance.applyObstacleAvoidance(
      enemy,
      desiredVelocity,
      engine,
      {
        lookAheadDistance: 50,
        avoidanceRadius: 45,
        avoidanceForce: 0.6, // Stronger avoidance for patrol enemies
        maxAvoidanceAngle: Math.PI / 2, // Allow up to 90 degrees deviation
      }
    );

    enemy.vel = adjustedVelocity;
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
    const spreadAmount = GameConfig.enemy.base.shooting.accuracy.spreadAngle *
      (1 - GameConfig.enemy.base.shooting.accuracy.baseAccuracy);
    const randomAngle = (Math.random() - 0.5) * spreadAmount * 2;

    const cos = Math.cos(randomAngle);
    const sin = Math.sin(randomAngle);
    const spreadDirection = new Vector(
      direction.x * cos - direction.y * sin,
      direction.x * sin + direction.y * cos
    );

    const targetPosition = enemy.pos.add(spreadDirection.scale(distance));
    
    // Create muzzle flash for enemy
    ParticleSystem.createMuzzleFlash(engine, enemy.pos.clone(), spreadDirection);
    
    const projectile = new Projectile(
      enemy.pos.clone(),
      targetPosition,
      undefined,
      true, // isEnemyProjectile
      GameConfig.enemy.base.shooting.projectileSpeed
    );

    engine.add(projectile);
  }
}

