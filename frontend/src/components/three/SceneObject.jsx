import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useSceneStore from '../../stores/sceneStore.js'
import ProceduralModel from './ProceduralModel.jsx'

function getHighlightColor(highlightColor, label) {
  if (highlightColor) return highlightColor
  const l = (label || '').toLowerCase()
  if (l.includes('microscope')) return '#00ff88'
  if (l.includes('cell')) return '#88ccaa'
  if (l.includes('dna')) return '#ff6644'
  if (l.includes('nucleus')) return '#aa66ff'
  if (l.includes('atom')) return '#4488ff'
  return '#667788'
}

// Fallback for objects without a dedicated model
function FallbackModel({ hovered, label }) {
  const color = getHighlightColor(null, label)
  return (
    <mesh castShadow>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial
        color={hovered ? '#ffffff' : color}
        emissive={hovered ? color : '#000000'}
        emissiveIntensity={hovered ? 0.4 : 0}
        roughness={0.4}
        metalness={0.3}
      />
    </mesh>
  )
}

export default function SceneObject({ obj, knowledgeNode, asset, modelData }) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)
  const { setFocusedObject, setSelectedObject, selectedObjectId } = useSceneStore()

  const isSelected = selectedObjectId === obj.id
  const baseColor = getHighlightColor(obj.highlight_color, obj.label)

  // Hover scale animation
  useFrame((state, delta) => {
    if (!groupRef.current) return
    const targetScale = hovered ? 1.05 : 1.0
    const s = groupRef.current.scale
    s.lerp(
      new THREE.Vector3(
        targetScale * obj.transform.scale[0],
        targetScale * obj.transform.scale[1],
        targetScale * obj.transform.scale[2],
      ),
      0.1
    )
  })

  const handlePointerOver = (e) => {
    e.stopPropagation()
    setHovered(true)
    setFocusedObject(obj.id)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (e) => {
    e.stopPropagation()
    setHovered(false)
    setFocusedObject(null)
    document.body.style.cursor = 'default'
  }

  const handleClick = (e) => {
    e.stopPropagation()
    setSelectedObject(obj.id)
  }

  return (
    <group
      ref={groupRef}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Render data-driven model or fallback */}
      {modelData ? (
        <ProceduralModel modelData={modelData} hovered={hovered} />
      ) : (
        <FallbackModel hovered={hovered} label={obj.label} />
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.8, 0.9, 32]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floating label on hover */}
      {hovered && (
        <Html
          position={[0, 1.8, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            border: `1px solid ${baseColor}50`,
            backdropFilter: 'blur(10px)',
            boxShadow: `0 0 12px ${baseColor}30`,
          }}>
            {obj.label}
            {obj.interaction_type === 'zoom_into' && (
              <span style={{
                color: '#00ff88',
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}>
                ZOOM IN ↓
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}
