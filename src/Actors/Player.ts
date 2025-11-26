import { Actor, Engine, Keys, Vector, CollisionType, Color } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { GameConfig } from '@/config';
import { PlayerCollisionGroupConfig } from '@/CollisionGroups';
import { Projectile } from '@/Actors/Projectile';
import { Enemy } from '@/Actors/enemies/Enemy';

export class Player extends Actor {
  private speed: number = GameConfig.player.speed;
  private facingDirection: Vector = new Vector(1, 0);
  public maxHealth: number = GameConfig.player.health;
  public health: number = GameConfig.player.health;

  private shotsFired: number = 0;
  private hitsLanded: number = 0;

  constructor() {
    const radius = GameConfig.width * GameConfig.player.radiusPercent;
    const centerY = GameConfig.height / 2;

    super({
      name: 'player',
      pos: new Vector(10, centerY),
      radius: radius,
      color: Color.Blue,
      collisionType: CollisionType.Active,
      collisionGroup: PlayerCollisionGroupConfig,
    });
  }

  public onInitialize(_engine: Engine): void {
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

    if (engine.input.keyboard.wasPressed(Keys.ShiftRight) || engine.input.keyboard.wasPressed(Keys.Space)) {
      this.shoot(engine);
    }
  }

  public takeDamage(amount: number): void {
    this.health -= amount;
    console.log(`Player took ${amount} damage. Health: ${this.health}/${this.maxHealth}`);
    if (this.health <= 0) {
      this.kill();
      console.log('Player died!');
    }
  }

  public onPostDraw(_ctx: ExcaliburGraphicsContext, _delta: number): void {
    return;
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

    const projectile = new Projectile(this.pos.clone(), targetPosition);

    projectile.on('hitEnemy', () => {
      this.hitsLanded++;
      console.log('🎯 BULLET HIT ENEMY! 🎯');
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