"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function GrillRack() {
    const rackRef = useRef<THREE.Group>(null);
    const skewerRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (rackRef.current) {
            rackRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.16;
        }
        if (skewerRef.current) {
            skewerRef.current.rotation.y = state.clock.elapsedTime * 0.18;
        }
    });

    return (
        <group>
            <group ref={rackRef}>
                <mesh position={[0, -0.45, 0]}>
                    <cylinderGeometry args={[2.45, 2.75, 0.9, 48, 1, true]} />
                    <meshStandardMaterial color="#1A1A1A" metalness={0.92} roughness={0.16} />
                </mesh>
                <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[1.9, 48]} />
                    <meshStandardMaterial color="#0E0E0E" />
                </mesh>

                {Array.from({ length: 10 }).map((_, idx) => (
                    <mesh key={idx} position={[-1.6 + idx * 0.36, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.03, 0.03, 2.8, 12]} />
                        <meshStandardMaterial color="#B7B7B7" metalness={0.95} roughness={0.12} />
                    </mesh>
                ))}
            </group>

            <group ref={skewerRef} position={[0, 0.42, 0]}>
                {[
                    { x: -0.95, z: 0.1, color: "#E07F35" },
                    { x: 0, z: -0.2, color: "#E7BE7A" },
                    { x: 0.95, z: 0.14, color: "#6EB16A" },
                ].map((item, idx) => (
                    <group key={idx} position={[item.x, 0, item.z]}>
                        <mesh rotation={[0, 0, Math.PI / 2]}>
                            <cylinderGeometry args={[0.02, 0.02, 0.9, 12]} />
                            <meshStandardMaterial color="#B4B4B4" metalness={0.9} roughness={0.2} />
                        </mesh>
                        <mesh position={[0, 0.02, 0]} rotation={[0.2, idx * 0.6, 0.1]}>
                            <boxGeometry args={[0.42, 0.18, 0.26]} />
                            <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.24} roughness={0.58} />
                        </mesh>
                    </group>
                ))}
            </group>
        </group>
    );
}

function CharcoalBed() {
    const charcoals = useRef<Array<THREE.Mesh | null>>([]);
    const chunks = useMemo(
        () =>
            Array.from({ length: 16 }).map((_, idx) => ({
                x: (Math.random() - 0.5) * 2.2,
                z: (Math.random() - 0.5) * 1.7,
                y: -0.62 + Math.random() * 0.08,
                s: 0.13 + Math.random() * 0.1,
                speed: 0.7 + (idx % 5) * 0.16,
                delay: Math.random() * Math.PI,
            })),
        []
    );

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        chunks.forEach((chunk, idx) => {
            const mesh = charcoals.current[idx];
            if (!mesh) return;
            const glow = 0.3 + (Math.sin(t * chunk.speed + chunk.delay) + 1) * 0.28;
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.emissiveIntensity = glow;
            mesh.scale.setScalar(chunk.s + glow * 0.04);
        });
    });

    return (
        <group>
            {chunks.map((chunk, idx) => (
                <mesh
                    key={idx}
                    ref={(el) => {
                        charcoals.current[idx] = el;
                    }}
                    position={[chunk.x, chunk.y, chunk.z]}
                >
                    <icosahedronGeometry args={[chunk.s, 1]} />
                    <meshStandardMaterial color="#1C1C1C" emissive="#FF6A00" emissiveIntensity={0.45} roughness={0.95} />
                </mesh>
            ))}
        </group>
    );
}

function FlameSet() {
    const flames = useRef<Array<THREE.Mesh | null>>([]);
    const flameLayout = useMemo(
        () =>
            Array.from({ length: 8 }).map((_, idx) => ({
                x: -1.2 + idx * 0.35,
                z: (Math.random() - 0.5) * 0.5,
                base: 0.42 + Math.random() * 0.2,
                speed: 2 + Math.random() * 2,
                delay: Math.random() * Math.PI,
            })),
        []
    );

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        flameLayout.forEach((flame, idx) => {
            const mesh = flames.current[idx];
            if (!mesh) return;
            const flicker = 0.72 + Math.abs(Math.sin(t * flame.speed + flame.delay)) * 0.7;
            mesh.scale.set(0.55, flame.base * flicker, 0.55);
            mesh.position.y = -0.22 + flicker * 0.25;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 1.1 + flicker * 0.55;
        });
    });

    return (
        <group>
            {flameLayout.map((flame, idx) => (
                <mesh
                    key={idx}
                    ref={(el) => {
                        flames.current[idx] = el;
                    }}
                    position={[flame.x, -0.1, flame.z]}
                >
                    <coneGeometry args={[0.16, 0.6, 14, 1]} />
                    <meshStandardMaterial color="#FFAA33" emissive="#FF6A00" emissiveIntensity={1.4} transparent opacity={0.78} />
                </mesh>
            ))}
        </group>
    );
}

function SmokeClouds() {
    const smokes = useRef<Array<THREE.Mesh | null>>([]);
    const puffs = useMemo(
        () =>
            Array.from({ length: 18 }).map(() => ({
                x: (Math.random() - 0.5) * 2.2,
                z: (Math.random() - 0.5) * 1.8,
                scale: 0.12 + Math.random() * 0.18,
                speed: 0.16 + Math.random() * 0.17,
                delay: Math.random(),
            })),
        []
    );

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        puffs.forEach((puff, idx) => {
            const mesh = smokes.current[idx];
            if (!mesh) return;
            const cycle = (t * puff.speed + puff.delay) % 1;
            mesh.position.set(puff.x + Math.sin(t + idx) * 0.08, -0.05 + cycle * 3.4, puff.z + Math.cos(t * 0.6 + idx) * 0.08);
            const grow = puff.scale + cycle * 0.2;
            mesh.scale.setScalar(grow);
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.opacity = (1 - cycle) * 0.045;
        });
    });

    return (
        <group>
            {puffs.map((_, idx) => (
                <mesh
                    key={idx}
                    ref={(el) => {
                        smokes.current[idx] = el;
                    }}
                >
                    <sphereGeometry args={[0.22, 12, 12]} />
                    <meshStandardMaterial color="#8A8A8A" transparent opacity={0.03} depthWrite={false} />
                </mesh>
            ))}
        </group>
    );
}

function GrillRig() {
    const rig = useRef<THREE.Group>(null);
    const { size } = useThree();
    const isMobile = size.width < 768;

    useFrame((state) => {
        if (!rig.current) return;
        rig.current.position.y = -0.35 + Math.sin(state.clock.elapsedTime * 0.35) * 0.05;
        rig.current.rotation.x = -0.02;
        rig.current.scale.setScalar(isMobile ? 0.82 : 1);
    });

    return (
        <group ref={rig} position={[0, -0.3, 0]}>
            <GrillRack />
            <CharcoalBed />
            <FlameSet />
            <SmokeClouds />
        </group>
    );
}

export function GrillScene() {
    const isSmallViewport = typeof window !== "undefined" ? window.innerWidth < 768 : false;

    return (
        <div className="h-full w-full">
            <Canvas
                camera={{ position: [0, 1.8, 6.7], fov: 46 }}
                dpr={isSmallViewport ? [1, 1.1] : [1, 1.25]}
                gl={{ antialias: false, powerPreference: "high-performance" }}
            >
                <color attach="background" args={["#0B0B0B"]} />
                <fog attach="fog" args={["#0B0B0B", 6, 15]} />
                <ambientLight intensity={0.35} />
                <pointLight color="#FF6A00" position={[0, 2.2, 1.5]} intensity={2.25} distance={12} />
                <pointLight color="#CFAF63" position={[0, 3.3, -2.6]} intensity={0.7} />
                <spotLight color="#FF8F2A" position={[2.2, 4.2, 2.8]} angle={0.44} intensity={1.8} penumbra={0.55} />

                <GrillRig />

                <OrbitControls enablePan={false} enableZoom={false} autoRotate={!isSmallViewport} autoRotateSpeed={0.24} maxPolarAngle={1.74} minPolarAngle={1.14} />
            </Canvas>
        </div>
    );
}
