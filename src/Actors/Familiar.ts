import { Actor, Engine, Vector, Color, CollisionType } from 'excalibur';
import { GameConfig } from '@/config';
import { FamiliarCollisionGroupConfig } from '@/CollisionGroups';
import { Player } from './Player';

export class Familiar extends Actor {
    private player: Player;
    private followDistance: number = GameConfig.familiar.followDistance;
    private speed: number = GameConfig.player.speed * GameConfig.familiar.speedRatio;
    private isTethered: boolean = false;
    private tetherRadius: number = GameConfig.familiar.tetherRadius;

    constructor(player: Player) {
        super({
            name: 'Familiar',
            pos: player.pos.clone().add(new Vector(-50, -50)),
            radius: GameConfig.width * GameConfig.familiar.radiusPercent,
            color: Color.Yellow,
            collisionType: CollisionType.Passive, // Triggers events but doesn't physically resolve? Or Active? 
            // Used Passive to detect overlaps if needed, but for now avoiding physics.
            collisionGroup: FamiliarCollisionGroupConfig
        });
        this.player = player;
    }

    // Potential future upgrade: Command ability
    public commandToLocation(target: Vector) {
        // Implementation for "Cast-like" behavior:
        // 1. Break follow mode
        // 2. Move to target
        // 3. Deploy stationary aura
    }

    onInitialize(engine: Engine) {
        // Debug check
        if (typeof this.player.activateTetherBuff !== 'function') {
            console.error('Familiar: Player instance missing activateTetherBuff method!', this.player);
        }

        // Visuals for the Familiar (e.g. a simple glowing orb)
        this.graphics.onPostDraw = (ctx) => {
            // Draw Tether if active
            if (this.isTethered) {
                ctx.drawLine(Vector.Zero, this.player.pos.sub(this.pos), Color.Yellow, 2);
            }

            // Draw Aura Radius (faint)
            ctx.drawCircle(Vector.Zero, this.tetherRadius, Color.fromHex('#FFFF0015'));
        };
    }

    onPreUpdate(engine: Engine, delta: number) {
        const distance = this.pos.distance(this.player.pos);

        // Follow Logic
        if (distance > this.followDistance) {
            const direction = this.player.pos.sub(this.pos).normalize();
            this.vel = direction.scale(this.speed);
        } else {
            // Slow down or stop
            this.vel = this.vel.scale(0.9);
        }

        // Tether Logic
        if (distance <= this.tetherRadius) {
            if (!this.isTethered) {
                this.activateTether();
            }
        } else {
            if (this.isTethered) {
                this.deactivateTether();
            }
        }
    }

    private activateTether() {
        if (this.player.activateTetherBuff) {
            this.isTethered = true;
            this.player.activateTetherBuff();
        } else {
            console.warn("Familiar attempting to tether, but player.activateTetherBuff is missing.");
        }
    }

    private deactivateTether() {
        if (this.player.deactivateTetherBuff) {
            this.isTethered = false;
            this.player.deactivateTetherBuff();
        }
    }
}

