import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import { ComponentType, Vector3D, CircuitError, ErrorSeverity } from '../../types';

/**
 * Lamp Component (Incandescent Bulb)
 * Resistor that emits light
 */
export class Lamp extends BaseComponent {
    constructor(
        id: string,
        position: Vector3D,
        voltageRating: number = 12, // 12V bulb
        powerRating: number = 60 // 60W
    ) {
        super(id, ComponentType.LAMP, position);

        // Calculate resistance from ratings: R = V^2 / P
        const resistance = (voltageRating * voltageRating) / powerRating;

        this.properties = {
            voltageRating,
            powerRating,
            resistance,
            voltage: 0,
            current: 0,
            power: 0,
            brightness: 0,
            broken: false,
            maxPower: powerRating * 1.5, // Burn out at 1.5x rated power
        };

        this.terminals = [
            this.createTerminal('t1', { x: -0.2, y: -0.3, z: 0 }),
            this.createTerminal('t2', { x: 0.2, y: -0.3, z: 0 }),
        ];
    }

    simulate(_deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        const v1 = nodeVoltages.get(this.terminals[0].id) || 0;
        const v2 = nodeVoltages.get(this.terminals[1].id) || 0;

        this.properties.voltage = v1 - v2;

        // Sync resistance with ratings if they changed
        // (In a real app, we'd use setters, but here we check in simulate)
        const targetR = (this.properties.voltageRating * this.properties.voltageRating) / this.properties.powerRating;
        if (Math.abs(this.properties.resistance - targetR) > 0.01) {
            this.properties.resistance = targetR;
            this.properties.maxPower = this.properties.powerRating * 1.5;
        }

        if (this.properties.broken) {
            this.properties.resistance = 1e9; // Open circuit
            this.properties.current = 0;
            this.properties.power = 0;
            this.properties.brightness = 0;
        } else {
            this.properties.current = this.properties.voltage / this.properties.resistance;
            this.properties.power = Math.abs(this.properties.voltage * this.properties.current);

            // Brightness based on power vs rated power
            // Non-linear perception of brightness
            const powerRatio = this.properties.power / this.properties.powerRating;
            this.properties.brightness = Math.min(Math.sqrt(powerRatio), 1.5);

            // Burn out check
            if (this.properties.power > this.properties.maxPower) {
                this.properties.broken = true;
            }
        }

        this.terminals[0].voltage = v1;
        this.terminals[1].voltage = v2;
        this.terminals[0].current = this.properties.current;
        this.terminals[1].current = -this.properties.current;
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Glass Bulb
        const bulbGeometry = new THREE.SphereGeometry(0.25, 32, 32);
        const bulbMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.1,
            transmission: 0.9,
            thickness: 0.02,
        });
        const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
        bulb.position.y = 0.1;
        bulb.name = 'bulb';
        group.add(bulb);

        // Filament
        const filamentGeometry = new THREE.TorusGeometry(0.08, 0.005, 8, 16, Math.PI);
        filamentGeometry.rotateZ(Math.PI / 2);
        const filamentMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const filament = new THREE.Mesh(filamentGeometry, filamentMaterial);
        filament.position.y = 0.1;
        filament.name = 'filament';
        group.add(filament);

        // Base (Screw cap)
        const baseGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.2, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            metalness: 0.8,
            roughness: 0.3,
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -0.2;
        group.add(base);

        // Selection outline
        const outlineGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0,
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outline.position.y = 0.1;
        outline.name = 'outline';
        group.add(outline);

        return group;
    }

    updateMesh(mesh: THREE.Group): void {
        const bulb = mesh.getObjectByName('bulb') as THREE.Mesh;
        const filament = mesh.getObjectByName('filament') as THREE.Mesh;

        if (this.properties.broken) {
            // Broken look
            if (bulb.material instanceof THREE.MeshPhysicalMaterial) {
                bulb.material.color.setHex(0x555555);
                bulb.material.emissive.setHex(0x000000);
            }
            if (filament.material instanceof THREE.MeshBasicMaterial) {
                filament.material.color.setHex(0x000000);
            }
            filament.visible = false; // Filament broken
        } else {
            // Glow based on brightness
            const brightness = this.properties.brightness || 0;

            if (bulb.material instanceof THREE.MeshPhysicalMaterial) {
                // Warm white glow
                const color = new THREE.Color(0xffaa55);
                bulb.material.emissive.copy(color);
                bulb.material.emissiveIntensity = brightness;
                bulb.material.color.setHex(0xffffff);
            }

            if (filament.material instanceof THREE.MeshBasicMaterial) {
                // Filament glows bright yellow/white
                const glowColor = new THREE.Color(0xffaa00).lerp(new THREE.Color(0xffffff), Math.min(brightness, 1));
                filament.material.color.copy(glowColor);
            }
            filament.visible = true;
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        if (this.properties.broken) {
            errors.push({
                id: `${this.id}-broken`,
                severity: ErrorSeverity.ERROR,
                message: `Lamp burned out! (Exceeded ${this.properties.maxPower?.toFixed(1)}W)`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        return errors;
    }
}
