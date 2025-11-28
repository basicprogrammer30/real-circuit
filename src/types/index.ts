import * as THREE from 'three';

// ============================================================================
// ENUMS
// ============================================================================

export enum Mode {
    SELECT = 'select',
    DRAG = 'drag',
    ROTATE = 'rotate',
    WIRE = 'wire',
}

export enum WaveformType {
    DC = 'dc',
    SINE = 'sine',
    SQUARE = 'square',
    PULSE = 'pulse',
    TRIANGLE = 'triangle',
}

export enum ComponentType {
    // Passive Components
    RESISTOR = 'resistor',
    CAPACITOR = 'capacitor',
    INDUCTOR = 'inductor',
    DIODE = 'diode',
    ZENER_DIODE = 'zener_diode',
    LED = 'led',
    FUSE = 'fuse',

    // Power Sources
    VOLTAGE_SOURCE = 'voltage_source',
    CURRENT_SOURCE = 'current_source',
    BATTERY = 'battery',
    GROUND = 'ground',

    // Active Components
    MOSFET = 'mosfet',
    BJT = 'bjt',
    JFET = 'jfet',
    THYRISTOR = 'thyristor',
    TRANSISTOR = 'transistor',
    OPTOCOUPLER = 'optocoupler',

    // Integrated Circuits
    LOGIC_GATE_AND = 'logic_gate_and',
    LOGIC_GATE_OR = 'logic_gate_or',
    LOGIC_GATE_NOT = 'logic_gate_not',
    LOGIC_GATE_NAND = 'logic_gate_nand',
    LOGIC_GATE_XOR = 'logic_gate_xor',
    OP_AMP = 'op_amp',

    // Protection & Control
    SWITCH = 'switch',
    POTENTIOMETER = 'potentiometer',
    VARISTOR = 'varistor',
    MCB = 'mcb',
    RELAY = 'relay',

    // Motors & Loads
    LAMP = 'lamp',
    DC_MOTOR = 'dc_motor',
}

export enum ErrorSeverity {
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

export interface Terminal {
    id: string;
    componentId: string;
    position: Vector3D;
    offset: Vector3D; // Local position relative to component
    voltage: number;
    current: number;
    name: string; // e.g., "anode", "cathode", "gate", "drain", "source"
}

export interface Wire {
    id: string;
    fromTerminal: string; // Terminal ID
    toTerminal: string; // Terminal ID
    points: Vector3D[]; // Path points for wire visualization
    current: number;
    voltage: number;
}

export interface WaveformConfig {
    type: WaveformType;
    frequency: number; // Hz
    dutyCycle: number; // 0-1 for pulse/square waves
    phase: number; // Phase shift in radians
    offset: number; // DC offset
}

export interface ComponentLimits {
    minVoltage?: number;
    maxVoltage?: number;
    minCurrent?: number;
    maxCurrent?: number;
    maxTemperature?: number;
    maxPower?: number;
}

export interface ComponentProperties {
    // Common properties
    value?: number; // Resistance, capacitance, inductance, etc.
    voltage?: number;
    current?: number;
    power?: number;
    temperature?: number;

    // Voltage source specific
    waveform?: WaveformConfig;

    // Component limits (user-defined for active components)
    limits?: ComponentLimits;

    // Transistor/MOSFET specific
    beta?: number; // Current gain
    threshold?: number; // Gate threshold voltage

    // Motor specific
    rpm?: number;
    torque?: number;
    load?: number; // 0-1 representing load percentage

    // LED specific
    color?: string;
    brightness?: number;

    // Logic gate specific
    logicState?: boolean;

    // Custom properties for each component type
    [key: string]: any;
}

export interface Component {
    id: string;
    type: ComponentType;
    position: Vector3D;
    rotation: Vector3D;
    terminals: Terminal[];
    properties: ComponentProperties;
    mesh?: THREE.Group; // 3D mesh reference
    selected: boolean;
    error: boolean;
    errorMessage?: string;
}

export interface CircuitError {
    id: string;
    severity: ErrorSeverity;
    message: string;
    componentIds: string[];
    timestamp: number;
    stopSimulation: boolean;
}

export interface SimulationState {
    running: boolean;
    time: number; // Simulation time in seconds
    timeStep: number; // Delta time for each step
    speed: number; // Simulation speed multiplier
    errors: CircuitError[];
}

export interface CircuitNode {
    id: string;
    voltage: number;
    terminalIds: string[]; // All terminals connected to this node
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

export interface CircuitStore {
    // Components and wires
    components: Component[];
    wires: Wire[];
    nodes: CircuitNode[];

    // UI state
    mode: Mode;
    selectedComponentIds: string[];
    hoveredComponentId: string | null;

    // Simulation state
    simulation: SimulationState;

    // Wire drawing state
    wireDrawing: {
        active: boolean;
        fromTerminalId: string | null;
        currentPosition: Vector3D | null;
        waypoints: Vector3D[]; // Points created by clicking on empty space
    };

    // Actions
    addComponent: (type: ComponentType, position: Vector3D) => void;
    removeComponent: (id: string) => void;
    updateComponent: (id: string, updates: Partial<Component>) => void;
    selectComponent: (id: string, multiSelect?: boolean) => void;
    deselectAll: () => void;

    setMode: (mode: Mode) => void;

    addWire: (fromTerminalId: string, toTerminalId: string) => void;
    removeWire: (id: string) => void;

    startSimulation: () => void;
    stopSimulation: () => void;
    stepSimulation: (deltaTime: number) => void;

    addError: (error: CircuitError) => void;
    clearErrors: () => void;

    setHoveredComponent: (id: string | null) => void;
    setWireDrawingState: (state: Partial<CircuitStore['wireDrawing']>) => void;
}

// ============================================================================
// COMPONENT BASE CLASS INTERFACE
// ============================================================================

export interface ICircuitComponent {
    id: string;
    type: ComponentType;
    position: Vector3D;
    rotation: Vector3D;
    terminals: Terminal[];
    properties: ComponentProperties;

    // Methods
    simulate(deltaTime: number, nodeVoltages: Map<string, number>): void;
    createMesh(): THREE.Group;
    updateMesh(mesh: THREE.Group): void;
    checkErrors(): CircuitError[];
    getTerminalPosition(terminalName: string): Vector3D;
}
