"use client";
// 3D-сцена первого экрана: ооцит в блестящей оболочке, вокруг плывут сперматозоиды,
// снаружи вращаются красные кольца «прицела». Красное, белое и чёрное.
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, Sphere, Torus, Icosahedron } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Line2 } from "three-stdlib";

const RED = "#ffc533";   // солнечный акцент
const INK = "#ffffff";   // головки сперматозоидов — белые на синем

function Sperm({ seed }: { seed: number }) {
  const group = useRef<THREE.Group>(null);
  const tail = useRef<Line2>(null);
  const r0 = 2.6 + (seed % 3) * 0.35, speed = 0.18 + (seed % 5) * 0.03, tilt = (seed * 0.7) % Math.PI, ph = seed * 1.7;
  const pts = useMemo(() => Array.from({ length: 24 }, () => new THREE.Vector3()), []);
  useFrame(({ clock }) => {
    const tm = clock.getElapsedTime();
    const a = ph + tm * speed, r = r0 - 0.5 * Math.max(0, Math.sin(tm * 0.35 + seed));
    const g = group.current; if (!g) return;
    g.position.set(Math.cos(a) * r, Math.sin(a) * r * Math.cos(tilt), Math.sin(a) * r * Math.sin(tilt));
    g.lookAt(0, 0, 0);
    for (let i = 0; i < pts.length; i++) {
      const u = i / (pts.length - 1);
      pts[i].set(Math.sin(tm * 12 + ph - u * 7) * 0.09 * u, 0, -0.12 - u * 0.9);
    }
    tail.current?.geometry?.setPositions(pts.flatMap((p) => [p.x, p.y, p.z]));
  });
  return (
    <group ref={group}>
      <Sphere args={[0.1, 20, 20]} scale={[0.75, 0.55, 1.25]}>
        <meshStandardMaterial color={INK} roughness={0.35} />
      </Sphere>
      <Line ref={tail} points={pts} color={RED} lineWidth={2.5} />
    </group>
  );
}

function Oocyte() {
  const zona = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (zona.current) { zona.current.rotation.y += dt * 0.12; zona.current.rotation.x += dt * 0.04; }
    if (ring1.current) ring1.current.rotation.z += dt * 0.25;
    if (ring2.current) ring2.current.rotation.z -= dt * 0.12;
  });
  return (
    <group>
      <Sphere args={[1.25, 64, 64]}>
        <meshStandardMaterial color="#ffffff" roughness={0.5} metalness={0.05} emissive="#9fb3ff" emissiveIntensity={0.15} />
      </Sphere>
      <Icosahedron ref={zona} args={[1.62, 2]}>
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.35} />
      </Icosahedron>
      <Sphere args={[0.22, 32, 32]} position={[-0.26, 0.05, 1.05]}><meshStandardMaterial color={RED} roughness={0.3} /></Sphere>
      <Sphere args={[0.2, 32, 32]} position={[0.2, -0.02, 1.08]}><meshStandardMaterial color={RED} roughness={0.3} /></Sphere>
      <Sphere args={[0.16, 24, 24]} position={[0.9, 0.95, 0.6]}><meshStandardMaterial color="#ffffff" roughness={0.6} /></Sphere>
      <Torus ref={ring1} args={[2.2, 0.012, 8, 160]} rotation={[1.2, 0.2, 0]}><meshBasicMaterial color={RED} /></Torus>
      <Torus ref={ring2} args={[3.4, 0.006, 8, 200]} rotation={[1.45, -0.3, 0]}><meshBasicMaterial color="#ffffff" transparent opacity={0.4} /></Torus>
    </group>
  );
}

export default function CellScene({ active = true }: { active?: boolean }) {
  const reduced = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Canvas camera={{ position: [0, 0.4, 7.2], fov: 42 }} dpr={[1, 2]} frameloop={reduced || !active ? "demand" : "always"} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 5, 6]} intensity={1.6} />
      <directionalLight position={[-5, -2, -4]} intensity={0.8} color="#8ea2ff" />
      <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.6}>
        <Oocyte />
      </Float>
      {Array.from({ length: 9 }, (_, i) => <Sperm key={i} seed={i + 1} />)}
    </Canvas>
  );
}
