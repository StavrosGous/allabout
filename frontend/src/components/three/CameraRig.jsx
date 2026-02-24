import { CameraControls } from '@react-three/drei'
import { useRef, useEffect } from 'react'
import useSceneStore from '../../stores/sceneStore.js'
import useEditorStore from '../../stores/editorStore.js'

export default function CameraRig({ target }) {
  const controlsRef = useRef()
  const focusedObjectId = useSceneStore((s) => s.focusedObjectId)
  const sceneData = useSceneStore((s) => s.sceneData)
  const draggingObjectId = useEditorStore((s) => s.draggingObjectId)

  // Disable camera controls while dragging an object
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !draggingObjectId
    }
  }, [draggingObjectId])

  // Reset camera when scene changes
  useEffect(() => {
    if (controlsRef.current && target) {
      controlsRef.current.setLookAt(
        ...sceneData.camera_defaults.position,
        ...target,
        true
      )
    }
  }, [sceneData?.slug])

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      dollySpeed={0.5}
      minDistance={0.5}
      maxDistance={50}
      smoothTime={0.3}
    />
  )
}
