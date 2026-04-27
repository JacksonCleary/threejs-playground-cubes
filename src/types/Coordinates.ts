// src/types/Coordinates.ts

// A block's full address in the world
export interface WorldAddress {
    gridX: number; // which city tile (X)
    gridZ: number; // which city tile (Z)
    localX: number; // which block within the tile (X)
    localZ: number; // which block within the tile (Z)
}

// Fake lat/lng — compatible with Turf.js GeoJSON later
export interface GeoPoint {
    lat: number;
    lng: number;
}
