import * as THREE from 'three/webgpu';
import { uniform, attribute, positionLocal, vec4 } from 'three/tsl';
import type { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';

export class ParticleSystemEntity implements SceneEntity {
    /**
     * We expose the mesh for culling, but also set alwaysUpdate = true
     * since our GPU shader relies on a continuously updating time uniform.
     * Alternatively, if we only wanted to update time when visible,
     * we would set alwaysUpdate = false.
     */
    mesh?: THREE.Points;
    alwaysUpdate = true;

    private material!: THREE.PointsNodeMaterial;
    // TSL uniform node, mutated directly via .value
    private uTime = uniform(0);
    private particleCount = 10000;

    init(app: AppContext): void {
        // 1. Data-Oriented Setup
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const velocities = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            // Initial positions spread out
            positions[i * 3 + 0] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

            // Random velocities
            velocities[i * 3 + 0] = (Math.random() - 0.5) * 5;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 5;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        // 2. Offload Logic to the GPU via TSL node graph (WebGPURenderer requires NodeMaterial)
        this.material = new THREE.PointsNodeMaterial({
            transparent: true,
            depthWrite: false,
        });
        this.material.positionNode = positionLocal.add(
            attribute('velocity', 'vec3').mul(this.uTime),
        );
        this.material.colorNode = vec4(1, 1, 1, 0.8);

        this.mesh = new THREE.Points(geometry, this.material);
        app.scene.add(this.mesh);

        // 3. Event Delegation
        // Listen ONCE for the entire particle system, not once per particle
        app.events.on('particles:reset', this.handleReset);
    }

    private handleReset = () => {
        // Reset everything efficiently at the system level
        this.uTime.value = 0;
    };

    update(dt: number): void {
        // A single update call manages 10,000 particles by just ticking time
        this.uTime.value += dt;
    }

    dispose(): void {
        this.mesh?.geometry.dispose();
        (this.mesh?.material as THREE.Material)?.dispose();
    }
}
