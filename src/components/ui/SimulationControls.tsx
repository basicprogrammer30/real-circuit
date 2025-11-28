import { useCircuitStore } from '../../store/circuitStore';
import './SimulationControls.css';

export function SimulationControls() {
    const simulation = useCircuitStore((state) => state.simulation);
    const startSimulation = useCircuitStore((state) => state.startSimulation);
    const stopSimulation = useCircuitStore((state) => state.stopSimulation);
    const clearErrors = useCircuitStore((state) => state.clearErrors);

    const handleRunStop = () => {
        if (simulation.running) {
            stopSimulation();
        } else {
            clearErrors();
            startSimulation();
        }
    };

    return (
        <div className="simulation-controls">
            <button
                className={`control-button ${simulation.running ? 'stop' : 'run'}`}
                onClick={handleRunStop}
            >
                <span className="button-icon">{simulation.running ? '⏸️' : '▶️'}</span>
                <span className="button-label">{simulation.running ? 'Stop' : 'Run'}</span>
            </button>

            <div className="simulation-info">
                <div className="info-item">
                    <span className="info-label">Status:</span>
                    <span className={`info-value ${simulation.running ? 'running' : 'stopped'}`}>
                        {simulation.running ? 'Running' : 'Stopped'}
                    </span>
                </div>
                <div className="info-item">
                    <span className="info-label">Time:</span>
                    <span className="info-value">{simulation.time.toFixed(3)}s</span>
                </div>
                {simulation.errors.length > 0 && (
                    <div className="info-item error">
                        <span className="info-label">Errors:</span>
                        <span className="info-value">{simulation.errors.length}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
