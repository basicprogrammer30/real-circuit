import { useCircuitStore } from '../../store/circuitStore';
import { Mode } from '../../types';
import './ModeToolbar.css';

export function ModeToolbar() {
    const mode = useCircuitStore((state) => state.mode);
    const setMode = useCircuitStore((state) => state.setMode);

    const modes = [
        { id: Mode.SELECT, icon: '🖱️', label: 'Select', key: 'S' },
        { id: Mode.DRAG, icon: '✋', label: 'Drag', key: 'D' },
        { id: Mode.ROTATE, icon: '🔄', label: 'Rotate', key: 'R' },
        { id: Mode.WIRE, icon: '🔌', label: 'Wire', key: 'W' },
    ];

    return (
        <div className="mode-toolbar">
            <div className="mode-toolbar-title">Mode</div>
            <div className="mode-buttons">
                {modes.map((m) => (
                    <button
                        key={m.id}
                        className={`mode-button ${mode === m.id ? 'active' : ''}`}
                        onClick={() => setMode(m.id)}
                        title={`${m.label} (${m.key})`}
                    >
                        <span className="mode-icon">{m.icon}</span>
                        <span className="mode-label">{m.label}</span>
                        <span className="mode-key">{m.key}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
