import { useCircuitStore } from '../../store/circuitStore';
import { ComponentType } from '../../types';
import { ComponentFactory } from '../circuits/ComponentFactory';
import './ComponentPanel.css';

import { ComponentThumbnail } from './ComponentThumbnail';

export function ComponentPanel() {
    const addComponent = useCircuitStore((state) => state.addComponent);
    const availableComponents = ComponentFactory.getAvailableComponents();

    // Group components by category
    const componentsByCategory = availableComponents.reduce((acc, type) => {
        const category = ComponentFactory.getComponentCategory(type);
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(type);
        return acc;
    }, {} as Record<string, ComponentType[]>);

    const handleAddComponent = (type: ComponentType) => {
        // Add component at origin (user can drag it later)
        addComponent(type, { x: 0, y: 0, z: 0 });
    };

    return (
        <div className="component-panel">
            <div className="component-panel-header">
                <h2>Components</h2>
                <p>Click to add to scene</p>
            </div>

            <div className="component-categories">
                {Object.entries(componentsByCategory).map(([category, components]) => (
                    <div key={category} className="component-category">
                        <h3 className="category-title">{category}</h3>
                        <div className="component-list">
                            {components.map((type) => (
                                <button
                                    key={type}
                                    className="component-item"
                                    onClick={() => handleAddComponent(type)}
                                    title={`Add ${ComponentFactory.getComponentName(type)}`}
                                >
                                    <div className="component-thumbnail-wrapper">
                                        <ComponentThumbnail type={type} size={40} />
                                    </div>
                                    <span className="component-name">
                                        {ComponentFactory.getComponentName(type)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
