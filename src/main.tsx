import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import LegalPage from './LegalPage';
import MinimalFocusPrototype from './MinimalFocusPrototype';
import './styles.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
const legalRoute = ({'/privacy':'privacy','/termini':'termini','/cookie':'cookie'} as const)[window.location.pathname as '/privacy'|'/termini'|'/cookie'];
// This entry point exists only on the prototype branch. The live main branch is unchanged.
// View the real application on this preview deployment via /?original=1.
const showPrototype = !new URLSearchParams(window.location.search).has('original');
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{legalRoute ? <LegalPage kind={legalRoute}/> : showPrototype ? <MinimalFocusPrototype/> : <App/>}</React.StrictMode>
);
