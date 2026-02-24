import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { Stars, AdaptiveDpr } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import SceneContent from './SceneContent.jsx'
import CameraRig from './CameraRig.jsx'
import LoadingFallback from './LoadingFallback.jsx'

// Per-zoom-depth lighting presets
function getSceneLighting(zoomDepth, env) {
  switch (zoomDepth) {
    case 0: // Lab
      return {
        bg: '#0a0a12',
        ambient: 0.4,
        dirColor: '#fff5e0',
        dirIntensity: 1.0,
        fillColor: '#4466aa',
        fillIntensity: 0.3,
        rimColor: '#ffaa44',
        rimIntensity: 0.2,
        stars: true,
        bloom: { intensity: 0.3, luminanceThreshold: 0.8 },
      }
    case 1: // Microscope
      return {
        bg: '#020812',
        ambient: 0.2,
        dirColor: '#88bbff',
        dirIntensity: 0.6,
        fillColor: '#224488',
        fillIntensity: 0.4,
        rimColor: '#00ff88',
        rimIntensity: 0.3,
        stars: false,
        bloom: { intensity: 0.5, luminanceThreshold: 0.6 },
      }
    case 2: // Cell
      return {
        bg: '#040810',
        ambient: 0.15,
        dirColor: '#66aacc',
        dirIntensity: 0.4,
        fillColor: '#22aa66',
        fillIntensity: 0.3,
        rimColor: '#88ffaa',
        rimIntensity: 0.4,
        stars: false,
        bloom: { intensity: 0.7, luminanceThreshold: 0.5 },
      }
    case 3: // Nucleus
      return {
        bg: '#06040e',
        ambient: 0.1,
        dirColor: '#8866cc',
        dirIntensity: 0.5,
        fillColor: '#6644aa',
        fillIntensity: 0.3,
        rimColor: '#aa66ff',
        rimIntensity: 0.5,
        stars: false,
        bloom: { intensity: 0.8, luminanceThreshold: 0.4 },
      }
    case 4: // DNA / Molecular
    default:
      return {
        bg: '#020206',
        ambient: 0.15,
        dirColor: '#ff8844',
        dirIntensity: 0.5,
        fillColor: '#4466ff',
        fillIntensity: 0.4,
        rimColor: '#ff6644',
        rimIntensity: 0.4,
        stars: true,
        bloom: { intensity: 1.0, luminanceThreshold: 0.3 },
      }
  }
}

export default function SceneViewer({ sceneData }) {
  if (!sceneData) return null

  const { camera_defaults: cam, environment: env, zoom_depth: depth } = sceneData
  const lighting = useMemo(() => getSceneLighting(depth || 0, env), [depth, env])

  return (
    <Canvas
      camera={{
        position: cam.position,
        fov: cam.fov,
        near: cam.near,
        far: cam.far,
      }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false, toneMapping: 3 /* ACESFilmic */ }}
      dpr={[1, 2]}
      shadows="percentage"
    >
      <color attach="background" args={[lighting.bg]} />
      <AdaptiveDpr pixelated />

      {/* ---- LIGHTING RIG ---- */}
      {/* Ambient fill */}
      <ambientLight intensity={lighting.ambient} />

      {/* Main directional (key light) */}
      <directionalLight
        position={[8, 10, 5]}
        intensity={lighting.dirIntensity}
        color={lighting.dirColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={50}
        shadow-camera-near={0.1}
      />

      {/* Fill light (opposite side) */}
      <pointLight
        position={[-6, 4, -4]}
        intensity={lighting.fillIntensity}
        color={lighting.fillColor}
        distance={20}
      />

      {/* Rim/back light */}
      <pointLight
        position={[0, 6, -8]}
        intensity={lighting.rimIntensity}
        color={lighting.rimColor}
        distance={25}
      />

      {/* Bottom fill (subtle) for deeper scenes */}
      {(depth || 0) >= 2 && (
        <pointLight
          position={[0, -3, 0]}
          intensity={0.15}
          color="#88aacc"
          distance={10}
        />
      )}

      {/* Stars (only in lab and molecular levels) */}
      {lighting.stars && (
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0.2} fade speed={0.8} />
      )}

      {/* Fog */}
      {env.fog && (
        <fog attach="fog" args={[env.fog.color || '#000', env.fog.near || 5, env.fog.far || 30]} />
      )}

      {/* Camera controls */}
      <CameraRig target={cam.target} />

      {/* Scene objects */}
      <Suspense fallback={<LoadingFallback />}>
        <SceneContent sceneData={sceneData} />
      </Suspense>

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={lighting.bloom.intensity}
          luminanceThreshold={lighting.bloom.luminanceThreshold}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <Vignette
          eskil={false}
          offset={0.1}
          darkness={(depth || 0) >= 2 ? 0.8 : 0.5}
        />
      </EffectComposer>
    </Canvas>
  )
}
