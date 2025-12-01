import { Vector } from 'excalibur';

/**
 * Screen shake effect manager
 */
export class ScreenShake {
  private shakeAmount: number = 0;
  private shakeDecay: number = 0.9; // How quickly shake decreases
  private maxShake: number = 10; // Maximum shake distance in pixels

  /**
   * Add shake intensity (0-1)
   */
  public shake(intensity: number = 1): void {
    this.shakeAmount = Math.min(this.shakeAmount + intensity, 1);
  }

  /**
   * Update shake and return current offset
   */
  public update(delta: number): Vector {
    // Decay shake over time
    this.shakeAmount *= this.shakeDecay;

    if (this.shakeAmount < 0.01) {
      this.shakeAmount = 0;
      return Vector.Zero;
    }

    // Generate random offset
    const offset = new Vector(
      (Math.random() - 0.5) * 2 * this.shakeAmount * this.maxShake,
      (Math.random() - 0.5) * 2 * this.shakeAmount * this.maxShake
    );

    return offset;
  }

  /**
   * Reset shake
   */
  public reset(): void {
    this.shakeAmount = 0;
  }
}




