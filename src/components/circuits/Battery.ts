import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * Battery Component
 * Portable DC power source with capacity
 */
export class Battery extends BaseComponent {
    constructor(
        id: string,
        position: Vector3D,
        voltage: number = 9, // 9V battery default
        capacity: number = 500 // mAh
    ) {
        super(id, ComponentType.BATTERY, position);

        this.properties = {
            voltage, // Nominal voltage
            capacity, // Total capacity in mAh
            chargeRemaining: capacity, // Current charge in mAh
            current: 0,
            power: 0,
            chargePercent: 100,
            internalResistance: 0.1, // Ohms
            maxCurrent: 5, // Maximum safe discharge current (A)
            maxPower: 45, // Max power (approx 9V * 5A)
        };

        this.terminals = [
            this.createTerminal('positive', { x: 0, y: 0.3, z: 0 }),
            this.createTerminal('negative', { x: 0, y: -0.3, z: 0 }),
        ];
    }

    simulate(deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        const vPos = nodeVoltages.get(this.terminals[0].id) || 0;
        const vNeg = nodeVoltages.get(this.terminals[1].id) || 0;

        // Battery acts as voltage source with internal resistance
        this.properties.current = (this.properties.voltage - (vPos - vNeg)) / this.properties.internalResistance;
        this.properties.power = Math.abs((vPos - vNeg) * this.properties.current);

        // Discharge battery based on current draw
        if (this.properties.current > 0) {
            const chargeUsed = (this.properties.current * deltaTime * 1000) / 3600; // Convert to mAh
            this.properties.chargeRemaining = Math.max(0, this.properties.chargeRemaining - chargeUsed);
            this.properties.chargePercent = (this.properties.chargeRemaining / this.properties.capacity) * 100;

            // Voltage drops as battery depletes
            const depletionFactor = Math.max(0.7, this.properties.chargePercent / 100);
            this.properties.voltage = this.properties.voltage * depletionFactor;
        }

        this.terminals[0].voltage = vPos;
        this.terminals[1].voltage = vNeg;
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Battery body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 32);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2C3E50,
            metalness: 0.4,
            roughness: 0.6,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.name = 'body';
        group.add(body);

        // Positive terminal (top - smaller cylinder)
        const posTerminalGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16);
        const terminalMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.9,
            roughness: 0.1,
        });
        const posTerminal = new THREE.Mesh(posTerminalGeometry, terminalMaterial);
        posTerminal.position.y = 0.29;
        group.add(posTerminal);

        // Positive label (+)
        const plusGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.02);
        const labelMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.3,
            roughness: 0.7,
        });
        const plusH = new THREE.Mesh(plusGeometry, labelMaterial);
        plusH.position.set(0, 0.15, 0.13);
        group.add(plusH);

        const plusV = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.08, 0.02),
            labelMaterial
        );
        plusV.position.set(0, 0.15, 0.13);
        group.add(plusV);

        // Negative terminal (bottom - flat)
        const negTerminalGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 32);
        const negTerminal = new THREE.Mesh(negTerminalGeometry, terminalMaterial);
        negTerminal.position.y = -0.26;
        group.add(negTerminal);

        // Negative label (-)
        const minus = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.02, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        minus.position.set(0, -0.15, 0.13);
        group.add(minus);

        // Charge indicator (LED-like)
        const indicatorGeometry = new THREE.SphereGeometry(0.03, 16, 16);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8,
        });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(0, 0, 0.13);
        indicator.name = 'indicator';
        group.add(indicator);

        // Selection outline
        const outlineGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 32);
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
        const indicator = mesh.getObjectByName('indicator') as THREE.Mesh;

        if (indicator && indicator.material instanceof THREE.MeshBasicMaterial) {
            const chargePercent = this.properties.chargePercent || 0;

            // Color changes based on charge level
            if (chargePercent > 50) {
                indicator.material.color.setHex(0x00ff00); // Green
            } else if (chargePercent > 20) {
                indicator.material.color.setHex(0xffff00); // Yellow
            } else {
                indicator.material.color.setHex(0xff0000); // Red
            }

            indicator.material.opacity = chargePercent / 100;
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        // Check for battery depletion
        if ((this.properties.chargePercent || 0) < 5) {
            errors.push({
                id: `${this.id}-depleted`,
                severity: ErrorSeverity.ERROR,
                message: `Battery depleted (${this.properties.chargePercent?.toFixed(1)}% remaining)`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        // Check for overcurrent
        if (Math.abs(this.properties.current || 0) > (this.properties.maxCurrent || 5)) {
            errors.push({
                id: `${this.id}-overcurrent`,
                severity: ErrorSeverity.CRITICAL,
                message: `DANGER! Battery overcurrent (${Math.abs(this.properties.current || 0).toFixed(2)}A)! Risk of explosion!`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        return errors;
    }

    recharge(): void {
        this.properties.chargeRemaining = this.properties.capacity;
        this.properties.chargePercent = 100;
    }
}
