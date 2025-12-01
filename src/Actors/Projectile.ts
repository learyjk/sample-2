import { Actor, Engine, Vector, CollisionType, Color, PreCollisionEvent, CollisionGroup } from 'excalibur';
import { GameConfig } from '@/config';
import { ProjectileCollisionGroupConfig, EnemyProjectileCollisionGroupConfig } from '@/CollisionGroups';
import { Obstacle } from '@/Actors/Obstacle';
import { ParticleSystem } from '@/utils/ParticleSystem';

export class Projectile extends Actor {
    private speed: number = GameConfig.projectile.speed; // pixels per second
    private targetPosition: Vector;
    public hitEnemy: boolean = false; // Track if this projectile hit an enemy
    public isEnemyProjectile: boolean = false; // Track if this is an enemy projectile
    public damage: number = GameConfig.projectile.damage;
    private trailTimer: number = 0;
    private readonly TRAIL_INTERVAL: number = 30; // Create trail particle every 30ms

    constructor(startPosition: Vector, targetPosition: Vector, collisionGroup?: CollisionGroup, isEnemyProjectile: boolean = false, speed?: number, damage?: number) {
        // Calculate projectile radius as a small percentage of game width
        const radius = GameConfig.width * 0.0025;

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

    public onPreUpdate(engine: Engine, delta: number): void {
        // Create trail particles periodically
        this.trailTimer += delta;
        if (this.trailTimer >= this.TRAIL_INTERVAL) {
            const trailColor = this.isEnemyProjectile
                ? Color.fromHex("#ff9800") // Orange for enemy projectiles
                : Color.fromHex("#90caf9"); // Light blue for player projectiles
            ParticleSystem.createTrail(engine, this.pos.clone(), trailColor);
            this.trailTimer = 0;
        }
    }

    private onPreCollision(evt: PreCollisionEvent): void {
        const other = evt.other.owner;
        if (!other) return;

        // Helper to check if actor has takeDamage method
        const isDamageable = (actor: any): actor is { takeDamage: (amount: number) => void } => {
            return actor && typeof actor.takeDamage === 'function';
        };

        const impactPosition = this.pos.clone();

        // Player projectiles hit enemies
        if (!this.isEnemyProjectile) {
            // Check if it's damageable and NOT the player (to be safe)
            if (isDamageable(other) && other.name !== 'player') {
                if (!this.hitEnemy) {
                    this.hitEnemy = true;
                    other.takeDamage(this.damage);

                    // Create impact particles (enemy hit)
                    if (this.scene && this.scene.engine) {
                        ParticleSystem.createImpact(this.scene.engine, impactPosition, true);

                        // Screen shake for enemy hits
                        const levelScene = this.scene as any;
                        if (levelScene.getScreenShake) {
                            levelScene.getScreenShake().shake(0.15);
                        }
                    }

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

                // Create impact particles (player hit)
                if (this.scene && this.scene.engine) {
                    ParticleSystem.createImpact(this.scene.engine, impactPosition, false);
                }

                this.kill();
            }
        }

        // All projectiles hit obstacles
        if (evt.other.owner instanceof Obstacle) {
            // Create impact particles for obstacle hits
            if (this.scene && this.scene.engine) {
                ParticleSystem.createImpact(this.scene.engine, impactPosition, false);
            }
            this.kill();
        }
    }
}

