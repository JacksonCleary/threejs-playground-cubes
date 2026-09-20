import * as THREE from 'three/webgpu';
import { SceneEntity } from './SceneEntity';
import type { AppContext } from './types/AppContext';

export class GridOccupancy extends SceneEntity {
    declare mesh: THREE.Group;
    private grid: Map<string, boolean> = new Map();
    private rows: number = 0;
    private cols: number = 0;
    private readonly cellSize = 1;
    private readonly plateHeight = 0.06;

    initialize(rows: number, cols: number): void {
        this.rows = rows;
        this.cols = cols;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.setCell(row, col, false);
            }
        }
    }

    getRows(): number {
        return this.rows;
    }

    getCols(): number {
        return this.cols;
    }

    isCellAvailable(row: number, col: number): boolean {
        return this.isInBounds(row, col) && !this.getCell(row, col);
    }

    reserveCell(row: number, col: number): boolean {
        if (!this.isCellAvailable(row, col)) {
            return false;
        }

        this.setCell(row, col, true);
        return true;
    }

    freeCell(row: number, col: number): void {
        this.setCell(row, col, false);
    }

    setCell(row: number, col: number, value: boolean): void {
        const key = `${row},${col}`;
        this.grid.set(key, value);
    }

    getCell(row: number, col: number): boolean {
        const key = `${row},${col}`;
        return this.grid.get(key) ?? false;
    }

    private isInBounds(row: number, col: number): boolean {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    init(app: AppContext): void {
        this.mesh = new THREE.Group();

        const geometry = new THREE.BoxGeometry(
            this.cellSize * 0.94,
            this.plateHeight,
            this.cellSize * 0.94,
        );
        const material = new THREE.MeshStandardMaterial({
            color: 0x3b4856,
            roughness: 0.85,
        });

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const plate = new THREE.Mesh(geometry, material);
                plate.position.set(
                    col * this.cellSize,
                    -this.cellSize / 2 - this.plateHeight / 2,
                    row * this.cellSize,
                );
                this.mesh.add(plate);
            }
        }

        app.scene.add(this.mesh);
    }

    dispose(): void {
        this.mesh.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                (object.material as THREE.Material).dispose();
            }
        });
        this.mesh.removeFromParent();
    }
}
