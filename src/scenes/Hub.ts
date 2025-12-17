import { Scene, Engine, Vector, Color, Label, Font, FontUnit, Actor, CollisionType, TextAlign, BaseAlign } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { LevelManager } from '../LevelManager';
import { GameConfig } from '@/config';

// Arcade color palette
const ARCADE_MAGENTA = Color.fromHex("#ff00ff");
const ARCADE_CYAN = Color.fromHex("#00ffff");
const ARCADE_YELLOW = Color.fromHex("#ffff00");

export class Hub extends Scene {
    private startButton: HTMLButtonElement | null = null;
    private titleLabel: Label | null = null;
    private subtitleLabel: Label | null = null;
    private levelLabel: Label | null = null;
    private instructionsLabel: Label | null = null;
    private blinkLabel: Label | null = null;
    private backgroundActor: Actor | null = null;
    private decorativeLines: Actor[] = [];

    onInitialize(engine: Engine): void {
        // Create animated background with grid pattern
        this.backgroundActor = new Actor({
            pos: new Vector(engine.halfDrawWidth, engine.halfDrawHeight),
            width: GameConfig.width,
            height: GameConfig.height,
            color: Color.Transparent,
            collisionType: CollisionType.PreventCollision,
            z: -100
        });

        // Custom draw for animated background
        this.backgroundActor.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
            // Draw grid lines
            const gridSize = 50;
            const lineColor = Color.fromHex("#ff00ff15");

            for (let x = 0; x <= GameConfig.width; x += gridSize) {
                ctx.drawLine(
                    new Vector(x - GameConfig.width / 2, -GameConfig.height / 2),
                    new Vector(x - GameConfig.width / 2, GameConfig.height / 2),
                    lineColor,
                    1
                );
            }
            for (let y = 0; y <= GameConfig.height; y += gridSize) {
                ctx.drawLine(
                    new Vector(-GameConfig.width / 2, y - GameConfig.height / 2),
                    new Vector(GameConfig.width / 2, y - GameConfig.height / 2),
                    lineColor,
                    1
                );
            }
        };
        this.add(this.backgroundActor);

        // Create decorative corner lines
        this.createDecorativeElements(engine);

        // Main title - NEON STRIKER
        this.titleLabel = new Label({
            text: 'NEON STRIKER',
            pos: new Vector(engine.halfDrawWidth, 180),
            font: new Font({
                size: 32,
                unit: FontUnit.Px,
                color: ARCADE_MAGENTA,
                family: '"Press Start 2P", monospace',
                textAlign: TextAlign.Center,
                baseAlign: BaseAlign.Middle,
                shadow: {
                    blur: 15,
                    offset: new Vector(0, 0),
                    color: ARCADE_MAGENTA
                }
            })
        });
        this.add(this.titleLabel);

        // Subtitle
        this.subtitleLabel = new Label({
            text: '/// ARCADE SHOOTER ///',
            pos: new Vector(engine.halfDrawWidth, 230),
            font: new Font({
                size: 14,
                unit: FontUnit.Px,
                color: ARCADE_CYAN,
                family: '"Orbitron", monospace',
                textAlign: TextAlign.Center,
                baseAlign: BaseAlign.Middle,
                shadow: {
                    blur: 10,
                    offset: new Vector(0, 0),
                    color: ARCADE_CYAN
                }
            })
        });
        this.add(this.subtitleLabel);

        // Level info
        this.levelLabel = new Label({
            text: `STAGE ${LevelManager.getInstance().getCurrentLevel()}`,
            pos: new Vector(engine.halfDrawWidth, 320),
            font: new Font({
                size: 20,
                unit: FontUnit.Px,
                color: ARCADE_YELLOW,
                family: '"Press Start 2P", monospace',
                textAlign: TextAlign.Center,
                baseAlign: BaseAlign.Middle,
                shadow: {
                    blur: 8,
                    offset: new Vector(0, 0),
                    color: ARCADE_YELLOW
                }
            })
        });
        this.add(this.levelLabel);

        // Instructions
        this.instructionsLabel = new Label({
            text: 'WASD MOVE • SPACE SHOOT • / NOVA BLAST',
            pos: new Vector(engine.halfDrawWidth, 550),
            font: new Font({
                size: 9,
                unit: FontUnit.Px,
                color: Color.fromHex("#8888aa"),
                family: '"Press Start 2P", monospace',
                textAlign: TextAlign.Center,
                baseAlign: BaseAlign.Middle
            })
        });
        this.add(this.instructionsLabel);

        // Blinking "INSERT COIN" style text
        this.blinkLabel = new Label({
            text: '>>> PRESS START <<<',
            pos: new Vector(engine.halfDrawWidth, 620),
            font: new Font({
                size: 12,
                unit: FontUnit.Px,
                color: ARCADE_CYAN,
                family: '"Press Start 2P", monospace',
                textAlign: TextAlign.Center,
                baseAlign: BaseAlign.Middle,
                shadow: {
                    blur: 10,
                    offset: new Vector(0, 0),
                    color: ARCADE_CYAN
                }
            })
        });
        this.add(this.blinkLabel);

        // Credit text
        const creditLabel = new Label({
            text: 'BUILT WITH EXCALIBUR.JS',
            pos: new Vector(engine.halfDrawWidth, 750),
            font: new Font({
                size: 8,
                unit: FontUnit.Px,
                color: Color.fromHex("#444466"),
                family: '"Orbitron", monospace',
                textAlign: TextAlign.Center,
                baseAlign: BaseAlign.Middle
            })
        });
        this.add(creditLabel);
    }

    private createDecorativeElements(engine: Engine): void {
        // Top-left corner decoration
        const cornerSize = 80;
        const cornerThickness = 3;

        // Create corner bracket actors
        const corners = [
            { x: 30, y: 30, flipX: false, flipY: false },
            { x: GameConfig.width - 30, y: 30, flipX: true, flipY: false },
            { x: 30, y: GameConfig.height - 30, flipX: false, flipY: true },
            { x: GameConfig.width - 30, y: GameConfig.height - 30, flipX: true, flipY: true }
        ];

        corners.forEach(corner => {
            const actor = new Actor({
                pos: new Vector(corner.x, corner.y),
                width: cornerSize,
                height: cornerSize,
                color: Color.Transparent,
                collisionType: CollisionType.PreventCollision,
                z: 10
            });

            actor.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
                const xDir = corner.flipX ? -1 : 1;
                const yDir = corner.flipY ? -1 : 1;

                // Horizontal line
                ctx.drawLine(
                    Vector.Zero,
                    new Vector(cornerSize * xDir * 0.6, 0),
                    ARCADE_CYAN,
                    cornerThickness
                );

                // Vertical line
                ctx.drawLine(
                    Vector.Zero,
                    new Vector(0, cornerSize * yDir * 0.6),
                    ARCADE_CYAN,
                    cornerThickness
                );
            };

            this.add(actor);
            this.decorativeLines.push(actor);
        });
    }

    onActivate(context: any): void {
        const engine = context.engine;

        // Update level info
        if (this.levelLabel) {
            this.levelLabel.text = `STAGE ${LevelManager.getInstance().getCurrentLevel()}`;
        }

        // Start blink animation
        if (this.blinkLabel) {
            let visible = true;
            const blinkInterval = setInterval(() => {
                if (this.blinkLabel) {
                    this.blinkLabel.graphics.opacity = visible ? 1 : 0;
                    visible = !visible;
                }
            }, 500);

            // Store interval for cleanup
            (this as any)._blinkInterval = blinkInterval;
        }

        // Create arcade-styled HTML button
        this.startButton = document.createElement('button');
        this.startButton.textContent = 'START GAME';
        this.startButton.style.position = 'absolute';
        this.startButton.style.top = '52%';
        this.startButton.style.left = '50%';
        this.startButton.style.transform = 'translate(-50%, -50%)';
        this.startButton.style.zIndex = '100';
        // Additional arcade styling applied via CSS

        this.startButton.onclick = () => {
            // Play a "click" effect by briefly changing button state
            if (this.startButton) {
                this.startButton.style.transform = 'translate(-50%, -50%) scale(0.95)';
                setTimeout(() => {
                    engine.goToScene('level');
                }, 100);
            }
        };

        document.body.appendChild(this.startButton);
    }

    onDeactivate(): void {
        // Clear blink interval
        if ((this as any)._blinkInterval) {
            clearInterval((this as any)._blinkInterval);
            (this as any)._blinkInterval = null;
        }

        // Remove button
        if (this.startButton && this.startButton.parentNode) {
            this.startButton.parentNode.removeChild(this.startButton);
            this.startButton = null;
        }
    }
}
