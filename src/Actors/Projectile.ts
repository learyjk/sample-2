import { Actor, Engine, Vector, CollisionType, Color, PreCollisionEvent, CollisionGroup } from 'excalibur';
import { GameConfig } from '@/config';
import { ProjectileCollisionGroupConfig, EnemyProjectileCollisionGroupConfig } from '@/CollisionGroups';
import { Obstacle } from '@/Actors/Obstacle';

export class Projectile extends Actor {
    private speed: number = GameConfig.projectile.speed; // pixels per second
    private targetPosition: Vector;
    public hitEnemy: boolean = false; // Track if this projectile hit an enemy
    public isEnemyProjectile: boolean = false; // Track if this is an enemy projectile
    public damage: number = GameConfig.projectile.damage;

    constructor(startPosition: Vector, targetPosition: Vector, collisionGroup?: CollisionGroup, isEnemyProjectile: boolean = false, speed?: number, damage?: number) {
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
        if (damage !== undefined) {
            this.damage = damage;
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
        const other = evt.other.owner;
        if (!other) return;

        // Helper to check if actor has takeDamage method
        const isDamageable = (actor: any): actor is { takeDamage: (amount: number) => void } => {
            return actor && typeof actor.takeDamage === 'function';
        };

        // Player projectiles hit enemies
        if (!this.isEnemyProjectile) {
            // Check if it's damageable and NOT the player (to be safe)
            if (isDamageable(other) && other.name !== 'player') {
                if (!this.hitEnemy) {
                    this.hitEnemy = true;
                    other.takeDamage(this.damage);

                    // Emit event so player can track accuracy
                    this.emit('hitEnemy', { enemy: other });
                    this.kill();
                }
            }
        }

        // Enemy projectiles hit player
        if (this.isEnemyProjectile) {
            // Check if it's damageable and IS the player
            if (isDamageable(other) && other.name === 'player') {
                other.takeDamage(this.damage);
                this.kill();
            }
        }

        // All projectiles hit obstacles
        if (evt.other.owner instanceof Obstacle) {
            this.kill();
        }
    }
}

