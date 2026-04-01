import { useEffect, useState } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { useAuth } from '../../context/AuthContext';
import OrderHistory from '../OrderHistory';

const SHOP_CATALOG_URL = 'https://www.mojosense.app/kanb/products/';

const ProductsTab = ({ label: labelProp }) => {
    const { t, label: i18nLabel } = useLanguage();
    const { guestId } = useAuth();
    const label = (key, fallback) => {
        if (typeof labelProp === 'function') return labelProp(key, fallback);
        if (typeof i18nLabel === 'function') return i18nLabel(key, fallback);
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
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
                        {label('nav.shop', 'Shop')}
                    </h3>
                    <p className="udp-section-subtitle">
                        {label('profile.productsCatalogSubtitle', 'Browse our catalog for products without leaving your dashboard.')}
                    </p>
                </div>
            </div>

            <div className="udp-products-frame-shell">
                <div className="udp-products-frame-header">
                    <span className="udp-products-frame-pill">
                        <ShoppingBag size={15} />
                        {label('nav.shop', 'Shop')}
                    </span>
                </div>

                <div className="udp-products-frame-wrap">
                    {!isFrameLoaded && (
                        <div className="udp-products-frame-loading">
                            <ShoppingBag size={18} />
                            <span>{label('profile.loadingCatalog', 'Loading live catalog...')}</span>
                        </div>
                    )}

                    <iframe
                        title={label('nav.shop', 'Shop')}
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

                {showFallbackHint && !isFrameLoaded && (
                    <div className="udp-products-fallback is-active">
                        <p className="udp-products-fallback-text">
                            {label('profile.catalogEmbedFallback', 'If the catalog does not load inside the dashboard, open the full catalog in a new tab.')}
                        </p>
                        <a
                            href={SHOP_CATALOG_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="udp-btn udp-btn-secondary"
                        >
                            <ExternalLink size={16} />
                            <span>{label('profile.openFullCatalog', 'Open Full Catalog')}</span>
                        </a>
                    </div>
                )}
            </div>

            <div className="udp-order-history-section">
                <OrderHistory guestId={guestId} />
            </div>
        </section>
    );
};

export default ProductsTab;
