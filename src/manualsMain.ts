import './styles.css';
import { createManualLibrary, fetchManualsLoader } from './manualLibrary';
import { authConfig } from './auth/config';
import { requireAuthentication } from './auth/gate';

const root = document.querySelector<HTMLElement>('#app');

if (!root) throw new Error('Missing application root');
const appRoot = root;

async function start(): Promise<void> {
  const authSession = await requireAuthentication(appRoot, { config: authConfig });
  await createManualLibrary(appRoot, fetchManualsLoader, authSession.logout);
}

void start();
