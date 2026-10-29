import './styles.css';
import { createApp, fetchCatalogLoader } from './app';
import { authConfig } from './auth/config';
import { requireAuthentication } from './auth/gate';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root is missing');
const appRoot = root;

async function start(): Promise<void> {
  const authSession = await requireAuthentication(appRoot, { config: authConfig });
  await createApp(appRoot, fetchCatalogLoader, authSession.logout);
}

void start();
