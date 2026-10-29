export function buildPdfUrl(filename: string, pageNumber: number): string {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error('pageNumber must be a positive integer');
  }
  return `/manuals/${encodeURIComponent(filename)}#page=${pageNumber}`;
}

export function buildSourceUrl(
  filename: string,
  pageNumber: number,
  format: 'pdf' | 'xlsx' = 'pdf',
): string {
  if (format === 'xlsx') return `/manuals/${encodeURIComponent(filename)}`;
  return buildPdfUrl(filename, pageNumber);
}
