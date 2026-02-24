import { useMemo } from 'react'

/**
 * Detailed procedural bookshelf with individual books of varying sizes/colors.
 */
export default function BookshelfModel({ hovered }) {
  const woodMat = useMemo(() => ({
    color: '#5c3a1e',
    metalness: 0.0,
    roughness: 0.8,
  }), [])

  const darkWoodMat = useMemo(() => ({
    color: '#3d2510',
    metalness: 0.0,
    roughness: 0.85,
  }), [])

  // Generate random-ish books for each shelf
  const shelves = useMemo(() => {
    const bookColors = [
      '#8B0000', '#006400', '#00008B', '#800080',
      '#B8860B', '#2F4F4F', '#8B4513', '#191970',
      '#556B2F', '#8B008B', '#CC5500', '#4A4A6A',
      '#A0522D', '#2E8B57', '#6A5ACD',
    ]
    const rows = []
    for (let shelf = 0; shelf < 4; shelf++) {
      const books = []
      let x = -0.42
      const numBooks = 8 + Math.floor((shelf * 3 + 7) % 5)
      for (let b = 0; b < numBooks && x < 0.42; b++) {
        const w = 0.025 + ((b * 7 + shelf * 13) % 11) * 0.003
        const h = 0.3 + ((b * 11 + shelf * 7) % 9) * 0.01
        const d = 0.15 + ((b * 3 + shelf) % 5) * 0.015
        const color = bookColors[(b + shelf * 5) % bookColors.length]
        const tilt = (b === 3 || b === 7) ? 0.1 : 0  // Some books slightly tilted
        books.push({ x: x + w / 2, w, h, d, color, tilt })
        x += w + 0.004
      }
      rows.push(books)
    }
    return rows
  }, [])

  const shelfY = [0.02, 0.38, 0.74, 1.1]

  return (
    <group>
      {/* ---- BOOKSHELF FRAME ---- */}
      {/* Left side panel */}
      <mesh position={[-0.48, 0.72, 0]} castShadow>
        <boxGeometry args={[0.04, 1.46, 0.22]} />
        <meshStandardMaterial {...darkWoodMat} />
      </mesh>
      {/* Right side panel */}
      <mesh position={[0.48, 0.72, 0]} castShadow>
        <boxGeometry args={[0.04, 1.46, 0.22]} />
        <meshStandardMaterial {...darkWoodMat} />
      </mesh>
      {/* Top panel */}
      <mesh position={[0, 1.46, 0]} castShadow>
        <boxGeometry args={[1.0, 0.03, 0.22]} />
        <meshStandardMaterial {...darkWoodMat} />
      </mesh>
      {/* Back panel */}
      <mesh position={[0, 0.72, -0.1]} castShadow>
        <boxGeometry args={[0.92, 1.44, 0.02]} />
        <meshStandardMaterial color="#2a1808" roughness={0.9} metalness={0} />
      </mesh>

      {/* ---- SHELVES ---- */}
      {shelfY.map((y, i) => (
        <mesh key={`shelf-${i}`} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.92, 0.025, 0.22]} />
          <meshStandardMaterial {...woodMat} />
        </mesh>
      ))}

      {/* ---- BOOKS ---- */}
      {shelves.map((books, shelfIdx) => (
        <group key={`bookrow-${shelfIdx}`}>
          {books.map((book, bookIdx) => (
            <group
              key={`book-${shelfIdx}-${bookIdx}`}
              position={[book.x, shelfY[shelfIdx] + 0.013 + book.h / 2, 0]}
              rotation={[0, 0, book.tilt]}
            >
              {/* Book body */}
              <mesh castShadow>
                <boxGeometry args={[book.w, book.h, book.d]} />
                <meshStandardMaterial
                  color={book.color}
                  roughness={0.7}
                  metalness={0.05}
                />
              </mesh>
              {/* Book spine detail (lighter stripe) */}
              <mesh position={[0, 0, book.d / 2 + 0.001]}>
                <boxGeometry args={[book.w * 0.6, book.h * 0.03, 0.001]} />
                <meshStandardMaterial
                  color="#ddcc88"
                  roughness={0.5}
                  metalness={0.2}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* A couple of bookends / decorative items */}
      {/* Small plant/vase on top */}
      <group position={[0.2, 1.49, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.025, 0.06, 8]} />
          <meshStandardMaterial color="#aa6633" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#228833" roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}
