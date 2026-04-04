import * as THREE from 'three';
import { EventBus } from './EventBus';
import { RenderLoop } from './RenderLoop';
import { ResourceManager } from './ResourceManager';
import type { SceneEntity } from './SceneEntity';
import type { AppContext } from './types/AppContext';

type AppState = 'idle' | 'loading' | 'running' | 'disposed';

export class App implements AppContext {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly events: EventBus;
  readonly resources: ResourceManager;

  private loop: RenderLoop;
  private entities: SceneEntity[] = [];
  private state: AppState = 'idle';

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.events = new EventBus();
    this.resources = new ResourceManager();
    this.loop = new RenderLoop(this.renderer, this.scene, this.camera);

    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  /** Add an entity before calling start(). */
  add(entity: SceneEntity): this {
    if (this.state !== 'idle') {
      console.warn('[App] Entities should be added before App.start()');
      return this;
    }
    this.entities.push(entity);
    entity.init(this);
    return this; // fluent: app.add(new Cube()).add(new Lights())
  }

  /** Awaits all entity.load() calls, then begins the render loop. */
  async start(): Promise<void> {
    if (this.state !== 'idle') return;
    this.state = 'loading';

    await Promise.all(this.entities.map((e) => e.load?.(this.resources)));

    this.state = 'running';
    this.loop.start((dt) => {
      this.entities.forEach((e) => e.update?.(dt));
    });
  }

  dispose(): void {
    if (this.state === 'disposed') return;
    this.state = 'disposed';

    this.loop.stop();
    this.entities.forEach((e) => e.dispose?.());
    this.entities = [];
    this.resources.dispose();
    this.events.clear();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize);

    this.events.emit('app:disposed', {});
  }

  private onResize = (): void => {
    const el = this.renderer.domElement;
    const w = el.clientWidth;
    const h = el.clientHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.events.emit('app:resize', { width: w, height: h });
  };
}
