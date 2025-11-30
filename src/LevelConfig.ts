import { EnemyTypes } from './Actors/enemies/EnemyTypes';

export interface LevelConfig {
    levelNumber: number;
    enemyCounts: Record<string, number>;
}

/**
 * Generates the level configuration for a given level number.
 * Strategy: Level N has N enemies of each type.
 */
export function generateLevelConfig(level: number): LevelConfig {
    const enemyCounts: Record<string, number> = {};

    // Get all available enemy type IDs
    const allTypes = Object.keys(EnemyTypes);

    // For each type, assign 'level' amount of enemies
    allTypes.forEach(typeId => {
        enemyCounts[typeId] = level;
    });

    return {
        levelNumber: level,
        enemyCounts
    };
}

