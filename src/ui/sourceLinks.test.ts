import { describe, expect, test } from 'vitest';

import { buildPdfUrl } from './sourceLinks';

describe('buildPdfUrl', () => {
  test('encodes only the filename and preserves a one-based page fragment', () => {
    expect(buildPdfUrl('RCD 10.5 update July 26 Master.pdf', 21)).toBe(
      './manuals/RCD%2010.5%20update%20July%2026%20Master.pdf#page=21',
    );
  });

  test('encodes punctuation in the filename', () => {
    expect(buildPdfUrl('FJZ ADB - socket & voltages.pdf', 1)).toBe(
      './manuals/FJZ%20ADB%20-%20socket%20%26%20voltages.pdf#page=1',
    );
  });

  test('rejects zero-based and fractional page numbers', () => {
    expect(() => buildPdfUrl('manual.pdf', 0)).toThrow('pageNumber must be a positive integer');
    expect(() => buildPdfUrl('manual.pdf', 1.5)).toThrow(
      'pageNumber must be a positive integer',
    );
  });
});
