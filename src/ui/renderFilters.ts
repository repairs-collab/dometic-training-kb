import type { EntryKind, ProductCategory } from '../data/types';
import type { SearchFilters } from '../search/engine';
import type { FilterOption, FilterOptions } from './filters';

export interface FiltersView {
  read(): SearchFilters;
  reset(): void;
}

function selectControl<T extends string>(
  labelText: string,
  options: FilterOption<T>[],
): HTMLSelectElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'filter-control';
  const label = document.createElement('span');
  label.textContent = labelText;
  const select = document.createElement('select');
  select.setAttribute('aria-label', labelText);
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'All';
  select.append(all);
  for (const option of options) {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = `${option.label} (${option.count})`;
    select.append(element);
  }
  wrapper.append(label, select);
  return select;
}

export function renderFilters(
  container: HTMLElement,
  options: FilterOptions,
  onChange: (filters: SearchFilters) => void,
): FiltersView {
  const section = document.createElement('section');
  section.className = 'filters';
  section.setAttribute('aria-label', 'Search filters');
  const heading = document.createElement('div');
  heading.className = 'filters__heading';
  const title = document.createElement('h2');
  title.textContent = 'Narrow results';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'button button--quiet';
  reset.textContent = 'Reset filters';
  heading.append(title, reset);

  const controls = document.createElement('div');
  controls.className = 'filters__controls';
  const category = selectControl('Product category', options.categories);
  const model = selectControl('Model or family', options.models);
  const kind = selectControl('Information type', options.kinds);
  const manual = selectControl('Source manual', options.manuals);
  controls.append(
    category.parentElement!,
    model.parentElement!,
    kind.parentElement!,
    manual.parentElement!,
  );
  section.append(heading, controls);
  container.append(section);

  const view: FiltersView = {
    read: () => ({
      category: (category.value || undefined) as ProductCategory | undefined,
      model: model.value || undefined,
      kind: (kind.value || undefined) as EntryKind | undefined,
      manualId: manual.value || undefined,
    }),
    reset: () => {
      category.value = '';
      model.value = '';
      kind.value = '';
      manual.value = '';
    },
  };

  for (const select of [category, model, kind, manual]) {
    select.addEventListener('change', () => onChange(view.read()));
  }
  reset.addEventListener('click', () => {
    view.reset();
    onChange(view.read());
  });
  return view;
}
