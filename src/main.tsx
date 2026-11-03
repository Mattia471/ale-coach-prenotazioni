import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import LegalPage from './LegalPage';
import './styles.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
const legalRoute = ({'/privacy':'privacy','/termini':'termini','/cookie':'cookie'} as const)[window.location.pathname as '/privacy'|'/termini'|'/cookie'];
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{legalRoute ? <LegalPage kind={legalRoute}/> : <App/>}</React.StrictMode>
);
