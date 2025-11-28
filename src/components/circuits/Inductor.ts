import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * Inductor Component
 * Stores electrical energy in a magnetic field
 */
export class Inductor extends BaseComponent {
    constructor(
        id: string,
        position: Vector3D,
        inductance: number = 0.001 // Default 1mH
    ) {
        super(id, ComponentType.INDUCTOR, position);

        this.properties = {
            inductance, // Henries
            voltage: 0,
            current: 0,
            maxCurrent: 10, // Maximum current rating
            power: 0,
            energy: 0, // Stored energy in Joules (E = 0.5 * L * I^2)
            flux: 0, // Magnetic flux linkage (Φ = L * I)
        };

        // Create terminals
        this.terminals = [
            this.createTerminal('terminal1', { x: -0.4, y: 0, z: 0 }),
            this.createTerminal('terminal2', { x: 0.4, y: 0, z: 0 }),
        ];
    }

    simulate(deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        const v1 = nodeVoltages.get(this.terminals[0].id) || 0;
        const v2 = nodeVoltages.get(this.terminals[1].id) || 0;

        this.properties.voltage = v1 - v2;

        // Calculate current change: V = L * dI/dt -> dI = V * dt / L
        const dI = this.properties.voltage * Math.max(deltaTime, 0.001) / (this.properties.inductance || 0.001);
        this.properties.current = (this.properties.current || 0) + dI;

        // Limit current to realistic values
        this.properties.current = Math.max(-this.properties.maxCurrent, Math.min(this.properties.maxCurrent, this.properties.current));

        // Calculate stored energy: E = 0.5 * L * I^2
        this.properties.energy = 0.5 * (this.properties.inductance || 0.001) * Math.pow(this.properties.current, 2);

        // Calculate magnetic flux: Φ = L * I
        this.properties.flux = (this.properties.inductance || 0.001) * this.properties.current;

        // Power (instantaneous): P = V * I
        this.properties.power = this.properties.voltage * this.properties.current;

        // Update terminal values
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
        this.terminals[0].voltage = v1;
        this.terminals[1].voltage = v2;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Create coil using multiple torus segments
        const coilMaterial = new THREE.MeshStandardMaterial({
            color: 0xCC6600,
            metalness: 0.6,
            roughness: 0.3,
        });

        const numCoils = 6;
        const coilRadius = 0.08;
        const tubeRadius = 0.03;
        const spacing = 0.1;

        for (let i = 0; i < numCoils; i++) {
            const coilGeometry = new THREE.TorusGeometry(coilRadius, tubeRadius, 12, 24);
            coilGeometry.rotateY(Math.PI / 2);
            const coil = new THREE.Mesh(coilGeometry, coilMaterial);
            coil.position.x = (i - (numCoils - 1) / 2) * spacing;
            coil.name = `coil${i}`;
            group.add(coil);
        }

        // Core (ferrite or air core)
        const coreGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 16);
        coreGeometry.rotateZ(Math.PI / 2);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            metalness: 0.4,
            roughness: 0.6,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.name = 'core';
        group.add(core);

        // Lead material
        const leadMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.8,
            roughness: 0.2,
        });

        // Left lead
        const leadGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
        leadGeometry.rotateZ(Math.PI / 2);

        const leftLead = new THREE.Mesh(leadGeometry, leadMaterial);
        leftLead.position.set(-0.375, 0, 0);
        group.add(leftLead);

        // Right lead
        const rightLead = new THREE.Mesh(leadGeometry.clone(), leadMaterial);
        rightLead.position.set(0.375, 0, 0);
        group.add(rightLead);

        // Magnetic field indicator (invisible until energized)
        const fieldGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const fieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0,
            wireframe: true,
        });
        const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
        field.name = 'field';
        group.add(field);

        // Selection outline
        const outlineGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.2);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0,
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outline.scale.multiplyScalar(1.1);
        outline.name = 'outline';
        group.add(outline);

        return group;
    }

    updateMesh(mesh: THREE.Group): void {
        const field = mesh.getObjectByName('field') as THREE.Mesh;

        if (field && field.material instanceof THREE.MeshBasicMaterial) {
            // Show magnetic field when current flows
            const currentFactor = Math.min(Math.abs(this.properties.current || 0) / 2, 1);
            field.material.opacity = currentFactor * 0.3;

            // Animate field
            field.rotation.y += 0.05 * currentFactor;
        }

        // Make coils glow based on energy stored
        const energyFactor = Math.min((this.properties.energy || 0) * 100, 1);
        for (let i = 0; i < 6; i++) {
            const coil = mesh.getObjectByName(`coil${i}`) as THREE.Mesh;
            if (coil && coil.material instanceof THREE.MeshStandardMaterial) {
                coil.material.emissive.setHex(0xCC6600);
                coil.material.emissiveIntensity = energyFactor * 0.5;
            }
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        // Check for overcurrent (saturation)
        if (Math.abs(this.properties.current || 0) > (this.properties.maxCurrent || 10)) {
            errors.push({
                id: `${this.id}-saturation`,
                severity: ErrorSeverity.ERROR,
                message: `Inductor core saturation: ${Math.abs(this.properties.current || 0).toFixed(2)}A exceeds maximum ${this.properties.maxCurrent || 10}A`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        // Check for excessive power dissipation (due to resistance, not modeled here but important)
        if ((this.properties.power || 0) > 10) {
            errors.push({
                id: `${this.id}-overpower`,
                severity: ErrorSeverity.WARNING,
                message: `Inductor high power dissipation (${this.properties.power?.toFixed(2)}W) may cause overheating`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: false,
            });
        }

        return errors;
    }
}
