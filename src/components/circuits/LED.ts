import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * LED Component
 * Light Emitting Diode with visual animation
 */
export class LED extends BaseComponent {
    constructor(
        id: string,
        position: Vector3D,
        color: string = '#ff0000',
        forwardVoltage: number = 2.0
    ) {
        super(id, ComponentType.LED, position);

        this.properties = {
            color,
            forwardVoltage, // Typical forward voltage drop
            maxCurrent: 0.02, // 20mA typical max current
            voltage: 0,
            current: 0,
            brightness: 0, // 0-1
            power: 0,
        };

        // Create terminals (anode and cathode)
        this.terminals = [
            this.createTerminal('anode', { x: -0.3, y: 0, z: 0 }),
            this.createTerminal('cathode', { x: 0.3, y: 0, z: 0 }),
        ];
    }

    simulate(deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        const vAnode = nodeVoltages.get(this.terminals[0].id) || 0;
        const vCathode = nodeVoltages.get(this.terminals[1].id) || 0;

        // Voltage across LED (anode - cathode)
        this.properties.voltage = vAnode - vCathode;

        // LED conducts only in forward bias
        if (this.properties.voltage > (this.properties.forwardVoltage || 2.0)) {
            // Simplified LED model - current increases with voltage above threshold
            const excessVoltage = this.properties.voltage - (this.properties.forwardVoltage || 2.0);
            this.properties.current = Math.min(excessVoltage * 0.01, this.properties.maxCurrent || 0.02);

            // Brightness proportional to current
            this.properties.brightness = Math.min(
                this.properties.current / (this.properties.maxCurrent || 0.02),
                1
            );
        } else {
            // Reverse bias or below threshold - no current
            this.properties.current = 0;
            this.properties.brightness = 0;
        }

        // Power dissipation
        this.properties.power = this.properties.voltage * this.properties.current;

        // Update terminal values
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
        this.terminals[0].voltage = vAnode;
        this.terminals[1].voltage = vCathode;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // LED dome (hemisphere)
        const domeGeometry = new THREE.SphereGeometry(0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMaterial = new THREE.MeshPhysicalMaterial({
            color: this.properties.color || '#ff0000',
            transparent: true,
            opacity: 0.7,
            metalness: 0,
            roughness: 0.2,
            transmission: 0.5,
            thickness: 0.5,
        });

        const dome = new THREE.Mesh(domeGeometry, domeMaterial);
        dome.name = 'dome';
        group.add(dome);

        // LED base (cylinder)
        const baseGeometry = new THREE.CylinderGeometry(0.15, 0.12, 0.1, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.3,
            roughness: 0.7,
        });

        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -0.05;
        group.add(base);

        // Point light for emission (initially off)
        const light = new THREE.PointLight(this.properties.color || '#ff0000', 0, 2);
        light.name = 'light';
        group.add(light);

        // Anode lead (longer)
        const anodeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
        anodeGeometry.rotateZ(Math.PI / 2);
        const leadMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.8,
            roughness: 0.2,
        });

        const anode = new THREE.Mesh(anodeGeometry, leadMaterial);
        anode.position.set(-0.25, -0.1, 0);
        group.add(anode);

        // Cathode lead (shorter, with flat indicator)
        const cathodeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
        cathodeGeometry.rotateZ(Math.PI / 2);

        const cathode = new THREE.Mesh(cathodeGeometry, leadMaterial);
        cathode.position.set(0.225, -0.1, 0);
        group.add(cathode);

        // Flat indicator on cathode side
        const flatGeometry = new THREE.BoxGeometry(0.05, 0.2, 0.05);
        const flat = new THREE.Mesh(flatGeometry, baseMaterial);
        flat.position.set(0.12, 0, 0);
        group.add(flat);

        // Selection outline
        const outlineGeometry = domeGeometry.clone();
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0,
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outline.scale.multiplyScalar(1.3);
        outline.name = 'outline';
        group.add(outline);

        return group;
    }

    updateMesh(mesh: THREE.Group): void {
        const dome = mesh.getObjectByName('dome') as THREE.Mesh;
        const light = mesh.getObjectByName('light') as THREE.PointLight;

        const brightness = this.properties.brightness || 0;

        // Update dome emission
        if (dome && dome.material instanceof THREE.MeshPhysicalMaterial) {
            dome.material.emissive.setStyle(this.properties.color || '#ff0000');
            dome.material.emissiveIntensity = brightness * 2;
        }

        // Update point light
        if (light) {
            light.intensity = brightness * 3;
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];
        const current = this.properties.current ?? 0;
        const maxCurrent = this.properties.maxCurrent ?? 0.02;
        const voltage = this.properties.voltage ?? 0;

        // Check for overcurrent
        if (current > maxCurrent) {
            errors.push({
                id: `${this.id}-overcurrent`,
                severity: ErrorSeverity.ERROR,
                message: `LED overcurrent: ${(current * 1000).toFixed(1)}mA exceeds maximum ${(maxCurrent * 1000).toFixed(1)}mA`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        // Check for reverse voltage (simplified - LEDs can be damaged by reverse voltage)
        if (voltage < -5) {
            errors.push({
                id: `${this.id}-reverse`,
                severity: ErrorSeverity.WARNING,
                message: `LED reverse voltage (${voltage?.toFixed(1)}V) may damage component`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: false,
            });
        }

        return errors;
    }
}
