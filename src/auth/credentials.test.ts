import { describe, expect, test } from 'vitest';

import {
  deriveCredentialVerifier,
  validateCredentialVerifierConfig,
  verifyCredentials,
  type CredentialVerifierConfig,
} from './credentials';

const testConfig: CredentialVerifierConfig = {
  username: 'training-test',
  saltHex: '00112233445566778899aabbccddeeff',
  iterations: 210_000,
  verifierHex: '59c7c73abc390250e3dbac79c0e6f0ca660364d4a5f9718e310e32bc9e32033a',
};

describe('credential verification', () => {
  test('derives the hand-checked test verifier', async () => {
    await expect(
      deriveCredentialVerifier('training-test', 'test-only-password', testConfig),
    ).resolves.toBe(testConfig.verifierHex);
  });

  test('accepts only exact matching credentials', async () => {
    await expect(verifyCredentials('training-test', 'test-only-password', testConfig)).resolves.toBe(true);

    for (const [username, password] of [
      ['Training-test', 'test-only-password'],
      ['training-test ', 'test-only-password'],
      ['training-test', 'test-only-password '],
      ['training-tеst', 'test-only-password'],
      ['training-test', 'test-only-passwοrd'],
    ] satisfies [string, string][]) {
      await expect(verifyCredentials(username, password, testConfig)).resolves.toBe(false);
    }
  });

  test('rejects malformed verifier configuration', () => {
    for (const config of [
      { ...testConfig, saltHex: 'not-hex' },
      { ...testConfig, saltHex: '0011' },
      { ...testConfig, verifierHex: 'aa' },
      { ...testConfig, iterations: 99_999 },
    ]) {
      expect(() => validateCredentialVerifierConfig(config)).toThrow();
    }
  });
});
