import * as THREE from 'three';
import type { WorldAddress } from '../types/Coordinates';

// --- Config ---
export interface MetroConfig {
    gridX: number; // which city tile this metro belongs to
    gridZ: number;
    gridSize: number; // must match CityEntity gridSize
    blockSize: number; // must match CityEntity blockSize
    lineCount: number; // how many metro lines to generate
    stopsPerLine: number; // how many stops per line
    seed?: number;
}

export interface MetroStop {
    address: WorldAddress;
    worldPos: THREE.Vector3;
    name: string; // placeholder name for now
}

export interface MetroLine {
    id: number;
    color: number;
    stops: MetroStop[];
}
