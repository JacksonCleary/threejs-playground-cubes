import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface DebugCameraConfig {
    moveSpeed?: number;
    target?: THREE.Vector3;
}

export class Camera {
    private camera: THREE.PerspectiveCamera;
    private controls: OrbitControls | null = null;
    private debug: boolean;
    private config: Required<DebugCameraConfig>;
    private keys = new Set<string>();

    private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.code);
    private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

    constructor(
        private x: number = 80,
        private y: number = 80,
        private z: number = 80,
        debug = false,
        config: DebugCameraConfig = {},
    ) {
        this.debug = debug;
        this.config = {
            moveSpeed: config.moveSpeed ?? 20,
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

        if (this.debug) {
            document.addEventListener('keydown', this.onKeyDown);
            document.addEventListener('keyup', this.onKeyUp);
            console.info(
                '[Camera] Debug controls — WASD: fly, Space/Shift: up/down, mouse: orbit/pan/zoom',
            );
        }
    }

    getInstance(): THREE.PerspectiveCamera {
        return this.camera;
    }

    attachControls(renderer: THREE.WebGLRenderer): void {
        if (!this.debug) return;

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

    // update(dt: number): void {
    //     if (!this.debug) return;

    //     if (this.keys.size > 0) {
    //         const { moveSpeed } = this.config;
    //         const velocity = moveSpeed * dt;

    //         const worldDir = new THREE.Vector3();
    //         this.camera.getWorldDirection(worldDir);

    //         // Flatten to XZ plane so WASD feels like walking, not flying on a slope
    //         const forward = new THREE.Vector3(worldDir.x, 0, worldDir.z).normalize();
    //         const right = new THREE.Vector3()
    //             .crossVectors(forward, new THREE.Vector3(0, 1, 0))
    //             .normalize();
    //         const up = new THREE.Vector3(0, 1, 0);

    //         if (this.keys.has('KeyW')) this.camera.position.addScaledVector(forward, velocity);
    //         if (this.keys.has('KeyS')) this.camera.position.addScaledVector(forward, -velocity);
    //         if (this.keys.has('KeyA')) this.camera.position.addScaledVector(right, -velocity);
    //         if (this.keys.has('KeyD')) this.camera.position.addScaledVector(right, velocity);
    //         if (this.keys.has('Space')) this.camera.position.addScaledVector(up, velocity);
    //         if (this.keys.has('ShiftLeft')) this.camera.position.addScaledVector(up, -velocity);

    //         if (this.controls) {
    //             const offset = new THREE.Vector3();
    //             this.camera.getWorldDirection(offset);
    //             this.controls.target
    //                 .copy(this.camera.position)
    //                 .addScaledVector(offset, this.controls.target.distanceTo(this.camera.position));
    //             this.controls.update();
    //         }
    //     }

    //     this.controls?.update();
    // }

    update(dt: number): void {
        if (!this.debug) return;
        this.controls?.update();
    }

    dispose(): void {
        this.controls?.dispose();
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
    }
}
