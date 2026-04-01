import { useLanguage } from '../i18n/i18n.jsx';
import { Check, Map, TreeDeciduous, Home } from 'lucide-react';
import './FarmScaleSelector.css';

const FarmScaleSelector = ({ selected, onSelect, quantity, onQuantityChange, disabled, selectedCategory }) => {
  const { t } = useLanguage();

  const calculateEstimatedTrees = (category, acres) => {
    const densityMap = {
      Durian: 35,
      Coconut: 60,
      Banana: 500,
      Cocoa: 450,
      Pepper: 700,
      Pineapple: 12000,
      Corn: 20000,
      Rubber: 190,
      'Palm/Rubber': 130,
      'Palm Oil': 55,
      Vegetables: 0,
      Fruits: 0,
      Rice: 0,
      'Weed Control': 0,
    };

    const density = densityMap[category] || 50;
    if (density === 0) return t('home.variableEstimate');

    return Math.round(acres * density).toLocaleString();
  };

  const scales = [
    {
      id: 'acre',
      icon: <Map size={40} color="#16A34A" />,
      name: t('home.acreScale'),
      description: t('home.acreDesc'),
      details: t('home.acreDetail'),
      hasQuantity: true,
      quantityLabel: t('home.enterAcres'),
      quantityUnit: t('home.acres'),
      inputType: 'number',
    },
    {
      id: 'tree',
      icon: <TreeDeciduous size={40} color="#16A34A" />,
      name: t('home.treeScale'),
      description: t('home.treeDesc'),
      details: t('home.treeDetail'),
      hasQuantity: true,
      quantityLabel: t('home.enterTrees'),
      quantityUnit: t('home.trees'),
      inputType: 'number',
    },
    {
      id: 'personal',
      icon: <Home size={40} color="#EA580C" />,
      name: t('home.personalScale'),
      description: t('home.personalDesc'),
      details: t('home.personalDetail'),
      hasQuantity: true,
      quantityLabel: t('home.enterPlants'),
      quantityUnit: t('home.plants'),
      inputType: 'number',
    },
  ];

  const selectedScaleData = scales.find((scale) => scale.id === selected);

  return (
    <div className="farm-scale-selector">
      <h3 className="selector-title">{t('home.selectScale')}</h3>
      <p className="selector-subtitle">{t('home.selectScaleSubtitle')}</p>

      <div className="scale-grid">
        {scales.map((scale) => (
          <div key={scale.id} className="scale-item">
            <button
              onClick={() => !disabled && onSelect(scale.id)}
              className={`scale-button ${selected === scale.id ? 'selected' : ''}`}
              disabled={disabled}
            >
              <div className="scale-icon">{scale.icon}</div>
              <div className="scale-info">
                <div className="scale-name">{scale.name}</div>
                <div className="scale-description">{scale.description}</div>
                <div className="scale-details">{scale.details}</div>
              </div>
              {selected === scale.id && (
                <div className="selected-indicator">
                  <Check size={16} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {selectedScaleData && selectedScaleData.hasQuantity && (
        <div className="quantity-input-container fade-in mt-md">
          <label className="quantity-label">{selectedScaleData.quantityLabel}</label>
          <div className="input-with-unit">
            <input
              type={selectedScaleData.inputType}
              value={quantity || ''}
              onChange={(e) => onQuantityChange(e.target.value)}
              placeholder="0"
              className="quantity-input"
              min="1"
              disabled={disabled}
            />
            <span className="unit-label">{selectedScaleData.quantityUnit}</span>
          </div>
          {selected === 'acre' && quantity > 0 && selectedCategory && (
            <div className="estimation-info">
              {t('home.estimatedTrees')} {calculateEstimatedTrees(selectedCategory, quantity)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmScaleSelector;
