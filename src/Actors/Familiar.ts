import { Actor, Engine, Vector, Color, CollisionType, Keys } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { GameConfig } from '@/config';
import { FamiliarCollisionGroupConfig } from '@/CollisionGroups';
import { Player } from './Player';
import { Enemy } from './enemies/Enemy';
import { ParticleSystem } from '@/utils/ParticleSystem';

// Arcade color palette
const ARCADE_YELLOW = Color.fromHex("#ffff00");
const TETHER_COLOR = Color.fromHex("#ffff00");
const AURA_COLOR = Color.fromHex("#ffff0015");
const AURA_BORDER_COLOR = Color.fromHex("#ffff0040");
const NOVA_COLOR = Color.fromHex("#ff00ff");

export class Familiar extends Actor {
    private player: Player;
    private readonly radius: number;
    private followDistance: number = GameConfig.familiar.followDistance;
    private speed: number = GameConfig.player.speed * GameConfig.familiar.speedRatio;
    private isTethered: boolean = false;
    private tetherRadius: number = GameConfig.familiar.tetherRadius;
    private pulseTime: number = 0;

    // Nova Blast ability state
    private novaBlastCooldown: number = 0;
    private readonly NOVA_BLAST_COOLDOWN: number = GameConfig.familiar.novaBlast.cooldown;
    private readonly NOVA_BLAST_DAMAGE: number = GameConfig.familiar.novaBlast.damage;
    private novaBlastActive: boolean = false;
    private novaBlastTimer: number = 0;
    private readonly NOVA_BLAST_DURATION: number = 300; // Visual effect duration in ms
    private novaBlastHitEnemies: Set<Enemy> = new Set(); // Track enemies already hit by current blast

    constructor(player: Player) {
        const radius = GameConfig.width * GameConfig.familiar.radiusPercent;
        super({
            name: 'Familiar',
            pos: player.pos.clone().add(new Vector(-50, -50)),
            radius: radius,
            color: ARCADE_YELLOW,
            collisionType: CollisionType.Passive,
            collisionGroup: FamiliarCollisionGroupConfig
        });
        this.radius = radius;
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
                const novaCharging = this.novaBlastCooldown <= 0;

                // Animated tether line - changes color when nova ready
                const direction = this.player.pos.sub(this.pos);
                const tetherLineColor = novaCharging ? NOVA_COLOR : TETHER_COLOR;
                ctx.drawLine(Vector.Zero, direction, tetherLineColor, 2);

                // Draw small energy particles along tether
                const distance = direction.size;
                const particleCount = Math.floor(distance / 30);
                const normalizedDir = direction.normalize();

                for (let i = 1; i < particleCount; i++) {
                    const offset = (i / particleCount) * distance;
                    const particlePos = normalizedDir.scale(offset);
                    // Pulse effect based on time - faster when nova ready
                    const pulseSpeed = novaCharging ? 1.5 : 1;
                    const pulseOffset = (this.pulseTime * pulseSpeed + i * 0.5) % 1;
                    const particleSize = novaCharging ? 3 + pulseOffset * 3 : 2 + pulseOffset * 2;
                    const particleColor = novaCharging ? NOVA_COLOR : TETHER_COLOR;
                    ctx.drawCircle(particlePos, particleSize, particleColor);
                }
            }

            // Check if nova blast is ready (tethered and off cooldown)
            const novaReady = this.isTethered && this.novaBlastCooldown <= 0;

            // Draw aura radius circle with arcade styling
            // Aura fill changes color when nova is ready
            const auraFillColor = novaReady ? Color.fromHex("#ff00ff10") : AURA_COLOR;
            ctx.drawCircle(Vector.Zero, this.tetherRadius, auraFillColor);

            // Pulsing border ring - same animation speed/intensity for both states
            const pulseSpeed = 1;
            const pulseAmount = 0.05;
            const pulseScale = 0.95 + Math.sin(this.pulseTime * Math.PI * 2 * pulseSpeed) * pulseAmount;
            const borderRadius = this.tetherRadius * pulseScale;

            // Draw dashed circle border - changes to magenta when nova ready
            const borderColor = novaReady ? NOVA_COLOR.clone() : AURA_BORDER_COLOR;
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
                ctx.drawLine(p1, p2, borderColor, novaReady ? 2 : 1);
            }

            // Inner glow when tethered - magenta when nova ready
            if (this.isTethered) {
                const glowColor = novaReady ? Color.fromHex("#ff00ff40") : Color.fromHex("#ffff0040");
                ctx.drawCircle(Vector.Zero, this.radius * 1.5, glowColor);
            }

            // Nova blast visual effect
            if (this.novaBlastActive) {
                const blastProgress = 1 - (this.novaBlastTimer / this.NOVA_BLAST_DURATION);
                const blastRadius = this.tetherRadius * (0.3 + blastProgress * 0.7);

                // Expanding ring effect
                ctx.drawCircle(Vector.Zero, blastRadius, NOVA_COLOR.clone());

                // Multiple shockwave rings
                for (let i = 0; i < 3; i++) {
                    const ringProgress = Math.max(0, blastProgress - i * 0.15);
                    const ringRadius = this.tetherRadius * ringProgress;
                    const ringOpacity = (1 - ringProgress) * 0.6;

                    // Draw ring segments
                    const ringSegments = 48;
                    for (let j = 0; j < ringSegments; j++) {
                        const angle1 = (j / ringSegments) * Math.PI * 2;
                        const angle2 = ((j + 0.7) / ringSegments) * Math.PI * 2;
                        const p1 = new Vector(
                            Math.cos(angle1) * ringRadius,
                            Math.sin(angle1) * ringRadius
                        );
                        const p2 = new Vector(
                            Math.cos(angle2) * ringRadius,
                            Math.sin(angle2) * ringRadius
                        );
                        const ringColor = NOVA_COLOR.clone();
                        ringColor.a = ringOpacity;
                        ctx.drawLine(p1, p2, ringColor, 3 - i);
                    }
                }
            }

            // Cooldown indicator arc around familiar (always show when on cooldown)
            if (this.novaBlastCooldown > 0) {
                const cooldownProgress = this.novaBlastCooldown / this.NOVA_BLAST_COOLDOWN;

                // Draw cooldown arc - shows remaining cooldown
                const arcRadius = this.radius * 2.5;
                const totalSegments = 24;
                const activeSegments = Math.floor(cooldownProgress * totalSegments);

                for (let i = 0; i < activeSegments; i++) {
                    const angle1 = -Math.PI / 2 + (i / totalSegments) * Math.PI * 2;
                    const angle2 = -Math.PI / 2 + ((i + 0.8) / totalSegments) * Math.PI * 2;
                    const p1 = new Vector(
                        Math.cos(angle1) * arcRadius,
                        Math.sin(angle1) * arcRadius
                    );
                    const p2 = new Vector(
                        Math.cos(angle2) * arcRadius,
                        Math.sin(angle2) * arcRadius
                    );
                    ctx.drawLine(p1, p2, Color.fromHex("#ff00ff60"), 2);
                }
            }
        };
    }

    onPreUpdate(engine: Engine, delta: number) {
        // Update pulse animation
        this.pulseTime = (this.pulseTime + delta / 1000) % 1;

        // Update nova blast cooldown
        if (this.novaBlastCooldown > 0) {
            this.novaBlastCooldown -= delta;
        }

        // Update nova blast visual effect timer and check for collisions
        if (this.novaBlastActive) {
            // Calculate current shockwave radius based on animation progress
            const blastProgress = 1 - (this.novaBlastTimer / this.NOVA_BLAST_DURATION);
            const currentWaveRadius = this.tetherRadius * (0.3 + blastProgress * 0.7);
            const waveThickness = 25; // How thick the damaging wave is

            // Check for enemies that the wave is currently passing through
            this.checkWaveCollisions(engine, currentWaveRadius, waveThickness);

            this.novaBlastTimer -= delta;
            if (this.novaBlastTimer <= 0) {
                this.novaBlastActive = false;
                this.novaBlastHitEnemies.clear(); // Reset hit tracking for next blast
            }
        }

        // Handle Nova Blast input (/ key) - only available when tethered
        if (engine.input.keyboard.wasPressed(Keys.Slash) && this.novaBlastCooldown <= 0 && this.isTethered) {
            this.executeNovaBlast(engine);
        }

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

    /**
     * Execute Nova Blast ability - triggers expanding shockwave that damages enemies on contact
     * High risk/high reward: player must be close to enemies to use effectively
     */
    private executeNovaBlast(engine: Engine): void {
        console.log('Nova Blast activated!');

        // Trigger screen shake for impactful feel
        if (this.scene) {
            const levelScene = this.scene as any;
            if (levelScene.getScreenShake) {
                levelScene.getScreenShake().shake(0.6);
            }
        }

        // Create nova blast particles at familiar position
        ParticleSystem.createNovaBlast(engine, this.pos.clone(), this.tetherRadius);

        // Clear previous hit tracking
        this.novaBlastHitEnemies.clear();

        // Start visual effect and cooldown
        this.novaBlastActive = true;
        this.novaBlastTimer = this.NOVA_BLAST_DURATION;
        this.novaBlastCooldown = this.NOVA_BLAST_COOLDOWN;
    }

    /**
     * Check for enemies colliding with the current shockwave radius
     * Damages enemies when the wave reaches them (only once per blast)
     * Uses familiar's current position so the wave visual and damage stay in sync
     */
    private checkWaveCollisions(engine: Engine, waveRadius: number, waveThickness: number): void {
        // Find all enemies in the scene
        const enemies = engine.currentScene.actors.filter(actor => actor instanceof Enemy) as Enemy[];

        for (const enemy of enemies) {
            // Skip if already hit by this blast
            if (this.novaBlastHitEnemies.has(enemy)) continue;

            // Skip if enemy is already dead
            if (enemy.isKilled()) continue;

            // Calculate distance from familiar's current position to enemy
            // This matches the visual which is drawn relative to the familiar
            const distanceToEnemy = this.pos.distance(enemy.pos);

            // Check if enemy is within the wave band (between inner and outer edge of wave)
            const innerEdge = Math.max(0, waveRadius - waveThickness / 2);
            const outerEdge = waveRadius + waveThickness / 2;

            if (distanceToEnemy >= innerEdge && distanceToEnemy <= outerEdge) {
                // Wave has reached this enemy - deal damage!
                enemy.takeDamage(this.NOVA_BLAST_DAMAGE);

                // Mark as hit so we don't damage again
                this.novaBlastHitEnemies.add(enemy);

                // Create hit particles on the enemy
                ParticleSystem.createNovaHit(engine, enemy.pos.clone());

                console.log(`Nova wave hit enemy at distance ${distanceToEnemy.toFixed(0)} for ${this.NOVA_BLAST_DAMAGE} damage!`);
            }
        }
    }

    /**
     * Check if nova blast is ready to use
     */
    public isNovaBlastReady(): boolean {
        return this.novaBlastCooldown <= 0;
    }

    /**
     * Get nova blast cooldown percentage (0 = ready, 1 = just used)
     */
    public getNovaBlastCooldownPercent(): number {
        return Math.max(0, this.novaBlastCooldown / this.NOVA_BLAST_COOLDOWN);
    }
}
