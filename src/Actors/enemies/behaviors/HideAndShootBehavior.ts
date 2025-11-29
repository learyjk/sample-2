import { Engine, Vector, Ray } from 'excalibur';
import type { IEnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '@/Actors/Player';
import { Obstacle } from '@/Actors/Obstacle';
import { GameConfig } from '@/config';
import { Projectile } from '@/Actors/Projectile';
import { Pathfinding } from '../utils/Pathfinding';
import { ObstacleAvoidance } from '../utils/ObstacleAvoidance';

export class HideAndShootBehavior implements IEnemyBehavior {
    private currentObstacle: Obstacle | null = null;

    // Cooldowns
    private shootCooldown: number = GameConfig.enemy.tactical.shooting.cooldown;
    private currentCooldown: number = 0;

    // Settings
    private moveSpeed: number = GameConfig.enemy.tactical.speed;
    private coverDistance: number = 40; // Distance behind obstacle center
    private peekDistance: number = 50; // Distance to side for peeking

    updateMovement(enemy: Enemy, engine: Engine, delta: number): void {
        const player = engine.currentScene.actors.find(actor => actor instanceof Player) as Player | undefined;

        if (!player) {
            enemy.vel = Vector.Zero;
            return;
        }

        // 1. Manage Cooldowns
        if (this.currentCooldown > 0) {
            this.currentCooldown -= delta;
        }

        // 2. Select/Update Obstacle
        if (!this.currentObstacle || this.isExposed(enemy, player, this.currentObstacle)) {
            // Find better cover if current is invalid or we are exposed
            // If we are exposed but close to the obstacle, we might just need to move *behind* it
            // checking distance to current obstacle can help stickiness
            const distToCurrent = this.currentObstacle ? enemy.pos.distance(this.currentObstacle.pos) : Infinity;

            if (!this.currentObstacle || distToCurrent > 200) {
                this.findBestCover(enemy, player, engine);
            }
        }

        // 3. Determine Goal Position
        let targetPos: Vector | null = null;

        if (this.currentObstacle) {
            // Can we shoot?
            // If cooldown ready -> Peek Position
            // If cooldown not ready -> Cover Position

            if (this.currentCooldown <= 0) {
                targetPos = this.calculatePeekPosition(this.currentObstacle, player.pos);
            } else {
                targetPos = this.calculateCoverPosition(this.currentObstacle, player.pos);
            }
        }

        // 4. Move
        if (targetPos) {
            this.moveTo(enemy, targetPos, engine);
        } else {
            enemy.vel = Vector.Zero;
        }
    }

    updateShooting(enemy: Enemy, engine: Engine, _delta: number): void {
        // Always try to shoot if possible
        if (this.currentCooldown <= 0) {
            const player = engine.currentScene.actors.find(actor => actor instanceof Player) as Player | undefined;
            if (player) {
                if (this.hasLineOfSight(enemy.pos, player.pos, engine)) {
                    this.shootAtTarget(enemy, engine, player.pos);
                    // Reset cooldown with some randomness
                    this.currentCooldown = this.shootCooldown * (0.8 + Math.random() * 0.4);
                }
            }
        }
    }

    private findBestCover(enemy: Enemy, _player: Player, engine: Engine): void {
        const obstacles = engine.currentScene.actors.filter(a => a instanceof Obstacle) as Obstacle[];

        let nearestDist = Infinity;
        let bestObstacle: Obstacle | null = null;

        for (const obstacle of obstacles) {
            // Skip walls
            if (obstacle.width !== GameConfig.obstacle.size || obstacle.height !== GameConfig.obstacle.size) {
                continue;
            }

            const dist = enemy.pos.distance(obstacle.pos);
            if (dist < nearestDist) {
                nearestDist = dist;
                bestObstacle = obstacle;
            }
        }

        this.currentObstacle = bestObstacle;
    }

    private calculateCoverPosition(obstacle: Obstacle, playerPos: Vector): Vector {
        // Vector from player to obstacle
        const toObstacle = obstacle.pos.sub(playerPos).normalize();
        // Position behind obstacle
        // We add obstacle width/2 + coverDistance
        const dist = (obstacle.width / 2) + this.coverDistance;
        return obstacle.pos.add(toObstacle.scale(dist));
    }

    private calculatePeekPosition(obstacle: Obstacle, playerPos: Vector): Vector {
        // We want a position to the side of the obstacle that has LoS
        // Perpendicular to player-obstacle line
        const toObstacle = obstacle.pos.sub(playerPos).normalize();
        const perp = new Vector(-toObstacle.y, toObstacle.x);

        // Left or Right side?
        // Pick one consistent side or alternating? Consistent avoids jitter.
        // Let's pick left side relative to player view

        const dist = (obstacle.width / 2) + this.peekDistance;

        // Base cover spot (behind)
        const coverSpot = this.calculateCoverPosition(obstacle, playerPos);

        // Move sideways from cover spot
        return coverSpot.add(perp.scale(dist));
    }

    private isExposed(_enemy: Enemy, _player: Player, _obstacle: Obstacle): boolean {
        // We are exposed if the obstacle is NOT between us and the player
        // Simple check: Dot product of (Player->Obstacle) and (Obstacle->Enemy) should be positive
        // (Enemy is "behind" obstacle relative to player)

        // This helper might not be needed if we always drive towards cover/peek spots
        // but it's used to trigger "Find New Cover"
        return false; // Let's rely on distance check in updateMovement for sticking to cover
    }

    private moveTo(enemy: Enemy, target: Vector, engine: Engine): void {
        const dist = enemy.pos.distance(target);

        // Deadzone to stop jitter
        if (dist < 5) {
            enemy.vel = Vector.Zero;
            return;
        }

        let desiredVelocity = Vector.Zero;

        // Use pathfinding for longer distances, direct for close
        if (dist > 100) {
            const direction = Pathfinding.getDirectionToGoal(enemy, target, engine, 1);
            if (direction.size > 0) {
                desiredVelocity = direction.scale(this.moveSpeed);
            } else {
                // Fallback
                desiredVelocity = target.sub(enemy.pos).normalize().scale(this.moveSpeed);
            }
        } else {
            desiredVelocity = target.sub(enemy.pos).normalize().scale(this.moveSpeed);
        }

        // Apply avoidance but maybe less strong if we are close to our target cover?
        // Or filter our current obstacle?
        // ObstacleAvoidance doesn't support filtering easily.
        // We will trust that cover positions are outside the obstacles.

        const finalVelocity = ObstacleAvoidance.applyObstacleAvoidance(
            enemy,
            desiredVelocity,
            engine,
            {
                avoidanceRadius: 35,
                avoidanceForce: 0.5,
                lookAheadDistance: 50
            }
        );

        enemy.vel = finalVelocity;
    }

    private hasLineOfSight(start: Vector, end: Vector, engine: Engine): boolean {
        const ray = new Ray(start, end.sub(start).normalize());
        const maxDist = start.distance(end);

        const hits = engine.currentScene.physics.rayCast(ray, {
            maxDistance: maxDist,
            searchAllColliders: true
        });

        for (const hit of hits) {
            if (hit.collider.owner instanceof Obstacle) {
                return false;
            }
        }
        return true;
    }

    private shootAtTarget(enemy: Enemy, engine: Engine, targetPos: Vector): void {
        const projectile = new Projectile(
            enemy.pos.clone(),
            targetPos,
            undefined,
            true, // isEnemyProjectile
            GameConfig.enemy.base.shooting.projectileSpeed
        );
        engine.add(projectile);
    }
}
