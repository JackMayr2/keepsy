import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

/* StrictMode double-mount breaks Firebase RecaptchaVerifier (stale widget → auth/invalid-app-credential). */
createRoot(document.getElementById('root')!).render(<App />);
