import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type {
    CircuitStore,
    Component,
    ComponentType,
    Vector3D,
    Wire,
    CircuitError,
} from '../types';
import { Mode, ErrorSeverity } from '../types';
import { ComponentFactory } from '../components/circuits/ComponentFactory';
import { CircuitSolver } from '../simulation/CircuitSolver';

export const useCircuitStore = create<CircuitStore>()(
    immer((set) => ({
        // Initial state
        components: [],
        wires: [],
        nodes: [],
        mode: Mode.SELECT,
        selectedComponentIds: [],
        hoveredComponentId: null,
        simulation: {
            running: false,
            time: 0,
            timeStep: 0.001, // 1ms
            speed: 1,
            errors: [],
        },
        wireDrawing: {
            active: false,
            fromTerminalId: null,
            currentPosition: null,
            waypoints: [],
        },

        // Actions
        addComponent: (type: ComponentType, position: Vector3D) => {
            set((state) => {
                // Create a temporary instance to get terminal configuration
                const tempInstance = ComponentFactory.createComponent(
                    uuidv4(), // Temporary ID
                    type,
                    position
                );

                if (!tempInstance) {
                    console.error(`Failed to create component of type ${type}`);
                    return;
                }

                const newComponent: Component = {
                    id: uuidv4(),
                    type,
                    position,
                    rotation: { x: 0, y: 0, z: 0 },
                    terminals: tempInstance.terminals.map(t => ({
                        ...t,
                        id: `${uuidv4()}-${t.name}`, // Generate new ID for store
                        componentId: uuidv4(), // Will be updated below
                        offset: {
                            x: t.position.x - position.x,
                            y: t.position.y - position.y,
                            z: t.position.z - position.z
                        }
                    })),
                    properties: tempInstance.properties,
                    selected: true,
                    error: false,
                };

                // Update componentId in all terminals
                newComponent.terminals.forEach(t => {
                    t.componentId = newComponent.id;
                    t.id = `${newComponent.id}-${t.name}`;
                });

                state.components.push(newComponent);

                // Auto-select the new component
                state.selectedComponentIds = [newComponent.id];

                // Update selected flag on all components
                state.components.forEach((c) => {
                    c.selected = c.id === newComponent.id;
                });
            });
        },

        removeComponent: (id: string) => {
            set((state) => {
                // Remove component
                state.components = state.components.filter((c) => c.id !== id);

                // Remove wires connected to this component
                state.wires = state.wires.filter((w) => {
                    const fromTerminal = state.components
                        .flatMap((c) => c.terminals)
                        .find((t) => t.id === w.fromTerminal);
                    const toTerminal = state.components
                        .flatMap((c) => c.terminals)
                        .find((t) => t.id === w.toTerminal);
                    return fromTerminal?.componentId !== id && toTerminal?.componentId !== id;
                });

                // Remove from selection
                state.selectedComponentIds = state.selectedComponentIds.filter((cid) => cid !== id);
            });
        },

        updateComponent: (id: string, updates: Partial<Component>) => {
            set((state) => {
                const component = state.components.find((c) => c.id === id);
                if (component) {
                    Object.assign(component, updates);
                }
            });
        },

        selectComponent: (id: string, multiSelect = false) => {
            set((state) => {
                if (multiSelect) {
                    if (state.selectedComponentIds.includes(id)) {
                        state.selectedComponentIds = state.selectedComponentIds.filter((cid) => cid !== id);
                    } else {
                        state.selectedComponentIds.push(id);
                    }
                } else {
                    state.selectedComponentIds = [id];
                }

                // Update selected flag on components
                state.components.forEach((c) => {
                    c.selected = state.selectedComponentIds.includes(c.id);
                });
            });
        },

        deselectAll: () => {
            set((state) => {
                state.selectedComponentIds = [];
                state.components.forEach((c) => {
                    c.selected = false;
                });
            });
        },

        setMode: (mode: Mode) => {
            set((state) => {
                state.mode = mode;
                // Reset wire drawing when changing modes
                if (mode !== Mode.WIRE) {
                    state.wireDrawing = {
                        active: false,
                        fromTerminalId: null,
                        currentPosition: null,
                        waypoints: [],
                    };
                }
            });
        },

        addWire: (fromTerminalId: string, toTerminalId: string) => {
            set((state) => {
                const allTerminals = state.components.flatMap((c) => c.terminals);
                const fromTerminal = allTerminals.find((t) => t.id === fromTerminalId);
                const toTerminal = allTerminals.find((t) => t.id === toTerminalId);

                if (!fromTerminal || !toTerminal) return;

                const newWire: Wire = {
                    id: uuidv4(),
                    fromTerminal: fromTerminalId,
                    toTerminal: toTerminalId,
                    points: [fromTerminal.position, ...state.wireDrawing.waypoints, toTerminal.position],
                    current: 0,
                    voltage: 0,
                };

                state.wires.push(newWire);

                // Reset wire drawing state
                state.wireDrawing = {
                    active: false,
                    fromTerminalId: null,
                    currentPosition: null,
                    waypoints: [],
                };
            });
        },

        removeWire: (id: string) => {
            set((state) => {
                state.wires = state.wires.filter((w) => w.id !== id);
            });
        },

        startSimulation: () => {
            set((state) => {
                state.simulation.running = true;
                state.simulation.time = 0;
                state.simulation.errors = [];
            });
        },

        stopSimulation: () => {
            set((state) => {
                state.simulation.running = false;
            });
        },

        stepSimulation: (deltaTime: number) => {
            set((state) => {
                if (state.simulation.running) {
                    state.simulation.time += deltaTime * state.simulation.speed;

                    // Solve circuit
                    try {
                        // We need to cast state.components and state.wires to their types 
                        // because Immer wraps them in proxies
                        const solver = new CircuitSolver(
                            state.components as unknown as Component[],
                            state.wires as unknown as Wire[]
                        );
                        const result = solver.solve();

                        // Update component states
                        state.components.forEach(comp => {
                            const voltage = result.componentVoltages.get(comp.id);
                            const current = result.componentCurrents.get(comp.id);

                            if (voltage !== undefined) comp.properties.voltage = voltage;
                            if (current !== undefined) comp.properties.current = current;
                            if (voltage !== undefined && current !== undefined) {
                                comp.properties.power = Math.abs(voltage * current);
                            }

                            // Update terminal voltages
                            comp.terminals.forEach(t => {
                                // Find which node this terminal belongs to
                                // We need to reconstruct the node mapping or pass it back from solver
                                // For now, let's just use the nodeVoltages map if we can map terminal -> node
                                // The solver has this mapping private.
                                // Let's just rely on component properties for now.
                            });
                        });

                        // Update wire states
                        state.wires.forEach(wire => {
                            const current = result.wireCurrents.get(wire.id);
                            const voltage = result.wireVoltages.get(wire.id);

                            if (current !== undefined) wire.current = current;
                            if (voltage !== undefined) wire.voltage = voltage;
                        });

                        // Check for component errors
                        let hasStoppingError = false;
                        state.components.forEach(comp => {
                            // Cast to any to access methods that exist on component instances
                            // but not on the Component interface
                            const compInstance = comp as any;

                            // Call simulate() on each component for additional physics
                            // (some components need to update their state based on the new voltage/current)
                            if (compInstance.simulate) {
                                compInstance.simulate(deltaTime * state.simulation.speed, result.nodeVoltages);
                            }

                            // Check for errors
                            if (compInstance.checkErrors) {
                                const errors: CircuitError[] = compInstance.checkErrors();
                                errors.forEach((error: CircuitError) => {
                                    // Check if error already exists (by message or id)
                                    const exists = state.simulation.errors.some(e =>
                                        e.message === error.message || e.id === error.id
                                    );

                                    if (!exists) {
                                        state.simulation.errors.push(error);
                                        console.warn(`[${error.severity}] ${error.message}`, error);
                                    }

                                    if (error.stopSimulation) {
                                        hasStoppingError = true;
                                    }
                                });
                            }
                        });

                        // Stop simulation if critical error detected
                        if (hasStoppingError) {
                            state.simulation.running = false;
                            console.error("Simulation stopped due to critical errors");
                        }

                        // Clear errors if none detected and no stopping errors
                        if (!hasStoppingError && state.simulation.errors.length > 0) {
                            // Keep errors in the list but allow simulation to continue
                            // Only clear errors that have resolved
                            state.simulation.errors = state.simulation.errors.filter(e => e.stopSimulation);
                        }

                    } catch (error: any) {
                        console.error("Simulation error:", error);
                        // Only add error if not already present to avoid spam
                        if (state.simulation.errors.length === 0) {
                            state.simulation.errors.push({
                                id: uuidv4(),
                                message: "Simulation failed: " + error.message,
                                severity: ErrorSeverity.ERROR,
                                timestamp: Date.now(),
                                componentIds: [],
                                stopSimulation: true
                            });
                            state.simulation.running = false;
                        }
                    }
                }
            });
        },

        addError: (error: CircuitError) => {
            set((state) => {
                state.simulation.errors.push(error);

                // Mark components with errors
                error.componentIds.forEach((componentId) => {
                    const component = state.components.find((c) => c.id === componentId);
                    if (component) {
                        component.error = true;
                        component.errorMessage = error.message;
                    }
                });

                // Stop simulation if critical error
                if (error.stopSimulation) {
                    state.simulation.running = false;
                }
            });
        },

        clearErrors: () => {
            set((state) => {
                state.simulation.errors = [];
                state.components.forEach((c) => {
                    c.error = false;
                    c.errorMessage = undefined;
                });
            });
        },

        setHoveredComponent: (id: string | null) => {
            set((state) => {
                state.hoveredComponentId = id;
            });
        },

        setWireDrawingState: (newState: Partial<CircuitStore['wireDrawing']>) => {
            set((state) => {
                Object.assign(state.wireDrawing, newState);
            });
        },
    }))
);
