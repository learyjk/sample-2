import { Actor, Engine, Vector, CollisionType, Color, PreCollisionEvent, CollisionGroup } from 'excalibur';
import { GameConfig } from '@/config';
import { ProjectileCollisionGroupConfig, EnemyProjectileCollisionGroupConfig } from '@/CollisionGroups';
import { Enemy } from '@/Actors/enemies/Enemy';
import { Obstacle } from '@/Actors/Obstacle';
import { Player } from '@/Actors/Player';

export class Projectile extends Actor {
    private speed: number = GameConfig.projectile.speed; // pixels per second
    private targetPosition: Vector;
    public hitEnemy: boolean = false; // Track if this projectile hit an enemy
    public isEnemyProjectile: boolean = false; // Track if this is an enemy projectile

    constructor(startPosition: Vector, targetPosition: Vector, collisionGroup?: CollisionGroup, isEnemyProjectile: boolean = false, speed?: number) {
        // Calculate projectile radius as a small percentage of game width
        const radius = GameConfig.width * 0.001;

        super({
            pos: startPosition.clone(),
            radius: radius,
            color: isEnemyProjectile ? Color.Orange : Color.White,
            collisionType: CollisionType.Passive,
            collisionGroup: collisionGroup || (isEnemyProjectile ? EnemyProjectileCollisionGroupConfig : ProjectileCollisionGroupConfig),
        });

        this.targetPosition = targetPosition;
        this.isEnemyProjectile = isEnemyProjectile;
        if (speed !== undefined) {
            this.speed = speed;
        }
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
        // Player projectiles hit enemies
        if (!this.isEnemyProjectile && evt.other.owner instanceof Enemy) {
            if (!this.hitEnemy) {
                this.hitEnemy = true;
                // Emit event so player can track accuracy
                this.emit('hitEnemy', { enemy: evt.other.owner });
                this.kill();
            }
        }

        // Enemy projectiles hit player
        if (this.isEnemyProjectile && evt.other.owner instanceof Player) {
            console.log('💥 Player was hit by enemy bullet! 💥');
            this.kill();
        }

        // All projectiles hit obstacles
        if (evt.other.owner instanceof Obstacle) {
            this.kill();
        }
    }
}

