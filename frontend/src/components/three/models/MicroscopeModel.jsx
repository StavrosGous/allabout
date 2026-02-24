import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Detailed procedural microscope model.
 * Parts: base, pillar/arm, stage, sub-stage condenser,
 *        revolving nosepiece, objective lenses, body tube, eyepiece.
 */
export default function MicroscopeModel({ hovered }) {
  const groupRef = useRef()
  const focusGlowRef = useRef()

  // Subtle breathing glow when hovered
  useFrame((state) => {
    if (focusGlowRef.current) {
      focusGlowRef.current.intensity = hovered
        ? 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2
        : 0
    }
  })

  const metalMat = useMemo(() => ({
    color: '#2a2a2e',
    metalness: 0.85,
    roughness: 0.2,
  }), [])

  const chromeMat = useMemo(() => ({
    color: '#c0c0c8',
    metalness: 0.95,
    roughness: 0.1,
  }), [])

  const blackMat = useMemo(() => ({
    color: '#111115',
    metalness: 0.3,
    roughness: 0.7,
  }), [])

  const lensMat = useMemo(() => ({
    color: '#aaddff',
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.6,
  }), [])

  return (
    <group ref={groupRef}>
      {/* Point light for hover glow */}
      <pointLight ref={focusGlowRef} position={[0, 1.2, 0]} color="#00ff88" intensity={0} distance={3} />

      {/* ---- BASE ---- horseshoe/rectangular heavy base */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.12, 32]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      {/* ---- PILLAR (vertical arm) ---- */}
      <mesh position={[0, 0.7, -0.3]} castShadow>
        <boxGeometry args={[0.12, 1.2, 0.12]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      {/* ---- ARM (curved top connecting pillar to body tube) ---- */}
      <mesh position={[0, 1.3, -0.15]} castShadow rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.35]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      {/* ---- STAGE (flat platform for slides) ---- */}
      <mesh position={[0, 0.55, 0.05]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.04, 32]} />
        <meshStandardMaterial {...chromeMat} />
      </mesh>
      {/* Stage clips */}
      <mesh position={[0.15, 0.58, 0.05]} castShadow>
        <boxGeometry args={[0.06, 0.02, 0.12]} />
        <meshStandardMaterial {...chromeMat} />
      </mesh>
      <mesh position={[-0.15, 0.58, 0.05]} castShadow>
        <boxGeometry args={[0.06, 0.02, 0.12]} />
        <meshStandardMaterial {...chromeMat} />
      </mesh>

      {/* ---- SUB-STAGE CONDENSER ---- */}
      <mesh position={[0, 0.42, 0.05]} castShadow>
        <cylinderGeometry args={[0.12, 0.08, 0.12, 16]} />
        <meshStandardMaterial {...blackMat} />
      </mesh>

      {/* ---- COARSE/FINE FOCUS KNOBS (side wheels) ---- */}
      {[-1, 1].map((side) => (
        <group key={`knob-${side}`} position={[side * 0.22, 0.7, -0.3]}>
          {/* Large coarse knob */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
            <meshStandardMaterial {...blackMat} />
          </mesh>
          {/* Small fine knob */}
          <mesh position={[side * 0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
            <meshStandardMaterial {...metalMat} />
          </mesh>
        </group>
      ))}

      {/* ---- REVOLVING NOSEPIECE (turret) ---- */}
      <mesh position={[0, 0.75, 0.05]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 0.06, 6]} />
        <meshStandardMaterial {...chromeMat} />
      </mesh>

      {/* ---- OBJECTIVE LENSES (3 lenses radiating from nosepiece) ---- */}
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI - Math.PI / 2
        const len = [0.12, 0.16, 0.22][i]
        const rad = [0.03, 0.025, 0.02][i]
        return (
          <group key={`obj-${i}`} position={[Math.sin(angle) * 0.1, 0.72 - len / 2, 0.05 + Math.cos(angle) * 0.1]}>
            <mesh castShadow>
              <cylinderGeometry args={[rad, rad * 1.2, len, 12]} />
              <meshStandardMaterial {...chromeMat} />
            </mesh>
            {/* Lens at bottom */}
            <mesh position={[0, -len / 2, 0]} castShadow>
              <sphereGeometry args={[rad, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial {...lensMat} />
            </mesh>
          </group>
        )
      })}

      {/* ---- BODY TUBE ---- */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      {/* ---- EYEPIECE ---- */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.05, 0.12, 16]} />
        <meshStandardMaterial {...blackMat} />
      </mesh>
      {/* Eyepiece lens */}
      <mesh position={[0, 1.46, 0]}>
        <circleGeometry args={[0.065, 24]} />
        <meshStandardMaterial {...lensMat} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
