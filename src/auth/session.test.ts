import { beforeEach, describe, expect, test } from 'vitest';

import {
  AUTH_SESSION_KEY,
  AUTH_SESSION_MARKER,
  clearAuthentication,
  isAuthenticated,
  markAuthenticated,
} from './session';

describe('authentication session state', () => {
  beforeEach(() => sessionStorage.clear());

  test('treats absent, empty and unknown markers as locked', () => {
    expect(isAuthenticated(sessionStorage)).toBe(false);
    sessionStorage.setItem(AUTH_SESSION_KEY, '');
    expect(isAuthenticated(sessionStorage)).toBe(false);
    sessionStorage.setItem(AUTH_SESSION_KEY, 'unknown');
    expect(isAuthenticated(sessionStorage)).toBe(false);
  });

  test('stores only the exact authenticated marker', () => {
    markAuthenticated(sessionStorage);

    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBe(AUTH_SESSION_MARKER);
    expect(isAuthenticated(sessionStorage)).toBe(true);
  });

  test('clears authentication state', () => {
    markAuthenticated(sessionStorage);
    clearAuthentication(sessionStorage);

    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(isAuthenticated(sessionStorage)).toBe(false);
  });
});
