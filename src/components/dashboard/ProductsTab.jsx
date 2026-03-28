import { useEffect, useState } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const SHOP_CATALOG_URL = 'https://www.mojosense.app/kanb/products/';

const ProductsTab = () => {
    const { t } = useLanguage();
    const [isFrameLoaded, setIsFrameLoaded] = useState(false);
    const [showFallbackHint, setShowFallbackHint] = useState(false);

    useEffect(() => {
        setIsFrameLoaded(false);
        setShowFallbackHint(false);

        const timer = window.setTimeout(() => {
            setShowFallbackHint(true);
        }, 5000);

        return () => window.clearTimeout(timer);
    }, []);

    return (
        <section className="udp-card udp-products-tab" data-testid="products-tab">
            <div className="udp-tab-actions">
                <div>
                    <h3 className="udp-section-title">
                        {t('profile.tabProducts') || 'Products'}
                    </h3>
                    <p className="udp-section-subtitle">
                        {t('profile.productsCatalogSubtitle') || 'Browse the live MojoSense catalog without leaving your dashboard.'}
                    </p>
                </div>

                <a
                    href={SHOP_CATALOG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="udp-btn udp-btn-primary"
                >
                    <ExternalLink size={16} />
                    <span>{t('profile.openFullCatalog') || 'Open Full Catalog'}</span>
                </a>
            </div>

            <div className="udp-products-frame-shell">
                <div className="udp-products-frame-header">
                    <span className="udp-products-frame-pill">
                        <ShoppingBag size={15} />
                        {t('nav.shop') || 'Shop'}
                    </span>
                    <a
                        href={SHOP_CATALOG_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="udp-products-frame-link"
                    >
                        {SHOP_CATALOG_URL}
                    </a>
                </div>

                <div className="udp-products-frame-wrap">
                    {!isFrameLoaded && (
                        <div className="udp-products-frame-loading">
                            <ShoppingBag size={18} />
                            <span>{t('profile.loadingCatalog') || 'Loading live catalog…'}</span>
                        </div>
                    )}

                    <iframe
                        title={t('profile.tabProducts') || 'Products'}
                        src={SHOP_CATALOG_URL}
                        className="udp-products-frame"
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        onLoad={() => {
                            setIsFrameLoaded(true);
                            setShowFallbackHint(false);
                        }}
                    />
                </div>

                <div className={`udp-products-fallback${showFallbackHint && !isFrameLoaded ? ' is-active' : ''}`}>
                    {showFallbackHint && !isFrameLoaded ? (
                        <p className="udp-products-fallback-text">
                            {t('profile.catalogEmbedFallback') || 'If the catalog does not load inside the dashboard, open the full catalog in a new tab.'}
                        </p>
                    ) : (
                        <p className="udp-products-fallback-text">
                            {t('profile.catalogOpenHint') || 'If the catalog looks blank, open the full catalog in a new tab.'}
                        </p>
                    )}
                    <a
                        href={SHOP_CATALOG_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="udp-btn udp-btn-secondary"
                    >
                        <ExternalLink size={16} />
                        <span>{t('profile.openFullCatalog') || 'Open Full Catalog'}</span>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default ProductsTab;
