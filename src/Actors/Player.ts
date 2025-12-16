import { Actor, Engine, Keys, Vector, CollisionType, Color } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { GameConfig } from '@/config';
import { PlayerCollisionGroupConfig } from '@/CollisionGroups';
import { Projectile } from '@/Actors/Projectile';
import { Enemy } from '@/Actors/enemies/Enemy';
import { ParticleSystem } from '@/utils/ParticleSystem';

// Arcade color palette
const ARCADE_CYAN = Color.fromHex("#00ffff");
const ARCADE_DANGER = Color.fromHex("#ff3366");
const ARCADE_SUCCESS = Color.fromHex("#00ff88");
const ARCADE_BG = Color.fromHex("#0a0a12");

export class Player extends Actor {
  private speed: number = GameConfig.player.speed;
  private facingDirection: Vector = new Vector(1, 0);
  public maxHealth: number = GameConfig.player.health;
  public health: number = GameConfig.player.health;

  private shotsFired: number = 0;
  private hitsLanded: number = 0;

  // Buff state
  private tetherBuffActive: boolean = false;

  // Shooting state
  private shootCooldownTimer: number = 0;
  private readonly SHOOT_COOLDOWN: number = GameConfig.player.shooting.cooldown;

  // Visual feedback state
  private hitFlashTimer: number = 0;
  private readonly HIT_FLASH_DURATION: number = 100; // ms

  constructor(initialHealth?: number) {
    const radius = GameConfig.width * GameConfig.player.radiusPercent;
    const centerY = GameConfig.height / 2;

    super({
      name: 'player',
      pos: new Vector(10, centerY),
      radius: radius,
      color: ARCADE_CYAN,
      collisionType: CollisionType.Active,
      collisionGroup: PlayerCollisionGroupConfig,
    });

    if (initialHealth !== undefined) {
      this.health = initialHealth;
    }
  }

  public onInitialize(_engine: Engine): void {
    /**
     * Set up arcade-styled health bar visualization above the player
     * Uses graphics.onPostDraw to render UI elements relative to the actor
     */
    this.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
      ctx.save();

      // Hit flash effect - neon red flash when taking damage
      if (this.hitFlashTimer > 0) {
        const flashIntensity = this.hitFlashTimer / this.HIT_FLASH_DURATION;
        const flashColor = ARCADE_DANGER;
        const actorSize = this.collider.bounds.width || this.width || 20;
        ctx.opacity = flashIntensity * 0.6;
        ctx.drawCircle(Vector.Zero, actorSize * 1.8, flashColor);
        ctx.opacity = 1;
      }

      // Calculate health bar dimensions based on actor size
      const actorSize = this.collider.bounds.width || this.width || 20;
      const barWidth = actorSize * 2.5;
      const barHeight = 6;
      const barOffsetY = -(actorSize / 2) - barHeight - 10;

      // Calculate health percentage (clamped to 0-1)
      const healthPercent = Math.max(0, this.health / this.maxHealth);

      // Draw outer border (arcade glow effect)
      ctx.drawRectangle(
        new Vector(-barWidth / 2 - 2, barOffsetY - 2),
        barWidth + 4,
        barHeight + 4,
        ARCADE_CYAN
      );

      // Draw background bar (dark)
      ctx.drawRectangle(
        new Vector(-barWidth / 2, barOffsetY),
        barWidth,
        barHeight,
        ARCADE_BG
      );

      // Draw health bar with gradient effect based on health
      const healthColor = healthPercent > 0.5 ? ARCADE_SUCCESS : 
                          healthPercent > 0.25 ? Color.fromHex("#ffff00") : 
                          ARCADE_DANGER;

      ctx.drawRectangle(
        new Vector(-barWidth / 2, barOffsetY),
        barWidth * healthPercent,
        barHeight,
        healthColor
      );

      // Draw inner highlight for 3D effect
      if (healthPercent > 0) {
        ctx.drawRectangle(
          new Vector(-barWidth / 2, barOffsetY),
          barWidth * healthPercent,
          barHeight / 3,
          Color.fromHex("#ffffff30")
        );
      }

      // Draw corner brackets (arcade style)
      const bracketSize = 4;
      const bracketColor = ARCADE_CYAN;

      // Top-left bracket
      ctx.drawLine(
        new Vector(-barWidth / 2 - 4, barOffsetY - 4),
        new Vector(-barWidth / 2 - 4 + bracketSize, barOffsetY - 4),
        bracketColor,
        2
      );
      ctx.drawLine(
        new Vector(-barWidth / 2 - 4, barOffsetY - 4),
        new Vector(-barWidth / 2 - 4, barOffsetY - 4 + bracketSize),
        bracketColor,
        2
      );

      // Top-right bracket
      ctx.drawLine(
        new Vector(barWidth / 2 + 4, barOffsetY - 4),
        new Vector(barWidth / 2 + 4 - bracketSize, barOffsetY - 4),
        bracketColor,
        2
      );
      ctx.drawLine(
        new Vector(barWidth / 2 + 4, barOffsetY - 4),
        new Vector(barWidth / 2 + 4, barOffsetY - 4 + bracketSize),
        bracketColor,
        2
      );

      // Bottom-left bracket
      ctx.drawLine(
        new Vector(-barWidth / 2 - 4, barOffsetY + barHeight + 4),
        new Vector(-barWidth / 2 - 4 + bracketSize, barOffsetY + barHeight + 4),
        bracketColor,
        2
      );
      ctx.drawLine(
        new Vector(-barWidth / 2 - 4, barOffsetY + barHeight + 4),
        new Vector(-barWidth / 2 - 4, barOffsetY + barHeight + 4 - bracketSize),
        bracketColor,
        2
      );

      // Bottom-right bracket
      ctx.drawLine(
        new Vector(barWidth / 2 + 4, barOffsetY + barHeight + 4),
        new Vector(barWidth / 2 + 4 - bracketSize, barOffsetY + barHeight + 4),
        bracketColor,
        2
      );
      ctx.drawLine(
        new Vector(barWidth / 2 + 4, barOffsetY + barHeight + 4),
        new Vector(barWidth / 2 + 4, barOffsetY + barHeight + 4 - bracketSize),
        bracketColor,
        2
      );

      ctx.restore();
    };
  }

  /**
   * Handle player movement input (WASD or Arrow Keys)
   * Normalize diagonal movement to prevent faster diagonal speed
   */
  public onPreUpdate(engine: Engine, _delta: number): void {
    let x = 0;
    let y = 0;

    if (engine.input.keyboard.isHeld(Keys.W) || engine.input.keyboard.isHeld(Keys.ArrowUp)) {
      y = -1;
    }
    if (engine.input.keyboard.isHeld(Keys.S) || engine.input.keyboard.isHeld(Keys.ArrowDown)) {
      y = 1;
    }
    if (engine.input.keyboard.isHeld(Keys.A) || engine.input.keyboard.isHeld(Keys.ArrowLeft)) {
      x = -1;
    }
    if (engine.input.keyboard.isHeld(Keys.D) || engine.input.keyboard.isHeld(Keys.ArrowRight)) {
      x = 1;
    }

    // Normalize diagonal movement
    if (x !== 0 || y !== 0) {
      if (x !== 0 && y !== 0) {
        const magnitude = Math.sqrt(x * x + y * y);
        x /= magnitude;
        y /= magnitude;
      }
      this.facingDirection = new Vector(x, y).normalize();
    }

    // Apply velocity based on input
    this.vel = new Vector(x * this.speed, y * this.speed);

    // Handle shooting with cooldown system
    // Right Shift: Hold for continuous shooting
    // Space: Press for single shots
    if (this.shootCooldownTimer > 0) {
      this.shootCooldownTimer -= _delta;
    }

    const isHoldingShift = engine.input.keyboard.isHeld(Keys.ShiftRight);
    const pressedSpace = engine.input.keyboard.wasPressed(Keys.Space);

    if ((isHoldingShift || pressedSpace) && this.shootCooldownTimer <= 0) {
      this.shoot(engine);
      this.shootCooldownTimer = this.SHOOT_COOLDOWN;
    }

    // Update hit flash timer
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= _delta;
    }
  }

  public activateTetherBuff() {
    if (!this.tetherBuffActive) {
      this.tetherBuffActive = true;
      console.log("Player: Tether Buff Activated");
    }
  }

  public deactivateTetherBuff() {
    if (this.tetherBuffActive) {
      this.tetherBuffActive = false;
      console.log("Player: Tether Buff Deactivated");
    }
  }

  /**
   * Apply damage to the player
   * Tether buff reduces incoming damage by 20%
   */
  public takeDamage(amount: number): void {
    let actualDamage = amount;
    if (this.tetherBuffActive) {
      actualDamage = Math.ceil(amount * GameConfig.familiar.buffs.damageReduction);
      console.log("Tether reduced damage!");
    }

    this.health -= actualDamage;
    console.log(`Player took ${actualDamage} damage. Health: ${this.health}/${this.maxHealth}`);

    // Trigger hit flash effect
    this.hitFlashTimer = this.HIT_FLASH_DURATION;

    // Trigger screen shake if available
    if (this.scene) {
      const levelScene = this.scene as any;
      if (levelScene.getScreenShake) {
        levelScene.getScreenShake().shake(0.2);
      }
    }

    if (this.health <= 0) {
      this.kill();
      console.log('Player died!');
    }
  }

  /**
   * Fire a projectile
   * Auto-aims at nearest enemy with accuracy spread, or shoots forward if no enemies
   */
  private shoot(engine: Engine): void {
    this.shotsFired++;

    // Find all enemies in the current scene
    const enemies = engine.currentScene.actors.filter(actor => {
      return actor instanceof Enemy;
    }) as Enemy[];

    // Find the nearest enemy for auto-aiming
    let nearestEnemy: Enemy | undefined;
    let minDistance = Infinity;

    for (const enemy of enemies) {
      const distance = this.pos.distance(enemy.pos);
      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy;
      }
    }

    let targetPosition: Vector;

    if (nearestEnemy) {
      // Auto-aim at nearest enemy with accuracy spread
      const baseDirection = nearestEnemy.pos.sub(this.pos).normalize();
      const spreadAmount = GameConfig.player.accuracy.spreadAngle * (1 - GameConfig.player.accuracy.baseAccuracy);
      const randomAngle = (Math.random() - 0.5) * spreadAmount * 2;

      // Apply rotation matrix for spread
      const cos = Math.cos(randomAngle);
      const sin = Math.sin(randomAngle);
      const spreadDirection = new Vector(
        baseDirection.x * cos - baseDirection.y * sin,
        baseDirection.x * sin + baseDirection.y * cos
      );

      const distanceToEnemy = this.pos.distance(nearestEnemy.pos);
      targetPosition = this.pos.add(spreadDirection.scale(distanceToEnemy));
    } else {
      // No enemies found, shoot forward based on facing direction
      const shootDistance = 100;
      const spreadAmount = GameConfig.player.accuracy.spreadAngle * (1 - GameConfig.player.accuracy.baseAccuracy);
      const randomAngle = (Math.random() - 0.5) * spreadAmount * 2;

      const cos = Math.cos(randomAngle);
      const sin = Math.sin(randomAngle);
      const spreadDirection = new Vector(
        this.facingDirection.x * cos - this.facingDirection.y * sin,
        this.facingDirection.x * sin + this.facingDirection.y * cos
      );

      targetPosition = this.pos.add(spreadDirection.scale(shootDistance));
    }

    // Calculate shot direction for muzzle flash
    const shotDirection = targetPosition.sub(this.pos).normalize();

    // Create muzzle flash effect
    ParticleSystem.createMuzzleFlash(engine, this.pos.clone(), shotDirection);

    // Create and fire projectile
    const projectile = new Projectile(
      this.pos.clone(),
      targetPosition,
      undefined,
      false, // isEnemyProjectile
      GameConfig.player.projectileSpeed
    );

    // Track accuracy statistics
    projectile.on('hitEnemy', () => {
      this.hitsLanded++;
    });

    engine.add(projectile);
  }

  /**
   * Calculate player accuracy percentage
   * Returns 100% if no shots have been fired
   */
  public getAccuracy(): number {
    if (this.shotsFired === 0) {
      return 100;
    }
    return (this.hitsLanded / this.shotsFired) * 100;
  }

  /**
   * Get comprehensive accuracy statistics
   */
  public getAccuracyStats(): { shotsFired: number; hitsLanded: number; accuracy: number } {
    return {
      shotsFired: this.shotsFired,
      hitsLanded: this.hitsLanded,
      accuracy: this.getAccuracy()
    };
  }

  /**
   * Reset accuracy tracking (useful when starting a new level)
   */
  public resetAccuracy(): void {
    this.shotsFired = 0;
    this.hitsLanded = 0;
  }

  /**
   * Get active buffs and effects
   * Returns an array of buff objects with name and description
   */
  public getActiveBuffs(): Array<{ name: string; description: string }> {
    const buffs: Array<{ name: string; description: string }> = [];
    
    if (this.tetherBuffActive) {
      const damageReduction = (1 - GameConfig.familiar.buffs.damageReduction) * 100;
      buffs.push({
        name: 'Tether Buff',
        description: `${damageReduction}% damage reduction`
      });
    }
    
    return buffs;
  }

  /**
   * Check if a specific buff is active
   */
  public hasBuff(buffName: string): boolean {
    if (buffName === 'Tether Buff') {
      return this.tetherBuffActive;
    }
    return false;
  }
}
