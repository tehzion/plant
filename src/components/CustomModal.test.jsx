import { fireEvent, render, screen } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import CustomModal from './CustomModal.jsx';
vi.mock('../i18n/i18n.jsx', () => ({ useLanguage: () => ({ t: (key) => key }) }));

it('labels the dialog, traps keyboard focus, closes on Escape, and restores focus', () => {
    const trigger = document.createElement('button'); document.body.appendChild(trigger); trigger.focus();
    const onClose = vi.fn();
    const view = render(<CustomModal isOpen onClose={onClose} title="Confirm" message="Details" />);
    expect(screen.getByRole('dialog', { name: 'Confirm' })).toHaveAttribute('aria-modal', 'true');
    const close = screen.getByRole('button', { name: 'common.close' });
    const confirm = screen.getByRole('button', { name: 'common.ok' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true }); expect(confirm).toHaveFocus();
    fireEvent.keyDown(confirm, { key: 'Tab' }); expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' }); expect(onClose).toHaveBeenCalledOnce();
    view.unmount(); expect(trigger).toHaveFocus(); trigger.remove();
});
