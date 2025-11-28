import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * Fuse Component
 * Overcurrent protection - breaks circuit when current exceeds rating
 */
export class Fuse extends BaseComponent {
    constructor(
        id: string,
        position: Vector3D,
        rating: number = 1 // Amp rating
    ) {
        super(id, ComponentType.FUSE, position);

        this.properties = {
            rating, // Current rating in Amps
            voltage: 0,
            current: 0,
            power: 0,
            blown: false, // Fuse state
            resistance: 0.01, // Very low resistance when intact
            heatAccumulated: 0, // Heat buildup (for realistic fuse behavior)
            maxCurrent: rating, // Sync with rating
        };

        this.terminals = [
            this.createTerminal('in', { x: -0.25, y: 0, z: 0 }),
            this.createTerminal('out', { x: 0.25, y: 0, z: 0 }),
        ];
    }

    simulate(deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        const v1 = nodeVoltages.get(this.terminals[0].id) || 0;
        const v2 = nodeVoltages.get(this.terminals[1].id) || 0;

        this.properties.voltage = v1 - v2;

        // Sync maxCurrent with rating
        this.properties.maxCurrent = this.properties.rating;

        // If fuse is blown, act as open circuit
        if (this.properties.blown) {
            this.properties.resistance = 1e9; // Very high resistance
            this.properties.current = 0;
            this.properties.power = 0;
        } else {
            this.properties.resistance = 0.01;
            this.properties.current = this.properties.voltage / this.properties.resistance;
            this.properties.power = Math.abs(this.properties.voltage * this.properties.current);

            // Heat accumulation model (I²t - current squared time)
            const currentRatio = Math.abs(this.properties.current) / this.properties.rating;
            if (currentRatio > 1) {
                // Accumulate heat when overcurrent
                this.properties.heatAccumulated += (currentRatio * currentRatio) * deltaTime;

                // Fuse blows when heat threshold exceeded
                const blowThreshold = 2; // seconds at 2x rating
                if (this.properties.heatAccumulated > blowThreshold) {
                    this.properties.blown = true;
                }
            } else {
                // Cool down slowly when current is safe
                this.properties.heatAccumulated = Math.max(0, this.properties.heatAccumulated - deltaTime * 0.5);
            }
        }

        this.terminals[0].voltage = v1;
        this.terminals[1].voltage = v2;
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Glass tube body
        const bodyGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16);
        bodyGeometry.rotateZ(Math.PI / 2);
        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xE8E8E8,
            transparent: true,
            opacity: 0.7,
            metalness: 0.1,
            roughness: 0.2,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.name = 'body';
        group.add(body);

        // Fuse wire (thin wire inside)
        const wireMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.9,
            roughness: 0.1,
        });
        const wireGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8);
        wireGeometry.rotateZ(Math.PI / 2);
        const wire = new THREE.Mesh(wireGeometry, wireMaterial);
        wire.name = 'wire';
        group.add(wire);

        // End caps (metal)
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            metalness: 0.8,
            roughness: 0.3,
        });

        const capGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16);
        capGeometry.rotateZ(Math.PI / 2);

        const cap1 = new THREE.Mesh(capGeometry, capMaterial);
        cap1.position.x = -0.2;
        group.add(cap1);

        const cap2 = new THREE.Mesh(capGeometry.clone(), capMaterial);
        cap2.position.x = 0.2;
        group.add(cap2);

        // Connection leads
        const leadMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.8,
            roughness: 0.2,
        });

        const leadGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 8);
        leadGeometry.rotateZ(Math.PI / 2);

        const lead1 = new THREE.Mesh(leadGeometry, leadMaterial);
        lead1.position.x = -0.28;
        group.add(lead1);

        const lead2 = new THREE.Mesh(leadGeometry.clone(), leadMaterial);
        lead2.position.x = 0.28;
        group.add(lead2);

        // Glow effect when near blowing
        const glowGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16);
        glowGeometry.rotateZ(Math.PI / 2);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.name = 'glow';
        group.add(glow);

        // Selection outline
        const outlineGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16);
        outlineGeometry.rotateZ(Math.PI / 2);
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
        const wire = mesh.getObjectByName('wire') as THREE.Mesh;
        const glow = mesh.getObjectByName('glow') as THREE.Mesh;

        // Hide wire if blown
        if (wire) {
            wire.visible = !this.properties.blown;
        }

        // Show glow when near blowing
        if (glow && glow.material instanceof THREE.MeshBasicMaterial) {
            const heatRatio = (this.properties.heatAccumulated || 0) / 2;
            glow.material.opacity = Math.min(heatRatio, 1) * 0.8;
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        // Fuse blown
        if (this.properties.blown) {
            errors.push({
                id: `${this.id}-blown`,
                severity: ErrorSeverity.ERROR,
                message: `Fuse blown! Overcurrent protection activated (rated ${this.properties.rating}A)`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        return errors;
    }

    replace(): void {
        this.properties.blown = false;
        this.properties.heatAccumulated = 0;
    }
}
