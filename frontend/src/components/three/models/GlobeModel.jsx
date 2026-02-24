import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Detailed procedural globe model.
 * Sphere with continents texture (procedural), axis rod, and stand.
 * Features: meridians, latitude lines, slow rotation.
 */
export default function GlobeModel({ hovered }) {
  const globeRef = useRef()

  // Slow auto-rotation
  useFrame((state, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * (hovered ? 0.4 : 0.1)
    }
  })

  const oceanMat = useMemo(() => ({
    color: '#1a5599',
    metalness: 0.1,
    roughness: 0.4,
  }), [])

  const metalMat = useMemo(() => ({
    color: '#998866',
    metalness: 0.8,
    roughness: 0.2,
  }), [])

  // Create latitude/longitude line geometry
  const latLines = useMemo(() => {
    const lines = []
    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const theta = (lat * Math.PI) / 180
      const r = Math.cos(theta) * 0.605
      const y = Math.sin(theta) * 0.605
      lines.push({ r, y })
    }
    return lines
  }, [])

  return (
    <group>
      {/* ---- STAND BASE ---- */}
      <mesh position={[0, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.06, 24]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      {/* ---- STAND PILLAR ---- */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.6, 12]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      {/* ---- MERIDIAN RING (half-circle frame) ---- */}
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.65, 0.015, 8, 48, Math.PI]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      {/* ---- GLOBE SPHERE ---- */}
      <group ref={globeRef} position={[0, 0.55, 0]} rotation={[0.4, 0, 0]}>
        {/* Ocean surface */}
        <mesh castShadow>
          <sphereGeometry args={[0.6, 48, 48]} />
          <meshStandardMaterial {...oceanMat} />
        </mesh>

        {/* Simplified procedural "continents" — irregular patches */}
        {/* North America-ish */}
        <mesh position={[-0.1, 0.35, 0.45]} rotation={[0.2, -0.3, 0]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial color="#3d8c40" roughness={0.8} metalness={0} />
        </mesh>
        {/* South America-ish */}
        <mesh position={[0.1, -0.05, 0.55]} rotation={[0, -0.3, 0.2]}>
          <sphereGeometry args={[0.14, 8, 8]} />
          <meshStandardMaterial color="#4d9c44" roughness={0.8} metalness={0} />
        </mesh>
        {/* Africa-ish */}
        <mesh position={[0.35, 0.15, 0.42]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#6d8c30" roughness={0.8} metalness={0} />
        </mesh>
        {/* Europe-ish */}
        <mesh position={[0.2, 0.42, 0.35]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshStandardMaterial color="#5d9c50" roughness={0.8} metalness={0} />
        </mesh>
        {/* Asia-ish */}
        <mesh position={[0.45, 0.3, -0.2]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color="#4d7c34" roughness={0.8} metalness={0} />
        </mesh>
        {/* Australia-ish */}
        <mesh position={[0.4, -0.25, -0.35]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshStandardMaterial color="#8d8c40" roughness={0.8} metalness={0} />
        </mesh>
        {/* Antarctica-ish */}
        <mesh position={[0, -0.58, 0]}>
          <sphereGeometry args={[0.15, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 4]} />
          <meshStandardMaterial color="#ddeedd" roughness={0.5} metalness={0} />
        </mesh>

        {/* Latitude lines */}
        {latLines.map((l, i) => (
          <mesh key={`lat-${i}`} position={[0, l.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[l.r, 0.004, 4, 48]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.2} />
          </mesh>
        ))}

        {/* Longitude lines (equator is already a lat line) */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={`lng-${i}`} rotation={[0, (i / 6) * Math.PI, 0]}>
            <torusGeometry args={[0.605, 0.004, 4, 48]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.15} />
          </mesh>
        ))}

        {/* Axis rod through poles */}
        <mesh>
          <cylinderGeometry args={[0.01, 0.01, 1.4, 6]} />
          <meshStandardMaterial {...metalMat} />
        </mesh>
      </group>
    </group>
  )
}
