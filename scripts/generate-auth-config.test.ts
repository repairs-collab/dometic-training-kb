import { describe, expect, test } from 'vitest';

import { buildCredentialVerifier } from './generate-auth-config.mjs';

describe('authentication configuration generator', () => {
  test('builds the hand-checked verifier without returning plaintext credentials', async () => {
    const config = await buildCredentialVerifier({
      username: 'training-test',
      password: 'test-only-password',
      saltHex: '00112233445566778899aabbccddeeff',
    });

    expect(config).toEqual({
      username: 'training-test',
      saltHex: '00112233445566778899aabbccddeeff',
      iterations: 210_000,
      verifierHex: '59c7c73abc390250e3dbac79c0e6f0ca660364d4a5f9718e310e32bc9e32033a',
    });
    expect(JSON.stringify(config)).not.toContain('test-only-password');
  });

  test('rejects missing inputs', async () => {
    await expect(buildCredentialVerifier({ username: '', password: 'password' })).rejects.toThrow();
    await expect(buildCredentialVerifier({ username: 'username', password: '' })).rejects.toThrow();
  });
});
