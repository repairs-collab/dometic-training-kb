export interface HomeStats {
  manuals: number;
  pages: number;
  answers: number;
}

export interface HomeView {
  form: HTMLFormElement;
  input: HTMLInputElement;
  setEnabled(enabled: boolean): void;
}

export function renderHome(
  container: HTMLElement,
  stats: HomeStats,
  enabled: boolean,
  onSearch: (query: string) => void,
  onExample: (query: string) => void,
): HomeView {
  const hero = document.createElement('section');
  hero.className = 'hero';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Service training, made searchable';

  const title = document.createElement('h1');
  title.textContent = 'Dometic Training Knowledge Base';

  const intro = document.createElement('p');
  intro.className = 'hero__intro';
  intro.textContent =
    'Search problems, symptoms, error codes, procedures, parts and training topics in plain language.';

  const statsList = document.createElement('ul');
  statsList.className = 'stats';
  for (const value of [
    `${stats.manuals} manuals`,
    `${stats.pages} source pages`,
    `${stats.answers} reviewed answers`,
  ]) {
    const item = document.createElement('li');
    item.textContent = value;
    statsList.append(item);
  }

  const form = document.createElement('form');
  form.className = 'search-form';
  form.setAttribute('role', 'search');
  const label = document.createElement('label');
  label.htmlFor = 'knowledge-search';
  label.textContent = 'What do you need help with?';
  const row = document.createElement('div');
  row.className = 'search-form__row';
  const input = document.createElement('input');
  input.id = 'knowledge-search';
  input.type = 'search';
  input.name = 'query';
  input.placeholder = 'Example: RUC error 33 or awning leaking at stitching';
  input.autocomplete = 'off';
  input.disabled = !enabled;
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button button--primary';
  submit.textContent = 'Search manuals';
  submit.disabled = !enabled;
  row.append(input, submit);
  form.append(label, row);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSearch(input.value);
  });

  const examples = document.createElement('div');
  examples.className = 'examples';
  const examplesLabel = document.createElement('span');
  examplesLabel.textContent = 'Try:';
  examples.append(examplesLabel);
  for (const query of ['RUC error 33', 'FJZ not turning on', 'RCD door not closing']) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = query;
    button.disabled = !enabled;
    button.addEventListener('click', () => {
      input.value = query;
      onExample(query);
    });
    examples.append(button);
  }

  hero.append(eyebrow, title, intro, statsList, form, examples);
  container.append(hero);

  return {
    form,
    input,
    setEnabled(nextEnabled) {
      input.disabled = !nextEnabled;
      submit.disabled = !nextEnabled;
      examples.querySelectorAll('button').forEach((button) => {
        button.disabled = !nextEnabled;
      });
    },
  };
}
