import { Actor, Engine, Vector, Color, Circle } from 'excalibur';

/**
 * Simple particle for visual effects
 */
class Particle extends Actor {
    private lifetime: number = 0;
    private maxLifetime: number = 0;
    private startColor: Color;
    private endColor: Color;
    private startSize: number;
    private endSize: number;
    private velocity: Vector;

    constructor(
        position: Vector,
        velocity: Vector,
        color: Color,
        endColor: Color,
        size: number,
        endSize: number,
        lifetime: number
    ) {
        super({
            pos: position.clone(),
            radius: size / 2,
            color: color,
            collisionType: undefined as any, // No collision
        });

        // Use a circle graphic for particles
        this.graphics.use(new Circle({ radius: size / 2, color: color }));

        this.velocity = velocity;
        this.startColor = color;
        this.endColor = endColor;
        this.startSize = size;
        this.endSize = endSize;
        this.maxLifetime = lifetime;
        this.lifetime = lifetime;
    }

    public onPreUpdate(_engine: Engine, delta: number): void {
        this.lifetime -= delta;

        if (this.lifetime <= 0) {
            this.kill();
            return;
        }

        // Update position
        this.pos = this.pos.add(this.velocity.scale(delta / 1000));

        // Fade out velocity
        this.velocity = this.velocity.scale(0.95);

        // Interpolate color manually (Excalibur doesn't have Color.Lerp)
        const t = 1 - (this.lifetime / this.maxLifetime);
        const r = Math.floor(this.startColor.r + (this.endColor.r - this.startColor.r) * t);
        const g = Math.floor(this.startColor.g + (this.endColor.g - this.startColor.g) * t);
        const b = Math.floor(this.startColor.b + (this.endColor.b - this.startColor.b) * t);
        const a = this.startColor.a + (this.endColor.a - this.startColor.a) * t;
        const interpolatedColor = new Color(r, g, b, a);
        this.color = interpolatedColor;

        // Interpolate size by updating the graphics scale
        const currentSize = this.startSize + (this.endSize - this.startSize) * t;
        const scale = currentSize / this.startSize;
        if (this.graphics.current) {
            this.graphics.current.scale = new Vector(scale, scale);
        }

        // Update graphics color
        if (this.graphics.current instanceof Circle) {
            this.graphics.current.color = interpolatedColor;
        }
    }
}

/**
 * Particle system for creating visual effects
 */
export class ParticleSystem {
    /**
     * Create a burst of particles at a position
     */
    static createBurst(
        engine: Engine,
        position: Vector,
        options: {
            count?: number;
            colors?: Color[];
            speed?: number;
            size?: number;
            lifetime?: number;
            spread?: number; // Angle spread in radians
            direction?: Vector; // Optional direction bias
        } = {}
    ): void {
        const {
            count = 8,
            colors = [Color.White, Color.Yellow],
            speed = 50,
            size = 3,
            lifetime = 300,
            spread = Math.PI * 2, // Full circle by default
            direction,
        } = options;

        for (let i = 0; i < count; i++) {
            // Calculate angle
            let angle: number;
            if (direction) {
                // Bias toward direction with spread
                const baseAngle = Math.atan2(direction.y, direction.x);
                const spreadAmount = (spread / count) * (i - count / 2);
                angle = baseAngle + spreadAmount;
            } else {
                // Random angle
                angle = Math.random() * spread;
            }

            // Calculate velocity
            const vel = new Vector(Math.cos(angle), Math.sin(angle)).scale(speed * (0.7 + Math.random() * 0.6));

            // Random color from palette
            const startColor = colors[Math.floor(Math.random() * colors.length)];
            const endColor = Color.Transparent;

            // Random size variation
            const particleSize = size * (0.7 + Math.random() * 0.6);
            const endSize = particleSize * 0.3;

            // Random lifetime variation
            const particleLifetime = lifetime * (0.7 + Math.random() * 0.6);

            const particle = new Particle(
                position.clone(),
                vel,
                startColor,
                endColor,
                particleSize,
                endSize,
                particleLifetime
            );

            engine.add(particle);
        }
    }

    /**
     * Create a muzzle flash effect
     */
    static createMuzzleFlash(
        engine: Engine,
        position: Vector,
        direction: Vector
    ): void {
        // Bright flash particles
        this.createBurst(engine, position, {
            count: 6,
            colors: [Color.fromHex("#ffeb3b"), Color.fromHex("#ff9800"), Color.White], // Yellow, Orange, White
            speed: 80,
            size: 4,
            lifetime: 150,
            spread: Math.PI / 4, // Narrow cone
            direction: direction.scale(-1), // Opposite of shot direction
        });
    }

    /**
     * Create an impact explosion effect
     */
    static createImpact(
        engine: Engine,
        position: Vector,
        isEnemyHit: boolean = false
    ): void {
        const colors = isEnemyHit
            ? [Color.fromHex("#ef5350"), Color.fromHex("#ff9800"), Color.Yellow] // Red, Orange, Yellow for enemy hits
            : [Color.fromHex("#90caf9"), Color.fromHex("#42a5f5"), Color.White]; // Blue, Light Blue, White for obstacles

        this.createBurst(engine, position, {
            count: 12,
            colors,
            speed: 60,
            size: 4,
            lifetime: 400,
            spread: Math.PI * 2, // Full circle
        });
    }

    /**
     * Create enemy death particles
     */
    static createDeathEffect(
        engine: Engine,
        position: Vector,
        color: Color
    ): void {
        // Larger, more dramatic burst
        this.createBurst(engine, position, {
            count: 20,
            colors: [color, Color.fromHex("#ff9800"), Color.Yellow],
            speed: 100,
            size: 5,
            lifetime: 600,
            spread: Math.PI * 2,
        });
    }

    /**
     * Create a projectile trail particle
     */
    static createTrail(
        engine: Engine,
        position: Vector,
        color: Color
    ): void {
        const particle = new Particle(
            position.clone(),
            Vector.Zero,
            color,
            Color.Transparent,
            2,
            0.5,
            200
        );
        engine.add(particle);
    }
}

