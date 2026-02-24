import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Detailed Periodic Table of Elements wall chart.
 * Shows a grid of colored element tiles organized by groups.
 */
export default function PeriodicTableModel({ hovered }) {
  // Element color map by category
  const categoryColors = useMemo(() => ({
    alkali: '#ff4444',
    alkaline: '#ff8844',
    transition: '#4488ff',
    postTransition: '#44bb88',
    metalloid: '#88aa44',
    nonmetal: '#44ddaa',
    halogen: '#ddaa44',
    noble: '#aa44dd',
    lanthanide: '#ff66aa',
    actinide: '#ff88cc',
    empty: null,
  }), [])

  // Simplified periodic table layout (18 columns x 7 rows)
  // Each cell: [category, symbol], or null for empty
  const grid = useMemo(() => {
    const rows = [
      // Row 1
      ['nonmetal', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'noble'],
      // Row 2
      ['alkali', 'alkaline', null, null, null, null, null, null, null, null, null, null, 'metalloid', 'nonmetal', 'nonmetal', 'nonmetal', 'halogen', 'noble'],
      // Row 3
      ['alkali', 'alkaline', null, null, null, null, null, null, null, null, null, null, 'postTransition', 'metalloid', 'nonmetal', 'nonmetal', 'halogen', 'noble'],
      // Row 4
      ['alkali', 'alkaline', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'postTransition', 'metalloid', 'metalloid', 'nonmetal', 'halogen', 'noble'],
      // Row 5
      ['alkali', 'alkaline', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'postTransition', 'postTransition', 'metalloid', 'metalloid', 'halogen', 'noble'],
      // Row 6
      ['alkali', 'alkaline', 'lanthanide', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'postTransition', 'postTransition', 'postTransition', 'metalloid', 'halogen', 'noble'],
      // Row 7
      ['alkali', 'alkaline', 'actinide', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'transition', 'postTransition', 'postTransition', 'postTransition', 'postTransition', 'halogen', 'noble'],
    ]
    return rows
  }, [])

  const cellW = 0.095
  const cellH = 0.11
  const gap = 0.008
  const totalW = 18 * (cellW + gap)
  const totalH = 7 * (cellH + gap)

  return (
    <group>
      {/* Background board */}
      <mesh castShadow>
        <boxGeometry args={[totalW + 0.1, totalH + 0.15, 0.02]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.1} roughness={0.8} />
      </mesh>

      {/* Title area */}
      <mesh position={[0, totalH / 2 + 0.02, 0.011]}>
        <boxGeometry args={[totalW * 0.6, 0.06, 0.002]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.15} />
      </mesh>

      {/* Element cells */}
      {grid.map((row, r) =>
        row.map((cat, c) => {
          if (!cat) return null
          const x = -totalW / 2 + c * (cellW + gap) + cellW / 2 + 0.04
          const y = totalH / 2 - r * (cellH + gap) - cellH / 2 - 0.04
          const color = categoryColors[cat]
          return (
            <group key={`el-${r}-${c}`} position={[x, y, 0.011]}>
              {/* Cell background */}
              <mesh>
                <boxGeometry args={[cellW, cellH, 0.004]} />
                <meshStandardMaterial
                  color={color}
                  metalness={0.2}
                  roughness={0.5}
                  emissive={hovered ? color : '#000000'}
                  emissiveIntensity={hovered ? 0.15 : 0}
                />
              </mesh>
              {/* Tiny symbol placeholder (thin line) */}
              <mesh position={[0, 0, 0.003]}>
                <boxGeometry args={[cellW * 0.5, cellH * 0.15, 0.001]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
              </mesh>
            </group>
          )
        })
      )}

      {/* Lanthanide row (below main table) */}
      <mesh position={[0.2, -totalH / 2 - 0.1, 0.011]}>
        <boxGeometry args={[totalW * 0.7, cellH * 0.8, 0.003]} />
        <meshStandardMaterial color="#ff66aa" transparent opacity={0.3} metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Actinide row */}
      <mesh position={[0.2, -totalH / 2 - 0.2, 0.011]}>
        <boxGeometry args={[totalW * 0.7, cellH * 0.8, 0.003]} />
        <meshStandardMaterial color="#ff88cc" transparent opacity={0.3} metalness={0.2} roughness={0.5} />
      </mesh>

      {/* Frame border */}
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[totalW + 0.14, totalH + 0.2, 0.015]} />
        <meshStandardMaterial color="#333340" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}
