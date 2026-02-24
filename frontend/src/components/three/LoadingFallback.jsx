import { Html } from '@react-three/drei'

export default function LoadingFallback() {
  return (
    <Html center>
      <div style={{
        color: '#00ff88',
        fontSize: '16px',
        fontWeight: 500,
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: 8 }}>Loading scene...</div>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid #222',
          borderTop: '3px solid #00ff88',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Html>
  )
}
