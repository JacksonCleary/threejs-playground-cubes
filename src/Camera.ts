import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface CameraConfig {
    target?: THREE.Vector3;
}

export class Camera {
    private camera: THREE.PerspectiveCamera;
    private controls: OrbitControls | null = null;
    private config: Required<CameraConfig>;

    constructor(
        private x: number = 80,
        private y: number = 80,
        private z: number = 80,
        config: CameraConfig = {},
    ) {
        this.config = {
            target: config.target ?? new THREE.Vector3(0, 0, 0),
        };

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000,
        );
        this.camera.position.set(this.x, this.y, this.z);
        this.camera.lookAt(this.config.target);
    }

    getInstance(): THREE.PerspectiveCamera {
        return this.camera;
    }

    attachControls(renderer: THREE.WebGPURenderer): void {
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
        };
        this.controls.target.copy(this.config.target);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 500;
        this.controls.update();
    }

    update(_dt: number): void {
        this.controls?.update();
    }

    dispose(): void {
        this.controls?.dispose();
    }
}
