import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * Switch Component
 * Controls circuit flow (open/closed)
 */
export class Switch extends BaseComponent {
    constructor(
        id: string,
        position: Vector3D,
        closed: boolean = false
    ) {
        super(id, ComponentType.SWITCH, position);

        this.properties = {
            closed, // Switch state
            voltage: 0,
            current: 0,
            resistance: closed ? 0.01 : 1e9, // Very low when closed, very high when open
            maxCurrent: 10, // 10A rating
        };

        this.terminals = [
            this.createTerminal('in', { x: -0.3, y: 0, z: 0 }),
            this.createTerminal('out', { x: 0.3, y: 0, z: 0 }),
        ];
    }

    simulate(_deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        const v1 = nodeVoltages.get(this.terminals[0].id) || 0;
        const v2 = nodeVoltages.get(this.terminals[1].id) || 0;

        this.properties.voltage = v1 - v2;

        // Update resistance based on switch state
        const resistance = this.properties.closed ? 0.01 : 1e9;
        this.properties.resistance = resistance;
        this.properties.current = this.properties.voltage / resistance;

        this.terminals[0].voltage = v1;
        this.terminals[1].voltage = v2;
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Contact points (terminals)
        const contactMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.9,
            roughness: 0.1,
        });

        const contactGeometry = new THREE.SphereGeometry(0.05, 16, 16);

        const contact1 = new THREE.Mesh(contactGeometry, contactMaterial);
        contact1.position.set(-0.2, 0, 0);
        group.add(contact1);

        const contact2 = new THREE.Mesh(contactGeometry, contactMaterial);
        contact2.position.set(0.2, 0, 0);
        group.add(contact2);

        // Switch lever
        const leverMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            metalness: 0.3,
            roughness: 0.7,
        });

        const leverGeometry = new THREE.BoxGeometry(0.3, 0.04, 0.04);
        const lever = new THREE.Mesh(leverGeometry, leverMaterial);
        lever.position.set(-0.05, 0, 0);
        lever.name = 'lever';
        group.add(lever);

        // Base
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.2,
            roughness: 0.8,
        });

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.08, 0.15),
            baseMaterial
        );
        base.position.y = -0.06;
        group.add(base);

        // Connection wires
        const wireMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.8,
            roughness: 0.2,
        });

        const wireGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8);
        wireGeometry.rotateZ(Math.PI / 2);

        const wire1 = new THREE.Mesh(wireGeometry, wireMaterial);
        wire1.position.set(-0.25, 0, 0);
        group.add(wire1);

        const wire2 = new THREE.Mesh(wireGeometry.clone(), wireMaterial);
        wire2.position.set(0.25, 0, 0);
        group.add(wire2);

        // Selection outline
        const outlineGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.2);
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

    updateMesh(mesh: THREE.Group): void {
        const lever = mesh.getObjectByName('lever');

        if (lever) {
            // Rotate lever based on switch state
            const targetRotation = this.properties.closed ? 0 : Math.PI / 6;
            lever.rotation.z = targetRotation;
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        // Check for overcurrent (arcing/melting)
        if (Math.abs(this.properties.current || 0) > (this.properties.maxCurrent || 10)) {
            errors.push({
                id: `${this.id}-overcurrent`,
                severity: ErrorSeverity.CRITICAL,
                message: `Switch current (${Math.abs(this.properties.current || 0).toFixed(2)}A) exceeds rating (${this.properties.maxCurrent}A)!`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        return errors;
    }

    toggle(): void {
        this.properties.closed = !this.properties.closed;
    }
}
