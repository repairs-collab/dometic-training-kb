import { fireEvent, within } from '@testing-library/dom';
import { describe, expect, test, vi } from 'vitest';

import { renderSiteHeader } from './renderSiteHeader';

describe('shared site header', () => {
  test.each(['hub', 'dometic-search', 'dometic-manuals'] as const)(
    'renders company navigation and logout for %s',
    (currentPage) => {
    const logout = vi.fn();
    const header = renderSiteHeader(currentPage, logout);
    const home = within(header).getByRole('link', { name: 'Home' });
    const search = within(header).getByRole('link', { name: 'Dometic search' });
    const manuals = within(header).getByRole('link', { name: 'Dometic manuals' });

    expect(within(header).getByRole('link', { name: 'Motts Training Hub' }).getAttribute('href')).toBe('/');
    expect(within(header).getByText('Companies')).toBeTruthy();
    expect(home.getAttribute('href')).toBe('/');
    expect(search.getAttribute('href')).toBe('/dometic/');
    expect(manuals.getAttribute('href')).toBe('/dometic/manuals.html');
    const current = currentPage === 'hub' ? home : currentPage === 'dometic-search' ? search : manuals;
    expect(current.getAttribute('aria-current')).toBe('page');

    fireEvent.click(within(header).getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledOnce();
    },
  );
});
