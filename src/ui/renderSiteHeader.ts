export type SitePage = 'hub' | 'dometic-search' | 'dometic-manuals';

export function renderSiteHeader(currentPage: SitePage, onLogout: () => void): HTMLElement {
  const header = document.createElement('header');
  header.className = 'site-header';

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = '/';
  brand.textContent = 'Motts Training Hub';

  const actions = document.createElement('div');
  actions.className = 'site-header__actions';
  const navigation = document.createElement('nav');
  navigation.className = 'site-nav';
  navigation.setAttribute('aria-label', 'Main navigation');
  const homeLink = document.createElement('a');
  homeLink.href = '/';
  homeLink.textContent = 'Home';

  const companies = document.createElement('details');
  companies.className = 'company-menu';
  const companiesLabel = document.createElement('summary');
  companiesLabel.textContent = 'Companies';
  const companyLinks = document.createElement('div');
  companyLinks.className = 'company-menu__links';
  const searchLink = document.createElement('a');
  searchLink.href = '/dometic/';
  searchLink.textContent = 'Dometic search';
  const manualsLink = document.createElement('a');
  manualsLink.href = '/dometic/manuals.html';
  manualsLink.textContent = 'Dometic manuals';
  companyLinks.append(searchLink, manualsLink);
  companies.append(companiesLabel, companyLinks);
  if (currentPage === 'hub') homeLink.setAttribute('aria-current', 'page');
  if (currentPage === 'dometic-search') searchLink.setAttribute('aria-current', 'page');
  if (currentPage === 'dometic-manuals') manualsLink.setAttribute('aria-current', 'page');
  navigation.append(homeLink, companies);

  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'button button--logout';
  logout.textContent = 'Log out';
  logout.addEventListener('click', onLogout);
  actions.append(navigation, logout);
  header.append(brand, actions);
  return header;
}
