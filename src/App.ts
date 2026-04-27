import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EventBus } from './EventBus';
import { RenderLoop } from './RenderLoop';
import { ResourceManager } from './ResourceManager';
import { Camera } from './Camera';
import type { SceneEntity } from './SceneEntity';
import type { AppContext } from './types/AppContext';
import { CoordinateSystem } from './CoordinateSystem';
import { WorldMapRegistry } from './WorldMapRegistry';
import Stats from 'three/addons/libs/stats.module.js';

type AppState = 'idle' | 'loading' | 'running' | 'disposed';

export class App implements AppContext {
    readonly renderer: THREE.WebGLRenderer;
    readonly scene: THREE.Scene;
    readonly cameraController: Camera;
    readonly camera: THREE.PerspectiveCamera;
    readonly events: EventBus;
    readonly resources: ResourceManager;
    readonly coords: CoordinateSystem;
    readonly worldMap: WorldMapRegistry;

    private loop: RenderLoop;
    private entities: SceneEntity[] = [];
    private state: AppState = 'idle';

    private debug: boolean = false;
    private stats?: Stats;

    private controls: OrbitControls;

    constructor(canvas: HTMLCanvasElement, debug: boolean) {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.scene = new THREE.Scene();
        // this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Atmosphere
        // Reverted fog to previous atmospheric levels
        // Starts closer (40) and fades out sooner (95) for that depth/haze effect
        // this.scene.fog = new THREE.Fog(0x87ceeb, 50, 95);

        // Camera
        this.cameraController = new Camera(0, 80, 80, debug);
        this.camera = this.cameraController.getInstance();
        this.cameraController.attachControls(this.renderer);

        // Events
        this.events = new EventBus();

        // Resources
        this.resources = new ResourceManager();

        // Coordinate System
        this.coords = new CoordinateSystem({
            gridSize: 60,
            blockSize: 1.0,
            metersPerBlock: 83,
        });

        // WorldMap
        this.worldMap = new WorldMapRegistry();

        // Engine
        this.loop = new RenderLoop(this.renderer, this.scene, this.camera);

        window.addEventListener('resize', this.onResize);
        this.onResize();

        this.debug = debug;
        if (this.debug) {
            this.stats = new Stats();
            document.body.appendChild(this.stats.dom);
        }

        // let's orbit for now
        // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // this.controls.enableDamping = true;
        //this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        // this.controls.autoRotate = true;
        // this.controls.autoRotateSpeed = 20.0;
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
            this.cameraController.update(dt);
            this.entities.forEach((e) => e.update?.(dt));
            if (this.stats && this.debug) {
                this.stats.update();
            }
            if (this.controls && this.controls.autoRotate) {
                this.controls.update();
            }
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
        this.worldMap.dispose();
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
