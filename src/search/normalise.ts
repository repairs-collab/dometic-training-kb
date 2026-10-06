export function normaliseSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .toLowerCase()
    .replace(/([a-z]{2,8})[\s-]+(\d+(?:\.\d+)?[a-z]*)\b/g, '$1$2')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactToken(value: string): string {
  return normaliseSearchText(value).replace(/[^a-z0-9]/g, '');
}

export function queryTokens(value: string): string[] {
  return normaliseSearchText(value).split(' ').filter(Boolean);
}
