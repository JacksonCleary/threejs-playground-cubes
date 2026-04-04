import * as THREE from 'three';
import { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';

export class ExampleCube extends SceneEntity {
  private mesh!: THREE.Mesh;
  private unsub: Array<() => void> = [];

  init(app: AppContext): void {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x6644cc }),
    );
    this.mesh.position.set(0, 0, 0);
    app.scene.add(this.mesh);

    // Example: react to resize events via EventBus
    this.unsub.push(
      app.events.on('app:resize', ({ width, height }) => {
        console.log(`Canvas resized to ${width}x${height}`);
      }),
    );
  }

  update(dt: number): void {
    this.mesh.rotation.x += dt * 0.5;
    this.mesh.rotation.y += dt * 0.8;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
    this.unsub.forEach((fn) => fn());
  }
}
