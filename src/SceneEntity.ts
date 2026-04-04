import type { AppContext } from './types/AppContext';
import type { ResourceManager } from './ResourceManager';

export abstract class SceneEntity {
  /** Called synchronously when the entity is added to the App. Set up scene objects here. */
  abstract init(app: AppContext): void;

  /** Called once before the render loop starts. Await async asset loading here. */
  load?(resources: ResourceManager): Promise<void>;

  /** Called every frame with delta time in seconds. Keep this fast. */
  update?(deltaSeconds: number): void;

  /** Called on App.dispose(). Clean up geometries, materials, listeners. */
  dispose?(): void;
}
