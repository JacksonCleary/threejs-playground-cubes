import * as THREE from 'three';

export class ResourceManager {
    private textures = new Map<string, Promise<THREE.Texture>>();
    private gltfCache = new Map<string, Promise<unknown>>();
    private textureLoader = new THREE.TextureLoader();

    loadTexture(url: string): Promise<THREE.Texture> {
        if (!this.textures.has(url)) {
            this.textures.set(
                url,
                new Promise((resolve, reject) =>
                    this.textureLoader.load(url, resolve, undefined, reject),
                ),
            );
        }
        return this.textures.get(url)!;
    }

    // Extend with GLTFLoader, AudioLoader, etc. using the same dedup pattern
    loadGLTF(url: string, loader: { load: Function }): Promise<unknown> {
        if (!this.gltfCache.has(url)) {
            this.gltfCache.set(
                url,
                new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject)),
            );
        }
        return this.gltfCache.get(url)!;
    }

    dispose(): void {
        this.textures.clear();
        this.gltfCache.clear();
    }
}
