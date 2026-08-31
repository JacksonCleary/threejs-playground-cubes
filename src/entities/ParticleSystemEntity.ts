import * as THREE from 'three';
import type { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';
import particleVertexShader from '../shaders/vertex/particles.glsl?raw';
import particleFragmentShader from '../shaders/fragment/particles.glsl?raw';
export class ParticleSystemEntity implements SceneEntity {
    /**
     * We expose the mesh for culling, but also set alwaysUpdate = true
     * since our GPU shader relies on a continuously updating time uniform.
     * Alternatively, if we only wanted to update time when visible,
     * we would set alwaysUpdate = false.
     */
    mesh?: THREE.Points;
    alwaysUpdate = true;

    private material!: THREE.ShaderMaterial;
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

        // 2. Offload Logic to the GPU
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
            },
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            transparent: true,
            depthWrite: false,
        });

        this.mesh = new THREE.Points(geometry, this.material);
        app.scene.add(this.mesh);

        // 3. Event Delegation
        // Listen ONCE for the entire particle system, not once per particle
        app.events.on('particles:reset', this.handleReset);
    }

    private handleReset = (payload: any) => {
        // Reset everything efficiently at the system level
        this.material.uniforms.uTime.value = 0;
        console.log('[ParticleSystemEntity] Particles reset at', payload.position);
    };

    update(dt: number): void {
        // A single update call manages 10,000 particles by just ticking time
        if (this.material) {
            this.material.uniforms.uTime.value += dt;
        }
    }

    dispose(): void {
        this.mesh?.geometry.dispose();
        (this.mesh?.material as THREE.Material)?.dispose();
    }
}
