import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import FarmOverview from './FarmOverview.jsx';
vi.mock('../../i18n/i18n.jsx', () => ({ useLanguage: () => ({language:'en', t:key=>key}) }));
describe('farm priority checks', () => {
 it('puts an overdue check first and does not repeat it as a review item', () => {
  render(<MemoryRouter><FarmOverview scans={[
   {id:'review', disease:'Review finding', resultState:'needs_review'},
   {id:'due', disease:'Due finding', followUp:{nextCheckDate:'2020-01-01',history:[]}},
  ]} /></MemoryRouter>);
  const section = screen.getByRole('heading',{name:'common.attentionTitle'}).closest('section');
  const links = within(section).getAllByRole('link');
  expect(links[0]).toHaveAttribute('href','/results/due');
  expect(links.filter(link=>link.getAttribute('href')==='/results/due')).toHaveLength(1);
  expect(links[1]).toHaveAttribute('href','/results/review');
 });
 it('offers a first check when no scan exists', () => {
  render(<MemoryRouter><FarmOverview /></MemoryRouter>);
  expect(screen.getByRole('link',{name:'common.startCheck'})).toHaveAttribute('href','/?scan=true');
 });
});
