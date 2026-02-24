import { useState, useEffect } from 'react'
import useSceneStore from '../../stores/sceneStore.js'
import useEditorStore from '../../stores/editorStore.js'

export default function HomePage() {
  const { loadScene } = useSceneStore()
  const { generateScene, sceneGenerating } = useEditorStore()
  const [scenes, setScenes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScenes()
  }, [])

  const fetchScenes = async () => {
    try {
      const res = await fetch('/api/v1/scenes/')
      if (res.ok) {
        const data = await res.json()
        setScenes(data)
      }
    } catch (err) {
      console.error('Failed to fetch scenes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSceneClick = (slug) => {
    loadScene(slug, true)
  }

  // Split scenes into categories
  const rootScenes = scenes.filter((s) => !s.parent_scene_id)
  const recentScenes = [...scenes].sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 6)

  // Quick explore suggestions
  const suggestions = [
    { label: 'Solar System', icon: '🪐' },
    { label: 'Human Body', icon: '🫀' },
    { label: 'Ancient Rome', icon: '🏛️' },
    { label: 'Ocean Life', icon: '🐠' },
    { label: 'Rocket Engine', icon: '🚀' },
    { label: 'Music Theory', icon: '🎵' },
  ]

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      background: 'radial-gradient(ellipse at 50% 20%, #0d1117 0%, #060609 70%)',
      color: '#e0e0e0',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '80px 24px 60px',
      }}>
        {/* Hero heading */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: 8,
            letterSpacing: -0.5,
          }}>
            <span style={{ color: '#00ff88' }}>All</span>About
          </h1>
          <p style={{
            fontSize: 15,
            color: '#777',
            maxWidth: 420,
            margin: '0 auto',
            lineHeight: 1.5,
          }}>
            Explore any topic in immersive 3D. Search for anything or pick a scene below to get started.
          </p>
        </div>

        {/* Quick generate chips */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={sectionHeading}>✨ Quick Explore with AI</h2>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
            Click a topic to auto-generate a 3D scene — or search your own above.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map(({ label, icon }) => (
              <button
                key={label}
                disabled={sceneGenerating}
                onClick={async () => {
                  const result = await generateScene(label)
                  if (result) loadScene(result.slug, true)
                }}
                style={{
                  ...chipStyle,
                  opacity: sceneGenerating ? 0.5 : 1,
                  cursor: sceneGenerating ? 'wait' : 'pointer',
                }}
                onMouseOver={(e) => {
                  if (!sceneGenerating) {
                    e.currentTarget.style.background = 'rgba(0,255,136,0.12)'
                    e.currentTarget.style.borderColor = 'rgba(0,255,136,0.4)'
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                }}
              >
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {sceneGenerating && (
            <div style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(68,136,255,0.08)',
              border: '1px solid rgba(68,136,255,0.2)',
              borderRadius: 8,
              fontSize: 13,
              color: '#88bbff',
            }}>
              <span style={{ animation: 'spin 1.5s linear infinite' }}>⚙</span>
              Generating scene... this may take a moment.
              <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>
            Loading scenes...
          </div>
        )}

        {/* Existing scenes */}
        {!loading && rootScenes.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={sectionHeading}>🌐 Explore Scenes</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260, 1fr))',
              gap: 12,
            }}>
              {rootScenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} onClick={() => handleSceneClick(scene.slug)} />
              ))}
            </div>
          </div>
        )}

        {/* Recent scenes */}
        {!loading && recentScenes.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={sectionHeading}>🕐 Recent</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {recentScenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} onClick={() => handleSceneClick(scene.slug)} />
              ))}
            </div>
          </div>
        )}

        {/* All scenes as list */}
        {!loading && scenes.length > 0 && (
          <div>
            <h2 style={sectionHeading}>📚 All Scenes ({scenes.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => handleSceneClick(scene.slug)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#e0e0e0',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.1s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(0,255,136,0.3)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: `hsl(${(scene.slug.charCodeAt(0) * 17) % 360}, 40%, 20%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    flexShrink: 0,
                  }}>
                    {scene.zoom_depth === 0 ? '🌐' : scene.zoom_depth === 1 ? '🔬' : '🔎'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{scene.title}</div>
                    {scene.description && (
                      <div style={{
                        fontSize: 11,
                        color: '#666',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {scene.description}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>
                    {scene.object_count} obj · depth {scene.zoom_depth}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && scenes.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔭</div>
            <div style={{ fontSize: 15, marginBottom: 4 }}>No scenes yet</div>
            <div style={{ fontSize: 12, color: '#555' }}>
              Use the search bar to generate your first scene with AI!
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


// --- Sub-components ---

function SceneCard({ scene, onClick }) {
  const depthColors = ['#00ff88', '#4488ff', '#ff6644', '#ffaa00', '#aa44ff']
  const accentColor = depthColors[scene.zoom_depth % depthColors.length]

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        cursor: 'pointer',
        color: '#e0e0e0',
        fontFamily: "'Inter', sans-serif",
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.borderColor = accentColor + '55'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: accentColor,
        opacity: 0.5,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `${accentColor}15`,
          border: `1px solid ${accentColor}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}>
          {scene.zoom_depth === 0 ? '🌐' : scene.zoom_depth === 1 ? '🔬' : scene.zoom_depth === 2 ? '🧬' : '⚛️'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{scene.title}</div>
          <div style={{
            fontSize: 10, color: '#666',
            display: 'flex', gap: 8,
          }}>
            <span>{scene.object_count} objects</span>
            <span>·</span>
            <span>depth {scene.zoom_depth}</span>
          </div>
        </div>
      </div>

      {scene.description && (
        <div style={{
          fontSize: 12,
          color: '#777',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {scene.description}
        </div>
      )}
    </button>
  )
}


// --- Shared styles ---

const sectionHeading = {
  fontSize: 14,
  fontWeight: 600,
  color: '#ccc',
  marginBottom: 12,
  letterSpacing: 0.3,
}

const chipStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 20,
  color: '#ccc',
  fontSize: 13,
  fontFamily: "'Inter', sans-serif",
  transition: 'all 0.15s ease',
}
