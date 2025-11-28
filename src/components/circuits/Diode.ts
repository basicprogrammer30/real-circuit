import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * Diode Component
 * Allows current flow in one direction only
 */
export class Diode extends BaseComponent {
    constructor(
        id: string,
        position: Vector3D,
        forwardVoltage: number = 0.7 // Default silicon diode forward voltage
    ) {
        super(id, ComponentType.DIODE, position);

        this.properties = {
            forwardVoltage, // Forward voltage drop (0.7V for silicon, 0.3V for germanium)
            reverseBreakdown: 50, // Reverse breakdown voltage
            maxCurrent: 1.0, // Maximum forward current (1A)
            voltage: 0,
            current: 0,
            power: 0,
            conducting: false, // Is the diode conducting?
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

        // Voltage across diode (anode - cathode)
        this.properties.voltage = vAnode - vCathode;

        // Diode model: Shockley ideal diode equation (simplified)
        if (this.properties.voltage > (this.properties.forwardVoltage || 0.7)) {
            // Forward bias - conducting
            this.properties.conducting = true;

            // Current increases exponentially above threshold
            // Simplified model: I = Is * (e^(V/Vt) - 1)
            // For simulation purposes, use a linear approximation above threshold
            const excessVoltage = this.properties.voltage - (this.properties.forwardVoltage || 0.7);
            this.properties.current = Math.min(
                excessVoltage * 10, // Large conductance in forward bias
                this.properties.maxCurrent || 1.0
            );
        } else if (this.properties.voltage < -(this.properties.reverseBreakdown || 50)) {
            // Reverse breakdown (Zener effect)
            this.properties.conducting = true;
            const breakdownVoltage = Math.abs(this.properties.voltage) - (this.properties.reverseBreakdown || 50);
            this.properties.current = -breakdownVoltage * 0.1; // Negative current in reverse
        } else {
            // Reverse bias or below threshold - blocking
            this.properties.conducting = false;
            this.properties.current = 0;
        }

        // Power dissipation
        this.properties.power = Math.abs(this.properties.voltage * this.properties.current);

        // Update terminal values
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
        this.terminals[0].voltage = vAnode;
        this.terminals[1].voltage = vCathode;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Diode body (glass tube)
        const bodyGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 16);
        bodyGeometry.rotateZ(Math.PI / 2);
        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.9,
            metalness: 0.1,
            roughness: 0.3,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.name = 'body';
        group.add(body);

        // Cathode band (white/silver stripe)
        const bandGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16);
        bandGeometry.rotateZ(Math.PI / 2);
        const bandMaterial = new THREE.MeshStandardMaterial({
            color: 0xE0E0E0,
            metalness: 0.5,
            roughness: 0.3,
        });
        const band = new THREE.Mesh(bandGeometry, bandMaterial);
        band.position.x = 0.15;
        group.add(band);

        // Lead material
        const leadMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.8,
            roughness: 0.2,
        });

        // Anode lead
        const leadGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
        leadGeometry.rotateZ(Math.PI / 2);

        const anodeLead = new THREE.Mesh(leadGeometry, leadMaterial);
        anodeLead.position.set(-0.275, 0, 0);
        group.add(anodeLead);

        // Cathode lead
        const cathodeLead = new THREE.Mesh(leadGeometry.clone(), leadMaterial);
        cathodeLead.position.set(0.275, 0, 0);
        group.add(cathodeLead);

        // Conducting indicator (glow when active)
        const glowGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16);
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
        const outlineGeometry = bodyGeometry.clone();
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
        const glow = mesh.getObjectByName('glow') as THREE.Mesh;

        if (glow && glow.material instanceof THREE.MeshBasicMaterial) {
            // Show glow when conducting
            const conducting = this.properties.conducting || false;
            const currentFactor = Math.min(Math.abs(this.properties.current || 0), 1);

            glow.material.opacity = conducting ? currentFactor * 0.6 : 0;
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        // Check for overcurrent
        if (Math.abs(this.properties.current || 0) > (this.properties.maxCurrent || 1.0)) {
            errors.push({
                id: `${this.id}-overcurrent`,
                severity: ErrorSeverity.ERROR,
                message: `Diode overcurrent: ${Math.abs(this.properties.current || 0).toFixed(2)}A exceeds maximum ${this.properties.maxCurrent || 1.0}A`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        // Check for reverse breakdown
        if ((this.properties.voltage || 0) < -(this.properties.reverseBreakdown || 50)) {
            errors.push({
                id: `${this.id}-breakdown`,
                severity: ErrorSeverity.WARNING,
                message: `Diode reverse breakdown at ${Math.abs(this.properties.voltage || 0).toFixed(1)}V`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: false,
            });
        }

        // Check for excessive power dissipation
        if ((this.properties.power || 0) > 1) {
            errors.push({
                id: `${this.id}-overpower`,
                severity: ErrorSeverity.WARNING,
                message: `Diode power dissipation (${this.properties.power?.toFixed(2)}W) may cause overheating`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: false,
            });
        }

        return errors;
    }
}
