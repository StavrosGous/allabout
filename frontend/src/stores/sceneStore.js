import { create } from 'zustand'

const useSceneStore = create((set, get) => ({
  // Current scene data from API
  sceneData: null,
  // Stack of scene slugs for zoom breadcrumbs
  zoomStack: [],
  // Currently focused/hovered object id
  focusedObjectId: null,
  // Object whose info panel is open
  selectedObjectId: null,
  // Loading state
  loading: false,
  error: null,

  // Load a scene from the API
  loadScene: async (slug, pushToStack = true) => {
    set({ loading: true, error: null, selectedObjectId: null, focusedObjectId: null })
    try {
      const res = await fetch(`/api/v1/scenes/${slug}`)
      if (!res.ok) throw new Error(`Scene "${slug}" not found`)
      const data = await res.json()
      set((state) => ({
        sceneData: data,
        loading: false,
        zoomStack: pushToStack
          ? [...state.zoomStack, slug]
          : [slug],
      }))
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // Zoom into a child scene
  zoomInto: async (targetSceneSlug) => {
    const { loadScene } = get()
    await loadScene(targetSceneSlug, true)
  },

  // Zoom out to parent
  zoomOut: async () => {
    const { zoomStack, loadScene } = get()
    if (zoomStack.length <= 1) return
    const newStack = zoomStack.slice(0, -1)
    const parentSlug = newStack[newStack.length - 1]
    set({ zoomStack: newStack })
    await loadScene(parentSlug, false)
    set({ zoomStack: newStack })
  },

  // Go back to home (no scene loaded)
  goHome: () => set({
    sceneData: null,
    zoomStack: [],
    focusedObjectId: null,
    selectedObjectId: null,
    loading: false,
    error: null,
  }),

  setFocusedObject: (id) => set({ focusedObjectId: id }),
  setSelectedObject: (id) => set({ selectedObjectId: id }),
  clearSelection: () => set({ selectedObjectId: null }),
}))

export default useSceneStore
