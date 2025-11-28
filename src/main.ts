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

// --- Boundary Walls ---
// Create 4 walls around the screen edges to prevent actors from moving off-screen
const wallThickness = 10;

// Top wall
const topWall = new Obstacle(
  new Vector(GameConfig.width / 2, wallThickness / 2),
  GameConfig.width,
  wallThickness
);
engine.add(topWall);

// Bottom wall
const bottomWall = new Obstacle(
  new Vector(GameConfig.width / 2, GameConfig.height - wallThickness / 2),
  GameConfig.width,
  wallThickness
);
engine.add(bottomWall);

// Left wall
const leftWall = new Obstacle(
  new Vector(wallThickness / 2, GameConfig.height / 2),
  wallThickness,
  GameConfig.height
);
engine.add(leftWall);

// Right wall
const rightWall = new Obstacle(
  new Vector(GameConfig.width - wallThickness / 2, GameConfig.height / 2),
  wallThickness,
  GameConfig.height
);
engine.add(rightWall);

// --- Actors ---

// Create and add enemies to the scene using the factory
// Spawn in the enemy safe zone
const enemyZoneLeft = GameConfig.width - spawnZoneWidth;
const enemyZoneTop = 0;

// Enemy types to spawn
const enemyTypes = [
  'STATIONARY_SHOOTER',
  'PATROL_SHOOTER',
  'CHASE_SHOOTER',
  'FAST_SHOOTER',
];

// Total number of enemies to spawn
const totalEnemies = 20;

// Spawn enemies distributed across the enemy spawn zone
for (let i = 0; i < totalEnemies; i++) {
  // Random position within enemy spawn zone
  const margin = 20; // Margin from edges
  const x = enemyZoneLeft + margin + Math.random() * (spawnZoneWidth - 2 * margin);
  const y = enemyZoneTop + margin + Math.random() * (GameConfig.height - 2 * margin);

  // Select enemy type (distribute evenly, but with some randomness)
  let enemyType: string;
  if (i < 5) {
    // First 5: Stationary shooters
    enemyType = 'STATIONARY_SHOOTER';
  } else if (i < 10) {
    // Next 5: Patrol shooters
    enemyType = 'PATROL_SHOOTER';
  } else if (i < 15) {
    // Next 5: Chase shooters
    enemyType = 'CHASE_SHOOTER';
  } else {
    // Last 5: Mix of all types (weighted random)
    const randomIndex = Math.floor(Math.random() * enemyTypes.length);
    enemyType = enemyTypes[randomIndex];
  }

  const enemy = EnemyFactory.create(enemyType, new Vector(x, y));
  if (enemy) {
    engine.add(enemy);
  }
}


// Create and add player to the scene
const player = new Player();
// Override default position to center of spawn zone
player.pos = new Vector(spawnZoneWidth / 2, GameConfig.height / 2);
engine.add(player);

engine.start();

// Ensure canvas has focus for keyboard input
engine.canvas.focus();
