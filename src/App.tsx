import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Workflows from './pages/Workflows';
import WorkflowView from './pages/WorkflowView';
import Agents from './pages/Agents';
import Integrations from './pages/Integrations';
import './App.css';

const Settings = () => <div>Settings Page</div>;

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/workflows" replace />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/workflows/:workflowId" element={<WorkflowView />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/integrations" element={<Integrations />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App; 