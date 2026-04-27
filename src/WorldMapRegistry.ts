// src/WorldMapRegistry.ts
// Central registry for world block data.
// CityEntities register themselves here on init.
// Any entity (MetroEntity, future AIEntity etc) can query it.

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

// Key format: "gridX:gridZ"
type CityKey = string;

export class WorldMapRegistry {
    private cities = new Map<CityKey, Map<string, BlockData>>();

    private static cityKey(gridX: number, gridZ: number): CityKey {
        return `${gridX}:${gridZ}`;
    }

    private static blockKey(localX: number, localZ: number): string {
        return `${localX}:${localZ}`;
    }

    // Called by CityEntity during init()
    registerCity(gridX: number, gridZ: number, blocks: BlockData[]): void {
        const key = WorldMapRegistry.cityKey(gridX, gridZ);
        const blockMap = new Map<string, BlockData>();
        blocks.forEach((b) => blockMap.set(WorldMapRegistry.blockKey(b.localX, b.localZ), b));
        this.cities.set(key, blockMap);
    }

    // Query a single block — returns undefined if city not registered yet
    getBlock(gridX: number, gridZ: number, localX: number, localZ: number): BlockData | undefined {
        return this.cities
            .get(WorldMapRegistry.cityKey(gridX, gridZ))
            ?.get(WorldMapRegistry.blockKey(localX, localZ));
    }

    getBlockType(
        gridX: number,
        gridZ: number,
        localX: number,
        localZ: number,
    ): BlockType | undefined {
        return this.getBlock(gridX, gridZ, localX, localZ)?.type;
    }

    // Check if a city has been registered
    hasCity(gridX: number, gridZ: number): boolean {
        return this.cities.has(WorldMapRegistry.cityKey(gridX, gridZ));
    }

    // Get all blocks for a city — useful for bulk queries
    getCityBlocks(gridX: number, gridZ: number): BlockData[] {
        const map = this.cities.get(WorldMapRegistry.cityKey(gridX, gridZ));
        return map ? Array.from(map.values()) : [];
    }

    // Mutate a block type — used by MetroEntity to convert trees to ground
    setBlockType(
        gridX: number,
        gridZ: number,
        localX: number,
        localZ: number,
        type: BlockType,
    ): void {
        const block = this.getBlock(gridX, gridZ, localX, localZ);
        if (block) block.type = type;
    }

    dispose(): void {
        this.cities.clear();
    }
}
