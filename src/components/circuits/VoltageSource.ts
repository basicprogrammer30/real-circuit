import * as THREE from 'three';
import { BaseComponent } from './BaseComponent';
import type { Vector3D, CircuitError } from '../../types';
import { ComponentType, ErrorSeverity, WaveformType } from '../../types';

/**
 * Voltage Source Component
 * Lab power supply with multiple waveform types
 */
export class VoltageSource extends BaseComponent {
    constructor(id: string, position: Vector3D) {
        super(id, ComponentType.VOLTAGE_SOURCE, position);

        this.properties = {
            voltage: 5,
            current: 0,
            maxCurrent: 1,
            waveform: {
                type: WaveformType.DC,
                frequency: 60,
                dutyCycle: 0.5,
                phase: 0,
                offset: 0,
            },
            power: 0,
        };

        this.terminals = [
            this.createTerminal('positive', { x: 0.4, y: 0.3, z: 0 }),
            this.createTerminal('negative', { x: -0.4, y: 0.3, z: 0 }),
        ];
    }

    simulate(_deltaTime: number, nodeVoltages: Map<string, number>): void {
        if (this.terminals.length < 2) return;

        // ... existing waveform logic ...
        const time = performance.now() / 1000;
        const waveform = this.properties.waveform;
        const voltage = this.properties.voltage || 0;
        let outputVoltage = 0;

        if (waveform) {
            switch (waveform.type) {
                case WaveformType.DC:
                    outputVoltage = voltage;
                    break;
                case WaveformType.SINE:
                    outputVoltage =
                        voltage * Math.sin(2 * Math.PI * waveform.frequency * time + waveform.phase) +
                        waveform.offset;
                    break;
                case WaveformType.SQUARE:
                    const squarePhase = (waveform.frequency * time + waveform.phase / (2 * Math.PI)) % 1;
                    outputVoltage = squarePhase < waveform.dutyCycle ? voltage : -voltage;
                    outputVoltage += waveform.offset;
                    break;
                case WaveformType.PULSE:
                    const pulsePhase = (waveform.frequency * time + waveform.phase / (2 * Math.PI)) % 1;
                    outputVoltage = pulsePhase < waveform.dutyCycle ? voltage : 0;
                    outputVoltage += waveform.offset;
                    break;
                case WaveformType.TRIANGLE:
                    const triPhase = (waveform.frequency * time + waveform.phase / (2 * Math.PI)) % 1;
                    outputVoltage =
                        triPhase < 0.5
                            ? voltage * (4 * triPhase - 1)
                            : voltage * (3 - 4 * triPhase);
                    outputVoltage += waveform.offset;
                    break;
            }
        }

        this.properties.voltage = outputVoltage;
        this.terminals[0].voltage = outputVoltage;
        this.terminals[1].voltage = 0;

        const vPos = nodeVoltages.get(this.terminals[0].id) || 0;
        const vNeg = nodeVoltages.get(this.terminals[1].id) || 0;
        this.properties.current = Math.abs(vPos - vNeg) * 0.1; // Placeholder current calculation? 
        // Note: Real current comes from solver, this might be overwritten or used for estimation
        // But we should sync maxPower here
        this.properties.maxPower = Math.abs(this.properties.voltage) * (this.properties.maxCurrent || 1);

        this.properties.power = Math.abs(this.properties.voltage * this.properties.current);
    }

    createMesh(): THREE.Group {
        const group = new THREE.Group();

        const bodyGeometry = new THREE.BoxGeometry(1, 0.6, 0.4);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            metalness: 0.4,
            roughness: 0.6,
        });
        group.add(new THREE.Mesh(bodyGeometry, bodyMaterial));

        const panelGeometry = new THREE.BoxGeometry(0.95, 0.55, 0.02);
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x34495e,
            metalness: 0.3,
            roughness: 0.7,
        });
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.z = 0.21;
        group.add(panel);

        const screenGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.01);
        const screenMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5,
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(0, 0.1, 0.22);
        screen.name = 'screen';
        group.add(screen);

        const knobGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
        knobGeometry.rotateX(Math.PI / 2);
        const knobMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6b6b,
            metalness: 0.5,
            roughness: 0.5,
        });
        const knob = new THREE.Mesh(knobGeometry, knobMaterial);
        knob.position.set(-0.25, -0.15, 0.23);
        group.add(knob);

        const currentKnob = new THREE.Mesh(knobGeometry, knobMaterial);
        currentKnob.position.set(0.25, -0.15, 0.23);
        group.add(currentKnob);

        const terminalGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16);
        const posTerminalMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.7,
            roughness: 0.3,
        });
        const posTerminal = new THREE.Mesh(terminalGeometry, posTerminalMaterial);
        posTerminal.position.set(0.4, 0.3, 0);
        group.add(posTerminal);

        const negTerminalMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            metalness: 0.7,
            roughness: 0.3,
        });
        const negTerminal = new THREE.Mesh(terminalGeometry, negTerminalMaterial);
        negTerminal.position.set(-0.4, 0.3, 0);
        group.add(negTerminal);

        const outlineGeometry = bodyGeometry.clone();
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
        const screen = mesh.getObjectByName('screen') as THREE.Mesh;
        if (screen && screen.material instanceof THREE.MeshStandardMaterial) {
            const intensity = Math.abs(this.properties.voltage || 0) > 0.1 ? 0.8 : 0.2;
            screen.material.emissiveIntensity = intensity;
        }
    }

    checkErrors(): CircuitError[] {
        const errors: CircuitError[] = [];

        if ((this.properties.current || 0) > (this.properties.maxCurrent || 1)) {
            errors.push({
                id: `${this.id}-overloaded`,
                severity: ErrorSeverity.ERROR,
                message: `Voltage source overloaded: ${this.properties.current?.toFixed(2)}A exceeds limit ${this.properties.maxCurrent?.toFixed(2)}A`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        // Check for overpower (synced with maxCurrent)
        if ((this.properties.power || 0) > (this.properties.maxPower || 5)) {
            errors.push({
                id: `${this.id}-overpower`,
                severity: ErrorSeverity.ERROR,
                message: `Voltage source overpower: ${this.properties.power?.toFixed(2)}W exceeds limit ${this.properties.maxPower?.toFixed(2)}W`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        if ((this.properties.current || 0) > 10) {
            errors.push({
                id: `${this.id}-short`,
                severity: ErrorSeverity.CRITICAL,
                message: `Short circuit detected on voltage source!`,
                componentIds: [this.id],
                timestamp: Date.now(),
                stopSimulation: true,
            });
        }

        return errors;
    }
}
