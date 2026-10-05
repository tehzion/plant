import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TabbedResults from './TabbedResults.jsx';
describe('accessible results tabs', () => {
    it('moves focus and selected content with arrow and boundary keys', () => {
        render(<TabbedResults tabs={[{ title: 'Diagnosis', content: 'Evidence' }, { title: 'Next checks', content: 'Review' }]} />);
        const tabs = screen.getAllByRole('tab');
        fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
        expect(tabs[1]).toHaveFocus(); expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Review');
        fireEvent.keyDown(tabs[1], { key: 'Home' }); expect(tabs[0]).toHaveFocus();
    });
});
