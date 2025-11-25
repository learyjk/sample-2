import { Actor, Engine, Vector, CollisionType, Color, PreCollisionEvent, CollisionGroup } from 'excalibur';
import { GameConfig } from '@/config';
import { ProjectileCollisionGroupConfig } from '@/CollisionGroups';
import { Enemy } from '@/Actors/enemies/Enemy';
import { Obstacle } from '@/Actors/Obstacle';

export class Projectile extends Actor {
    private speed: number = GameConfig.projectile.speed; // pixels per second
    private targetPosition: Vector;
    public hitEnemy: boolean = false; // Track if this projectile hit an enemy

    constructor(startPosition: Vector, targetPosition: Vector, collisionGroup?: CollisionGroup) {
        // Calculate projectile radius as a small percentage of game width
        const radius = GameConfig.width * 0.001;

        super({
            pos: startPosition.clone(),
            radius: radius,
            color: Color.White,
            collisionType: CollisionType.Passive,
            collisionGroup: collisionGroup || ProjectileCollisionGroupConfig,
        });

        this.targetPosition = targetPosition;
    }

    public onInitialize(_engine: Engine): void {
        // Calculate direction towards target
        const directionVector = this.targetPosition.sub(this.pos);
        const direction = directionVector.normalize();
        this.vel = direction.scale(this.speed);

        // Use precollision event like the Galaga bullet
        this.on('precollision', (evt) => this.onPreCollision(evt));

        // Clean up on exit viewport like the Galaga bullet
        this.on('exitviewport', () => this.kill());
    }

    private onPreCollision(evt: PreCollisionEvent): void {
        // Check if we hit an enemy (check evt.other.owner for the Actor, like Galaga pattern)
        if (evt.other.owner instanceof Enemy) {
            if (!this.hitEnemy) {
                this.hitEnemy = true;
                // Emit event so player can track accuracy
                this.emit('hitEnemy', { enemy: evt.other.owner });
                this.kill();
            }
        }

        // Check if we hit an obstacle
        if (evt.other.owner instanceof Obstacle) {
            this.kill();
        }
    }
}

