import * as THREE from 'three/webgpu';
import { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';

export class InstancedSwarmEntity implements SceneEntity {
    mesh!: THREE.InstancedMesh;

    private count = 1000;

    // Memory Optimization: Pre-allocate reusable objects for the update loop
    // to strictly avoid Garbage Collection pauses. Never use `new` inside update().
    private dummy = new THREE.Object3D();
    private color = new THREE.Color();

    init(app: AppContext): void {
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff });

        // Initialize an InstancedMesh to render 1000 cubes in ONE draw call
        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        for (let i = 0; i < this.count; i++) {
            // Randomly scatter them
            this.dummy.position.set(
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30,
            );
            this.dummy.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI,
            );

            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);

            // Give each instance a random color
            this.color.setHSL(Math.random(), 0.8, 0.5);
            this.mesh.setColorAt(i, this.color);
        }

        // Compute bounding sphere of all 1000 cubes so the App's camera
        // frustum culling knows the total size of our swarm
        this.mesh.computeBoundingSphere();

        app.scene.add(this.mesh);
    }

    update(dt: number): void {
        // High-performance update loop managing 1000 entities.
        // No new memory is allocated here!
        for (let i = 0; i < this.count; i++) {
            this.mesh.getMatrixAt(i, this.dummy.matrix);

            // Decompose the matrix back to position/rotation/scale
            this.dummy.matrix.decompose(
                this.dummy.position,
                this.dummy.quaternion,
                this.dummy.scale,
            );

            // Apply rotation as a quaternion delta directly, not via Euler angles:
            // round-tripping quaternion -> Euler -> quaternion every frame introduces
            // angle-wrap/gimbal discontinuities that look like random jitter ("shaking").
            this.dummy.rotateX(dt * 0.5);
            this.dummy.rotateY(dt * 1.0);

            // Recompose and set
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        // Flag for GPU upload
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.mesh.dispose();
    }
}
