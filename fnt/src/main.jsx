import '@fontsource/rye/400.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './styles/tokens.css';
import './styles/base.css';

import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.jsx';
import { ProveedorAuth } from './lib/auth.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ProveedorAuth>
        <App />
        <Toaster
          theme="dark"
          position="bottom-center"
          offset={88}
          toastOptions={{
            style: {
              background: 'var(--surface-3)',
              color: 'var(--ink)',
              border: '0',
              fontFamily: 'var(--font-ui)',
            },
          }}
        />
      </ProveedorAuth>
    </MotionConfig>
  </StrictMode>,
);
