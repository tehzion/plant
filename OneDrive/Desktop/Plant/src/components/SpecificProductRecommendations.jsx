import { Map, TreeDeciduous, Home, MapPin, DollarSign, FileText, ShoppingCart, Lightbulb, ShoppingBag } from 'lucide-react';

const SpecificProductRecommendations = ({ products, farmScale }) => {
  if (!products || products.length === 0) return null;

  const getScaleBadge = () => {
    switch (farmScale) {
      case 'hectare':
        return { icon: <Map size={16} />, text: 'Bulk quantities recommended' };
      case 'tree':
        return { icon: <TreeDeciduous size={16} />, text: 'Per tree application' };
      case 'personal':
        return { icon: <Home size={16} />, text: 'Small pack sizes' };
      default:
        return null;
    }
  };

  const scaleBadge = getScaleBadge();

  return (
    <div className="specific-products">
      <div className="products-title-wrapper">
        <div className="title-icon">
          <ShoppingCart size={24} strokeWidth={2.5} />
        </div>
        <h3 className="products-title">Recommended Products for Your Issue</h3>
      </div>
      {scaleBadge && (
        <div className="scale-info">
          {scaleBadge.icon}
          <span>{scaleBadge.text}</span>
        </div>
      )}
      <p className="products-subtitle">
        Based on the detected issue, here are specific products that can help:
      </p>

      <div className="products-grid">
        {products.map((product, index) => (
          <div key={index} className="product-card">
            <div className="product-header">
              <span className="product-category">{product.category}</span>
              <span className="product-supplier">
                <MapPin size={14} /> {product.supplier}
              </span>
            </div>

            <h4 className="product-name">{product.productName}</h4>

            <div className="product-details">
              <div className="detail-row">
                <span className="detail-label">
                  <DollarSign size={16} /> Price:
                </span>
                <span className="detail-value">{product.price}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <FileText size={16} /> Usage:
                </span>
                <span className="detail-value">{product.usage}</span>
              </div>
            </div>

            <div className="why-recommended">
              <strong>Why this product:</strong> {product.whyRecommended}
            </div>

            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="buy-button"
            >
              <ShoppingBag size={18} />
              View Product & Buy
            </a>
          </div>
        ))}
      </div>

      <div className="purchase-note">
        <Lightbulb size={16} />
        <div>
          <strong>Note:</strong> Click "View Product & Buy" to see full details and purchase options.
          Contact supplier directly for bulk orders or custom quantities.
        </div>
      </div>

      <style>{`
        .specific-products {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(33, 150, 243, 0.02) 100%);
          border: 2px solid rgba(33, 150, 243, 0.3);
          border-radius: var(--radius-xl);
          padding: var(--space-xl);
          margin-top: var(--space-xl);
        }

        .products-title-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: var(--space-sm);
        }

        .title-icon {
          width: 40px;
          height: 40px;
          background: var(--color-bg-secondary);
          color: var(--color-primary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .products-title {
          font-size: var(--font-size-2xl);
          color: var(--color-primary-dark);
          margin: 0;
        }

        .scale-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-align: center;
          font-weight: 600;
          color: var(--color-primary);
          margin-bottom: var(--space-sm);
        }

        .products-subtitle {
          text-align: center;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-xl);
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-lg);
        }

        .product-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          border: 2px solid var(--color-border);
          transition: all var(--transition-base);
        }

        .product-card:hover {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-lg);
          transform: translateY(-4px);
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
        }

        .product-category {
          background: var(--color-primary);
          color: white;
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }

        .product-supplier {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .product-name {
          font-size: var(--font-size-xl);
          font-weight: 600;
          color: var(--color-primary-dark);
          margin-bottom: var(--space-md);
        }

        .product-details {
          margin-bottom: var(--space-md);
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: var(--space-sm) 0;
          border-bottom: 1px solid var(--color-border-light);
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
        }

        .detail-value {
          font-weight: 600;
          color: var(--color-text-primary);
          font-size: var(--font-size-sm);
        }

        .why-recommended {
          background: rgba(95, 168, 62, 0.1);
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-md);
          border-left: 3px solid var(--color-primary);
          margin-bottom: var(--space-md);
          font-size: var(--font-size-sm);
          line-height: 1.5;
        }

        .buy-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: var(--space-md);
          background: var(--gradient-primary);
          color: white;
          text-align: center;
          border-radius: var(--radius-md);
          text-decoration: none;
          font-weight: 600;
          transition: all var(--transition-base);
        }

        .buy-button:hover {
          background: var(--color-primary-dark);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .purchase-note {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(255, 193, 7, 0.1);
          border: 1px dashed rgba(255, 193, 7, 0.5);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        @media (max-width: 768px) {
          .specific-products {
            padding: var(--space-lg);
          }

          .products-grid {
            grid-template-columns: 1fr;
          }

          .products-title-wrapper {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default SpecificProductRecommendations;
