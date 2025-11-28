import { Component, Wire, ComponentType } from '../types';

export interface SimulationResult {
    nodeVoltages: Map<string, number>; // Node ID -> Voltage
    componentCurrents: Map<string, number>; // Component ID -> Current
    componentVoltages: Map<string, number>; // Component ID -> Voltage Drop
    wireCurrents: Map<string, number>; // Wire ID -> Current
    wireVoltages: Map<string, number>; // Wire ID -> Voltage (average)
}

export class CircuitSolver {
    private components: Component[];
    private wires: Wire[];
    private nodes: Map<string, string[]>; // Node ID -> List of Terminal IDs
    private terminalToNode: Map<string, string>; // Terminal ID -> Node ID
    private nodeIndex: Map<string, number>; // Node ID -> Matrix Index

    constructor(components: Component[], wires: Wire[]) {
        this.components = components;
        this.wires = wires;
        this.nodes = new Map();
        this.terminalToNode = new Map();
        this.nodeIndex = new Map();
    }

    public solve(): SimulationResult {
        this.identifyNodes();
        return this.solveMNA();
    }

    private identifyNodes() {
        // Union-Find or BFS to group connected terminals into nodes
        const parent = new Map<string, string>();

        const find = (i: string): string => {
            if (parent.get(i) === i) return i;
            const root = find(parent.get(i)!);
            parent.set(i, root);
            return root;
        };

        const union = (i: string, j: string) => {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                parent.set(rootI, rootJ);
            }
        };

        // Initialize all terminals as their own sets
        this.components.forEach(c => {
            c.terminals.forEach(t => {
                parent.set(t.id, t.id);
            });
        });

        // Union connected terminals via wires
        this.wires.forEach(w => {
            if (parent.has(w.fromTerminal) && parent.has(w.toTerminal)) {
                union(w.fromTerminal, w.toTerminal);
            }
        });

        // Build nodes map
        this.nodes.clear();
        this.terminalToNode.clear();

        parent.forEach((_, terminalId) => {
            const root = find(terminalId);
            if (!this.nodes.has(root)) {
                this.nodes.set(root, []);
            }
            this.nodes.get(root)!.push(terminalId);
            this.terminalToNode.set(terminalId, root);
        });

        // Assign indices to nodes (excluding ground if we identify one, but for now let's just index all)
        // We need to pick a ground reference. Usually the negative terminal of the first voltage source, 
        // or we can add a specific GND component. For now, let's assume index 0 is ground if we find a ground component,
        // otherwise we might have floating voltages.
        // Let's look for a "GND" component or just arbitrarily pick one if needed.
        // Actually, standard MNA handles ground by removing the row/col for ground node.

        let index = 0;
        this.nodeIndex.clear();

        // Check if there's a ground component? (Not in our types yet, maybe just pick a reference)
        // For simplicity, let's assume the node connected to the negative terminal of the first voltage source is ground.
        let groundNodeId: string | null = null;
        const vSource = this.components.find(c => c.type === ComponentType.VOLTAGE_SOURCE);
        if (vSource) {
            // Assume second terminal is negative/ground for now
            const negTerminal = vSource.terminals[1];
            if (negTerminal) {
                groundNodeId = find(negTerminal.id);
            }
        }

        // If no voltage source, maybe just pick the first node as ground? 
        // Or if there is no ground, the matrix is singular.
        // Let's try to find a ground node.

        const nodeIds = Array.from(this.nodes.keys());

        if (groundNodeId) {
            // Put ground at a special place or just don't assign it an index (it's 0V)
            this.nodeIndex.set(groundNodeId, -1); // -1 means Ground
        } else if (nodeIds.length > 0) {
            // Fallback: Pick first node as ground
            this.nodeIndex.set(nodeIds[0], -1);
        }

        nodeIds.forEach(id => {
            if (this.nodeIndex.get(id) !== -1) {
                this.nodeIndex.set(id, index++);
            }
        });
    }

    private solveMNA(): SimulationResult {
        const numNodes = this.nodeIndex.size - (Array.from(this.nodeIndex.values()).includes(-1) ? 1 : 0);

        // Count voltage sources for extra rows/cols (includes Battery and Ground)
        const voltageSources = this.components.filter(c =>
            c.type === ComponentType.VOLTAGE_SOURCE ||
            c.type === ComponentType.BATTERY ||
            c.type === ComponentType.GROUND
        );
        const numVSources = voltageSources.length;

        const size = numNodes + numVSources;
        const G = Array(size).fill(0).map(() => Array(size).fill(0));
        const I = Array(size).fill(0);

        // Helper to add conductance
        const addG = (n1: string, n2: string, conductance: number) => {
            const i = this.nodeIndex.get(this.terminalToNode.get(n1)!);
            const j = this.nodeIndex.get(this.terminalToNode.get(n2)!);

            if (i !== undefined && i !== -1) {
                G[i][i] += conductance;
                if (j !== undefined && j !== -1) {
                    G[i][j] -= conductance;
                }
            }
            if (j !== undefined && j !== -1) {
                G[j][j] += conductance;
                if (i !== undefined && i !== -1) {
                    G[j][i] -= conductance;
                }
            }
        };

        // Stamp components
        this.components.forEach(comp => {
            if (comp.type === ComponentType.RESISTOR) {
                const r = comp.properties.value || 1000;
                const g = 1 / r;
                addG(comp.terminals[0].id, comp.terminals[1].id, g);
            } else if (comp.type === ComponentType.LED) {
                // Simplified LED model: Resistor + Voltage Drop?
                // For linear MNA, we can model it as a resistor for now, or a voltage source + resistor
                // Let's model as a small resistor for now to avoid complexity
                // TODO: Non-linear iteration
                const r = 50; // 50 ohms dynamic resistance
                addG(comp.terminals[0].id, comp.terminals[1].id, 1 / r);
            } else if (comp.type === ComponentType.DIODE) {
                // Simplified diode model - forward bias: small resistance, reverse bias: large resistance
                // Check voltage across diode to determine state (simplified - won't be perfect in first iteration)
                // For now, model as a moderate resistor
                const r = 100; // Ohms - could be refined with iterative solving
                addG(comp.terminals[0].id, comp.terminals[1].id, 1 / r);
            } else if (comp.type === ComponentType.CAPACITOR) {
                // For DC analysis, capacitor acts as open circuit (infinite resistance)
                // For AC/transient, would need complex impedance
                // For now, model as very high resistance to avoid singularity
                const r = 1e9; // Very high resistance (essentially open)
                addG(comp.terminals[0].id, comp.terminals[1].id, 1 / r);
            } else if (comp.type === ComponentType.INDUCTOR) {
                // For DC steady-state, inductor acts as short circuit (zero resistance)
                // For AC/transient, would need complex impedance
                // For now, model as very small resistance
                const r = 0.01; // Very small resistance (essentially short)
                addG(comp.terminals[0].id, comp.terminals[1].id, 1 / r);
            } else if (comp.type === ComponentType.POTENTIOMETER) {
                const r = Math.max(comp.properties.value || 1000, 0.01);
                addG(comp.terminals[0].id, comp.terminals[1].id, 1 / r);
            } else if (comp.type === ComponentType.SWITCH) {
                const r = comp.properties.closed ? 0.01 : 1e9;
                addG(comp.terminals[0].id, comp.terminals[1].id, 1 / r);
            } else if (comp.type === ComponentType.FUSE) {
                const r = comp.properties.blown ? 1e9 : 0.01;
                addG(comp.terminals[0].id, comp.terminals[1].id, 1 / r);
            } else if (comp.type === ComponentType.LAMP) {
                const r = Math.max(comp.properties.resistance || 100, 0.01);
                addG(comp.terminals[0].id, comp.terminals[1].id, 1 / r);
            }
        });

        // Stamp Voltage Sources
        voltageSources.forEach((vs, idx) => {
            const vIndex = numNodes + idx;
            const voltage = vs.properties.voltage || 5;

            const posNode = this.terminalToNode.get(vs.terminals[0].id)!;
            const negNode = this.terminalToNode.get(vs.terminals[1].id)!;

            const posIdx = this.nodeIndex.get(posNode);
            const negIdx = this.nodeIndex.get(negNode);

            // B matrix (connections)
            if (posIdx !== undefined && posIdx !== -1) {
                G[posIdx][vIndex] = 1;
                G[vIndex][posIdx] = 1;
            }
            if (negIdx !== undefined && negIdx !== -1) {
                G[negIdx][vIndex] = -1;
                G[vIndex][negIdx] = -1;
            }

            // C matrix (known voltages)
            I[vIndex] = voltage;
        });

        // Solve G * x = I
        const x = this.gaussianElimination(G, I);

        // Extract results
        const nodeVoltages = new Map<string, number>();
        const componentCurrents = new Map<string, number>();
        const componentVoltages = new Map<string, number>();
        const wireCurrents = new Map<string, number>();
        const wireVoltages = new Map<string, number>();

        // Set ground node voltage
        this.nodeIndex.forEach((idx, nodeId) => {
            if (idx === -1) {
                nodeVoltages.set(nodeId, 0);
            } else {
                nodeVoltages.set(nodeId, x[idx]);
            }
        });

        // Calculate component values
        this.components.forEach(comp => {
            const n1 = this.terminalToNode.get(comp.terminals[0].id)!;
            const n2 = this.terminalToNode.get(comp.terminals[1].id)!;
            const v1 = nodeVoltages.get(n1) || 0;
            const v2 = nodeVoltages.get(n2) || 0;
            const vDrop = v1 - v2;

            componentVoltages.set(comp.id, vDrop);

            if (comp.type === ComponentType.RESISTOR) {
                const r = comp.properties.value || 1000;
                componentCurrents.set(comp.id, vDrop / r);
            } else if (comp.type === ComponentType.DIODE) {
                const r = 100;
                componentCurrents.set(comp.id, vDrop / r);
            } else if (comp.type === ComponentType.CAPACITOR) {
                const r = 1e9;
                componentCurrents.set(comp.id, vDrop / r);
            } else if (comp.type === ComponentType.INDUCTOR) {
                const r = 0.01;
                componentCurrents.set(comp.id, vDrop / r);
            } else if (comp.type === ComponentType.LED) {
                const r = 50;
                componentCurrents.set(comp.id, vDrop / r);
            } else if (comp.type === ComponentType.POTENTIOMETER) {
                const r = Math.max(comp.properties.value || 1000, 0.01);
                componentCurrents.set(comp.id, vDrop / r);
            } else if (comp.type === ComponentType.SWITCH) {
                const r = comp.properties.closed ? 0.01 : 1e9;
                componentCurrents.set(comp.id, vDrop / r);
            } else if (comp.type === ComponentType.FUSE) {
                const r = comp.properties.blown ? 1e9 : 0.01;
                componentCurrents.set(comp.id, vDrop / r);
            } else if (comp.type === ComponentType.LAMP) {
                const r = Math.max(comp.properties.resistance || 100, 0.01);
                componentCurrents.set(comp.id, vDrop / r);
            } else if (comp.type === ComponentType.VOLTAGE_SOURCE ||
                comp.type === ComponentType.BATTERY ||
                comp.type === ComponentType.GROUND) {
                // Current through voltage source is found in the solution vector
                const vsIdx = voltageSources.findIndex(v => v.id === comp.id);
                if (vsIdx !== -1) {
                    // Current flows out of positive terminal? MNA convention varies.
                    // Usually the variable is current through the source.
                    componentCurrents.set(comp.id, x[numNodes + vsIdx]);
                }
            }
        });

        // Calculate wire currents and voltages
        this.wires.forEach(wire => {
            // Get the terminals connected by this wire
            const fromTerminal = wire.fromTerminal;
            const toTerminal = wire.toTerminal;

            // Get the nodes these terminals belong to
            const fromNode = this.terminalToNode.get(fromTerminal);
            const toNode = this.terminalToNode.get(toTerminal);

            if (fromNode && toNode) {
                const vFrom = nodeVoltages.get(fromNode) || 0;
                const vTo = nodeVoltages.get(toNode) || 0;

                // Wire voltage is the average of the two node voltages
                wireVoltages.set(wire.id, (vFrom + vTo) / 2);

                // Wire current: since wires have no resistance in this model,
                // current is determined by the components at the terminals
                // For simplicity, we'll use the current from the component connected to fromTerminal
                // This is an approximation - in reality we'd need to sum all currents into the node

                // Find components connected to these terminals
                let wireCurrent = 0;
                this.components.forEach(comp => {
                    comp.terminals.forEach(terminal => {
                        if (terminal.id === fromTerminal) {
                            wireCurrent = componentCurrents.get(comp.id) || 0;
                        }
                    });
                });

                wireCurrents.set(wire.id, Math.abs(wireCurrent));
            }
        });

        return { nodeVoltages, componentCurrents, componentVoltages, wireCurrents, wireVoltages };
    }

    private gaussianElimination(A: number[][], b: number[]): number[] {
        const n = A.length;
        const x = new Array(n).fill(0);

        // Forward elimination
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxEl = Math.abs(A[i][i]);
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > maxEl) {
                    maxEl = Math.abs(A[k][i]);
                    maxRow = k;
                }
            }

            // Swap rows
            for (let k = i; k < n; k++) {
                const tmp = A[maxRow][k];
                A[maxRow][k] = A[i][k];
                A[i][k] = tmp;
            }
            const tmp = b[maxRow];
            b[maxRow] = b[i];
            b[i] = tmp;

            // Make triangular
            for (let k = i + 1; k < n; k++) {
                const c = -A[k][i] / A[i][i];
                for (let j = i; j < n; j++) {
                    if (i === j) {
                        A[k][j] = 0;
                    } else {
                        A[k][j] += c * A[i][j];
                    }
                }
                b[k] += c * b[i];
            }
        }

        // Back substitution
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += A[i][j] * x[j];
            }
            x[i] = (b[i] - sum) / A[i][i];
        }

        return x;
    }
}
