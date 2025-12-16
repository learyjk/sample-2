---
description: "TypeScript conventions and type inference preferences for the ExcaliburJS game"
alwaysApply: true
---

# TypeScript Conventions

## Type Inference

**Prefer type inference whenever possible.** Only add explicit types when necessary for clarity, API boundaries, or when TypeScript cannot infer correctly.

### ✅ Good - Let TypeScript infer

```typescript
// Infer return type
const player = engine.currentScene.actors.find(actor => actor instanceof Player);

// Infer variable types
const speed = GameConfig.player.speed;
const enemies = engine.currentScene.actors.filter(actor => actor instanceof Enemy);

// Infer from function parameters
function createEnemy(position: Vector, config: EnemyConfig) {
  // TypeScript infers return type from constructor
  return new Enemy(position, config);
}
```

### ❌ Avoid - Unnecessary explicit types

```typescript
// Don't do this - TypeScript can infer
const speed: number = GameConfig.player.speed;
const player: Player | undefined = engine.currentScene.actors.find(...);

// Don't do this - return type can be inferred
function createEnemy(position: Vector, config: EnemyConfig): Enemy {
  return new Enemy(position, config);
}
```

### ✅ When to use explicit types

```typescript
// Public API boundaries - function signatures
export function createEnemy(position: Vector, config: EnemyConfig): Enemy {
  return new Enemy(position, config);
}

// Complex return types that benefit from clarity
public getAccuracyStats(): { shotsFired: number; hitsLanded: number; accuracy: number } {
  return {
    shotsFired: this.shotsFired,
    hitsLanded: this.hitsLanded,
    accuracy: this.getAccuracy()
  };
}

// Type narrowing when needed
const player = engine.currentScene.actors.find(actor => actor instanceof Player) as Player | undefined;
```

## Type Imports

Always use `type` imports for type-only imports:

```typescript
import { Engine, Vector } from 'excalibur';
import type { IEnemyBehavior } from '../EnemyBehavior';
import type { EnemyConfig } from './EnemyConfig';
import type { ExcaliburGraphicsContext } from 'excalibur';
```

## Type Assertions

Use type assertions sparingly and only when you're certain of the type:

```typescript
// ✅ Good - Type guard pattern
const enemies = engine.currentScene.actors.filter(
  actor => actor instanceof Enemy
) as Enemy[];

// ✅ Good - Safe assertion with undefined check
const player = engine.currentScene.actors.find(
  actor => actor instanceof Player
) as Player | undefined;

if (player) {
  // player is now Player, not Player | undefined
}
```

## Readonly and Const

- Use `readonly` for class properties that shouldn't be reassigned
- Use `as const` for configuration objects to ensure immutability
- Use `const` for variables that won't be reassigned

```typescript
private readonly HEAL_INTERVAL: number = GameConfig.familiar.buffs.healInterval;
private readonly SHOOT_COOLDOWN: number = GameConfig.player.shooting.cooldown;

export const GameConfig = {
  player: {
    speed: 300,
  },
} as const;
```

## Interface vs Type

- Use `interface` for object shapes that may be extended
- Use `type` for unions, intersections, and computed types
- Prefix behavior interfaces with `I` (e.g., `IEnemyBehavior`)

```typescript
// ✅ Interface for extensible shapes
export interface IEnemyBehavior {
  updateMovement(enemy: Actor, engine: Engine, delta: number): void;
  updateShooting(enemy: Actor, engine: Engine, delta: number): void;
}

// ✅ Type for unions/complex types
type EnemyType = 'stationary' | 'patrol' | 'chase' | 'tactical';
```

