import manuals from '../../content/manuals.json';
import pages from '../../content/pages.json';
import knowledge from '../../content/knowledge.json';
import aliases from '../../content/aliases.json';
import type { KnowledgeEntry, ManualRecord, PageRecord } from '../data/types';
import { describe, expect, it } from 'vitest';
import { createSearchEngine, search, type SearchCorpus } from './engine';

const corpus: SearchCorpus = {
  manuals: manuals as ManualRecord[],
  pages: pages as PageRecord[],
  knowledge: knowledge as KnowledgeEntry[],
  aliases,
};

const engine = createSearchEngine(corpus);

describe('model-aware manual search', () => {
  it.each([
    ['RUC error 33', 'ruc-compressor-start-error-33'],
    ['awning leaking at stitching', 'awning-stitching-water-leak'],
    ['FJZ not turning on', 'fjz-adb-will-not-turn-on'],
    ['three flashes portable fridge', 'portable-compressor-start-three-flashes'],
    ['RCD door not closing', 'rcd-dual-hinge-door-not-closing'],
    ['RUA settings locked', 'rua-child-lock-settings'],
    ['FreshJet generator size', 'freshjet-generator-selection'],
    ['RUC fuse location', 'ruc-fuse-location'],
    ['MC101 gas connections', 'mc101-mc102-gas-connections'],
  ])('ranks %s first', (query, expectedId) => {
    expect(search(engine, query, {})[0]?.id).toBe(expectedId);
  });

  it('normalizes punctuation, spacing and model hyphens', () => {
    expect(search(engine, 'RCD-10.5 door won\'t shut', {})[0]?.id).toBe(
      'rcd-dual-hinge-door-not-closing',
    );
  });

  it('does not treat an unqualified short code as a high-confidence exact code', () => {
    const first = search(engine, '03', {})[0];

    expect(first?.matchReason).toBe('unqualified-short-code');
  });

  it('requires an exact uncurated code match', () => {
    expect(search(engine, 'RUC E34', {})[0]?.id).toBe('dual-hinge-fridge-2026-08-p5');
    expect(search(engine, 'RUC E34', {}).some((hit) => hit.id === 'ruc-compressor-start-error-33')).toBe(false);
    expect(search(engine, 'RUA error 99', {})).toEqual([]);
    expect(search(engine, 'RUA E34', {})).toEqual([]);
  });

  it('treats numbered flash patterns as exact codes', () => {
    expect(search(engine, 'RCD 3 flashes', {})[0]?.id).toBe('rcd-compressor-controller-test');
    expect(search(engine, 'RCD 5 flashes', {})[0]?.id).toBe('rcd-five-flashes-overheat');
  });

  it('keeps duplicate manual and model context searchable', () => {
    const first = search(engine, 'FJZ P2', {})[0];

    expect(first?.id).toBe('fj48v-training-2026-09-p9');
    expect(first?.manualIds).toEqual(
      expect.arrayContaining(['fj48v-training-2026-09', 'fjz-training-2026-09']),
    );
    expect(first?.productFamilies).toContain('FJZ');
    expect(first?.id).not.toBe('fjz-p1-undervoltage');
  });

  it('does not mistake common electrical abbreviations for error codes', () => {
    expect(search(engine, 'RUC AC fuse', {})[0]?.id).toBe('ruc-fuse-location');
  });

  it('applies category, model, kind and manual filters', () => {
    expect(search(engine, 'door', { category: 'upright-refrigerator' })).not.toHaveLength(0);
    expect(search(engine, 'door', { category: 'awning' }).every((hit) => hit.category === 'awning')).toBe(true);
    expect(search(engine, 'defrost', { model: 'RUC' }).every((hit) => hit.productFamilies.includes('RUC') || hit.models.some((model) => model.includes('RUC')))).toBe(true);
    expect(search(engine, 'fuse', { kind: 'procedure' }).every((hit) => hit.kind === 'procedure')).toBe(true);
    expect(search(engine, 'voltage', { manualId: 'ruc-fuses' }).every((hit) => hit.manualIds.includes('ruc-fuses'))).toBe(true);
  });

  it('returns an empty list for a genuinely unrelated query', () => {
    expect(search(engine, 'quantum toaster nebula', {})).toEqual([]);
  });
});
