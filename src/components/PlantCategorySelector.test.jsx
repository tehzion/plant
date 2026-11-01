import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PlantCategorySelector from './PlantCategorySelector.jsx';

vi.mock('../i18n/i18n.jsx', () => ({
  useLanguage: () => ({
    t: (key) => ({
      'home.selectCategory': 'Select Plant Category',
      'home.selectCategorySubtitle': 'Choose crop type',
      'home.categoryDurian': 'Durian',
    }[key] || key),
  }),
}));

describe('PlantCategorySelector', () => {
  it('sends the selected crop value immediately', () => {
    const onSelect = vi.fn();
    render(<PlantCategorySelector selected="" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /durian/i }));

    expect(onSelect).toHaveBeenCalledWith('Durian');
  });

  it('keeps uncommon crops behind a disclosure and excludes weed control', () => {
    render(<PlantCategorySelector selected="" onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'home.categoryCoconut' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'results.moreCrops' }));
    expect(screen.getByRole('button', { name: 'home.categoryCoconut' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'home.categoryWeedControl' })).not.toBeInTheDocument();
  });

  it('marks the selected crop button as pressed', () => {
    render(<PlantCategorySelector selected="Durian" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /durian/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
