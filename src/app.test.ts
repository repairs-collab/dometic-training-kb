import { fireEvent, within } from '@testing-library/dom';
import { describe, expect, test, vi } from 'vitest';

import aliases from '../content/aliases.json';
import knowledge from '../content/knowledge.json';
import manuals from '../content/manuals.json';
import pages from '../content/pages.json';
import type { KnowledgeEntry, ManualRecord, PageRecord } from './data/types';
import type { SearchCorpus } from './search/engine';
import {
  createApp,
  dometicPresentation,
  hubPresentation,
  type CatalogLoader,
} from './app';

const corpus: SearchCorpus = {
  manuals: manuals as ManualRecord[],
  pages: pages as PageRecord[],
  knowledge: knowledge as KnowledgeEntry[],
  aliases,
};

function root(): HTMLElement {
  const element = document.createElement('div');
  document.body.replaceChildren(element);
  return element;
}

const loader: CatalogLoader = { load: async () => corpus };

describe('knowledge-base application', () => {
  test('shows loading progress then a ready search experience', async () => {
    let resolve!: (value: SearchCorpus) => void;
    const pendingLoader: CatalogLoader = {
      load: () => new Promise((next) => (resolve = next)),
    };
    const element = root();
    const promise = createApp(element, pendingLoader, () => {}, dometicPresentation);

    expect(within(element).getByRole('status').textContent).toContain('Loading training manuals');
    resolve(corpus);
    await promise;

    expect(within(element).getByRole('heading', { level: 1 }).textContent).toContain(
      'Dometic Training Knowledge Base',
    );
    expect((within(element).getByRole('searchbox') as HTMLInputElement).disabled).toBe(false);
    expect(within(element).getByText('20 resources')).toBeTruthy();
    expect(within(element).getByRole('link', { name: 'Dometic manuals' }).getAttribute('href')).toBe(
      '/dometic/manuals.html',
    );
  });

  test('renders a global search across every company on the hub page', async () => {
    const element = root();

    await createApp(element, loader, () => {}, hubPresentation);

    expect(within(element).getByRole('heading', { level: 1 }).textContent).toBe(
      'Motts Training Hub',
    );
    expect(within(element).getByRole('searchbox', { name: 'Search all training resources' })).toBeTruthy();
    expect(within(element).getByRole('button', { name: 'Search all resources' })).toBeTruthy();
    expect(within(element).getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
  });

  test('renders a Dometic-scoped search on the company page', async () => {
    const element = root();

    await createApp(element, loader, () => {}, dometicPresentation);

    expect(within(element).getByRole('heading', { level: 1 }).textContent).toBe(
      'Dometic Training Knowledge Base',
    );
    expect(within(element).getByRole('searchbox', { name: 'Search Dometic resources' })).toBeTruthy();
    expect(within(element).getByRole('link', { name: 'Dometic search' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  test('passes logout through the shared header', async () => {
    const element = root();
    const logout = vi.fn();
    await createApp(element, loader, logout);

    fireEvent.click(within(element).getByRole('button', { name: 'Log out' }));

    expect(logout).toHaveBeenCalledOnce();
  });

  test('runs an example plain-language search and shows cited results', async () => {
    const element = root();
    await createApp(element, loader);
    const query = within(element).getByRole('searchbox');

    fireEvent.input(query, { target: { value: 'RUC error 33' } });
    fireEvent.submit(query.closest('form')!);

    expect(
      within(element).getByRole('heading', { level: 2, name: /RUC error 33/i }),
    ).toBeTruthy();
    expect(
      within(element).getAllByRole('link', { name: /page 11/i })[0]?.getAttribute('href'),
    ).toContain('#page=11');
  });

  test('resets active filters', async () => {
    const element = root();
    await createApp(element, loader);
    const category = within(element).getByLabelText('Product category') as HTMLSelectElement;

    fireEvent.change(category, { target: { value: 'awning' } });
    expect(category.value).toBe('awning');
    fireEvent.click(within(element).getByRole('button', { name: 'Reset filters' }));

    expect(category.value).toBe('');
  });

  test('offers recovery suggestions when there are no results', async () => {
    const element = root();
    await createApp(element, loader);
    const query = within(element).getByRole('searchbox');

    fireEvent.input(query, { target: { value: 'quantum toaster nebula' } });
    fireEvent.submit(query.closest('form')!);

    expect(within(element).getByText('No matching manual information found')).toBeTruthy();
    expect(within(element).getByText(/Try a model number, error code, or symptom/i)).toBeTruthy();
  });

  test('keeps safety guidance visible and uses native expandable details', async () => {
    const element = root();
    await createApp(element, loader);
    const query = within(element).getByRole('searchbox');

    fireEvent.input(query, { target: { value: 'RUC fuse location' } });
    fireEvent.submit(query.closest('form')!);

    expect(within(element).getAllByText(/qualified technicians/i).length).toBeGreaterThan(0);
    expect(within(element).getByText(/lethal mains potential/i)).toBeTruthy();
    expect(
      within(element)
        .getAllByText('View procedures and specifications')[0]
        ?.closest('details'),
    ).toBeInstanceOf(HTMLDetailsElement);
  });

  test('shows a clear error when catalogues cannot load', async () => {
    const element = root();
    await createApp(element, {
      load: async () => {
        throw new Error('network unavailable');
      },
    });

    expect(within(element).getByRole('alert').textContent).toContain(
      'Training information could not be loaded',
    );
  });

  test('shows a clear error when loaded catalogues are malformed', async () => {
    const element = root();
    await createApp(element, {
      load: async () => ({ ...corpus, pages: {} } as unknown as SearchCorpus),
    });

    expect(within(element).getByRole('alert').textContent).toContain(
      'Training information could not be loaded',
    );
  });
});
