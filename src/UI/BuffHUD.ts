import { Actor, Engine, Vector, Color, CollisionType, Label, Font, FontUnit } from 'excalibur';
import type { ExcaliburGraphicsContext } from 'excalibur';
import { GameConfig } from '@/config';
import { Player } from '@/Actors/Player';

// Arcade color palette
const ARCADE_MAGENTA = Color.fromHex("#ff00ff");
const ARCADE_CYAN = Color.fromHex("#00ffff");
const ARCADE_YELLOW = Color.fromHex("#ffff00");
const ARCADE_BG = Color.fromHex("#0a0a12");
const ARCADE_PANEL_BG = Color.fromHex("#14142880");
const ARCADE_BORDER = Color.fromHex("#00ffff40");

/**
 * Arcade-styled HUD that displays active buffs and effects
 * Features retro pixel-art aesthetic with neon glow effects
 */
export class BuffHUD extends Actor {
  private player: Player | null = null;
  private buffNameLabels: Map<string, Label> = new Map();
  private buffDescLabels: Map<string, Label> = new Map();
  private readonly PADDING = 12;
  private readonly BUFF_HEIGHT = 36;
  private readonly BUFF_SPACING = 6;
  private readonly TEXT_SIZE = 10;
  private readonly ICON_SIZE = 22;
  private readonly PANEL_WIDTH = 220;

  constructor() {
    super({
      name: 'BuffHUD',
      pos: new Vector(0, 0),
      width: GameConfig.width,
      height: GameConfig.height,
      color: Color.Transparent,
      collisionType: CollisionType.PreventCollision,
      z: 1000, // High z-index to render above everything
    });
  }

  public setPlayer(player: Player): void {
    this.player = player;
  }

  public onInitialize(_engine: Engine): void {
    /**
     * Render buffs in arcade style - top-left corner
     * Each buff shows a glowing icon and description with retro styling
     */
    this.graphics.onPostDraw = (ctx: ExcaliburGraphicsContext) => {
      if (!this.player || this.player.isKilled()) {
        return;
      }

      const buffs = this.player.getActiveBuffs();
      
      // Remove labels for buffs that are no longer active
      const activeBuffNames = new Set(buffs.map(b => b.name));
      for (const [buffName, label] of this.buffNameLabels.entries()) {
        if (!activeBuffNames.has(buffName)) {
          if (this.scene) {
            this.scene.remove(label);
          }
          this.buffNameLabels.delete(buffName);
          const descLabel = this.buffDescLabels.get(buffName);
          if (descLabel) {
            if (this.scene) {
              this.scene.remove(descLabel);
            }
            this.buffDescLabels.delete(buffName);
          }
        }
      }

      // Update or create labels for active buffs
      let yOffset = this.PADDING;
      buffs.forEach((buff) => {
        this.updateOrCreateBuffLabels(buff, yOffset);
        yOffset += this.BUFF_HEIGHT + this.BUFF_SPACING;
      });

      // Draw HUD header if there are buffs
      ctx.save();
      if (buffs.length > 0) {
        this.drawHUDHeader(ctx);
      }

      // Draw background panels and icons
      yOffset = this.PADDING + 24; // Offset for header
      buffs.forEach((buff) => {
        this.drawBuffPanel(ctx, buff, yOffset);
        yOffset += this.BUFF_HEIGHT + this.BUFF_SPACING;
      });
      ctx.restore();
    };
  }

  private drawHUDHeader(ctx: ExcaliburGraphicsContext): void {
    // Draw "ACTIVE BUFFS" header with arcade styling
    const headerX = this.PADDING;
    const headerY = 6;
    
    // Header background
    ctx.drawRectangle(
      new Vector(headerX - 2, headerY - 2),
      this.PANEL_WIDTH + 4,
      18,
      ARCADE_BG
    );
    
    // Draw decorative line under header
    ctx.drawLine(
      new Vector(headerX, headerY + 16),
      new Vector(headerX + this.PANEL_WIDTH, headerY + 16),
      ARCADE_CYAN,
      1
    );
  }

  private updateOrCreateBuffLabels(buff: { name: string; description: string }, yOffset: number): void {
    const textX = this.PADDING + 8 + this.ICON_SIZE + 12;
    const adjustedY = yOffset + 24; // Account for header
    const nameY = adjustedY + 10;
    const descY = adjustedY + 24;

    // Update or create name label with arcade font
    let nameLabel = this.buffNameLabels.get(buff.name);
    if (nameLabel) {
      nameLabel.pos = new Vector(textX, nameY);
    } else {
      nameLabel = new Label({
        text: buff.name.toUpperCase(),
        pos: new Vector(textX, nameY),
        font: new Font({
          size: this.TEXT_SIZE,
          unit: FontUnit.Px,
          color: ARCADE_YELLOW,
          family: '"Press Start 2P", "Courier New", monospace',
          shadow: {
            blur: 6,
            offset: new Vector(0, 0),
            color: ARCADE_YELLOW
          }
        })
      });
      nameLabel.anchor.setTo(0, 0);
      if (this.scene) {
        this.scene.add(nameLabel);
      }
      this.buffNameLabels.set(buff.name, nameLabel);
    }

    // Update or create description label
    let descLabel = this.buffDescLabels.get(buff.name);
    if (descLabel) {
      descLabel.text = buff.description.toUpperCase();
      descLabel.pos = new Vector(textX, descY);
    } else {
      descLabel = new Label({
        text: buff.description.toUpperCase(),
        pos: new Vector(textX, descY),
        font: new Font({
          size: this.TEXT_SIZE - 2,
          unit: FontUnit.Px,
          color: Color.fromHex("#8888aa"),
          family: '"Orbitron", "Courier New", monospace'
        })
      });
      descLabel.anchor.setTo(0, 0);
      if (this.scene) {
        this.scene.add(descLabel);
      }
      this.buffDescLabels.set(buff.name, descLabel);
    }
  }

  private drawBuffPanel(ctx: ExcaliburGraphicsContext, buff: { name: string; description: string }, yOffset: number): void {
    const x = this.PADDING;
    const y = yOffset;
    const panelHeight = this.BUFF_HEIGHT;

    // Background panel with arcade styling
    ctx.drawRectangle(
      new Vector(x, y),
      this.PANEL_WIDTH,
      panelHeight,
      ARCADE_PANEL_BG
    );

    // Border with glow effect
    ctx.drawLine(
      new Vector(x, y),
      new Vector(x + this.PANEL_WIDTH, y),
      ARCADE_BORDER,
      1
    );
    ctx.drawLine(
      new Vector(x, y + panelHeight),
      new Vector(x + this.PANEL_WIDTH, y + panelHeight),
      ARCADE_BORDER,
      1
    );
    ctx.drawLine(
      new Vector(x, y),
      new Vector(x, y + panelHeight),
      ARCADE_BORDER,
      1
    );
    ctx.drawLine(
      new Vector(x + this.PANEL_WIDTH, y),
      new Vector(x + this.PANEL_WIDTH, y + panelHeight),
      ARCADE_BORDER,
      1
    );

    // Icon container
    const iconX = x + 8;
    const iconY = y + panelHeight / 2;
    const iconColor = this.getBuffColor(buff.name);
    
    // Draw icon background (darker)
    ctx.drawRectangle(
      new Vector(iconX - 2, iconY - this.ICON_SIZE / 2 - 2),
      this.ICON_SIZE + 4,
      this.ICON_SIZE + 4,
      Color.fromHex("#0a0a12")
    );

    // Draw glowing icon
    ctx.drawCircle(
      new Vector(iconX + this.ICON_SIZE / 2, iconY),
      this.ICON_SIZE / 2,
      iconColor
    );

    // Inner highlight for 3D effect
    ctx.drawCircle(
      new Vector(iconX + this.ICON_SIZE / 2 - 2, iconY - 2),
      this.ICON_SIZE / 4,
      Color.fromHex("#ffffff40")
    );

    // Decorative corner brackets on icon
    const bracketSize = 4;
    const bracketColor = ARCADE_CYAN;
    
    // Top-left bracket
    ctx.drawLine(
      new Vector(iconX - 2, iconY - this.ICON_SIZE / 2 - 2),
      new Vector(iconX - 2 + bracketSize, iconY - this.ICON_SIZE / 2 - 2),
      bracketColor,
      1
    );
    ctx.drawLine(
      new Vector(iconX - 2, iconY - this.ICON_SIZE / 2 - 2),
      new Vector(iconX - 2, iconY - this.ICON_SIZE / 2 - 2 + bracketSize),
      bracketColor,
      1
    );

    // Bottom-right bracket
    ctx.drawLine(
      new Vector(iconX + this.ICON_SIZE + 2, iconY + this.ICON_SIZE / 2 + 2),
      new Vector(iconX + this.ICON_SIZE + 2 - bracketSize, iconY + this.ICON_SIZE / 2 + 2),
      bracketColor,
      1
    );
    ctx.drawLine(
      new Vector(iconX + this.ICON_SIZE + 2, iconY + this.ICON_SIZE / 2 + 2),
      new Vector(iconX + this.ICON_SIZE + 2, iconY + this.ICON_SIZE / 2 + 2 - bracketSize),
      bracketColor,
      1
    );
  }

  private getBuffColor(buffName: string): Color {
    // Return arcade-themed colors based on buff type
    switch (buffName) {
      case 'Tether Buff':
        return ARCADE_YELLOW; // Yellow for familiar buff
      default:
        return ARCADE_MAGENTA; // Default magenta
    }
  }
}
