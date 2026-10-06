import MiniSearch from 'minisearch';
import type {
  EntryKind,
  KnowledgeEntry,
  ManualRecord,
  PageRecord,
  ProductCategory,
} from '../data/types';
import { compactToken, normaliseSearchText, queryTokens } from './normalise';
import { expandQuery, type AliasCatalog } from './synonyms';

export interface SearchCorpus {
  manuals: ManualRecord[];
  pages: PageRecord[];
  knowledge: KnowledgeEntry[];
  aliases: AliasCatalog;
}

export interface SearchFilters {
  category?: ProductCategory;
  model?: string;
  kind?: EntryKind;
  manualId?: string;
}

export type MatchReason =
  | 'exact-model-code'
  | 'unqualified-short-code'
  | 'exact-code'
  | 'exact-topic'
  | 'model-match'
  | 'phrase-match'
  | 'text-match';

export interface SearchHit {
  id: string;
  type: 'knowledge' | 'page';
  score: number;
  matchReason: MatchReason;
  category: ProductCategory;
  productFamilies: string[];
  models: string[];
  kind?: EntryKind;
  manualIds: string[];
}

interface IndexedDocument {
  key: string;
  entityId: string;
  type: 'knowledge' | 'page';
  category: ProductCategory;
  productFamilies: string[];
  models: string[];
  kind?: EntryKind;
  manualIds: string[];
  title: string;
  codes: string;
  modelsText: string;
  aliases: string;
  symptoms: string;
  summary: string;
  body: string;
  acceptanceTopics: string[];
  searchableText: string;
}

export interface SearchEngine {
  corpus: SearchCorpus;
  index: MiniSearch<IndexedDocument>;
  documents: Map<string, IndexedDocument>;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function buildDocuments(corpus: SearchCorpus): IndexedDocument[] {
  const manuals = new Map(corpus.manuals.map((manual) => [manual.id, manual]));
  const knowledgeDocuments = corpus.knowledge.map((entry): IndexedDocument => {
    const manualIds = unique(entry.sourceRefs.map((source) => source.manualId));
    const acceptanceTopics = entry.acceptanceTopics ?? [];
    const searchableText = [
      entry.title,
      ...entry.codes,
      ...entry.models,
      ...entry.productFamilies,
      ...entry.aliases,
      ...entry.symptoms,
      entry.summary,
      entry.searchText,
      ...acceptanceTopics,
    ].join(' ');
    return {
      key: `knowledge:${entry.id}`,
      entityId: entry.id,
      type: 'knowledge',
      category: entry.category,
      productFamilies: entry.productFamilies,
      models: entry.models,
      kind: entry.kind,
      manualIds,
      title: entry.title,
      codes: entry.codes.join(' '),
      modelsText: [...entry.models, ...entry.productFamilies].join(' '),
      aliases: [...entry.aliases, ...acceptanceTopics].join(' '),
      symptoms: entry.symptoms.join(' '),
      summary: entry.summary,
      body: `${entry.searchText} ${entry.steps.join(' ')}`,
      acceptanceTopics,
      searchableText: normaliseSearchText(searchableText),
    };
  });

  const pageDocuments = corpus.pages
    .filter(
      (page) =>
        !('searchTextExcluded' in page && page.searchTextExcluded) &&
        page.extractionStatus !== 'excluded' &&
        page.extractionStatus !== 'visual-only',
    )
    .map((page): IndexedDocument => {
      const manual = manuals.get(page.manualId);
      const category = page.category === 'general' && manual ? manual.category : page.category;
      const productFamilies = unique([
        ...page.productFamilies,
        ...(manual?.productFamilies ?? []),
      ]);
      const title = `${manual?.title ?? page.manualId} page ${page.pageNumber}`;
      const searchableText = normaliseSearchText(
        [title, ...productFamilies, ...page.models, ...page.aliases, page.text].join(' '),
      );
      return {
        key: `page:${page.id}`,
        entityId: page.id,
        type: 'page',
        category,
        productFamilies,
        models: page.models,
        manualIds: [page.manualId],
        title,
        codes: '',
        modelsText: [...page.models, ...productFamilies].join(' '),
        aliases: page.aliases.join(' '),
        symptoms: '',
        summary: page.excerpt,
        body: page.text,
        acceptanceTopics: [],
        searchableText,
      };
    });

  return [...knowledgeDocuments, ...pageDocuments];
}

export function createSearchEngine(corpus: SearchCorpus): SearchEngine {
  const documents = buildDocuments(corpus);
  const index = new MiniSearch<IndexedDocument>({
    idField: 'key',
    fields: ['title', 'codes', 'modelsText', 'aliases', 'symptoms', 'summary', 'body'],
    storeFields: ['key'],
    processTerm: (term) => normaliseSearchText(term),
  });
  index.addAll(documents);
  return {
    corpus,
    index,
    documents: new Map(documents.map((document) => [document.key, document])),
  };
}

function hasModelContext(document: IndexedDocument, normalizedQuery: string): boolean {
  return [...document.models, ...document.productFamilies].some((value) => {
    const normalizedModel = normaliseSearchText(value);
    const compactModel = compactToken(value);
    return (
      normalizedModel.length >= 3 &&
      (normalizedQuery.includes(normalizedModel) ||
        (compactModel.length >= 3 && compactToken(normalizedQuery).includes(compactModel)))
    );
  });
}

function exactCode(document: IndexedDocument, normalizedQuery: string): string | undefined {
  return document.codes
    .split(' ')
    .filter(Boolean)
    .find((code) => queryTokens(normalizedQuery).includes(normaliseSearchText(code)));
}

function matchesFilters(document: IndexedDocument, filters: SearchFilters): boolean {
  if (filters.category && document.category !== filters.category) return false;
  if (filters.kind && document.kind !== filters.kind) return false;
  if (filters.manualId && !document.manualIds.includes(filters.manualId)) return false;
  if (filters.model) {
    const wanted = compactToken(filters.model);
    const values = [...document.models, ...document.productFamilies].map(compactToken);
    if (!values.some((value) => value.includes(wanted) || wanted.includes(value))) return false;
  }
  return true;
}

function rank(
  document: IndexedDocument,
  baseScore: number,
  normalizedQuery: string,
): SearchHit {
  const tokens = queryTokens(normalizedQuery);
  const modelContext = hasModelContext(document, normalizedQuery);
  const code = exactCode(document, normalizedQuery);
  const compactCode = code ? compactToken(code) : '';
  const shortCodeOnly = tokens.length === 1 && /^\d{1,2}$/.test(tokens[0] ?? '');
  const exactTopic = document.acceptanceTopics.some(
    (topic) => normaliseSearchText(topic) === normalizedQuery,
  );
  const allTokensPresent = tokens.every((token) => document.searchableText.includes(token));
  let score = baseScore + (document.type === 'knowledge' ? 120 : 0);
  let matchReason: MatchReason = 'text-match';

  if (allTokensPresent) score += 45;
  if (modelContext) {
    score += 90;
    matchReason = 'model-match';
  }
  if (normalizedQuery.length >= 4 && document.searchableText.includes(normalizedQuery)) {
    score += 80;
    matchReason = 'phrase-match';
  }
  if (exactTopic) {
    score += 500;
    matchReason = 'exact-topic';
  }
  if (code) {
    if (modelContext) {
      score += 320;
      matchReason = 'exact-model-code';
    } else if (shortCodeOnly || compactCode.length <= 2) {
      score += 5;
      matchReason = 'unqualified-short-code';
    } else {
      score += 130;
      matchReason = 'exact-code';
    }
  }
  if (shortCodeOnly) matchReason = 'unqualified-short-code';

  return {
    id: document.entityId,
    type: document.type,
    score,
    matchReason,
    category: document.category,
    productFamilies: document.productFamilies,
    models: document.models,
    kind: document.kind,
    manualIds: document.manualIds,
  };
}

export function search(
  engine: SearchEngine,
  query: string,
  filters: SearchFilters,
): SearchHit[] {
  const normalizedQuery = normaliseSearchText(query);
  if (!normalizedQuery) return [];
  const expandedQuery = expandQuery(query, engine.corpus.aliases);
  const results = engine.index.search(expandedQuery, {
    boost: {
      codes: 12,
      modelsText: 10,
      title: 8,
      aliases: 6,
      symptoms: 5,
      summary: 3,
      body: 1,
    },
    combineWith: 'OR',
    prefix: (term) => term.length >= 3,
    fuzzy: (term) => (term.length >= 6 ? 0.15 : false),
  });

  return results
    .map((result) => {
      const document = engine.documents.get(String(result.id));
      return document ? rank(document, result.score, normalizedQuery) : undefined;
    })
    .filter((hit): hit is SearchHit => Boolean(hit))
    .filter((hit) => {
      const key = `${hit.type}:${hit.id}`;
      const document = engine.documents.get(key);
      return document ? matchesFilters(document, filters) : false;
    })
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
