import './styles.css';
import { createApp, fetchCatalogLoader } from './app';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root is missing');
void createApp(root, fetchCatalogLoader);
