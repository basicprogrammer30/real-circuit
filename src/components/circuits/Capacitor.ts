import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * Capacitor Component
 * Stores electrical energy in an electric field
 */
export class Capacitor extends BaseComponent {
    constructor(
        id: string,
        position: Vector3D,
        capacitance: number = 100e-6 // Default 100μF
    ) {
        super(id, ComponentType.CAPACITOR, position);

        this.properties = {
            capacitance, // Farads
            voltage: 0,
            current: 0,
            charge: 0, // Coulombs (Q = C * V)
            maxVoltage: 50, // Maximum rated voltage
            power: 0,
            energy: 0, // Stored energy in Joules (E = 0.5 * C * V^2)
        };

        // Create terminals
        this.terminals = [
            this.createTerminal('positive', { x: -0.3, y: 0, z: 0 }),
            this.createTerminal('negative', { x: 0.3, y: 0, z: 0 }),
        ];
    }

    simulate(deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        const vPos = nodeVoltages.get(this.terminals[0].id) || 0;
        const vNeg = nodeVoltages.get(this.terminals[1].id) || 0;

        const previousVoltage = this.properties.voltage || 0;
        this.properties.voltage = vPos - vNeg;

        // Calculate current: I = C * dV/dt
        const dV = this.properties.voltage - previousVoltage;
        this.properties.current = (this.properties.capacitance || 100e-6) * (dV / Math.max(deltaTime, 0.001));

        // Update charge: Q = C * V
        this.properties.charge = (this.properties.capacitance || 100e-6) * this.properties.voltage;

        // Calculate stored energy: E = 0.5 * C * V^2
        this.properties.energy = 0.5 * (this.properties.capacitance || 100e-6) * Math.pow(this.properties.voltage, 2);

        // Power (instantaneous): P = V * I
        this.properties.power = this.properties.voltage * this.properties.current;

        // Update terminal values
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
        this.terminals[0].voltage = vPos;
        this.terminals[1].voltage = vNeg;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Capacitor body (cylindrical)
        const bodyGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a90e2,
            metalness: 0.3,
            roughness: 0.6,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.name = 'body';
        group.add(body);

        // Top cap (positive terminal indicator)
        const capGeometry = new THREE.CylinderGeometry(0.13, 0.12, 0.02, 16);
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            metalness: 0.5,
            roughness: 0.4,
        });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.y = 0.16;
        group.add(cap);

        // Positive marking (white stripe)
        const stripeGeometry = new THREE.BoxGeometry(0.24, 0.05, 0.02);
        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0.8,
        });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.set(0, 0.1, 0.12);
        group.add(stripe);

        // Lead material
        const leadMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.8,
            roughness: 0.2,
        });

        // Positive lead
        const leadGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
        leadGeometry.rotateZ(Math.PI / 2);

        const posLead = new THREE.Mesh(leadGeometry, leadMaterial);
        posLead.position.set(-0.225, -0.2, 0);
        group.add(posLead);

        // Negative lead
        const negLead = new THREE.Mesh(leadGeometry.clone(), leadMaterial);
        negLead.position.set(0.225, -0.2, 0);
        group.add(negLead);

        // Selection outline
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
        const body = mesh.getObjectByName('body') as THREE.Mesh;

        if (body && body.material instanceof THREE.MeshStandardMaterial) {
            // Pulse effect when charging/discharging
            const chargeFactor = Math.abs(this.properties.current || 0) * 100;
            body.material.emissive.setHex(0x4a90e2);
            body.material.emissiveIntensity = Math.min(chargeFactor, 0.5);
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        // Check for overvoltage
        if (Math.abs(this.properties.voltage || 0) > (this.properties.maxVoltage || 50)) {
            errors.push({
                id: `${this.id}-overvoltage`,
                severity: ErrorSeverity.ERROR,
                message: `Capacitor overvoltage: ${Math.abs(this.properties.voltage || 0).toFixed(1)}V exceeds maximum ${this.properties.maxVoltage || 50}V`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        // Check for reverse polarity on polarized capacitor
        if ((this.properties.voltage || 0) < -1) {
            errors.push({
                id: `${this.id}-reverse`,
                severity: ErrorSeverity.WARNING,
                message: `Capacitor reverse polarity (${this.properties.voltage?.toFixed(1)}V) - may damage polarized capacitor`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: false,
            });
        }

        return errors;
    }
}
