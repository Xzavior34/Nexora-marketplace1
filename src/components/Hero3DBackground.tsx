import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useMousePosition } from '@/hooks/useMousePosition';

function FloatingShapes({ mx, my }: { mx: number; my: number }) {
  const sphereRef1 = useRef<THREE.Mesh>(null);
  const sphereRef2 = useRef<THREE.Mesh>(null);
  const sphereRef3 = useRef<THREE.Mesh>(null);
  const light1 = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (sphereRef1.current) {
      sphereRef1.current.rotation.x = t * 0.08;
      sphereRef1.current.rotation.y = t * 0.12;
      sphereRef1.current.position.y = Math.sin(t * 0.4) * 0.6;
      // Mouse parallax
      sphereRef1.current.position.x = 2 + mx * 0.4;
      sphereRef1.current.position.z = -2 + my * 0.2;
    }

    if (sphereRef2.current) {
      sphereRef2.current.rotation.x = -t * 0.07;
      sphereRef2.current.rotation.y = -t * 0.1;
      sphereRef2.current.position.y = Math.sin(t * 0.35 + Math.PI) * 0.7;
      sphereRef2.current.position.x = -3 + mx * -0.3;
    }

    if (sphereRef3.current) {
      sphereRef3.current.rotation.y = t * 0.2;
      sphereRef3.current.position.y = Math.sin(t * 0.6 + 1.5) * 0.4;
      sphereRef3.current.position.x = 0.5 + mx * 0.15;
    }

    if (light1.current) {
      light1.current.position.x = Math.sin(t * 0.5) * 4;
      light1.current.position.z = Math.cos(t * 0.5) * 4;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight ref={light1} position={[0, 2, 2]} intensity={2} color="#635bff" distance={10} />
      <pointLight position={[-4, -2, -4]} intensity={1.5} color="#0ea5e9" distance={12} />

      {/* Primary brand sphere — large, foreground-right */}
      <Sphere ref={sphereRef1} args={[1.5, 64, 64]} position={[2, 1, -2]}>
        <MeshDistortMaterial
          color="#635bff"
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.3}
          roughness={0.05}
          distort={0.5}
          speed={2}
          transparent
          opacity={0.55}
        />
      </Sphere>

      {/* Accent sphere — large, background-left */}
      <Sphere ref={sphereRef2} args={[2.2, 64, 64]} position={[-3, -1, -6]}>
        <MeshDistortMaterial
          color="#0ea5e9"
          clearcoat={0.8}
          metalness={0.1}
          roughness={0.1}
          distort={0.35}
          speed={1.2}
          transparent
          opacity={0.3}
        />
      </Sphere>

      {/* Small accent sphere — foreground-centre */}
      <Sphere ref={sphereRef3} args={[0.7, 32, 32]} position={[0.5, 2.5, -1]}>
        <MeshDistortMaterial
          color="#f59e0b"
          clearcoat={1}
          metalness={0.5}
          roughness={0.0}
          distort={0.6}
          speed={3}
          transparent
          opacity={0.45}
        />
      </Sphere>
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
    <div className="absolute inset-0 z-0 opacity-65 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <FloatingShapes mx={mx} my={my} />
      </Canvas>
    </div>
  );
}
