export const AUTH_SESSION_KEY = 'dometic-training-auth-v1';
export const AUTH_SESSION_MARKER = 'authenticated';

export function isAuthenticated(storage: Storage): boolean {
  return storage.getItem(AUTH_SESSION_KEY) === AUTH_SESSION_MARKER;
}

export function markAuthenticated(storage: Storage): void {
  storage.setItem(AUTH_SESSION_KEY, AUTH_SESSION_MARKER);
}

export function clearAuthentication(storage: Storage): void {
  storage.removeItem(AUTH_SESSION_KEY);
}
