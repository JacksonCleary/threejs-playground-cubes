import * as THREE from 'three/webgpu';
import type { EventBus } from '../EventBus';
import type { ResourceManager } from '../ResourceManager';

export interface AppContext {
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    readonly renderer: THREE.WebGPURenderer;
    readonly events: EventBus;
    readonly resources: ResourceManager;
}
