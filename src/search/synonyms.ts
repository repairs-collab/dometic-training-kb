import { normaliseSearchText } from './normalise';

export interface AliasCatalog {
  phrases: Record<string, string[]>;
  models: Record<string, string>;
}

function includesPhrase(query: string, phrase: string): boolean {
  return (` ${query} `).includes(` ${phrase} `);
}

export function expandQuery(query: string, aliases: AliasCatalog): string {
  const normalized = normaliseSearchText(query);
  const additions = new Set<string>();

  for (const [canonicalValue, aliasValues] of Object.entries(aliases.phrases)) {
    const canonical = normaliseSearchText(canonicalValue);
    const variants = [canonical, ...aliasValues.map(normaliseSearchText)];
    if (variants.some((variant) => includesPhrase(normalized, variant))) {
      variants.forEach((variant) => additions.add(variant));
    }
  }

  for (const [aliasValue, modelValue] of Object.entries(aliases.models)) {
    const alias = normaliseSearchText(aliasValue);
    const model = normaliseSearchText(modelValue);
    if (includesPhrase(normalized, alias) || includesPhrase(normalized, model)) {
      additions.add(alias);
      additions.add(model);
    }
  }

  return [normalized, ...additions].filter(Boolean).join(' ');
}
