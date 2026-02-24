import useSceneStore from '../../stores/sceneStore.js'

export default function Breadcrumbs() {
  const { zoomStack, zoomOut, loadScene } = useSceneStore()

  if (zoomStack.length <= 1) return null

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'rgba(10, 10, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '8px 12px',
    }}>
      {zoomStack.map((slug, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ color: '#444', fontSize: 12 }}>›</span>}
          <button
            onClick={async () => {
              if (i < zoomStack.length - 1) {
                // Navigate to this level
                const newStack = zoomStack.slice(0, i + 1)
                await loadScene(slug, false)
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: i === zoomStack.length - 1 ? '#00ff88' : '#888',
              fontSize: 12,
              fontWeight: i === zoomStack.length - 1 ? 600 : 400,
              cursor: i < zoomStack.length - 1 ? 'pointer' : 'default',
              padding: '2px 4px',
              borderRadius: 4,
            }}
          >
            {slug.replace(/-/g, ' ')}
          </button>
        </span>
      ))}

      {/* Back button */}
      <button
        onClick={zoomOut}
        style={{
          marginLeft: 8,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#ccc',
          fontSize: 12,
          padding: '4px 10px',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        ← Back
      </button>
    </div>
  )
}
