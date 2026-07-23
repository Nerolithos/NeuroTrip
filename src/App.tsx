import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useIdleTracker } from './hooks/useIdleTracker'
import { useReducedMotionPreference } from './hooks/useReducedMotionPreference'
import { AmygdalaScene } from './scenes/AmygdalaScene/AmygdalaScene'
import { BehaviorScene } from './scenes/BehaviorScene/BehaviorScene'
import { BrainMapScene } from './scenes/BrainMapScene/BrainMapScene'
import { DefaultModeScene } from './scenes/DefaultModeScene/DefaultModeScene'
import { ExitScene } from './scenes/ExitScene/ExitScene'
import { FacePipelineScene } from './scenes/FacePipelineScene/FacePipelineScene'
import { GatewayScene } from './scenes/GatewayScene/GatewayScene'
import { HippocampusScene } from './scenes/HippocampusScene/HippocampusScene'
import { SourcesScene } from './scenes/SourcesScene/SourcesScene'
import { VisualSystemsConsole } from './scenes/VisualSystemsConsole/VisualSystemsConsole'
import './styles/app.css'

const AppRoutes = () => {
  useReducedMotionPreference()
  useIdleTracker()

  return (
    <Routes>
      <Route path="/" element={<GatewayScene />} />
      <Route path="/behavior" element={<BehaviorScene />} />
      <Route path="/map" element={<BrainMapScene />} />
      <Route path="/scene/visual-cortex" element={<VisualSystemsConsole />} />
      <Route path="/scene/face-pipeline" element={<FacePipelineScene />} />
      <Route path="/scene/amygdala" element={<AmygdalaScene />} />
      <Route path="/scene/hippocampus" element={<HippocampusScene />} />
      <Route path="/scene/default-mode-network" element={<DefaultModeScene />} />
      <Route path="/exit" element={<ExitScene />} />
      <Route path="/sources" element={<SourcesScene />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
