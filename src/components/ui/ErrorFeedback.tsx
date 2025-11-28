import { useCircuitStore } from '../../store/circuitStore';
import './ErrorFeedback.css';

export function ErrorFeedback() {
    const errors = useCircuitStore((state) => state.simulation.errors);
    const clearErrors = useCircuitStore((state) => state.clearErrors);

    if (errors.length === 0) return null;

    return (
        <div className="error-feedback">
            <div className="error-header">
                <h3>⚠️ Circuit Errors ({errors.length})</h3>
                <button className="clear-button" onClick={clearErrors}>
                    Clear All
                </button>
            </div>

            <div className="error-list">
                {errors.map((error) => (
                    <div key={error.id} className={`error-item ${error.severity}`}>
                        <div className="error-severity-badge">{error.severity.toUpperCase()}</div>
                        <div className="error-content">
                            <div className="error-message">{error.message}</div>
                            <div className="error-timestamp">
                                {new Date(error.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
