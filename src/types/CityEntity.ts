export type BlockType =
    | 'water'
    | 'sand'
    | 'grass'
    | 'tree'
    | 'stone'
    | 'building_low'
    | 'building_high';

export interface BlockData {
    localX: number;
    localZ: number;
    type: BlockType;
    targetHeight: number;
    dist: number;
    instanceId: number;
}

export interface CityConfig {
    gridX: number; // which city tile in the world grid (X axis)
    gridZ: number; // which city tile in the world grid (Z axis)
    gridSize: number; // how many blocks wide/deep (e.g. 60)
    blockSize: number; // world units per block (e.g. 1.0)
    maxHeight: number; // max block stack height
    seed?: number; // for deterministic generation later
}
