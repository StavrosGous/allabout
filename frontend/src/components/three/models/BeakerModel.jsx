import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Detailed procedural beaker with liquid, graduated markings,
 * and a glass spout.
 */
export default function BeakerModel({ hovered }) {
  const liquidRef = useRef()

  // Subtle liquid wobble
  useFrame((state) => {
    if (liquidRef.current) {
      liquidRef.current.position.y = 0.28 + Math.sin(state.clock.elapsedTime * 1.5) * 0.005
    }
  })

  const glassMat = useMemo(() => ({
    color: '#ddeeff',
    metalness: 0.0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  }), [])

  const liquidMat = useMemo(() => ({
    color: '#22aaff',
    metalness: 0.0,
    roughness: 0.2,
    transparent: true,
    opacity: 0.6,
  }), [])

  // Create beaker profile using LatheGeometry
  const beakerGeo = useMemo(() => {
    const points = []
    // Bottom flat
    points.push(new THREE.Vector2(0, 0))
    points.push(new THREE.Vector2(0.24, 0))
    // Slight curve at bottom
    points.push(new THREE.Vector2(0.25, 0.02))
    // Straight walls going up
    points.push(new THREE.Vector2(0.25, 0.55))
    // Slight flare at top (pour spout area)
    points.push(new THREE.Vector2(0.27, 0.58))
    points.push(new THREE.Vector2(0.28, 0.6))
    // Inner lip
    points.push(new THREE.Vector2(0.26, 0.6))
    // Inner wall going down
    points.push(new THREE.Vector2(0.23, 0.58))
    points.push(new THREE.Vector2(0.23, 0.02))
    points.push(new THREE.Vector2(0, 0.02))
    return new THREE.LatheGeometry(points, 32)
  }, [])

  return (
    <group>
      {/* Beaker body (lathe glass) */}
      <mesh geometry={beakerGeo} castShadow>
        <meshStandardMaterial {...glassMat} />
      </mesh>

      {/* Liquid inside */}
      <mesh ref={liquidRef} position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.5, 24]} />
        <meshStandardMaterial {...liquidMat} />
      </mesh>
      {/* Liquid top surface */}
      <mesh position={[0, 0.53, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 24]} />
        <meshStandardMaterial color="#44bbff" transparent opacity={0.5} />
      </mesh>

      {/* Graduated markings (thin horizontal lines) */}
      {[0.12, 0.22, 0.32, 0.42].map((y, i) => (
        <mesh key={`mark-${i}`} position={[0.252, y, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.005, 0.008, 0.08]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Bottom disc (slightly visible) */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.24, 24]} />
        <meshStandardMaterial color="#ddeeff" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
