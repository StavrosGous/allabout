import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Detailed procedural animal cell model.
 * Translucent cell membrane, cytoplasm, visible organelles
 * (rough ER, smooth ER, small mitochondria, golgi apparatus, ribosomes).
 */
export default function CellModel({ hovered }) {
  const cellRef = useRef()
  const organellesRef = useRef()

  // Gentle pulsing and rotation
  useFrame((state) => {
    if (cellRef.current) {
      const t = state.clock.elapsedTime
      cellRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02)
    }
    if (organellesRef.current) {
      organellesRef.current.rotation.y += 0.001
    }
  })

  // Random ribosome positions on surface
  const ribosomes = useMemo(() => {
    const positions = []
    for (let i = 0; i < 40; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 0.85 + Math.random() * 0.1
      positions.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ])
    }
    return positions
  }, [])

  return (
    <group ref={cellRef}>
      {/* ---- CELL MEMBRANE (outer translucent sphere) ---- */}
      <mesh castShadow>
        <sphereGeometry args={[1.2, 48, 48]} />
        <meshPhysicalMaterial
          color="#88ccaa"
          transparent
          opacity={0.15}
          roughness={0.3}
          metalness={0.0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Membrane texture detail — slightly bumpy inner membrane */}
      <mesh>
        <sphereGeometry args={[1.18, 32, 32]} />
        <meshPhysicalMaterial
          color="#66aa88"
          transparent
          opacity={0.08}
          roughness={0.5}
          side={THREE.BackSide}
        />
      </mesh>

      <group ref={organellesRef}>
        {/* ---- NUCLEUS (large dark sphere) ---- */}
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshPhysicalMaterial
            color="#553366"
            transparent
            opacity={0.6}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
        {/* Nucleolus inside */}
        <mesh position={[0.1, 0.05, 0.1]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#883388" roughness={0.6} />
        </mesh>

        {/* ---- MITOCHONDRIA (several capsule shapes) ---- */}
        {[
          { pos: [0.7, 0.2, 0.3], rot: [0.5, 0.3, 0], scale: [0.15, 0.08, 0.08] },
          { pos: [-0.6, -0.3, 0.5], rot: [0, 0.8, 0.3], scale: [0.12, 0.07, 0.07] },
          { pos: [0.3, -0.5, -0.6], rot: [0.2, 0, 0.7], scale: [0.13, 0.07, 0.07] },
          { pos: [-0.4, 0.5, -0.4], rot: [0.3, 1.2, 0], scale: [0.1, 0.06, 0.06] },
        ].map((m, i) => (
          <mesh key={`mito-${i}`} position={m.pos} rotation={m.rot} scale={m.scale} castShadow>
            <capsuleGeometry args={[1, 2.5, 8, 12]} />
            <meshStandardMaterial color="#44aa44" roughness={0.5} metalness={0.1} />
          </mesh>
        ))}

        {/* ---- ENDOPLASMIC RETICULUM (wavy flat shapes around nucleus) ---- */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2
          const r = 0.6
          return (
            <mesh
              key={`er-${i}`}
              position={[Math.cos(angle) * r, (i % 2 - 0.5) * 0.3, Math.sin(angle) * r]}
              rotation={[Math.random() * 0.5, angle, Math.random() * 0.5]}
              castShadow
            >
              <boxGeometry args={[0.3, 0.02, 0.15]} />
              <meshStandardMaterial
                color="#6688aa"
                transparent
                opacity={0.5}
                roughness={0.6}
              />
            </mesh>
          )
        })}

        {/* ---- GOLGI APPARATUS (stacked curved discs) ---- */}
        <group position={[-0.6, 0.1, -0.2]} rotation={[0.3, 0.5, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={`golgi-${i}`} position={[0, i * 0.04 - 0.06, 0]} castShadow>
              <cylinderGeometry args={[0.12 - i * 0.01, 0.12 - i * 0.01, 0.015, 16]} />
              <meshStandardMaterial color="#cc8844" transparent opacity={0.6} roughness={0.4} />
            </mesh>
          ))}
        </group>

        {/* ---- RIBOSOMES (tiny dots on ER and floating) ---- */}
        {ribosomes.map((pos, i) => (
          <mesh key={`ribo-${i}`} position={pos}>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshStandardMaterial color="#ff9966" roughness={0.8} />
          </mesh>
        ))}

        {/* ---- LYSOSOMES (small dark spheres) ---- */}
        {[
          [0.5, -0.3, 0.5],
          [-0.8, 0.3, 0.1],
          [0.1, 0.6, -0.7],
        ].map((pos, i) => (
          <mesh key={`lyso-${i}`} position={pos} castShadow>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#885522" roughness={0.6} />
          </mesh>
        ))}

        {/* ---- CENTROSOME ---- */}
        <group position={[0.3, 0.3, 0.3]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
            <meshStandardMaterial color="#ffcc44" roughness={0.5} />
          </mesh>
          <mesh rotation={[Math.PI / 4, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
            <meshStandardMaterial color="#ffcc44" roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* Cytoplasm glow */}
      <pointLight position={[0, 0, 0]} color="#88ffaa" intensity={hovered ? 0.6 : 0.2} distance={2.5} />
    </group>
  )
}
