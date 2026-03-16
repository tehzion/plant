import React, { useState, useEffect } from 'react';
import { suppliers } from '../data/productRecommendations.js';
import { useLanguage } from '../i18n/i18n.jsx';
import PartnerCarousel from './PartnerCarousel';
import { Map, TreeDeciduous, Home, MapPin, Pill, Leaf, Building2, Phone, ShoppingCart, Loader, Info } from 'lucide-react';
import { isHealthy } from '../utils/statusUtils';

const ProductRecommendations = ({ plantType, disease, farmScale, scanResult }) => {
  const { t } = useLanguage();
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [reasoning, setReasoning] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      if (!plantType && !disease) {
        setProducts({ diseaseControl: [], nutrition: [] });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const url = `${import.meta.env.VITE_API_URL || ''}/api/products/search`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            diagnosis: {
              plantType: plantType || '',
              disease: disease || 'None',
              healthStatus: scanResult?.healthStatus || 'unknown',
              pathogenType: scanResult?.pathogenType || 'None',
              symptoms: scanResult?.symptoms || [],
              treatments: scanResult?.treatments || []
            }
          })
        });
        
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const data = await response.json();
        
        // Server returns pre-categorized data — use it directly
        setProducts({
          diseaseControl: data.diseaseControl || [],
          nutrition: data.nutrition || []
        });
        if (data.reasoning) setReasoning(data.reasoning);
      } catch (err) {
        console.error('Failed to load recommended products:', err);
        setError(t('results.productsError') || 'Could not load specialized products at this time.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [plantType, disease, scanResult, t]);

  const toggleProductSelection = (productId) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleCheckout = () => {
    if (selectedProductIds.size === 0) return;
    
    // WooCommerce Bulk Add-to-Cart format
    // https://your-store.com/cart/?add-to-cart=ID1,ID2&quantity=1,1
    const ids = Array.from(selectedProductIds).join(',');
    const quantities = Array(selectedProductIds.size).fill('1').join(',');
    
    // Construct local store url or fallback if not configured on frontend
    const wooCommerceBaseUrl = 'https://www.mojosense.app/kanb';
    const checkoutUrl = `${wooCommerceBaseUrl}/checkout/?add-to-cart=${ids}&quantity=${quantities}`;
    
    window.open(checkoutUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="product-recommendations-container" style={{ textAlign: 'center', padding: '40px' }}>
        <Loader className="spinner" size={32} color="var(--color-primary)" />
        <p style={{ marginTop: '12px', color: '#6B7280' }}>{t('results.loadingProducts') || 'Discovering the best local agriculture products...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-recommendations-container">
        <div className="product-section" style={{ textAlign: 'center', color: '#EF4444' }}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!products || (!products.diseaseControl?.length && !products.nutrition?.length)) return null;

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
    const isSelected = selectedProductIds.has(product.id);
    const isFertilizer = product.name?.toLowerCase().includes('baja') || product.name?.toLowerCase().includes('fertilizer') || product.categories?.some(c => c.toLowerCase().includes('fertilizer'));
    const iconBg = isFertilizer ? '#ECFDF5' : '#FEF2F2';

    return (
      <div key={product.id || index} className={`product-card-wrapper ${isSelected ? 'selected' : ''}`} onClick={() => toggleProductSelection(product.id)}>
        <div className="product-image-container">
           {product.image ? (
              <img src={product.image} alt={product.name} className="product-image" />
           ) : (
              <div className="product-image-placeholder" style={{ backgroundColor: iconBg }}></div>
           )}
           <div className="checkbox-container">
             <div className={`custom-checkbox ${isSelected ? 'checked' : ''}`}>
               {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
             </div>
           </div>
        </div>

        <div className="product-content">
          <div className="product-info-top">
            <h4 className="product-name" title={product.name}>{product.name}</h4>
            <p className="product-price">RM {product.price || '0.00'}</p>
          </div>

          <p className="product-description" dangerouslySetInnerHTML={{ __html: product.description || '' }}></p>

          <div className="product-actions">
            <a
              href={product.cartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="add-to-cart-button"
              onClick={(e) => e.stopPropagation()}
            >
              <ShoppingCart size={14} />
              <span>{t('results.addToCart') || 'Add to Cart'}</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="product-recommendations-container">
      {/* AI Reasoning Explainer */}
      {reasoning && (
        <div className="ai-reasoning-banner">
          <Info size={16} />
          <span>{t('results.whyTheseProducts') || 'Why these products?'} {reasoning}</span>
        </div>
      )}

      {/* Disease Control Products */}
      {products.diseaseControl && products.diseaseControl.length > 0 && (
        <div className="product-section">
          <div className="section-header-centered">
            <h3 className="section-title">{t('results.diseaseControlProducts')}</h3>
          </div>

          <div className="products-grid">
            {products.diseaseControl.map((product, index) => renderProductCard(product, index))}
          </div>
        </div>
      )}

      {/* Nutritional & Fertilizer Products */}
      {products.nutrition && products.nutrition.length > 0 && (
        <div className="product-section">
          <div className="section-header-centered">
            <h3 className="section-title">{(!disease || isHealthy(disease)) ? t('results.growthAndMaintenance') : t('results.fertilizersAndNutrition')}</h3>
          </div>

          {scaleInfo.label && (
            <div className="scale-badge">
              {scaleInfo.icon} {scaleInfo.label}
            </div>
          )}

          <div className="products-grid">
            {products.nutrition.map((product, index) => renderProductCard(product, index))}
          </div>
        </div>
      )}

      {/* Checkout Section Bar */}
      {selectedProductIds.size > 0 && (
         <div className="checkout-bar-container">
           <div className="checkout-bar">
             <div className="checkout-info">
               <span className="checkout-count">{selectedProductIds.size} {t('results.itemsSelected') || 'Items Selected'}</span>
             </div>
             <button onClick={handleCheckout} className="checkout-button">
               <ShoppingCart size={18} />
               <span>{t('results.buySelected') || 'Buy Selected Products'}</span>
             </button>
           </div>
         </div>
      )}

      {/* Suppliers Information */}
      <div className="product-section">
        <div className="section-header-centered">
          <h3 className="section-title">{t('results.ourTrustedSuppliers')}</h3>
        </div>

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

      {/* Partner Carousel */}
      <PartnerCarousel />

      <style>{`
        .product-recommendations-container {
          margin-top: 24px;
        }

        .ai-reasoning-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          background: var(--color-primary-light, #E8F5E9);
          border-radius: 12px;
          margin-bottom: 20px;
          border-left: 3px solid var(--color-primary, #00B14F);
        }
        
        .ai-reasoning-banner svg {
          flex-shrink: 0;
          color: var(--color-primary-dark, #008C3E);
          margin-top: 2px;
        }
        
        .ai-reasoning-banner span {
          font-size: 0.85rem;
          color: var(--color-primary-dark, #008C3E);
          line-height: 1.5;
          font-weight: 500;
        }

        .product-section {
          background: var(--color-primary-lighter, #F1F8F1);
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
          margin-bottom: 20px; /* Increased from 4px for breathing space */
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
          margin: 0 0 4px 0;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.7em; /* Consistent height for alignment */
        }

        .product-price {
          font-size: 0.95rem;
          color: var(--color-primary-dark);
          font-weight: 700;
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
        
        .supplier-contact {
            margin-top: 8px;
            margin-bottom: 20px;
        }

        .supplier-contact p {
            font-size: 0.85rem;
            color: #4B5563;
            margin: 4px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* New Styles for Dynamic Checkout */
        
        .spinner {
           animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            100% { transform: rotate(360deg); }
        }
        
        .product-image-container {
            position: relative;
            height: 150px;
            width: 100%;
            background: #F9FAFB;
        }
        
        .product-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .product-card-wrapper {
            cursor: pointer;
            border: 2px solid transparent;
        }
        
        .product-card-wrapper.selected {
            border-color: var(--color-primary);
            box-shadow: 0 4px 12px rgba(0, 177, 79, 0.15);
            background-color: var(--color-primary-light);
        }
        
        .checkbox-container {
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 10;
        }
        
        .custom-checkbox {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: white;
            border: 2px solid #D1D5DB;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .custom-checkbox.checked {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: white;
        }
        
        .custom-checkbox svg {
            width: 14px;
            height: 14px;
        }
        
        .product-description * {
            margin: 0;
            font-size: 0.75rem;
        }
        
        .product-actions {
            margin-top: auto;
            padding-top: 8px;
        }
        
        .add-to-cart-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            padding: 8px 0;
            background: white;
            color: var(--color-primary);
            border: 1.5px solid var(--color-primary);
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s;
            cursor: pointer;
        }
        
        .add-to-cart-button:hover {
            background: var(--color-primary);
            color: white;
            box-shadow: 0 2px 8px rgba(0, 177, 79, 0.2);
        }
        
        .checkout-bar-container {
            position: sticky;
            bottom: 20px;
            z-index: 50;
            margin: 24px 0;
            display: flex;
            justify-content: center;
        }
        
        .checkout-bar {
            background: white;
            border-radius: 100px;
            padding: 8px 8px 8px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
            max-width: 400px;
            width: 100%;
        }
        
        .checkout-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .checkout-count {
            font-weight: 700;
            color: #1F2937;
            font-size: 0.95rem;
        }
        
        .checkout-button {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--color-primary);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 100px;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .checkout-button:hover {
            background: var(--color-primary-dark);
            transform: scale(1.02);
        }
        
        .checkout-button:active {
            transform: scale(0.98);
        }

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
