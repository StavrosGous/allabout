import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Detailed procedural DNA double helix model.
 * Two backbone strands spiraling, base pair rungs connecting them,
 * color-coded bases (A-T red/blue, G-C green/yellow).
 */
export default function DNAModel({ hovered }) {
  const groupRef = useRef()

  // Slow rotation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (hovered ? 0.5 : 0.15)
    }
  })

  const helixData = useMemo(() => {
    const numSteps = 60
    const height = 4
    const radius = 0.4
    const turns = 2.5

    const strand1 = []
    const strand2 = []
    const basePairs = []

    const baseColors = [
      ['#ff4444', '#4488ff'],  // A-T
      ['#44cc44', '#ffcc00'],  // G-C
    ]

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps
      const y = t * height - height / 2
      const angle = t * turns * Math.PI * 2

      const x1 = Math.cos(angle) * radius
      const z1 = Math.sin(angle) * radius
      const x2 = Math.cos(angle + Math.PI) * radius
      const z2 = Math.sin(angle + Math.PI) * radius

      strand1.push(new THREE.Vector3(x1, y, z1))
      strand2.push(new THREE.Vector3(x2, y, z2))

      // Base pair every 3 steps
      if (i % 3 === 0 && i > 0 && i < numSteps) {
        const pairType = i % 6 < 3 ? 0 : 1
        basePairs.push({
          start: [x1, y, z1],
          end: [x2, y, z2],
          mid: [(x1 + x2) / 2, y, (z1 + z2) / 2],
          colors: baseColors[pairType],
          angle: angle,
        })
      }
    }

    return { strand1, strand2, basePairs }
  }, [])

  // Create tube geometries for the backbones
  const tube1 = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(helixData.strand1)
    return new THREE.TubeGeometry(curve, 120, 0.04, 8, false)
  }, [helixData])

  const tube2 = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(helixData.strand2)
    return new THREE.TubeGeometry(curve, 120, 0.04, 8, false)
  }, [helixData])

  return (
    <group ref={groupRef}>
      {/* ---- BACKBONE STRAND 1 (sugar-phosphate) ---- */}
      <mesh geometry={tube1} castShadow>
        <meshStandardMaterial color="#ff6644" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* ---- BACKBONE STRAND 2 ---- */}
      <mesh geometry={tube2} castShadow>
        <meshStandardMaterial color="#4488ff" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* ---- BASE PAIRS (rungs connecting the two strands) ---- */}
      {helixData.basePairs.map((bp, i) => {
        const dx = bp.end[0] - bp.start[0]
        const dy = bp.end[1] - bp.start[1]
        const dz = bp.end[2] - bp.start[2]
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz)

        return (
          <group key={`bp-${i}`}>
            {/* First half of rung (base 1) */}
            <mesh position={[
              (bp.start[0] + bp.mid[0]) / 2,
              (bp.start[1] + bp.mid[1]) / 2,
              (bp.start[2] + bp.mid[2]) / 2,
            ]}>
              <cylinderGeometry args={[0.025, 0.025, len / 2 - 0.02, 6]} />
              <meshStandardMaterial
                color={bp.colors[0]}
                emissive={bp.colors[0]}
                emissiveIntensity={hovered ? 0.3 : 0.1}
                roughness={0.5}
              />
              {/* Rotate to connect start → mid */}
              {(() => {
                // We'll handle rotation via lookAt in a simpler way
                return null
              })()}
            </mesh>

            {/* Second half of rung (base 2) */}
            <mesh position={[
              (bp.end[0] + bp.mid[0]) / 2,
              (bp.end[1] + bp.mid[1]) / 2,
              (bp.end[2] + bp.mid[2]) / 2,
            ]}>
              <cylinderGeometry args={[0.025, 0.025, len / 2 - 0.02, 6]} />
              <meshStandardMaterial
                color={bp.colors[1]}
                emissive={bp.colors[1]}
                emissiveIntensity={hovered ? 0.3 : 0.1}
                roughness={0.5}
              />
            </mesh>

            {/* Hydrogen bond in center (thin connection) */}
            <mesh position={bp.mid}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
            </mesh>
          </group>
        )
      })}

      {/* ---- SUGAR MOLECULES (spheres along backbone) ---- */}
      {helixData.strand1.filter((_, i) => i % 5 === 0).map((pos, i) => (
        <mesh key={`sugar1-${i}`} position={[pos.x, pos.y, pos.z]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#ffaa44" roughness={0.5} />
        </mesh>
      ))}
      {helixData.strand2.filter((_, i) => i % 5 === 0).map((pos, i) => (
        <mesh key={`sugar2-${i}`} position={[pos.x, pos.y, pos.z]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#44aaff" roughness={0.5} />
        </mesh>
      ))}

      {/* Ambient glow */}
      <pointLight position={[0, 0, 0]} color="#ff8844" intensity={hovered ? 0.6 : 0.2} distance={3} />
    </group>
  )
}
