import { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import useEditorStore from '../../stores/editorStore.js'
import useSceneStore from '../../stores/sceneStore.js'

/* ─── Shape primitives for the "From Shapes" tab ─── */
const SHAPE_LIBRARY = [
  { slug: 'box', label: 'Box', icon: '▬', geo: 'box', args: [0.6, 0.6, 0.6], color: '#667788' },
  { slug: 'sphere', label: 'Sphere', icon: '●', geo: 'sphere', args: [0.4, 24, 24], color: '#4488ff' },
  { slug: 'cylinder', label: 'Cylinder', icon: '⬮', geo: 'cylinder', args: [0.3, 0.3, 0.8, 24], color: '#ff8844' },
  { slug: 'cone', label: 'Cone', icon: '▲', geo: 'cone', args: [0.35, 0.8, 24], color: '#44cc88' },
  { slug: 'torus', label: 'Torus', icon: '◎', geo: 'torus', args: [0.3, 0.12, 12, 32], color: '#aa66ff' },
  { slug: 'capsule', label: 'Capsule', icon: '◠', geo: 'capsule', args: [0.25, 0.5, 8, 16], color: '#ff4466' },
]

const COLORS = ['#00ff88', '#ff4444', '#4488ff', '#ffaa00', '#aa00ff', '#ff5500', '#ffffff', '#667788']

function ShapePreview({ geotype, args, color }) {
  const Geo = () => {
    switch (geotype) {
      case 'box': return <boxGeometry args={args} />
      case 'sphere': return <sphereGeometry args={args} />
      case 'cylinder': return <cylinderGeometry args={args} />
      case 'cone': return <coneGeometry args={args} />
      case 'torus': return <torusGeometry args={args} />
      case 'capsule': return <capsuleGeometry args={args} />
      default: return <boxGeometry args={[0.5, 0.5, 0.5]} />
    }
  }

  return (
    <Canvas camera={{ position: [1.5, 1, 1.5], fov: 40 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 2]} intensity={0.8} color="#fff5e0" />
      <pointLight position={[-2, 2, -1]} intensity={0.3} color="#4466aa" />
      <mesh castShadow>
        <Geo />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
    </Canvas>
  )
}

/* ─── From Shapes Tab ─── */
function ShapesTab({ onAdd, sceneSlug }) {
  const [selected, setSelected] = useState(null)
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#667788')
  const [adding, setAdding] = useState(false)
  const { availableModels, addObjectToScene, setNewObjectForm, resetNewObjectForm } = useEditorStore()

  // Combine built-in shapes with loaded models
  const existingModels = availableModels.map((m) => ({
    slug: m.slug,
    label: m.name,
    icon: '🔧',
    isModel: true,
    color: '#667788',
  }))

  const handleCreate = async () => {
    if (!label) return
    setAdding(true)

    if (selected?.isModel) {
      // Use existing model
      setNewObjectForm({
        label,
        model_slug: selected.slug,
        highlight_color: color,
      })
      const result = await addObjectToScene(sceneSlug)
      resetNewObjectForm()
      if (result) onAdd()
    } else if (selected) {
      // Create a simple shape as a new model, then add to scene
      const modelDef = {
        slug: `shape-${selected.slug}-${Date.now()}`,
        name: label,
        category: 'custom',
        description: `Custom ${selected.label} shape`,
        tags: ['custom', 'shape'],
        default_animation: null,
        parts: [
          {
            type: 'light',
            name: 'hover_glow',
            lightType: 'point',
            position: [0, 0.8, 0],
            color: color,
            intensity: 0,
            distance: 3,
            animation: { type: 'hover_glow', hoverIntensity: 0.5, speed: 3 },
          },
          {
            type: 'mesh',
            name: 'main',
            geometry: { type: selected.geo, args: selected.args },
            material: {
              type: 'standard',
              color: color,
              metalness: 0.3,
              roughness: 0.5,
            },
            position: [0, 0, 0],
            castShadow: true,
          },
        ],
      }

      // Save model then add object
      try {
        const modelRes = await fetch('/api/v1/models/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelDef),
        })
        if (!modelRes.ok) throw new Error('Failed to save shape model')

        const objRes = await fetch(`/api/v1/scenes/${sceneSlug}/objects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label,
            model_slug: modelDef.slug,
            transform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            interaction_type: 'popup_info',
            highlight_color: color,
          }),
        })
        if (objRes.ok) onAdd()
      } catch (err) {
        console.error('Create shape error:', err)
      }
    }
    setAdding(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Shape grid */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Basic Shapes</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {SHAPE_LIBRARY.map((shape) => (
            <button
              key={shape.slug}
              onClick={() => setSelected(shape)}
              style={{
                padding: '12px 8px',
                background: selected?.slug === shape.slug ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                border: selected?.slug === shape.slug ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color: selected?.slug === shape.slug ? '#00ff88' : '#ccc',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{shape.icon}</div>
              {shape.label}
            </button>
          ))}
        </div>

        {existingModels.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: '#888', marginTop: 16, marginBottom: 10 }}>Existing Models</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {existingModels.map((m) => (
                <button
                  key={m.slug}
                  onClick={() => setSelected(m)}
                  style={{
                    padding: '8px 10px',
                    background: selected?.slug === m.slug ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                    border: selected?.slug === m.slug ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6,
                    color: selected?.slug === m.slug ? '#00ff88' : '#bbb',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 11,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Preview + config */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', overflow: 'auto' }}>
        {/* Preview */}
        {selected && !selected.isModel && (
          <div style={{
            width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', marginBottom: 12,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <ShapePreview geotype={selected.geo} args={selected.args} color={color} />
          </div>
        )}

        {/* Label */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Name *</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Red Sphere, Control Panel"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, padding: '8px 12px', color: '#ddd', fontSize: 13, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Color</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 26, height: 26, borderRadius: 6,
                  border: color === c ? '2px solid #fff' : '2px solid transparent',
                  background: c, cursor: 'pointer',
                }}
              />
            ))}
            <input
              type="color" value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 26, height: 26, borderRadius: 6, border: 'none', padding: 0, cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!label || !selected || adding}
          style={{
            width: '100%', padding: '12px 16px', marginTop: 'auto',
            background: (label && selected) ? 'linear-gradient(135deg, #00ff88, #00cc66)' : '#333',
            border: 'none', borderRadius: 8, color: (label && selected) ? '#000' : '#666',
            fontSize: 14, fontWeight: 600, cursor: (label && selected) ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
          }}
        >
          {adding ? 'Creating...' : 'Add to Scene'}
        </button>
      </div>
    </div>
  )
}

/* ─── AI Generate Tab ─── */
function AIGenerateTab({ onAdd, sceneSlug }) {
  const {
    aiPrompt, setAiPrompt, aiGenerating, aiError, aiPreview,
    generateWithAI, addAIGeneratedObject,
  } = useEditorStore()
  const [label, setLabel] = useState('')
  const [adding, setAdding] = useState(false)

  const handleGenerate = async () => {
    if (!aiPrompt || aiPrompt.length < 3) return
    await generateWithAI(aiPrompt)
  }

  const handleAdd = async () => {
    if (!aiPreview) return
    setAdding(true)
    const result = await addAIGeneratedObject(
      sceneSlug,
      aiPreview,
      label || aiPreview.name,
      [0, 1, 0],
    )
    setAdding(false)
    if (result) onAdd()
  }

  // Auto-fill label from preview
  useEffect(() => {
    if (aiPreview?.name && !label) {
      setLabel(aiPreview.name)
    }
  }, [aiPreview])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 20px' }}>
      {/* Prompt input */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>
          Describe the 3D object you want to create
        </label>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="e.g. A vintage brass telescope on a tripod stand, with polished lenses and ornate engravings"
          rows={4}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 12px', color: '#ddd', fontSize: 13, outline: 'none',
            resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!aiPrompt || aiPrompt.length < 3 || aiGenerating}
        style={{
          width: '100%', padding: '12px 16px', marginBottom: 16,
          background: aiGenerating
            ? 'linear-gradient(135deg, #4466aa, #2244aa)'
            : (aiPrompt && aiPrompt.length >= 3)
              ? 'linear-gradient(135deg, #4488ff, #2266dd)'
              : '#333',
          border: 'none', borderRadius: 8,
          color: (aiPrompt && aiPrompt.length >= 3) ? '#fff' : '#666',
          fontSize: 14, fontWeight: 600,
          cursor: (aiPrompt && aiPrompt.length >= 3 && !aiGenerating) ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {aiGenerating ? (
          <>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 16 }}>⚙</span>
            Generating...
          </>
        ) : (
          <>✨ Generate with AI</>
        )}
      </button>

      {/* Error */}
      {aiError && (
        <div style={{
          padding: '10px 14px', marginBottom: 12,
          background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)',
          borderRadius: 8, color: '#ff6666', fontSize: 12,
        }}>
          {aiError}
        </div>
      )}

      {/* Preview */}
      {aiPreview && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#00ff88' }}>✓</span> Model generated
          </div>

          {/* Model info card */}
          <div style={{
            background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.15)',
            borderRadius: 8, padding: 12, marginBottom: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0', marginBottom: 4 }}>
              {aiPreview.name}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
              {aiPreview.description || `${aiPreview.parts?.length || 0} parts`}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(aiPreview.tags || []).slice(0, 5).map((tag) => (
                <span key={tag} style={{
                  padding: '2px 8px', background: 'rgba(255,255,255,0.06)',
                  borderRadius: 4, fontSize: 10, color: '#aaa',
                }}>
                  {tag}
                </span>
              ))}
              <span style={{
                padding: '2px 8px', background: 'rgba(68,136,255,0.15)',
                borderRadius: 4, fontSize: 10, color: '#88aaff',
              }}>
                {aiPreview.parts?.length || 0} parts
              </span>
            </div>
          </div>

          {/* 3D Preview */}
          <div style={{
            width: '100%', height: 160, borderRadius: 8, overflow: 'hidden', marginBottom: 12,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Canvas camera={{ position: [2, 1.5, 2], fov: 40 }} style={{ width: '100%', height: '100%' }}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[4, 5, 3]} intensity={0.8} color="#fff5e0" />
              <pointLight position={[-3, 2, -2]} intensity={0.3} color="#4466aa" />
              <Suspense fallback={null}>
                <AIPreviewModel parts={aiPreview.parts} />
              </Suspense>
              <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={2} />
            </Canvas>
          </div>

          {/* Label input */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Object Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, padding: '8px 12px', color: '#ddd', fontSize: 13, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Add to scene button */}
          <button
            onClick={handleAdd}
            disabled={adding}
            style={{
              width: '100%', padding: '12px 16px', marginTop: 'auto',
              background: 'linear-gradient(135deg, #00ff88, #00cc66)',
              border: 'none', borderRadius: 8, color: '#000',
              fontSize: 14, fontWeight: 600, cursor: adding ? 'not-allowed' : 'pointer',
            }}
          >
            {adding ? 'Adding...' : 'Add to Scene'}
          </button>
        </div>
      )}

      {/* Empty state prompt suggestions */}
      {!aiPreview && !aiGenerating && !aiError && (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 10 }}>Try something like:</div>
          {[
            'A steampunk clock with spinning gears',
            'A potted cactus with small flowers',
            'A crystal ball on an ornate stand',
            'A robot arm with articulated joints',
            'A chemistry flask with bubbling liquid',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setAiPrompt(suggestion)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', marginBottom: 4,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, color: '#999', fontSize: 12, cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(68,136,255,0.1)'; e.target.style.color = '#ccc' }}
              onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.color = '#999' }}
            >
              → {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/* ─── Simple lightweight preview renderer for AI-generated parts ─── */
function AIPreviewMesh({ part }) {
  if (!part || part.type === 'light') return null

  if (part.type === 'group') {
    return (
      <group position={part.position} rotation={part.rotation} scale={part.scale}>
        {(part.children || []).map((child, i) => (
          <AIPreviewMesh key={i} part={child} />
        ))}
      </group>
    )
  }

  if (part.type === 'mesh') {
    const GeoComp = () => {
      const geo = part.geometry
      if (!geo) return <boxGeometry args={[0.3, 0.3, 0.3]} />
      switch (geo.type) {
        case 'box': return <boxGeometry args={geo.args} />
        case 'sphere': return <sphereGeometry args={geo.args} />
        case 'cylinder': return <cylinderGeometry args={geo.args} />
        case 'cone': return <coneGeometry args={geo.args} />
        case 'torus': return <torusGeometry args={geo.args} />
        case 'capsule': return <capsuleGeometry args={geo.args} />
        case 'ring': return <ringGeometry args={geo.args} />
        default: return <boxGeometry args={geo.args || [0.3, 0.3, 0.3]} />
      }
    }

    const mat = part.material || {}
    return (
      <mesh position={part.position} rotation={part.rotation} scale={part.scale}>
        <GeoComp />
        <meshStandardMaterial
          color={mat.color || '#888'}
          metalness={mat.metalness ?? 0.3}
          roughness={mat.roughness ?? 0.5}
          emissive={mat.emissive || '#000'}
          emissiveIntensity={mat.emissiveIntensity || 0}
          transparent={mat.transparent || false}
          opacity={mat.opacity ?? 1}
        />
      </mesh>
    )
  }

  return null
}

function AIPreviewModel({ parts }) {
  if (!parts) return null
  return (
    <group>
      {parts.map((part, i) => (
        <AIPreviewMesh key={i} part={part} />
      ))}
    </group>
  )
}

/* ═══════════════════════ MAIN OVERLAY ═══════════════════════ */
export default function CreateObjectOverlay() {
  const { createOverlayOpen, closeCreateOverlay, createMode, setCreateMode, loadModels } = useEditorStore()
  const { sceneData, loadScene } = useSceneStore()

  useEffect(() => {
    if (createOverlayOpen) loadModels()
  }, [createOverlayOpen])

  if (!createOverlayOpen || !sceneData) return null

  const handleObjectAdded = () => {
    loadScene(sceneData.slug, false)
    closeCreateOverlay()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        onClick={closeCreateOverlay}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative',
        width: 480, maxHeight: '85vh',
        background: 'rgba(14, 14, 24, 0.98)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>
              Create Object
            </h2>
            <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
              Add to: {sceneData.title}
            </div>
          </div>
          <button
            onClick={closeCreateOverlay}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', width: 32, height: 32,
              borderRadius: 8, color: '#888', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { key: 'shapes', label: '⬡ From Shapes', desc: 'Primitives & existing' },
            { key: 'ai', label: '✨ AI Generate', desc: 'Describe & create' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCreateMode(tab.key)}
              style={{
                flex: 1, padding: '10px 12px',
                background: createMode === tab.key ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.03)',
                border: createMode === tab.key ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: createMode === tab.key ? '#00ff88' : '#aaa',
              }}>
                {tab.label}
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 300 }}>
          {createMode === 'shapes' ? (
            <ShapesTab onAdd={handleObjectAdded} sceneSlug={sceneData.slug} />
          ) : (
            <AIGenerateTab onAdd={handleObjectAdded} sceneSlug={sceneData.slug} />
          )}
        </div>
      </div>
    </div>
  )
}
