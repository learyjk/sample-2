# Coding Style Guide for Excalibur Shooter Game

This document describes the coding patterns, conventions, and architectural decisions used in this Excalibur.js-based shooter game. Use this guide when writing or modifying code for this project.

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Code Style Conventions](#code-style-conventions)
4. [Architecture Patterns](#architecture-patterns)
5. [Excalibur.js Patterns](#excaliburjs-patterns)
6. [Common Patterns](#common-patterns)
7. [Configuration Management](#configuration-management)
8. [Examples](#examples)

## Technology Stack

- **Game Engine**: Excalibur.js v0.31.0
- **Language**: TypeScript 5.9.3 (strict mode)
- **Build Tool**: Vite 7.2.4
- **Module System**: ES Modules (ESM)

## Project Structure

```
src/
├── Actors/              # Game entities (Player, Enemy, Projectile, etc.)
│   ├── enemies/         # Enemy-specific code
│   │   ├── behaviors/   # Enemy AI behaviors (Strategy pattern)
│   │   └── utils/       # Enemy utilities (pathfinding, obstacle avoidance)
│   ├── Player.ts        # Player actor
│   ├── Familiar.ts      # Companion pet actor
│   ├── Projectile.ts    # Projectile actor
│   └── Obstacle.ts      # Static obstacle actor
├── scenes/              # Game scenes (Hub, Level)
├── config.ts            # Central game configuration
├── CollisionGroups.ts   # Collision group definitions
├── LevelManager.ts      # Singleton for level/health persistence
├── LevelConfig.ts       # Level generation logic
└── main.ts              # Entry point
```

## Code Style Conventions

### Naming Conventions

- **Classes**: PascalCase (`Player`, `EnemyFactory`)
- **Interfaces**: PascalCase with `I` prefix for behavior interfaces (`IEnemyBehavior`)
- **Variables/Methods**: camelCase (`playerHealth`, `takeDamage()`)
- **Constants**: UPPER_SNAKE_CASE (`PLAYER_COLOR`, `HEAL_INTERVAL`)
- **Files**: PascalCase for classes (`Player.ts`), camelCase for utilities (`config.ts`)

### TypeScript Conventions

- **Always use explicit types** for function parameters and return values
- **Use `type` imports** for type-only imports: `import type { EnemyConfig } from './EnemyConfig'`
- **Use `as const`** for configuration objects to ensure immutability
- **Prefer interfaces** for object shapes, types for unions/intersections
- **Use readonly** for constants that shouldn't be reassigned: `private readonly HEAL_INTERVAL: number`

### Import Organization

1. Excalibur imports first
2. Type imports (if separate)
3. Local imports using `@/` alias
4. Relative imports last

```typescript
import { Actor, Engine, Vector, Color } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { GameConfig } from '@/config';
import { Player } from './Player';
```

### Comments

- **Use JSDoc-style comments** for public methods and complex logic
- **Use inline comments** for non-obvious code sections
- **Explain WHY, not WHAT** - focus on intent and reasoning
- **Update comments** when code changes

```typescript
/**
 * Fire a projectile
 * Auto-aims at nearest enemy with accuracy spread, or shoots forward if no enemies
 */
private shoot(engine: Engine): void {
  // Find all enemies in the current scene
  const enemies = engine.currentScene.actors.filter(actor => {
    return actor instanceof Enemy;
  }) as Enemy[];
}
```

## Architecture Patterns

### 1. Configuration-Driven Design

All game values come from `GameConfig` in `config.ts`. Never hardcode values.

```typescript
// ✅ Good
const speed = GameConfig.player.speed;

// ❌ Bad
const speed = 300;
```

### 2. Factory Pattern

Use factories for creating entities (e.g., `EnemyFactory`):

```typescript
const enemy = EnemyFactory.create('stationary_shooter', position);
```

### 3. Strategy Pattern (Behaviors)

Enemy AI uses the Strategy pattern via `IEnemyBehavior`:

```typescript
export interface IEnemyBehavior {
  updateMovement(enemy: Actor, engine: Engine, delta: number): void;
  updateShooting(enemy: Actor, engine: Engine, delta: number): void;
  onInitialize?(enemy: Actor, engine: Engine): void;
}
```

### 4. Singleton Pattern

Use singletons sparingly for managers (`LevelManager`):

```typescript
export class LevelManager {
  private static instance: LevelManager;
  
  public static getInstance(): LevelManager {
    if (!LevelManager.instance) {
      LevelManager.instance = new LevelManager();
    }
    return LevelManager.instance;
  }
}
```

### 5. Event-Driven Architecture

Use Excalibur events for communication:

```typescript
// Listen for events
this.player.once('kill', () => this.onPlayerDeath());

// Emit custom events
this.emit('hitEnemy', { enemy: other });
```

## Excalibur.js Patterns

### Actor Lifecycle

Actors extend `Actor` and implement lifecycle methods:

```typescript
export class Player extends Actor {
  constructor(initialHealth?: number) {
    super({
      name: 'player',
      pos: new Vector(10, centerY),
      radius: radius,
      color: PLAYER_COLOR,
      collisionType: CollisionType.Active,
      collisionGroup: PlayerCollisionGroupConfig,
    });
  }

  public onInitialize(_engine: Engine): void {
    // Called once when actor is added to scene
  }

  public onPreUpdate(engine: Engine, _delta: number): void {
    // Called every frame before physics update
  }
}
```

### Scene Lifecycle

Scenes extend `Scene`:

```typescript
export class Level extends Scene {
  onInitialize(engine: Engine): void {
    // Called once when scene is created
  }

  onActivate(context: any): void {
    // Called when scene becomes active
  }

  onDeactivate(): void {
    // Called when leaving scene
  }
}
```

### Collision Groups

Use collision groups to control what collides with what:

```typescript
// Define identity
export const PlayerCollisionGroup = CollisionGroupManager.create('player');

// Create config with collision mask
export const PlayerCollisionGroupConfig = createConfig(PlayerCollisionGroup, [
  EnemyCollisionGroup,
  ObstacleCollisionGroup,
]);
```

### Custom Rendering

Use `graphics.onPostDraw` for custom UI/visuals:

```typescript
this.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
  ctx.save();
  // Draw custom graphics relative to actor
  ctx.drawRectangle(position, width, height, color);
  ctx.restore();
};
```

## Common Patterns

### Finding Actors

```typescript
// Find player
const player = engine.currentScene.actors.find(
  actor => actor instanceof Player
) as Player | undefined;

// Find all enemies
const enemies = engine.currentScene.actors.filter(
  actor => actor instanceof Enemy
) as Enemy[];
```

### Cooldown Timers

```typescript
private shootCooldownTimer: number = 0;
private readonly SHOOT_COOLDOWN: number = GameConfig.player.shooting.cooldown;

public onPreUpdate(engine: Engine, _delta: number): void {
  if (this.shootCooldownTimer > 0) {
    this.shootCooldownTimer -= _delta;
  }

  if (canShoot && this.shootCooldownTimer <= 0) {
    this.shoot(engine);
    this.shootCooldownTimer = this.SHOOT_COOLDOWN;
  }
}
```

### Damage System

```typescript
public takeDamage(amount: number): void {
  this.health -= amount;
  if (this.health <= 0) {
    this.kill(); // Excalibur method to remove actor
  }
}
```

### Projectile Creation

```typescript
const projectile = new Projectile(
  this.pos.clone(),           // Start position
  targetPosition,             // Target position
  undefined,                   // Optional collision group
  false,                      // isEnemyProjectile
  GameConfig.player.projectileSpeed
);
engine.add(projectile);
```

### Accuracy/Spread Calculation

```typescript
const baseDirection = targetPos.sub(this.pos).normalize();
const spreadAmount = GameConfig.player.accuracy.spreadAngle * 
                    (1 - GameConfig.player.accuracy.baseAccuracy);
const randomAngle = (Math.random() - 0.5) * spreadAmount * 2;

// Apply rotation matrix
const cos = Math.cos(randomAngle);
const sin = Math.sin(randomAngle);
const spreadDirection = new Vector(
  baseDirection.x * cos - baseDirection.y * sin,
  baseDirection.x * sin + baseDirection.y * cos
);
```

## Configuration Management

### Adding New Config Values

1. Add to `GameConfig` in `config.ts`
2. Use nested objects for organization
3. Add comments explaining units/range
4. Use `as const` to ensure immutability

```typescript
export const GameConfig = {
  player: {
    speed: 300, // pixels per second
    health: 100,
    shooting: {
      cooldown: 200, // milliseconds between shots
    },
  },
} as const;
```

### Accessing Config

Always access via `GameConfig`:

```typescript
const speed = GameConfig.player.speed;
const cooldown = GameConfig.player.shooting.cooldown;
```

## Examples

### Creating a New Enemy Type

1. **Create behavior** (if needed) in `src/Actors/enemies/behaviors/`:

```typescript
export class MyEnemyBehavior implements IEnemyBehavior {
  updateMovement(enemy: Enemy, engine: Engine, delta: number): void {
    // Movement logic
  }

  updateShooting(enemy: Enemy, engine: Engine, delta: number): void {
    // Shooting logic
  }
}
```

2. **Add config** to `GameConfig.enemy` in `config.ts`:

```typescript
myEnemy: {
  speed: 60,
  health: 70,
  shooting: {
    cooldown: 1000,
  }
}
```

3. **Register** in `EnemyTypes.ts`:

```typescript
MY_ENEMY: {
  id: 'my_enemy',
  name: 'My Enemy',
  appearance: {
    color: PALETTE.CYAN,
  },
  behavior: new MyEnemyBehavior(),
  stats: {
    speed: GameConfig.enemy.myEnemy.speed,
    health: GameConfig.enemy.myEnemy.health,
  },
  shooting: {
    enabled: true,
    cooldown: GameConfig.enemy.myEnemy.shooting.cooldown,
  },
}
```

### Creating a New Actor

```typescript
import { Actor, Engine, Vector, Color, CollisionType } from 'excalibur';
import { GameConfig } from '@/config';

export class MyActor extends Actor {
  constructor(position: Vector) {
    super({
      name: 'myActor',
      pos: position,
      radius: GameConfig.width * 0.01, // Use percentage-based sizing
      color: Color.Blue,
      collisionType: CollisionType.Active,
      collisionGroup: MyCollisionGroupConfig,
    });
  }

  public onInitialize(_engine: Engine): void {
    // Setup code
  }

  public onPreUpdate(engine: Engine, _delta: number): void {
    // Update logic
  }
}
```

### Adding a New Scene

```typescript
import { Scene, Engine } from 'excalibur';

export class MyScene extends Scene {
  onInitialize(engine: Engine): void {
    // One-time setup
  }

  onActivate(context: any): void {
    const engine = context.engine;
    // Setup when scene becomes active
  }

  onDeactivate(): void {
    // Cleanup when leaving scene
  }
}
```

Register in `main.ts`:

```typescript
engine.addScene('myScene', new MyScene());
```

## Color Palette

Use Material Design color palette with hex codes:

```typescript
const PLAYER_COLOR = Color.fromHex("#42a5f5"); // Material Blue 400
const HEALTH_BAR_FG = Color.fromHex("#66bb6a"); // Material Green 400
const HEALTH_BAR_BG = Color.fromHex("#424242"); // Dark Grey
```

## Path Aliases

Use `@/` prefix for imports from `src/`:

```typescript
import { GameConfig } from '@/config';
import { Player } from '@/Actors/Player';
```

## Best Practices

1. **Never hardcode values** - use `GameConfig`
2. **Keep actors focused** - one responsibility per actor
3. **Use events** for loose coupling between systems
4. **Validate inputs** - check for undefined/null before use
5. **Use readonly** for constants that shouldn't change
6. **Clone vectors** when storing positions: `pos.clone()`
7. **Normalize movement** - prevent faster diagonal movement
8. **Clean up** - remove event listeners, timers in `onDeactivate`
9. **Use delta time** - multiply by `delta` for frame-independent updates
10. **Comment complex math** - explain rotation matrices, spread calculations, etc.

## Common Pitfalls

1. **Forgetting to normalize diagonal movement** - causes faster diagonal speed
2. **Not cloning vectors** - can cause shared reference bugs
3. **Hardcoding values** - makes balancing difficult
4. **Not cleaning up** - memory leaks from event listeners
5. **Using `wasPressed` instead of `isHeld`** - for continuous actions
6. **Not checking for undefined** - when finding actors in scene
7. **Forgetting cooldown timers** - causes spam shooting

## Testing Considerations

- Use `console.log` for debugging (no formal test framework yet)
- Test with different level configurations
- Verify collision groups work correctly
- Check that config changes propagate correctly

---

**Last Updated**: Based on codebase as of latest commit
**Game Version**: Excalibur.js v0.31.0

