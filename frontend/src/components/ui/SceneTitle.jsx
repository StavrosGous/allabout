import { useState } from 'react'
import useSceneStore from '../../stores/sceneStore.js'
import useEditorStore from '../../stores/editorStore.js'

export default function SceneTitle() {
  const sceneData = useSceneStore((s) => s.sceneData)
  const loadScene = useSceneStore((s) => s.loadScene)
  const refineScene = useEditorStore((s) => s.refineScene)
  const sceneRefining = useEditorStore((s) => s.sceneRefining)
  const [showRefine, setShowRefine] = useState(false)
  const [refineFeedback, setRefineFeedback] = useState('')
  const [refineError, setRefineError] = useState(null)

  if (!sceneData) return null

  const handleRefine = async () => {
    if (!refineFeedback.trim()) return
    setRefineError(null)
    const result = await refineScene(sceneData.slug, refineFeedback)
    if (result?.slug) {
      setShowRefine(false)
      setRefineFeedback('')
      await loadScene(result.slug)
    } else {
      setRefineError('Refinement failed. Try again.')
    }
  }

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
      maxWidth: 420,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h1 style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#e0e0e0',
          marginBottom: 4,
          flex: 1,
        }}>
          {sceneData.title}
        </h1>
        {!showRefine && (
          <button
            onClick={() => setShowRefine(true)}
            disabled={sceneRefining}
            title="Refine this scene — tell the AI what to fix"
            style={{
              background: 'rgba(68,136,255,0.12)',
              border: '1px solid rgba(68,136,255,0.3)',
              borderRadius: 6,
              padding: '4px 10px',
              color: sceneRefining ? '#666' : '#88bbff',
              fontSize: 13,
              fontWeight: 700,
              cursor: sceneRefining ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              lineHeight: 1.3,
            }}
          >
            {sceneRefining ? '⏳' : '❗'}
          </button>
        )}
      </div>

      {showRefine && (
        <div style={{
          marginTop: 8, padding: '10px 12px',
          background: 'rgba(68,136,255,0.06)',
          border: '1px solid rgba(68,136,255,0.25)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#88bbff', marginBottom: 6 }}>
            ❗ Refine Scene
          </div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
            Describe what's wrong or what to change. The AI will revise objects, models, layout & more.
          </div>
          <textarea
            value={refineFeedback}
            onChange={(e) => setRefineFeedback(e.target.value)}
            placeholder="e.g. The beaker looks broken, make it taller. Move the microscope closer to the table. Add a bunsen burner..."
            disabled={sceneRefining}
            style={{
              width: '100%',
              minHeight: 60,
              maxHeight: 120,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: 8,
              color: '#ddd',
              fontSize: 12,
              lineHeight: 1.5,
              resize: 'vertical',
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
              boxSizing: 'border-box',
            }}
          />
          {refineError && (
            <div style={{ fontSize: 11, color: '#ff6666', marginTop: 4 }}>
              {refineError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              onClick={handleRefine}
              disabled={sceneRefining || !refineFeedback.trim()}
              style={{
                flex: 1, padding: '7px',
                background: sceneRefining ? 'rgba(68,136,255,0.15)' : 'linear-gradient(135deg, #4488ff, #2266dd)',
                border: 'none', borderRadius: 6, color: '#fff',
                fontSize: 12, fontWeight: 600,
                cursor: (sceneRefining || !refineFeedback.trim()) ? 'not-allowed' : 'pointer',
                opacity: (sceneRefining || !refineFeedback.trim()) ? 0.6 : 1,
              }}
            >
              {sceneRefining ? '⏳ Refining...' : '✨ Refine'}
            </button>
            <button
              onClick={() => { setShowRefine(false); setRefineError(null) }}
              disabled={sceneRefining}
              style={{
                padding: '7px 12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: '#aaa',
                fontSize: 12, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showRefine && sceneData.description && (
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
