import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useMousePosition } from '@/hooks/useMousePosition';
import { useTransform, useSpring as useFramerSpring } from 'framer-motion';

interface AIOrbProps {
  matchScore: number;
}

// Score → colour mapping
function scoreToColor(score: number): THREE.Color {
  if (score >= 80) return new THREE.Color('#635bff'); // brand violet
  if (score >= 50) return new THREE.Color('#0ea5e9'); // sky blue
  return new THREE.Color('#f59e0b');                  // amber
}

const vertexShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uDistort;

  // Simple noise
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vec3 pos = position;
    
    // Distort based on time
    float noise = sin(pos.x * 3.0 + uTime) * cos(pos.y * 3.0 + uTime * 0.7) * uDistort;
    pos += normal * noise;
    
    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uMouse;

  void main() {
    // Fresnel
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);
    
    // Iridescence: shift hue based on normal + time
    float hueShift = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 iridColor = mix(uColor, vec3(1.0, 0.8, 1.0), hueShift * 0.4);
    
    // Mouse influence
    float mouseEffect = length(uMouse) * 0.3;
    iridColor += mouseEffect * vec3(0.3, 0.1, 0.5);
    
    // Core glow
    vec3 finalColor = mix(iridColor * uIntensity, vec3(1.0), fresnel * 0.6);
    float alpha = mix(0.8, 1.0, fresnel);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

function OrbMesh({ matchScore, mouseX, mouseY }: AIOrbProps & { mouseX: number; mouseY: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const uniforms = useRef({
    uTime:      { value: 0 },
    uColor:     { value: scoreToColor(matchScore) },
    uDistort:   { value: matchScore >= 80 ? 0.18 : matchScore >= 50 ? 0.1 : 0.05 },
    uIntensity: { value: matchScore >= 80 ? 2.5 : 1.8 },
    uMouse:     { value: new THREE.Vector2(0, 0) },
  });

  const speed = matchScore >= 80 ? 2.5 : matchScore >= 50 ? 1.8 : 1;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (uniforms.current) {
      uniforms.current.uTime.value = t;
      uniforms.current.uMouse.value.set(mouseX, mouseY);
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.18 * speed;
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
      // Mouse tilt
      meshRef.current.rotation.z = mouseX * 0.3;
    }
    if (glowRef.current) {
      const pulse = 1.15 + Math.sin(t * speed * 2) * 0.08;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <Float speed={speed * 0.8} rotationIntensity={0.3} floatIntensity={0.5}>
      {/* Custom shader core */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.7, 6]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms.current}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glass shell */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.95}
          opacity={1}
          metalness={0.05}
          roughness={0.02}
          ior={1.6}
          thickness={0.5}
          specularIntensity={1.2}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
        />
      </mesh>

      {/* Outer halo glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.18, 32, 32]} />
        <meshBasicMaterial
          color={scoreToColor(matchScore)}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </Float>
  );
}

function Scene({ matchScore, mouseX, mouseY }: AIOrbProps & { mouseX: number; mouseY: number }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-5, -3, -3]} intensity={0.6} color="#a78bfa" />
      <pointLight position={[2, 2, 2]} intensity={1} color={scoreToColor(matchScore).getStyle()} />
      <OrbMesh matchScore={matchScore} mouseX={mouseX} mouseY={mouseY} />
    </>
  );
}

export function AIOrb({ matchScore, className = '' }: AIOrbProps & { className?: string }) {
  const mouse = useMousePosition();

  // Use get() for current values inside canvas — we'll pass as numbers via state
  const [mx, setMx] = React.useState(0);
  const [my, setMy] = React.useState(0);

  React.useEffect(() => {
    const unsubX = mouse.x.on('change', setMx);
    const unsubY = mouse.y.on('change', setMy);
    return () => { unsubX(); unsubY(); };
  }, [mouse.x, mouse.y]);

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <Scene matchScore={matchScore} mouseX={mx} mouseY={my} />
      </Canvas>
    </div>
  );
}
