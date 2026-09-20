import * as THREE from 'three/webgpu';
import { SceneEntity } from '../SceneEntity';
import type { AppContext } from '../types/AppContext';
import { COLORS } from '../constants/color';
import type { GridOccupancy } from '../GridOccupancy';
import type { ResourceManager } from '../ResourceManager';

type RollDecision = {
    pivotOffset: THREE.Vector3;
    axis: 'x' | 'z';
    angleSign: number;
    rowDelta: number;
    colDelta: number;
};

export class ExampleCube extends SceneEntity {
    declare mesh: THREE.Mesh;
    private texture: THREE.Texture | undefined;
    private unsub: Array<() => void> = [];
    private pivotGroup: THREE.Group | undefined;
    private scene: THREE.Scene | undefined;
    private readonly CubeState = {
        Idle: 0,
        Rolling: 1,
    };
    private state: number = this.CubeState.Idle;
    private readonly pauseTimeOnSide = THREE.MathUtils.randInt(900, 2400);
    private readonly rollSpeed = THREE.MathUtils.randFloat(Math.PI * 0.8, Math.PI * 1.2);
    private readonly blockedMoveDelay = THREE.MathUtils.randInt(120, 420);
    private nextMoveTime = Date.now() + THREE.MathUtils.randInt(0, 1800);
    private rotationProgress: number = 0;
    private cubeSize: number = 1;
    private availableRoll: RollDecision | undefined;
    private currentCell!: { row: number; col: number };
    private destinationCell: { row: number; col: number } | undefined;

    constructor(
        private position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
        private gridOccupancy: GridOccupancy,
        private color: number = COLORS.ex_fill,
    ) {
        super();
    }

    init(app: AppContext): void {
        const pivotGroup = new THREE.Group();
        this.pivotGroup = pivotGroup;
        this.scene = app.scene;
        app.scene.add(pivotGroup);

        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize),
            new THREE.MeshStandardMaterial({ color: this.color, map: this.texture }),
        );
        this.mesh.position.copy(this.position);
        this.currentCell = {
            row: Math.round(this.position.z / this.cubeSize),
            col: Math.round(this.position.x / this.cubeSize),
        };
        app.scene.add(this.mesh);
    }

    async load(resources: ResourceManager): Promise<void> {
        this.texture = await resources.loadTexture('/textures/bone_albedo.png');
        this.texture.colorSpace = THREE.SRGBColorSpace;
        (this.mesh.material as THREE.MeshStandardMaterial).map = this.texture;
        (this.mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }

    update(dt: number): void {
        if (this.state === this.CubeState.Rolling) {
            this.animateRoll(Math.PI / 2, dt + 0.00001);
            return;
        }

        const now = Date.now();
        if (now < this.nextMoveTime) {
            return;
        }

        if (!this.startRoll()) {
            this.nextMoveTime = now + this.blockedMoveDelay;
        }
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.mesh.removeFromParent();
        this.pivotGroup?.removeFromParent();
        this.unsub.forEach((fn) => fn());
    }

    makeFourCandidateDecisions(): RollDecision[] {
        const options = [
            {
                pivotOffset: new THREE.Vector3(this.cubeSize / 2, -this.cubeSize / 2, 0),
                axis: 'z' as const,
                angleSign: -1,
                rowDelta: 0,
                colDelta: 1,
            },
            {
                pivotOffset: new THREE.Vector3(-this.cubeSize / 2, -this.cubeSize / 2, 0),
                axis: 'z' as const,
                angleSign: 1,
                rowDelta: 0,
                colDelta: -1,
            },
            {
                pivotOffset: new THREE.Vector3(0, -this.cubeSize / 2, this.cubeSize / 2),
                axis: 'x' as const,
                angleSign: 1,
                rowDelta: 1,
                colDelta: 0,
            },
            {
                pivotOffset: new THREE.Vector3(0, -this.cubeSize / 2, -this.cubeSize / 2),
                axis: 'x' as const,
                angleSign: -1,
                rowDelta: -1,
                colDelta: 0,
            },
        ];

        return options.filter((option) =>
            this.gridOccupancy.isCellAvailable(
                this.currentCell.row + option.rowDelta,
                this.currentCell.col + option.colDelta,
            ),
        );
    }

    startRoll(): boolean {
        if (!this.pivotGroup) {
            return false;
        }

        const candidates = this.makeFourCandidateDecisions();
        if (candidates.length === 0) {
            return false;
        }

        const roll = candidates[Math.floor(Math.random() * candidates.length)];
        const destination = {
            row: this.currentCell.row + roll.rowDelta,
            col: this.currentCell.col + roll.colDelta,
        };
        if (!this.gridOccupancy.reserveCell(destination.row, destination.col)) {
            return false;
        }

        this.availableRoll = roll;
        this.destinationCell = destination;
        const cubePosition = this.mesh.getWorldPosition(new THREE.Vector3());
        this.pivotGroup.position.set(
            cubePosition.x + roll.pivotOffset.x,
            cubePosition.y + roll.pivotOffset.y,
            cubePosition.z + roll.pivotOffset.z,
        );
        this.pivotGroup.rotation.set(0, 0, 0);
        this.pivotGroup.attach(this.mesh);
        this.state = this.CubeState.Rolling;
        return true;
    }

    animateRoll(targetRotation: number, dt: number): void {
        if (!this.pivotGroup || !this.scene) {
            return;
        }

        this.rotationProgress = Math.min(
            this.rotationProgress + this.rollSpeed * dt,
            targetRotation,
        );
        if (this.availableRoll) {
            this.pivotGroup.rotation[this.availableRoll.axis] =
                this.availableRoll.angleSign * this.rotationProgress;
        }

        if (this.rotationProgress === targetRotation) {
            this.scene.attach(this.mesh);
            if (this.destinationCell) {
                this.gridOccupancy.setCell(this.currentCell.row, this.currentCell.col, false);
                this.currentCell = this.destinationCell;
            }
            this.pivotGroup.position.set(0, 0, 0);
            this.pivotGroup.rotation.set(0, 0, 0);
            this.state = this.CubeState.Idle;
            this.rotationProgress = 0;
            this.availableRoll = undefined;
            this.destinationCell = undefined;
            this.nextMoveTime = Date.now() + this.pauseTimeOnSide;
        }
    }
}
