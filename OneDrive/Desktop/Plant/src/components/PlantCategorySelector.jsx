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
            onClick={() => onSelect(category.nameKey)}
            className={`category-btn ${selected === category.nameKey ? 'active' : ''}`}
            disabled={disabled}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{t(category.translationKey)}</span>
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
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--space-md);
        }

        @media (min-width: 1024px) {
          .category-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .category-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-lg);
          min-height: 100px;
          background: white;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-base);
          font-family: var(--font-family);
          position: relative;
          overflow: hidden;
        }

        .category-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--gradient-primary);
          opacity: 0;
          transition: opacity var(--transition-base);
        }

        .category-btn:hover:not(:disabled) {
          border-color: var(--color-primary-light);
          transform: translateY(-4px) scale(1.05);
          box-shadow: var(--shadow-lg);
        }

        .category-btn:hover:not(:disabled)::before {
          opacity: 0.05;
        }

        .category-btn.active {
          background: var(--gradient-primary);
          border-color: var(--color-primary);
          color: white;
          box-shadow: var(--shadow-lg);
          transform: scale(1.05);
        }

        .category-btn.active::before {
          opacity: 1;
        }

        .category-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .category-icon {
          font-size: 1rem;
          position: relative;
          z-index: 1;
          transition: transform var(--transition-base);
          background: #F9FAFB;
          border-radius: 50%;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .category-btn:hover .category-icon {
          transform: scale(1.1);
        }

        .category-name {
          font-size: var(--font-size-sm);
          font-weight: 500;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 480px) {
          .category-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .category-btn {
            min-height: 90px;
          }
        }
      `}</style>
    </div>
  );
};

export default PlantCategorySelector;
