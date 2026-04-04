type Handler<T> = (payload: T) => void;

// Extend this interface with your own event shapes as the project grows
export interface AppEvents {
  'app:resize': { width: number; height: number };
  'app:disposed': Record<string, never>;
}

export class EventBus {
  private listeners = new Map<string, Set<Handler<unknown>>>();

  on<K extends keyof AppEvents>(event: K, handler: Handler<AppEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as Handler<unknown>);
    return () => this.listeners.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
