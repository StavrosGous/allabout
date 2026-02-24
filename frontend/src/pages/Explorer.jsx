import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import SceneViewer from '../components/three/SceneViewer.jsx'
import InfoPanel from '../components/ui/InfoPanel.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import SceneTitle from '../components/ui/SceneTitle.jsx'
import SearchBar from '../components/ui/SearchBar.jsx'
import EditorPanel from '../components/ui/EditorPanel.jsx'
import useSceneStore from '../stores/sceneStore.js'
import useEditorStore from '../stores/editorStore.js'

export default function Explorer({ sceneSlug }) {
  const { slug: urlSlug } = useParams()
  const targetSlug = urlSlug || sceneSlug || 'science-lab'

  const { sceneData, loading, error, loadScene, zoomStack } = useSceneStore()
  const { editorOpen, toggleEditor, loadModels, loadScenes } = useEditorStore()

  // Load available models and scenes when editor is opened
  useEffect(() => {
    if (editorOpen) {
      loadModels()
      loadScenes()
    }
  }, [editorOpen])

  useEffect(() => {
    // Only load if we don't already have this scene
    if (!sceneData || sceneData.slug !== targetSlug) {
      loadScene(targetSlug, zoomStack.length === 0)
    }
  }, [targetSlug])

  if (loading && !sceneData) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        color: '#00ff88',
        fontSize: 18,
      }}>
        Loading scene...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        color: '#ff4444',
        gap: 12,
      }}>
        <div style={{ fontSize: 18 }}>⚠ {error}</div>
        <div style={{ fontSize: 13, color: '#888' }}>
          Make sure the backend is running and the database is seeded.
        </div>
        <button
          onClick={() => loadScene(targetSlug, true)}
          style={{
            marginTop: 8,
            padding: '8px 20px',
            background: '#222',
            border: '1px solid #444',
            color: '#ccc',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SceneViewer sceneData={sceneData} />

      {/* Search bar at top center */}
      <SearchBar />

      {/* Edit toggle button */}
      <button
        onClick={toggleEditor}
        title={editorOpen ? 'Close editor' : 'Open scene editor'}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 150,
          width: 40,
          height: 40,
          borderRadius: 10,
          border: editorOpen ? '1px solid #00ff88' : '1px solid rgba(255,255,255,0.15)',
          background: editorOpen ? 'rgba(0,255,136,0.15)' : 'rgba(20,20,30,0.85)',
          color: editorOpen ? '#00ff88' : '#aaa',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.2s ease',
        }}
      >
        ✏️
      </button>

      {/* Editor panel (slides in from left) */}
      {editorOpen && <EditorPanel sceneSlug={sceneData?.slug} />}

      <Breadcrumbs />
      <InfoPanel />
      <SceneTitle />

      {/* Loading overlay during transitions */}
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10,10,15,0.6)',
          zIndex: 200,
          color: '#00ff88',
          fontSize: 16,
          backdropFilter: 'blur(4px)',
        }}>
          Transitioning...
        </div>
      )}
    </div>
  )
}
