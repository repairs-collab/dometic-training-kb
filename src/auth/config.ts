import type { CredentialVerifierConfig } from './credentials';
import { productionAuthConfig } from './productionConfig';

const testAuthConfig: CredentialVerifierConfig = {
  username: 'training-test',
  saltHex: '00112233445566778899aabbccddeeff',
  iterations: 210_000,
  verifierHex: '59c7c73abc390250e3dbac79c0e6f0ca660364d4a5f9718e310e32bc9e32033a',
};

export const authConfig = import.meta.env.MODE === 'auth-test'
  ? testAuthConfig
  : productionAuthConfig;
