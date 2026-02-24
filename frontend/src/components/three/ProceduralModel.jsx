import { useRef, useMemo, Fragment } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ─────────────────────────── helpers ─────────────────────────── */

const SIDE_MAP = { double: THREE.DoubleSide, back: THREE.BackSide, front: THREE.FrontSide }

function toSide(s) { return SIDE_MAP[s] ?? THREE.FrontSide }

/* Map geometry type string → JSX element */
function Geometry({ type, args }) {
  switch (type) {
    case 'box':       return <boxGeometry args={args} />
    case 'sphere':    return <sphereGeometry args={args} />
    case 'cylinder':  return <cylinderGeometry args={args} />
    case 'capsule':   return <capsuleGeometry args={args} />
    case 'torus':     return <torusGeometry args={args} />
    case 'ring':      return <ringGeometry args={args} />
    case 'cone':      return <coneGeometry args={args} />
    case 'circle':    return <circleGeometry args={args} />
    case 'plane':     return <planeGeometry args={args} />
    case 'tube':      return <tubeGeometry args={args} />
    default:          return <boxGeometry args={args ?? [0.5, 0.5, 0.5]} />
  }
}

/* Map material definition → JSX element */
function Material({ def, hovered }) {
  if (!def) return <meshStandardMaterial color="#888" />
  const { type: mt, side, ...rest } = def
  const props = { ...rest }
  if (side) props.side = toSide(side)

  switch (mt) {
    case 'physical': return <meshPhysicalMaterial {...props} />
    case 'basic':    return <meshBasicMaterial {...props} />
    default:         return <meshStandardMaterial {...props} />
  }
}

/* ─────────────────────── animation wrappers ──────────────────── */

function AnimatedRotate({ children, anim, hovered }) {
  const ref = useRef()
  const axes = { x: 'x', y: 'y', z: 'z' }
  useFrame((_, delta) => {
    if (!ref.current) return
    const speed = hovered && anim.hoverSpeed ? anim.hoverSpeed : (anim.speed || 0.15)
    ref.current.rotation[axes[anim.axis] || 'y'] += delta * speed
  })
  return <group ref={ref}>{children}</group>
}

function AnimatedPulseScale({ children, anim }) {
  const ref = useRef()
  const timeRef = useRef(0)
  useFrame((_, delta) => {
    if (!ref.current) return
    timeRef.current += delta
    const s = 1 + Math.sin(timeRef.current * (anim.speed || 0.5)) * (anim.amount || 0.02)
    ref.current.scale.setScalar(s)
  })
  return <group ref={ref}>{children}</group>
}

function AnimatedSineOffset({ children, anim }) {
  const ref = useRef()
  const timeRef = useRef(0)
  const axis = anim.axis || 'z'
  useFrame((_, delta) => {
    if (!ref.current) return
    timeRef.current += delta
    ref.current.rotation[axis] = Math.sin(timeRef.current * (anim.speed || 0.5)) * (anim.amount || 0.1)
  })
  return <group ref={ref}>{children}</group>
}

function AnimatedSineRotation({ children, anim }) {
  const ref = useRef()
  const timeRef = useRef(0)
  const axis = anim.axis || 'x'
  useFrame((_, delta) => {
    if (!ref.current) return
    timeRef.current += delta
    ref.current.rotation[axis] = Math.sin(timeRef.current * (anim.speed || 0.3)) * (anim.amount || 0.05)
  })
  return <group ref={ref}>{children}</group>
}

function WrapAnimation({ children, anim, hovered }) {
  if (!anim) return <>{children}</>
  switch (anim.type) {
    case 'rotate':         return <AnimatedRotate anim={anim} hovered={hovered}>{children}</AnimatedRotate>
    case 'pulse_scale':    return <AnimatedPulseScale anim={anim}>{children}</AnimatedPulseScale>
    case 'sine_offset':    return <AnimatedSineOffset anim={anim}>{children}</AnimatedSineOffset>
    case 'sine_rotation':  return <AnimatedSineRotation anim={anim}>{children}</AnimatedSineRotation>
    default:               return <>{children}</>
  }
}

/* ─────────────── animated light (hover_glow) ─────────────────── */

function AnimatedLight({ part, hovered }) {
  const ref = useRef()
  const maxI = part.animation?.hoverIntensity ?? 0.5
  const baseI = part.intensity ?? 0

  useFrame((_, delta) => {
    if (!ref.current) return
    const target = hovered ? maxI : baseI
    ref.current.intensity += (target - ref.current.intensity) * Math.min(delta * (part.animation?.speed || 3), 1)
  })

  const pos = part.position || [0, 0, 0]
  switch (part.lightType) {
    case 'directional':
      return <directionalLight ref={ref} position={pos} color={part.color} intensity={baseI} />
    case 'spot':
      return <spotLight ref={ref} position={pos} color={part.color} intensity={baseI} distance={part.distance} />
    default:
      return <pointLight ref={ref} position={pos} color={part.color} intensity={baseI} distance={part.distance || 3} />
  }
}

/* ─────────────── mesh with hover_emissive animation ──────────── */

function AnimatedEmissiveMesh({ part, hovered }) {
  const ref = useRef()
  const anim = part.animation
  const hc = anim.hoverColor || '#ffffff'
  const hi = anim.hoverIntensity || 0.8
  const baseI = part.material?.emissiveIntensity || 0

  useFrame((_, delta) => {
    if (!ref.current) return
    const target = hovered ? hi : baseI
    ref.current.material.emissiveIntensity += (target - ref.current.material.emissiveIntensity) * Math.min(delta * (anim.speed || 5), 1)
  })

  return (
    <mesh
      ref={ref}
      position={part.position}
      rotation={part.rotation}
      scale={part.scale}
      castShadow={part.castShadow}
    >
      <Geometry type={part.geometry?.type} args={part.geometry?.args} />
      <Material def={part.material} hovered={hovered} />
    </mesh>
  )
}

/* ──────────────────────── generators ──────────────────────────── */

function GenDnaHelix({ params, hovered }) {
  const { numSteps = 60, height = 4, radius = 0.4, turns = 2.5,
    backboneRadius = 0.04, strandColors = ['#ff6644', '#4488ff'],
    basePairColors = [['#ff4444', '#4488ff'], ['#44cc44', '#ffcc00']],
    sugarSize = 0.05, bondSize = 0.035 } = params

  const data = useMemo(() => {
    const s1 = [], s2 = [], bps = []
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps
      const y = t * height - height / 2
      const angle = t * turns * Math.PI * 2
      const x1 = Math.cos(angle) * radius, z1 = Math.sin(angle) * radius
      const x2 = Math.cos(angle + Math.PI) * radius, z2 = Math.sin(angle + Math.PI) * radius
      s1.push(new THREE.Vector3(x1, y, z1))
      s2.push(new THREE.Vector3(x2, y, z2))
      if (i % 3 === 0 && i > 0 && i < numSteps) {
        bps.push({
          start: [x1, y, z1], end: [x2, y, z2],
          mid: [(x1 + x2) / 2, y, (z1 + z2) / 2],
          colors: basePairColors[i % 6 < 3 ? 0 : 1],
        })
      }
    }
    return { s1, s2, bps }
  }, [numSteps, height, radius, turns])

  const tube1 = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(data.s1), 120, backboneRadius, 8, false), [data])
  const tube2 = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(data.s2), 120, backboneRadius, 8, false), [data])

  return (
    <>
      <mesh geometry={tube1} castShadow><meshStandardMaterial color={strandColors[0]} metalness={0.3} roughness={0.4} /></mesh>
      <mesh geometry={tube2} castShadow><meshStandardMaterial color={strandColors[1]} metalness={0.3} roughness={0.4} /></mesh>
      {data.bps.map((bp, i) => {
        const dx = bp.end[0] - bp.start[0], dy = bp.end[1] - bp.start[1], dz = bp.end[2] - bp.start[2]
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
        return (
          <Fragment key={`bp-${i}`}>
            <mesh position={[(bp.start[0]+bp.mid[0])/2,(bp.start[1]+bp.mid[1])/2,(bp.start[2]+bp.mid[2])/2]}>
              <cylinderGeometry args={[bondSize * 0.7, bondSize * 0.7, len / 2 - 0.02, 6]} />
              <meshStandardMaterial color={bp.colors[0]} emissive={bp.colors[0]} emissiveIntensity={hovered ? 0.3 : 0.1} roughness={0.5} />
            </mesh>
            <mesh position={[(bp.end[0]+bp.mid[0])/2,(bp.end[1]+bp.mid[1])/2,(bp.end[2]+bp.mid[2])/2]}>
              <cylinderGeometry args={[bondSize * 0.7, bondSize * 0.7, len / 2 - 0.02, 6]} />
              <meshStandardMaterial color={bp.colors[1]} emissive={bp.colors[1]} emissiveIntensity={hovered ? 0.3 : 0.1} roughness={0.5} />
            </mesh>
            <mesh position={bp.mid}><sphereGeometry args={[bondSize, 8, 8]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.4} /></mesh>
          </Fragment>
        )
      })}
      {data.s1.filter((_, i) => i % 5 === 0).map((p, i) => (
        <mesh key={`su1-${i}`} position={[p.x, p.y, p.z]}><sphereGeometry args={[sugarSize, 8, 8]} /><meshStandardMaterial color="#ffaa44" roughness={0.5} /></mesh>
      ))}
      {data.s2.filter((_, i) => i % 5 === 0).map((p, i) => (
        <mesh key={`su2-${i}`} position={[p.x, p.y, p.z]}><sphereGeometry args={[sugarSize, 8, 8]} /><meshStandardMaterial color="#44aaff" roughness={0.5} /></mesh>
      ))}
    </>
  )
}

function GenScatterSphere({ params }) {
  const { count = 40, radius = 1, innerRadius = 0, size = 0.02,
    color = '#ff9966', roughness = 0.8, opacity, distribution } = params
  const pts = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      let r
      if (distribution === 'gaussian') {
        r = (Math.random() ** 0.5) * radius + (innerRadius || 0.2)
      } else {
        r = innerRadius + Math.random() * (radius - innerRadius)
      }
      arr.push([r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)])
    }
    return arr
  }, [count, radius, innerRadius, distribution])

  return (
    <>
      {pts.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[size, 6, 6]} />
          <meshStandardMaterial color={color} roughness={roughness} transparent={opacity != null} opacity={opacity ?? 1} />
        </mesh>
      ))}
    </>
  )
}

function GenScatterSphereSurface({ params }) {
  const { count = 20, radius = 0.81, shape = 'torus', shapeArgs = [0.03, 0.008, 6, 8],
    color = '#aaaacc', roughness = 0.5, metalness = 0.2 } = params
  const items = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr.push({
        pos: [radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi)],
        rot: [phi, theta, 0],
      })
    }
    return arr
  }, [count, radius])

  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} position={it.pos} rotation={it.rot}>
          <Geometry type={shape} args={shapeArgs} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
      ))}
    </>
  )
}

function GenScatterCylinder({ params }) {
  const { count = 15, radius = 0.2, height = 0.8, size = 0.012, color = '#ffcc66', roughness = 0.8 } = params
  const pts = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * height
      const r = Math.random() * radius
      arr.push([Math.cos(angle) * r, y, Math.sin(angle) * r])
    }
    return arr
  }, [count, radius, height])

  return (
    <>{pts.map((p, i) => (
      <mesh key={i} position={p}><sphereGeometry args={[size, 6, 6]} /><meshStandardMaterial color={color} roughness={roughness} /></mesh>
    ))}</>
  )
}

function GenKeyboardKeys({ params }) {
  const { rows = 4, cols = 12, keySize = [0.028, 0.006, 0.026], spacing = 0.035,
    rowSpacing = 0.033, startX = -0.19, startZ = -0.05, y = 0.014, color = '#444450' } = params
  const keys = useMemo(() => {
    const arr = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push([startX + c * spacing, y, startZ + r * rowSpacing])
      }
    }
    return arr
  }, [rows, cols, spacing, rowSpacing, startX, startZ, y])

  return (
    <>{keys.map((p, i) => (
      <mesh key={i} position={p}><boxGeometry args={keySize} /><meshStandardMaterial color={color} metalness={0.1} roughness={0.8} /></mesh>
    ))}</>
  )
}

function GenBookRows({ params }) {
  const { shelfYs = [0, 0.38, 0.74, 1.1], xRange = [-0.42, 0.42],
    booksPerShelf = [10, 9, 11, 8], bookColors = ['#8B0000', '#006400', '#00008B'] } = params

  const shelves = useMemo(() => {
    return shelfYs.map((sy, si) => {
      const books = []
      let x = xRange[0]
      const n = booksPerShelf[si] || 10
      for (let b = 0; b < n && x < xRange[1]; b++) {
        const w = 0.025 + ((b * 7 + si * 13) % 11) * 0.003
        const h = 0.3 + ((b * 11 + si * 7) % 9) * 0.01
        const d = 0.15 + ((b * 3 + si) % 5) * 0.015
        const color = bookColors[(b + si * 5) % bookColors.length]
        const tilt = (b === 3 || b === 7) ? 0.1 : 0
        books.push({ x: x + w / 2, w, h, d, color, tilt, y: sy + 0.013 + h / 2 })
        x += w + 0.004
      }
      return books
    })
  }, [shelfYs, xRange, booksPerShelf, bookColors])

  return (
    <>
      {shelves.flat().map((bk, i) => (
        <group key={i} position={[bk.x, bk.y, 0]} rotation={[0, 0, bk.tilt]}>
          <mesh castShadow><boxGeometry args={[bk.w, bk.h, bk.d]} /><meshStandardMaterial color={bk.color} roughness={0.7} metalness={0.05} /></mesh>
          <mesh position={[0, 0, bk.d / 2 + 0.001]}><boxGeometry args={[bk.w * 0.6, bk.h * 0.03, 0.001]} /><meshStandardMaterial color="#ddcc88" roughness={0.5} metalness={0.2} /></mesh>
        </group>
      ))}
    </>
  )
}

function GenPeriodicTableCells({ params, hovered }) {
  const { cellW = 0.095, cellH = 0.11, gap = 0.008, categoryColors = {}, grid = [] } = params
  const totalW = 18 * (cellW + gap)
  const totalH = grid.length * (cellH + gap)

  return (
    <>
      <mesh position={[0, totalH / 2 + 0.02, 0.011]}><boxGeometry args={[totalW * 0.6, 0.06, 0.002]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.15} /></mesh>
      {grid.map((row, r) =>
        row.map((cat, c) => {
          if (!cat) return null
          const x = -totalW / 2 + c * (cellW + gap) + cellW / 2 + 0.04
          const y = totalH / 2 - r * (cellH + gap) - cellH / 2 - 0.04
          const color = categoryColors[cat] || '#666'
          return (
            <group key={`${r}-${c}`} position={[x, y, 0.011]}>
              <mesh><boxGeometry args={[cellW, cellH, 0.004]} /><meshStandardMaterial color={color} metalness={0.2} roughness={0.5} emissive={hovered ? color : '#000000'} emissiveIntensity={hovered ? 0.15 : 0} /></mesh>
              <mesh position={[0, 0, 0.003]}><boxGeometry args={[cellW * 0.5, cellH * 0.15, 0.001]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.6} /></mesh>
            </group>
          )
        })
      )}
    </>
  )
}

function GenLatitudeRings({ params }) {
  const { latitudes = [-60, -30, 0, 30, 60], radius = 0.605, tubeRadius = 0.004, color = '#ffffff', opacity = 0.2 } = params
  return (
    <>
      {latitudes.map((lat, i) => {
        const theta = (lat * Math.PI) / 180
        const r = Math.cos(theta) * radius
        const y = Math.sin(theta) * radius
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, tubeRadius, 4, 48]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        )
      })}
    </>
  )
}

function GenLongitudeRings({ params }) {
  const { count = 6, radius = 0.605, tubeRadius = 0.004, color = '#ffffff', opacity = 0.15 } = params
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} rotation={[0, (i / count) * Math.PI, 0]}>
          <torusGeometry args={[radius, tubeRadius, 4, 48]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      ))}
    </>
  )
}

function GenChromatinNetwork({ params }) {
  const { count = 12, radiusRange = [0.3, 0.6], torusRadiusRange = [0.08, 0.14], tubeRadius = 0.015, colors = ['#6644aa', '#4422aa'] } = params
  const items = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const r = radiusRange[0] + (i % 3) * ((radiusRange[1] - radiusRange[0]) / 2)
      const y = (Math.random() - 0.5) * (radiusRange[1] * 2)
      const tr = torusRadiusRange[0] + Math.random() * (torusRadiusRange[1] - torusRadiusRange[0])
      arr.push({ pos: [Math.cos(angle) * r, y, Math.sin(angle) * r], rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0], tr, color: colors[i % colors.length] })
    }
    return arr
  }, [count, radiusRange, torusRadiusRange, colors])

  return (
    <>{items.map((it, i) => (
      <mesh key={i} position={it.pos} rotation={it.rot}><torusGeometry args={[it.tr, tubeRadius, 6, 12]} /><meshStandardMaterial color={it.color} roughness={0.6} metalness={0.1} /></mesh>
    ))}</>
  )
}

function GenCristaeFolds({ params }) {
  const { count = 6, xRange = [-0.5, 0.4], width = 0.5, color = '#66dd77', opacity = 0.5 } = params
  const folds = useMemo(() => {
    const arr = []
    const span = xRange[1] - xRange[0]
    for (let i = 0; i < count; i++) {
      const x = xRange[0] + i * (span / (count - 1 || 1))
      const h = 0.12 + Math.sin(i * 1.5) * 0.04
      arr.push({ x, h })
    }
    return arr
  }, [count, xRange])

  return (
    <>
      {folds.map((c, i) => (
        <group key={i} position={[0, c.x, 0]}>
          <mesh castShadow><boxGeometry args={[width, 0.015, c.h]} /><meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.4} /></mesh>
          <mesh position={[width * 0.44, 0, 0]}>
            <cylinderGeometry args={[c.h / 2, c.h / 2, 0.015, 8, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function GenAtpSynthaseRing({ params }) {
  const { count = 8, radius = 0.3, yRange = [-0.4, 0.4],
    stalkRadius = 0.008, stalkHeight = 0.04, headRadius = 0.015,
    stalkColor = '#aacc33', headColor = '#ccee44' } = params

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2
        const y = yRange[0] + (i % 3) * ((yRange[1] - yRange[0]) / 2)
        return (
          <group key={i} position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}>
            <mesh><cylinderGeometry args={[stalkRadius, stalkRadius, stalkHeight, 6]} /><meshStandardMaterial color={stalkColor} /></mesh>
            <mesh position={[0, stalkHeight * 0.625, 0]}><sphereGeometry args={[headRadius, 6, 6]} /><meshStandardMaterial color={headColor} /></mesh>
          </group>
        )
      })}
    </>
  )
}

function ElectronOrbitElectron({ orbit, index }) {
  const ref = useRef()
  const timeRef = useRef(0)
  const { radius, tilt = [0, 0, 0], color = '#4488ff', speed = 1.5 } = orbit

  useFrame((_, delta) => {
    if (!ref.current) return
    timeRef.current += delta
    const t = timeRef.current
    const s = speed
    // Simple parametric orbit in the tilted plane
    if (index === 0) {
      ref.current.position.x = Math.cos(t * s) * radius
      ref.current.position.y = Math.sin(t * s) * radius * 0.3
      ref.current.position.z = Math.sin(t * s) * radius
    } else if (index === 1) {
      ref.current.position.x = Math.sin(t * s) * radius * 0.5
      ref.current.position.y = Math.cos(t * s) * radius
      ref.current.position.z = Math.sin(t * s + 1) * radius * 0.5
    } else {
      ref.current.position.x = Math.cos(t * s + 2) * radius
      ref.current.position.y = Math.sin(t * s + 2) * radius * 0.7
      ref.current.position.z = Math.cos(t * s) * radius * 0.3
    }
  })

  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[orbit.electronSize || 0.04, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} metalness={0.3} roughness={0.2} />
    </mesh>
  )
}

function GenElectronOrbits({ params, hovered }) {
  const { orbits = [], ringRadius = 0.005, electronSize = 0.04, ringOpacity = 0.2, hoverOpacity = 0.4 } = params
  const opac = hovered ? hoverOpacity : ringOpacity

  return (
    <>
      {orbits.map((o, i) => (
        <Fragment key={`orbit-${i}`}>
          <mesh rotation={o.tilt || [0, 0, 0]}>
            <torusGeometry args={[o.radius, ringRadius, 6, 64]} />
            <meshStandardMaterial color={o.color} transparent opacity={opac} emissive={o.color} emissiveIntensity={0.3} />
          </mesh>
          <ElectronOrbitElectron orbit={{ ...o, electronSize }} index={i} />
        </Fragment>
      ))}
    </>
  )
}

function GenGridItems({ params }) {
  const { positions = [], sizes = [], material: matDef } = params
  return (
    <>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={sizes[i] || [0.1, 0.01, 0.001]} />
          <Material def={matDef} />
        </mesh>
      ))}
    </>
  )
}

/* ─────────────── generator dispatcher ──────────────────────────── */

function GeneratorPart({ part, hovered }) {
  const { generator, params = {} } = part
  switch (generator) {
    case 'dna_helix':              return <GenDnaHelix params={params} hovered={hovered} />
    case 'scatter_sphere':         return <GenScatterSphere params={params} />
    case 'scatter_sphere_surface': return <GenScatterSphereSurface params={params} />
    case 'scatter_cylinder':       return <GenScatterCylinder params={params} />
    case 'keyboard_keys':          return <GenKeyboardKeys params={params} />
    case 'book_rows':              return <GenBookRows params={params} />
    case 'periodic_table_cells':   return <GenPeriodicTableCells params={params} hovered={hovered} />
    case 'latitude_rings':         return <GenLatitudeRings params={params} />
    case 'longitude_rings':        return <GenLongitudeRings params={params} />
    case 'chromatin_network':      return <GenChromatinNetwork params={params} />
    case 'cristae_folds':          return <GenCristaeFolds params={params} />
    case 'atp_synthase_ring':      return <GenAtpSynthaseRing params={params} />
    case 'electron_orbits':        return <GenElectronOrbits params={params} hovered={hovered} />
    case 'grid_items':             return <GenGridItems params={params} />
    default:                       return null
  }
}

/* ──────────────── recursive part renderer ──────────────────────── */

function PartRenderer({ part, hovered }) {
  if (!part) return null

  // --- Light ---
  if (part.type === 'light') {
    if (part.animation) return <AnimatedLight part={part} hovered={hovered} />
    const pos = part.position || [0, 0, 0]
    switch (part.lightType) {
      case 'directional': return <directionalLight position={pos} color={part.color} intensity={part.intensity ?? 0.5} />
      case 'spot':        return <spotLight position={pos} color={part.color} intensity={part.intensity ?? 0.5} distance={part.distance} />
      default:            return <pointLight position={pos} color={part.color} intensity={part.intensity ?? 0.5} distance={part.distance || 3} />
    }
  }

  // --- Generate ---
  if (part.type === 'generate') {
    const gen = <GeneratorPart part={part} hovered={hovered} />
    return <WrapAnimation anim={part.animation} hovered={hovered}>{gen}</WrapAnimation>
  }

  // --- Group ---
  if (part.type === 'group') {
    const inner = (
      <group position={part.position} rotation={part.rotation} scale={part.scale}>
        {(part.children || []).map((child, i) => (
          <PartRenderer key={child.name || i} part={child} hovered={hovered} />
        ))}
      </group>
    )
    return <WrapAnimation anim={part.animation} hovered={hovered}>{inner}</WrapAnimation>
  }

  // --- Mesh ---
  if (part.type === 'mesh') {
    // Special animation: hover_emissive needs its own component with useFrame
    if (part.animation?.type === 'hover_emissive') {
      return <AnimatedEmissiveMesh part={part} hovered={hovered} />
    }

    const inner = (
      <mesh
        position={part.position}
        rotation={part.rotation}
        scale={part.scale}
        castShadow={part.castShadow}
      >
        <Geometry type={part.geometry?.type} args={part.geometry?.args} />
        <Material def={part.material} hovered={hovered} />
      </mesh>
    )
    return <WrapAnimation anim={part.animation} hovered={hovered}>{inner}</WrapAnimation>
  }

  return null
}

/* ════════════════════════ MAIN COMPONENT ═════════════════════════ */

/**
 * Data-driven 3D model renderer.
 * Takes a model definition (from the database) and renders it using Three.js/R3F.
 *
 * @param {object} modelData - The model definition (slug, parts[], default_animation, etc.)
 * @param {boolean} hovered - Whether the parent object is hovered
 */
export default function ProceduralModel({ modelData, hovered = false }) {
  if (!modelData || !modelData.parts) return null

  const inner = (
    <group>
      {modelData.parts.map((part, i) => (
        <PartRenderer key={part.name || i} part={part} hovered={hovered} />
      ))}
    </group>
  )

  // Wrap with default animation if the model has one
  return (
    <WrapAnimation anim={modelData.default_animation} hovered={hovered}>
      {inner}
    </WrapAnimation>
  )
}
