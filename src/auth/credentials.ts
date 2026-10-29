export interface CredentialVerifierConfig {
  username: string;
  saltHex: string;
  iterations: number;
  verifierHex: string;
}

const MINIMUM_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const VERIFIER_BYTES = 32;

function decodeHex(value: string, expectedBytes: number, label: string): Uint8Array<ArrayBuffer> {
  if (!/^[0-9a-f]+$/i.test(value) || value.length !== expectedBytes * 2) {
    throw new Error(`${label} must be ${expectedBytes} bytes of hexadecimal data`);
  }

  const bytes = new Uint8Array(new ArrayBuffer(expectedBytes));
  for (let index = 0; index < expectedBytes; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function encodeHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCredentialVerifierConfig(
  config: CredentialVerifierConfig,
): CredentialVerifierConfig {
  if (!config || typeof config.username !== 'string' || config.username.length === 0) {
    throw new Error('username must be a non-empty string');
  }
  if (!Number.isInteger(config.iterations) || config.iterations < MINIMUM_ITERATIONS) {
    throw new Error(`iterations must be an integer of at least ${MINIMUM_ITERATIONS}`);
  }

  decodeHex(config.saltHex, SALT_BYTES, 'saltHex');
  decodeHex(config.verifierHex, VERIFIER_BYTES, 'verifierHex');

  return {
    ...config,
    saltHex: config.saltHex.toLowerCase(),
    verifierHex: config.verifierHex.toLowerCase(),
  };
}

export async function deriveCredentialVerifier(
  username: string,
  password: string,
  config: CredentialVerifierConfig,
  subtle: SubtleCrypto | undefined = globalThis.crypto?.subtle,
): Promise<string> {
  const validated = validateCredentialVerifierConfig(config);
  if (!subtle) throw new Error('Web Crypto is unavailable');

  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(`${username}\u0000${password}`),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: decodeHex(validated.saltHex, SALT_BYTES, 'saltHex'),
      iterations: validated.iterations,
    },
    keyMaterial,
    VERIFIER_BYTES * 8,
  );

  return encodeHex(bits);
}

export async function verifyCredentials(
  username: string,
  password: string,
  config: CredentialVerifierConfig,
  subtle?: SubtleCrypto,
): Promise<boolean> {
  const validated = validateCredentialVerifierConfig(config);
  const candidate = decodeHex(
    await deriveCredentialVerifier(username, password, validated, subtle),
    VERIFIER_BYTES,
    'candidate verifier',
  );
  const expected = decodeHex(validated.verifierHex, VERIFIER_BYTES, 'verifierHex');
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected[index]! ^ candidate[index]!;
  }
  return difference === 0;
}
