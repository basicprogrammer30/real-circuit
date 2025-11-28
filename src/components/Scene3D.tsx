import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCircuitStore } from '../store/circuitStore';
import { ComponentFactory } from './circuits/ComponentFactory';
import { Mode } from '../types';

function ComponentRenderer() {
    const components = useCircuitStore((state) => state.components);
    return (
        <>
            {components.map((component) => {
                const componentInstance = ComponentFactory.createComponent(component.id, component.type, component.position);
                if (!componentInstance) return null;
                return <ComponentMesh key={component.id} component={component} componentInstance={componentInstance} />;
            })}
        </>
    );
}

function ComponentMesh({ component, componentInstance }: any) {
    const componentMeshRef = useRef<THREE.Group>(null);
    const containerRef = useRef<THREE.Group>(null);
    const selectedComponentIds = useCircuitStore((state) => state.selectedComponentIds);
    const mode = useCircuitStore((state) => state.mode);
    const selectComponent = useCircuitStore((state) => state.selectComponent);
    const updateComponent = useCircuitStore((state) => state.updateComponent);
    const isSelected = selectedComponentIds.includes(component.id);
    const showTransform = isSelected && (mode === Mode.DRAG || mode === Mode.ROTATE);

    useEffect(() => {
        if (componentMeshRef.current && componentMeshRef.current.children.length === 0) {
            const mesh = componentInstance.createMesh();
            componentMeshRef.current.add(...mesh.children);
        }
    }, [componentInstance]);

    useFrame(() => {
        if (containerRef.current) {
            if (!showTransform) {
                containerRef.current.position.set(component.position.x, component.position.y, component.position.z);
                containerRef.current.rotation.set(component.rotation.x, component.rotation.y, component.rotation.z);
            }
            if (componentMeshRef.current) {
                componentInstance.updateMesh(componentMeshRef.current);
                const outline = componentMeshRef.current.getObjectByName('outline') as THREE.Mesh;
                if (outline && outline.material instanceof THREE.MeshBasicMaterial) {
                    outline.material.opacity = isSelected ? 0.3 : 0;
                }
                if (component.error) {
                    componentMeshRef.current.traverse((child) => {
                        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                            child.material.emissive.setHex(0xff0000);
                            child.material.emissiveIntensity = 0.5;
                        }
                    });
                }
            }
        }
    });

    const handleClick = (e: any) => {
        e.stopPropagation();
        if (mode === Mode.SELECT || mode === Mode.DRAG || mode === Mode.ROTATE) {
            selectComponent(component.id, e.shiftKey);
        }
    };

    const handleTransformChange = () => {
        if (containerRef.current) {
            updateComponent(component.id, {
                position: { x: containerRef.current.position.x, y: containerRef.current.position.y, z: containerRef.current.position.z },
                rotation: { x: containerRef.current.rotation.x, y: containerRef.current.rotation.y, z: containerRef.current.rotation.z }
            });
        }
    };

    return (
        <>
            <group ref={containerRef} position={[component.position.x, component.position.y, component.position.z]} rotation={[component.rotation.x, component.rotation.y, component.rotation.z]} onClick={handleClick} onPointerOver={() => useCircuitStore.getState().setHoveredComponent(component.id)} onPointerOut={() => useCircuitStore.getState().setHoveredComponent(null)}>
                <group ref={componentMeshRef} />
                {component.terminals.map((terminal: any) => <TerminalMesh key={terminal.id} terminal={terminal} componentId={component.id} />)}
            </group>
            {showTransform && <TransformControls object={containerRef} mode={mode === Mode.DRAG ? 'translate' : 'rotate'} onMouseUp={handleTransformChange} />}
        </>
    );
}

function TerminalMesh({ terminal, componentId }: any) {
    const mode = useCircuitStore((state) => state.mode);
    const { active, fromTerminalId } = useCircuitStore((state) => state.wireDrawing);
    const setWireDrawingState = useCircuitStore((state) => state.setWireDrawingState);
    const addWire = useCircuitStore((state) => state.addWire);
    const [hovered, setHovered] = useState(false);
    if (mode !== Mode.WIRE) return null;

    const handleTerminalClick = (e: any) => {
        e.stopPropagation();
        if (mode === Mode.WIRE) {
            if (!active) {
                setWireDrawingState({ active: true, fromTerminalId: terminal.id, currentPosition: terminal.position, waypoints: [] });
            } else if (fromTerminalId && fromTerminalId !== terminal.id) {
                addWire(fromTerminalId, terminal.id);
            }
        }
    };

    return (
        <mesh position={[terminal.offset.x, terminal.offset.y, terminal.offset.z]} onClick={handleTerminalClick} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }} onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color={hovered ? "#ffffff" : (active && fromTerminalId === terminal.id ? "#00ff00" : "#ff0000")} />
        </mesh>
    );
}

function WireSegment({ start, end, isActive }: { start: any, end: any, isActive: boolean }) {
    const geometry = useMemo(() => {
        const points = [new THREE.Vector3(start.x, start.y, start.z), new THREE.Vector3(end.x, end.y, end.z)];
        const curve = new THREE.LineCurve3(points[0], points[1]);
        return new THREE.TubeGeometry(curve, 2, 0.05, 8, false);
    }, [start.x, start.y, start.z, end.x, end.y, end.z]);

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial color={isActive ? "#ffff00" : "#00ff00"} emissive={isActive ? "#ffff00" : "#00ff00"} emissiveIntensity={0.5} />
        </mesh>
    );
}

function WireDrawingManager() {
    const { active, fromTerminalId, currentPosition, waypoints } = useCircuitStore((state) => state.wireDrawing);
    const setWireDrawingState = useCircuitStore((state) => state.setWireDrawingState);
    const components = useCircuitStore((state) => state.components);
    const { camera, raycaster, pointer } = useThree();

    const startPos = fromTerminalId ? (() => {
        const component = components.find(c => c.terminals.some(t => t.id === fromTerminalId));
        const terminal = component?.terminals.find(t => t.id === fromTerminalId);
        return terminal?.position;
    })() : null;

    useFrame(() => {
        if (!active || !startPos) return;
        raycaster.setFromCamera(pointer, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const target = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, target);
        if (target) {
            setWireDrawingState({ currentPosition: { x: target.x, y: target.y, z: target.z } });
        }
    });

    const handleCanvasClick = (e: any) => {
        e.stopPropagation();
        if (!active || !startPos || !currentPosition) return;
        setWireDrawingState({ waypoints: [...waypoints, { ...currentPosition }] });
    };

    if (!active || !startPos || !currentPosition) return null;

    const allPoints = [startPos, ...waypoints, currentPosition];

    return (
        <>
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleCanvasClick}>
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {allPoints.map((point, index) => {
                if (index === 0) return null;
                const prevPoint = allPoints[index - 1];
                return <WireSegment key={index} start={prevPoint} end={point} isActive={index === allPoints.length - 1} />;
            })}
            {waypoints.map((waypoint, index) => (
                <mesh key={`waypoint-${index}`} position={[waypoint.x, waypoint.y, waypoint.z]}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
                </mesh>
            ))}
        </>
    );
}

function WireRenderer() {
    const wires = useCircuitStore((state) => state.wires);
    return <>{wires.map((wire) => <WireMesh key={wire.id} wire={wire} />)}</>;
}

function WireMesh({ wire }: any) {
    const points = wire.points.map((p: any) => new THREE.Vector3(p.x, p.y, p.z));
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.02, 8, false);
    return (
        <mesh geometry={tubeGeometry}>
            <meshStandardMaterial color={0xFFD700} metalness={0.8} roughness={0.2} />
        </mesh>
    );
}

function SceneSetup() {
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <directionalLight position={[-10, -10, -5]} intensity={0.3} />
            <hemisphereLight args={[0x87CEEB, 0x545454, 0.6]} />
        </>
    );
}

function GridHelper() {
    return <Grid args={[20, 20]} cellSize={1} cellThickness={0.5} cellColor="#6b7280" sectionSize={5} sectionThickness={1} sectionColor="#9ca3af" fadeDistance={30} fadeStrength={1} followCamera={false} infiniteGrid />;
}

function SimulationLoop() {
    const stepSimulation = useCircuitStore((state) => state.stepSimulation);
    const running = useCircuitStore((state) => state.simulation.running);

    useFrame((state, delta) => {
        if (running) {
            stepSimulation(delta);
        }
    });

    return null;
}

export function Scene3D() {
    return (
        <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }}>
            <Canvas camera={{ position: [5, 5, 5], fov: 50 }} shadows gl={{ antialias: true, alpha: false }}>
                <SceneSetup />
                <GridHelper />
                <ComponentRenderer />
                <WireRenderer />
                <WireDrawingManager />
                <SimulationLoop />
                <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={2} maxDistance={50} />
            </Canvas>
        </div>
    );
}
