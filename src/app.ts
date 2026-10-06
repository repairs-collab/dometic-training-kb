import type { SearchCorpus, SearchFilters } from './search/engine';
import { createSearchEngine, search } from './search/engine';
import { validateCatalogs } from './data/validation';
import { deriveFilterOptions } from './ui/filters';
import { renderFilters, type FiltersView } from './ui/renderFilters';
import { renderHome, type HomeView } from './ui/renderHome';
import { renderResults } from './ui/renderResults';
import { buildResultCards } from './ui/viewModel';

export interface CatalogLoader {
  load(): Promise<SearchCorpus>;
}

export interface AppController {
  search(query: string): void;
  resetFilters(): void;
}

function layout(root: HTMLElement): {
  header: HTMLElement;
  main: HTMLElement;
  filters: HTMLElement;
  results: HTMLElement;
} {
  root.className = 'app-shell';
  const header = document.createElement('header');
  header.className = 'site-header';
  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = './';
  brand.textContent = 'Technical Training Hub';
  const note = document.createElement('span');
  note.textContent = 'Source-backed answers';
  header.append(brand, note);

  const main = document.createElement('main');
  const filterContainer = document.createElement('div');
  filterContainer.className = 'content-frame';
  const results = document.createElement('div');
  results.className = 'content-frame';
  const safety = document.createElement('aside');
  safety.className = 'global-safety';
  safety.textContent =
    'Use this resource with the source manuals. Electrical, gas, refrigeration and stored-energy work must be completed by appropriately qualified technicians.';
  main.append(filterContainer, safety, results);

  const footer = document.createElement('footer');
  footer.textContent = 'Always confirm model, revision and source page before service work.';
  root.replaceChildren(header, main, footer);
  return { header, main, filters: filterContainer, results };
}

export async function createApp(root: HTMLElement, loader: CatalogLoader): Promise<AppController> {
  const initial = layout(root);
  let home: HomeView = renderHome(initial.main, { manuals: 0, pages: 0, answers: 0 }, false, () => {}, () => {});
  initial.main.insertBefore(home.form.closest('.hero')!, initial.filters);
  renderResults(initial.results, { status: 'loading', message: 'Loading training manuals…' });
  let filterView: FiltersView | undefined;
  let activeHome = home;
  let activeResults = initial.results;
  let currentQuery = '';
  let currentFilters: SearchFilters = {};
  let runSearch = (_query: string) => {};

  const controller: AppController = {
    search(query) {
      runSearch(query);
    },
    resetFilters() {
      filterView?.reset();
      currentFilters = {};
      if (currentQuery) runSearch(currentQuery);
    },
  };

  try {
    const corpus = await loader.load();
    const validation = validateCatalogs(
      corpus.manuals,
      corpus.pages,
      corpus.knowledge,
      corpus.aliases,
    );
    if (!validation.valid) throw new Error(validation.errors.join('\n'));
    const engine = createSearchEngine(corpus);
    const ready = layout(root);
    activeResults = ready.results;
    runSearch = (query: string) => {
      currentQuery = query.trim();
      home.input.value = currentQuery;
      if (!currentQuery) {
        renderResults(
          ready.results,
          {
            status: 'empty',
            message: 'Try a model, error code, symptom, procedure or part number.',
          },
          '',
        );
        return;
      }
      const hits = search(engine, currentQuery, currentFilters).slice(0, 40);
      const cards = buildResultCards(hits, corpus).slice(0, 24);
      renderResults(
        ready.results,
        cards.length
          ? { status: 'ready', cards }
          : {
              status: 'empty',
              message: 'Try a model number, error code, or symptom. You can also reset the filters.',
            },
        currentQuery,
      );
    };
    home = renderHome(
      ready.main,
      { manuals: corpus.manuals.length, pages: corpus.pages.length, answers: corpus.knowledge.length },
      true,
      runSearch,
      runSearch,
    );
    activeHome = home;
    ready.main.insertBefore(home.form.closest('.hero')!, ready.filters);
    filterView = renderFilters(ready.filters, deriveFilterOptions(corpus), (filters) => {
      currentFilters = filters;
      if (currentQuery) runSearch(currentQuery);
    });
    renderResults(
      ready.results,
      {
        status: 'empty',
        message: 'Try a model, error code, symptom, procedure or part number.',
      },
      '',
    );
  } catch {
    activeHome.setEnabled(false);
    renderResults(activeResults, {
      status: 'error',
      message: 'Please refresh the page. If the problem continues, the published data files may be missing.',
    });
  }

  return controller;
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

export const fetchCatalogLoader: CatalogLoader = {
  async load() {
    const [manuals, pages, knowledge, aliases] = await Promise.all([
      fetchJson('./data/manuals.json'),
      fetchJson('./data/pages.json'),
      fetchJson('./data/knowledge.json'),
      fetchJson('./data/aliases.json'),
    ]);
    return { manuals, pages, knowledge, aliases } as SearchCorpus;
  },
};
