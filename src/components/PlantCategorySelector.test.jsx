import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PlantCategorySelector from './PlantCategorySelector.jsx';

vi.mock('../i18n/i18n.jsx', () => ({
  useLanguage: () => ({
    t: (key) => ({
      'home.selectCategory': 'Select Plant Category',
      'home.selectCategorySubtitle': 'Choose crop type',
      'home.categoryRice': 'Rice',
    }[key] || key),
  }),
}));

describe('PlantCategorySelector', () => {
  it('sends the selected crop value immediately', () => {
    const onSelect = vi.fn();
    render(<PlantCategorySelector selected="" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /rice/i }));

    expect(onSelect).toHaveBeenCalledWith('Rice');
  });

  it('marks the selected crop button as pressed', () => {
    render(<PlantCategorySelector selected="Rice" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /rice/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers only rice, vegetables and fruits for now', () => {
    render(<PlantCategorySelector selected="" onSelect={vi.fn()} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent))
      .toEqual(['Rice', 'home.categoryVegetables', 'home.categoryFruits']);
  });
});
