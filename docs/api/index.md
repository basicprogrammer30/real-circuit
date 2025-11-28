# Circuit Simulator API Documentation

Welcome to the Circuit Simulator API documentation. This documentation provides a comprehensive reference for the Circuit Simulator's core APIs and functionality.

## API Reference

- [Circuit Store API](./store.md) - State management and circuit manipulation
- [Simulation API](./simulation.md) - Circuit analysis and simulation engine
- [Components API](./components.md) - Available circuit components and their properties

## Getting Started

To use the Circuit Simulator in your project, you can import the necessary modules:

```typescript
import { useCircuitStore } from '../store/circuitStore';
import { CircuitSolver } from '../simulation/CircuitSolver';
```

## Core Concepts

The Circuit Simulator is built around these key concepts:

- **Components**: Basic building blocks of circuits (resistors, capacitors, etc.)
- **Wires**: Connections between component terminals
- **Nodes**: Electrically connected points in the circuit
- **Simulation**: Analysis of circuit behavior over time

## TypeScript Support

The project is written in TypeScript and provides full type definitions for all public APIs.
