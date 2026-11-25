import { useEffect, useState } from 'react';

// Marks a horizontal scroll row with data-fade-start / data-fade-end while
// there is more content past that edge, so CSS can fade the cut-off side.
// Without a hint, a row that ends mid-chip looks like the whole list.
// Returns a callback ref, so rows that mount after a loading state still
// get watched.
export const useScrollEdges = () => {
    const [node, setNode] = useState(null);

    useEffect(() => {
        if (!node) return undefined;

        const update = () => {
            const maxScroll = node.scrollWidth - node.clientWidth;
            node.toggleAttribute('data-fade-start', node.scrollLeft > 2);
            node.toggleAttribute('data-fade-end', maxScroll - node.scrollLeft > 2);
        };

        update();
        node.addEventListener('scroll', update, { passive: true });
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
        observer?.observe(node);

        return () => {
            node.removeEventListener('scroll', update);
            observer?.disconnect();
        };
    }, [node]);

    return setNode;
};
