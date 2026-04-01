import React from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import './PartnerCarousel.css';

const PartnerCarousel = () => {
  const { t } = useLanguage();

  const partners = [
    { id: 1, src: '/assets/partners/partner-1.png', alt: 'BASF' },
    { id: 2, src: '/assets/partners/partner-2.png', alt: 'Bayer' },
    { id: 3, src: '/assets/partners/partner-3.png', alt: 'Corteva' },
    { id: 4, src: '/assets/partners/partner-4.png', alt: 'Adama' },
    { id: 5, src: '/assets/partners/partner-5.png', alt: 'Dow' },
    { id: 6, src: '/assets/partners/partner-6.png', alt: 'Nutrichem' },
    { id: 7, src: '/assets/partners/partner-7.png', alt: 'Nufarm' },
    { id: 8, src: '/assets/partners/partner-8.png', alt: 'Syngenta' },
    { id: 9, src: '/assets/partners/partner-9.png', alt: 'Sumitomo Chemical' },
    { id: 10, src: '/assets/partners/partner-10.png', alt: 'FMC' },
    { id: 11, src: '/assets/partners/partner-11.png', alt: 'UPL' },
  ];

  const displayPartners = [...partners, ...partners];

  return (
    <div className="partner-carousel">
      <div className="section-header-centered">
        <h3 className="section-title">{t('results.ourPartners') || 'Our Global Partners'}</h3>
      </div>

      <div className="partner-carousel__viewport">
        <div className="partner-carousel__track">
          {displayPartners.map((partner, index) => (
            <div key={`${partner.id}-${index}`} className="partner-carousel__card">
              <div className="partner-carousel__logo-wrap">
                <img
                  src={partner.src}
                  alt={partner.alt}
                  className="partner-carousel__logo"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PartnerCarousel);
