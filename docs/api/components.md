# Components API

This document details the component system in Real Circuit, which follows a factory pattern for creating and managing circuit components.

## ComponentFactory

The `ComponentFactory` class is responsible for creating component instances based on their type.

### Static Methods

#### `createComponent(id: string, type: ComponentType, position: Vector3D): BaseComponent | null`
Creates a new component instance.

**Parameters:**
- `id`: Unique identifier for the component
- `type`: Type of component to create (from ComponentType enum)
- `position`: 3D position in the circuit

**Returns:** New component instance or null if type is invalid

#### `getComponentName(type: ComponentType): string`
Gets the display name for a component type.

#### `getComponentCategory(type: ComponentType): string`
Gets the category for a component type.

## BaseComponent

Abstract base class that all circuit components extend.

### Properties

- `id: string` - Unique identifier
- `type: ComponentType` - Component type
- `position: Vector3D` - 3D position
- `rotation: Vector3D` - Rotation in radians
- `terminals: Terminal[]` - Connection points
- `properties: ComponentProperties` - Component-specific properties

### Methods

#### `simulate(deltaTime: number, nodeVoltages: Map<string, number>): void`
Simulate component behavior for one time step.

#### `createMesh(): THREE.Group`
Create the 3D mesh for this component.

#### `updateMesh(mesh: THREE.Group): void`
Update the 3D mesh based on current state.

## Component Types

### Resistor
- **Type:** `ComponentType.RESISTOR`
- **Default Value:** 1kΩ
- **Properties:**
  - `resistance`: Resistance in ohms (Ω)

### Capacitor
- **Type:** `ComponentType.CAPACITOR`
- **Default Value:** 100μF
- **Properties:**
  - `capacitance`: Capacitance in farads (F)

### Inductor
- **Type:** `ComponentType.INDUCTOR`
- **Default Value:** 1mH
- **Properties:**
  - `inductance`: Inductance in henries (H)

### Diode
- **Type:** `ComponentType.DIODE`
- **Default Value:** 0.7V forward voltage
- **Properties:**
  - `forwardVoltage`: Forward voltage drop (V)

### LED
- **Type:** `ComponentType.LED`
- **Default Value:** Red LED with 2.0V forward voltage
- **Properties:**
  - `forwardVoltage`: Forward voltage drop (V)
  - `color`: LED color (e.g., '#ff0000')

### Fuse
- **Type:** `ComponentType.FUSE`
- **Default Value:** 1A
- **Properties:**
  - `currentRating`: Maximum current before blowing (A)

### Switch
- **Type:** `ComponentType.SWITCH`
- **Default State:** Open
- **Properties:**
  - `closed`: Boolean indicating if switch is closed

### Potentiometer
- **Type:** `ComponentType.POTENTIOMETER`
- **Default Value:** 10kΩ
- **Properties:**
  - `resistance`: Total resistance (Ω)
  - `position`: Wiper position (0-1)

### Battery
- **Type:** `ComponentType.BATTERY`
- **Default Value:** 9V
- **Properties:**
  - `voltage`: Battery voltage (V)
  - `internalResistance`: Internal resistance (Ω)

### Ground
- **Type:** `ComponentType.GROUND`
- **Properties:** None

## Example Usage

```typescript
import { ComponentFactory, ComponentType } from '../components/circuits/ComponentFactory';
import type { Vector3D } from '../types';

// Create a new resistor
const position: Vector3D = { x: 0, y: 0, z: 0 };
const resistor = ComponentFactory.createComponent(
    'resistor1', 
    ComponentType.RESISTOR, 
    position
);

// Update component properties
if (resistor) {
    resistor.properties.resistance = 2200; // 2.2kΩ
}
```

## Creating Custom Components

To create a custom component:

1. Create a new class that extends `BaseComponent`
2. Implement all abstract methods
3. Register it in the `ComponentFactory.createComponent` method

```typescript
class MyCustomComponent extends BaseComponent {
    constructor(id: string, position: Vector3D) {
        super(id, ComponentType.CUSTOM, position);
        // Initialize properties
    }

    simulate(deltaTime: number, nodeVoltages: Map<string, number>): void {
        // Implement simulation logic
    }

    createMesh(): THREE.Group {
        // Create and return 3D mesh
    }

    updateMesh(mesh: THREE.Group): void {
        // Update mesh based on current state
    }
}
```
