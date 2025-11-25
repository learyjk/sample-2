// main.ts
import { Engine, Color, DisplayMode, Vector, Actor, CollisionType } from 'excalibur'
import './style.css'
import { Player } from '@/Actors/Player'
import { GameConfig } from '@/config'
import { Obstacle } from '@/Actors/Obstacle';
import { EnemyFactory } from '@/Actors/enemies';

const engine = new Engine({
  width: GameConfig.width,
  height: GameConfig.height,
  backgroundColor: Color.fromHex("#1a1a1a"),
  pixelArt: true,
  pixelRatio: 2,
  displayMode: DisplayMode.FitScreen
});

// Enable debug mode to show collider wireframes
engine.showDebug(true);

// --- Spawn Zones ---
const spawnZoneWidth = GameConfig.width * GameConfig.map.spawnZoneWidthRatio;

// Visual: Player Safe Zone (Left) - Slight Blue
const playerSpawnZone = new Actor({
  pos: new Vector(spawnZoneWidth / 2, GameConfig.height / 2),
  width: spawnZoneWidth,
  height: GameConfig.height,
  color: Color.Blue.clone(),
  collisionType: CollisionType.PreventCollision, // No collision
  z: -1 // Draw behind everything
});
playerSpawnZone.graphics.opacity = 0.2; // Slight hue
engine.add(playerSpawnZone);

// Visual: Enemy Safe Zone (Right) - Slight Red
const enemySpawnZone = new Actor({
  pos: new Vector(GameConfig.width - (spawnZoneWidth / 2), GameConfig.height / 2),
  width: spawnZoneWidth,
  height: GameConfig.height,
  color: Color.Red.clone(),
  collisionType: CollisionType.PreventCollision,
  z: -1
});
enemySpawnZone.graphics.opacity = 0.2; // Slight hue
engine.add(enemySpawnZone);


// --- Obstacles ---
const obstacleCount = GameConfig.obstacle.count;
const obstacleSize = GameConfig.obstacle.size;

for (let i = 0; i < obstacleCount; i++) {
  let validPosition = false;
  let pos: Vector = new Vector(0, 0);
  let attempts = 0;
  const maxAttempts = 100;

  // Try to find a valid position
  do {
    // Random position within game bounds (accounting for size so it doesn't clip edge)
    // Ensure we spawn somewhat away from the edges
    const margin = obstacleSize;
    const x = Math.random() * (GameConfig.width - 2 * margin) + margin;
    const y = Math.random() * (GameConfig.height - 2 * margin) + margin;

    // Check if inside spawn zones
    // Player Zone: x < spawnZoneWidth
    // Enemy Zone: x > GameConfig.width - spawnZoneWidth
    // We add some buffer to ensure it doesn't touch the zone

    const inPlayerZone = (x - obstacleSize / 2) < spawnZoneWidth;
    const inEnemyZone = (x + obstacleSize / 2) > (GameConfig.width - spawnZoneWidth);

    if (!inPlayerZone && !inEnemyZone) {
      pos = new Vector(x, y);
      validPosition = true;
    }
    attempts++;
  } while (!validPosition && attempts < maxAttempts);

  if (validPosition) {
    const obstacle = new Obstacle(pos);
    engine.add(obstacle);
  }
}

// --- Actors ---

// Create and add enemies to the scene using the factory
// Spawn in the enemy safe zone
const enemyX = GameConfig.width - (spawnZoneWidth / 2); // Center of right zone

// Enemy 1: Stationary Shooter (Red) - Top of spawn zone
const enemy1 = EnemyFactory.create('STATIONARY_SHOOTER', new Vector(enemyX, 60));
if (enemy1) {
  engine.add(enemy1);
}

// Enemy 2: Patrol Shooter (Orange) - Middle of spawn zone
const enemy2 = EnemyFactory.create('PATROL_SHOOTER', new Vector(enemyX, GameConfig.height / 2));
if (enemy2) {
  engine.add(enemy2);
}

// Enemy 3: Chase Shooter (Yellow) - Bottom of spawn zone
const enemy3 = EnemyFactory.create('CHASE_SHOOTER', new Vector(enemyX, GameConfig.height - 60));
if (enemy3) {
  engine.add(enemy3);
}


// Create and add player to the scene
const player = new Player();
// Override default position to center of spawn zone
player.pos = new Vector(spawnZoneWidth / 2, GameConfig.height / 2);
engine.add(player);

engine.start();

// Ensure canvas has focus for keyboard input
engine.canvas.focus();
