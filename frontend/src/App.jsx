import { Routes, Route } from 'react-router-dom'
import Explorer from './pages/Explorer.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Explorer sceneSlug="science-lab" />} />
      <Route path="/scene/:slug" element={<Explorer />} />
    </Routes>
  )
}
