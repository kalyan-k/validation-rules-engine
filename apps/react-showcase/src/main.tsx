import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ValidationRulesProvider } from '@validation-rules-engine/react';
import { App } from './app';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ValidationRulesProvider configuration={{ validateOnBlur: true, validateOnChange: false }}>
      <App />
    </ValidationRulesProvider>
  </StrictMode>
);
