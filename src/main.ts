import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import './style.css';
import { Planner } from './planner';

let planner: Planner | undefined;
try { planner = new Planner(); }
catch (error) {
  console.error('Unable to initialize the 3D planner:', error);
  const app = document.querySelector('#app')!;
  app.innerHTML = `<div class="fatal-error"><span class="brand-icon">◇</span><h1>The 3D workspace could not start.</h1><p>Please open this page in a desktop browser with WebGL and hardware acceleration enabled.</p><button class="primary-button" id="retry">Try again</button><p id="error-detail"></p></div>`;
  document.querySelector('#error-detail')!.textContent = error instanceof Error ? error.message : String(error);
  document.querySelector('#retry')!.addEventListener('click',()=>window.location.reload());
}
if (import.meta.hot) import.meta.hot.dispose(()=>planner?.dispose());
