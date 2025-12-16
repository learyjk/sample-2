---
description: "Code style conventions, naming, and common patterns"
alwaysApply: true
---

# Code Style Conventions

## Naming Conventions

- **Classes**: PascalCase (`Player`, `EnemyFactory`)
- **Interfaces**: PascalCase with `I` prefix for behavior interfaces (`IEnemyBehavior`)
- **Variables/Methods**: camelCase (`playerHealth`, `takeDamage()`)
- **Constants**: UPPER_SNAKE_CASE (`PLAYER_COLOR`, `HEAL_INTERVAL`)
- **Files**: PascalCase for classes (`Player.ts`), camelCase for utilities (`config.ts`)

## Common Patterns

### Cooldown Timers

Always use frame-independent cooldown timers:

```typescript
private shootCooldownTimer: number = 0;
private readonly SHOOT_COOLDOWN: number = GameConfig.player.shooting.cooldown;

public onPreUpdate(engine: Engine, delta: number): void {
  if (this.shootCooldownTimer > 0) {
    this.shootCooldownTimer -= delta;
  }

  if (canShoot && this.shootCooldownTimer <= 0) {
    this.shoot(engine);
    this.shootCooldownTimer = this.SHOOT_COOLDOWN;
  }
}
```

### Damage System

Implement `takeDamage` method consistently:

```typescript
public takeDamage(amount: number): void {
  this.health -= amount;
  if (this.health <= 0) {
    this.kill(); // Excalibur method to remove actor
  }
}
```

### Projectile Creation

Always clone start position and use config for speed:

```typescript
const projectile = new Projectile(
  this.pos.clone(),           // Start position (cloned)
  targetPosition,             // Target position
  undefined,                   // Optional collision group
  false,                      // isEnemyProjectile
  GameConfig.player.projectileSpeed
);
engine.add(projectile);
```

### Accuracy/Spread Calculation

Use rotation matrix for spread calculations:

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

### Normalize Diagonal Movement

Always normalize diagonal movement to prevent faster diagonal speed:

```typescript
let x = 0;
let y = 0;

// ... set x and y based on input ...

// Normalize diagonal movement
if (x !== 0 || y !== 0) {
  if (x !== 0 && y !== 0) {
    const magnitude = Math.sqrt(x * x + y * y);
    x /= magnitude;
    y /= magnitude;
  }
  this.facingDirection = new Vector(x, y).normalize();
}

this.vel = new Vector(x * this.speed, y * this.speed);
```

### Color Constants

Use Material Design color palette with hex codes:

```typescript
const PLAYER_COLOR = Color.fromHex("#42a5f5"); // Material Blue 400
const HEALTH_BAR_FG = Color.fromHex("#66bb6a"); // Material Green 400
const HEALTH_BAR_BG = Color.fromHex("#424242"); // Dark Grey
```

## Best Practices

1. **Never hardcode values** - use `GameConfig`
2. **Keep actors focused** - one responsibility per actor
3. **Use events** for loose coupling between systems
4. **Validate inputs** - check for undefined/null before use
5. **Use readonly** for constants that shouldn't be reassigned
6. **Clone vectors** when storing positions: `pos.clone()`
7. **Normalize movement** - prevent faster diagonal movement
8. **Clean up** - remove event listeners, timers in `onDeactivate`
9. **Use delta time** - multiply by `delta` for frame-independent updates
10. **Comment complex math** - explain rotation matrices, spread calculations, etc.

## Common Pitfalls to Avoid

1. **Forgetting to normalize diagonal movement** - causes faster diagonal speed
2. **Not cloning vectors** - can cause shared reference bugs
3. **Hardcoding values** - makes balancing difficult
4. **Not cleaning up** - memory leaks from event listeners
5. **Using `wasPressed` instead of `isHeld`** - for continuous actions
6. **Not checking for undefined** - when finding actors in scene
7. **Forgetting cooldown timers** - causes spam shooting
8. **Not using delta time** - causes frame-rate dependent behavior

## Type Guards

Use type guards for safe type checking:

```typescript
// Helper to check if actor has takeDamage method
const isDamageable = (actor: any): actor is { takeDamage: (amount: number) => void } => {
  return actor && typeof actor.takeDamage === 'function';
};

if (isDamageable(other)) {
  other.takeDamage(this.damage);
}
```

## Underscore Prefix

Use underscore prefix for unused parameters:

```typescript
public onInitialize(_engine: Engine): void {
  // _engine is unused, prefix with underscore
}

public onPreUpdate(engine: Engine, _delta: number): void {
  // _delta is unused, prefix with underscore
}
```

