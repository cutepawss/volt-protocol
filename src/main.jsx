import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { VoltProvider } from './context/VoltContext';
import ErrorBoundary from './components/Shared/ErrorBoundary';
import { initErrorTracking } from './utils/errorTracking';

// Initialize error tracking
initErrorTracking();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <VoltProvider>
        <App />
      </VoltProvider>
    </ErrorBoundary>
  </StrictMode>,
);
