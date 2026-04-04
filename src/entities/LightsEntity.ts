import * as THREE from 'three';
import { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';

export class LightsEntity extends SceneEntity {
  private ambient!: THREE.AmbientLight;
  private directional!: THREE.DirectionalLight;

  init(app: AppContext): void {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.4);

    this.directional = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directional.position.set(5, 10, 7.5);

    app.scene.add(this.ambient, this.directional);
  }

  dispose(): void {
    this.ambient.removeFromParent();
    this.directional.removeFromParent();
  }
}
