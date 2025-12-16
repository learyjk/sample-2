---
description: "Project structure, file organization, and import conventions"
alwaysApply: true
---

# Project Structure and Conventions

## Directory Structure

```
src/
├── Actors/              # Game entities (Player, Enemy, Projectile, etc.)
│   ├── enemies/         # Enemy-specific code
│   │   ├── behaviors/   # Enemy AI behaviors (Strategy pattern)
│   │   └── utils/       # Enemy utilities (pathfinding, obstacle avoidance)
│   ├── Player.ts
│   ├── Familiar.ts
│   ├── Projectile.ts
│   └── Obstacle.ts
├── scenes/              # Game scenes (Hub, Level)
├── config.ts            # Central game configuration
├── CollisionGroups.ts   # Collision group definitions
├── LevelManager.ts       # Singleton for level/health persistence
├── LevelConfig.ts       # Level generation logic
└── main.ts              # Entry point
```

## Import Organization

Order imports in this sequence:

1. Excalibur imports first
2. Type imports (if separate from regular imports)
3. Local imports using `@/` alias
4. Relative imports last

```typescript
import { Actor, Engine, Vector, Color } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { GameConfig } from '@/config';
import { PlayerCollisionGroupConfig } from '@/CollisionGroups';
import { Projectile } from '@/Actors/Projectile';
import { Enemy } from './Enemy';
```

## Path Aliases

Always use `@/` prefix for imports from `src/`:

```typescript
// ✅ Good
import { GameConfig } from '@/config';
import { Player } from '@/Actors/Player';
import { ParticleSystem } from '@/utils/ParticleSystem';

// ❌ Bad - Don't use relative paths for src/ imports
import { GameConfig } from '../../config';
```

## File Naming

- **Classes**: PascalCase (`Player.ts`, `EnemyFactory.ts`)
- **Utilities/Config**: camelCase (`config.ts`, `levelConfig.ts`)
- **Interfaces**: PascalCase with `I` prefix for behavior interfaces (`IEnemyBehavior.ts`)

## Configuration Management

**Never hardcode values.** All game values come from `GameConfig` in `config.ts`:

```typescript
// ✅ Good
const speed = GameConfig.player.speed;
const cooldown = GameConfig.player.shooting.cooldown;

// ❌ Bad
const speed = 300;
const cooldown = 200;
```

When adding new config values:

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

## Factory Pattern

Use factories for creating entities:

```typescript
// ✅ Good
const enemy = EnemyFactory.create('stationary_shooter', position);

// ❌ Bad - Don't create enemies directly
const enemy = new Enemy(position, new StationaryShooterBehavior());
```

## Strategy Pattern (Behaviors)

Enemy AI uses the Strategy pattern via `IEnemyBehavior`:

```typescript
export interface IEnemyBehavior {
  updateMovement(enemy: Actor, engine: Engine, delta: number): void;
  updateShooting(enemy: Actor, engine: Engine, delta: number): void;
  onInitialize?(enemy: Actor, engine: Engine): void;
}
```

Behaviors are stored in `src/Actors/enemies/behaviors/` and exported via `index.ts`.

## Singleton Pattern

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

## Comments and Documentation

- Use **JSDoc-style comments** for public methods and complex logic
- Use **inline comments** for non-obvious code sections
- Explain **WHY, not WHAT** - focus on intent and reasoning
- Update comments when code changes

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

