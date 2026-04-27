// src/CoordinateSystem.ts
import * as THREE from 'three';
import proj4 from 'proj4';
import type { WorldAddress, GeoPoint } from './types/Coordinates';

export interface CoordinateSystemConfig {
    gridSize: number; // blocks per city tile (e.g. 60)
    blockSize: number; // three.js units per block (e.g. 1.0)
    metersPerBlock: number; // real-world meters per block (e.g. 83)
}

export class CoordinateSystem {
    private proj: proj4.Converter;
    private metersPerUnit: number;

    constructor(private config: CoordinateSystemConfig) {
        this.metersPerUnit = config.metersPerBlock / config.blockSize;

        // WGS84 — standard GeoJSON coordinate system, what Turf.js expects
        const WGS84 = 'EPSG:4326';

        // Custom flat/Cartesian projection for our fake world.
        // +proj=tmerc    — Transverse Mercator, flat and accurate at small scales
        // +lat_0=0       — origin latitude
        // +lon_0=0       — origin longitude
        // +k=1           — scale factor
        // +x_0=0 +y_0=0  — false easting/northing (our world origin is 0,0)
        // +units=m       — output in meters
        const FAKE_WORLD = '+proj=tmerc +lat_0=0 +lon_0=0 +k=1 +x_0=0 +y_0=0 +units=m +datum=WGS84';

        // proj4 converter goes both directions: toGeo and fromGeo
        this.proj = proj4(FAKE_WORLD, WGS84);
    }

    // --- WorldAddress → Three.js XYZ ---
    toWorld(address: WorldAddress): THREE.Vector3 {
        const { gridX, gridZ, localX, localZ } = address;
        const { gridSize, blockSize } = this.config;
        return new THREE.Vector3(
            (gridX * gridSize + localX) * blockSize,
            0,
            (gridZ * gridSize + localZ) * blockSize,
        );
    }

    // --- Three.js XYZ → WorldAddress ---
    fromWorld(position: THREE.Vector3): WorldAddress {
        const { gridSize, blockSize } = this.config;
        const blockX = Math.floor(position.x / blockSize);
        const blockZ = Math.floor(position.z / blockSize);
        return {
            gridX: Math.floor(blockX / gridSize),
            gridZ: Math.floor(blockZ / gridSize),
            localX: ((blockX % gridSize) + gridSize) % gridSize,
            localZ: ((blockZ % gridSize) + gridSize) % gridSize,
        };
    }

    // --- WorldAddress → GeoPoint (via proj4) ---
    // Three.js Z maps to proj4 northing (Y), Three.js X maps to easting (X)
    toGeo(address: WorldAddress): GeoPoint {
        const world = this.toWorld(address);
        const eastingMeters = world.x * this.metersPerUnit;
        const northingMeters = world.z * this.metersPerUnit;

        // proj4.inverse: projected meters → [lng, lat]
        const [lng, lat] = this.proj.inverse([eastingMeters, northingMeters]);
        return { lat, lng };
    }

    // --- GeoPoint → WorldAddress (via proj4) ---
    fromGeo(point: GeoPoint): WorldAddress {
        // proj4.forward: [lng, lat] → projected meters
        const [eastingMeters, northingMeters] = this.proj.forward([point.lng, point.lat]);
        const worldX = eastingMeters / this.metersPerUnit;
        const worldZ = northingMeters / this.metersPerUnit;
        return this.fromWorld(new THREE.Vector3(worldX, 0, worldZ));
    }

    // --- Turf-ready GeoJSON point from a WorldAddress ---
    // Turf always wants [lng, lat] order
    toTurfCoord(address: WorldAddress): [number, number] {
        const { lat, lng } = this.toGeo(address);
        return [lng, lat];
    }

    // --- Distance between two addresses in meters ---
    distanceMeters(a: WorldAddress, b: WorldAddress): number {
        const wa = this.toWorld(a);
        const wb = this.toWorld(b);
        return wa.distanceTo(wb) * this.metersPerUnit;
    }

    // --- Travel time between two stops in minutes ---
    travelMinutes(a: WorldAddress, b: WorldAddress, speedKmh: number): number {
        const distanceKm = this.distanceMeters(a, b) / 1000;
        return (distanceKm / speedKmh) * 60;
    }
}
