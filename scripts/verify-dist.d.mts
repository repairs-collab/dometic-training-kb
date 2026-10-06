export interface DistVerification {
  manuals: number;
  pages: number;
  knowledge: number;
  pdfs: number;
}

export function verifyDist(rootValue: string): Promise<DistVerification>;
