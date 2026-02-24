import { useRef, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useSceneStore from '../../stores/sceneStore.js'
import useEditorStore from '../../stores/editorStore.js'
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
  const [dragging, setDragging] = useState(false)
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const dragOffset = useRef(new THREE.Vector3())
  const intersection = useRef(new THREE.Vector3())

  const { setFocusedObject, setSelectedObject, selectedObjectId, sceneData } = useSceneStore()
  const editorOpen = useEditorStore((s) => s.editorOpen)
  const dragMode = useEditorStore((s) => s.dragMode)
  const updateObjectInScene = useEditorStore((s) => s.updateObjectInScene)
  const setDraggingObjectId = useEditorStore((s) => s.setDraggingObjectId)

  const { camera, raycaster } = useThree()

  const isSelected = selectedObjectId === obj.id
  const baseColor = getHighlightColor(obj.highlight_color, obj.label)
  const isDragEnabled = editorOpen && dragMode

  // Hover scale animation
  useFrame((state, delta) => {
    if (!groupRef.current) return
    if (dragging) return // don't animate scale while dragging
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
    document.body.style.cursor = isDragEnabled ? 'grab' : 'pointer'
  }

  const handlePointerOut = (e) => {
    e.stopPropagation()
    if (!dragging) {
      setHovered(false)
      setFocusedObject(null)
      document.body.style.cursor = 'default'
    }
  }

  const handlePointerDown = useCallback((e) => {
    if (!isDragEnabled) return
    e.stopPropagation()

    // Set up the drag plane at the object's current Y position
    const pos = groupRef.current.position
    dragPlane.current.set(new THREE.Vector3(0, 1, 0), -pos.y)

    // Calculate offset between intersection point and object position
    raycaster.ray.intersectPlane(dragPlane.current, intersection.current)
    dragOffset.current.copy(pos).sub(intersection.current)

    setDragging(true)
    setDraggingObjectId(obj.id)
    document.body.style.cursor = 'grabbing'

    // Capture pointer for smooth dragging
    e.target?.setPointerCapture?.(e.pointerId)
  }, [isDragEnabled, raycaster, obj.id, setDraggingObjectId])

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !isDragEnabled) return
    e.stopPropagation()

    raycaster.ray.intersectPlane(dragPlane.current, intersection.current)
    const newPos = intersection.current.add(dragOffset.current)
    groupRef.current.position.set(newPos.x, groupRef.current.position.y, newPos.z)
  }, [dragging, isDragEnabled, raycaster])

  const handlePointerUp = useCallback(async (e) => {
    if (!dragging) return
    e.stopPropagation()
    setDragging(false)
    setDraggingObjectId(null)
    document.body.style.cursor = isDragEnabled ? 'grab' : 'default'

    // Save the new position to backend
    if (groupRef.current && sceneData) {
      const p = groupRef.current.position
      const newPos = [
        Math.round(p.x * 100) / 100,
        Math.round(p.y * 100) / 100,
        Math.round(p.z * 100) / 100,
      ]
      await updateObjectInScene(sceneData.slug, obj.id, {
        transform: {
          position: newPos,
          rotation: obj.transform.rotation,
          scale: obj.transform.scale,
        },
      })
    }
  }, [dragging, isDragEnabled, sceneData, obj, updateObjectInScene, setDraggingObjectId])

  const handleClick = (e) => {
    e.stopPropagation()
    if (!dragging) {
      setSelectedObject(obj.id)
    }
  }

  return (
    <group
      ref={groupRef}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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

      {/* Drag mode indicator */}
      {isDragEnabled && hovered && !dragging && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.85, 0.95, 4]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Active drag indicator */}
      {dragging && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.7, 1.0, 32]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.3} side={THREE.DoubleSide} />
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
            {isDragEnabled && (
              <span style={{
                color: '#ffaa00',
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 600,
              }}>
                DRAG
              </span>
            )}
            {!isDragEnabled && obj.interaction_type === 'zoom_into' && (
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
            {!isDragEnabled && obj.interaction_type !== 'zoom_into' && (
              <span style={{
                color: '#4488ff',
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.5px',
                opacity: 0.8,
              }}>
                EXPLORE ↓
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}
