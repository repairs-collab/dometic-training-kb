import type { ResultCard, ResultViewState } from './viewModel';

function badge(text: string, className = ''): HTMLElement {
  const element = document.createElement('span');
  element.className = `badge ${className}`.trim();
  element.textContent = text;
  return element;
}

function definitionList(card: ResultCard): HTMLDListElement | undefined {
  if (!card.specifications.length && !card.parts.length) return undefined;
  const list = document.createElement('dl');
  list.className = 'facts';
  for (const specification of card.specifications) {
    const term = document.createElement('dt');
    term.textContent = specification.label;
    const description = document.createElement('dd');
    description.textContent = specification.value;
    list.append(term, description);
  }
  for (const part of card.parts) {
    const term = document.createElement('dt');
    term.textContent = part.number;
    const description = document.createElement('dd');
    description.textContent = part.description;
    list.append(term, description);
  }
  return list;
}

function resultCard(card: ResultCard): HTMLElement {
  const article = document.createElement('article');
  article.className = `result-card result-card--${card.type}`;
  const badges = document.createElement('div');
  badges.className = 'result-card__badges';
  badges.append(badge(card.type === 'knowledge' ? 'Reviewed answer' : 'Manual page', card.type));
  badges.append(badge(card.category.replaceAll('-', ' ')));
  if (card.kind) badges.append(badge(card.kind.replaceAll('-', ' ')));
  const title = document.createElement('h3');
  title.textContent = card.title;
  const modelValues = [...new Set([...card.productFamilies, ...card.models])];
  const models = document.createElement('p');
  models.className = 'result-card__models';
  models.textContent = modelValues.length
    ? `Applies to: ${modelValues.join(', ')}`
    : card.type === 'page'
      ? 'Model scope: check the cited manual page'
      : 'General guidance';
  const summary = document.createElement('p');
  summary.className = 'result-card__summary';
  summary.textContent = card.summary;
  article.append(badges, title, models, summary);

  const warningSection = card.sections.find((section) => section.kind === 'warning');
  if (warningSection) {
    const warning = document.createElement('aside');
    warning.className = 'warning';
    const warningTitle = document.createElement('strong');
    warningTitle.textContent = 'Safety first';
    warning.append(warningTitle);
    for (const item of warningSection.items) {
      const text = document.createElement('p');
      text.textContent = item;
      warning.append(text);
    }
    article.append(warning);
  }

  const steps = card.sections.find((section) => section.kind === 'steps');
  const facts = definitionList(card);
  if (steps || facts) {
    const details = document.createElement('details');
    details.className = 'result-card__details';
    const detailsTitle = document.createElement('summary');
    detailsTitle.textContent = 'View procedures and specifications';
    details.append(detailsTitle);
    if (steps) {
      const list = document.createElement('ol');
      for (const value of steps.items) {
        const item = document.createElement('li');
        item.textContent = value;
        list.append(item);
      }
      details.append(list);
    }
    if (facts) details.append(facts);
    article.append(details);
  }

  const sources = document.createElement('div');
  sources.className = 'sources';
  const sourceTitle = document.createElement('strong');
  sourceTitle.textContent = card.sources.length > 1 ? 'Sources' : 'Source';
  sources.append(sourceTitle);
  for (const source of card.sources) {
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = source.label;
    sources.append(link);
  }
  article.append(sources);
  return article;
}

export function renderResults(
  container: HTMLElement,
  state: ResultViewState,
  query = '',
): void {
  container.replaceChildren();
  container.className = 'results';
  if (state.status === 'loading') {
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = state.message;
    container.append(status);
    return;
  }
  if (state.status === 'error') {
    const alert = document.createElement('div');
    alert.className = 'load-error';
    alert.setAttribute('role', 'alert');
    const title = document.createElement('h2');
    title.textContent = 'Training information could not be loaded';
    const message = document.createElement('p');
    message.textContent = state.message;
    alert.append(title, message);
    container.append(alert);
    return;
  }
  if (state.status === 'empty') {
    const empty = document.createElement('section');
    empty.className = 'empty-state';
    const title = document.createElement('h2');
    title.textContent = query ? 'No matching manual information found' : 'Start with a problem or model';
    const message = document.createElement('p');
    message.textContent = state.message;
    empty.append(title, message);
    container.append(empty);
    return;
  }

  const heading = document.createElement('div');
  heading.className = 'results__heading';
  const title = document.createElement('h2');
  title.textContent = query ? `Results for “${query}”` : 'Results';
  const count = document.createElement('p');
  count.textContent = `${state.cards.length} result${state.cards.length === 1 ? '' : 's'}`;
  heading.append(title, count);
  const list = document.createElement('div');
  list.className = 'results__list';
  for (const card of state.cards) list.append(resultCard(card));
  container.append(heading, list);
}
