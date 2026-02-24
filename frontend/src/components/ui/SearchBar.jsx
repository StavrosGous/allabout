import { useState, useCallback, useEffect, useRef } from 'react'
import useEditorStore from '../../stores/editorStore.js'
import useSceneStore from '../../stores/sceneStore.js'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [noSceneForQuery, setNoSceneForQuery] = useState(false)
  const [checkedQuery, setCheckedQuery] = useState('')
  const { searchResults, searchLoading, search, generateScene, sceneGenerating, sceneGenError, toggleEditor, openCreateOverlay } = useEditorStore()
  const { loadScene } = useSceneStore()
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  const handleSearch = useCallback((value) => {
    setQuery(value)
    setNoSceneForQuery(false)
    setCheckedQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(value)
      setOpen(true)
    }, 300)
  }, [search])

  // After search completes, check if any result maps to an actual scene
  useEffect(() => {
    if (!searchLoading && open && query.length >= 2 && searchResults.length === 0) {
      setNoSceneForQuery(true)
      setCheckedQuery(query)
    } else if (!searchLoading && open && query.length >= 2 && searchResults.length > 0) {
      // Check if any result has a matching scene (local type results have slug, try loading them)
      const hasLocal = searchResults.some((r) => r.type === 'local')
      if (!hasLocal) {
        setNoSceneForQuery(true)
        setCheckedQuery(query)
      } else {
        setNoSceneForQuery(false)
      }
    }
  }, [searchResults, searchLoading, open, query])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleResultClick = async (result) => {
    setOpen(false)
    setQuery('')

    if (result.type === 'local') {
      // Navigate to scene with this slug if one exists
      try {
        const res = await fetch(`/api/v1/scenes/${result.slug}`)
        if (res.ok) {
          await loadScene(result.slug, false)
          return
        }
      } catch {}
      // No scene for that node — show the no-scene prompt
      setNoSceneForQuery(true)
      setCheckedQuery(result.title)
      setOpen(true)
    } else if (result.type === 'wikipedia') {
      const wikiSlug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      try {
        const res = await fetch(
          `/api/v1/wiki-proxy/fetch-and-store/${wikiSlug}?title=${encodeURIComponent(result.title)}`,
          { method: 'POST' },
        )
        if (res.ok) {
          const sceneRes = await fetch(`/api/v1/scenes/${wikiSlug}`)
          if (sceneRes.ok) {
            await loadScene(wikiSlug, false)
            return
          }
          // No scene — show the create prompt
          setNoSceneForQuery(true)
          setCheckedQuery(result.title)
          setOpen(true)
        }
      } catch (err) {
        console.error('Failed to fetch Wikipedia content:', err)
      }
    }
  }

  const handleCreateWithEditor = () => {
    setOpen(false)
    setQuery('')
    toggleEditor()
    openCreateOverlay()
  }

  const handleCreateWithAI = async () => {
    const topic = checkedQuery || query
    if (!topic) return

    const result = await generateScene(topic)
    if (result) {
      setOpen(false)
      setQuery('')
      setNoSceneForQuery(false)

      if (result.status === 'exists' || result.status === 'created') {
        await loadScene(result.slug, false)
      }
    }
  }

  return (
    <div ref={containerRef} style={{
      position: 'absolute',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 150,
      width: 420,
      maxWidth: 'calc(100vw - 32px)',
    }}>
      {/* Search input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(10, 10, 20, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: open && (searchResults.length > 0 || noSceneForQuery || sceneGenerating) ? '10px 10px 0 0' : 10,
        padding: '0 14px',
        transition: 'border-radius 0.15s',
      }}>
        <span style={{ color: '#666', fontSize: 14, marginRight: 8 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search topics, articles, Wikipedia..."
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#e0e0e0',
            fontSize: 14,
            padding: '12px 0',
            fontFamily: "'Inter', sans-serif",
          }}
        />
        {(searchLoading || sceneGenerating) && (
          <span style={{ color: '#00ff88', fontSize: 12, animation: 'pulse 1s infinite' }}>
            {sceneGenerating ? '⚙ Creating...' : '...'}
          </span>
        )}
        {query && !sceneGenerating && (
          <button
            onClick={() => { setQuery(''); setOpen(false); setNoSceneForQuery(false) }}
            style={{
              background: 'none', border: 'none', color: '#666', cursor: 'pointer',
              fontSize: 16, padding: '4px 4px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (searchResults.length > 0 || noSceneForQuery || sceneGenerating) && (
        <div style={{
          background: 'rgba(10, 10, 20, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          maxHeight: 420,
          overflowY: 'auto',
        }}>
          {/* Search results */}
          {searchResults.map((result, i) => (
            <button
              key={`${result.type}-${result.slug || result.title}-${i}`}
              onClick={() => handleResultClick(result)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                color: '#e0e0e0',
                padding: '12px 16px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'background 0.1s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8,
                  padding: '2px 6px', borderRadius: 4,
                  background: result.type === 'local' ? 'rgba(0,255,136,0.15)' : 'rgba(68,136,255,0.15)',
                  color: result.type === 'local' ? '#00ff88' : '#4488ff',
                }}>
                  {result.type === 'local' ? 'LOCAL' : 'WIKI'}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{result.title}</span>
                {result.node_type && (
                  <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto' }}>
                    {result.node_type}
                  </span>
                )}
              </div>
              {result.summary && (
                <div style={{
                  fontSize: 12, color: '#888', lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {result.summary}
                </div>
              )}
              {result.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {result.tags.slice(0, 4).map((t) => (
                    <span key={t} style={{
                      fontSize: 10, padding: '1px 5px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)', color: '#777',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}

          {/* No scene found — offer creation */}
          {noSceneForQuery && !sceneGenerating && (
            <div style={{
              padding: '16px',
              borderTop: searchResults.length > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              }}>
                <span style={{ fontSize: 18 }}>🔭</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>
                    No scene found for "{checkedQuery || query}"
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    Would you like to create one?
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {/* Create with AI */}
                <button
                  onClick={handleCreateWithAI}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    background: 'linear-gradient(135deg, rgba(68,136,255,0.2), rgba(34,102,221,0.15))',
                    border: '1px solid rgba(68,136,255,0.4)',
                    borderRadius: 10,
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
                  <div style={{ fontSize: 16, marginBottom: 4 }}>✨</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#88bbff' }}>
                    Generate with AI
                  </div>
                  <div style={{ fontSize: 10, color: '#667799', marginTop: 2 }}>
                    Auto-create objects, models & info
                  </div>
                </button>

                {/* Create from scratch */}
                <button
                  onClick={handleCreateWithEditor}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
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
                  <div style={{ fontSize: 16, marginBottom: 4 }}>✏️</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#cccccc' }}>
                    Build from scratch
                  </div>
                  <div style={{ fontSize: 10, color: '#777', marginTop: 2 }}>
                    Open editor & add objects manually
                  </div>
                </button>
              </div>

              {/* Error display */}
              {sceneGenError && (
                <div style={{
                  marginTop: 10, padding: '8px 12px',
                  background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.25)',
                  borderRadius: 6, fontSize: 11, color: '#ff6666',
                }}>
                  {sceneGenError}
                </div>
              )}
            </div>
          )}

          {/* Generating scene loading state */}
          {sceneGenerating && (
            <div style={{
              padding: '20px 16px',
              textAlign: 'center',
            }}>
              <div style={{
                display: 'inline-block',
                animation: 'spin 1.5s linear infinite',
                fontSize: 24,
                marginBottom: 10,
              }}>
                ⚙
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#88bbff' }}>
                Generating scene with AI...
              </div>
              <div style={{ fontSize: 11, color: '#667799', marginTop: 4 }}>
                Creating 3D models, knowledge nodes, and scene layout
              </div>
              <div style={{
                marginTop: 12, height: 3, background: 'rgba(255,255,255,0.06)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', background: 'linear-gradient(90deg, #4488ff, #00ff88)',
                  borderRadius: 2,
                  animation: 'loading-bar 2s ease-in-out infinite',
                }} />
              </div>

              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                @keyframes loading-bar {
                  0% { width: 0%; margin-left: 0%; }
                  50% { width: 60%; margin-left: 20%; }
                  100% { width: 0%; margin-left: 100%; }
                }
              `}</style>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
