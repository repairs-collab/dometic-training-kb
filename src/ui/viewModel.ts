import type {
  EntryKind,
  PartReference,
  ProductCategory,
  SourceRef,
  SpecificationValue,
} from '../data/types';
import type { SearchCorpus, SearchHit } from '../search/engine';
import { buildPdfUrl } from './sourceLinks';

export interface ResultSource {
  manualId: string;
  manualTitle: string;
  pageNumber: number;
  label: string;
  url: string;
}

export interface ResultSection {
  kind: 'warning' | 'steps';
  items: string[];
}

export interface ResultCard {
  id: string;
  type: 'knowledge' | 'page';
  title: string;
  category: ProductCategory;
  kind?: EntryKind;
  productFamilies: string[];
  models: string[];
  summary: string;
  sections: ResultSection[];
  parts: PartReference[];
  specifications: SpecificationValue[];
  sources: ResultSource[];
  score: number;
}

export type ResultViewState =
  | { status: 'loading'; message: string }
  | { status: 'empty'; message: string }
  | { status: 'ready'; cards: ResultCard[] }
  | { status: 'error'; message: string };

function sourceLinks(sourceRefs: SourceRef[], corpus: SearchCorpus): ResultSource[] {
  const manuals = new Map(corpus.manuals.map((manual) => [manual.id, manual]));
  const seen = new Set<string>();
  const sources: ResultSource[] = [];
  for (const sourceRef of sourceRefs) {
    const key = `${sourceRef.manualId}:${sourceRef.pageNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const manual = manuals.get(sourceRef.manualId);
    if (!manual) continue;
    sources.push({
      manualId: sourceRef.manualId,
      manualTitle: manual.title,
      pageNumber: sourceRef.pageNumber,
      label: sourceRef.label ?? `${manual.title}, page ${sourceRef.pageNumber}`,
      url: buildPdfUrl(manual.filename, sourceRef.pageNumber),
    });
  }
  return sources;
}

function sections(warnings: string[], steps: string[]): ResultSection[] {
  const values: ResultSection[] = [];
  if (warnings.length) values.push({ kind: 'warning', items: warnings });
  if (steps.length) values.push({ kind: 'steps', items: steps });
  return values;
}

function pageSummary(text: string, excerpt: string, matchedCode?: string): string {
  if (!matchedCode) return excerpt || text.slice(0, 240);
  const index = text.toLowerCase().indexOf(matchedCode.toLowerCase());
  if (index < 0) return excerpt || text.slice(0, 240);
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + matchedCode.length + 170);
  return `${start ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

export function buildResultCards(hits: SearchHit[], corpus: SearchCorpus): ResultCard[] {
  const knowledge = new Map(corpus.knowledge.map((entry) => [entry.id, entry]));
  const pages = new Map(corpus.pages.map((page) => [page.id, page]));
  const manuals = new Map(corpus.manuals.map((manual) => [manual.id, manual]));

  return hits
    .map((hit): ResultCard | undefined => {
      if (hit.type === 'knowledge') {
        const entry = knowledge.get(hit.id);
        if (!entry) return undefined;
        return {
          id: entry.id,
          type: 'knowledge',
          title: entry.title,
          category: entry.category,
          kind: entry.kind,
          productFamilies: entry.productFamilies,
          models: entry.models,
          summary: entry.summary,
          sections: sections(entry.warnings, entry.steps),
          parts: entry.parts,
          specifications: entry.specifications,
          sources: sourceLinks(entry.sourceRefs, corpus),
          score: hit.score,
        };
      }

      const page = pages.get(hit.id);
      if (!page) return undefined;
      const manual = manuals.get(page.manualId);
      const sourceRefs = page.alternateSourceRefs?.length
        ? page.alternateSourceRefs
        : [{ manualId: page.manualId, pageNumber: page.pageNumber }];
      return {
        id: page.id,
        type: 'page',
        title: `${manual?.title ?? page.manualId} - page ${page.pageNumber}`,
        category: hit.category,
        productFamilies: page.productFamilies,
        models: page.models,
        summary: pageSummary(page.text, page.excerpt, hit.matchedCode),
        sections: [],
        parts: [],
        specifications: [],
        sources: sourceLinks(sourceRefs, corpus),
        score: hit.score,
      };
    })
    .filter((card): card is ResultCard => Boolean(card))
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference) return scoreDifference;
      if (left.type !== right.type) return left.type === 'knowledge' ? -1 : 1;
      return left.id.localeCompare(right.id);
    });
}
