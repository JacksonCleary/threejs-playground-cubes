import type { SceneEntity } from './SceneEntity';
import type { AppContext } from './types/AppContext';

export abstract class Stage {
    protected entities: SceneEntity[] = [];
    protected app!: AppContext;

    /**
     * Initializes the stage. Use this to add entities specific to this stage.
     */
    abstract setup(): void;

    /**
     * Wires the stage into the main App and initializes all its entities.
     */
    init(app: AppContext): void {
        this.app = app;
        this.setup();
        this.entities.forEach((entity) => app.add(entity));
    }

    /**
     * Cleans up the stage. The App handles disposing of the actual entities,
     * but you can override this to clean up stage-specific state (timers, DOM nodes, etc.)
     */
    dispose(): void {
        this.entities = [];
    }
}
