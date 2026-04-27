// src/entities/MetroEntity.ts
import * as THREE from 'three';
import { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';
import type { WorldAddress } from '../types/Coordinates';

// --- Config ---
export interface MetroConfig {
    gridX: number;
    gridZ: number;
    gridSize: number;
    blockSize: number;
    lineCount: number;
    stopsPerLine: number;
    seed?: number;
}

export interface MetroStop {
    address: WorldAddress;
    worldPos: THREE.Vector3;
    name: string;
    isIntersection: boolean;
}

export interface MetroLine {
    id: number;
    color: number;
    stops: MetroStop[];
    path: THREE.Vector3[];
    // Parallel array to path — block type at each path point
    pathTerrainTypes: string[];
}

// --- Constants ---
const LINE_COLORS = [
    0xe63946, // red
    0x2a9d8f, // teal
    0xe9c46a, // yellow
    0x6a4c93, // purple
    0xf4a261, // orange
    0x457b9d, // blue
];

const STOP_HEIGHT = 3.0;
const LINE_HEIGHT = 3.0;
const STOP_RADIUS = 0.35;
const PILLAR_RADIUS = 0.18;
const PILLAR_COLOR = 0xaaaaaa;
const TUNNEL_RADIUS = 0.22;
const TUNNEL_COLOR = 0x333344;

export class MetroEntity extends SceneEntity {
    private lines: MetroLine[] = [];
    private lineObjects: THREE.Line[] = [];
    private stopMeshes: THREE.Mesh[] = [];
    private pillarMeshes: THREE.InstancedMesh[] = [];
    private tunnelMeshes: THREE.Mesh[] = [];
    private origin: THREE.Vector3;
    private rng: () => number;

    constructor(private config: MetroConfig) {
        super();
        const { gridX, gridZ, gridSize, blockSize } = config;
        this.origin = new THREE.Vector3(
            gridX * gridSize * blockSize,
            0,
            gridZ * gridSize * blockSize,
        );
        this.rng = MetroEntity.makeRng(config.seed ?? config.gridX * 1000 + config.gridZ);
    }

    init(app: AppContext): void {
        this.generateLines(app);
        this.resolveIntersections();
        this.buildGeometry(app);
    }

    dispose(): void {
        [
            ...this.lineObjects,
            ...this.stopMeshes,
            ...this.tunnelMeshes,
            ...this.pillarMeshes,
        ].forEach((obj) => {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
            obj.removeFromParent();
        });
    }

    getLines(): Readonly<MetroLine[]> {
        return this.lines;
    }

    // --- Line Generation ---

    private generateLines(app: AppContext): void {
        const { gridSize, lineCount, stopsPerLine, gridX, gridZ } = this.config;
        const half = Math.floor(gridSize / 2);
        const margin = 6;
        const inner = half - margin;

        for (let i = 0; i < lineCount; i++) {
            const color = LINE_COLORS[i % LINE_COLORS.length];
            const direction = i % 3;
            const offset = Math.floor((this.rng() * 2 - 1) * inner * 0.6);
            const anchors: WorldAddress[] = [];

            for (let s = 0; s < stopsPerLine; s++) {
                const t = stopsPerLine === 1 ? 0 : (s / (stopsPerLine - 1)) * 2 - 1;
                const along = Math.round(t * inner);
                const nudge = Math.round((this.rng() - 0.5) * 4);

                let localX: number;
                let localZ: number;

                if (direction === 0) {
                    localX = Math.max(-inner, Math.min(inner, along));
                    localZ = Math.max(-inner, Math.min(inner, offset + nudge));
                } else if (direction === 1) {
                    localX = Math.max(-inner, Math.min(inner, offset + nudge));
                    localZ = Math.max(-inner, Math.min(inner, along));
                } else {
                    localX = Math.max(-inner, Math.min(inner, along));
                    localZ = Math.max(-inner, Math.min(inner, along + offset));
                }

                anchors.push({ gridX, gridZ, localX, localZ });
            }

            const fullPath: THREE.Vector3[] = [];
            const fullTerrainTypes: string[] = [];

            for (let s = 0; s < anchors.length - 1; s++) {
                const result = this.octagonalPath(anchors[s], anchors[s + 1], app);
                if (fullPath.length > 0) {
                    result.path.shift();
                    result.terrainTypes.shift();
                }
                fullPath.push(...result.path);
                fullTerrainTypes.push(...result.terrainTypes);
            }

            const stops = this.sampleStopsFromPath(fullPath, stopsPerLine, gridX, gridZ, i);

            this.lines.push({
                id: i,
                color,
                stops,
                path: fullPath,
                pathTerrainTypes: fullTerrainTypes,
            });
        }
    }

    private sampleStopsFromPath(
        path: THREE.Vector3[],
        stopsPerLine: number,
        gridX: number,
        gridZ: number,
        lineId: number,
    ): MetroStop[] {
        if (path.length === 0) return [];

        const indices = new Set<number>();
        indices.add(0);
        indices.add(path.length - 1);

        for (let s = 1; s < stopsPerLine - 1; s++) {
            const t = s / (stopsPerLine - 1);
            indices.add(Math.round(t * (path.length - 1)));
        }

        return Array.from(indices)
            .sort((a, b) => a - b)
            .map((idx, s) => {
                const pos = path[idx].clone().setY(STOP_HEIGHT);
                const address = this.worldPosToAddress(pos, gridX, gridZ);
                return {
                    address,
                    worldPos: pos,
                    name: `L${lineId + 1} S${s + 1}`,
                    isIntersection: false,
                };
            });
    }

    // --- Octagonal Routing ---
    // All angles guaranteed to be 0° or 45° — never 90°.
    // Lines pass freely over all terrain including water.

    private octagonalPath(
        from: WorldAddress,
        to: WorldAddress,
        app: AppContext,
    ): { path: THREE.Vector3[]; terrainTypes: string[] } {
        const dx = to.localX - from.localX;
        const dz = to.localZ - from.localZ;

        if (dx === 0 && dz === 0) {
            const type =
                app.worldMap.getBlockType(from.gridX, from.gridZ, from.localX, from.localZ) ??
                'grass';
            return {
                path: [this.localToWorld(from.localX, from.localZ).setY(LINE_HEIGHT)],
                terrainTypes: [type],
            };
        }

        const absDx = Math.abs(dx);
        const absDz = Math.abs(dz);
        const sx = Math.sign(dx);
        const sz = Math.sign(dz);

        // Already a valid octagonal direction — one straight segment
        if (dx === 0 || dz === 0 || absDx === absDz) {
            return this.strictSegment(
                from.localX,
                from.localZ,
                to.localX,
                to.localZ,
                from.gridX,
                from.gridZ,
                app,
            );
        }

        // Not a clean octagonal angle — decompose into diagonal + axis-aligned.
        // The diagonal covers min(absDx, absDz) steps on both axes simultaneously.
        // Remainder is axis-aligned on the longer axis only.
        // Try diagonal-first and straight-first, pick whichever crosses less water.

        const diagSteps = Math.min(absDx, absDz);
        const longerX = absDx > absDz;

        // Option A: diagonal first
        const diagEndAX = from.localX + sx * diagSteps;
        const diagEndAZ = from.localZ + sz * diagSteps;
        const segA1 = this.strictSegment(
            from.localX,
            from.localZ,
            diagEndAX,
            diagEndAZ,
            from.gridX,
            from.gridZ,
            app,
        );
        const segA2 = this.strictSegment(
            diagEndAX,
            diagEndAZ,
            to.localX,
            to.localZ,
            from.gridX,
            from.gridZ,
            app,
        );
        const pathA = [...segA1.path, ...segA2.path.slice(1)];
        const typesA = [...segA1.terrainTypes, ...segA2.terrainTypes.slice(1)];

        // Option B: straight first
        const straightSteps = Math.max(absDx, absDz) - diagSteps;
        const straightEndBX = longerX ? from.localX + sx * straightSteps : from.localX;
        const straightEndBZ = longerX ? from.localZ : from.localZ + sz * straightSteps;
        const segB1 = this.strictSegment(
            from.localX,
            from.localZ,
            straightEndBX,
            straightEndBZ,
            from.gridX,
            from.gridZ,
            app,
        );
        const segB2 = this.strictSegment(
            straightEndBX,
            straightEndBZ,
            to.localX,
            to.localZ,
            from.gridX,
            from.gridZ,
            app,
        );
        const pathB = [...segB1.path, ...segB2.path.slice(1)];
        const typesB = [...segB1.terrainTypes, ...segB2.terrainTypes.slice(1)];

        const scoreA = typesA.filter((t) => t === 'water').length;
        const scoreB = typesB.filter((t) => t === 'water').length;

        return scoreA <= scoreB
            ? { path: pathA, terrainTypes: typesA }
            : { path: pathB, terrainTypes: typesB };
    }

    private strictSegment(
        x1: number,
        z1: number,
        x2: number,
        z2: number,
        gridX: number,
        gridZ: number,
        app: AppContext,
    ): { path: THREE.Vector3[]; terrainTypes: string[] } {
        const points: THREE.Vector3[] = [];
        const types: string[] = [];

        const dx = x2 - x1;
        const dz = z2 - z1;
        const steps = Math.max(Math.abs(dx), Math.abs(dz));

        let sx = steps > 0 ? Math.sign(dx) : 0;
        let sz = steps > 0 ? Math.sign(dz) : 0;

        let cx = x1;
        let cz = z1;

        for (let i = 0; i < steps; i++) {
            points.push(this.localToWorld(cx, cz).setY(LINE_HEIGHT));
            const type = app.worldMap.getBlockType(gridX, gridZ, cx, cz) ?? 'grass';
            types.push(type);
            if (type === 'tree') {
                app.worldMap.setBlockType(gridX, gridZ, cx, cz, 'grass');
            }

            const isDiagonal = sx !== 0 && sz !== 0;
            const nx = cx + sx;
            const nz = cz + sz;
            const nextType = app.worldMap.getBlockType(gridX, gridZ, nx, nz) ?? 'grass';
            const nextIsBuilding = nextType === 'building_low' || nextType === 'building_high';

            // If about to enter a building diagonally, switch to cardinal for this step
            // Choose the axis with more remaining distance so we still reach the target
            if (isDiagonal && nextIsBuilding) {
                const remX = Math.abs(x2 - cx);
                const remZ = Math.abs(z2 - cz);
                if (remX >= remZ) {
                    sz = 0; // go cardinal in X
                } else {
                    sx = 0; // go cardinal in Z
                }
                // Restore diagonal once we're clear of the building next iteration
            }

            // After passing through a building cardinally, restore diagonal if needed
            const currentIsBuilding = nextType === 'building_low' || nextType === 'building_high';
            if (!isDiagonal && !currentIsBuilding) {
                // Recalculate ideal direction toward target from current position
                const idealSx = Math.sign(x2 - cx);
                const idealSz = Math.sign(z2 - cz);
                // Only restore diagonal if both axes still have distance to cover
                if (idealSx !== 0 && idealSz !== 0) {
                    sx = idealSx;
                    sz = idealSz;
                }
            }

            cx += sx;
            cz += sz;
        }

        // Final point
        points.push(this.localToWorld(cx, cz).setY(LINE_HEIGHT));
        const finalType = app.worldMap.getBlockType(gridX, gridZ, cx, cz) ?? 'grass';
        types.push(finalType);
        if (finalType === 'tree') {
            app.worldMap.setBlockType(gridX, gridZ, cx, cz, 'grass');
        }

        return { path: points, terrainTypes: types };
    }

    // --- Intersection Detection ---

    private resolveIntersections(): void {
        const posMap = new Map<string, number[]>();

        this.lines.forEach((line, lineIdx) => {
            line.stops.forEach((stop) => {
                const key = `${stop.address.localX}:${stop.address.localZ}`;
                if (!posMap.has(key)) posMap.set(key, []);
                posMap.get(key)!.push(lineIdx);
            });
        });

        this.lines.forEach((line) => {
            line.stops.forEach((stop) => {
                const key = `${stop.address.localX}:${stop.address.localZ}`;
                if ((posMap.get(key) ?? []).length > 1) stop.isIntersection = true;
            });
        });
    }

    // --- Geometry ---

    private buildGeometry(app: AppContext): void {
        this.lines.forEach((line) => {
            this.buildLine(line, app);
            this.buildStops(line, app);
            this.buildInfrastructure(line, app);
        });
    }

    private buildLine(line: MetroLine, app: AppContext): void {
        if (line.path.length < 2) return;

        const geometry = new THREE.BufferGeometry().setFromPoints(line.path);
        const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(line.color),
            depthTest: false,
        });
        const lineObj = new THREE.Line(geometry, material);
        lineObj.renderOrder = 1;
        this.lineObjects.push(lineObj);
        app.scene.add(lineObj);
    }

    private buildStops(line: MetroLine, app: AppContext): void {
        line.stops.forEach((stop) => {
            const radius = stop.isIntersection ? STOP_RADIUS * 1.6 : STOP_RADIUS;
            const color = new THREE.Color(stop.isIntersection ? 0xffffff : line.color);

            const geo = new THREE.CylinderGeometry(radius, radius, 0.25, 10);
            const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(stop.worldPos);
            this.stopMeshes.push(mesh);
            app.scene.add(mesh);

            if (stop.isIntersection) {
                const ringGeo = new THREE.TorusGeometry(radius + 0.12, 0.09, 6, 14);
                const ringMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(line.color),
                    roughness: 0.3,
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.copy(stop.worldPos);
                ring.rotation.x = Math.PI / 2;
                this.stopMeshes.push(ring);
                app.scene.add(ring);
            }
        });
    }

    private buildInfrastructure(line: MetroLine, app: AppContext): void {
        const { path, pathTerrainTypes } = line;

        const waterPoints: THREE.Vector3[] = [];

        // Collect contiguous building runs with entry/exit directions
        type BuildingRun = {
            point: THREE.Vector3;
            height: number;
            entryDir: THREE.Vector3 | null;
            exitDir: THREE.Vector3 | null;
        };
        const buildingRuns: BuildingRun[] = [];

        path.forEach((point, i) => {
            const type = pathTerrainTypes[i];
            if (type === 'water') {
                waterPoints.push(point);
            } else if (type === 'building_low' || type === 'building_high') {
                const addr = this.worldPosToAddress(point, this.config.gridX, this.config.gridZ);
                const block = app.worldMap.getBlock(
                    this.config.gridX,
                    this.config.gridZ,
                    addr.localX,
                    addr.localZ,
                );

                // Entry direction: vector from previous point to this one
                const entryDir =
                    i > 0
                        ? new THREE.Vector3()
                              .subVectors(point, path[i - 1])
                              .setY(0)
                              .normalize()
                        : null;

                // Exit direction: vector from this point to next one
                const exitDir =
                    i < path.length - 1
                        ? new THREE.Vector3()
                              .subVectors(path[i + 1], point)
                              .setY(0)
                              .normalize()
                        : null;

                buildingRuns.push({
                    point,
                    height: block?.targetHeight ?? 2,
                    entryDir,
                    exitDir,
                });
            }
        });

        // --- Water pillars ---
        if (waterPoints.length > 0) {
            const pillarGeo = new THREE.CylinderGeometry(
                PILLAR_RADIUS,
                PILLAR_RADIUS * 1.4,
                LINE_HEIGHT,
                6,
            );
            pillarGeo.translate(0, LINE_HEIGHT / 2, 0);
            const pillarMat = new THREE.MeshStandardMaterial({
                color: PILLAR_COLOR,
                roughness: 0.8,
                metalness: 0.1,
            });
            const mesh = new THREE.InstancedMesh(pillarGeo, pillarMat, waterPoints.length);
            const dummy = new THREE.Object3D();
            waterPoints.forEach((point, i) => {
                dummy.position.set(point.x, 0, point.z);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            this.pillarMeshes.push(mesh);
            app.scene.add(mesh);
        }

        // --- Tunnel portals ---
        buildingRuns.forEach(({ point, height, entryDir, exitDir }) => {
            // Only place a portal on the first entry face and last exit face
            // of a building block — not every intermediate step
            if (entryDir) this.buildTunnelPortal(point, height, entryDir.negate(), app);
            if (exitDir) this.buildTunnelPortal(point, height, exitDir, app);
        });
    }

    private buildTunnelPortal(
        blockCenter: THREE.Vector3,
        buildingHeight: number,
        faceDir: THREE.Vector3,
        app: AppContext,
    ): void {
        const { blockSize } = this.config;
        const halfBlock = blockSize * 0.5;

        const portalW = blockSize * 0.55;
        const portalH = blockSize * 0.55;
        const portalCenterY = LINE_HEIGHT;

        const faceOffset = faceDir.clone().multiplyScalar(halfBlock - 0.05);
        const portalPos = new THREE.Vector3(
            blockCenter.x + faceOffset.x,
            portalCenterY,
            blockCenter.z + faceOffset.z,
        );

        // Derive rotation from faceDir directly — works for all 8 octagonal angles
        // BoxGeometry faces +Z by default, so we rotate to align +Z with faceDir
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), // BoxGeometry default normal
            faceDir.clone().setY(0).normalize(),
        );

        const frameGeo = new THREE.BoxGeometry(portalW + 0.15, portalH + 0.15, 0.08);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.copy(portalPos);
        frame.quaternion.copy(quaternion);

        const openingGeo = new THREE.BoxGeometry(portalW, portalH, 0.09);
        const openingMat = new THREE.MeshStandardMaterial({ color: TUNNEL_COLOR, roughness: 1.0 });
        const opening = new THREE.Mesh(openingGeo, openingMat);
        opening.position.copy(portalPos);
        opening.quaternion.copy(quaternion);

        this.tunnelMeshes.push(frame, opening);
        app.scene.add(frame, opening);
    }

    // --- Helpers ---

    private localToWorld(localX: number, localZ: number): THREE.Vector3 {
        const { blockSize, gridSize } = this.config;
        const half = gridSize / 2;
        return new THREE.Vector3(
            this.origin.x + (localX + half) * blockSize,
            0,
            this.origin.z + (localZ + half) * blockSize,
        );
    }

    private worldPosToAddress(pos: THREE.Vector3, gridX: number, gridZ: number): WorldAddress {
        const { blockSize, gridSize } = this.config;
        const half = gridSize / 2;
        const localX = Math.round((pos.x - this.origin.x) / blockSize - half);
        const localZ = Math.round((pos.z - this.origin.z) / blockSize - half);
        return { gridX, gridZ, localX, localZ };
    }

    private static makeRng(seed: number): () => number {
        let s = seed;
        return () => {
            s = (s * 16807 + 0) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }
}
