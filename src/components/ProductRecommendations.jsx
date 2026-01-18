import React, { useState, useEffect } from 'react';
import { getProductRecommendations, suppliers } from '../data/productRecommendations.js';
import { useLanguage } from '../i18n/i18n.jsx';
import { Map, TreeDeciduous, Home, MapPin, Pill, Leaf, Lightbulb, Building2, Phone, Mail, MessageCircle, ArrowRight } from 'lucide-react';

const ProductRecommendations = ({ plantType, disease, farmScale }) => {
  const { t } = useLanguage();
  const products = getProductRecommendations(plantType, disease);

  if (!products || (!Array.isArray(products.diseaseControl) && !Array.isArray(products.nutrition))) return null;

  // Get scale-specific recommendations
  const getScaleRecommendation = () => {
    switch (farmScale) {
      case 'acre':
        return {
          title: t('results.bulkQuantitiesTitle'),
          note: t('results.bulkQuantitiesNote'),
          icon: <Map size={20} className="scale-icon" />,
          label: t('home.acreScale')
        };
      case 'tree':
        return {
          title: t('results.perTreeTitle'),
          note: t('results.perTreeNote'),
          icon: <TreeDeciduous size={20} className="scale-icon" />,
          label: t('home.treeScale')
        };
      case 'personal':
        return {
          title: t('results.personalUseTitle'),
          note: t('results.personalUseNote'),
          icon: <Home size={20} className="scale-icon" />,
          label: t('home.personalScale')
        };
      default:
        return {
          title: t('results.professionalProductsTitle'),
          note: '',
          icon: null,
          label: ''
        };
    }
  };

  const scaleInfo = getScaleRecommendation();

  const renderProductCard = (product, index) => {
    const hasMultipleSuppliers = product.supplier === 'both';

    // Determine background color based on product type (keeping subtle coding)
    const isFertilizer = product.name.toLowerCase().includes('baja') || product.name.toLowerCase().includes('fertilizer');
    const iconBg = isFertilizer ? '#ECFDF5' : '#FEF2F2';

    return (
      <div key={index} className="product-card-wrapper">
        {/* Placeholder: Just a clean colored box, no icon as requested */}
        <div className="product-image-placeholder" style={{ backgroundColor: iconBg }}>
          {/* Optional: We could put a very subtle pattern or logo here if needed, but keeping it clean for now */}
        </div>

        <div className="product-content">
          <div className="product-info-top">
            <h4 className="product-name" title={product.name}>{product.name}</h4>
            <p className="product-count">{product.count}</p>
          </div>

          <p className="product-description">{product.description}</p>

          <div className="product-actions">
            {(product.supplier === 'guanChong' || hasMultipleSuppliers) && product.guanChongUrl && (
              <a
                href={product.guanChongUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="buy-button"
              >
                {t('results.viewProduct')}
              </a>
            )}
            {((product.supplier === 'tanAgro' || hasMultipleSuppliers) && product.tanAgroUrl && (!product.guanChongUrl || product.supplier !== 'both')) && (
              <a
                href={product.tanAgroUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="buy-button"
              >
                {t('results.viewProduct')}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="product-recommendations-container">
      {/* Disease Control Products */}
      {products.diseaseControl && products.diseaseControl.length > 0 && (
        <div className="product-section">
          <div className="section-header-centered">
            <h3 className="section-title">{t('results.diseaseControlProducts')}</h3>
          </div>
          <p className="section-subtitle">
            {t('results.diseaseControlSubtitle')}
          </p>

          <div className="products-grid">
            {products.diseaseControl.map((product, index) => renderProductCard(product, index))}
          </div>
        </div>
      )}

      {/* Nutritional & Fertilizer Products */}
      {products.nutrition && products.nutrition.length > 0 && (
        <div className="product-section">
          <div className="section-header-centered">
            <h3 className="section-title">{!disease || disease.toLowerCase().includes('healthy') ? t('results.growthAndMaintenance') : t('results.fertilizersAndNutrition')}</h3>
          </div>

          {scaleInfo.label && (
            <div className="scale-badge">
              {scaleInfo.icon} {scaleInfo.label}
            </div>
          )}
          <p className="section-subtitle">
            {scaleInfo.title}
          </p>

          <div className="products-grid">
            {products.nutrition.map((product, index) => renderProductCard(product, index))}
          </div>
        </div>
      )}

      {/* Suppliers Information */}
      <div className="product-section">
        <div className="section-header-centered">
          <h3 className="section-title">{t('results.ourTrustedSuppliers')}</h3>
        </div>
        <p className="section-subtitle">
          Professional agro-suppliers with expert support and doorstep delivery
        </p>

        <div className="suppliers-grid">
          {/* Guan Chong Agro */}
          <div className="supplier-card">
            <div className="supplier-header">
              <div className="supplier-icon-bg"><Building2 size={24} color="#166534" /></div>
              <h4 className="supplier-company-name">{suppliers.guanChongAgro.name}</h4>
            </div>
            <p className="supplier-description">{t(suppliers.guanChongAgro.description)}</p>
            <div className="supplier-contact">
              <p><MapPin size={16} /> {suppliers.guanChongAgro.address}</p>
              <p><Phone size={16} /> {suppliers.guanChongAgro.phone}</p>
            </div>
            <a
              href="https://www.guanchongagro.com/category/"
              target="_blank"
              rel="noopener noreferrer"
              className="buy-button"
              style={{ marginTop: 'auto' }}
            >
              {t('results.viewProduct')}
            </a>
          </div>

          {/* Tan Agro */}
          <div className="supplier-card">
            <div className="supplier-header">
              <div className="supplier-icon-bg"><Building2 size={24} color="#1D4ED8" /></div>
              <h4 className="supplier-company-name">{suppliers.tanAgro.name}</h4>
            </div>
            <p className="supplier-description">{t(suppliers.tanAgro.description)}</p>
            <div className="supplier-contact">
              <p><MapPin size={16} /> {suppliers.tanAgro.address}</p>
              <p><Phone size={16} /> {suppliers.tanAgro.phone.split(' / ')[0]}...</p>
            </div>
            <a
              href="https://www.tanagro.com.my/category/"
              target="_blank"
              rel="noopener noreferrer"
              className="buy-button"
              style={{ marginTop: 'auto' }}
            >
              {t('results.viewProduct')}
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .product-recommendations-container {
          margin-top: 24px;
        }

        .product-section {
          background: #FAFAFA; /* Very light grey background for sections */
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .suppliers-info-section {
             margin-top: 32px;
             margin-bottom: 32px;
        }

        .suppliers-info-section .section-header-centered {
            margin-bottom: 24px; /* Increased spacing as requested */
        }

        .section-header-centered {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 4px;
        }
        
        .section-icon-pill, .section-icon-leaf, .section-icon-building {
            /* Sizes handled by inline props */
             color: var(--color-primary);
        }

        .section-title, .suppliers-title {
          font-size: 1.25rem;
          color: #1F2937;
          margin: 0;
          text-align: center;
          font-weight: 700;
        }

        .section-subtitle {
          text-align: center;
          color: #6B7280;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }

        .scale-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-primary);
          margin-bottom: 4px;
        }
        
        .scale-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 6px 12px;
          background: #F0FDF4;
          border-radius: 99px;
          color: #166534;
          font-weight: 500;
          margin-bottom: 24px;
          font-size: 0.85rem;
          max-width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }

        /* GRAB MART STYLE GRID & CARDS */
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); /* Slightly narrower for mobile density */
          gap: 12px;
        }

        .product-card-wrapper {
          background: white;
          border-radius: 8px; /* Slightly sharper, app-like */
          overflow: hidden;
          border: 1px solid #F3F4F6; /* Very subtle border */
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .product-card-wrapper:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.06);
            border-color: #E5E7EB;
        }

        .product-image-placeholder {
            height: 150px; /* Square-ish */
            width: 100%;
            background: #F9FAFB;
        }
        
        .product-content {
            padding: 12px;
            display: flex;
            flex-direction: column;
            flex: 1;
        }
        
       .product-info-top {
           margin-bottom: 6px;
       }

        .product-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1F2937;
          margin: 0 0 2px 0;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.7em; /* Consistent height for alignment */
        }

        .product-count {
          font-size: 0.75rem;
          color: #9CA3AF;
          font-weight: 400;
          margin: 0;
        }

        .product-description {
          font-size: 0.75rem;
          color: #6B7280;
          line-height: 1.4;
          margin-bottom: 12px;
          flex: 1;
           display: -webkit-box;
          -webkit-line-clamp: 2; /* Limit to 2 lines for cleaner look */
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .product-actions {
            margin-top: auto;
        }
        
        .buy-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 8px 0;
            background: white;
            color: var(--color-primary);
            border: 1px solid var(--color-primary);
            border-radius: 6px; /* Slightly sharper button */
            font-size: 0.85rem;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s;
        }
        
        /* Modern 'Add' style button hover */
        .buy-button:hover {
            background: var(--color-primary);
            color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* Supplier Cards */
        .suppliers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
        }
        
        .supplier-card {
            background: white;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid #E5E7EB;
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        
        .supplier-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .supplier-icon-bg {
             width: 40px;
             height: 40px;
             border-radius: 8px;
             background: #F3F4F6;
             display: flex;
             align-items: center;
             justify-content: center;
        }

        .supplier-company-name {
             font-size: 1rem;
             font-weight: 700;
             margin: 0;
             color: #1F2937;
        }
        
        .supplier-description {
            font-size: 0.85rem;
            color: #6B7280;
            margin-bottom: 12px;
            line-height: 1.5;
            flex: 1; /* Push content apart if needed */
        }
        
        .supplier-contact p {
            font-size: 0.85rem;
            color: #4B5563;
            margin: 4px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* .supplier-link removed, using .buy-button instead */

        @media (min-width: 768px) {
          .products-grid {
             grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
             gap: 24px;
          }
           .product-recommendations-container {
             margin-top: 32px;
           }
        }
      `}</style>
    </div>
  );
};

export default React.memo(ProductRecommendations);
