import { GameConfig } from './config';

export class LevelManager {
  private static instance: LevelManager;
  private currentLevel: number = 1;
  private playerHealth: number = GameConfig.player.health;

  private constructor() {}

  public static getInstance(): LevelManager {
    if (!LevelManager.instance) {
      LevelManager.instance = new LevelManager();
    }
    return LevelManager.instance;
  }

  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  public incrementLevel(): void {
    this.currentLevel++;
  }

  public resetLevel(): void {
    this.currentLevel = 1;
    this.playerHealth = GameConfig.player.health; // Reset health when starting over
  }

  public getPlayerHealth(): number {
    return this.playerHealth;
  }

  public setPlayerHealth(health: number): void {
    this.playerHealth = health;
  }
}
