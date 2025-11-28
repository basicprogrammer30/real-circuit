import * as THREE from 'three';
import type {
    ICircuitComponent,
    ComponentType,
    Vector3D,
    Terminal,
    ComponentProperties,
    CircuitError,
} from '../../types';

/**
 * Abstract base class for all circuit components
 * Following Falstad's pattern - each component type extends this
 */
export abstract class BaseComponent implements ICircuitComponent {
    id: string;
    type: ComponentType;
    position: Vector3D;
    rotation: Vector3D;
    terminals: Terminal[];
    properties: ComponentProperties;

    constructor(
        id: string,
        type: ComponentType,
        position: Vector3D,
        rotation: Vector3D = { x: 0, y: 0, z: 0 }
    ) {
        this.id = id;
        this.type = type;
        this.position = position;
        this.rotation = rotation;
        this.terminals = [];
        this.properties = {};
    }

    /**
     * Simulate component behavior for one time step
     */
    abstract simulate(deltaTime: number, nodeVoltages: Map<string, number>): void;

    /**
     * Create the 3D mesh for this component
     */
    abstract createMesh(): THREE.Group;

    /**
     * Update the 3D mesh based on current state
     */
    abstract updateMesh(mesh: THREE.Group): void;

    /**
     * Check for errors in component state
     */
    abstract checkErrors(): CircuitError[];

    /**
     * Get the world position of a terminal by name
     */
    getTerminalPosition(terminalName: string): Vector3D {
        const terminal = this.terminals.find((t) => t.name === terminalName);
        if (!terminal) {
            throw new Error(`Terminal ${terminalName} not found on component ${this.id}`);
        }
        return terminal.position;
    }

    /**
     * Helper to create a terminal
     */
    protected createTerminal(name: string, localPosition: Vector3D): Terminal {
        return {
            id: `${this.id}-${name}`,
            componentId: this.id,
            position: this.localToWorld(localPosition),
            offset: localPosition,
            voltage: 0,
            current: 0,
            name,
        };
    }

    /**
     * Convert local position to world position
     */
    protected localToWorld(localPos: Vector3D): Vector3D {
        const vec = new THREE.Vector3(localPos.x, localPos.y, localPos.z);
        const euler = new THREE.Euler(this.rotation.x, this.rotation.y, this.rotation.z);
        vec.applyEuler(euler);

        return {
            x: vec.x + this.position.x,
            y: vec.y + this.position.y,
            z: vec.z + this.position.z,
        };
    }

    /**
     * Update terminal positions when component moves/rotates
     */
    protected updateTerminalPositions(): void {
        // Subclasses should override if they have custom terminal positioning
    }

    /**
     * Helper to create basic component geometry
     */
    protected createBasicMesh(
        geometry: THREE.BufferGeometry,
        color: number = 0x888888
    ): THREE.Group {
        const group = new THREE.Group();

        const material = new THREE.MeshStandardMaterial({
            color,
            metalness: 0.3,
            roughness: 0.7,
        });

        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // Add selection outline
        const outlineGeometry = geometry.clone();
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0,
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outline.scale.multiplyScalar(1.05);
        outline.name = 'outline';
        group.add(outline);

        return group;
    }

    /**
     * Show/hide selection outline
     */
    protected setSelected(mesh: THREE.Group, selected: boolean): void {
        const outline = mesh.getObjectByName('outline') as THREE.Mesh;
        if (outline && outline.material instanceof THREE.MeshBasicMaterial) {
            outline.material.opacity = selected ? 0.3 : 0;
        }
    }

    /**
     * Show error state on mesh
     */
    protected setError(mesh: THREE.Group, hasError: boolean): void {
        mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                if (hasError) {
                    child.material.emissive.setHex(0xff0000);
                    child.material.emissiveIntensity = 0.5;
                } else {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
    }
}
