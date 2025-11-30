import { Scene, Engine, Vector, Color, Label, Font, FontUnit } from 'excalibur';
import { LevelManager } from '../LevelManager';

export class Hub extends Scene {
    private startButton: HTMLButtonElement | null = null;
    private titleLabel: Label | null = null;
    private infoLabel: Label | null = null;

    onInitialize(engine: Engine): void {
        // Add title text
        this.titleLabel = new Label({
            text: 'Excalibur Shooter',
            pos: new Vector(engine.halfDrawWidth, engine.halfDrawHeight - 50),
            font: new Font({
                size: 48,
                unit: FontUnit.Px,
                color: Color.White,
                family: 'sans-serif'
            })
        });
        this.titleLabel.anchor.setTo(0.5, 0.5);
        this.add(this.titleLabel);

        this.infoLabel = new Label({
            text: `Current Level: ${LevelManager.getInstance().getCurrentLevel()}`,
            pos: new Vector(engine.halfDrawWidth, engine.halfDrawHeight + 20),
            font: new Font({
                size: 24,
                unit: FontUnit.Px,
                color: Color.White,
                family: 'sans-serif'
            })
        });
        this.infoLabel.anchor.setTo(0.5, 0.5);
        this.add(this.infoLabel);
    }

    onActivate(context: any): void {
        const engine = context.engine;

        // Update level info
        if (this.infoLabel) {
            this.infoLabel.text = `Current Level: ${LevelManager.getInstance().getCurrentLevel()}`;
        }

        // Create HTML button
        this.startButton = document.createElement('button');
        this.startButton.textContent = 'Start Level';
        this.startButton.style.position = 'absolute';
        this.startButton.style.top = '60%';
        this.startButton.style.left = '50%';
        this.startButton.style.transform = 'translate(-50%, -50%)';
        this.startButton.style.padding = '1rem 2rem';
        this.startButton.style.fontSize = '1.5rem';
        this.startButton.style.zIndex = '100';

        this.startButton.onclick = () => {
            engine.goToScene('level');
        };

        document.body.appendChild(this.startButton);
    }

    onDeactivate(): void {
        // Remove button
        if (this.startButton && this.startButton.parentNode) {
            this.startButton.parentNode.removeChild(this.startButton);
            this.startButton = null;
        }
    }
}

