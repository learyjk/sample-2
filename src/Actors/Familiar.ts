import { Actor, Engine, Vector, Color, CollisionType } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { GameConfig } from '@/config';
import { FamiliarCollisionGroupConfig } from '@/CollisionGroups';
import { Player } from './Player';

// Arcade color palette
const ARCADE_YELLOW = Color.fromHex("#ffff00");
const TETHER_COLOR = Color.fromHex("#ffff00");
const AURA_COLOR = Color.fromHex("#ffff0015");
const AURA_BORDER_COLOR = Color.fromHex("#ffff0040");

export class Familiar extends Actor {
    private player: Player;
    private followDistance: number = GameConfig.familiar.followDistance;
    private speed: number = GameConfig.player.speed * GameConfig.familiar.speedRatio;
    private isTethered: boolean = false;
    private tetherRadius: number = GameConfig.familiar.tetherRadius;
    private pulseTime: number = 0;

    constructor(player: Player) {
        super({
            name: 'Familiar',
            pos: player.pos.clone().add(new Vector(-50, -50)),
            radius: GameConfig.width * GameConfig.familiar.radiusPercent,
            color: ARCADE_YELLOW,
            collisionType: CollisionType.Passive,
            collisionGroup: FamiliarCollisionGroupConfig
        });
        this.player = player;
    }

    /**
     * Future upgrade: Command familiar to move to a specific location
     * Would break follow mode and deploy stationary aura at target
     */
    public commandToLocation(_target: Vector) {
        // TODO: Implement command behavior
        // 1. Break follow mode
        // 2. Move to target location
        // 3. Deploy stationary aura at target
    }

    onInitialize(_engine: Engine) {
        // Validate player has required methods
        if (typeof this.player.activateTetherBuff !== 'function') {
            console.error('Familiar: Player instance missing activateTetherBuff method!', this.player);
        }

        /**
         * Setup arcade-styled visual rendering for familiar
         * Draws tether line when active and pulsing aura radius indicator
         */
        this.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
            // Draw tether line connecting familiar to player when tethered
            if (this.isTethered) {
                // Animated tether line with dashes
                const direction = this.player.pos.sub(this.pos);
                ctx.drawLine(Vector.Zero, direction, TETHER_COLOR, 2);

                // Draw small energy particles along tether
                const distance = direction.size;
                const particleCount = Math.floor(distance / 30);
                const normalizedDir = direction.normalize();

                for (let i = 1; i < particleCount; i++) {
                    const offset = (i / particleCount) * distance;
                    const particlePos = normalizedDir.scale(offset);
                    // Pulse effect based on time
                    const pulseOffset = (this.pulseTime + i * 0.5) % 1;
                    const particleSize = 2 + pulseOffset * 2;
                    ctx.drawCircle(particlePos, particleSize, TETHER_COLOR);
                }
            }

            // Draw aura radius circle with arcade styling
            // Outer ring
            ctx.drawCircle(Vector.Zero, this.tetherRadius, AURA_COLOR);

            // Pulsing border ring
            const pulseScale = 0.95 + Math.sin(this.pulseTime * Math.PI * 2) * 0.05;
            const borderRadius = this.tetherRadius * pulseScale;

            // Draw dashed circle border
            const segments = 32;
            for (let i = 0; i < segments; i += 2) {
                const angle1 = (i / segments) * Math.PI * 2;
                const angle2 = ((i + 1) / segments) * Math.PI * 2;
                const p1 = new Vector(
                    Math.cos(angle1) * borderRadius,
                    Math.sin(angle1) * borderRadius
                );
                const p2 = new Vector(
                    Math.cos(angle2) * borderRadius,
                    Math.sin(angle2) * borderRadius
                );
                ctx.drawLine(p1, p2, AURA_BORDER_COLOR, 1);
            }

            // Inner glow when tethered
            if (this.isTethered) {
                ctx.drawCircle(Vector.Zero, this.radius * 1.5, Color.fromHex("#ffff0040"));
            }
        };
    }

    onPreUpdate(_engine: Engine, delta: number) {
        // Update pulse animation
        this.pulseTime = (this.pulseTime + delta / 1000) % 1;

        const distance = this.pos.distance(this.player.pos);

        /**
         * Follow behavior: Move toward player if too far away
         * Uses smooth deceleration when within follow distance
         */
        if (distance > this.followDistance) {
            const direction = this.player.pos.sub(this.pos).normalize();
            this.vel = direction.scale(this.speed);
        } else {
            // Smooth deceleration when close enough
            this.vel = this.vel.scale(0.9);
        }

        /**
         * Tether activation: Activate buff when within tether radius
         * Deactivate when player moves away
         */
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
