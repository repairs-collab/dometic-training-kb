import { describe, expect, test } from 'vitest';

import { validateCatalogs } from './validation';

const manual = {
  id: 'fjz-training',
  title: 'FJZ Training',
  filename: 'FJZ Training.pdf',
  pageCount: 2,
  category: 'air-conditioner',
  productFamilies: ['FJZ'],
};

const page = {
  id: 'fjz-training-p1',
  manualId: 'fjz-training',
  pageNumber: 1,
  category: 'air-conditioner',
  productFamilies: ['FJZ'],
  models: ['FJZ'],
  text: 'FJZ training page text',
  excerpt: 'FJZ training page text',
  aliases: [],
  sourceUrl: './manuals/FJZ%20Training.pdf#page=1',
  extractionStatus: 'embedded-text',
};

const knowledge = {
  id: 'fjz-p1-undervoltage',
  title: 'FJZ P1 undervoltage',
  kind: 'error-code',
  category: 'air-conditioner',
  productFamilies: ['FJZ'],
  models: ['FJZ'],
  codes: ['P1'],
  symptoms: ['undervoltage'],
  aliases: ['low voltage'],
  summary: 'Check the supply voltage under load.',
  steps: ['Measure the supply voltage under load.'],
  warnings: ['Qualified technicians only.'],
  parts: [],
  specifications: [],
  sourceRefs: [{ manualId: 'fjz-training', pageNumber: 1 }],
  searchText: 'FJZ P1 undervoltage low voltage supply',
};

describe('validateCatalogs', () => {
  test('accepts valid one-based linked catalogues', () => {
    expect(validateCatalogs([manual], [page], [knowledge])).toEqual({
      valid: true,
      errors: [],
    });
  });

  test('reports duplicate IDs in stable catalogue order', () => {
    const result = validateCatalogs(
      [manual, { ...manual }],
      [page, { ...page }],
      [knowledge, { ...knowledge }],
    );

    expect(result.errors).toEqual([
      'manual id fjz-training is duplicated',
      'page id fjz-training-p1 is duplicated',
      'knowledge id fjz-p1-undervoltage is duplicated',
    ]);
  });

  test('rejects a zero-based page number', () => {
    const result = validateCatalogs([manual], [{ ...page, pageNumber: 0 }], [knowledge]);

    expect(result.errors).toContain('page fjz-training-p1 must use a one-based pageNumber');
  });

  test('rejects a knowledge source outside the manual page range', () => {
    const invalidKnowledge = {
      ...knowledge,
      sourceRefs: [{ manualId: 'fjz-training', pageNumber: 3 }],
    };

    expect(validateCatalogs([manual], [page], [invalidKnowledge]).errors).toContain(
      'knowledge fjz-p1-undervoltage references page 3 outside fjz-training',
    );
  });

  test('rejects unknown categories and extraction statuses', () => {
    const result = validateCatalogs(
      [{ ...manual, category: 'unknown' }],
      [{ ...page, extractionStatus: 'guessed' }],
      [knowledge],
    );

    expect(result.errors).toEqual([
      'manual fjz-training has unknown category unknown',
      'page fjz-training-p1 has unknown extractionStatus guessed',
    ]);
  });
});
