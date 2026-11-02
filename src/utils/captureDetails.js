export const validCaptureDetails = state => Boolean(
    typeof state.selectedCategory === 'string' && state.selectedCategory.trim()
    && ['acre', 'tree', 'personal'].includes(state.selectedScale)
    && (state.selectedScale === 'personal' || (Number.isFinite(Number(state.scaleQuantity)) && Number(state.scaleQuantity) > 0 && (state.selectedScale !== 'tree' || Number.isInteger(Number(state.scaleQuantity))))),
);
