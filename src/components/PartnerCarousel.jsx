import React from 'react';
import { useLanguage } from '../i18n/i18n.jsx';

const PartnerCarousel = () => {
  const { t } = useLanguage();

  // Logos as configured in public/assets/partners
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

  // We duplicate the list to create a seamless infinite scroll effect
  const displayPartners = [...partners, ...partners];

  return (
    <div className="partner-carousel-section">
      <div className="section-header-centered">
        <h3 className="section-title">{t('results.ourPartners') || "Our Global Partners"}</h3>
      </div>

      <div className="carousel-container">
        <div className="carousel-track">
          {displayPartners.map((partner, index) => (
            <div key={`${partner.id}-${index}`} className="partner-logo-card">
              <div className="logo-wrapper">
                <img
                  src={partner.src}
                  alt={partner.alt}
                  className="partner-logo"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .partner-carousel-section {
          margin-top: 32px;
          margin-bottom: 24px;
          overflow: hidden;
        }

        .carousel-container {
          position: relative;
          width: 100%;
          overflow: hidden;
          padding: 10px 0;
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }

        .carousel-track {
          display: flex;
          gap: 32px;
          width: max-content;
          animation: scroll 45s linear infinite; /* Increased duration slightly for 11 items */
        }
        
        /* Pause on hover for better UX */
        .carousel-track:hover {
          animation-play-state: paused;
        }

        .partner-logo-card {
          width: 180px; /* Wider for better aspect ratio */
          height: 100px; /* Taller */
          background: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border: 1px solid #F3F4F6;
          flex-shrink: 0;
          transition: transform 0.2s;
          overflow: hidden;
        }
        
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-180px * 11 - 32px * 11));
          }
        }
        
        .logo-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px; /* Consistent internal padding */
        }

        .partner-logo {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          transition: transform 0.2s;
        }

        /* Specific Tweak: Major boost for Bayer */
        img[alt="Bayer"] {
            transform: scale(1.4); 
        }

        @media (min-width: 768px) {
            .partner-logo-card {
                width: 240px; /* Significant desktop size increase */
                height: 140px; 
            }
            
            .logo-wrapper {
                padding: 16px;
            }
            
            @keyframes scroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(calc(-240px * 11 - 32px * 11));
              }
            }
        }
      `}</style>
    </div>
  );
};

export default React.memo(PartnerCarousel);
