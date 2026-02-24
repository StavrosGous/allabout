import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import SceneViewer from '../components/three/SceneViewer.jsx'
import InfoPanel from '../components/ui/InfoPanel.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import SceneTitle from '../components/ui/SceneTitle.jsx'
import useSceneStore from '../stores/sceneStore.js'

export default function Explorer({ sceneSlug }) {
  const { slug: urlSlug } = useParams()
  const targetSlug = urlSlug || sceneSlug || 'science-lab'

  const { sceneData, loading, error, loadScene, zoomStack } = useSceneStore()

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
