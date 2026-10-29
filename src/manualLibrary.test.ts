import { fireEvent, within } from '@testing-library/dom';
import { describe, expect, test, vi } from 'vitest';

import type { ManualRecord } from './data/types';
import { createManualLibrary } from './manualLibrary';

const pdf: ManualRecord = {
  id: 'freshjet-errors',
  title: 'FreshJet 4 and 7 error codes',
  filename: 'FJ 4 & 7 Error codes.pdf',
  pageCount: 3,
  category: 'air-conditioner',
  productFamilies: ['FreshJet 4', 'FreshJet 7'],
  format: 'pdf',
};

const workbook: ManualRecord = {
  id: 'freshjet-thermistors',
  title: 'FreshJet 4 and 7 thermistor chart',
  filename: 'Thermistor chart.xlsx',
  pageCount: 1,
  sheetCount: 5,
  category: 'air-conditioner',
  productFamilies: ['FreshJet 4', 'FreshJet 7'],
  format: 'xlsx',
};

describe('createManualLibrary', () => {
  test('renders PDF view and download actions', async () => {
    const root = document.createElement('div');
    await createManualLibrary(root, { load: async () => [pdf] });

    expect(within(root).getByRole('link', { name: 'View PDF' }).getAttribute('href')).toBe(
      '/manuals/FJ%204%20%26%207%20Error%20codes.pdf',
    );
    expect(within(root).getByRole('link', { name: 'Dometic manuals' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(within(root).getByRole('link', { name: 'Download PDF' })).toBeTruthy();
  });

  test('renders an Excel download without a PDF view action', async () => {
    const root = document.createElement('div');
    await createManualLibrary(root, { load: async () => [workbook] });

    expect(within(root).queryByRole('link', { name: 'View PDF' })).toBeNull();
    const download = within(root).getByRole('link', { name: 'Download Excel' });
    expect(download.getAttribute('href')).toBe('/manuals/Thermistor%20chart.xlsx');
    expect(download.getAttribute('download')).toBe('Thermistor chart.xlsx');
    expect(within(root).getByText('5 sheets')).toBeTruthy();
    expect(within(root).getByText('Dometic training resources')).toBeTruthy();
    expect(within(root).getByText('Current resource library')).toBeTruthy();
    expect(within(root).getByText('1 resource available')).toBeTruthy();
  });

  test('passes logout through the shared header', async () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const logout = vi.fn();
    await createManualLibrary(root, { load: async () => [pdf] }, logout);

    fireEvent.click(within(root).getByRole('button', { name: 'Log out' }));

    expect(logout).toHaveBeenCalledOnce();
  });
});
