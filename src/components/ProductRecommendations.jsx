import React, { useEffect, useMemo, useState } from 'react';
import { suppliers, getProductRecommendations } from '../data/productRecommendations.js';
import { useLanguage } from '../i18n/i18n.jsx';
import PartnerCarousel from './PartnerCarousel';
import './ProductRecommendations.css';
import { Map, TreeDeciduous, Home, MapPin, Pill, Leaf, Building2, Phone, ShoppingCart, Loader, Info, PackageX, Search } from 'lucide-react';
import { showToast } from '../utils/toast';
import {
  buildProductDiagnosisPayload,
  createEmptyProductRecommendations,
  createProductRecommendationsKey,
  fetchLiveProductRecommendations,
} from '../utils/liveProductRecommendations.js';

const sanitizeProductDescription = (value) => {
  if (!value) return '';

  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(String(value), 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());
    return (doc.body.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isWooProductId = (value) => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  return /^\d+$/.test(value.trim());
};

const ProductRecommendations = ({ plantType, disease, farmScale, scanResult, onRecommendationsLoaded }) => {
  const { t } = useLanguage();
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [fallbackMeta, setFallbackMeta] = useState(null);
  const [storeUrl, setStoreUrl] = useState('');
  const [requestAttempt, setRequestAttempt] = useState(0);

  const diagnosis = useMemo(
    () => buildProductDiagnosisPayload({ plantType, disease, scanResult }),
    [plantType, disease, scanResult?.healthStatus, scanResult?.pathogenType, scanResult?.symptoms, scanResult?.treatments, scanResult?.productSearchTags],
  );

  const recommendationKey = useMemo(
    () => createProductRecommendationsKey(diagnosis),
    [diagnosis],
  );

  useEffect(() => {
    let isCancelled = false;

    const fetchProducts = async () => {
      if (!diagnosis.plantType && diagnosis.disease === 'None') {
        const emptyProducts = createEmptyProductRecommendations();
        setProducts(emptyProducts);
        setFallbackMeta(null);
        setSelectedProductIds(new Set());
        setReasoning('');
        setStoreUrl('');
        setError(null);
        setErrorCode('');
        onRecommendationsLoaded?.(emptyProducts);
        return;
      }

      setLoading(true);
      setError(null);
      setErrorCode('');
      setSelectedProductIds(new Set());
      try {
        const productData = await fetchLiveProductRecommendations({
          plantType: diagnosis.plantType,
          disease: diagnosis.disease,
          scanResult: diagnosis,
        });
        if (isCancelled) return;

        setProducts(productData);
        setFallbackMeta(productData.fallbackMeta || null);
        setReasoning(productData.reasoning || '');
        setStoreUrl(productData.storeUrl || '');
        onRecommendationsLoaded?.(productData);

      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to load recommended products:', err);
        setError(err?.message || t('results.productsError') || 'Could not load specialized products at this time.');
        setErrorCode(err?.code || '');
        onRecommendationsLoaded?.(null);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    return () => {
      isCancelled = true;
    };
  }, [onRecommendationsLoaded, recommendationKey, requestAttempt]);

  const toggleProductSelection = (productId) => {
    if (!productId || !isWooProductId(productId) || !storeUrl) return;
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

  const checkoutEligibleIds = useMemo(
    () => Array.from(selectedProductIds).filter((productId) => isWooProductId(productId)),
    [selectedProductIds],
  );

  const handleCheckout = () => {
    if (checkoutEligibleIds.length === 0) return;
    if (!storeUrl) {
      showToast(
        t('results.checkoutUnavailable') || 'Checkout is unavailable right now. Please open an item directly from the store.',
        'warning',
      );
      return;
    }
    
    // WooCommerce Bulk Add-to-Cart format
    // https://your-store.com/cart/?add-to-cart=ID1,ID2&quantity=1,1
    const ids = checkoutEligibleIds.join(',');
    const quantities = Array(checkoutEligibleIds.length).fill('1').join(',');
    
    // Construct checkout URL using dynamically fetched storeUrl
    const checkoutUrl = `${storeUrl}/checkout/?add-to-cart=${ids}&quantity=${quantities}`;
    
    window.open(checkoutUrl, '_blank');
  };

  const canCheckout = checkoutEligibleIds.length > 0 && Boolean(storeUrl);
  const usingCachedProducts = fallbackMeta?.used && fallbackMeta?.source === 'cache';

  const retryProducts = () => {
    setRequestAttempt((value) => value + 1);
  };

  const productRecoveryHint = errorCode === 'NETWORK_UNAVAILABLE'
    ? (t('results.productsNetworkHint') || 'Reconnect to the internet to load the live catalog.')
    : errorCode === 'REQUEST_TIMEOUT'
      ? (t('results.productsTimeoutHint') || 'The catalog is responding slowly. Please try again in a moment.')
      : (t('results.productsUnavailableHint') || 'The live catalog is temporarily unavailable right now.');

  // Use local fallback data only when the live store is available but there are no matching items.
  const processedProducts = useMemo(() => {
    if (!products) return null;
    
    // Check if the server returned any products at all
    const hasAnyLive = (products.diseaseControl?.length || 0) + 
                       (products.fertilizers?.length || 0) + 
                       (products.supplements?.length || 0) + 
                       (products.otherPopular?.length || 0) > 0;
    
    if (!hasAnyLive && products.storeUrl) {
      // Fetch from local hardcoded database as absolute last resort
      const localData = getProductRecommendations(plantType, disease);
      return {
        diseaseControl: [],
        fertilizers: localData.fertilizers || [],
        supplements: localData.supplements || [],
        otherPopular: localData.nutrition || [],
        isLocalFallback: true
      };
    }
    
    return products;
  }, [products, plantType, disease]);

  if (loading) {
    return (
      <div className="product-recommendations-container product-state product-state--loading">
        <Loader className="spinner" size={32} color="var(--color-primary)" />
        <p>{t('results.loadingProducts') || 'Discovering the best local agriculture products...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-recommendations-container">
        <div className="product-section product-state product-state--error">
          <p className="product-state-title">{error}</p>
          <p className="product-state-hint">{productRecoveryHint}</p>
          <div className="product-state-actions">
            <button type="button" className="add-to-cart-button" onClick={retryProducts}>
              <span>{t('common.retry') || 'Try Again'}</span>
            </button>
            <a
              href="https://www.mojosense.app/kanb/products/"
              target="_blank"
              rel="noopener noreferrer"
              className="add-to-cart-button"
            >
              <span>{t('results.openCatalog') || 'Open Catalog'}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!processedProducts) return null;

  const hasNoProducts = !processedProducts.diseaseControl?.length && 
                       !processedProducts.fertilizers?.length && 
                       !processedProducts.supplements?.length && 
                       !processedProducts.otherPopular?.length;

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
    const hasImage = Boolean(product.image);
    const packageSize = product.count || product.packageSize || '';
    const isLocalCatalogItem = typeof product.id === 'string' && product.id.startsWith('local-');
    const canSelectForCheckout = isWooProductId(product.id) && Boolean(storeUrl);

    // Helper to translate if it looks like a key
    const translateIfNeeded = (val) => {
      if (!val) return '';
      return val.startsWith('results.') ? t(val) : val;
    };

    const productName = translateIfNeeded(product.name);
    const productDesc = sanitizeProductDescription(translateIfNeeded(product.description));

    return (
      <div
        key={product.id || index}
        className={`product-card-wrapper ${isSelected ? 'selected' : ''} ${canSelectForCheckout ? '' : 'product-card-wrapper--informational'}`}
        onClick={() => toggleProductSelection(product.id)}
      >
        <div className="product-image-container">
           {hasImage ? (
              <img src={product.image} alt={productName} className="product-image" />
           ) : (
              <div className={`product-image-placeholder ${isFertilizer ? 'product-image-placeholder--fertilizer' : 'product-image-placeholder--treatment'}`}>
                <div className="product-image-placeholder-content">
                  {isFertilizer ? <Leaf size={28} /> : <Pill size={28} />}
                  <span className="product-image-placeholder-label">
                    {isLocalCatalogItem
                      ? (t('results.discoveryCatalog') || 'Discovery Catalog')
                      : (t('results.viewProduct') || 'View Product')}
                  </span>
                </div>
              </div>
           )}
           {packageSize && (
             <div className="product-package-pill">{packageSize}</div>
           )}
           {canSelectForCheckout && (
             <div className="checkbox-container">
               <div className={`custom-checkbox ${isSelected ? 'checked' : ''}`}>
                 {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
               </div>
             </div>
           )}
        </div>

        <div className="product-content">
          <div className="product-info-top">
            <h4 className="product-name" title={productName}>{productName}</h4>
            <p className="product-price">RM {product.price || '0.00'}</p>
          </div>

          <p className="product-description">{productDesc}</p>

          <div className="product-actions">
            {product.cartUrl || product.permalink ? (
              <a
                href={product.cartUrl || product.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="add-to-cart-button"
                onClick={(e) => e.stopPropagation()}
              >
                <ShoppingCart size={14} />
                <span>{product.cartUrl ? (t('results.addToCart') || 'Add to Cart') : (t('results.viewProduct') || 'View Product')}</span>
              </a>
            ) : (
              <button
                type="button"
                className="add-to-cart-button disabled"
                onClick={(e) => {
                  e.stopPropagation();
                  showToast(
                    t('results.checkoutUnavailable') || 'Checkout is unavailable right now. Please open an item directly from the store.',
                    'warning',
                  );
                }}
              >
                <ShoppingCart size={14} />
                <span>{t('results.viewProduct') || 'View Product'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="product-recommendations-container">
      {/* AI Reasoning Explainer */}
      {reasoning && !hasNoProducts && (
        <div className="ai-reasoning-banner">
          <Info size={16} />
          <span>{t('results.whyTheseProducts') || 'Why these products?'} {reasoning}</span>
        </div>
      )}

      {fallbackMeta?.used && (
        <div className={`ai-reasoning-banner ${fallbackMeta.isExploration ? 'exploration-banner' : 'fallback-banner'}`}>
          {fallbackMeta.isExploration ? <Search size={16} /> : <PackageX size={16} />}
          <div className="reasoning-copy">
            <strong>{fallbackMeta.isExploration ? (t('results.explorationTitle') || 'General Store Selection') : (t('results.fallbackTitle') || 'Notice')}</strong>
            <span>{fallbackMeta.reason || (t('results.fallbackProductsDesc') || 'No direct diagnosis-matched products were found. Showing general store suggestions as a fallback.')}</span>
          </div>
          {usingCachedProducts && (
            <button
              type="button"
              className="fallback-refresh-button"
              onClick={retryProducts}
            >
              {t('results.tryLiveCatalogAgain') || 'Try live catalog again'}
            </button>
          )}
        </div>
      )}

      {processedProducts?.isLocalFallback && (
        <div className="ai-reasoning-banner exploration-banner">
          <Info size={16} />
          <div className="reasoning-copy">
            <strong>{t('results.discoveryCatalog') || 'Discovery Catalog'}</strong>
            <span>{t('results.noDirectMatchDisclaimer') || 'We couldn\'t find a direct match for this specific diagnosis in our store, but here are some popular items other farmers are using.'}</span>
          </div>
        </div>
      )}

      {/* Empty State when AI finds no matching products */}
      {hasNoProducts && (
        <div className="product-section product-state product-state--empty">
          <div className="product-state-icon-wrap">
            <div className="product-state-icon">
              <PackageX size={32} color="#9CA3AF" />
            </div>
          </div>
          <h3 className="product-state-title">
            {t('results.noProductsFound') || 'No specific products found'}
          </h3>
          <p className="product-state-hint">
            {t('results.noProductsDesc') || 'We couldn\'t find specific products in our store matching this condition right now. You can still contact our suppliers directly.'}
          </p>
        </div>
      )}

      {/* Disease Control Products */}
      {processedProducts.diseaseControl && processedProducts.diseaseControl.length > 0 && (
        <div className="product-section">
          <div className="section-header-centered">
            <h3 className="section-title">{t('results.diseaseControl')}</h3>
          </div>

          <div className="products-grid">
            {processedProducts.diseaseControl.map((product, index) => renderProductCard(product, index))}
          </div>
        </div>
      )}

      {/* Recommended Fertilizers */}
      {processedProducts.fertilizers && processedProducts.fertilizers.length > 0 && (
        <div className="product-section">
          <div className="section-header-centered">
            <h3 className="section-title">{t('results.recommendedFertilizers')}</h3>
          </div>

          {scaleInfo.label && (
            <div className="scale-badge">
              {scaleInfo.icon} {scaleInfo.label}
            </div>
          )}

          {scaleInfo.note && (
            <p className="section-subtitle">{scaleInfo.note}</p>
          )}

          <div className="products-grid">
            {processedProducts.fertilizers.map((product, index) => renderProductCard(product, index))}
          </div>
        </div>
      )}

      {/* Recommended Supplements */}
      {processedProducts.supplements && processedProducts.supplements.length > 0 && (
        <div className="product-section">
          <div className="section-header-centered">
            <h3 className="section-title">{t('results.recommendedSupplements')}</h3>
          </div>

          <div className="products-grid">
            {processedProducts.supplements.map((product, index) => renderProductCard(product, index))}
          </div>
        </div>
      )}

      {/* Other Popular Products */}
      {processedProducts.otherPopular && processedProducts.otherPopular.length > 0 && (
        <div className="product-section">
          <div className="section-header-centered">
            <h3 className="section-title">
              {fallbackMeta?.used
                ? (t('results.fallbackProductsTitle') || 'Fallback Store Suggestions')
                : t('results.otherPopular')}
            </h3>
          </div>

          {fallbackMeta?.used && (
            <p className="section-subtitle">
              {t('results.fallbackProductsLabel') || 'These are general store items shown because no direct diagnosis match was found.'}
            </p>
          )}

          <div className="products-grid">
            {processedProducts.otherPopular.map((product, index) => renderProductCard(product, index))}
          </div>
        </div>
      )}

      {/* Checkout Section Bar */}
      {checkoutEligibleIds.length > 0 && (
         <div className="checkout-bar-container">
           <div className="checkout-bar">
             <div className="checkout-info">
               <span className="checkout-count">{checkoutEligibleIds.length} {t('results.itemsSelected') || 'Items Selected'}</span>
               {!storeUrl && (
                 <span className="checkout-note">{t('results.checkoutUnavailable') || 'Checkout is unavailable right now. Please open an item directly from the store.'}</span>
               )}
             </div>
             <button onClick={handleCheckout} className="checkout-button" disabled={!canCheckout}>
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
              className="buy-button supplier-buy-button"
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
              className="buy-button supplier-buy-button"
            >
              {t('results.viewProduct')}
            </a>
          </div>
        </div>
      </div>

      {/* Partner Carousel */}
      <PartnerCarousel />
    </div>
  );
};

export default React.memo(ProductRecommendations);
