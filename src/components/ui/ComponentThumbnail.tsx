import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ComponentFactory } from '../circuits/ComponentFactory';
import { ComponentType } from '../../types';
import * as THREE from 'three';

interface ComponentThumbnailProps {
    type: ComponentType;
    size?: number;
}

export const ComponentThumbnail: React.FC<ComponentThumbnailProps> = ({ type, size = 60 }) => {
    const mesh = useMemo(() => {
        const dummyId = 'thumbnail-' + type;
        const component = ComponentFactory.createComponent(dummyId, type, { x: 0, y: 0, z: 0 });
        if (component) {
            const group = component.createMesh();
            // Center and scale the mesh to fit
            const box = new THREE.Box3().setFromObject(group);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            // Normalize scale
            const scale = 1.5 / (maxDim || 1);
            group.scale.setScalar(scale);
            group.position.sub(center.multiplyScalar(scale));

            // Special adjustments for specific components if needed
            if (type === ComponentType.VOLTAGE_SOURCE) {
                group.rotation.x = -Math.PI / 6;
                group.rotation.y = Math.PI / 6;
            }

            return group;
        }
        return null;
    }, [type]);

    if (!mesh) return null;

    return (
        <div style={{ width: size, height: size, borderRadius: '8px', overflow: 'hidden', background: '#2a2a2a' }}>
            <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
                <ambientLight intensity={0.8} />
                <pointLight position={[5, 5, 5]} intensity={1} />
                <pointLight position={[-5, -5, -5]} intensity={0.5} />
                <primitive object={mesh} />
            </Canvas>
        </div>
    );
};
