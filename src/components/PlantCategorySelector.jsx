import { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { Wheat, Carrot, Apple, TreePalm, TreeDeciduous, Bean, Flame, Sprout, Nut, Ban, Flower2, Leaf, CircleDot } from 'lucide-react';

const categories = [
  { id: 'rice', nameKey: 'Rice', translationKey: 'home.categoryRice', icon: <Wheat size={32} color="#EAB308" /> },
  { id: 'vegetables', nameKey: 'Vegetables', translationKey: 'home.categoryVegetables', icon: <Carrot size={32} color="#16A34A" /> },
  { id: 'fruits', nameKey: 'Fruits', translationKey: 'home.categoryFruits', icon: <Apple size={32} color="#EF4444" /> },
  { id: 'palm-rubber', nameKey: 'Palm/Rubber', translationKey: 'home.categoryPalmRubber', icon: <TreePalm size={32} color="#15803D" /> },
  { id: 'durian', nameKey: 'Durian', translationKey: 'home.categoryDurian', icon: <TreeDeciduous size={32} color="#65A30D" /> },
  { id: 'coconut', nameKey: 'Coconut', translationKey: 'home.categoryCoconut', icon: <CircleDot size={32} color="#8B4513" /> },

  // WAIT, I promised to replace *remaining* emojis. "Ban" imported above was probably a mistake if I thought it was Banana.
  // Let's use 'ConciergeBell' (looks like nothing).
  // Let's use 'Utensils' for food? No.

  // Okay, safe bet: Use 'Bean' for Banana (curved shape) or 'Salad'.
  // Let's try 'Bean' for Cocoa and something else for Banana.
  // Actually, I'll use 'Leaf' for Banana (Banana Leaf). it's very iconic.
  { id: 'banana', nameKey: 'Banana', translationKey: 'home.categoryBanana', icon: <Leaf size={32} color="#EAB308" /> },

  { id: 'cocoa', nameKey: 'Cocoa', translationKey: 'home.categoryCocoa', icon: <Bean size={32} color="#78350F" /> },
  { id: 'pepper', nameKey: 'Pepper', translationKey: 'home.categoryPepper', icon: <Flame size={32} color="#DC2626" /> },
  { id: 'pineapple', nameKey: 'Pineapple', translationKey: 'home.categoryPineapple', icon: <Sprout size={32} color="#D97706" /> },
  { id: 'corn', nameKey: 'Corn', translationKey: 'home.categoryCorn', icon: <Wheat size={32} color="#FACC15" /> },
  { id: 'weed-control', nameKey: 'Weed Control', translationKey: 'home.categoryWeedControl', icon: <Flower2 size={32} color="#EF4444" /> }
];

const PlantCategorySelector = ({ selected, onSelect, disabled }) => {
  const { t } = useLanguage();

  return (
    <div className="category-selector">
      <h3 className="category-title">{t('home.selectCategory')}</h3>
      <p className="category-subtitle">{t('home.selectCategorySubtitle')}</p>
      <div className="category-grid">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => !disabled && onSelect(category.nameKey)}
            className={`category-btn ${selected === category.nameKey ? 'active' : ''}`}
            disabled={disabled}
          >
            <div className="category-icon" style={{ background: selected === category.nameKey ? '#ffffff' : '#F3F4F6' }}>{category.icon}</div>
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

      <style>{`
        .category-selector {
          width: 100%;
        }

        .category-title {
          font-size: var(--font-size-xl);
          font-weight: 600;
          color: var(--color-primary-dark);
          margin-bottom: var(--space-xs);
          text-align: center;
        }

        .category-subtitle {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-lg);
          text-align: center;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: var(--space-md);
        }

        @media (min-width: 1024px) {
          .category-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .category-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          padding: var(--space-lg) var(--space-md);
          background: white;
          border: 3px solid var(--color-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-base);
          font-family: var(--font-family);
          min-height: 140px;
          height: auto;
          width: 100%;
        }

        .category-btn:hover:not(:disabled) {
          border-color: var(--color-primary);
          transform: translateY(-4px) scale(1.02);
          box-shadow: var(--shadow-lg);
        }

        .category-btn.active {
          border-color: #22C55E;
          background: #DCFCE7; /* green-100 equivalent */
          box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.2), 0 2px 4px -1px rgba(34, 197, 94, 0.1);
        }

        .category-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .category-icon {
          width: 50px;
          height: 50px;
          background: #F3F4F6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-base);
          z-index: 1;
        }

        .category-btn:hover:not(:disabled) .category-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .category-name {
          font-size: var(--font-size-base);
          font-weight: 600;
          color: var(--color-text-primary);
          line-height: 1.2;
          text-align: center;
          z-index: 1;
        }

        .selected-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          background: #22C55E;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          animation: scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 2;
        }

        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }

        @media (max-width: 480px) {
          .category-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .category-btn {
            min-height: 120px;
            padding: var(--space-md);
          }
        }
      `}</style>
    </div>
  );
};

export default PlantCategorySelector;
