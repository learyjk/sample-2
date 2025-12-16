import { Actor, Engine, Vector, CollisionType, Color } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { ObstacleCollisionGroupConfig } from '@/CollisionGroups';
import { GameConfig } from '@/config';

// Arcade color palette
const ARCADE_MAGENTA = Color.fromHex("#ff00ff");
const ARCADE_BG = Color.fromHex("#1a1a2e");

export class Obstacle extends Actor {
    private obstacleWidth: number;
    private obstacleHeight: number;

    constructor(position: Vector, width?: number, height?: number) {
        const w = width ?? GameConfig.obstacle.size;
        const h = height ?? GameConfig.obstacle.size;

        super({
            pos: position,
            width: w,
            height: h,
            color: ARCADE_BG,
            collisionType: CollisionType.Fixed, // Immovable
            collisionGroup: ObstacleCollisionGroupConfig, // Base group
        });

        this.obstacleWidth = w;
        this.obstacleHeight = h;
    }

    public onInitialize(_engine: Engine): void {
        // Arcade-styled obstacle rendering
        this.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
            const w = this.obstacleWidth;
            const h = this.obstacleHeight;

            // Draw border with neon glow effect
            const borderColor = ARCADE_MAGENTA;
            const borderOpacity = 0.6;

            ctx.save();
            ctx.opacity = borderOpacity;

            // Top border
            ctx.drawLine(
                new Vector(-w / 2, -h / 2),
                new Vector(w / 2, -h / 2),
                borderColor,
                2
            );

            // Bottom border
            ctx.drawLine(
                new Vector(-w / 2, h / 2),
                new Vector(w / 2, h / 2),
                borderColor,
                2
            );

            // Left border
            ctx.drawLine(
                new Vector(-w / 2, -h / 2),
                new Vector(-w / 2, h / 2),
                borderColor,
                2
            );

            // Right border
            ctx.drawLine(
                new Vector(w / 2, -h / 2),
                new Vector(w / 2, h / 2),
                borderColor,
                2
            );

            // Corner accents
            const cornerSize = Math.min(8, w / 4, h / 4);
            ctx.opacity = 1;

            // Top-left corner
            ctx.drawLine(
                new Vector(-w / 2, -h / 2),
                new Vector(-w / 2 + cornerSize, -h / 2),
                borderColor,
                3
            );
            ctx.drawLine(
                new Vector(-w / 2, -h / 2),
                new Vector(-w / 2, -h / 2 + cornerSize),
                borderColor,
                3
            );

            // Top-right corner
            ctx.drawLine(
                new Vector(w / 2, -h / 2),
                new Vector(w / 2 - cornerSize, -h / 2),
                borderColor,
                3
            );
            ctx.drawLine(
                new Vector(w / 2, -h / 2),
                new Vector(w / 2, -h / 2 + cornerSize),
                borderColor,
                3
            );

            // Bottom-left corner
            ctx.drawLine(
                new Vector(-w / 2, h / 2),
                new Vector(-w / 2 + cornerSize, h / 2),
                borderColor,
                3
            );
            ctx.drawLine(
                new Vector(-w / 2, h / 2),
                new Vector(-w / 2, h / 2 - cornerSize),
                borderColor,
                3
            );

            // Bottom-right corner
            ctx.drawLine(
                new Vector(w / 2, h / 2),
                new Vector(w / 2 - cornerSize, h / 2),
                borderColor,
                3
            );
            ctx.drawLine(
                new Vector(w / 2, h / 2),
                new Vector(w / 2, h / 2 - cornerSize),
                borderColor,
                3
            );

            ctx.restore();
        };
    }
}
