import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ToastNotificationProvider } from './context/ToastNotificationContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastNotificationProvider>
        <App />
      </ToastNotificationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
