import type { ManualRecord } from './data/types';
import { renderSiteHeader } from './ui/renderSiteHeader';

export interface ManualsLoader {
  load(): Promise<ManualRecord[]>;
}

function humanizeCategory(category: string): string {
  const label = category.replaceAll('-', ' ');
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
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
  const format = manual.format ?? 'pdf';
  const detailRows: [string, string][] = [['Models and families', manual.productFamilies.join(', ')]];
  if (format === 'xlsx') {
    const sheetCount = manual.sheetCount ?? 1;
    detailRows.push(['Sheets', `${sheetCount} ${sheetCount === 1 ? 'sheet' : 'sheets'}`]);
  } else {
    detailRows.push(['Pages', `${manual.pageCount} ${manual.pageCount === 1 ? 'page' : 'pages'}`]);
  }
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
  const resourceUrl = `/manuals/${encodeURIComponent(manual.filename)}`;
  const downloadLink = document.createElement('a');
  downloadLink.href = resourceUrl;
  downloadLink.download = manual.filename;
  if (format === 'xlsx') {
    downloadLink.className = 'button button--manual-primary';
    downloadLink.textContent = 'Download Excel';
    actions.append(downloadLink);
  } else {
    const viewLink = document.createElement('a');
    viewLink.className = 'button button--manual-primary';
    viewLink.href = resourceUrl;
    viewLink.target = '_blank';
    viewLink.rel = 'noopener';
    viewLink.textContent = 'View PDF';
    downloadLink.className = 'button button--outline';
    downloadLink.textContent = 'Download PDF';
    actions.append(viewLink, downloadLink);
  }
  card.append(category, title, details, actions);
  return card;
}

function renderLayout(root: HTMLElement, onLogout: () => void): { grid: HTMLElement; status: HTMLElement } {
  root.className = 'app-shell';
  const main = document.createElement('main');
  main.className = 'manual-library';

  const hero = document.createElement('section');
  hero.className = 'manual-library__hero';
  const heroContent = document.createElement('div');
  heroContent.className = 'content-frame';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Dometic source library';
  const heading = document.createElement('h1');
  heading.textContent = 'Dometic training resources';
  const intro = document.createElement('p');
  intro.className = 'manual-library__intro';
  intro.textContent = 'View current PDF manuals online or download PDFs and spreadsheets for offline reference.';
  heroContent.append(eyebrow, heading, intro);
  hero.append(heroContent);

  const library = document.createElement('section');
  library.className = 'manual-library__content content-frame';
  library.setAttribute('aria-labelledby', 'manual-library-heading');
  const libraryHeading = document.createElement('div');
  libraryHeading.className = 'manual-library__heading';
  const title = document.createElement('h2');
  title.id = 'manual-library-heading';
  title.textContent = 'Current resource library';
  const status = document.createElement('p');
  status.className = 'manual-library__status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Loading resources…';
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
  root.replaceChildren(renderSiteHeader('dometic-manuals', onLogout), main, footer);
  return { grid, status };
}

export async function createManualLibrary(
  root: HTMLElement,
  loader: ManualsLoader,
  onLogout: () => void = () => {},
): Promise<void> {
  const { grid, status } = renderLayout(root, onLogout);

  try {
    const manuals = await loader.load();
    const sortedManuals = [...manuals].sort((left, right) => left.title.localeCompare(right.title));
    grid.replaceChildren(...sortedManuals.map(createManualCard));
    status.textContent = `${manuals.length} ${manuals.length === 1 ? 'resource' : 'resources'} available`;
  } catch {
    status.textContent = '';
    const error = document.createElement('div');
    error.className = 'load-error';
    error.setAttribute('role', 'alert');
    const heading = document.createElement('h2');
    heading.textContent = 'Resources could not be loaded';
    const message = document.createElement('p');
    message.textContent = 'Please refresh the page. If the problem continues, the published data file may be missing.';
    error.append(heading, message);
    grid.replaceChildren(error);
  }
}

export const fetchManualsLoader: ManualsLoader = {
  async load() {
    const response = await fetch('/data/manuals.json');
    if (!response.ok) throw new Error('Failed to load manuals');
    const manuals: unknown = await response.json();
    if (!Array.isArray(manuals)) throw new Error('Invalid manuals data');
    return manuals as ManualRecord[];
  },
};
