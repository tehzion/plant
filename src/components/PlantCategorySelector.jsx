import { useLanguage } from '../i18n/i18n.jsx';
import { Wheat, Carrot, Apple, TreePalm, TreeDeciduous, Bean, Flame, Sprout, Leaf, CircleDot } from 'lucide-react';
import './PlantCategorySelector.css';

const categories = [
  { id: 'rice', nameKey: 'Rice', translationKey: 'home.categoryRice', icon: <Wheat size={32} /> },
  { id: 'vegetables', nameKey: 'Vegetables', translationKey: 'home.categoryVegetables', icon: <Carrot size={32} /> },
  { id: 'fruits', nameKey: 'Fruits', translationKey: 'home.categoryFruits', icon: <Apple size={32} /> },
  { id: 'palm-rubber', nameKey: 'Palm/Rubber', translationKey: 'home.categoryPalmRubber', icon: <TreePalm size={32} /> },
  { id: 'durian', nameKey: 'Durian', translationKey: 'home.categoryDurian', icon: <TreeDeciduous size={32} /> },
  { id: 'coconut', nameKey: 'Coconut', translationKey: 'home.categoryCoconut', icon: <CircleDot size={32} /> },
  { id: 'banana', nameKey: 'Banana', translationKey: 'home.categoryBanana', icon: <Leaf size={32} /> },
  { id: 'cocoa', nameKey: 'Cocoa', translationKey: 'home.categoryCocoa', icon: <Bean size={32} /> },
  { id: 'pepper', nameKey: 'Pepper', translationKey: 'home.categoryPepper', icon: <Flame size={32} /> },
  { id: 'pineapple', nameKey: 'Pineapple', translationKey: 'home.categoryPineapple', icon: <Sprout size={32} /> },
  { id: 'corn', nameKey: 'Corn', translationKey: 'home.categoryCorn', icon: <Wheat size={32} /> },
];

// For now farmers choose only from the categories the AI handles best: Vegetables and Fruits hold the
// crops it knows well (tomato, chilli, potato, mango) and Rice has look-alike checks. Add an id here to
// bring a category back.
const offeredCategoryIds = ['rice', 'vegetables', 'fruits'];
const offeredCategories = categories.filter((category) => offeredCategoryIds.includes(category.id));

// Broad categories get an optional specific-crop choice; the English name is sent to the API.
const specificCrops = {
  Vegetables: ['Tomato', 'Chilli', 'Cucumber', 'Brinjal', 'Okra', 'Cabbage', 'Mustard greens', 'Water spinach', 'Long bean', 'Potato'],
  Fruits: ['Papaya', 'Mango', 'Citrus', 'Watermelon', 'Guava', 'Rambutan', 'Jackfruit', 'Dragon fruit'],
};
const cropKey = (crop) => `home.crop${crop.split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`;

const PlantCategorySelector = ({ selected, onSelect, crop = '', onCropSelect, disabled }) => {
  const { t } = useLanguage();
  const handleSelect = (category) => {
    if (disabled) return;
    onSelect?.(category.nameKey);
  };
  const crops = specificCrops[selected];

  return (
    <div className="category-selector">
      <div className="category-grid">
        {offeredCategories.map((category) => (
          <button
            type="button"
            key={category.id}
            onClick={() => handleSelect(category)}
            className={`category-btn ${selected === category.nameKey ? 'active' : ''}`}
            disabled={disabled}
            aria-pressed={selected === category.nameKey}
          >
            <div className={`category-icon ${selected === category.nameKey ? 'is-active' : ''}`}>{category.icon}</div>
            <span className="category-name">{t(category.translationKey)}</span>
            {selected === category.nameKey && (
              <div className="selected-indicator">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      {crops && onCropSelect && (
        <label className="crop-select">
          <span className="crop-select-label">{t('home.cropSelectLabel')}</span>
          <select value={crop} onChange={(event) => onCropSelect(event.target.value)} disabled={disabled}>
            <option value="">{t('home.cropNotSure')}</option>
            {crops.map((name) => <option key={name} value={name}>{t(cropKey(name))}</option>)}
          </select>
          <span className="crop-select-hint">{t('home.cropSelectHint')}</span>
        </label>
      )}
    </div>
  );
};

export default PlantCategorySelector;
