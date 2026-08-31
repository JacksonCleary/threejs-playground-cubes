// Define all event payload shapes here.
// Add your own events as the project grows.
export interface AppEvents {
    // Built-in events
    'app:resize': { width: number; height: number };
    'app:disposed': Record<string, never>;

    // Entity events
    'asset:loaded': { name: string };

    // Example System events
    'particles:reset': { position: { x: number; y: number; z: number } };
}
