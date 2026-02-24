import { useMemo } from 'react'
import * as THREE from 'three'
import SceneObject from './SceneObject.jsx'

/**
 * Per-zoom-depth environment backgrounds.
 * Lab: floor + lab table + walls
 * Microscope: circular viewport + dark surround
 * Cell: organic membrane particles
 * Nucleus: dark void with floating chromatin dust
 * DNA/Molecular: void with particle field
 */
function LabEnvironment() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#181820" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Grid */}
      <gridHelper args={[20, 40, '#1a1a2e', '#141420']} position={[0, 0, 0]} />

      {/* Lab table */}
      <mesh position={[0, 0.4, -1]} receiveShadow castShadow>
        <boxGeometry args={[5, 0.08, 2.5]} />
        <meshStandardMaterial color="#3a3040" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Table legs */}
      {[[-2.3, 0.2, -2], [2.3, 0.2, -2], [-2.3, 0.2, 0.2], [2.3, 0.2, 0.2]].map((pos, i) => (
        <mesh key={`leg-${i}`} position={pos} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
          <meshStandardMaterial color="#555560" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Back wall (subtle) */}
      <mesh position={[0, 3, -5]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#121218" roughness={0.9} metalness={0} />
      </mesh>

      {/* Ceiling light strip */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[3, 0.02, 0.15]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

function MicroscopeEnvironment() {
  return (
    <group>
      {/* Circular viewport vignette (ring) */}
      <mesh position={[0, 0, -2]} rotation={[0, 0, 0]}>
        <ringGeometry args={[4, 8, 48]} />
        <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
      </mesh>

      {/* Circular bright field background */}
      <mesh position={[0, 0, -3]}>
        <circleGeometry args={[5, 48]} />
        <meshBasicMaterial color="#081828" />
      </mesh>

      {/* Floating micro particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={`particle-${i}`} position={[
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 4 - 1,
        ]}>
          <sphereGeometry args={[0.02 + Math.random() * 0.03, 6, 6]} />
          <meshStandardMaterial
            color="#88ccff"
            transparent
            opacity={0.15 + Math.random() * 0.1}
            emissive="#88ccff"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

function CellEnvironment() {
  return (
    <group>
      {/* Extracellular fluid (subtle particles) */}
      {Array.from({ length: 60 }).map((_, i) => (
        <mesh key={`extra-${i}`} position={[
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
        ]}>
          <sphereGeometry args={[0.015 + Math.random() * 0.02, 4, 4]} />
          <meshStandardMaterial
            color="#44aa88"
            transparent
            opacity={0.1}
            emissive="#44aa88"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Distant other cells (faint spheres) */}
      {[
        [6, 2, -4], [-5, -3, -3], [3, -4, -6], [-4, 3, -5],
      ].map((pos, i) => (
        <mesh key={`bg-cell-${i}`} position={pos}>
          <sphereGeometry args={[0.8 + Math.random() * 0.5, 16, 16]} />
          <meshStandardMaterial
            color="#55aa77"
            transparent
            opacity={0.05}
            emissive="#55aa77"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

function NuclearEnvironment() {
  return (
    <group>
      {/* Nucleoplasm particles */}
      {Array.from({ length: 40 }).map((_, i) => (
        <mesh key={`nucleo-${i}`} position={[
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
        ]}>
          <sphereGeometry args={[0.01 + Math.random() * 0.015, 4, 4]} />
          <meshStandardMaterial
            color="#8866cc"
            transparent
            opacity={0.12}
            emissive="#8866cc"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

function MolecularEnvironment() {
  return (
    <group>
      {/* Void with sparse glowing particles */}
      {Array.from({ length: 80 }).map((_, i) => (
        <mesh key={`mol-${i}`} position={[
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ]}>
          <sphereGeometry args={[0.005 + Math.random() * 0.008, 4, 4]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#ff8844' : '#4488ff'}
            emissive={i % 2 === 0 ? '#ff8844' : '#4488ff'}
            emissiveIntensity={0.5}
            transparent
            opacity={0.2}
          />
        </mesh>
      ))}
    </group>
  )
}

export default function SceneContent({ sceneData }) {
  if (!sceneData) return null

  const { objects, knowledge_nodes, assets, zoom_depth: depth } = sceneData

  const Environment = useMemo(() => {
    switch (depth) {
      case 0: return LabEnvironment
      case 1: return MicroscopeEnvironment
      case 2: return CellEnvironment
      case 3: return NuclearEnvironment
      case 4: return MolecularEnvironment
      default: return LabEnvironment
    }
  }, [depth])

  return (
    <group>
      {/* Per-scene environment */}
      <Environment />

      {/* Scene objects */}
      {objects.map((obj) => {
        const knowledgeNode = obj.knowledge_node_id
          ? knowledge_nodes?.[obj.knowledge_node_id]
          : null
        const asset = obj.asset_id ? assets?.[obj.asset_id] : null
        const modelData = obj.model_slug ? sceneData.models?.[obj.model_slug] : null

        return (
          <SceneObject
            key={obj.id}
            obj={obj}
            knowledgeNode={knowledgeNode}
            asset={asset}
            modelData={modelData}
          />
        )
      })}
    </group>
  )
}
