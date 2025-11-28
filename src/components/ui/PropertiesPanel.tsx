import { useCircuitStore } from '../../store/circuitStore';
import { Component, ComponentProperties } from '../../types';
import './PropertiesPanel.css';

export function PropertiesPanel() {
    const selectedComponentIds = useCircuitStore((state) => state.selectedComponentIds);
    const components = useCircuitStore((state) => state.components);
    const updateComponent = useCircuitStore((state) => state.updateComponent);

    const selectedComponent = components.find(c => c.id === selectedComponentIds[0]);
    const isMultiSelect = selectedComponentIds.length > 1;

    if (!selectedComponent || isMultiSelect) {
        return (
            <div className="properties-panel empty">
                <div className="properties-header">
                    <h2>Properties</h2>
                </div>
                <div className="empty-state">
                    {isMultiSelect ? (
                        <p>Multiple components selected</p>
                    ) : (
                        <p>Select a component to view properties</p>
                    )}
                </div>
            </div>
        );
    }

    const handlePropertyChange = (key: keyof ComponentProperties, value: any) => {
        updateComponent(selectedComponent.id, {
            properties: {
                ...selectedComponent.properties,
                [key]: value
            }
        });
    };

    const isReadOnly = (key: string) => {
        const readOnlyCommon = ['current', 'power', 'temperature'];
        if (readOnlyCommon.includes(key)) return true;

        // Voltage is read-only for passive components, editable for sources
        if (key === 'voltage' && selectedComponent.type !== 'voltage_source') return true;

        return false;
    };

    const renderPropertyInput = (key: string, value: any) => {
        // Skip rendering internal properties
        if (key === 'description') return null;

        const readOnly = isReadOnly(key);

        // Special handling for Waveform configuration
        if (key === 'waveform' && typeof value === 'object' && value !== null) {
            const waveformType = value.type;

            // Define visible fields for each waveform type
            const visibleFields: Record<string, string[]> = {
                dc: [],
                sine: ['frequency', 'phase', 'offset'],
                square: ['frequency', 'dutyCycle', 'phase', 'offset'],
                pulse: ['frequency', 'dutyCycle', 'phase', 'offset'],
                triangle: ['frequency', 'phase', 'offset'],
            };

            const fieldsToShow = visibleFields[waveformType] || [];

            return (
                <div className="property-group" key={key}>
                    <label className="group-label">Waveform</label>
                    <div className="group-content">
                        {/* Waveform Type Selector */}
                        <div className="property-row">
                            <label>Type</label>
                            <select
                                value={value.type}
                                onChange={(e) => {
                                    const newValue = { ...value, type: e.target.value };
                                    handlePropertyChange(key, newValue);
                                }}
                                className="property-select"
                            >
                                <option value="dc">DC</option>
                                <option value="sine">Sine</option>
                                <option value="square">Square</option>
                                <option value="pulse">Pulse</option>
                                <option value="triangle">Triangle</option>
                            </select>
                        </div>

                        {/* Other Waveform Properties */}
                        {Object.entries(value).map(([subKey, subValue]) => {
                            if (subKey === 'type') return null; // Already handled above
                            if (!fieldsToShow.includes(subKey)) return null; // Hide irrelevant fields

                            return (
                                <div className="property-row" key={`${key}-${subKey}`}>
                                    <label>{formatLabel(subKey)}</label>
                                    <input
                                        type="number"
                                        value={subValue as number}
                                        onChange={(e) => {
                                            const newValue = { ...value, [subKey]: parseFloat(e.target.value) };
                                            handlePropertyChange(key, newValue);
                                        }}
                                        step="any"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (typeof value === 'boolean') {
            return (
                <div className="property-row" key={key}>
                    <label>{formatLabel(key)}</label>
                    <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handlePropertyChange(key, e.target.checked)}
                        disabled={readOnly}
                    />
                </div>
            );
        }

        if (typeof value === 'number') {
            return (
                <div className="property-row" key={key}>
                    <label>{formatLabel(key)}</label>
                    {readOnly ? (
                        <span className="readonly-value">
                            {value.toFixed(key === 'power' || key === 'current' ? 4 : 2)}
                        </span>
                    ) : (
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => handlePropertyChange(key, parseFloat(e.target.value))}
                            step="any"
                        />
                    )}
                </div>
            );
        }

        if (typeof value === 'string') {
            return (
                <div className="property-row" key={key}>
                    <label>{formatLabel(key)}</label>
                    {readOnly ? (
                        <span className="readonly-value">{value}</span>
                    ) : (
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => handlePropertyChange(key, e.target.value)}
                        />
                    )}
                </div>
            );
        }

        // Handle nested objects like waveform config
        if (typeof value === 'object' && value !== null) {
            return (
                <div className="property-group" key={key}>
                    <label className="group-label">{formatLabel(key)}</label>
                    <div className="group-content">
                        {Object.entries(value).map(([subKey, subValue]) => (
                            <div className="property-row" key={`${key}-${subKey}`}>
                                <label>{formatLabel(subKey)}</label>
                                <input
                                    type="number"
                                    value={subValue as number}
                                    onChange={(e) => {
                                        const newValue = { ...value, [subKey]: parseFloat(e.target.value) };
                                        handlePropertyChange(key, newValue);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="properties-panel">
            <div className="properties-header">
                <h2>Properties</h2>
                <div className="component-type-badge">
                    {formatLabel(selectedComponent.type)}
                </div>
            </div>

            <div className="properties-content">
                <div className="property-section">
                    <h3>General</h3>
                    <div className="property-row">
                        <label>ID</label>
                        <span className="readonly-value" title={selectedComponent.id}>
                            {selectedComponent.id.slice(0, 8)}...
                        </span>
                    </div>

                    <div className="property-row">
                        <label>Rotation X</label>
                        <input
                            type="number"
                            value={(selectedComponent.rotation.x * 180 / Math.PI).toFixed(0)}
                            onChange={(e) => updateComponent(selectedComponent.id, {
                                rotation: { ...selectedComponent.rotation, x: parseFloat(e.target.value) * Math.PI / 180 }
                            })}
                            step="90"
                        />
                    </div>
                    <div className="property-row">
                        <label>Rotation Y</label>
                        <input
                            type="number"
                            value={(selectedComponent.rotation.y * 180 / Math.PI).toFixed(0)}
                            onChange={(e) => updateComponent(selectedComponent.id, {
                                rotation: { ...selectedComponent.rotation, y: parseFloat(e.target.value) * Math.PI / 180 }
                            })}
                            step="90"
                        />
                    </div>
                    <div className="property-row">
                        <label>Rotation Z</label>
                        <input
                            type="number"
                            value={(selectedComponent.rotation.z * 180 / Math.PI).toFixed(0)}
                            onChange={(e) => updateComponent(selectedComponent.id, {
                                rotation: { ...selectedComponent.rotation, z: parseFloat(e.target.value) * Math.PI / 180 }
                            })}
                            step="90"
                        />
                    </div>
                </div>

                <div className="property-section">
                    <h3>Parameters</h3>
                    {selectedComponent.properties && Object.entries(selectedComponent.properties).map(([key, value]) =>
                        renderPropertyInput(key, value)
                    )}
                </div>
            </div>
        </div>
    );
}

function formatLabel(key: string): string {
    return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
