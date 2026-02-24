import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Environment, Stars, AdaptiveDpr } from '@react-three/drei'
import SceneContent from './SceneContent.jsx'
import CameraRig from './CameraRig.jsx'
import LoadingFallback from './LoadingFallback.jsx'

export default function SceneViewer({ sceneData }) {
  if (!sceneData) return null

  const { camera_defaults: cam, environment: env } = sceneData

  return (
    <Canvas
      camera={{
        position: cam.position,
        fov: cam.fov,
        near: cam.near,
        far: cam.far,
      }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0a0f']} />
      <AdaptiveDpr pixelated />

      {/* Lighting */}
      <ambientLight intensity={env.ambient_light || 0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#4488ff" />

      {/* Environment */}
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

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
    </Canvas>
  )
}
