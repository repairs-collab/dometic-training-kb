import './styles.css';
import { createManualLibrary, fetchManualsLoader } from './manualLibrary';

const root = document.querySelector<HTMLElement>('#app');

if (!root) throw new Error('Missing application root');

void createManualLibrary(root, fetchManualsLoader);
