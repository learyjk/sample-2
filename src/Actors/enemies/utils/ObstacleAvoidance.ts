import { Engine, Vector, Actor } from 'excalibur';
import { Obstacle } from '@/Actors/Obstacle';

/**
 * Configuration for obstacle avoidance behavior
 */
interface AvoidanceConfig {
  lookAheadDistance: number; // How far ahead to check for obstacles (in pixels)
  avoidanceRadius: number; // Radius around enemy to check for obstacles
  avoidanceForce: number; // Strength of avoidance steering (0-1)
  maxAvoidanceAngle: number; // Maximum angle deviation allowed (in radians)
}

/**
 * Default configuration for obstacle avoidance
 */
const DEFAULT_CONFIG: AvoidanceConfig = {
  lookAheadDistance: 60, // Check 60 pixels ahead
  avoidanceRadius: 50, // Check within 50 pixels radius
  avoidanceForce: 0.4, // 40% avoidance, 60% desired movement
  maxAvoidanceAngle: Math.PI / 3, // 60 degrees max deviation
};

/**
 * Obstacle avoidance utility for enemy AI
 */
export class ObstacleAvoidance {
  /**
   * Detect obstacles ahead in the movement direction
   * @param enemy The enemy actor
   * @param desiredVelocity The desired movement velocity
   * @param engine The game engine
   * @param config Optional configuration override
   * @returns Array of obstacles detected ahead
   */
  private static detectObstaclesAhead(
    enemy: Actor,
    desiredVelocity: Vector,
    engine: Engine,
    config: AvoidanceConfig = DEFAULT_CONFIG
  ): Obstacle[] {
    if (desiredVelocity.size === 0) {
      return []; // No movement, no obstacles to detect
    }

    const obstacles: Obstacle[] = [];
    const movementDirection = desiredVelocity.normalize();
    const lookAheadPoint = enemy.pos.add(movementDirection.scale(config.lookAheadDistance));

    // Query all actors in the scene
    const allActors = engine.currentScene.actors;

    for (const actor of allActors) {
      if (actor instanceof Obstacle && actor !== enemy) {
        const distanceToObstacle = enemy.pos.distance(actor.pos);
        const distanceToLookAhead = lookAheadPoint.distance(actor.pos);

        // Check if obstacle is within avoidance radius
        if (distanceToObstacle <= config.avoidanceRadius) {
          // Check if obstacle is in the general direction of movement
          const toObstacle = actor.pos.sub(enemy.pos).normalize();
          const dotProduct = movementDirection.dot(toObstacle);

          // If obstacle is ahead (dot product > 0 means similar direction)
          if (dotProduct > 0 || distanceToObstacle <= config.avoidanceRadius * 0.6) {
            obstacles.push(actor);
          }
        }
      }
    }

    return obstacles;
  }

  /**
   * Calculate avoidance vector away from detected obstacles
   * @param enemy The enemy actor
   * @param obstacles Array of obstacles to avoid
   * @param desiredVelocity The desired movement velocity
   * @param config Optional configuration override
   * @returns Avoidance steering vector
   */
  private static calculateAvoidanceVector(
    enemy: Actor,
    obstacles: Obstacle[],
    desiredVelocity: Vector,
    config: AvoidanceConfig = DEFAULT_CONFIG
  ): Vector {
    if (obstacles.length === 0) {
      return Vector.Zero;
    }

    let avoidanceVector = Vector.Zero;
    const movementDirection = desiredVelocity.size > 0 ? desiredVelocity.normalize() : Vector.Zero;

    for (const obstacle of obstacles) {
      const toObstacle = obstacle.pos.sub(enemy.pos);
      const distance = toObstacle.size;

      if (distance === 0) continue; // Avoid division by zero

      // Calculate repulsion force (closer = stronger)
      const repulsionStrength = 1 - (distance / config.avoidanceRadius);
      const repulsionDirection = toObstacle.normalize().scale(-1); // Away from obstacle

      // Weight by distance (closer obstacles have more influence)
      const weightedRepulsion = repulsionDirection.scale(repulsionStrength);
      avoidanceVector = avoidanceVector.add(weightedRepulsion);
    }

    // Normalize and scale by avoidance force
    if (avoidanceVector.size > 0) {
      avoidanceVector = avoidanceVector.normalize().scale(config.avoidanceForce);

      // Limit deviation angle from desired direction
      if (movementDirection.size > 0) {
        const dotProduct = avoidanceVector.dot(movementDirection);
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

        if (angle > config.maxAvoidanceAngle) {
          // Rotate avoidance vector to stay within max angle
          const perpVector = new Vector(-movementDirection.y, movementDirection.x);
          const sign = avoidanceVector.dot(perpVector) >= 0 ? 1 : -1;
          const limitedAngle = config.maxAvoidanceAngle;
          avoidanceVector = movementDirection
            .scale(Math.cos(limitedAngle))
            .add(perpVector.scale(sign * Math.sin(limitedAngle)))
            .normalize()
            .scale(config.avoidanceForce);
        }
      }
    }

    return avoidanceVector;
  }

  /**
   * Apply obstacle avoidance to a desired velocity
   * @param enemy The enemy actor
   * @param desiredVelocity The desired movement velocity (before avoidance)
   * @param engine The game engine
   * @param config Optional configuration override
   * @returns Adjusted velocity with obstacle avoidance applied
   */
  public static applyObstacleAvoidance(
    enemy: Actor,
    desiredVelocity: Vector,
    engine: Engine,
    config?: Partial<AvoidanceConfig>
  ): Vector {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Detect obstacles ahead
    const obstacles = this.detectObstaclesAhead(enemy, desiredVelocity, engine, finalConfig);

    // If no obstacles, return desired velocity as-is
    if (obstacles.length === 0) {
      return desiredVelocity;
    }

    // Calculate avoidance vector
    const avoidanceVector = this.calculateAvoidanceVector(
      enemy,
      obstacles,
      desiredVelocity,
      finalConfig
    );

    // Blend desired velocity with avoidance
    // Scale desired velocity by (1 - avoidanceForce) and add avoidance
    const desiredMagnitude = desiredVelocity.size;
    const blendedDirection = desiredVelocity
      .normalize()
      .scale(1 - finalConfig.avoidanceForce)
      .add(avoidanceVector);

    // Normalize and restore original magnitude
    if (blendedDirection.size > 0) {
      return blendedDirection.normalize().scale(desiredMagnitude);
    }

    // Fallback: if blending results in zero vector, use perpendicular avoidance
    if (desiredVelocity.size > 0) {
      const perpVector = new Vector(-desiredVelocity.y, desiredVelocity.x).normalize();
      return perpVector.scale(desiredMagnitude * finalConfig.avoidanceForce);
    }

    return Vector.Zero;
  }

  /**
   * Check if enemy is stuck (velocity near zero for extended period)
   * This can help detect when enemy needs to try alternative path
   * @param enemy The enemy actor
   * @param lastStuckCheck Time of last stuck check (in milliseconds)
   * @param stuckThreshold Time threshold to consider stuck (in milliseconds)
   * @returns True if enemy appears stuck
   */
  public static isStuck(
    enemy: Actor,
    lastStuckCheck: number,
    stuckThreshold: number = 1000
  ): boolean {
    const currentTime = Date.now();
    const timeSinceLastCheck = currentTime - lastStuckCheck;

    // Check if velocity is very low
    if (enemy.vel.size < 5 && timeSinceLastCheck > stuckThreshold) {
      return true;
    }

    return false;
  }
}

