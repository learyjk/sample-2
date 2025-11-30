import { Actor, Engine, Vector, Color, CollisionType } from 'excalibur';
import { GameConfig } from '@/config';
import { FamiliarCollisionGroupConfig } from '@/CollisionGroups';
import { Player } from './Player';

/**
 * Familiar visual constants using Material Design color palette
 */
const FAMILIAR_COLOR = Color.fromHex("#ffeb3b"); // Material Yellow 500
const TETHER_COLOR = Color.fromHex("#ffeb3b"); // Matches familiar
const AURA_COLOR = Color.fromHex("#ffff0020"); // Transparent Yellow

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
            color: FAMILIAR_COLOR,
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
         * Setup visual rendering for familiar
         * Draws tether line when active and aura radius indicator
         */
        this.graphics.onPostDraw = (ctx) => {
            // Draw tether line connecting familiar to player when tethered
            if (this.isTethered) {
                ctx.drawLine(Vector.Zero, this.player.pos.sub(this.pos), TETHER_COLOR, 2);
            }

            // Draw aura radius circle (faint yellow)
            ctx.drawCircle(Vector.Zero, this.tetherRadius, AURA_COLOR);
        };
    }

    onPreUpdate(_engine: Engine, _delta: number) {
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
