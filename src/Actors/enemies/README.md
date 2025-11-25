# Enemy System Architecture

This system is designed to scale easily as you add many different enemy types with different sprites, behaviors, and stats.

## Architecture Overview

### 1. **EnemyConfig** (`EnemyConfig.ts`)
   - Bundles all enemy properties: appearance (color/sprite), behavior, stats, shooting config
   - Single source of truth for each enemy type

### 2. **EnemyTypes** (`EnemyTypes.ts`)
   - Registry of all enemy types
   - Easy to add new enemies - just add a new entry
   - Each type has a unique ID

### 3. **EnemyFactory** (`EnemyFactory.ts`)
   - Clean API for creating enemies
   - `EnemyFactory.create(typeId, position)` - Create by type
   - `EnemyFactory.createRandom(position)` - Create random enemy
   - `EnemyFactory.createFromConfig(config, position)` - Create from custom config

### 4. **Enemy Class** (`Enemy.ts`)
   - Base enemy actor
   - Accepts either `EnemyConfig` (new way) or `IEnemyBehavior` (backwards compatible)
   - Handles sprites, colors, stats, and behavior

### 5. **Behaviors** (`behaviors/`)
   - Reusable AI patterns
   - Can be shared across multiple enemy types
   - Easy to create new behaviors

## Adding a New Enemy Type

### Simple Example (Color-based):
```typescript
// In EnemyTypes.ts
NEW_ENEMY_TYPE: {
  id: 'new_enemy',
  name: 'New Enemy',
  appearance: {
    color: Color.Green,
  },
  behavior: new StationaryShooterBehavior(),
  stats: {
    speed: 75,
    health: 2,
  },
  shooting: {
    enabled: true,
    cooldown: 800,
  },
}
```

### With Sprite:
```typescript
// First load your sprite (in main.ts or a loader)
const sprite = new Sprite({
  image: yourImageResource,
  // ... sprite config
});

// Then in EnemyTypes.ts
SPRITE_ENEMY: {
  id: 'sprite_enemy',
  name: 'Sprite Enemy',
  appearance: {
    sprite: sprite, // Use sprite instead of color
    radius: 16, // Optional: override radius
  },
  behavior: new PatrolShooterBehavior(),
  stats: {
    speed: 50,
    health: 3,
  },
  shooting: {
    enabled: true,
  },
}
```

### Using the New Enemy:
```typescript
// In your game code
const enemy = EnemyFactory.create('NEW_ENEMY_TYPE', position);
engine.add(enemy);
```

## Creating Custom Behaviors

1. Implement `IEnemyBehavior` interface:
```typescript
export class MyCustomBehavior implements IEnemyBehavior {
  updateMovement(enemy: Enemy, engine: Engine, delta: number): void {
    // Your movement logic
  }
  
  updateShooting(enemy: Enemy, engine: Engine, delta: number): void {
    // Your shooting logic
  }
  
  onInitialize?(enemy: Enemy, engine: Engine): void {
    // Optional initialization
  }
}
```

2. Use it in an enemy config:
```typescript
CUSTOM_BEHAVIOR_ENEMY: {
  id: 'custom_enemy',
  name: 'Custom Enemy',
  appearance: { color: Color.Purple },
  behavior: new MyCustomBehavior(),
  stats: { speed: 100 },
}
```

## Benefits of This Architecture

1. **Scalable**: Easy to add dozens of enemy types
2. **Maintainable**: All enemy data in one place (`EnemyTypes.ts`)
3. **Flexible**: Supports sprites, colors, custom stats, behaviors
4. **Reusable**: Behaviors can be shared across enemies
5. **Type-safe**: TypeScript ensures correct configuration
6. **Backwards compatible**: Old behavior-based API still works

## Migration from Old System

The old way still works:
```typescript
const enemy = new Enemy(position, new StationaryShooterBehavior());
```

But the new way is recommended:
```typescript
const enemy = EnemyFactory.create('STATIONARY_SHOOTER', position);
```

