import { describe, expect, test } from 'vitest';

import knowledge from '../../content/knowledge.json';
import manuals from '../../content/manuals.json';
import pages from '../../content/pages.json';

describe('FreshJet 4 and 7 source catalogues', () => {
  test('include both supplied resources and their reviewed source records', () => {
    expect(manuals).toHaveLength(20);
    expect(pages).toHaveLength(221);
    expect(knowledge.length).toBeGreaterThanOrEqual(87);

    expect(manuals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'freshjet-4-7-error-codes', pageCount: 3 }),
        expect.objectContaining({
          id: 'freshjet-4-7-thermistor-chart',
          format: 'xlsx',
          sheetCount: 5,
        }),
      ]),
    );
  });

  test('include every supplied display code plus sensor and thermistor guidance', () => {
    const ids = new Set(knowledge.map((entry) => entry.id));
    const codes = knowledge
      .filter((entry) => entry.id.startsWith('freshjet-4-7-code-'))
      .flatMap((entry) => entry.codes);

    expect(new Set(codes)).toEqual(
      new Set([
        'P0', 'P1', 'P2', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9',
        'E0', 'E1', 'E2', 'E3', 'E6', 'E7', 'E8', 'E9', 'EA', 'EE', 'EF', 'EL', 'EU',
      ]),
    );
    expect(ids).toContain('freshjet-4-7-adb-sensor-readout');
    expect(ids).toContain('freshjet-4-7-thermistor-resistance');
  });
});
