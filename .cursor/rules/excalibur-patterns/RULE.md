---
description: "ExcaliburJS patterns and best practices for actors, scenes, and game systems"
alwaysApply: true
---

# ExcaliburJS Patterns

## Actor Lifecycle

Actors extend `Actor` and implement lifecycle methods. Follow this pattern:

```typescript
import { Actor, Engine, Vector, CollisionType } from 'excalibur';
import { GameConfig } from '@/config';
import { PlayerCollisionGroupConfig } from '@/CollisionGroups';

export class MyActor extends Actor {
  constructor(position: Vector) {
    const radius = GameConfig.width * GameConfig.player.radiusPercent;
    
    super({
      name: 'myActor',
      pos: position,
      radius: radius,
      color: Color.Blue,
      collisionType: CollisionType.Active,
      collisionGroup: PlayerCollisionGroupConfig,
    });
  }

  public onInitialize(_engine: Engine): void {
    // Called once when actor is added to scene
    // Setup graphics, listeners, initial state
  }

  public onPreUpdate(engine: Engine, delta: number): void {
    // Called every frame before physics update
    // Handle input, update timers, modify velocity
  }

  public onPostUpdate(_engine: Engine, _delta: number): void {
    // Called every frame after physics update
    // Post-physics logic, cleanup
  }
}
```

## Scene Lifecycle

Scenes extend `Scene` and manage level state:

```typescript
import { Scene, Engine } from 'excalibur';

export class MyScene extends Scene {
  onInitialize(_engine: Engine): void {
    // Called once when scene is created
    // Usually empty - setup happens in onActivate
  }

  onActivate(context: any): void {
    // Called when scene becomes active
    // Reset state, spawn actors, setup level
    this.clear(); // Clear previous actors
    this.setupLevel();
  }

  onDeactivate(): void {
    // Called when leaving scene
    // Save state, cleanup
  }

  onPreUpdate(engine: Engine, delta: number): void {
    // Called every frame
    // Update scene-level systems (camera shake, etc.)
  }
}
```

## Finding Actors

Use `instanceof` checks to find actors in the scene:

```typescript
// Find player
const player = engine.currentScene.actors.find(
  actor => actor instanceof Player
) as Player | undefined;

// Find all enemies
const enemies = engine.currentScene.actors.filter(
  actor => actor instanceof Enemy
) as Enemy[];

// Always check for undefined before using
if (player) {
  const distance = enemy.pos.distance(player.pos);
}
```

## Collision Groups

Always use collision groups from `CollisionGroups.ts`. Never hardcode collision logic:

```typescript
import { PlayerCollisionGroupConfig } from '@/CollisionGroups';

super({
  collisionGroup: PlayerCollisionGroupConfig,
});
```

## Vector Operations

- **Always clone vectors** when storing positions: `pos.clone()`
- **Normalize movement** to prevent faster diagonal speed
- Use `Vector.Zero` for zero vectors

```typescript
// ✅ Good - Clone when storing
const storedPosition = this.pos.clone();
const projectile = new Projectile(this.pos.clone(), targetPosition);

// ✅ Good - Normalize diagonal movement
if (x !== 0 && y !== 0) {
  const magnitude = Math.sqrt(x * x + y * y);
  x /= magnitude;
  y /= magnitude;
}

// ✅ Good - Use Vector.Zero
enemy.vel = Vector.Zero;
```

## Custom Rendering

Use `graphics.onPostDraw` for custom UI/visuals relative to the actor:

```typescript
import type { ExcaliburGraphicsContext } from 'excalibur';

public onInitialize(_engine: Engine): void {
  this.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
    ctx.save();
    // Draw custom graphics relative to actor (Vector.Zero is actor center)
    ctx.drawRectangle(position, width, height, color);
    ctx.restore();
  };
}
```

## Collision Handling

Use `precollision` events for collision handling:

```typescript
import { PreCollisionEvent } from 'excalibur';

public onInitialize(_engine: Engine): void {
  this.on('precollision', (evt) => this.onPreCollision(evt));
}

private onPreCollision(evt: PreCollisionEvent): void {
  const other = evt.other.owner;
  if (!other) return;
  
  // Handle collision logic
  if (other instanceof Enemy) {
    this.takeDamage(10);
  }
}
```

## Adding Actors to Scene

Always use `engine.add()` or `scene.add()` to add actors:

```typescript
// In actor code
engine.add(projectile);

// In scene code
this.add(new Enemy(position));
```

## Frame-Independent Updates

Always multiply by `delta` for frame-independent updates:

```typescript
public onPreUpdate(engine: Engine, delta: number): void {
  // ✅ Good - Frame independent
  this.timer += delta;
  if (this.timer >= this.COOLDOWN) {
    this.shoot();
    this.timer = 0;
  }
  
  // ✅ Good - Cooldown countdown
  if (this.shootCooldownTimer > 0) {
    this.shootCooldownTimer -= delta;
  }
}
```

## Event System

Use Excalibur's event system for loose coupling:

```typescript
// Listen for events
this.player.once('kill', () => this.onPlayerDeath());

// Emit custom events
this.emit('hitEnemy', { enemy: other });

// Clean up listeners in onDeactivate
```

