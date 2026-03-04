import React from 'react';

/**
 * Formats a text item by bolding the title if it contains a colon.
 * Also handles ALL CAPS titles by converting them to Title Case.
 * 
 * @param {string} text - The text to format
 * @returns {React.ReactNode} Formatted React element or string
 */
export const formatItemWithTitle = (text) => {
    if (typeof text !== 'string') return text;

    const colonIndex = text.indexOf(':');
    if (colonIndex > 0 && colonIndex < 50) {
        const title = text.substring(0, colonIndex);
        const content = text.substring(colonIndex + 1);

        // Convert ALL CAPS title to Title Case and bold it
        if (title === title.toUpperCase() && title !== title.toLowerCase()) {
            const titleCase = title
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return (
                <>
                    <strong>{titleCase}:</strong>{content}
                </>
            );
        }

        return (
            <>
                <strong>{title}:</strong>{content}
            </>
        );
    }

    return text;
};
