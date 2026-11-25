import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useScrollEdges } from './useScrollEdges.js';

const Row = () => {
    const ref = useScrollEdges();
    return <div ref={ref} data-testid="row" />;
};

const setSize = (node, { scrollWidth, clientWidth, scrollLeft = 0 }) => {
    Object.defineProperty(node, 'scrollWidth', { configurable: true, value: scrollWidth });
    Object.defineProperty(node, 'clientWidth', { configurable: true, value: clientWidth });
    node.scrollLeft = scrollLeft;
};

describe('useScrollEdges', () => {
    it('fades only the edges that hide more content', () => {
        render(<Row />);
        const row = screen.getByTestId('row');

        setSize(row, { scrollWidth: 600, clientWidth: 300, scrollLeft: 0 });
        fireEvent.scroll(row);
        expect(row.hasAttribute('data-fade-start')).toBe(false);
        expect(row.hasAttribute('data-fade-end')).toBe(true);

        setSize(row, { scrollWidth: 600, clientWidth: 300, scrollLeft: 150 });
        fireEvent.scroll(row);
        expect(row.hasAttribute('data-fade-start')).toBe(true);
        expect(row.hasAttribute('data-fade-end')).toBe(true);

        setSize(row, { scrollWidth: 600, clientWidth: 300, scrollLeft: 300 });
        fireEvent.scroll(row);
        expect(row.hasAttribute('data-fade-start')).toBe(true);
        expect(row.hasAttribute('data-fade-end')).toBe(false);
    });

    it('adds no fade when everything fits', () => {
        render(<Row />);
        const row = screen.getByTestId('row');

        setSize(row, { scrollWidth: 300, clientWidth: 300 });
        fireEvent.scroll(row);
        expect(row.hasAttribute('data-fade-start')).toBe(false);
        expect(row.hasAttribute('data-fade-end')).toBe(false);
    });
});
