# Simulation API

The Simulation API handles all circuit analysis and simulation functionality in Real Circuit.

## CircuitSolver Class

The `CircuitSolver` class is responsible for performing circuit analysis using the Modified Nodal Analysis (MNA) method.

### Constructor

```typescript
new CircuitSolver(components: Component[], wires: Wire[])
```

### Methods

#### solve(): SimulationResult
Performs circuit analysis and returns the simulation results.

### Types

#### SimulationResult
```typescript
interface SimulationResult {
    nodeVoltages: Map<string, number>;      // Node ID -> Voltage
    componentCurrents: Map<string, number>; // Component ID -> Current
    componentVoltages: Map<string, number>; // Component ID -> Voltage Drop
    wireCurrents: Map<string, number>;      // Wire ID -> Current
    wireVoltages: Map<string, number>;      // Wire ID -> Voltage (average)
}
```

## Store Integration

The circuit store provides simulation control through these actions:

### startSimulation()
Starts the simulation if it's not already running.

### stopSimulation()
Stops the running simulation.

### stepSimulation(deltaTime: number)
Advances the simulation by the specified time step.

### Simulation State
```typescript
{
    running: boolean;    // Whether simulation is active
    time: number;       // Current simulation time (seconds)
    timeStep: number;   // Simulation time step (default: 0.001s)
    speed: number;      // Simulation speed multiplier
    errors: CircuitError[]; // Any simulation errors
}
```

## Example Usage

```typescript
import { CircuitSolver } from '../simulation/CircuitSolver';

// Create a new solver with components and wires
const solver = new CircuitSolver(components, wires);

// Solve the circuit
const results = solver.solve();

// Access simulation results
const nodeVoltage = results.nodeVoltages.get('node1');
const componentCurrent = results.componentCurrents.get('resistor1');
```

## Error Handling

Simulation errors are reported through the store's error system. Check `simulation.errors` for any issues that occur during simulation.
