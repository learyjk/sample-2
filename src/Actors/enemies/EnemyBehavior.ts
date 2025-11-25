import { Engine, Actor } from 'excalibur';

/**
 * Interface for enemy behaviors.
 * Each enemy can have different movement and shooting patterns.
 */
export interface IEnemyBehavior {
    /**
     * Update enemy movement. Called every frame.
     * @param enemy The enemy actor
     * @param engine The game engine
     * @param delta Time since last frame in milliseconds
     */
    updateMovement(enemy: Actor, engine: Engine, delta: number): void;

    /**
     * Update enemy shooting. Called every frame.
     * @param enemy The enemy actor
     * @param engine The game engine
     * @param delta Time since last frame in milliseconds
     */
    updateShooting(enemy: Actor, engine: Engine, delta: number): void;

    /**
     * Called when the behavior is initialized (when enemy is added to scene)
     */
    onInitialize?(enemy: Actor, engine: Engine): void;
}

