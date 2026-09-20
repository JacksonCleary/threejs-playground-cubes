import * as THREE from 'three/webgpu';
import { Stage } from '../Stage';
import { AmbientLight } from '../entities/AmbientLight';
import { ExampleCube } from '../entities/ExampleCube';
import { GridOccupancy } from '../GridOccupancy';
import { CUBE_COLOR_PALLETS } from '../constants/color';
export class ExampleStage extends Stage {
    setup(): void {
        // Compose the scene using entities
        this.entities.push(new AmbientLight());
        const gridOccupancy = new GridOccupancy();
        const gridRows = 25;
        const gridCols = 25;
        gridOccupancy.initialize(gridRows, gridCols); // Example initialization
        this.entities.push(gridOccupancy);

        const numberOfCubeGaps = 50;
        const totalCells = gridRows * gridCols;
        const gapCount = Math.min(numberOfCubeGaps, totalCells);

        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                gridOccupancy.setCell(row, col, true);
            }
        }

        const gapCells = new Set<string>();
        while (gapCells.size < gapCount) {
            const row = Math.floor(Math.random() * gridRows);
            const col = Math.floor(Math.random() * gridCols);
            const key = `${row},${col}`;
            if (!gapCells.has(key)) {
                gapCells.add(key);
                gridOccupancy.freeCell(row, col);
            }
        }

        const colorPalette =
            CUBE_COLOR_PALLETS[Math.floor(Math.random() * CUBE_COLOR_PALLETS.length)];
        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                if (!gridOccupancy.getCell(row, col)) {
                    continue;
                }

                const colorIndex = (row + col) % colorPalette.length;
                this.entities.push(
                    new ExampleCube(
                        new THREE.Vector3(col, 0, row),
                        gridOccupancy,
                        parseInt(colorPalette[colorIndex], 16),
                    ),
                );
            }
        }

        // You could also hook up stage-level logic or UI here
        console.log('[ExampleStage] Setting up scene...');
    }
}
