// src/entities/CityEntity.ts
import * as THREE from 'three';
import { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';
import type { ResourceManager } from '../ResourceManager';
import type { CityConfig } from '../types/CityEntity';
import { BLOCK_COLORS } from '../constants/color';
import type { BlockData, BlockType } from '../WorldMapRegistry';

export class CityEntity extends SceneEntity {
    private solidMesh!: THREE.InstancedMesh;
    private waterMesh!: THREE.InstancedMesh;
    private dummy = new THREE.Object3D();
    private colorHelper = new THREE.Color();

    // Exposed so WorldMapRegistry and MetroEntity can read/mutate
    blockData: BlockData[] = [];
    private solidHeights: number[] = [];
    private waterHeights: number[] = [];
    private origin: THREE.Vector3;

    constructor(private config: CityConfig) {
        super();
        const { gridX, gridZ, gridSize, blockSize } = config;
        this.origin = new THREE.Vector3(
            gridX * gridSize * blockSize,
            0,
            gridZ * gridSize * blockSize,
        );
    }

    init(app: AppContext): void {
        this.generateBlocks();

        // Register with WorldMapRegistry before MetroEntity queries it
        app.worldMap.registerCity(this.config.gridX, this.config.gridZ, this.blockData);

        this.buildMeshes(app);
    }

    update(_dt: number): void {
        const time = performance.now() * 0.001;
        let solidDirty = false;
        let waterDirty = false;

        this.blockData.forEach((block) => {
            const delay = block.dist * 0.08;
            if (time < delay) return;

            if (block.type === 'water') {
                const current = this.waterHeights[block.instanceId];
                const target = block.targetHeight;
                if (Math.abs(target - current) > 0.01) {
                    const next = current + (target - current) * 0.05;
                    this.waterHeights[block.instanceId] = next;
                    this.applyMatrix(
                        this.waterMesh,
                        block.instanceId,
                        block.localX,
                        block.localZ,
                        next,
                    );
                    waterDirty = true;
                }
            } else {
                const current = this.solidHeights[block.instanceId];
                const target = block.targetHeight;
                if (Math.abs(target - current) > 0.01) {
                    const next = current + (target - current) * 0.08;
                    this.solidHeights[block.instanceId] = next;
                    this.applyMatrix(
                        this.solidMesh,
                        block.instanceId,
                        block.localX,
                        block.localZ,
                        next,
                    );
                    solidDirty = true;
                }
            }
        });

        if (solidDirty) this.solidMesh.instanceMatrix.needsUpdate = true;
        if (waterDirty) this.waterMesh.instanceMatrix.needsUpdate = true;

        if (this.waterMesh.count > 0) {
            this.waterMesh.position.y = Math.sin(time) * 0.05;
        }
    }

    dispose(): void {
        this.solidMesh.geometry.dispose();
        (this.solidMesh.material as THREE.Material).dispose();
        this.solidMesh.removeFromParent();
        this.waterMesh.geometry.dispose();
        (this.waterMesh.material as THREE.Material).dispose();
        this.waterMesh.removeFromParent();
    }

    // --- Private ---

    private generateBlocks(): void {
        const { gridSize, maxHeight } = this.config;
        const center = gridSize / 2;
        const noiseOffset = this.config.seed ?? Math.random() * 100;

        for (let x = -center; x < center; x++) {
            for (let z = -center; z < center; z++) {
                const n = this.noise(x + noiseOffset, z + noiseOffset);
                const riverVal = Math.abs(Math.sin((x + z) * 0.15 + n));

                let type: BlockType = 'grass';
                let h = 1;

                if (n < -0.8 || riverVal < 0.15) {
                    type = 'water';
                    h = 0.8;
                } else if (n < -0.5 || riverVal < 0.25) {
                    type = 'sand';
                    h = 1.2;
                } else if (n > 0.8) {
                    type = Math.random() > 0.7 ? 'building_high' : 'building_low';
                    h = 2 + Math.pow(n, 2) * 4;
                    if (type === 'building_high') h *= 2.5;
                    h = Math.floor(h);
                } else {
                    type = Math.random() > 0.9 ? 'tree' : 'grass';
                    h = type === 'tree' ? 2 + Math.floor(Math.random() * 2) : 1;
                }

                this.blockData.push({
                    localX: x,
                    localZ: z,
                    type,
                    targetHeight: Math.min(Math.max(1, h), maxHeight),
                    dist: Math.sqrt(x * x + z * z),
                    instanceId: -1,
                });
            }
        }
    }

    private buildMeshes(app: AppContext): void {
        const geo = new THREE.BoxGeometry(0.95, 1, 0.95);
        geo.translate(0, 0.5, 0);

        const solidMat = new THREE.MeshStandardMaterial({
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true,
        });
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x22aaff,
            roughness: 0.1,
            transparent: true,
            opacity: 0.85,
            flatShading: true,
        });

        const solidBlocks = this.blockData.filter((b) => b.type !== 'water');
        const waterBlocks = this.blockData.filter((b) => b.type === 'water');

        this.solidMesh = new THREE.InstancedMesh(geo, solidMat, solidBlocks.length);
        this.solidMesh.castShadow = true;
        this.solidMesh.receiveShadow = true;
        this.waterMesh = new THREE.InstancedMesh(geo, waterMat, waterBlocks.length);
        this.waterMesh.receiveShadow = true;

        let solidIdx = 0;
        let waterIdx = 0;

        this.blockData.forEach((block) => {
            if (block.type === 'water') {
                block.instanceId = waterIdx;
                this.waterHeights.push(0);
                this.applyMatrix(this.waterMesh, waterIdx, block.localX, block.localZ, 0.01);
                waterIdx++;
            } else {
                block.instanceId = solidIdx;
                this.solidHeights.push(0);
                this.applyMatrix(this.solidMesh, solidIdx, block.localX, block.localZ, 0.01);
                this.solidMesh.setColorAt(
                    solidIdx,
                    this.colorHelper
                        .setHex(BLOCK_COLORS[block.type])
                        .offsetHSL(0, 0, (Math.random() - 0.5) * 0.05),
                );
                solidIdx++;
            }
        });

        this.solidMesh.instanceMatrix.needsUpdate = true;
        this.waterMesh.instanceMatrix.needsUpdate = true;
        if (this.solidMesh.instanceColor) this.solidMesh.instanceColor.needsUpdate = true;

        this.solidMesh.position.copy(this.origin);
        this.waterMesh.position.copy(this.origin);

        app.scene.add(this.solidMesh, this.waterMesh);
    }

    private applyMatrix(
        mesh: THREE.InstancedMesh,
        idx: number,
        localX: number,
        localZ: number,
        height: number,
    ): void {
        const { blockSize, gridSize } = this.config;
        const half = gridSize / 2;
        this.dummy.position.set((localX + half) * blockSize, 0, (localZ + half) * blockSize);
        this.dummy.scale.set(1, height, 1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(idx, this.dummy.matrix);
    }

    private noise(x: number, z: number): number {
        let y = Math.sin(x * 0.1) * Math.cos(z * 0.1);
        y += Math.sin(x * 0.3 + z * 0.2) * 0.5;
        y += Math.sin(x * 0.5 - z * 0.4) * 0.25;
        return y;
    }
}
