# Three.js Playground

A place where I test out ThreeJS Ideas.

- Made to use TSL and a few AI assisted performance tweaks for frustum culling.
- uses Bun

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173/

## Build

```bash
npm run build
npm run preview
```

## Starter Architecture

- `src/main.ts` creates the app and adds starter entities.
- `src/App.ts` owns renderer, scene, camera, loop, and lifecycle.
- `src/SceneEntity.ts` defines the base class for pluggable entities.
- `src/entities/ExampleCube.ts` is a minimal example entity.
- `src/entities/AmbientLight.ts` adds base scene lighting.
- `src/entities/InstanceSwarmEntity.ts` is a more complex example entity that uses instancing.
- `src/entities/ParticleSystemEntity.ts` is a more complex example entity that uses a particle system.
- `src/EventBus.ts`, `src/ResourceManager.ts`, `src/RenderLoop.ts`, and `src/Camera.ts` are reusable core utilities.

## Creating Your Own Scene

1. Create a new entity in `src/entities/` by extending `SceneEntity`.
2. Create a new Stage in `src/stages/` by extending `Stage`.
3. Add you entities to your stage (see ExampleStage.ts).
4. Keep project-level constants in `src/constants/`.
5. Keep shared app types in `src/types/`.
