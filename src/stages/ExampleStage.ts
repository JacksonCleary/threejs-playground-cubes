import { Stage } from '../Stage';
import { AmbientLight } from '../entities/AmbientLight';
import { ExampleCube } from '../entities/ExampleCube';
import { ParticleSystemEntity } from '../entities/ParticleSystemEntity';
import { InstancedSwarmEntity } from '../entities/InstancedSwarmEntity';

export class ExampleStage extends Stage {
    setup(): void {
        // Compose the scene using entities
        this.entities.push(
            new AmbientLight(),
            new ExampleCube(),
            new ParticleSystemEntity(),
            new InstancedSwarmEntity(),
        );

        // You could also hook up stage-level logic or UI here
        console.log('[ExampleStage] Setting up scene...');
    }
}
