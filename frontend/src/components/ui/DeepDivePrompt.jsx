import { useState } from 'react'
import useSceneStore from '../../stores/sceneStore.js'
import useEditorStore from '../../stores/editorStore.js'

/**
 * Prompt shown when a user clicks "Go Deeper" on an object that doesn't
 * have a child scene yet. Offers to generate one with AI or build from scratch.
 */
export default function DeepDivePrompt({ objectLabel, knowledgeNode, onClose }) {
  const { loadScene } = useSceneStore()
  const { generateScene, sceneGenerating, sceneGenError, toggleEditor, openCreateOverlay } = useEditorStore()
  const [generated, setGenerated] = useState(false)

  const topic = knowledgeNode?.title || objectLabel || 'Unknown Topic'

  const handleGenerateAI = async () => {
    const result = await generateScene(topic)
    if (result) {
      setGenerated(true)
      onClose()
      await loadScene(result.slug, true)
    }
  }

  const handleBuildFromScratch = () => {
    onClose()
    toggleEditor()
    openCreateOverlay()
  }

  return (
    <div style={{
      marginTop: 12,
      padding: 16,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
      }}>
        <span style={{ fontSize: 18 }}>🔭</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>
            No deeper scene for "{topic}"
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            Would you like to create one?
          </div>
        </div>
      </div>

      {!sceneGenerating && (
        <div style={{ display: 'flex', gap: 8 }}>
          {/* AI Generate */}
          <button
            onClick={handleGenerateAI}
            disabled={sceneGenerating}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'linear-gradient(135deg, rgba(68,136,255,0.2), rgba(34,102,221,0.15))',
              border: '1px solid rgba(68,136,255,0.4)',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(68,136,255,0.3), rgba(34,102,221,0.25))'
              e.currentTarget.style.borderColor = 'rgba(68,136,255,0.6)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(68,136,255,0.2), rgba(34,102,221,0.15))'
              e.currentTarget.style.borderColor = 'rgba(68,136,255,0.4)'
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 2 }}>✨</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#88bbff' }}>
              Generate with AI
            </div>
            <div style={{ fontSize: 9, color: '#667799', marginTop: 1 }}>
              Auto-create 3D scene
            </div>
          </button>

          {/* Build from scratch */}
          <button
            onClick={handleBuildFromScratch}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.borderColor = 'rgba(0,255,136,0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 2 }}>✏️</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#cccccc' }}>
              Build manually
            </div>
            <div style={{ fontSize: 9, color: '#777', marginTop: 1 }}>
              Open editor
            </div>
          </button>
        </div>
      )}

      {/* Loading state */}
      {sceneGenerating && (
        <div style={{
          textAlign: 'center',
          padding: '12px 0',
        }}>
          <div style={{
            display: 'inline-block',
            animation: 'spin 1.5s linear infinite',
            fontSize: 20,
            marginBottom: 6,
          }}>
            ⚙
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#88bbff' }}>
            Generating scene...
          </div>
          <div style={{ fontSize: 10, color: '#667799', marginTop: 2 }}>
            Creating 3D models & knowledge
          </div>
          <div style={{
            marginTop: 8, height: 3, background: 'rgba(255,255,255,0.06)',
            borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #4488ff, #00ff88)',
              borderRadius: 2,
              animation: 'loading-bar 2s ease-in-out infinite',
            }} />
          </div>
          <style>{`
            @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
            @keyframes loading-bar {
              0% { width: 0%; margin-left: 0% }
              50% { width: 60%; margin-left: 20% }
              100% { width: 0%; margin-left: 100% }
            }
          `}</style>
        </div>
      )}

      {/* Error */}
      {sceneGenError && (
        <div style={{
          marginTop: 8, padding: '6px 10px',
          background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.25)',
          borderRadius: 6, fontSize: 11, color: '#ff6666',
        }}>
          {sceneGenError}
        </div>
      )}
    </div>
  )
}
