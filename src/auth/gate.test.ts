import { fireEvent, waitFor, within } from '@testing-library/dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { CredentialVerifierConfig } from './credentials';
import { requireAuthentication } from './gate';
import { AUTH_SESSION_KEY, AUTH_SESSION_MARKER } from './session';

const config: CredentialVerifierConfig = {
  username: 'training-test',
  saltHex: '00112233445566778899aabbccddeeff',
  iterations: 210_000,
  verifierHex: '59c7c73abc390250e3dbac79c0e6f0ca660364d4a5f9718e310e32bc9e32033a',
};

function submit(root: HTMLElement, username = 'training-test', password = 'test-only-password') {
  fireEvent.input(within(root).getByLabelText('Username'), { target: { value: username } });
  fireEvent.input(within(root).getByLabelText('Password'), { target: { value: password } });
  fireEvent.submit(within(root).getByRole('button', { name: 'Log in' }).closest('form')!);
}

describe('authentication gate', () => {
  beforeEach(() => sessionStorage.clear());

  test('renders an accessible shared login form while locked', () => {
    const root = document.createElement('div');
    void requireAuthentication(root, { config, storage: sessionStorage });

    expect(within(root).getByText('Motts Training Hub')).toBeTruthy();
    expect(within(root).getByRole('heading', { level: 1, name: 'Team access' })).toBeTruthy();
    expect(within(root).getByLabelText('Username').getAttribute('autocomplete')).toBe('username');
    expect(within(root).getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password');
    expect(within(root).getByRole('button', { name: 'Log in' })).toBeTruthy();
  });

  test('shows a generic message and remains locked after rejection', async () => {
    const root = document.createElement('div');
    void requireAuthentication(root, {
      config,
      storage: sessionStorage,
      verify: async () => false,
    });

    submit(root, 'wrong', 'wrong');

    await waitFor(() => expect(within(root).getByRole('alert').textContent).toBe(
      'The username or password is incorrect.',
    ));
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
  });

  test('resolves after successful verification and supports logout', async () => {
    const root = document.createElement('div');
    const reload = vi.fn();
    const authentication = requireAuthentication(root, {
      config,
      storage: sessionStorage,
      verify: async () => true,
      reload,
    });

    submit(root);
    const session = await authentication;

    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBe(AUTH_SESSION_MARKER);
    session.logout();
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
  });

  test('restores an exact session marker without rendering the form', async () => {
    sessionStorage.setItem(AUTH_SESSION_KEY, AUTH_SESSION_MARKER);
    const root = document.createElement('div');

    await requireAuthentication(root, { config, storage: sessionStorage });

    expect(within(root).queryByRole('heading', { name: 'Team access' })).toBeNull();
  });

  test('fails closed when verification is unavailable', async () => {
    const root = document.createElement('div');
    void requireAuthentication(root, {
      config,
      storage: sessionStorage,
      verify: async () => { throw new Error('unavailable'); },
    });

    submit(root);

    await waitFor(() => expect(within(root).getByRole('alert').textContent).toBe(
      'Login is unavailable. Please refresh and try again.',
    ));
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
  });

  test('checks only once while a submission is pending', async () => {
    const root = document.createElement('div');
    let resolveVerification!: (accepted: boolean) => void;
    const verify = vi.fn(() => new Promise<boolean>((resolve) => {
      resolveVerification = resolve;
    }));
    const authentication = requireAuthentication(root, {
      config,
      storage: sessionStorage,
      verify,
    });

    submit(root);
    fireEvent.submit(within(root).getByRole('button', { name: 'Log in' }).closest('form')!);

    expect(verify).toHaveBeenCalledOnce();
    expect((within(root).getByRole('button', { name: 'Log in' }) as HTMLButtonElement).disabled).toBe(true);
    resolveVerification(true);
    await authentication;
  });
});
