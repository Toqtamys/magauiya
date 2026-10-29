'use client';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { ORGANS } from './targets';
import { tr, type Lang } from '@/lib/i18n';

/* Стилизованная 3D-фигура человека из примитивов + кликабельные органы-хабы.
   Не анатомический атлас, а понятная навигационная модель. */
function Body() {
  const mat = new THREE.MeshStandardMaterial({ color: '#dbe8ff', transparent: true, opacity: 0.22, roughness: 0.4, metalness: 0.05 });
  return (
    <group>
      {/* голова */}
      <mesh position={[0, 2.45, 0]} material={mat}><sphereGeometry args={[0.52, 32, 32]} /></mesh>
      {/* шея */}
      <mesh position={[0, 1.9, 0]} material={mat}><cylinderGeometry args={[0.18, 0.22, 0.4, 24]} /></mesh>
      {/* торс */}
      <mesh position={[0, 0.75, 0]} material={mat}><capsuleGeometry args={[0.62, 1.5, 12, 32]} /></mesh>
      {/* таз */}
      <mesh position={[0, -1.1, 0]} material={mat}><sphereGeometry args={[0.6, 32, 32]} /></mesh>
      {/* руки */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.82, 0.7, 0]} rotation={[0, 0, s * 0.18]} material={mat}><capsuleGeometry args={[0.16, 1.5, 8, 16]} /></mesh>)}
      {/* ноги */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.28, -2.55, 0]} material={mat}><capsuleGeometry args={[0.2, 1.6, 8, 16]} /></mesh>)}
    </group>
  );
}

function OrganNode({ organ, active, onClick, lang }: { organ: (typeof ORGANS)[number]; active: boolean; onClick: () => void; lang: Lang }) {
  const [hover, setHover] = useState(false);
  const ref = useRef<THREE.Mesh>(null);
  const on = active || hover;
  return (
    <group position={organ.pos}>
      <mesh ref={ref} onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}>
        <sphereGeometry args={[on ? 0.17 : 0.13, 24, 24]} />
        <meshStandardMaterial color={organ.color} emissive={organ.color} emissiveIntensity={on ? 1.1 : 0.5} roughness={0.3} />
      </mesh>
      <mesh scale={on ? 1.9 : 1.5}><sphereGeometry args={[0.13, 16, 16]} /><meshBasicMaterial color={organ.color} transparent opacity={0.16} /></mesh>
      {on && (
        <Html center distanceFactor={9} position={[0, 0.32, 0]} className="pointer-events-none">
          <div className="whitespace-nowrap rounded-full bg-navy px-2.5 py-1 text-[11px] font-semibold text-white shadow-lift">{tr(organ.name, lang)}</div>
        </Html>
      )}
    </group>
  );
}

export default function Anatomy3D({ lang, selected, onSelect }: { lang: Lang; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <Canvas camera={{ position: [0, 0.2, 7], fov: 42 }} dpr={[1, 2]} className="rounded-2xl" style={{ background: 'linear-gradient(180deg,#f3f7ff,#dff1ff)' }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 6, 6]} intensity={1.1} />
      <directionalLight position={[-5, -2, 2]} intensity={0.4} color="#1f4fff" />
      <Body />
      {ORGANS.map((o) => <OrganNode key={o.id} organ={o} active={selected === o.id} onClick={() => onSelect(o.id)} lang={lang} />)}
      <OrbitControls enablePan={false} minDistance={4} maxDistance={11} autoRotate={!selected} autoRotateSpeed={0.6} target={[0, 0.1, 0]} />
    </Canvas>
  );
}
