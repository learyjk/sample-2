import { Scene, Engine, Vector, Color, Actor, CollisionType, Timer } from 'excalibur';
import { GameConfig } from '@/config';
import { Player } from '@/Actors/Player';
import { Familiar } from '@/Actors/Familiar';
import { Obstacle } from '@/Actors/Obstacle';
import { EnemyFactory } from '@/Actors/enemies';
import { LevelManager } from '@/LevelManager';
import { generateLevelConfig } from '@/LevelConfig';
import { Enemy } from '@/Actors/enemies/Enemy';

export class Level extends Scene {
  private player: Player | null = null;
  private activeEnemies: number = 0;
  private isLevelComplete: boolean = false;
  private isGameOver: boolean = false;

  onInitialize(engine: Engine): void {
    // Setup logic that only needs to happen once if we were reusing the scene,
    // but we might reset everything onActivate to be safe.
  }

  onActivate(context: any): void {
    const engine = context.engine;
    this.activeEnemies = 0;
    this.isLevelComplete = false;
    this.isGameOver = false;
    
    this.clear(); // Clear existing actors from previous runs

    this.setupBoundaries();
    this.setupSpawnZones();
    this.spawnObstacles();
    this.spawnPlayerAndFamiliar();
    this.spawnEnemies();
  }

  onDeactivate(): void {
    // If we're leaving the level scene (e.g. to Hub), 
    // we should make sure the current player health is saved if they are alive.
    // However, if they died, that logic handles the reset.
    // If they won, we want to save their current health.
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

    // Visual: Player Safe Zone
    const playerSpawnZone = new Actor({
      pos: new Vector(spawnZoneWidth / 2, GameConfig.height / 2),
      width: spawnZoneWidth,
      height: GameConfig.height,
      color: Color.Blue.clone(),
      collisionType: CollisionType.PreventCollision,
      z: -1
    });
    playerSpawnZone.graphics.opacity = 0.2;
    this.add(playerSpawnZone);

    // Visual: Enemy Safe Zone
    const enemySpawnZone = new Actor({
      pos: new Vector(GameConfig.width - (spawnZoneWidth / 2), GameConfig.height / 2),
      width: spawnZoneWidth,
      height: GameConfig.height,
      color: Color.Red.clone(),
      collisionType: CollisionType.PreventCollision,
      z: -1
    });
    enemySpawnZone.graphics.opacity = 0.2;
    this.add(enemySpawnZone);
  }

  private spawnObstacles() {
    const obstacleCount = GameConfig.obstacle.count;
    const obstacleSize = GameConfig.obstacle.size;
    const spawnZoneWidth = GameConfig.width * GameConfig.map.spawnZoneWidthRatio;

    for (let i = 0; i < obstacleCount; i++) {
      let validPosition = false;
      let pos: Vector = new Vector(0, 0);
      let attempts = 0;
      const maxAttempts = 100;

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

  private spawnPlayerAndFamiliar() {
    const spawnZoneWidth = GameConfig.width * GameConfig.map.spawnZoneWidthRatio;
    
    // Retrieve stored health from LevelManager
    const currentHealth = LevelManager.getInstance().getPlayerHealth();

    this.player = new Player(currentHealth);
    this.player.pos = new Vector(spawnZoneWidth / 2, GameConfig.height / 2);
    
    // Listen for player death
    this.player.once('kill', () => this.onPlayerDeath());

    this.add(this.player);

    const familiar = new Familiar(this.player);
    this.add(familiar);
  }

  private onPlayerDeath() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    console.log("Game Over!");

    // Reset Level Logic
    LevelManager.getInstance().resetLevel(); // Resets level count AND health

    // Short delay then back to hub
    const timer = new Timer({
      fcn: () => {
        this.engine.goToScene('hub');
      },
      interval: 1500,
      repeats: false
    });
    this.add(timer);
    timer.start();
  }

  private spawnEnemies() {
    const currentLevel = LevelManager.getInstance().getCurrentLevel();
    const config = generateLevelConfig(currentLevel);
    
    const spawnZoneWidth = GameConfig.width * GameConfig.map.spawnZoneWidthRatio;
    const enemyZoneLeft = GameConfig.width - spawnZoneWidth;
    const enemyZoneTop = 0;

    Object.entries(config.enemyCounts).forEach(([typeId, count]) => {
      for (let i = 0; i < count; i++) {
        const margin = 20;
        const x = enemyZoneLeft + margin + Math.random() * (spawnZoneWidth - 2 * margin);
        const y = enemyZoneTop + margin + Math.random() * (GameConfig.height - 2 * margin);
        
        const enemy = EnemyFactory.create(typeId, new Vector(x, y));
        if (enemy) {
          this.add(enemy);
          this.activeEnemies++;
          
          // Listen for death
          enemy.once('kill', () => this.onEnemyKilled(enemy));
        }
      }
    });

    console.log(`Level ${currentLevel} started with ${this.activeEnemies} enemies.`);
  }

  private onEnemyKilled(enemy: Enemy) {
    this.activeEnemies--;
    console.log(`Enemy killed. Remaining: ${this.activeEnemies}`);
    
    if (this.activeEnemies <= 0 && !this.isLevelComplete && !this.isGameOver) {
      this.levelComplete();
    }
  }

  private levelComplete() {
    this.isLevelComplete = true;
    console.log('Level Complete!');

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
      interval: 1000,
      repeats: false
    });
    
    this.add(timer);
    timer.start();
  }
}
