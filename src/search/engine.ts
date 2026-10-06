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
  matchedCode?: string;
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
  codeTokens: string[];
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
  knownModelTokens: Set<string>;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function separatedCodeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function declaredCodeTokens(values: string[]): string[] {
  return unique(
    values.flatMap((value) => {
      const normalized = separatedCodeText(value);
      const compact = compactToken(value);
      const tokens = normalized.match(/\b[a-z]{1,3}\d{1,3}\b/g) ?? [];
      const contextualNumbers = [...normalized.matchAll(/\b(?:error|warning|code)\s+(\d{1,3})\b/g)]
        .map((match) => match[1] ?? '');
      if (/^(?:[a-z]{1,3}\d{0,3}|\d{1,3})$/.test(compact)) tokens.push(compact);
      return [...tokens, ...contextualNumbers].map(compactToken);
    }),
  );
}

function pageCodeTokens(value: string): string[] {
  const uppercaseCodes = value.match(/\b(?:[A-Z]{1,2}|[A-Z]{1,3}\d{1,3})\b/g) ?? [];
  const normalized = separatedCodeText(value);
  const contextualNumbers = [...normalized.matchAll(/\b(?:error|warning|code)\s+(\d{1,3})\b/g)]
    .map((match) => match[1] ?? '');
  return unique([...uppercaseCodes, ...contextualNumbers].map(compactToken));
}

function queryCodeTokens(query: string, knownModelTokens: Set<string>): string[] {
  const commonAbbreviations = new Set(['ac', 'dc', 'ok', 'ng']);
  const normalized = separatedCodeText(query);
  const alphanumeric = normalized.match(/\b[a-z]{1,3}\d{1,3}\b/g) ?? [];
  const uppercaseLetters = query.match(/\b[A-Z]{1,2}\b/g) ?? [];
  const contextualNumbers = [...normalized.matchAll(/\b(?:error|warning|code)\s+(\d{1,3})\b/g)]
    .map((match) => match[1] ?? '');
  const standaloneNumber = /^\d{1,3}$/.test(normalized) ? [normalized] : [];
  return unique([...alphanumeric, ...uppercaseLetters, ...contextualNumbers, ...standaloneNumber]
    .map(compactToken))
    .filter(
      (candidate) =>
        !commonAbbreviations.has(candidate) &&
        ![...knownModelTokens].some(
          (model) => model === candidate || model.startsWith(candidate) || candidate.startsWith(model),
        ),
    );
}

function buildDocuments(corpus: SearchCorpus): IndexedDocument[] {
  const manuals = new Map(corpus.manuals.map((manual) => [manual.id, manual]));
  const knowledgeDocuments = corpus.knowledge.map((entry): IndexedDocument => {
    const manualIds = unique(entry.sourceRefs.map((source) => source.manualId));
    const acceptanceTopics = entry.acceptanceTopics ?? [];
    const codeTokens = declaredCodeTokens(entry.codes);
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
      codes: codeTokens.join(' '),
      codeTokens,
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
      const sourceRefs = page.alternateSourceRefs?.length
        ? page.alternateSourceRefs
        : [{ manualId: page.manualId, pageNumber: page.pageNumber }];
      const referencedManuals = sourceRefs
        .map((source) => manuals.get(source.manualId))
        .filter((manual): manual is ManualRecord => Boolean(manual));
      const manual = manuals.get(page.manualId);
      const category = page.category === 'general' && manual ? manual.category : page.category;
      const productFamilies = unique([
        ...page.productFamilies,
        ...referencedManuals.flatMap((item) => item.productFamilies),
      ]);
      const title = `${manual?.title ?? page.manualId} page ${page.pageNumber}`;
      const codeTokens = pageCodeTokens(page.text);
      const searchableText = normaliseSearchText(
        [title, ...codeTokens, ...productFamilies, ...page.models, ...page.aliases, page.text].join(' '),
      );
      return {
        key: `page:${page.id}`,
        entityId: page.id,
        type: 'page',
        category,
        productFamilies,
        models: page.models,
        manualIds: unique(sourceRefs.map((source) => source.manualId)),
        title,
        codes: codeTokens.join(' '),
        codeTokens,
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
  const knownModelTokens = new Set(
    unique([
      ...corpus.manuals.flatMap((manual) => manual.productFamilies),
      ...corpus.pages.flatMap((page) => [...page.productFamilies, ...page.models]),
      ...corpus.knowledge.flatMap((entry) => [...entry.productFamilies, ...entry.models]),
      ...Object.keys(corpus.aliases.models),
      ...Object.values(corpus.aliases.models),
    ]).map(compactToken),
  );
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
    knownModelTokens,
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

function exactCode(document: IndexedDocument, queryCodes: string[]): string | undefined {
  return queryCodes.find((code) => document.codeTokens.includes(code));
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
  queryCodes: string[],
): SearchHit {
  const tokens = queryTokens(normalizedQuery);
  const modelContext = hasModelContext(document, normalizedQuery);
  const code = exactCode(document, queryCodes);
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
    matchedCode: code,
  };
}

export function search(
  engine: SearchEngine,
  query: string,
  filters: SearchFilters,
): SearchHit[] {
  const normalizedQuery = normaliseSearchText(query);
  if (!normalizedQuery) return [];
  const exactQueryCodes = queryCodeTokens(query, engine.knownModelTokens);
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
      if (!document) return undefined;
      if (
        exactQueryCodes.length &&
        !exactQueryCodes.every((code) => document.codeTokens.includes(code))
      ) {
        return undefined;
      }
      return rank(document, result.score, normalizedQuery, exactQueryCodes);
    })
    .filter((hit): hit is SearchHit => Boolean(hit))
    .filter((hit) => {
      const key = `${hit.type}:${hit.id}`;
      const document = engine.documents.get(key);
      return document ? matchesFilters(document, filters) : false;
    })
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
