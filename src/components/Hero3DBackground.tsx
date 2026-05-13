import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useMousePosition } from '@/hooks/useMousePosition';

// Drastically reduced particle count for performance
function DataParticles({ radius = 2.5, count = 600 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const sphereData = useMemo(() => {
    const pts = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(Math.random()) * radius;
      pts[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pts[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pts[i * 3 + 2] = r * Math.cos(phi);
    }
    return pts;
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const t = clock.getElapsedTime();
      pointsRef.current.rotation.y = t * 0.04;
      pointsRef.current.rotation.x = t * 0.02;
    }
  });

  return (
    <Points ref={pointsRef} positions={sphereData} stride={3} frustumCulled>
      <PointMaterial transparent color="#8b5cf6" size={0.025} sizeAttenuation depthWrite={false} opacity={0.55} />
    </Points>
  );
}

function MainOrb({ mx, my }: { mx: number; my: number }) {
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!orbRef.current) return;
    const t = clock.getElapsedTime();
    orbRef.current.rotation.x = t * 0.08;
    orbRef.current.rotation.y = t * 0.12;
    orbRef.current.position.y = Math.sin(t * 0.4) * 0.35;
    orbRef.current.position.x = 2 + mx * 0.4;
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[2, 0, -2]} intensity={2} color="#635bff" distance={8} />
      <pointLight position={[-4, -2, -4]} intensity={1} color="#0ea5e9" distance={10} />

      {/* Main orb — simplified, fewer segments */}
      <mesh ref={orbRef} position={[2, 1, -2]}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <MeshDistortMaterial
          color="#1e1b4b"
          emissive="#4c1d95"
          emissiveIntensity={0.7}
          metalness={0.8}
          roughness={0.2}
          distort={0.35}
          speed={1.8}
        />
        <DataParticles radius={2.2} count={600} />
      </mesh>

      {/* Small accent — low poly */}
      <mesh position={[-2.5, 1.5, -3]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <MeshDistortMaterial color="#0ea5e9" distort={0.4} speed={2} roughness={0} metalness={1} />
      </mesh>
    </>
  );
}

export function Hero3DBackground() {
  const mouse = useMousePosition();
  const [mx, setMx] = React.useState(0);
  const [my, setMy] = React.useState(0);

  React.useEffect(() => {
    const unsubX = mouse.x.on('change', setMx);
    const unsubY = mouse.y.on('change', setMy);
    return () => { unsubX(); unsubY(); };
  }, [mouse.x, mouse.y]);

  return (
    <div className="absolute inset-0 z-0 opacity-80 pointer-events-none bg-[#020617]">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1]}
      >
        <MainOrb mx={mx} my={my} />
      </Canvas>
    </div>
  );
}
