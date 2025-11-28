import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError } from '../../types';

/**
 * Ground Component
 * Reference point for circuit (0V)
 */
export class Ground extends BaseComponent {
    constructor(id: string, position: Vector3D) {
        super(id, ComponentType.GROUND, position);

        this.properties = {
            voltage: 0, // Always 0V
        };

        // Single terminal
        this.terminals = [
            this.createTerminal('ground', { x: 0, y: 0.2, z: 0 }),
        ];
    }

    simulate(_deltaTime: number, _nodeVoltages: Map<string, number>): void {
        // Ground is always 0V
        this.properties.voltage = 0;
        if (this.terminals.length > 0) {
            this.terminals[0].voltage = 0;
        }
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Ground symbol - horizontal lines getting shorter
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            metalness: 0.6,
            roughness: 0.4,
        });

        // Top line (longest)
        const line1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.02, 0.02),
            lineMaterial
        );
        line1.position.y = 0;
        group.add(line1);

        // Middle line
        const line2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.02, 0.02),
            lineMaterial
        );
        line2.position.y = -0.08;
        group.add(line2);

        // Bottom line (shortest)
        const line3 = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.02, 0.02),
            lineMaterial
        );
        line3.position.y = -0.16;
        group.add(line3);

        // Vertical connection line
        const vLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.2, 0.02),
            lineMaterial
        );
        vLine.position.y = 0.1;
        group.add(vLine);

        // Selection outline
        const outlineGeometry = new THREE.BoxGeometry(0.5, 0.4, 0.1);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0,
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outline.name = 'outline';
        group.add(outline);

        return group;
    }

    updateMesh(_mesh: THREE.Group): void {
        // Ground doesn't need visual updates
    }

    checkErrors(): CircuitError[] {
        return [];
    }
}
