import * as THREE from 'three';
import { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';

export class CubeEntity extends SceneEntity {
    private mesh!: THREE.Mesh;
    private unsub: (() => void)[] = [];

    init(app: AppContext): void {
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0x6644cc }),
        );
        app.scene.add(this.mesh);

        // Example: react to events without coupling to other entities
        this.unsub.push(
            app.events.on('player:move', ({ x, z }) => {
                this.mesh.position.set(x, 0, z);
            }),
        );
    }

    update(dt: number): void {
        this.mesh.rotation.y += dt * 0.8;
        this.mesh.rotation.x += dt * 0.3;
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.mesh.removeFromParent();
        this.unsub.forEach((fn) => fn());
    }
}
