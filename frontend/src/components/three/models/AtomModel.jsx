import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Detailed procedural atom model (Bohr model style).
 * Central nucleus (protons + neutrons), electron orbits with
 * animated electrons, probability cloud.
 */
export default function AtomModel({ hovered }) {
  const electronsRef = useRef([])
  const cloudRef = useRef()

  // Animate electrons orbiting
  useFrame((state) => {
    const t = state.clock.elapsedTime
    electronsRef.current.forEach((el, i) => {
      if (el) {
        const speed = 1.5 + i * 0.5
        const r = 0.5 + i * 0.35
        // Each orbit is on a different plane
        if (i === 0) {
          el.position.x = Math.cos(t * speed) * r
          el.position.y = Math.sin(t * speed) * r * 0.3
          el.position.z = Math.sin(t * speed) * r
        } else if (i === 1) {
          el.position.x = Math.sin(t * speed) * r * 0.5
          el.position.y = Math.cos(t * speed) * r
          el.position.z = Math.sin(t * speed + 1) * r * 0.5
        } else {
          el.position.x = Math.cos(t * speed + 2) * r
          el.position.y = Math.sin(t * speed + 2) * r * 0.7
          el.position.z = Math.cos(t * speed) * r * 0.3
        }
      }
    })
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.003
      cloudRef.current.rotation.x += 0.001
    }
  })

  // Electron probability cloud particles
  const cloudPositions = useMemo(() => {
    const positions = []
    for (let i = 0; i < 200; i++) {
      // Gaussian-ish distribution
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = (Math.random() ** 0.5) * 0.8 + 0.2  // More density near center
      positions.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ])
    }
    return positions
  }, [])

  const orbits = [
    { r: 0.5, tilt: [0, 0, 0.3], color: '#4488ff' },
    { r: 0.85, tilt: [1.2, 0, 0], color: '#44ccff' },
    { r: 1.2, tilt: [0.6, 0.8, 0], color: '#88aaff' },
  ]

  return (
    <group>
      {/* ---- NUCLEUS ---- */}
      {/* Proton */}
      <mesh position={[0.03, 0.02, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ff4444" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Neutron (only for atoms > hydrogen, but looks good) */}
      <mesh position={[-0.03, -0.02, 0.03]} castShadow>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color="#888888" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Nuclear glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color="#ff6644"
          transparent
          opacity={0.15}
          emissive="#ff6644"
          emissiveIntensity={hovered ? 0.8 : 0.3}
        />
      </mesh>

      {/* ---- ELECTRON ORBITS (rings) ---- */}
      {orbits.map((orbit, i) => (
        <mesh key={`orbit-${i}`} rotation={orbit.tilt}>
          <torusGeometry args={[orbit.r, 0.005, 6, 64]} />
          <meshStandardMaterial
            color={orbit.color}
            transparent
            opacity={hovered ? 0.4 : 0.2}
            emissive={orbit.color}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* ---- ELECTRONS (animated spheres) ---- */}
      {orbits.map((orbit, i) => (
        <mesh
          key={`electron-${i}`}
          ref={(el) => { electronsRef.current[i] = el }}
          castShadow
        >
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial
            color={orbit.color}
            emissive={orbit.color}
            emissiveIntensity={1.2}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* ---- ELECTRON PROBABILITY CLOUD ---- */}
      <group ref={cloudRef}>
        {cloudPositions.map((pos, i) => (
          <mesh key={`cloud-${i}`} position={pos}>
            <sphereGeometry args={[0.008, 4, 4]} />
            <meshStandardMaterial
              color="#6688ff"
              transparent
              opacity={0.08}
            />
          </mesh>
        ))}
      </group>

      {/* Center glow */}
      <pointLight position={[0, 0, 0]} color="#ff8844" intensity={hovered ? 1 : 0.4} distance={2} />
    </group>
  )
}
