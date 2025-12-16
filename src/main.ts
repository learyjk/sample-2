// main.ts
import { Engine, Color, DisplayMode } from 'excalibur'
import './style.css'
import { GameConfig } from '@/config'
import { Hub } from '@/scenes/Hub'
import { Level } from '@/scenes/Level'

const engine = new Engine({
  width: GameConfig.width,
  height: GameConfig.height,
  backgroundColor: Color.fromHex("#0a0a12"), // Arcade dark blue-black
  pixelArt: false,
  pixelRatio: 2,
  displayMode: DisplayMode.FitScreen
});

// Enable debug mode to show collider wireframes - DISABLED for "production" look
// engine.showDebug(true);

// Register scenes
engine.addScene('hub', new Hub());
engine.addScene('level', new Level());

// Start game
engine.start().then(() => {
  // Go to hub initially
  engine.goToScene('hub');
});

// Ensure canvas has focus for keyboard input
engine.canvas.focus();
