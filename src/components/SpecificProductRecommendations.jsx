import { Map, TreeDeciduous, Home, MapPin, DollarSign, FileText, ShoppingCart, Lightbulb, ShoppingBag } from 'lucide-react';

const SpecificProductRecommendations = ({ products, farmScale }) => {
  if (!products || products.length === 0) return null;

  const getScaleBadge = () => {
    switch (farmScale) {
      case 'acre':
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

    </div>
  );
};

export default SpecificProductRecommendations;
