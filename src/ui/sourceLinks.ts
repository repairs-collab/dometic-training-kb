export function buildPdfUrl(filename: string, pageNumber: number): string {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error('pageNumber must be a positive integer');
  }
  return `./manuals/${encodeURIComponent(filename)}#page=${pageNumber}`;
}
