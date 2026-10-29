export interface DistVerification {
  manuals: number;
  pages: number;
  knowledge: number;
  resources: number;
  pdfs: number;
  spreadsheets: number;
}

export function verifyDist(rootValue: string): Promise<DistVerification>;
