import { useState, useEffect, useCallback } from 'react'
import useSceneStore from '../../stores/sceneStore.js'
import useEditorStore from '../../stores/editorStore.js'

export default function InfoPanel() {
  const { sceneData, selectedObjectId, clearSelection, zoomInto } = useSceneStore()
  const { fetchWikiContent, updateNodeContent, getNodeContent } = useEditorStore()

  const [wikiContent, setWikiContent] = useState(null)
  const [wikiLoading, setWikiLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Derive obj and kn BEFORE hooks (no early returns before hooks!)
  const obj = selectedObjectId && sceneData
    ? sceneData.objects.find((o) => o.id === selectedObjectId)
    : null

  const kn = obj?.knowledge_node_id
    ? sceneData?.knowledge_nodes?.[obj.knowledge_node_id]
    : null

  const knSlug = kn?.slug || null

  // Fetch Wikipedia content when an object with a knowledge node is selected
  const loadContent = useCallback(async () => {
    if (!knSlug) return
    setWikiLoading(true)
    try {
      const data = await getNodeContent(knSlug)
      if (data?.full_content) {
        setWikiContent(data.full_content)
      } else {
        setWikiContent(null)
      }
    } catch {
      setWikiContent(null)
    }
    setWikiLoading(false)
  }, [knSlug, getNodeContent])

  useEffect(() => {
    setWikiContent(null)
    setEditing(false)
    setExpanded(false)
    if (knSlug) {
      loadContent()
    }
  }, [selectedObjectId, knSlug, loadContent])

  // Early return AFTER all hooks
  if (!selectedObjectId || !sceneData || !obj) return null

  const handleFetchWiki = async () => {
    if (!kn?.slug) return
    setWikiLoading(true)
    const result = await fetchWikiContent(kn.slug)
    if (result?.full_content) {
      setWikiContent(result.full_content)
    }
    setWikiLoading(false)
  }

  const handleStartEdit = () => {
    setEditText(wikiContent || '')
    setEditing(true)
  }

  const handleSave = async () => {
    if (!kn?.slug) return
    setSaving(true)
    await updateNodeContent(kn.slug, editText)
    setWikiContent(editText)
    setEditing(false)
    setSaving(false)
  }

  const handleZoom = async () => {
    if (obj.zoom_target_scene_id) {
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

  // Truncate for preview
  const maxPreview = 600
  const displayContent = wikiContent
    ? (expanded ? wikiContent : wikiContent.slice(0, maxPreview))
    : null
  const isTruncated = wikiContent && wikiContent.length > maxPreview && !expanded

  return (
    <div style={{
      position: 'absolute',
      right: 16,
      top: 16,
      width: 380,
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
          position: 'absolute', top: 8, right: 12,
          background: 'none', border: 'none', color: '#666',
          fontSize: 20, cursor: 'pointer', lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Title */}
      <h2 style={{
        fontSize: 18, fontWeight: 600, marginBottom: 8,
        color: obj.highlight_color || '#00ff88',
      }}>
        {kn?.title || obj.label}
      </h2>

      {/* Type badge */}
      {kn?.node_type && (
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 4,
          fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.08)',
          color: '#aaa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1,
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
                padding: '6px 8px', background: 'rgba(255,255,255,0.04)',
                borderRadius: 6, fontSize: 12,
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
              padding: '2px 8px', borderRadius: 12, fontSize: 11,
              background: 'rgba(0,255,136,0.1)', color: '#00ff88',
              border: '1px solid rgba(0,255,136,0.2)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Wikipedia Content Section */}
      {kn?.slug && (
        <div style={{
          marginBottom: 16, borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
              Content
            </h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {!wikiContent && !wikiLoading && (
                <button
                  onClick={handleFetchWiki}
                  style={{
                    background: 'rgba(68,136,255,0.15)', border: '1px solid rgba(68,136,255,0.3)',
                    borderRadius: 6, padding: '4px 10px', color: '#4488ff',
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  Fetch Wikipedia
                </button>
              )}
              {wikiContent && !editing && (
                <>
                  <button
                    onClick={handleStartEdit}
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6, padding: '4px 8px', color: '#aaa',
                      fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={handleFetchWiki}
                    style={{
                      background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '4px 8px', color: '#666',
                      fontSize: 11, cursor: 'pointer',
                    }}
                    title="Re-fetch from Wikipedia"
                  >
                    🔄
                  </button>
                </>
              )}
            </div>
          </div>

          {wikiLoading && (
            <div style={{ color: '#00ff88', fontSize: 12, padding: 8 }}>
              Fetching content...
            </div>
          )}

          {/* Edit mode */}
          {editing && (
            <div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{
                  width: '100%', minHeight: 200, maxHeight: 400,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: 10, color: '#ddd', fontSize: 13,
                  lineHeight: 1.6, resize: 'vertical', outline: 'none',
                  fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '8px', background: '#00cc66',
                    border: 'none', borderRadius: 6, color: '#000',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    flex: 1, padding: '8px',
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

          {/* Display mode */}
          {!editing && displayContent && (
            <div>
              <div style={{
                fontSize: 13, lineHeight: 1.7, color: '#bbb',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {displayContent}
                {isTruncated && '...'}
              </div>
              {isTruncated && (
                <button
                  onClick={() => setExpanded(true)}
                  style={{
                    background: 'none', border: 'none', color: '#4488ff',
                    fontSize: 12, cursor: 'pointer', padding: '4px 0', marginTop: 4,
                  }}
                >
                  Show more
                </button>
              )}
              {expanded && wikiContent.length > maxPreview && (
                <button
                  onClick={() => setExpanded(false)}
                  style={{
                    background: 'none', border: 'none', color: '#4488ff',
                    fontSize: 12, cursor: 'pointer', padding: '4px 0', marginTop: 4,
                  }}
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Wikipedia link */}
      {kn?.wikipedia_url && (
        <a
          href={kn.wikipedia_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block', fontSize: 12,
            color: '#4488ff', textDecoration: 'none', marginBottom: 12,
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
            display: 'block', width: '100%', padding: '10px 16px', marginTop: 8,
            background: 'linear-gradient(135deg, #00ff88, #00cc66)',
            border: 'none', borderRadius: 8, color: '#000',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
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
