export type SitePage = 'search' | 'manuals';

export function renderSiteHeader(currentPage: SitePage, onLogout: () => void): HTMLElement {
  const header = document.createElement('header');
  header.className = 'site-header';

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = './';
  brand.textContent = 'Technical Training Hub';

  const actions = document.createElement('div');
  actions.className = 'site-header__actions';
  const navigation = document.createElement('nav');
  navigation.className = 'site-nav';
  navigation.setAttribute('aria-label', 'Main navigation');
  const searchLink = document.createElement('a');
  searchLink.href = './';
  searchLink.textContent = 'Search';
  const manualsLink = document.createElement('a');
  manualsLink.href = './manuals.html';
  manualsLink.textContent = 'Manuals';
  (currentPage === 'search' ? searchLink : manualsLink).setAttribute('aria-current', 'page');
  navigation.append(searchLink, manualsLink);

  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'button button--logout';
  logout.textContent = 'Log out';
  logout.addEventListener('click', onLogout);
  actions.append(navigation, logout);
  header.append(brand, actions);
  return header;
}
