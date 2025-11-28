import { Scene3D } from './components/Scene3D';
import { ModeToolbar } from './components/ui/ModeToolbar';
import { ComponentPanel } from './components/ui/ComponentPanel';
import { PropertiesPanel } from './components/ui/PropertiesPanel';
import { SimulationControls } from './components/ui/SimulationControls';
import { ErrorFeedback } from './components/ui/ErrorFeedback';
import './App.css';

function App() {
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">⚡</span>
            3D Circuit Simulator
          </h1>
          <p className="app-subtitle">Interactive Electronic Circuit Design & Simulation</p>
        </div>
        <ModeToolbar />
        <SimulationControls />
      </header>

      {/* Main content */}
      <div className="app-content">
        {/* Left sidebar */}
        <aside className="sidebar left">
          <ComponentPanel />
        </aside>

        {/* 3D Scene */}
        <main className="scene-container">
          <Scene3D />
        </main>

        {/* Right sidebar */}
        <aside className="sidebar right">
          <PropertiesPanel />
        </aside>
      </div>

      {/* Error feedback overlay */}
      <ErrorFeedback />
    </div>
  );
}

export default App;
