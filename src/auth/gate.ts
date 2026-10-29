import type { CredentialVerifierConfig } from './credentials';
import { verifyCredentials } from './credentials';
import { clearAuthentication, isAuthenticated, markAuthenticated } from './session';

export interface AuthSession {
  logout(): void;
}

export interface AuthGateOptions {
  config: CredentialVerifierConfig;
  storage?: Storage;
  verify?: (username: string, password: string) => Promise<boolean>;
  subtle?: SubtleCrypto;
  reload?: () => void;
}

function createSession(storage: Storage, reload: () => void): AuthSession {
  return {
    logout() {
      clearAuthentication(storage);
      reload();
    },
  };
}

function renderLogin(root: HTMLElement): {
  form: HTMLFormElement;
  username: HTMLInputElement;
  password: HTMLInputElement;
  submit: HTMLButtonElement;
  error: HTMLParagraphElement;
} {
  const shell = document.createElement('main');
  shell.className = 'auth-shell';
  const card = document.createElement('section');
  card.className = 'auth-card';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Dometic Training Knowledge Base';
  const heading = document.createElement('h1');
  heading.textContent = 'Team access';
  const introduction = document.createElement('p');
  introduction.textContent = 'Enter the shared team username and password to continue.';

  const form = document.createElement('form');
  form.className = 'auth-form';
  const usernameLabel = document.createElement('label');
  usernameLabel.htmlFor = 'auth-username';
  usernameLabel.textContent = 'Username';
  const username = document.createElement('input');
  username.id = 'auth-username';
  username.name = 'username';
  username.type = 'text';
  username.autocomplete = 'username';
  username.required = true;
  const passwordLabel = document.createElement('label');
  passwordLabel.htmlFor = 'auth-password';
  passwordLabel.textContent = 'Password';
  const password = document.createElement('input');
  password.id = 'auth-password';
  password.name = 'password';
  password.type = 'password';
  password.autocomplete = 'current-password';
  password.required = true;
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button button--primary';
  submit.textContent = 'Log in';
  const error = document.createElement('p');
  error.className = 'auth-error';
  error.setAttribute('role', 'alert');
  error.setAttribute('aria-live', 'polite');

  form.append(usernameLabel, username, passwordLabel, password, submit, error);
  card.append(eyebrow, heading, introduction, form);
  shell.append(card);
  root.replaceChildren(shell);

  return { form, username, password, submit, error };
}

export function requireAuthentication(
  root: HTMLElement,
  options: AuthGateOptions,
): Promise<AuthSession> {
  const storage = options.storage ?? window.sessionStorage;
  const reload = options.reload ?? (() => window.location.reload());
  const session = createSession(storage, reload);
  if (isAuthenticated(storage)) return Promise.resolve(session);

  const view = renderLogin(root);
  const check = options.verify ?? ((username, password) =>
    verifyCredentials(username, password, options.config, options.subtle ?? window.crypto?.subtle));

  return new Promise<AuthSession>((resolve) => {
    let pending = false;
    view.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (pending) return;
      pending = true;
      view.submit.disabled = true;
      view.error.textContent = '';

      try {
        const accepted = await check(view.username.value, view.password.value);
        if (!accepted) {
          view.error.textContent = 'The username or password is incorrect.';
          return;
        }
        markAuthenticated(storage);
        root.replaceChildren();
        resolve(session);
      } catch {
        view.error.textContent = 'Login is unavailable. Please refresh and try again.';
      } finally {
        pending = false;
        view.submit.disabled = false;
      }
    });
  });
}
