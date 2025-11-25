import { CollisionGroupManager, CollisionGroup } from 'excalibur';

/**
 * Collision groups for the game.
 * Using CollisionGroupManager.create to define distinct categories (identities).
 */
export const PlayerCollisionGroup = CollisionGroupManager.create('player');
export const EnemyCollisionGroup = CollisionGroupManager.create('enemy');
export const ProjectileCollisionGroup = CollisionGroupManager.create('projectile');
export const ObstacleCollisionGroup = CollisionGroupManager.create('obstacle');

/**
 * Helper to combine identity with collision mask.
 * This ensures the actor retains its Identity (Category) while having a specific Collision Mask.
 */
const createConfig = (identity: CollisionGroup, collidesWith: CollisionGroup[]) => {
    const maskGroup = CollisionGroup.collidesWith(collidesWith);
    return CollisionGroup.combine([identity, maskGroup]);
};

/**
 * Configuration for actors.
 * These groups define what the actor IS and what it COLLIDES with.
 */
export const PlayerCollisionGroupConfig = createConfig(PlayerCollisionGroup, [
    EnemyCollisionGroup,
    ObstacleCollisionGroup
]);

export const EnemyCollisionGroupConfig = createConfig(EnemyCollisionGroup, [
    PlayerCollisionGroup,
    ProjectileCollisionGroup,
    ObstacleCollisionGroup
]);

export const ProjectileCollisionGroupConfig = createConfig(ProjectileCollisionGroup, [
    EnemyCollisionGroup,
    ObstacleCollisionGroup
]);

export const ObstacleCollisionGroupConfig = createConfig(ObstacleCollisionGroup, [
    PlayerCollisionGroup,
    EnemyCollisionGroup,
    ProjectileCollisionGroup
]);

