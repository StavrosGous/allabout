import SceneObject from './SceneObject.jsx'

export default function SceneContent({ sceneData }) {
  if (!sceneData) return null

  const { objects, knowledge_nodes, assets } = sceneData

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#111118" roughness={0.9} />
      </mesh>

      {/* Grid helper */}
      <gridHelper args={[20, 20, '#222233', '#1a1a2a']} position={[0, 0, 0]} />

      {/* Scene objects */}
      {objects.map((obj) => {
        const knowledgeNode = obj.knowledge_node_id
          ? knowledge_nodes?.[obj.knowledge_node_id]
          : null
        const asset = obj.asset_id ? assets?.[obj.asset_id] : null

        return (
          <SceneObject
            key={obj.id}
            obj={obj}
            knowledgeNode={knowledgeNode}
            asset={asset}
          />
        )
      })}
    </group>
  )
}
