import { Actor, Engine, Vector, Color, Circle, Graphic } from 'excalibur';

/**
 * Simple particle for visual effects
 */
class Particle extends Actor {
    private lifetime: number = 0;
    private maxLifetime: number = 0;
    private startColor: Color = Color.White;
    private endColor: Color = Color.Transparent;
    private startSize: number = 0;
    private endSize: number = 0;
    private velocity: Vector = Vector.Zero;

    // Shared graphic to reduce memory usage
    // We use a white circle and tint it
    private static sharedCircle: Circle;

    constructor() {
        super({
            pos: Vector.Zero,
            radius: 2,
            collisionType: undefined as any, // No collision
        });

        if (!Particle.sharedCircle) {
            Particle.sharedCircle = new Circle({ radius: 10, color: Color.White });
        }

        // Use the shared circle
        this.graphics.use(Particle.sharedCircle);
    }

    public reset(
        position: Vector,
        velocity: Vector,
        color: Color,
        endColor: Color,
        size: number,
        endSize: number,
        lifetime: number
    ) {
        this.pos = position.clone();
        this.velocity = velocity;
        this.startColor = color;
        this.endColor = endColor;
        this.startSize = size;
        this.endSize = endSize;
        this.maxLifetime = lifetime;
        this.lifetime = lifetime;

        // Reset actor state
        this.graphics.opacity = 1;
        this.color = color;
        this.vel = Vector.Zero; // We update pos manually in onPreUpdate
        this.rotation = 0;
        this.angularVelocity = 0;

        // Initial scale/color
        if (this.graphics.current) {
            const scale = size / 20; // 20 is diameter of shared circle (radius 10)
            this.graphics.current.scale = new Vector(scale, scale);
            this.graphics.current.tint = color;
        }
    }

    public onPreUpdate(_engine: Engine, delta: number): void {
        this.lifetime -= delta;

        if (this.lifetime <= 0) {
            ParticleSystem.release(this);
            return;
        }

        // Update position
        this.pos = this.pos.add(this.velocity.scale(delta / 1000));

        // Fade out velocity
        this.velocity = this.velocity.scale(0.95);

        // Interpolate color manually
        const t = 1 - (this.lifetime / this.maxLifetime);
        const r = Math.floor(this.startColor.r + (this.endColor.r - this.startColor.r) * t);
        const g = Math.floor(this.startColor.g + (this.endColor.g - this.startColor.g) * t);
        const b = Math.floor(this.startColor.b + (this.endColor.b - this.startColor.b) * t);
        const a = this.startColor.a + (this.endColor.a - this.startColor.a) * t;
        const interpolatedColor = new Color(r, g, b, a);

        // Interpolate size by updating the graphics scale
        const currentSize = this.startSize + (this.endSize - this.startSize) * t;
        const scale = currentSize / 20; // Based on shared circle diameter

        if (this.graphics.current) {
            this.graphics.current.scale = new Vector(scale, scale);
            this.graphics.current.tint = interpolatedColor;
            this.graphics.opacity = a; // Helper to ensure opacity affects tint
        }
    }
}

/**
 * Particle system for creating visual effects
 */
export class ParticleSystem {
    private static pool: Particle[] = [];
    private static maxPoolSize = 1000;

    // Limit total active particles to prevent WebGL context loss
    private static activeParticles: number = 0;
    private static readonly MAX_ACTIVE_PARTICLES = 1500;

    /**
     * Reset the particle system state
     * Call this when changing scenes to ensure active count is correct
     */
    static reset() {
        this.activeParticles = 0;
        // Optionally clear pool if needed, but keeping it is better for performance
    }

    /**
     * Get a particle from the pool or create a new one
     */
    static getParticle(
        position: Vector,
        velocity: Vector,
        color: Color,
        endColor: Color,
        size: number,
        endSize: number,
        lifetime: number
    ): Particle | null {
        // Hard limit on active particles
        if (this.activeParticles >= this.MAX_ACTIVE_PARTICLES) {
            return null;
        }

        let p = this.pool.pop();
        if (!p) {
            p = new Particle();
        }

        p.reset(position, velocity, color, endColor, size, endSize, lifetime);
        this.activeParticles++;
        return p;
    }

    /**
     * Release a particle back to the pool
     */
    static release(p: Particle) {
        // Remove from scene manually since we are managing lifecycle
        if (p.scene) {
            p.scene.remove(p);
        }

        this.activeParticles--;

        if (this.pool.length < this.maxPoolSize) {
            this.pool.push(p);
        }
        // If pool is full, let GC handle it (it's already removed from scene)
    }

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
            count = 6, // Reduced from 8
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

            const particle = this.getParticle(
                position.clone(),
                vel,
                startColor,
                endColor,
                particleSize,
                endSize,
                particleLifetime
            );

            if (particle) {
                engine.add(particle);
            }
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
            count: 4, // Reduced from 6
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
            count: 8, // Reduced from 12
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
            count: 12, // Reduced from 20
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
        const particle = this.getParticle(
            position.clone(),
            Vector.Zero,
            color,
            Color.Transparent,
            2,
            0.5,
            200
        );

        if (particle) {
            engine.add(particle);
        }
    }

    /**
     * Create nova blast explosion effect - radiating particles from center
     */
    static createNovaBlast(
        engine: Engine,
        position: Vector,
        radius: number
    ): void {
        const novaColor = Color.fromHex("#ff00ff");
        const novaColorBright = Color.fromHex("#ff66ff");
        const novaColorWhite = Color.White;

        // Create radiating particles in all directions
        const particleCount = 24;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 200 + Math.random() * 100;
            const vel = new Vector(Math.cos(angle), Math.sin(angle)).scale(speed);

            const colors = [novaColor, novaColorBright, novaColorWhite];
            const startColor = colors[Math.floor(Math.random() * colors.length)];

            const particle = this.getParticle(
                position.clone(),
                vel,
                startColor,
                Color.Transparent,
                6 + Math.random() * 4,
                1,
                400 + Math.random() * 200
            );

            if (particle) {
                engine.add(particle);
            }
        }

        // Create inner burst for extra impact
        this.createBurst(engine, position, {
            count: 16,
            colors: [novaColor, novaColorBright, novaColorWhite],
            speed: 150,
            size: 8,
            lifetime: 300,
            spread: Math.PI * 2,
        });

        // Create sparks
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.8;
            const sparkPos = position.add(new Vector(Math.cos(angle) * dist, Math.sin(angle) * dist));
            const sparkVel = new Vector(
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100
            );

            const particle = this.getParticle(
                sparkPos,
                sparkVel,
                novaColorBright,
                Color.Transparent,
                3,
                0.5,
                250 + Math.random() * 150
            );

            if (particle) {
                engine.add(particle);
            }
        }
    }

    /**
     * Create hit effect on enemy when struck by nova blast
     */
    static createNovaHit(
        engine: Engine,
        position: Vector
    ): void {
        const novaColor = Color.fromHex("#ff00ff");
        const novaColorBright = Color.fromHex("#ff66ff");

        this.createBurst(engine, position, {
            count: 10,
            colors: [novaColor, novaColorBright, Color.White],
            speed: 80,
            size: 5,
            lifetime: 350,
            spread: Math.PI * 2,
        });
    }
}
