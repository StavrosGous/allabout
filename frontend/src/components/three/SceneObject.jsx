import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useSceneStore from '../../stores/sceneStore.js'

// Generate a procedural shape based on the object label for visual variety
function getGeometry(label) {
  const l = (label || '').toLowerCase()
  if (l.includes('microscope')) return <cylinderGeometry args={[0.15, 0.3, 1.5, 16]} />
  if (l.includes('beaker')) return <cylinderGeometry args={[0.25, 0.2, 0.6, 12]} />
  if (l.includes('globe')) return <sphereGeometry args={[0.6, 24, 24]} />
  if (l.includes('computer') || l.includes('pc')) return <boxGeometry args={[0.8, 0.5, 0.6]} />
  if (l.includes('bookshelf')) return <boxGeometry args={[1.2, 1.8, 0.4]} />
  if (l.includes('periodic')) return <boxGeometry args={[2, 1.5, 0.05]} />
  if (l.includes('cell')) return <sphereGeometry args={[1.2, 24, 24]} />
  if (l.includes('nucleus')) return <sphereGeometry args={[0.8, 24, 24]} />
  if (l.includes('mitochond')) return <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
  if (l.includes('dna')) return <torusKnotGeometry args={[0.6, 0.1, 128, 16, 2, 3]} />
  if (l.includes('atom') || l.includes('hydrogen')) return <icosahedronGeometry args={[0.3, 2]} />
  return <boxGeometry args={[0.8, 0.8, 0.8]} />
}

function getColor(highlightColor, label) {
  if (highlightColor) return highlightColor
  const l = (label || '').toLowerCase()
  if (l.includes('microscope')) return '#aabbcc'
  if (l.includes('cell')) return '#88ccaa'
  if (l.includes('dna')) return '#ff6644'
  return '#667788'
}

export default function SceneObject({ obj, knowledgeNode, asset }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const { setFocusedObject, setSelectedObject, zoomInto, focusedObjectId, selectedObjectId } = useSceneStore()

  const isSelected = selectedObjectId === obj.id
  const baseColor = getColor(obj.highlight_color, obj.label)

  // Animate on hover
  useFrame((state, delta) => {
    if (!meshRef.current) return
    const scale = hovered ? 1.08 : 1.0
    meshRef.current.scale.lerp(
      new THREE.Vector3(scale, scale, scale).multiply(
        new THREE.Vector3(...obj.transform.scale)
      ),
      0.1
    )
    // Subtle rotation for visual interest
    if (hovered) {
      meshRef.current.rotation.y += delta * 0.3
    }
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
    if (obj.interaction_type === 'zoom_into' && obj.zoom_target_scene_id) {
      // Find the target scene slug — we need to look it up
      // For now, we handle this via the info panel's "Go Deeper" button
      setSelectedObject(obj.id)
    } else {
      setSelectedObject(obj.id)
    }
  }

  return (
    <group position={obj.transform.position} rotation={obj.transform.rotation}>
      <mesh
        ref={meshRef}
        castShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        {getGeometry(obj.label)}
        <meshStandardMaterial
          color={hovered ? '#ffffff' : baseColor}
          emissive={hovered ? baseColor : '#000000'}
          emissiveIntensity={hovered ? 0.4 : 0}
          roughness={0.4}
          metalness={0.3}
          transparent={obj.label.toLowerCase().includes('cell')}
          opacity={obj.label.toLowerCase().includes('cell') ? 0.7 : 1}
        />
      </mesh>

      {/* Floating label on hover */}
      {hovered && (
        <Html
          position={[0, 1.2, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            border: `1px solid ${baseColor}40`,
            backdropFilter: 'blur(8px)',
          }}>
            {obj.label}
            {obj.interaction_type === 'zoom_into' && (
              <span style={{ color: '#00ff88', marginLeft: 6, fontSize: 11 }}>⬇ zoom</span>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}
