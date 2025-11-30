import { Actor, Engine, Keys, Vector, CollisionType, Color } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { GameConfig } from '@/config';
import { PlayerCollisionGroupConfig } from '@/CollisionGroups';
import { Projectile } from '@/Actors/Projectile';
import { Enemy } from '@/Actors/enemies/Enemy';

// Modern Palette for Player
const PLAYER_COLOR = Color.fromHex("#42a5f5"); // Material Blue 400
const HEALTH_BAR_BG = Color.fromHex("#424242"); // Dark Grey
const HEALTH_BAR_FG = Color.fromHex("#66bb6a"); // Material Green 400

export class Player extends Actor {
  private speed: number = GameConfig.player.speed;
  private facingDirection: Vector = new Vector(1, 0);
  public maxHealth: number = GameConfig.player.health;
  public health: number = GameConfig.player.health;

  private shotsFired: number = 0;
  private hitsLanded: number = 0;

  // Buff state
  private tetherBuffActive: boolean = false;
  private tetherHealTimer: number = 0;
  private readonly HEAL_INTERVAL: number = GameConfig.familiar.buffs.healInterval;

  // Shooting state
  private shootCooldownTimer: number = 0;
  private readonly SHOOT_COOLDOWN: number = GameConfig.player.shooting.cooldown;

  constructor(initialHealth?: number) {
    const radius = GameConfig.width * GameConfig.player.radiusPercent;
    const centerY = GameConfig.height / 2;

    super({
      name: 'player',
      pos: new Vector(10, centerY),
      radius: radius,
      color: PLAYER_COLOR,
      collisionType: CollisionType.Active,
      collisionGroup: PlayerCollisionGroupConfig,
    });

    if (initialHealth !== undefined) {
      this.health = initialHealth;
    }
  }

  public onInitialize(_engine: Engine): void {
    // Setup health bar drawing using graphics.onPostDraw
    this.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
      ctx.save();

      // Draw health bar above player
      // Calculate bar dimensions based on actor size
      const actorSize = this.collider.bounds.width || this.width || 20;
      const barWidth = actorSize * 2; // Width of health bar
      const barHeight = 4; // Height of health bar
      const barOffsetY = -(actorSize / 2) - barHeight - 8; // Position above player

      // Calculate health percentage
      const healthPercent = Math.max(0, this.health / this.maxHealth);

      // Draw background (dark) - full width
      ctx.drawRectangle(
        new Vector(-barWidth / 2, barOffsetY),
        barWidth,
        barHeight,
        HEALTH_BAR_BG
      );

      // Draw health (green) - scaled by health percentage
      ctx.drawRectangle(
        new Vector(-barWidth / 2, barOffsetY),
        barWidth * healthPercent,
        barHeight,
        HEALTH_BAR_FG
      );

      ctx.restore();
    };
  }

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

    if (x !== 0 || y !== 0) {
      if (x !== 0 && y !== 0) {
        const magnitude = Math.sqrt(x * x + y * y);
        x /= magnitude;
        y /= magnitude;
      }
      this.facingDirection = new Vector(x, y).normalize();
    }

    this.vel = new Vector(x * this.speed, y * this.speed);

    // Update shoot cooldown timer
    if (this.shootCooldownTimer > 0) {
      this.shootCooldownTimer -= _delta;
    }

    // Allow holding Right Shift for continuous shooting, or pressing Space for single shots
    const isHoldingShift = engine.input.keyboard.isHeld(Keys.ShiftRight);
    const pressedSpace = engine.input.keyboard.wasPressed(Keys.Space);
    
    if ((isHoldingShift || pressedSpace) && this.shootCooldownTimer <= 0) {
      this.shoot(engine);
      this.shootCooldownTimer = this.SHOOT_COOLDOWN;
    }

    // Handle Tether Buff (Regeneration)
    if (this.tetherBuffActive && this.health < this.maxHealth) {
      this.tetherHealTimer += _delta;
      if (this.tetherHealTimer >= this.HEAL_INTERVAL) {
        this.health = Math.min(this.health + GameConfig.familiar.buffs.healAmount, this.maxHealth);
        this.tetherHealTimer = 0;
        // Visual feedback could be added here
      }
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

  public takeDamage(amount: number): void {
    // Apply damage reduction if tether is active
    let actualDamage = amount;
    if (this.tetherBuffActive) {
      actualDamage = Math.ceil(amount * GameConfig.familiar.buffs.damageReduction);
      console.log("Tether reduced damage!");
    }

    this.health -= actualDamage;
    console.log(`Player took ${actualDamage} damage. Health: ${this.health}/${this.maxHealth}`);
    if (this.health <= 0) {
      this.kill();
      console.log('Player died!');
    }
  }

  private shoot(engine: Engine): void {
    this.shotsFired++;

    // Find all enemies
    const enemies = engine.currentScene.actors.filter(actor => {
      return actor instanceof Enemy;
    }) as Enemy[];

    // Find the nearest enemy
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
      const baseDirection = nearestEnemy.pos.sub(this.pos).normalize();
      const spreadAmount = GameConfig.player.accuracy.spreadAngle * (1 - GameConfig.player.accuracy.baseAccuracy);
      const randomAngle = (Math.random() - 0.5) * spreadAmount * 2;

      const cos = Math.cos(randomAngle);
      const sin = Math.sin(randomAngle);
      const spreadDirection = new Vector(
        baseDirection.x * cos - baseDirection.y * sin,
        baseDirection.x * sin + baseDirection.y * cos
      );

      const distanceToEnemy = this.pos.distance(nearestEnemy.pos);
      targetPosition = this.pos.add(spreadDirection.scale(distanceToEnemy));
    } else {
      // No enemies, shoot forward based on facing direction
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

    const projectile = new Projectile(
      this.pos.clone(),
      targetPosition,
      undefined,
      false, // isEnemyProjectile
      GameConfig.player.projectileSpeed
    );

    projectile.on('hitEnemy', () => {
      this.hitsLanded++;
    });

    engine.add(projectile);
  }

  public getAccuracy(): number {
    if (this.shotsFired === 0) {
      return 100;
    }
    return (this.hitsLanded / this.shotsFired) * 100;
  }

  public getAccuracyStats(): { shotsFired: number; hitsLanded: number; accuracy: number } {
    return {
      shotsFired: this.shotsFired,
      hitsLanded: this.hitsLanded,
      accuracy: this.getAccuracy()
    };
  }

  public resetAccuracy(): void {
    this.shotsFired = 0;
    this.hitsLanded = 0;
  }
}
