import { fireEvent, within } from '@testing-library/dom';
import { describe, expect, test, vi } from 'vitest';

import { renderSiteHeader } from './renderSiteHeader';

describe('shared site header', () => {
  test.each(['search', 'manuals'] as const)('renders navigation and logout for %s', (currentPage) => {
    const logout = vi.fn();
    const header = renderSiteHeader(currentPage, logout);
    const search = within(header).getByRole('link', { name: 'Search' });
    const manuals = within(header).getByRole('link', { name: 'Manuals' });

    expect(search.getAttribute('href')).toBe('./');
    expect(manuals.getAttribute('href')).toBe('./manuals.html');
    expect((currentPage === 'search' ? search : manuals).getAttribute('aria-current')).toBe('page');

    fireEvent.click(within(header).getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
