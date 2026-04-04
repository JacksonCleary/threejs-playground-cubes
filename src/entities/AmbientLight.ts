import * as THREE from 'three';
import { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';

export class AmbientLight extends SceneEntity {
    private light!: THREE.AmbientLight;
    private dirLight!: THREE.DirectionalLight;

    init(app: AppContext): void {
        this.light = new THREE.AmbientLight(0xffffff, 0.4);
        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.dirLight.position.set(5, 10, 7);
        app.scene.add(this.light, this.dirLight);
    }

    dispose(): void {
        this.light.removeFromParent();
        this.dirLight.removeFromParent();
    }
}
