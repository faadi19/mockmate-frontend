import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/font-sizes.css';
import './styles/fonts.css';

// MediaPipe scripts are loaded in index.html before this script runs
// React app will start normally - MediaPipe initialization happens lazily in the hook
// The hook's waitForMediaPipe() function ensures scripts are loaded before use

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
