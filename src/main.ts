import './style.css';
import { App } from './App';
import { ExampleCube } from './entities/ExampleCube';
import { AmbientLight } from './entities/AmbientLight';
import { CityEntity } from './entities/CityEntity';
import { MetroEntity } from './entities/MetroEntity';
import * as THREE from 'three';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
if (!canvas) throw new Error('No #canvas element found');

const debug = true;

const app = new App(canvas, debug);

// app.add(new AmbientLight());
// app.add(new AmbientLight()).add(new ExampleCube());
// for (let i = 0; i < 100; i++) {
//     app.add(
//         new ExampleCube(
//             new THREE.Vector3(Math.random() * 20 - 10, 0, Math.random() * 20 - 10),
//             Math.random() * 0xffffff,
//         ),
//     );
// }

// for (let x = 0; x < 3; x++) {
//     for (let z = 0; z < 3; z++) {
//         app.add(
//             new CityEntity({ gridX: x, gridZ: z, gridSize: 60, blockSize: 1.0, maxHeight: 15 }),
//         );
//         app.add(
//             new MetroEntity({
//                 gridX: x,
//                 gridZ: z,
//                 gridSize: 60,
//                 blockSize: 1.0,
//                 lineCount: 3,
//                 stopsPerLine: 6,
//                 // seed derives from position — same city always gets same metro layout
//                 seed: x * 1000 + z,
//             }),
//         );
//     }
// }

app.add(new AmbientLight())
    .add(new CityEntity({ gridX: 0, gridZ: 0, gridSize: 60, blockSize: 1.0, maxHeight: 15 }))
    .add(
        new MetroEntity({
            gridX: 0,
            gridZ: 0,
            gridSize: 60,
            blockSize: 1.0,
            lineCount: 6,
            stopsPerLine: 8,
        }),
    );

app.start();

// const gui = new GUI();

// const cubeFolder = gui.addFolder('Cube');
// cubeFolder.add(cube.rotation, 'x', 0, Math.PI * 2);
// cubeFolder.add(cube.rotation, 'y', 0, Math.PI * 2);
// cubeFolder.add(cube.rotation, 'z', 0, Math.PI * 2);
// cubeFolder.open();

// const cameraFolder = gui.addFolder('Camera');
// cameraFolder.add(camera.position, 'z', 0, 20);
// cameraFolder.open();

// Optional: clean up on HMR / page unload
if (import.meta.hot) {
    import.meta.hot.dispose(() => app.dispose());
}
