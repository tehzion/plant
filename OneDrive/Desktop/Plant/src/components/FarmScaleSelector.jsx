import { useLanguage } from '../i18n/i18n.jsx';
import { Map, TreeDeciduous, Home } from 'lucide-react';

const FarmScaleSelector = ({ selected, onSelect, quantity, onQuantityChange, disabled, selectedCategory }) => {
  const { t } = useLanguage();

  const calculateEstimatedTrees = (category, acres) => {
    // Estimations based on typical planting density per acre
    const densityMap = {
      'Durian': 35,      // ~30-40 trees/acre
      'Coconut': 60,     // ~50-70 trees/acre
      'Banana': 500,     // ~400-600 plants/acre
      'Cocoa': 450,      // ~400-500 trees/acre
      'Pepper': 700,     // ~600-800 vines/acre
      'Pineapple': 12000,// ~10k-14k plants/acre
      'Corn': 20000,     // ~18k-24k plants/acre
      'Rubber': 190,     // ~180-200 trees/acre
      'Palm Oil': 55,    // ~50-60 trees/acre
      'Vegetables': 0    // Too variable
    };

    const density = densityMap[category] || 50; // Default estimate
    if (density === 0) return 'Cannot estimate (varies)';

    return Math.round(acres * density).toLocaleString();
  };

  const scales = [
    {
      id: 'acre',
      icon: <Map size={40} color="#16A34A" />,
      name: t('home.hectareScale'),
      description: t('home.hectareDesc'),
      details: t('home.hectareDetail'),
      hasQuantity: true,
      quantityLabel: t('home.enterHectares'),
      quantityUnit: t('home.hectares'),
      inputType: 'number'
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
      inputType: 'number'
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
      inputType: 'number'
    }
  ];

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
                <div className="selected-indicator">✓</div>
              )}
            </button>

            {/* Quantity Input */}
            {selected === scale.id && scale.hasQuantity && (
              <div className="quantity-input-container fade-in">
                <label className="quantity-label">{scale.quantityLabel}</label>
                <div className="input-with-unit">
                  <input
                    type={scale.inputType}
                    value={quantity || ''}
                    onChange={(e) => onQuantityChange(e.target.value)}
                    placeholder="0"
                    className="quantity-input"
                    min="1"
                    disabled={disabled}
                  />
                  <span className="unit-label">{scale.quantityUnit}</span>
                </div>
                {/* Estimation Display for Acre/Hectare */}
                {scale.id === 'acre' && quantity > 0 && selectedCategory && (
                  <div className="estimation-info">
                    {t('home.estimatedTrees')} {calculateEstimatedTrees(selectedCategory, quantity)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .farm-scale-selector {
          width: 100%;
        }

        .selector-title {
          font-size: var(--font-size-xl);
          font-weight: 600;
          color: var(--color-primary-dark);
          margin-bottom: var(--space-xs);
          text-align: center;
        }

        .selector-subtitle {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-lg);
          text-align: center;
        }

        .scale-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-md);
          align-items: start;
        }

        .scale-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .scale-button {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-lg);
          background: white;
          border: 3px solid var(--color-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-base);
          font-family: var(--font-family);
          min-height: 180px; /* Consistent baseline height */
          height: auto;
          width: 100%;
        }

        .scale-button:hover:not(:disabled) {
          border-color: var(--color-primary);
          transform: translateY(-4px) scale(1.02);
          box-shadow: var(--shadow-lg);
        }

        .scale-button:hover:not(:disabled) .scale-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .scale-button.selected {
          border-color: var(--color-primary);
          background: linear-gradient(135deg, rgba(95, 168, 62, 0.1) 0%, rgba(61, 124, 31, 0.05) 100%);
          box-shadow: var(--shadow-md);
        }

        .scale-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .scale-icon {
          font-size: 1rem; /* Reset font size for SVG */
          margin-bottom: var(--space-xs);
          transition: transform var(--transition-base);
          display: flex;
          align-items: center;
          justify-content: center;
          height: 50px; /* Fixed height for consistency */
          width: 50px;
          background: #F3F4F6;
          border-radius: 50%;
        }

        .scale-info {
          text-align: center;
          width: 100%;
        }

        .scale-name {
          font-size: var(--font-size-lg);
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--space-xs);
        }

        .scale-description {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-bottom: 0.25rem;
        }

        .scale-details {
          font-size: var(--font-size-xs);
          color: var(--color-primary);
          font-weight: 500;
        }

        .selected-indicator {
          position: absolute;
          top: var(--space-sm);
          right: var(--space-sm);
          width: 28px;
          height: 28px;
          background: var(--color-primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-lg);
          font-weight: bold;
        }

        .quantity-input-container {
          background: var(--color-bg-secondary);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          margin-top: var(--space-xs);
        }

        .fade-in {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .quantity-label {
          display: block;
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--space-xs);
        }

        .input-with-unit {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }

        .quantity-input {
          width: 100%;
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-base);
          font-family: var(--font-family);
        }

        .quantity-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(61, 124, 31, 0.1);
        }

        .unit-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .estimation-info {
          margin-top: var(--space-xs);
          font-size: var(--font-size-xs);
          color: var(--color-primary);
          font-weight: 600;
          background: rgba(61, 124, 31, 0.1);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          display: inline-block;
        }

        @media (max-width: 768px) {
          .scale-grid {
            grid-template-columns: 1fr;
          }

          .scale-button {
            min-height: 120px;
          }
        }
      `}</style>
    </div>
  );
};

export default FarmScaleSelector;
