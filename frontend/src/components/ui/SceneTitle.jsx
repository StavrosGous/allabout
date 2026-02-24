import useSceneStore from '../../stores/sceneStore.js'

export default function SceneTitle() {
  const sceneData = useSceneStore((s) => s.sceneData)

  if (!sceneData) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: 16,
      zIndex: 100,
      background: 'rgba(10, 10, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '12px 16px',
      maxWidth: 400,
    }}>
      <h1 style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#e0e0e0',
        marginBottom: 4,
      }}>
        {sceneData.title}
      </h1>
      {sceneData.description && (
        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>
          {sceneData.description}
        </p>
      )}
      <div style={{
        marginTop: 6,
        fontSize: 11,
        color: '#555',
      }}>
        Depth: {sceneData.zoom_depth} · {sceneData.objects.length} object{sceneData.objects.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
