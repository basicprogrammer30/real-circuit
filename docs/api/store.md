# Circuit Store API

The Circuit Store is the central state management system for the Real Circuit application, built using Zustand with Immer for immutable state updates.

## Store Initialization

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useCircuitStore = create<CircuitStore>()(
    immer((set) => ({
        // State and actions
    }))
);
```

## State Structure

### Core State
- `components: Component[]` - Array of all circuit components
- `wires: Wire[]` - Array of all wires connecting components
- `nodes: Node[]` - Array of electrical nodes
- `mode: Mode` - Current interaction mode (SELECT, WIRE, etc.)
- `selectedComponentIds: string[]` - IDs of currently selected components
- `hoveredComponentId: string | null` - ID of currently hovered component

### Simulation State
```typescript
{
    running: boolean;    // Whether simulation is active
    time: number;       // Current simulation time
    timeStep: number;   // Simulation time step (default: 0.001s)
    speed: number;      // Simulation speed multiplier
    errors: CircuitError[]; // Any simulation errors
}
```

### Wire Drawing State
```typescript
{
    active: boolean;            // Whether wire drawing is in progress
    fromTerminalId: string | null; // Starting terminal ID
    currentPosition: Vector3D | null; // Current mouse position
    waypoints: Vector3D[];      // Intermediate points in the wire
}
```

## Actions

### Component Management
- `addComponent(type: ComponentType, position: Vector3D): void` - Adds a new component
- `removeComponent(id: string): void` - Removes a component
- `updateComponent(id: string, updates: Partial<Component>): void` - Updates component properties
- `selectComponent(id: string, multiSelect = false): void` - Selects a component
- `deselectAll(): void` - Deselects all components

### Wire Management
- `addWire(fromTerminalId: string, toTerminalId: string): void` - Adds a wire between terminals
- `removeWire(id: string): void` - Removes a wire

### Simulation Control
- `startSimulation(): void` - Starts the simulation
- `stopSimulation(): void` - Stops the simulation
- `stepSimulation(deltaTime: number): void` - Steps the simulation forward

### Error Handling
- `addError(error: CircuitError): void` - Adds an error to the store
- `clearErrors(): void` - Clears all errors

### UI State
- `setHoveredComponent(id: string | null): void` - Sets the hovered component
- `setWireDrawingState(newState: Partial<WireDrawingState>): void` - Updates wire drawing state

## Example Usage

```typescript
import { useCircuitStore } from '../store/circuitStore';

function MyComponent() {
    const { 
        components,
        addComponent,
        removeComponent,
        startSimulation,
        stopSimulation 
    } = useCircuitStore();

    // Add a resistor at position (0, 0, 0)
    const handleAddResistor = () => {
        addComponent('resistor', { x: 0, y: 0, z: 0 });
    };

    // ... rest of the component
}
```

## TypeScript Support

The store is fully typed with TypeScript, providing excellent IDE support and type checking. All types are exported from the main package.
