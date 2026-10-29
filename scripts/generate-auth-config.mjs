import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const VERIFIER_BYTES = 32;

function validateSalt(saltHex) {
  if (!/^[0-9a-f]{32}$/i.test(saltHex)) {
    throw new Error('saltHex must be 16 bytes of hexadecimal data');
  }
}

export async function buildCredentialVerifier({ username, password, saltHex } = {}) {
  if (typeof username !== 'string' || username.length === 0) {
    throw new Error('AUTH_USERNAME is required');
  }
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('AUTH_PASSWORD is required');
  }

  const resolvedSalt = saltHex ?? randomBytes(SALT_BYTES).toString('hex');
  validateSalt(resolvedSalt);
  const verifierHex = pbkdf2Sync(
    `${username}\u0000${password}`,
    Buffer.from(resolvedSalt, 'hex'),
    ITERATIONS,
    VERIFIER_BYTES,
    'sha256',
  ).toString('hex');

  return {
    username,
    saltHex: resolvedSalt.toLowerCase(),
    iterations: ITERATIONS,
    verifierHex,
  };
}

async function main() {
  const config = await buildCredentialVerifier({
    username: process.env.AUTH_USERNAME,
    password: process.env.AUTH_PASSWORD,
  });
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const output = resolve(moduleDirectory, '../src/auth/productionConfig.ts');
  const source = [
    "import type { CredentialVerifierConfig } from './credentials';",
    '',
    'export const productionAuthConfig: CredentialVerifierConfig = ' + JSON.stringify(config, null, 2) + ';',
    '',
  ].join('\n');
  await writeFile(output, source, 'utf8');
  process.stdout.write('Production authentication configuration generated.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
