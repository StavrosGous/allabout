import useSceneStore from '../../stores/sceneStore.js'

export default function InfoPanel() {
  const { sceneData, selectedObjectId, clearSelection, zoomInto } = useSceneStore()

  if (!selectedObjectId || !sceneData) return null

  const obj = sceneData.objects.find((o) => o.id === selectedObjectId)
  if (!obj) return null

  const kn = obj.knowledge_node_id
    ? sceneData.knowledge_nodes?.[obj.knowledge_node_id]
    : null

  const handleZoom = async () => {
    if (obj.zoom_target_scene_id) {
      // We need to find the slug of the target scene
      // For now, fetch it and zoom
      try {
        const res = await fetch(`/api/v1/scenes/`)
        const scenes = await res.json()
        const target = scenes.find((s) => s.id === obj.zoom_target_scene_id)
        if (target) {
          clearSelection()
          await zoomInto(target.slug)
        }
      } catch (err) {
        console.error('Failed to zoom:', err)
      }
    }
  }

  return (
    <div style={{
      position: 'absolute',
      right: 16,
      top: 16,
      width: 340,
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      background: 'rgba(10, 10, 20, 0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: 20,
      backdropFilter: 'blur(16px)',
      zIndex: 100,
      color: '#e0e0e0',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Close button */}
      <button
        onClick={clearSelection}
        style={{
          position: 'absolute',
          top: 8,
          right: 12,
          background: 'none',
          border: 'none',
          color: '#666',
          fontSize: 20,
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Title */}
      <h2 style={{
        fontSize: 18,
        fontWeight: 600,
        marginBottom: 8,
        color: obj.highlight_color || '#00ff88',
      }}>
        {kn?.title || obj.label}
      </h2>

      {/* Type badge */}
      {kn?.node_type && (
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 500,
          background: 'rgba(255,255,255,0.08)',
          color: '#aaa',
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          {kn.node_type}
        </span>
      )}

      {/* Summary */}
      {kn?.summary && (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#ccc', marginBottom: 16 }}>
          {kn.summary}
        </p>
      )}

      {/* Properties */}
      {kn?.properties && Object.keys(kn.properties).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Properties
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {Object.entries(kn.properties).map(([key, val]) => (
              <div key={key} style={{
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 6,
                fontSize: 12,
              }}>
                <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase' }}>{key}</div>
                <div style={{ color: '#ddd', fontWeight: 500 }}>
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {kn?.tags?.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {kn.tags.map((tag) => (
            <span key={tag} style={{
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              background: 'rgba(0,255,136,0.1)',
              color: '#00ff88',
              border: '1px solid rgba(0,255,136,0.2)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Wikipedia link */}
      {kn?.wikipedia_url && (
        <a
          href={kn.wikipedia_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            fontSize: 12,
            color: '#4488ff',
            textDecoration: 'none',
            marginBottom: 12,
          }}
        >
          📖 Wikipedia →
        </a>
      )}

      {/* Zoom button */}
      {obj.interaction_type === 'zoom_into' && obj.zoom_target_scene_id && (
        <button
          onClick={handleZoom}
          style={{
            display: 'block',
            width: '100%',
            padding: '10px 16px',
            marginTop: 8,
            background: 'linear-gradient(135deg, #00ff88, #00cc66)',
            border: 'none',
            borderRadius: 8,
            color: '#000',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.15s',
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          🔬 Go Deeper →
        </button>
      )}
    </div>
  )
}
