
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './auth/AuthContext';

// --- SANITIZE CONSOLE LOGS & ERRORS TO PREVENT CIRCULAR JSON SERIALIZATION CRASHES ---
const originalError = console.error;
const originalWarn = console.warn;

const sanitizeValue = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (typeof value === 'object') {
    try {
      JSON.stringify(value);
      return value;
    } catch (e) {
      // Return a safe non-circular description
      return `[Circular/Unserializable Object: ${value.constructor?.name || 'Object'}] - Message: ${value.message || String(value)}`;
    }
  }
  return value;
};

console.error = (...args: any[]) => {
  const sanitizedArgs = args.map(sanitizeValue);
  originalError.apply(console, sanitizedArgs);
};

console.warn = (...args: any[]) => {
  const sanitizedArgs = args.map(sanitizeValue);
  originalWarn.apply(console, sanitizedArgs);
};

window.addEventListener('error', (event) => {
  if (event.error && typeof event.error === 'object') {
    try {
      JSON.stringify(event.error);
    } catch (e) {
      event.preventDefault();
      const safeError = new Error(event.error.message || String(event.error));
      console.error("Sanitized Uncaught Error:", safeError);
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object') {
    try {
      JSON.stringify(event.reason);
    } catch (e) {
      event.preventDefault();
      const safeError = new Error(event.reason.message || String(event.reason));
      console.error("Sanitized Unhandled Rejection:", safeError);
    }
  }
});
// -----------------------------------------------------------------------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

