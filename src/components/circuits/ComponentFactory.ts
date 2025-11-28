import type { Vector3D } from '../../types';
import { ComponentType } from '../../types';
import type { BaseComponent } from './BaseComponent';
import { Resistor } from './Resistor';
import { LED } from './LED';
import { VoltageSource } from './VoltageSource';
import { Capacitor } from './Capacitor';
import { Diode } from './Diode';
import { Inductor } from './Inductor';
import { Ground } from './Ground';
import { Switch } from './Switch';
import { Potentiometer } from './Potentiometer';
import { Battery } from './Battery';
import { Fuse } from './Fuse';
import { Lamp } from './Lamp';

/**
 * Component Factory
 * Creates component instances based on type
 * Following Falstad's pattern - each component type is in its own file
 */
export class ComponentFactory {
    /**
     * Create a component instance
     */
    static createComponent(
        id: string,
        type: ComponentType,
        position: Vector3D
    ): BaseComponent | null {
        switch (type) {
            // Passive Components
            case ComponentType.RESISTOR:
                return new Resistor(id, position, 1000); // Default 1k ohm

            case ComponentType.CAPACITOR:
                return new Capacitor(id, position, 100e-6); // Default 100μF

            case ComponentType.INDUCTOR:
                return new Inductor(id, position, 0.001); // Default 1mH

            case ComponentType.DIODE:
                return new Diode(id, position, 0.7); // Default 0.7V forward voltage

            case ComponentType.LED:
                return new LED(id, position, '#ff0000', 2.0); // Default red LED

            case ComponentType.FUSE:
                return new Fuse(id, position, 1); // Default 1A fuse

            // Power Sources
            case ComponentType.VOLTAGE_SOURCE:
                return new VoltageSource(id, position);

            case ComponentType.BATTERY:
                return new Battery(id, position, 9, 500); // Default 9V 500mAh

            case ComponentType.GROUND:
                return new Ground(id, position);

            // Control & Protection
            case ComponentType.SWITCH:
                return new Switch(id, position, false); // Default open

            case ComponentType.POTENTIOMETER:
                return new Potentiometer(id, position, 10000, 50); // Default 10kΩ at 50%

            case ComponentType.LAMP:
                return new Lamp(id, position, 12, 60); // Default 12V 60W

            // TODO: Add more component types as they are implemented
            // case ComponentType.MOSFET:
            //   return new MOSFET(id, position);
            // etc.

            default:
                console.warn(`Component type ${type} not yet implemented`);
                return null;
        }
    }

    /**
     * Get component display name
     */
    static getComponentName(type: ComponentType): string {
        const names: Record<ComponentType, string> = {
            [ComponentType.RESISTOR]: 'Resistor',
            [ComponentType.CAPACITOR]: 'Capacitor',
            [ComponentType.INDUCTOR]: 'Inductor',
            [ComponentType.DIODE]: 'Diode',
            [ComponentType.ZENER_DIODE]: 'Zener Diode',
            [ComponentType.LED]: 'LED',
            [ComponentType.FUSE]: 'Fuse',
            [ComponentType.VOLTAGE_SOURCE]: 'Voltage Source',
            [ComponentType.CURRENT_SOURCE]: 'Current Source',
            [ComponentType.BATTERY]: 'Battery',
            [ComponentType.GROUND]: 'Ground',
            [ComponentType.SWITCH]: 'Switch',
            [ComponentType.POTENTIOMETER]: 'Potentiometer',
            [ComponentType.LAMP]: 'Lamp',
            [ComponentType.MOSFET]: 'MOSFET',
            [ComponentType.BJT]: 'BJT',
            [ComponentType.JFET]: 'JFET',
            [ComponentType.THYRISTOR]: 'Thyristor',
            [ComponentType.TRANSISTOR]: 'Transistor',
            [ComponentType.OPTOCOUPLER]: 'Optocoupler',
            [ComponentType.LOGIC_GATE_AND]: 'AND Gate',
            [ComponentType.LOGIC_GATE_OR]: 'OR Gate',
            [ComponentType.LOGIC_GATE_NOT]: 'NOT Gate',
            [ComponentType.LOGIC_GATE_NAND]: 'NAND Gate',
            [ComponentType.LOGIC_GATE_XOR]: 'XOR Gate',
            [ComponentType.OP_AMP]: 'Op-Amp',
            [ComponentType.VARISTOR]: 'Varistor',
            [ComponentType.MCB]: 'MCB',
            [ComponentType.RELAY]: 'Relay',
            [ComponentType.DC_MOTOR]: 'DC Motor',
        };

        return names[type] || type;
    }

    /**
     * Get available component types (only implemented ones)
     */
    static getAvailableComponents(): ComponentType[] {
        return [
            ComponentType.RESISTOR,
            ComponentType.CAPACITOR,
            ComponentType.INDUCTOR,
            ComponentType.DIODE,
            ComponentType.LED,
            ComponentType.LAMP,
            ComponentType.FUSE,
            ComponentType.VOLTAGE_SOURCE,
            ComponentType.BATTERY,
            ComponentType.GROUND,
            ComponentType.SWITCH,
            ComponentType.POTENTIOMETER,
            // Add more as they are implemented
        ];
    }

    /**
     * Get component category
     */
    static getComponentCategory(type: ComponentType): string {
        if ([
            ComponentType.RESISTOR,
            ComponentType.CAPACITOR,
            ComponentType.INDUCTOR,
            ComponentType.DIODE,
            ComponentType.ZENER_DIODE,
            ComponentType.LED,
            ComponentType.FUSE,
        ].includes(type)) {
            return 'Passive Components';
        }

        if ([
            ComponentType.VOLTAGE_SOURCE,
            ComponentType.CURRENT_SOURCE,
        ].includes(type)) {
            return 'Power Sources';
        }

        if ([
            ComponentType.MOSFET,
            ComponentType.BJT,
            ComponentType.JFET,
            ComponentType.THYRISTOR,
            ComponentType.TRANSISTOR,
            ComponentType.OPTOCOUPLER,
        ].includes(type)) {
            return 'Active Components';
        }

        if ([
            ComponentType.LOGIC_GATE_AND,
            ComponentType.LOGIC_GATE_OR,
            ComponentType.LOGIC_GATE_NOT,
            ComponentType.LOGIC_GATE_NAND,
            ComponentType.LOGIC_GATE_XOR,
            ComponentType.OP_AMP,
        ].includes(type)) {
            return 'Integrated Circuits';
        }

        if ([
            ComponentType.VARISTOR,
            ComponentType.MCB,
            ComponentType.RELAY,
        ].includes(type)) {
            return 'Protection & Control';
        }

        if ([ComponentType.DC_MOTOR].includes(type)) {
            return 'Motors & Loads';
        }

        return 'Other';
    }
}
