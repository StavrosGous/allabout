import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Detailed procedural desktop computer model.
 * Parts: monitor, monitor stand, keyboard, tower case, mouse.
 */
export default function ComputerModel({ hovered }) {
  const screenRef = useRef()

  // Screen glow flicker
  useFrame((state) => {
    if (screenRef.current) {
      screenRef.current.material.emissiveIntensity = hovered
        ? 0.8 + Math.sin(state.clock.elapsedTime * 5) * 0.1
        : 0.4
    }
  })

  const caseMat = useMemo(() => ({
    color: '#1a1a22',
    metalness: 0.4,
    roughness: 0.6,
  }), [])

  const metalMat = useMemo(() => ({
    color: '#888898',
    metalness: 0.9,
    roughness: 0.15,
  }), [])

  const plasticMat = useMemo(() => ({
    color: '#333340',
    metalness: 0.1,
    roughness: 0.7,
  }), [])

  return (
    <group>
      {/* ---- TOWER CASE ---- */}
      <group position={[-0.6, 0.3, 0]}>
        {/* Main case body */}
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.55, 0.45]} />
          <meshStandardMaterial {...caseMat} />
        </mesh>
        {/* Front panel (slightly lighter) */}
        <mesh position={[0.101, 0, 0]} castShadow>
          <boxGeometry args={[0.005, 0.53, 0.43]} />
          <meshStandardMaterial color="#252530" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Power button */}
        <mesh position={[0.105, 0.22, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.005, 12]} />
          <meshStandardMaterial color={hovered ? '#00ff88' : '#555555'} emissive={hovered ? '#00ff88' : '#222222'} emissiveIntensity={0.8} />
        </mesh>
        {/* LED indicator */}
        <mesh position={[0.105, 0.19, 0]}>
          <sphereGeometry args={[0.006, 8, 8]} />
          <meshStandardMaterial color="#00ff44" emissive="#00ff44" emissiveIntensity={1} />
        </mesh>
        {/* USB ports */}
        {[0, 1].map((j) => (
          <mesh key={`usb-${j}`} position={[0.105, 0.1 - j * 0.03, 0]}>
            <boxGeometry args={[0.004, 0.012, 0.025]} />
            <meshStandardMaterial color="#222228" />
          </mesh>
        ))}
        {/* Vent lines on side */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`vent-${i}`} position={[0, -0.15 + i * 0.04, -0.226]}>
            <boxGeometry args={[0.18, 0.008, 0.002]} />
            <meshStandardMaterial color="#222228" />
          </mesh>
        ))}
      </group>

      {/* ---- MONITOR ---- */}
      <group position={[0.1, 0, 0]}>
        {/* Monitor stand base */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <boxGeometry args={[0.3, 0.02, 0.18]} />
          <meshStandardMaterial {...metalMat} />
        </mesh>
        {/* Monitor stand neck */}
        <mesh position={[0, 0.18, -0.04]} castShadow>
          <boxGeometry args={[0.04, 0.3, 0.04]} />
          <meshStandardMaterial {...metalMat} />
        </mesh>
        {/* Monitor body (bezel) */}
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[0.65, 0.42, 0.03]} />
          <meshStandardMaterial {...caseMat} />
        </mesh>
        {/* Screen */}
        <mesh ref={screenRef} position={[0, 0.49, 0.016]}>
          <planeGeometry args={[0.58, 0.34]} />
          <meshStandardMaterial
            color="#112244"
            emissive="#1a3a6a"
            emissiveIntensity={0.4}
            metalness={0.0}
            roughness={0.3}
          />
        </mesh>
        {/* Screen content: fake text lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`line-${i}`} position={[-0.12 + (i % 2) * 0.05, 0.57 - i * 0.05, 0.017]}>
            <boxGeometry args={[0.2 + (i % 3) * 0.05, 0.008, 0.001]} />
            <meshStandardMaterial color="#44ff88" emissive="#44ff88" emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>

      {/* ---- KEYBOARD ---- */}
      <group position={[0.1, 0.01, 0.3]}>
        {/* Keyboard base */}
        <mesh castShadow>
          <boxGeometry args={[0.45, 0.015, 0.15]} />
          <meshStandardMaterial {...plasticMat} />
        </mesh>
        {/* Key rows */}
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 12 }).map((_, col) => (
            <mesh key={`key-${row}-${col}`} position={[-0.19 + col * 0.035, 0.014, -0.05 + row * 0.033]}>
              <boxGeometry args={[0.028, 0.006, 0.026]} />
              <meshStandardMaterial color="#444450" metalness={0.1} roughness={0.8} />
            </mesh>
          ))
        )}
        {/* Spacebar */}
        <mesh position={[0, 0.014, 0.06]}>
          <boxGeometry args={[0.15, 0.006, 0.026]} />
          <meshStandardMaterial color="#444450" metalness={0.1} roughness={0.8} />
        </mesh>
      </group>

      {/* ---- MOUSE ---- */}
      <group position={[0.42, 0.015, 0.3]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.02, 0.04, 4, 8]} />
          <meshStandardMaterial {...plasticMat} />
        </mesh>
        {/* Scroll wheel */}
        <mesh position={[0, 0.02, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.012, 8]} />
          <meshStandardMaterial color="#555560" />
        </mesh>
      </group>
    </group>
  )
}
