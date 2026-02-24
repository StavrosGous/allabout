import { useState, useCallback, useEffect, useRef } from 'react'
import useEditorStore from '../../stores/editorStore.js'
import useSceneStore from '../../stores/sceneStore.js'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { searchResults, searchLoading, search } = useEditorStore()
  const { loadScene } = useSceneStore()
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  const handleSearch = useCallback((value) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(value)
      setOpen(true)
    }, 300)
  }, [search])

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
      // Otherwise just show info (the scene might not exist for every node)
      console.log('Knowledge node:', result.slug)
    } else if (result.type === 'wikipedia') {
      // Create a knowledge node and fetch Wikipedia content for it
      const wikiSlug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      try {
        const res = await fetch(
          `/api/v1/wiki-proxy/fetch-and-store/${wikiSlug}?title=${encodeURIComponent(result.title)}`,
          { method: 'POST' },
        )
        if (res.ok) {
          const data = await res.json()
          // Try to load the scene if it exists, otherwise just inform the user
          const sceneRes = await fetch(`/api/v1/scenes/${wikiSlug}`)
          if (sceneRes.ok) {
            await loadScene(wikiSlug, false)
            return
          }
          // No scene for this topic — content was saved for when a scene is created
          alert(`Saved Wikipedia content for "${data.title}". No matching scene found yet.`)
        }
      } catch (err) {
        console.error('Failed to fetch Wikipedia content:', err)
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
        borderRadius: open && searchResults.length > 0 ? '10px 10px 0 0' : 10,
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
        {searchLoading && (
          <span style={{ color: '#00ff88', fontSize: 12, animation: 'pulse 1s infinite' }}>
            ...
          </span>
        )}
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            style={{
              background: 'none', border: 'none', color: '#666', cursor: 'pointer',
              fontSize: 16, padding: '4px 4px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && searchResults.length > 0 && (
        <div style={{
          background: 'rgba(10, 10, 20, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          maxHeight: 360,
          overflowY: 'auto',
        }}>
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
                borderBottom: i < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
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
        </div>
      )}
    </div>
  )
}
