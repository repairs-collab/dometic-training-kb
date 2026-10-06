import type { EntryKind, ProductCategory } from '../data/types';
import type { SearchCorpus } from '../search/engine';

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  count: number;
}

export interface FilterOptions {
  categories: FilterOption<ProductCategory>[];
  models: FilterOption[];
  kinds: FilterOption<EntryKind>[];
  manuals: FilterOption[];
}

function labelFor(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function countedOptions<T extends string>(counts: Map<T, number>): FilterOption<T>[] {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: labelFor(value), count }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function deriveFilterOptions(corpus: SearchCorpus): FilterOptions {
  const categoryCounts = new Map<ProductCategory, number>();
  const modelCounts = new Map<string, number>();
  const kindCounts = new Map<EntryKind, number>();

  for (const entry of corpus.knowledge) {
    categoryCounts.set(entry.category, (categoryCounts.get(entry.category) ?? 0) + 1);
    kindCounts.set(entry.kind, (kindCounts.get(entry.kind) ?? 0) + 1);
    for (const model of new Set([...entry.productFamilies, ...entry.models])) {
      modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
    }
  }

  return {
    categories: countedOptions(categoryCounts),
    models: countedOptions(modelCounts),
    kinds: countedOptions(kindCounts),
    manuals: corpus.manuals
      .map((manual) => ({
        value: manual.id,
        label: manual.title,
        count: manual.pageCount,
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  };
}
