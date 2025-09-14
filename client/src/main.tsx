import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// --- Quitar overlay/splash si quedó montado ---
if (typeof window !== 'undefined') {
  const w = window as any;
  if (typeof w.hideLoadingScreen === 'function') {
    try { w.hideLoadingScreen(); } catch {}
  } else {
    const el =
      document.getElementById('__splash') ||
      document.getElementById('splash') ||
      document.getElementById('loading') ||
      document.querySelector('[data-app-splash]');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
}

// -------- Preloader: llamada segura + fallback --------
// --- Quitar overlay/splash de forma agresiva y segura ---
function forceHideOverlays() {
  const selectors = ['#__splash','#splash','#loading','#loading-screen','.loading-screen','[data-app-splash]'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  document.body.classList.add('loaded');
}
if (typeof window !== 'undefined') {
  const w = window as any;
  try { if (typeof w.hideLoadingScreen === 'function') w.hideLoadingScreen(); } catch {}
  try { forceHideOverlays(); } catch {}
}
// ------------------------------------------------------

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function updateDarkClass(e: MediaQueryListEvent | null = null) {
  const isDark = e ? e.matches : darkQuery.matches;
  document.documentElement.classList.toggle('dark', isDark);
}

updateDarkClass();
darkQuery.addEventListener('change', updateDarkClass);

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

// Add error boundary for better error handling
const ErrorFallback = ({ error }: { error: Error }) => (
  <div style={{
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#000',
    color: '#D3B869',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <h1>Error en la aplicación</h1>
    <p>Ha ocurrido un error inesperado:</p>
    <pre style={{
      backgroundColor: '#333',
      padding: '10px',
      borderRadius: '4px',
      maxWidth: '80%',
      overflow: 'auto'
    }}>
      {error.message}
    </pre>
    <button
      onClick={() => window.location.reload()}
      style={{
        marginTop: '20px',
        padding: '10px 20px',
        backgroundColor: '#D3B869',
        color: '#000',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Recargar Página
    </button>
  </div>
);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

try {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render React app:', error);
  (root as HTMLElement).innerHTML = `
    <div style="padding: 20px; text-align: center; background: #000; color: #D3B869; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
      <h1>Error al cargar la aplicación</h1>
      <p>No se pudo inicializar React. Revisa la consola para más detalles.</p>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #D3B869; color: #000; border: none; border-radius: 4px; cursor: pointer;">
        Recargar
      </button>
    </div>
  `;
}
