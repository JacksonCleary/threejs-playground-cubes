// Define all event payload shapes here.
// Add your own events as the project grows.
export interface AppEvents {
  'player:move': { x: number; z: number };
  'game:over': { reason: string };
  'asset:loaded': { name: string };
}
