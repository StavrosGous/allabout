import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Detailed procedural nucleus model.
 * Nuclear envelope (double membrane), nuclear pores, nucleolus,
 * chromatin network, nuclear lamina.
 */
export default function NucleusModel({ hovered }) {
  const groupRef = useRef()
  const chromatinRef = useRef()

  useFrame((state) => {
    if (chromatinRef.current) {
      chromatinRef.current.rotation.y += 0.002
      chromatinRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05
    }
  })

  // Nuclear pore positions
  const pores = []
  for (let i = 0; i < 20; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 0.81
    pores.push({
      pos: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ],
      rot: [phi, theta, 0],
    })
  }

  return (
    <group ref={groupRef}>
      {/* ---- OUTER NUCLEAR ENVELOPE ---- */}
      <mesh castShadow>
        <sphereGeometry args={[0.82, 48, 48]} />
        <meshPhysicalMaterial
          color="#665588"
          transparent
          opacity={0.2}
          roughness={0.3}
          metalness={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ---- INNER NUCLEAR ENVELOPE ---- */}
      <mesh>
        <sphereGeometry args={[0.78, 48, 48]} />
        <meshPhysicalMaterial
          color="#775599"
          transparent
          opacity={0.12}
          roughness={0.4}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ---- NUCLEAR PORES (ring-shaped complexes) ---- */}
      {pores.map((pore, i) => (
        <mesh key={`pore-${i}`} position={pore.pos} lookAt={[0, 0, 0]}>
          <torusGeometry args={[0.03, 0.008, 6, 8]} />
          <meshStandardMaterial color="#aaaacc" roughness={0.5} metalness={0.2} />
        </mesh>
      ))}

      {/* ---- NUCLEOLUS (dense body inside) ---- */}
      <mesh position={[0.15, 0.1, 0]} castShadow>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshStandardMaterial color="#993388" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Nucleolus inner dense region */}
      <mesh position={[0.18, 0.12, 0.05]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#bb44aa" roughness={0.4} />
      </mesh>

      {/* ---- CHROMATIN (tangled fiber network) ---- */}
      <group ref={chromatinRef}>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2
          const r = 0.3 + (i % 3) * 0.15
          const y = (Math.random() - 0.5) * 0.8
          return (
            <mesh
              key={`chrom-${i}`}
              position={[Math.cos(angle) * r, y, Math.sin(angle) * r]}
              rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
            >
              <torusGeometry args={[0.08 + Math.random() * 0.06, 0.015, 6, 12]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#6644aa' : '#4422aa'}
                roughness={0.6}
                metalness={0.1}
              />
            </mesh>
          )
        })}
      </group>

      {/* ---- NUCLEAR LAMINA (thin shell just inside inner membrane) ---- */}
      <mesh>
        <sphereGeometry args={[0.76, 24, 24]} />
        <meshStandardMaterial
          color="#8877aa"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Inner glow */}
      <pointLight position={[0, 0, 0]} color="#aa66ff" intensity={hovered ? 0.8 : 0.3} distance={2} />
    </group>
  )
}
