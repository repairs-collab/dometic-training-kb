import type { ManualRecord } from './data/types';

export interface ManualsLoader {
  load(): Promise<ManualRecord[]>;
}

function humanizeCategory(category: string): string {
  const label = category.replaceAll('-', ' ');
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function createNavigation(): HTMLElement {
  const navigation = document.createElement('nav');
  navigation.className = 'site-nav';
  navigation.setAttribute('aria-label', 'Main navigation');

  const searchLink = document.createElement('a');
  searchLink.href = './';
  searchLink.textContent = 'Search';

  const manualsLink = document.createElement('a');
  manualsLink.href = './manuals.html';
  manualsLink.textContent = 'Manuals';
  manualsLink.setAttribute('aria-current', 'page');

  navigation.append(searchLink, manualsLink);
  return navigation;
}

function createHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'site-header';

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = './';
  brand.textContent = 'Technical Training Hub';

  header.append(brand, createNavigation());
  return header;
}

function createManualCard(manual: ManualRecord): HTMLElement {
  const card = document.createElement('article');
  card.className = 'manual-card';

  const category = document.createElement('p');
  category.className = 'manual-card__category';
  category.textContent = humanizeCategory(manual.category);

  const title = document.createElement('h2');
  title.textContent = manual.title;

  const details = document.createElement('dl');
  details.className = 'manual-card__details';
  const detailRows: [string, string][] = [
    ['Models and families', manual.productFamilies.join(', ')],
    ['Pages', `${manual.pageCount} ${manual.pageCount === 1 ? 'page' : 'pages'}`],
  ];
  if (manual.documentDate) detailRows.push(['Document date', manual.documentDate]);

  for (const [label, value] of detailRows) {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    details.append(term, description);
  }

  const actions = document.createElement('div');
  actions.className = 'manual-card__actions';
  const pdfUrl = `./manuals/${encodeURIComponent(manual.filename)}`;

  const viewLink = document.createElement('a');
  viewLink.className = 'button button--manual-primary';
  viewLink.href = pdfUrl;
  viewLink.target = '_blank';
  viewLink.rel = 'noopener';
  viewLink.textContent = 'View PDF';

  const downloadLink = document.createElement('a');
  downloadLink.className = 'button button--outline';
  downloadLink.href = pdfUrl;
  downloadLink.download = manual.filename;
  downloadLink.textContent = 'Download PDF';

  actions.append(viewLink, downloadLink);
  card.append(category, title, details, actions);
  return card;
}

function renderLayout(root: HTMLElement): { grid: HTMLElement; status: HTMLElement } {
  root.className = 'app-shell';
  const main = document.createElement('main');
  main.className = 'manual-library';

  const hero = document.createElement('section');
  hero.className = 'manual-library__hero';
  const heroContent = document.createElement('div');
  heroContent.className = 'content-frame';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Source library';
  const heading = document.createElement('h1');
  heading.textContent = 'Training manuals';
  const intro = document.createElement('p');
  intro.className = 'manual-library__intro';
  intro.textContent = 'View the current source manuals online or download a copy for offline reference.';
  heroContent.append(eyebrow, heading, intro);
  hero.append(heroContent);

  const library = document.createElement('section');
  library.className = 'manual-library__content content-frame';
  library.setAttribute('aria-labelledby', 'manual-library-heading');
  const libraryHeading = document.createElement('div');
  libraryHeading.className = 'manual-library__heading';
  const title = document.createElement('h2');
  title.id = 'manual-library-heading';
  title.textContent = 'Current PDF library';
  const status = document.createElement('p');
  status.className = 'manual-library__status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Loading manuals…';
  libraryHeading.append(title, status);
  const grid = document.createElement('div');
  grid.className = 'manual-grid';
  library.append(libraryHeading, grid);

  const safety = document.createElement('aside');
  safety.className = 'global-safety';
  safety.textContent =
    'Always confirm the model, manual revision and source page before service work. Follow all safety instructions in the source manual.';

  main.append(hero, library, safety);
  const footer = document.createElement('footer');
  footer.textContent = 'Electrical, gas and refrigeration work must be completed by appropriately qualified technicians.';
  root.replaceChildren(createHeader(), main, footer);
  return { grid, status };
}

export async function createManualLibrary(root: HTMLElement, loader: ManualsLoader): Promise<void> {
  const { grid, status } = renderLayout(root);

  try {
    const manuals = await loader.load();
    const sortedManuals = [...manuals].sort((left, right) => left.title.localeCompare(right.title));
    grid.replaceChildren(...sortedManuals.map(createManualCard));
    status.textContent = `${manuals.length} manuals available`;
  } catch {
    status.textContent = '';
    const error = document.createElement('div');
    error.className = 'load-error';
    error.setAttribute('role', 'alert');
    const heading = document.createElement('h2');
    heading.textContent = 'Manuals could not be loaded';
    const message = document.createElement('p');
    message.textContent = 'Please refresh the page. If the problem continues, the published data file may be missing.';
    error.append(heading, message);
    grid.replaceChildren(error);
  }
}

export const fetchManualsLoader: ManualsLoader = {
  async load() {
    const response = await fetch('./data/manuals.json');
    if (!response.ok) throw new Error('Failed to load manuals');
    const manuals: unknown = await response.json();
    if (!Array.isArray(manuals)) throw new Error('Invalid manuals data');
    return manuals as ManualRecord[];
  },
};
