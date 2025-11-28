import { Actor, Engine, Vector, CollisionType, Color } from 'excalibur';
import { ObstacleCollisionGroupConfig } from '@/CollisionGroups';
import { GameConfig } from '@/config';

export class Obstacle extends Actor {
    constructor(position: Vector, width?: number, height?: number) {
        super({
            pos: position,
            width: width ?? GameConfig.obstacle.size,
            height: height ?? GameConfig.obstacle.size,
            color: Color.Gray,
            collisionType: CollisionType.Fixed, // Immovable
            collisionGroup: ObstacleCollisionGroupConfig, // Base group
        });

    }

    public onInitialize(_engine: Engine): void {
        // Setup complete
    }
}

