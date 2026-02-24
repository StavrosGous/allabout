import { useState, useEffect } from 'react'
import useEditorStore from '../../stores/editorStore.js'
import useSceneStore from '../../stores/sceneStore.js'

const SHAPE_OPTIONS = [
  { slug: '', label: 'Default Box' },
  { slug: 'microscope', label: 'Microscope' },
  { slug: 'beaker', label: 'Beaker' },
  { slug: 'globe', label: 'Globe' },
  { slug: 'computer', label: 'Computer' },
  { slug: 'bookshelf', label: 'Bookshelf' },
  { slug: 'periodic-table', label: 'Periodic Table' },
  { slug: 'animal-cell', label: 'Animal Cell' },
  { slug: 'nucleus', label: 'Nucleus' },
  { slug: 'mitochondria', label: 'Mitochondria' },
  { slug: 'dna', label: 'DNA Helix' },
  { slug: 'atom', label: 'Atom' },
]

const COLORS = ['#00ff88', '#ff4444', '#4488ff', '#ffaa00', '#aa00ff', '#ff5500', '#ffffff', '#667788']

function VectorInput({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'flex', gap: 4 }}>
        {['X', 'Y', 'Z'].map((axis, i) => (
          <div key={axis} style={{ flex: 1 }}>
            <span style={{ fontSize: 9, color: '#555' }}>{axis}</span>
            <input
              type="number"
              step="0.1"
              value={value[i]}
              onChange={(e) => {
                const v = [...value]
                v[i] = parseFloat(e.target.value) || 0
                onChange(v)
              }}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4, padding: '4px 6px', color: '#ddd', fontSize: 12, outline: 'none',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function AddObjectSection({ sceneSlug, onObjectAdded }) {
  const { newObjectForm, setNewObjectForm, resetNewObjectForm, addObjectToScene, availableModels } = useEditorStore()
  const [adding, setAdding] = useState(false)

  const modelOptions = availableModels.length > 0
    ? [{ slug: '', label: 'Default Box' }, ...availableModels.map((m) => ({ slug: m.slug, label: m.name }))]
    : SHAPE_OPTIONS

  const handleAdd = async () => {
    if (!newObjectForm.label) return
    setAdding(true)
    const result = await addObjectToScene(sceneSlug)
    setAdding(false)
    if (result) {
      resetNewObjectForm()
      onObjectAdded()
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 8,
      padding: 14,
      marginBottom: 12,
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#00ff88', marginBottom: 12 }}>
        + Add Object
      </h3>

      {/* Label */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Label *</label>
        <input
          type="text"
          value={newObjectForm.label}
          onChange={(e) => setNewObjectForm({ label: e.target.value })}
          placeholder="e.g. Telescope"
          style={{
            width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '8px 10px', color: '#ddd', fontSize: 13, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Model / Shape */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>3D Shape</label>
        <select
          value={newObjectForm.model_slug}
          onChange={(e) => setNewObjectForm({ model_slug: e.target.value })}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '8px 10px', color: '#ddd', fontSize: 13, outline: 'none',
            boxSizing: 'border-box',
          }}
        >
          {modelOptions.map((m) => (
            <option key={m.slug} value={m.slug} style={{ background: '#1a1a2a' }}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Position */}
      <VectorInput
        label="Position"
        value={newObjectForm.position}
        onChange={(v) => setNewObjectForm({ position: v })}
      />

      {/* Rotation */}
      <VectorInput
        label="Rotation"
        value={newObjectForm.rotation}
        onChange={(v) => setNewObjectForm({ rotation: v })}
      />

      {/* Scale */}
      <VectorInput
        label="Scale"
        value={newObjectForm.scale}
        onChange={(v) => setNewObjectForm({ scale: v })}
      />

      {/* Color */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Highlight Color</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewObjectForm({ highlight_color: c })}
              style={{
                width: 24, height: 24, borderRadius: 6, border: newObjectForm.highlight_color === c ? '2px solid #fff' : '2px solid transparent',
                background: c, cursor: 'pointer', transition: 'transform 0.1s',
              }}
            />
          ))}
          <input
            type="color"
            value={newObjectForm.highlight_color}
            onChange={(e) => setNewObjectForm({ highlight_color: e.target.value })}
            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', padding: 0, cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Interaction type */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Interaction</label>
        <select
          value={newObjectForm.interaction_type}
          onChange={(e) => setNewObjectForm({ interaction_type: e.target.value })}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '8px 10px', color: '#ddd', fontSize: 13, outline: 'none',
            boxSizing: 'border-box',
          }}
        >
          <option value="popup_info" style={{ background: '#1a1a2a' }}>Show Info Panel</option>
          <option value="zoom_into" style={{ background: '#1a1a2a' }}>Zoom Into Scene</option>
          <option value="none" style={{ background: '#1a1a2a' }}>None</option>
        </select>
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={!newObjectForm.label || adding}
        style={{
          width: '100%', padding: '10px 16px',
          background: newObjectForm.label ? 'linear-gradient(135deg, #00ff88, #00cc66)' : '#333',
          border: 'none', borderRadius: 8, color: newObjectForm.label ? '#000' : '#666',
          fontSize: 13, fontWeight: 600, cursor: newObjectForm.label ? 'pointer' : 'not-allowed',
        }}
      >
        {adding ? 'Adding...' : 'Add to Scene'}
      </button>
    </div>
  )
}

function ObjectListSection({ sceneData, onRefresh }) {
  const { deleteObjectFromScene, updateObjectInScene, editingObjectId, setEditingObject } = useEditorStore()
  const [editForm, setEditForm] = useState({})

  if (!sceneData?.objects?.length) {
    return (
      <div style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: 20 }}>
        No objects in this scene yet.
      </div>
    )
  }

  const startEdit = (obj) => {
    setEditingObject(obj.id)
    setEditForm({
      label: obj.label,
      model_slug: obj.model_slug || '',
      position: obj.transform.position,
      rotation: obj.transform.rotation,
      scale: obj.transform.scale,
      highlight_color: obj.highlight_color || '#667788',
      interaction_type: obj.interaction_type,
    })
  }

  const saveEdit = async (obj) => {
    await updateObjectInScene(sceneData.slug, obj.id, {
      label: editForm.label,
      model_slug: editForm.model_slug || null,
      transform: { position: editForm.position, rotation: editForm.rotation, scale: editForm.scale },
      highlight_color: editForm.highlight_color,
      interaction_type: editForm.interaction_type,
    })
    setEditingObject(null)
    onRefresh()
  }

  const handleDelete = async (obj) => {
    if (!confirm(`Delete "${obj.label}"?`)) return
    await deleteObjectFromScene(sceneData.slug, obj.id)
    onRefresh()
  }

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 8 }}>
        Objects ({sceneData.objects.length})
      </h3>
      {sceneData.objects.map((obj) => (
        <div key={obj.id} style={{
          background: editingObjectId === obj.id ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
          borderRadius: 8, padding: 10, marginBottom: 6,
          border: `1px solid ${editingObjectId === obj.id ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.05)'}`,
        }}>
          {editingObjectId === obj.id ? (
            // Edit mode
            <div>
              <input
                type="text" value={editForm.label}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4, padding: '6px 8px', color: '#ddd', fontSize: 12, marginBottom: 6,
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
              <VectorInput label="Position" value={editForm.position}
                onChange={(v) => setEditForm({ ...editForm, position: v })} />
              <VectorInput label="Scale" value={editForm.scale}
                onChange={(v) => setEditForm({ ...editForm, scale: v })} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={() => saveEdit(obj)} style={{
                  flex: 1, padding: '6px', background: '#00cc66', border: 'none',
                  borderRadius: 4, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>Save</button>
                <button onClick={() => setEditingObject(null)} style={{
                  flex: 1, padding: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4, color: '#aaa', fontSize: 11, cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            // View mode
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: obj.highlight_color || '#667788',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#ddd' }}>{obj.label}</div>
                <div style={{ fontSize: 10, color: '#555' }}>
                  {obj.model_slug || 'box'} · {obj.interaction_type}
                </div>
              </div>
              <button onClick={() => startEdit(obj)} style={{
                background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 11, padding: '2px 6px',
              }}>✏️</button>
              <button onClick={() => handleDelete(obj)} style={{
                background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 11, padding: '2px 6px',
              }}>🗑</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function EditorPanel() {
  const { editorOpen, closeEditor, loadModels, dragMode, toggleDragMode, openCreateOverlay } = useEditorStore()
  const { sceneData, loadScene } = useSceneStore()

  useEffect(() => {
    if (editorOpen) {
      loadModels()
    }
  }, [editorOpen])

  if (!editorOpen || !sceneData) return null

  const handleRefresh = () => {
    loadScene(sceneData.slug, false)
  }

  return (
    <div style={{
      position: 'absolute',
      left: 16,
      top: 60,
      bottom: 80,
      width: 320,
      background: 'rgba(10, 10, 20, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      zIndex: 120,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0', margin: 0 }}>
            Scene Editor
          </h2>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{sceneData.title}</div>
        </div>
        <button onClick={closeEditor} style={{
          background: 'none', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer',
        }}>×</button>
      </div>

      {/* Toolbar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: 6,
      }}>
        {/* Create Object button */}
        <button
          onClick={openCreateOverlay}
          style={{
            flex: 1, padding: '9px 12px',
            background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,204,102,0.1))',
            border: '1px solid rgba(0,255,136,0.3)',
            borderRadius: 8, color: '#00ff88',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Create Object
        </button>

        {/* Drag Mode toggle */}
        <button
          onClick={toggleDragMode}
          title={dragMode ? 'Disable drag mode' : 'Enable drag mode — drag objects to reposition'}
          style={{
            padding: '9px 14px',
            background: dragMode ? 'rgba(255,170,0,0.15)' : 'rgba(255,255,255,0.04)',
            border: dragMode ? '1px solid rgba(255,170,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: dragMode ? '#ffaa00' : '#888',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: 14 }}>✥</span>
          {dragMode ? 'Dragging' : 'Drag'}
        </button>
      </div>

      {/* Drag mode info banner */}
      {dragMode && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(255,170,0,0.08)',
          borderBottom: '1px solid rgba(255,170,0,0.15)',
          fontSize: 11, color: '#ddaa44',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>✥</span>
          Click and drag objects to reposition. Position saves automatically.
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        <AddObjectSection sceneSlug={sceneData.slug} onObjectAdded={handleRefresh} />
        <ObjectListSection sceneData={sceneData} onRefresh={handleRefresh} />
      </div>
    </div>
  )
}
