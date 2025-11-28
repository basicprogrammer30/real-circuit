import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * Potentiometer Component
 * Variable resistor (adjustable resistance)
 */
export class Potentiometer extends BaseComponent {
    constructor(
        id: string,
        position: Vector3D,
        maxResistance: number = 10000, // 10kΩ default
        position_percent: number = 50 // Wiper position (0-100%)
    ) {
        super(id, ComponentType.POTENTIOMETER, position);

        this.properties = {
            maxResistance,
            position: position_percent, // Wiper position 0-100%
            value: (maxResistance * position_percent) / 100, // Current resistance
            voltage: 0,
            current: 0,
            power: 0,
            temperature: 25,
            maxPower: 0.5, // 0.5W rating
        };

        this.terminals = [
            this.createTerminal('terminal1', { x: -0.25, y: 0, z: 0 }),
            this.createTerminal('terminal2', { x: 0.25, y: 0, z: 0 }),
        ];
    }

    simulate(deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        const v1 = nodeVoltages.get(this.terminals[0].id) || 0;
        const v2 = nodeVoltages.get(this.terminals[1].id) || 0;

        this.properties.voltage = v1 - v2;

        // Update current resistance based on wiper position
        this.properties.value = (this.properties.maxResistance * this.properties.position) / 100;

        // Prevent division by zero
        const resistance = Math.max(this.properties.value, 0.01);
        this.properties.current = this.properties.voltage / resistance;
        this.properties.power = Math.abs(this.properties.voltage * this.properties.current);

        // Temperature simulation (simplified)
        const ambientTemp = 25;
        const thermalResistance = 50; // °C/W
        const power = this.properties.power || 0;
        const currentTemp = this.properties.temperature || 25;

        const targetTemp = ambientTemp + power * thermalResistance;
        const tempChange = (targetTemp - currentTemp) * deltaTime * 2;
        this.properties.temperature = currentTemp + tempChange;

        this.terminals[0].voltage = v1;
        this.terminals[1].voltage = v2;
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Potentiometer body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 32);
        bodyGeometry.rotateX(Math.PI / 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.3,
            roughness: 0.7,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.name = 'body';
        group.add(body);

        // Adjustment knob (top)
        const knobGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 32);
        knobGeometry.rotateX(Math.PI / 2);
        const knobMaterial = new THREE.MeshStandardMaterial({
            color: 0x4169E1,
            metalness: 0.5,
            roughness: 0.5,
        });
        const knob = new THREE.Mesh(knobGeometry, knobMaterial);
        knob.position.z = 0.08;
        knob.name = 'knob';
        group.add(knob);

        // Indicator line on knob
        const indicatorGeometry = new THREE.BoxGeometry(0.02, 0.08, 0.02);
        const indicatorMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.8,
            roughness: 0.2,
        });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(0, 0.04, 0.09);
        indicator.name = 'indicator';
        group.add(indicator);

        // Terminals (leads)
        const leadMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.8,
            roughness: 0.2,
        });

        const leadGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
        leadGeometry.rotateZ(Math.PI / 2);

        const lead1 = new THREE.Mesh(leadGeometry, leadMaterial);
        lead1.position.set(-0.175, 0, -0.05);
        group.add(lead1);

        const lead2 = new THREE.Mesh(leadGeometry.clone(), leadMaterial);
        lead2.position.set(0.175, 0, -0.05);
        group.add(lead2);

        // Selection outline
        const outlineGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 32);
        outlineGeometry.rotateX(Math.PI / 2);
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
        const knob = mesh.getObjectByName('knob');
        const indicator = mesh.getObjectByName('indicator');
        const body = mesh.getObjectByName('body') as THREE.Mesh;

        // Rotate knob based on position (0-100% maps to -135° to +135°)
        if (knob && indicator) {
            const angle = ((this.properties.position - 50) / 50) * (3 * Math.PI / 4);
            knob.rotation.z = angle;
            indicator.rotation.z = angle;
        }

        // Show heating effect
        if (body && body.material instanceof THREE.MeshStandardMaterial) {
            const temp = this.properties.temperature || 25;
            if (temp > 60) {
                body.material.emissive.setHex(0xff4400);
                body.material.emissiveIntensity = Math.min((temp - 60) / 100, 0.5);
            } else {
                body.material.emissive.setHex(0x000000);
                body.material.emissiveIntensity = 0;
            }
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        // Check for excessive power
        const maxPower = this.properties.maxPower || 0.5;
        if ((this.properties.power || 0) > maxPower * 10) {
            errors.push({
                id: `${this.id}-critical-overpower`,
                severity: ErrorSeverity.CRITICAL,
                message: `DANGER! Potentiometer power (${this.properties.power?.toFixed(2)}W) far exceeds safe limits!`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        } else if ((this.properties.power || 0) > maxPower) {
            errors.push({
                id: `${this.id}-overpower`,
                severity: ErrorSeverity.WARNING,
                message: `Potentiometer power (${this.properties.power?.toFixed(2)}W) exceeds rating (${maxPower}W)`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: false,
            });
        }

        return errors;
    }

    setPosition(percent: number): void {
        this.properties.position = Math.max(0, Math.min(100, percent));
    }
}
