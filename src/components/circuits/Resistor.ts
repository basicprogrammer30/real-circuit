import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * Resistor Component
 * Implements Ohm's law: V = I * R
 */
export class Resistor extends BaseComponent {
    constructor(id: string, position: Vector3D, resistance: number = 1000) {
        super(id, ComponentType.RESISTOR, position);

        this.properties = {
            value: resistance, // Resistance in ohms
            voltage: 0,
            current: 0,
            power: 0,
            temperature: 25, // Ambient temperature in Celsius
        };

        // Create terminals (resistor has 2 terminals)
        this.terminals = [
            this.createTerminal('terminal1', { x: -0.5, y: 0, z: 0 }),
            this.createTerminal('terminal2', { x: 0.5, y: 0, z: 0 }),
        ];
    }

    simulate(deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        const v1 = nodeVoltages.get(this.terminals[0].id) || 0;
        const v2 = nodeVoltages.get(this.terminals[1].id) || 0;

        // Calculate voltage across resistor
        this.properties.voltage = Math.abs(v1 - v2);

        // Calculate current using Ohm's law: I = V / R
        this.properties.current = this.properties.voltage / (this.properties.value || 1);

        // Calculate power dissipation: P = I^2 * R
        this.properties.power = Math.pow(this.properties.current, 2) * (this.properties.value || 1);

        // Simple temperature model: T = T_ambient + k * P
        const thermalResistance = 50; // °C/W (simplified)
        this.properties.temperature = 25 + this.properties.power * thermalResistance;

        // Update terminal currents
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
        this.terminals[0].voltage = v1;
        this.terminals[1].voltage = v2;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Resistor body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 16);
        bodyGeometry.rotateZ(Math.PI / 2);

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xD4A574, // Tan color for resistor body
            metalness: 0.2,
            roughness: 0.8,
        });

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);

        // Color bands (simplified - just showing 4 bands)
        const bandColors = this.getColorBands(this.properties.value || 1000);
        const bandPositions = [-0.2, -0.07, 0.07, 0.2];

        bandPositions.forEach((pos, index) => {
            const bandGeometry = new THREE.CylinderGeometry(0.085, 0.085, 0.04, 16);
            bandGeometry.rotateZ(Math.PI / 2);

            const bandMaterial = new THREE.MeshStandardMaterial({
                color: bandColors[index],
                metalness: 0.1,
                roughness: 0.9,
            });

            const band = new THREE.Mesh(bandGeometry, bandMaterial);
            band.position.x = pos;
            group.add(band);
        });

        // Lead wires
        const leadGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
        leadGeometry.rotateZ(Math.PI / 2);

        const leadMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0, // Silver
            metalness: 0.8,
            roughness: 0.2,
        });

        const lead1 = new THREE.Mesh(leadGeometry, leadMaterial);
        lead1.position.x = -0.4;
        group.add(lead1);

        const lead2 = new THREE.Mesh(leadGeometry, leadMaterial);
        lead2.position.x = 0.4;
        group.add(lead2);

        // Add selection outline
        const outlineGeometry = bodyGeometry.clone();
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0,
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outline.scale.multiplyScalar(1.2);
        outline.name = 'outline';
        group.add(outline);

        return group;
    }

    updateMesh(mesh: THREE.Group): void {
        // Update visual state based on current/temperature
        const body = mesh.children.find((child) => child instanceof THREE.Mesh) as THREE.Mesh;

        if (body && body.material instanceof THREE.MeshStandardMaterial) {
            // Show heating effect when power is dissipated
            const temp = this.properties.temperature || 25;
            if (temp > 100) {
                // Red glow for overheating
                body.material.emissive.setHex(0xff0000);
                body.material.emissiveIntensity = Math.min((temp - 100) / 200, 1);
            } else {
                body.material.emissive.setHex(0x000000);
                body.material.emissiveIntensity = 0;
            }
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        // Check for critical power dissipation (fire/explosion hazard)
        const criticalPower = 10; // 10W - extremely dangerous for small resistor
        if ((this.properties.power || 0) > criticalPower) {
            errors.push({
                id: `${this.id}-critical-overpower`,
                severity: ErrorSeverity.CRITICAL,
                message: `DANGER! Resistor power (${this.properties.power?.toFixed(2)}W) far exceeds safe limits! Fire hazard!`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        // Check for excessive power dissipation (simplified - 0.25W for standard resistor)
        const maxPower = 0.25;
        if ((this.properties.power || 0) > maxPower && (this.properties.power || 0) <= criticalPower) {
            errors.push({
                id: `${this.id}-overpower`,
                severity: ErrorSeverity.WARNING,
                message: `Resistor power dissipation (${this.properties.power?.toFixed(2)}W) exceeds rating (${maxPower}W)`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: false,
            });
        }

        // Check for excessive current (wire melting hazard)
        const maxCurrent = 10; // 10A would melt typical resistor leads
        if (Math.abs(this.properties.current || 0) > maxCurrent) {
            errors.push({
                id: `${this.id}-overcurrent`,
                severity: ErrorSeverity.CRITICAL,
                message: `DANGER! Resistor current (${Math.abs(this.properties.current || 0).toFixed(2)}A) far exceeds safe limits! Lead melting hazard!`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        // Check for excessive temperature
        const maxTemp = 150; // °C
        if ((this.properties.temperature || 0) > maxTemp) {
            errors.push({
                id: `${this.id}-overtemp`,
                severity: ErrorSeverity.ERROR,
                message: `Resistor temperature (${this.properties.temperature?.toFixed(1)}°C) exceeds maximum (${maxTemp}°C)`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        return errors;
    }

    /**
     * Get color band codes for resistance value
     */
    private getColorBands(resistance: number): number[] {
        // Simplified color coding
        const colors = [
            0x000000, // Black - 0
            0x8B4513, // Brown - 1
            0xFF0000, // Red - 2
            0xFFA500, // Orange - 3
            0xFFFF00, // Yellow - 4
            0x00FF00, // Green - 5
            0x0000FF, // Blue - 6
            0x8B00FF, // Violet - 7
            0x808080, // Gray - 8
            0xFFFFFF, // White - 9
        ];

        // Default to brown-black-red-gold (1k ohm)
        return [colors[1], colors[0], colors[2], 0xFFD700];
    }
}
