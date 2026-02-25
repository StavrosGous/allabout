import useSceneStore from '../../stores/sceneStore.js'
import useEditorStore from '../../stores/editorStore.js'

export default function Breadcrumbs() {
  const { zoomStack, zoomOut, loadScene, goHome, sceneData } = useSceneStore()
  const editorOpen = useEditorStore((s) => s.editorOpen)

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: editorOpen && sceneData ? 352 : (sceneData ? 64 : 16),
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'rgba(10, 10, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '8px 12px',
      transition: 'left 0.2s ease',
    }}>
      {/* Home button — always visible */}
      <button
        onClick={goHome}
        style={{
          background: !sceneData ? 'rgba(0,255,136,0.12)' : 'none',
          border: 'none',
          color: !sceneData ? '#00ff88' : '#888',
          fontSize: 14,
          cursor: 'pointer',
          padding: '2px 6px',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          transition: 'color 0.15s',
        }}
        title="Go to home"
      >
        🏠 <span style={{ fontSize: 12, fontWeight: 500 }}>Home</span>
      </button>

      {/* Scene path */}
      {zoomStack.map((slug, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#444', fontSize: 12 }}>›</span>
          <button
            onClick={async () => {
              if (i < zoomStack.length - 1) {
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

      {/* Back button — only when deeper than root scene */}
      {zoomStack.length > 1 && (
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
      )}
    </div>
  )
}
