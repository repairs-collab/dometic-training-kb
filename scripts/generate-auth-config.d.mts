export interface BuildCredentialVerifierInput {
  username?: string;
  password?: string;
  saltHex?: string;
}

export interface GeneratedCredentialVerifier {
  username: string;
  saltHex: string;
  iterations: number;
  verifierHex: string;
}

export function buildCredentialVerifier(
  input?: BuildCredentialVerifierInput,
): Promise<GeneratedCredentialVerifier>;
