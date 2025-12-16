import { Scene, Engine, Vector, Color, Actor, CollisionType, Timer, Label, Font, FontUnit } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { GameConfig } from '@/config';
import { Player } from '@/Actors/Player';
import { Familiar } from '@/Actors/Familiar';
import { Obstacle } from '@/Actors/Obstacle';
import { EnemyFactory } from '@/Actors/enemies';
import { LevelManager } from '@/LevelManager';
import { generateLevelConfig } from '@/LevelConfig';
import { Enemy } from '@/Actors/enemies/Enemy';
import { ScreenShake } from '@/utils/ScreenShake';
import { ParticleSystem } from '@/utils/ParticleSystem';
import { BuffHUD } from '@/UI/BuffHUD';

// Arcade color palette
const ARCADE_MAGENTA = Color.fromHex("#ff00ff");
const ARCADE_CYAN = Color.fromHex("#00ffff");
const ARCADE_YELLOW = Color.fromHex("#ffff00");
const ARCADE_DANGER = Color.fromHex("#ff3366");
const ARCADE_SUCCESS = Color.fromHex("#00ff88");

export class Level extends Scene {
  private player: Player | null = null;
  private activeEnemies: number = 0;
  private isLevelComplete: boolean = false;
  private isGameOver: boolean = false;
  private screenShake: ScreenShake = new ScreenShake();
  private cameraOffset: Vector = Vector.Zero;
  private buffHUD: BuffHUD = new BuffHUD();
  private levelIndicator: Actor | null = null;
  private enemyCounter: Actor | null = null;

  onInitialize(_engine: Engine): void {
    /**
     * Scene initialization - called once when scene is created
     * All setup happens in onActivate to ensure clean state on each level start
     */
  }

  onActivate(_context: any): void {
    this.activeEnemies = 0;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.screenShake.reset();
    this.cameraOffset = Vector.Zero;

    // Reset particle system tracking since we are clearing the scene
    ParticleSystem.reset();

    this.clear(); // Clear existing actors from previous runs

    this.setupBoundaries();
    this.setupSpawnZones();
    this.spawnObstacles();
    this.spawnPlayerAndFamiliar();
    this.spawnEnemies();
    this.setupHUD();
    this.setupArcadeUI();
  }

  onPreUpdate(_engine: Engine, delta: number): void {
    // Update screen shake
    const newShakeOffset = this.screenShake.update(delta);

    // Apply camera offset (relative to previous offset)
    if (this.camera) {
      const offsetDelta = newShakeOffset.sub(this.cameraOffset);
      this.camera.pos = this.camera.pos.add(offsetDelta);
      this.cameraOffset = newShakeOffset;
    }
  }

  onDeactivate(): void {
    /**
     * Save player health when leaving level scene
     * Preserves health between levels if player survived
     * Death handling resets health automatically
     */
    if (this.player && !this.player.isKilled()) {
      LevelManager.getInstance().setPlayerHealth(this.player.health);
    }
  }

  private setupBoundaries() {
    const wallThickness = 10;

    // Top wall
    this.add(new Obstacle(
      new Vector(GameConfig.width / 2, wallThickness / 2),
      GameConfig.width,
      wallThickness
    ));

    // Bottom wall
    this.add(new Obstacle(
      new Vector(GameConfig.width / 2, GameConfig.height - wallThickness / 2),
      GameConfig.width,
      wallThickness
    ));

    // Left wall
    this.add(new Obstacle(
      new Vector(wallThickness / 2, GameConfig.height / 2),
      wallThickness,
      GameConfig.height
    ));

    // Right wall
    this.add(new Obstacle(
      new Vector(GameConfig.width - wallThickness / 2, GameConfig.height / 2),
      wallThickness,
      GameConfig.height
    ));
  }

  private setupSpawnZones() {
    const spawnZoneWidth = GameConfig.width * GameConfig.map.spawnZoneWidthRatio;

    // Visual: Player Safe Zone with arcade styling
    const playerSpawnZone = new Actor({
      pos: new Vector(spawnZoneWidth / 2, GameConfig.height / 2),
      width: spawnZoneWidth,
      height: GameConfig.height,
      color: ARCADE_CYAN.clone(),
      collisionType: CollisionType.PreventCollision,
      z: -1
    });
    playerSpawnZone.graphics.opacity = 0.08;
    this.add(playerSpawnZone);

    // Visual: Enemy Safe Zone with arcade styling
    const enemySpawnZone = new Actor({
      pos: new Vector(GameConfig.width - (spawnZoneWidth / 2), GameConfig.height / 2),
      width: spawnZoneWidth,
      height: GameConfig.height,
      color: ARCADE_MAGENTA.clone(),
      collisionType: CollisionType.PreventCollision,
      z: -1
    });
    enemySpawnZone.graphics.opacity = 0.08;
    this.add(enemySpawnZone);
  }

  /**
   * Spawn obstacles randomly across the map
   * Ensures obstacles don't spawn in player or enemy safe zones
   */
  private spawnObstacles() {
    const obstacleCount = GameConfig.obstacle.count;
    const obstacleSize = GameConfig.obstacle.size;
    const spawnZoneWidth = GameConfig.width * GameConfig.map.spawnZoneWidthRatio;

    for (let i = 0; i < obstacleCount; i++) {
      let validPosition = false;
      let pos: Vector = new Vector(0, 0);
      let attempts = 0;
      const maxAttempts = 100;

      // Try to find a valid position (not in spawn zones)
      do {
        const margin = obstacleSize;
        const x = Math.random() * (GameConfig.width - 2 * margin) + margin;
        const y = Math.random() * (GameConfig.height - 2 * margin) + margin;

        const inPlayerZone = (x - obstacleSize / 2) < spawnZoneWidth;
        const inEnemyZone = (x + obstacleSize / 2) > (GameConfig.width - spawnZoneWidth);

        if (!inPlayerZone && !inEnemyZone) {
          pos = new Vector(x, y);
          validPosition = true;
        }
        attempts++;
      } while (!validPosition && attempts < maxAttempts);

      if (validPosition) {
        this.add(new Obstacle(pos));
      }
    }
  }

  /**
   * Spawn player and familiar in the player safe zone
   * Restores health from LevelManager to persist between levels
   */
  private spawnPlayerAndFamiliar() {
    const spawnZoneWidth = GameConfig.width * GameConfig.map.spawnZoneWidthRatio;

    // Restore player health from previous level (or use default)
    const currentHealth = LevelManager.getInstance().getPlayerHealth();

    this.player = new Player(currentHealth);
    this.player.pos = new Vector(spawnZoneWidth / 2, GameConfig.height / 2);

    // Listen for player death event
    this.player.once('kill', () => this.onPlayerDeath());

    this.add(this.player);

    // Spawn familiar that follows the player
    const familiar = new Familiar(this.player);
    this.add(familiar);
  }

  private onPlayerDeath() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    console.log("Game Over!");

    // Show arcade-style game over overlay
    this.showGameOverOverlay();

    // Reset Level Logic
    LevelManager.getInstance().resetLevel(); // Resets level count AND health

    // Short delay then back to hub
    const timer = new Timer({
      fcn: () => {
        this.engine.goToScene('hub');
      },
      interval: 2500,
      repeats: false
    });
    this.add(timer);
    timer.start();
  }

  /**
   * Spawn enemies based on level configuration
   * Enemies spawn in the enemy safe zone on the right side of the map
   */
  private spawnEnemies() {
    const currentLevel = LevelManager.getInstance().getCurrentLevel();
    const config = generateLevelConfig(currentLevel);

    const spawnZoneWidth = GameConfig.width * GameConfig.map.spawnZoneWidthRatio;
    const enemyZoneLeft = GameConfig.width - spawnZoneWidth;
    const enemyZoneTop = 0;

    // Spawn each enemy type according to level config
    Object.entries(config.enemyCounts).forEach(([typeId, count]) => {
      for (let i = 0; i < count; i++) {
        const margin = 20;
        const x = enemyZoneLeft + margin + Math.random() * (spawnZoneWidth - 2 * margin);
        const y = enemyZoneTop + margin + Math.random() * (GameConfig.height - 2 * margin);

        const enemy = EnemyFactory.create(typeId, new Vector(x, y));
        if (enemy) {
          this.add(enemy);
          this.activeEnemies++;

          // Track enemy death for level completion
          enemy.once('kill', () => this.onEnemyKilled(enemy));
        }
      }
    });

    console.log(`Level ${currentLevel} started with ${this.activeEnemies} enemies.`);
  }

  private onEnemyKilled(_enemy: Enemy) {
    this.activeEnemies--;
    console.log(`Enemy killed. Remaining: ${this.activeEnemies}`);

    // Add screen shake for enemy death
    this.screenShake.shake(0.3);

    if (this.activeEnemies <= 0 && !this.isLevelComplete && !this.isGameOver) {
      this.levelComplete();
    }
  }

  /**
   * Get screen shake instance for other actors to trigger
   */
  public getScreenShake(): ScreenShake {
    return this.screenShake;
  }

  /**
   * Setup HUD for displaying buffs and effects
   */
  private setupHUD(): void {
    if (this.player) {
      this.buffHUD.setPlayer(this.player);
    }
    this.add(this.buffHUD);
  }

  /**
   * Setup arcade-style UI elements (level indicator, enemy counter)
   */
  private setupArcadeUI(): void {
    const currentLevel = LevelManager.getInstance().getCurrentLevel();

    // Level indicator in top-right
    this.levelIndicator = new Actor({
      pos: new Vector(GameConfig.width - 20, 20),
      width: 150,
      height: 30,
      color: Color.Transparent,
      collisionType: CollisionType.PreventCollision,
      z: 1000
    });

    this.levelIndicator.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
      // Background panel
      ctx.drawRectangle(
        new Vector(-130, -12),
        130,
        28,
        Color.fromHex("#0a0a1280")
      );

      // Border
      ctx.drawLine(
        new Vector(-130, -12),
        new Vector(0, -12),
        ARCADE_CYAN,
        1
      );
      ctx.drawLine(
        new Vector(-130, 16),
        new Vector(0, 16),
        ARCADE_CYAN,
        1
      );
    };

    this.add(this.levelIndicator);

    // Level label
    const levelLabel = new Label({
      text: `STAGE ${currentLevel}`,
      pos: new Vector(GameConfig.width - 75, 20),
      font: new Font({
        size: 12,
        unit: FontUnit.Px,
        color: ARCADE_YELLOW,
        family: '"Press Start 2P", monospace',
        shadow: {
          blur: 6,
          offset: new Vector(0, 0),
          color: ARCADE_YELLOW
        }
      })
    });
    levelLabel.anchor.setTo(0.5, 0.5);
    this.add(levelLabel);

    // Enemy counter
    this.enemyCounter = new Actor({
      pos: new Vector(GameConfig.width - 20, 55),
      width: 150,
      height: 25,
      color: Color.Transparent,
      collisionType: CollisionType.PreventCollision,
      z: 1000
    });

    const self = this;
    this.enemyCounter.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
      // Background
      ctx.drawRectangle(
        new Vector(-130, -10),
        130,
        22,
        Color.fromHex("#0a0a1280")
      );
    };

    this.add(this.enemyCounter);

    // Enemy count label (will update dynamically)
    const enemyLabel = new Label({
      text: `ENEMIES: ${this.activeEnemies}`,
      pos: new Vector(GameConfig.width - 75, 55),
      font: new Font({
        size: 8,
        unit: FontUnit.Px,
        color: ARCADE_MAGENTA,
        family: '"Press Start 2P", monospace',
        shadow: {
          blur: 4,
          offset: new Vector(0, 0),
          color: ARCADE_MAGENTA
        }
      })
    });
    enemyLabel.anchor.setTo(0.5, 0.5);
    
    // Update enemy count on pre-update
    enemyLabel.onPreUpdate = () => {
      enemyLabel.text = `ENEMIES: ${self.activeEnemies}`;
    };
    
    this.add(enemyLabel);
  }

  /**
   * Show arcade-style game over overlay
   */
  private showGameOverOverlay(): void {
    // Dark overlay
    const overlay = new Actor({
      pos: new Vector(GameConfig.width / 2, GameConfig.height / 2),
      width: GameConfig.width,
      height: GameConfig.height,
      color: Color.fromHex("#000000"),
      collisionType: CollisionType.PreventCollision,
      z: 2000
    });
    overlay.graphics.opacity = 0.85;
    this.add(overlay);

    // GAME OVER text
    const gameOverLabel = new Label({
      text: 'GAME OVER',
      pos: new Vector(GameConfig.width / 2, GameConfig.height / 2 - 40),
      font: new Font({
        size: 36,
        unit: FontUnit.Px,
        color: ARCADE_DANGER,
        family: '"Press Start 2P", monospace',
        shadow: {
          blur: 20,
          offset: new Vector(0, 0),
          color: ARCADE_DANGER
        }
      })
    });
    gameOverLabel.anchor.setTo(0.5, 0.5);
    gameOverLabel.z = 2001;
    this.add(gameOverLabel);

    // Subtext
    const subLabel = new Label({
      text: 'RETURNING TO HUB...',
      pos: new Vector(GameConfig.width / 2, GameConfig.height / 2 + 30),
      font: new Font({
        size: 10,
        unit: FontUnit.Px,
        color: Color.fromHex("#8888aa"),
        family: '"Press Start 2P", monospace'
      })
    });
    subLabel.anchor.setTo(0.5, 0.5);
    subLabel.z = 2001;
    this.add(subLabel);
  }

  /**
   * Show arcade-style level complete overlay
   */
  private showLevelCompleteOverlay(): void {
    // Dark overlay
    const overlay = new Actor({
      pos: new Vector(GameConfig.width / 2, GameConfig.height / 2),
      width: GameConfig.width,
      height: GameConfig.height,
      color: Color.fromHex("#000000"),
      collisionType: CollisionType.PreventCollision,
      z: 2000
    });
    overlay.graphics.opacity = 0.85;
    this.add(overlay);

    // STAGE CLEAR text
    const clearLabel = new Label({
      text: 'STAGE CLEAR!',
      pos: new Vector(GameConfig.width / 2, GameConfig.height / 2 - 40),
      font: new Font({
        size: 32,
        unit: FontUnit.Px,
        color: ARCADE_SUCCESS,
        family: '"Press Start 2P", monospace',
        shadow: {
          blur: 20,
          offset: new Vector(0, 0),
          color: ARCADE_SUCCESS
        }
      })
    });
    clearLabel.anchor.setTo(0.5, 0.5);
    clearLabel.z = 2001;
    this.add(clearLabel);

    // Score/stats subtext
    const currentLevel = LevelManager.getInstance().getCurrentLevel();
    const subLabel = new Label({
      text: `STAGE ${currentLevel} COMPLETE`,
      pos: new Vector(GameConfig.width / 2, GameConfig.height / 2 + 20),
      font: new Font({
        size: 10,
        unit: FontUnit.Px,
        color: ARCADE_YELLOW,
        family: '"Press Start 2P", monospace',
        shadow: {
          blur: 6,
          offset: new Vector(0, 0),
          color: ARCADE_YELLOW
        }
      })
    });
    subLabel.anchor.setTo(0.5, 0.5);
    subLabel.z = 2001;
    this.add(subLabel);

    // Continuing text
    const continueLabel = new Label({
      text: 'ADVANCING...',
      pos: new Vector(GameConfig.width / 2, GameConfig.height / 2 + 60),
      font: new Font({
        size: 8,
        unit: FontUnit.Px,
        color: Color.fromHex("#8888aa"),
        family: '"Press Start 2P", monospace'
      })
    });
    continueLabel.anchor.setTo(0.5, 0.5);
    continueLabel.z = 2001;
    this.add(continueLabel);
  }

  private levelComplete() {
    this.isLevelComplete = true;
    console.log('Level Complete!');

    // Show arcade-style level complete overlay
    this.showLevelCompleteOverlay();

    // Update persisted health before moving on
    if (this.player && !this.player.isKilled()) {
      LevelManager.getInstance().setPlayerHealth(this.player.health);
    }

    // Add a small delay before transitioning
    const timer = new Timer({
      fcn: () => {
        LevelManager.getInstance().incrementLevel();
        this.engine.goToScene('hub');
      },
      interval: 2000,
      repeats: false
    });

    this.add(timer);
    timer.start();
  }
}
