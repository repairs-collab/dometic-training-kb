import aliases from '../../content/aliases.json';
import knowledge from '../../content/knowledge.json';
import manuals from '../../content/manuals.json';
import pages from '../../content/pages.json';
import type { KnowledgeEntry, ManualRecord, PageRecord } from '../data/types';
import { createSearchEngine, search, type SearchCorpus } from '../search/engine';
import { deriveFilterOptions } from './filters';
import { buildResultCards } from './viewModel';
import { describe, expect, test } from 'vitest';

const corpus: SearchCorpus = {
  manuals: manuals as ManualRecord[],
  pages: pages as PageRecord[],
  knowledge: knowledge as KnowledgeEntry[],
  aliases,
};

describe('result view models', () => {
  test('keeps the highest-scoring curated answer first', () => {
    const hits = search(createSearchEngine(corpus), 'RUC error 33', {});
    const cards = buildResultCards([...hits].reverse(), corpus);

    expect(cards[0]?.type).toBe('knowledge');
    expect(cards[0]?.id).toBe('ruc-compressor-start-error-33');
    expect(cards[0]?.models).toContain('RUC5308X');
  });

  test('does not turn manual-wide families into page applicability claims', () => {
    const hits = search(createSearchEngine(corpus), 'RUC E34', {});
    const card = buildResultCards(hits, corpus)[0];

    expect(card?.id).toBe('dual-hinge-fridge-2026-08-p5');
    expect(card?.productFamilies).toEqual([]);
    expect(card?.models).toEqual([]);
    expect(card?.summary).toContain('E34 compressor overload');
  });

  test('places safety warnings before procedure steps', () => {
    const hits = search(createSearchEngine(corpus), 'RUC fuse location', {});
    const card = buildResultCards(hits, corpus)[0];

    expect(card?.sections.map((section) => section.kind)).toEqual(['warning', 'steps']);
  });

  test('retains both references for duplicate source manuals', () => {
    const hits = search(createSearchEngine(corpus), 'RUC adaptive defrost logic', {});
    const card = buildResultCards(hits, corpus).find((item) => item.id === 'ruc-defrost-cycle');

    expect(card?.sources.map((source) => source.manualId)).toEqual([
      'ruc-defrost-logic',
      'ruc-defrost-logic-copy',
    ]);
  });

  test('derives stable filter choices and counts from the corpus', () => {
    const options = deriveFilterOptions(corpus);
    const airConditioners = options.categories.find(
      (option) => option.value === 'air-conditioner',
    );

    expect(options.manuals).toHaveLength(18);
    expect(airConditioners?.count).toBeGreaterThan(0);
    expect(options.models.some((option) => option.value === 'RUC')).toBe(true);
    expect(options.kinds.some((option) => option.value === 'error-code')).toBe(true);
  });
});
