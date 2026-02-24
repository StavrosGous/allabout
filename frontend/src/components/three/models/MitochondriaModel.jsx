import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Detailed procedural mitochondria model.
 * Outer membrane (smooth capsule), inner membrane with cristae folds,
 * matrix, and ribosomes.
 */
export default function MitochondriaModel({ hovered }) {
  const groupRef = useRef()

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  // Cristae (inner membrane folds)
  const cristae = []
  for (let i = 0; i < 6; i++) {
    const x = -0.5 + i * 0.18
    const h = 0.12 + Math.sin(i * 1.5) * 0.04
    cristae.push({ x, h })
  }

  return (
    <group ref={groupRef}>
      {/* ---- OUTER MEMBRANE ---- */}
      <mesh castShadow>
        <capsuleGeometry args={[0.35, 1.0, 16, 24]} />
        <meshPhysicalMaterial
          color="#44aa55"
          transparent
          opacity={0.3}
          roughness={0.3}
          metalness={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ---- INNER MEMBRANE ---- */}
      <mesh>
        <capsuleGeometry args={[0.3, 0.9, 12, 20]} />
        <meshPhysicalMaterial
          color="#55cc66"
          transparent
          opacity={0.2}
          roughness={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ---- CRISTAE (folded inner membrane ridges) ---- */}
      {cristae.map((c, i) => (
        <group key={`crista-${i}`} position={[0, c.x, 0]} rotation={[0, 0, 0]}>
          {/* Each crista is a curved shelf-like structure */}
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.015, c.h]} />
            <meshStandardMaterial color="#66dd77" transparent opacity={0.5} roughness={0.4} />
          </mesh>
          {/* Curved edge of crista */}
          <mesh position={[0.22, 0, 0]}>
            <cylinderGeometry args={[c.h / 2, c.h / 2, 0.015, 8, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#66dd77" transparent opacity={0.5} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* ---- MATRIX (inner space — faint fill) ---- */}
      <mesh>
        <capsuleGeometry args={[0.28, 0.85, 8, 12]} />
        <meshStandardMaterial color="#88ee99" transparent opacity={0.06} />
      </mesh>

      {/* ---- MITOCHONDRIAL DNA (small circular ring) ---- */}
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.06, 0.01, 8, 16]} />
        <meshStandardMaterial color="#ffaa44" roughness={0.5} />
      </mesh>

      {/* ---- RIBOSOMES (tiny dots) ---- */}
      {Array.from({ length: 15 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2
        const y = (Math.random() - 0.5) * 0.8
        const r = 0.15 + Math.random() * 0.1
        return (
          <mesh key={`ribo-${i}`} position={[Math.cos(angle) * r, y, Math.sin(angle) * r]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshStandardMaterial color="#ffcc66" roughness={0.8} />
          </mesh>
        )
      })}

      {/* ---- ATP SYNTHASE complexes (tiny mushroom shapes in inner membrane) ---- */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const r = 0.3
        return (
          <group key={`atp-${i}`} position={[Math.cos(angle) * r, (i % 3 - 1) * 0.2, Math.sin(angle) * r]}>
            <mesh>
              <cylinderGeometry args={[0.008, 0.008, 0.04, 6]} />
              <meshStandardMaterial color="#aacc33" />
            </mesh>
            <mesh position={[0, 0.025, 0]}>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshStandardMaterial color="#ccee44" />
            </mesh>
          </group>
        )
      })}

      {/* Glow */}
      <pointLight position={[0, 0, 0]} color="#44ff66" intensity={hovered ? 0.5 : 0.15} distance={1.5} />
    </group>
  )
}
