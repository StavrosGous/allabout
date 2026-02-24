import { create } from 'zustand'

const useEditorStore = create((set, get) => ({
  // Editor mode
  editorOpen: false,
  editingObjectId: null,

  // Search state
  searchQuery: '',
  searchResults: [],
  searchLoading: false,

  // Available models and scenes
  availableModels: [],
  availableScenes: [],

  // Shape form defaults
  newObjectForm: {
    label: '',
    model_slug: '',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    interaction_type: 'popup_info',
    highlight_color: '#667788',
  },

  toggleEditor: () => set((s) => ({ editorOpen: !s.editorOpen, editingObjectId: null })),
  closeEditor: () => set({ editorOpen: false, editingObjectId: null }),

  setEditingObject: (id) => set({ editingObjectId: id }),

  setNewObjectForm: (updates) => set((s) => ({
    newObjectForm: { ...s.newObjectForm, ...updates },
  })),

  resetNewObjectForm: () => set({
    newObjectForm: {
      label: '', model_slug: '', position: [0, 1, 0], rotation: [0, 0, 0],
      scale: [1, 1, 1], interaction_type: 'popup_info', highlight_color: '#667788',
    },
  }),

  // --- Search ---
  setSearchQuery: (q) => set({ searchQuery: q }),

  search: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [], searchLoading: false })
      return
    }
    set({ searchLoading: true })
    try {
      // Search local knowledge nodes
      const knRes = await fetch(`/api/v1/knowledge-nodes/?q=${encodeURIComponent(query)}&limit=5`)
      const localNodes = knRes.ok ? await knRes.json() : []

      // Search Wikipedia
      const wikiRes = await fetch(`/api/v1/wiki-proxy/search?q=${encodeURIComponent(query)}`)
      const wikiData = wikiRes.ok ? await wikiRes.json() : {}

      const results = []

      // Add local results
      for (const node of localNodes) {
        results.push({
          type: 'local',
          slug: node.slug,
          title: node.title,
          summary: node.summary,
          node_type: node.node_type,
          tags: node.tags,
        })
      }

      // Add Wikipedia results
      if (wikiData.title && wikiData.extract) {
        // Direct match - REST API summary response
        results.push({
          type: 'wikipedia',
          title: wikiData.title,
          summary: wikiData.extract,
          wiki_url: wikiData.content_urls?.desktop?.page,
          pageid: wikiData.pageid,
        })
      } else if (wikiData.query?.search) {
        // Search results from action API
        for (const sr of wikiData.query.search.slice(0, 3)) {
          results.push({
            type: 'wikipedia',
            title: sr.title,
            summary: sr.snippet?.replace(/<[^>]*>/g, '') || '',
            pageid: sr.pageid,
          })
        }
      }

      set({ searchResults: results, searchLoading: false })
    } catch (err) {
      console.error('Search error:', err)
      set({ searchResults: [], searchLoading: false })
    }
  },

  // --- Fetch available models ---
  loadModels: async () => {
    try {
      const res = await fetch('/api/v1/models/')
      if (res.ok) {
        const models = await res.json()
        set({ availableModels: models })
      }
    } catch (err) {
      console.error('Failed to load models:', err)
    }
  },

  // --- Fetch available scenes ---
  loadScenes: async () => {
    try {
      const res = await fetch('/api/v1/scenes/')
      if (res.ok) {
        const scenes = await res.json()
        set({ availableScenes: scenes })
      }
    } catch (err) {
      console.error('Failed to load scenes:', err)
    }
  },

  // --- Add object to scene ---
  addObjectToScene: async (sceneSlug) => {
    const { newObjectForm } = get()
    if (!newObjectForm.label) return null

    try {
      const res = await fetch(`/api/v1/scenes/${sceneSlug}/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newObjectForm.label,
          model_slug: newObjectForm.model_slug || null,
          transform: {
            position: newObjectForm.position,
            rotation: newObjectForm.rotation,
            scale: newObjectForm.scale,
          },
          interaction_type: newObjectForm.interaction_type,
          highlight_color: newObjectForm.highlight_color,
        }),
      })
      if (!res.ok) throw new Error('Failed to add object')
      const data = await res.json()
      return data
    } catch (err) {
      console.error('Add object error:', err)
      return null
    }
  },

  // --- Update object in scene ---
  updateObjectInScene: async (sceneSlug, objId, updates) => {
    try {
      const res = await fetch(`/api/v1/scenes/${sceneSlug}/objects/${objId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update object')
      return await res.json()
    } catch (err) {
      console.error('Update object error:', err)
      return null
    }
  },

  // --- Delete object from scene ---
  deleteObjectFromScene: async (sceneSlug, objId) => {
    try {
      const res = await fetch(`/api/v1/scenes/${sceneSlug}/objects/${objId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete object')
      return true
    } catch (err) {
      console.error('Delete object error:', err)
      return false
    }
  },

  // --- Wikipedia fetch+store ---
  fetchWikiContent: async (slug, title) => {
    try {
      const params = title ? `?title=${encodeURIComponent(title)}` : ''
      const res = await fetch(`/api/v1/wiki-proxy/fetch-and-store/${slug}${params}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to fetch Wikipedia content')
      return await res.json()
    } catch (err) {
      console.error('Wiki fetch error:', err)
      return null
    }
  },

  // --- Update node content ---
  updateNodeContent: async (slug, content) => {
    try {
      const res = await fetch(`/api/v1/knowledge-nodes/${slug}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_content: content }),
      })
      if (!res.ok) throw new Error('Failed to update content')
      return await res.json()
    } catch (err) {
      console.error('Update content error:', err)
      return null
    }
  },

  // --- Get node content ---
  getNodeContent: async (slug) => {
    try {
      const res = await fetch(`/api/v1/knowledge-nodes/${slug}/content`)
      if (!res.ok) return null
      return await res.json()
    } catch (err) {
      console.error('Get content error:', err)
      return null
    }
  },
}))

export default useEditorStore
