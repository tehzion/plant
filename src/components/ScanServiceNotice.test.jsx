import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScanServiceNotice from './ScanServiceNotice.jsx';
const service = vi.hoisted(() => ({ status: 'unavailable', checking: false, retry: vi.fn() }));
vi.mock('../hooks/useScanService.js', () => ({ useScanService: () => service }));
vi.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }));
vi.mock('../i18n/i18n.jsx', async () => { const { default: copy } = await import('../i18n/translations.js'); return { useLanguage: () => ({ t: key => key.split('.').reduce((value, part) => value?.[part], copy.en) || key }) }; });
beforeEach(() => { service.status = 'unavailable'; service.checking = false; service.retry.mockReset(); });
describe('scan service recovery', () => {
 it('explains photo retention limits and gives a retry and saved-history exit', () => {
  render(<ScanServiceNotice capture />);
  expect(screen.getByText(/Save a photo draft before leaving this screen/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
  fireEvent.click(screen.getByRole('button', { name: 'Check connection again' }));
  expect(service.retry).toHaveBeenCalledTimes(1);
 });
 it('confirms recovery and keeps repeat retries disabled while checking', () => {
  const { rerender } = render(<ScanServiceNotice />);
  service.checking = true; rerender(<ScanServiceNotice />);
  expect(screen.getByRole('button', { name: 'Checking the scan connection…' })).toBeDisabled();
  service.checking = false; service.status = 'online'; rerender(<ScanServiceNotice />);
  expect(screen.getByRole('status')).toHaveTextContent('Connection restored');
 });
});
