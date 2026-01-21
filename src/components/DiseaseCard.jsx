import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { Microscope, Search, Pill, Shield } from 'lucide-react';

const DiseaseCard = ({ disease }) => {
  const { t, language } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  // Lock scroll when modal is open (Mobile only)
  useEffect(() => {
    // Only lock scroll if showModal is true AND viewport is mobile/tablet (< 1024px)
    if (showModal && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  // Helper to get localized content if available, otherwise fallback to string
  const getLocalized = (field) => {
    if (typeof field === 'object' && field !== null) {
      return field[language] || field['en'] || '';
    }
    return field;
  };

  // Helper to get localized list
  const getLocalizedList = (list) => {
    if (!list) return [];
    // Check if the list itself is an object with language keys (not expected for current structure but good safety)
    if (!Array.isArray(list) && typeof list === 'object') {
      return list[language] || list['en'] || [];
    }
    // If it's an array, map each item
    return list.map(item => getLocalized(item));
  };

  const name = getLocalized(disease.name);
  const symptoms = getLocalized(disease.symptoms);
  const category = getLocalized(disease.category);
  // Translate category label if it matches a key
  const translatedCategory = t(`encyclopedia.${category.toLowerCase().replace(/ /g, '')}`) !== `encyclopedia.${category.toLowerCase().replace(/ /g, '')}`
    ? t(`encyclopedia.${category.toLowerCase().replace(/ /g, '')}`)
    : category;
  const pathogen = getLocalized(disease.pathogen);

  return (
    <div className={`disease-card card ${showModal ? 'is-expanded' : ''}`}>
      <div className="card-header">
        <h3 className="disease-name">{name}</h3>
        <span className="disease-category">{translatedCategory}</span>
      </div>

      <p className="disease-symptoms">{symptoms}</p>

      {/* Desktop Accordion Content */}
      <div className="desktop-accordion-content">
        {pathogen && (
          <div className="info-section">
            <div className="section-title-wrapper">
              <div className="section-icon pathogen-icon"><Microscope size={18} strokeWidth={2.5} /></div>
              <h4 className="section-title">{t('encyclopedia.pathogen')}</h4>
            </div>
            <p className="section-text">{pathogen}</p>
          </div>
        )}

        <div className="info-section">
          <div className="section-title-wrapper">
            <div className="section-icon causes-icon"><Search size={18} strokeWidth={2.5} /></div>
            <h4 className="section-title">{t('encyclopedia.causes')}</h4>
          </div>
          <p className="section-text">{getLocalized(disease.causes)}</p>
        </div>

        <div className="info-section">
          <div className="section-title-wrapper">
            <div className="section-icon treatment-icon"><Pill size={18} strokeWidth={2.5} /></div>
            <h4 className="section-title">{t('encyclopedia.treatment')}</h4>
          </div>
          <ul className="info-list">
            {getLocalizedList(disease.treatment).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="info-section">
          <div className="section-title-wrapper">
            <div className="section-icon prevention-icon"><Shield size={18} strokeWidth={2.5} /></div>
            <h4 className="section-title">{t('encyclopedia.prevention')}</h4>
          </div>
          <ul className="info-list">
            {getLocalizedList(disease.prevention).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <button
        className="expand-btn btn btn-secondary"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(!showModal);
        }}
      >
        {showModal ? t('encyclopedia.close') : t('encyclopedia.showMore')}
      </button>

      {showModal && createPortal(
        <div className="mobile-modal-only">
          <div
            className="modal-overlay"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(false);
            }}
          >
            <div
              className="modal-content fade-in"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModal(false);
                }}
                aria-label={t('encyclopedia.close')}
              >×</button>

              <div className="modal-header">
                <h3 className="modal-title">{name}</h3>
                <span className="disease-category">{translatedCategory}</span>
              </div>

              <div className="modal-scroll">
                {pathogen && (
                  <div className="info-section">
                    <div className="section-title-wrapper">
                      <div className="section-icon pathogen-icon"><Microscope size={18} strokeWidth={2.5} /></div>
                      <h4 className="section-title">{t('encyclopedia.pathogen')}</h4>
                    </div>
                    <p className="section-text">{pathogen}</p>
                  </div>
                )}
                <div className="info-section">
                  <div className="section-title-wrapper">
                    <div className="section-icon causes-icon"><Search size={18} strokeWidth={2.5} /></div>
                    <h4 className="section-title">{t('encyclopedia.causes')}</h4>
                  </div>
                  <p className="section-text">{getLocalized(disease.causes)}</p>
                </div>

                <div className="info-section">
                  <div className="section-title-wrapper">
                    <div className="section-icon treatment-icon"><Pill size={18} strokeWidth={2.5} /></div>
                    <h4 className="section-title">{t('encyclopedia.treatment')}</h4>
                  </div>
                  <ul className="info-list">
                    {getLocalizedList(disease.treatment).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="info-section">
                  <div className="section-title-wrapper">
                    <div className="section-icon prevention-icon"><Shield size={18} strokeWidth={2.5} /></div>
                    <h4 className="section-title">{t('encyclopedia.prevention')}</h4>
                  </div>
                  <ul className="info-list">
                    {getLocalizedList(disease.prevention).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .disease-card {
          margin-bottom: var(--space-md);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          height: fit-content;
          display: flex;
          flex-direction: column;
        }

        .desktop-accordion-content {
          display: none;
          padding-top: var(--space-lg);
          border-top: 1px solid var(--color-border-light);
          margin-top: var(--space-md);
          overflow: hidden;
          opacity: 0;
          max-height: 0;
          transition: all 0.3s ease;
        }

        @media (min-width: 1024px) {
          .disease-card.is-expanded .desktop-accordion-content {
            display: block;
            opacity: 1;
            max-height: 2000px;
          }
          
          .mobile-modal-only {
            display: none;
          }
        }

        @media (max-width: 1023px) {
          .desktop-accordion-content {
            display: none !important;
          }
        }

        .disease-name {
          font-size: var(--font-size-lg); /* Reduced from xl */
          color: var(--color-primary-dark);
          margin: 0;
          flex: 1;
        }

        .disease-category {
          font-size: var(--font-size-xs); /* Reduced from sm */
          color: var(--color-primary);
          background: rgba(74, 124, 44, 0.1);
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-weight: 500;
        }

        .disease-symptoms {
          font-size: var(--font-size-sm); /* Explicitly smaller */
          color: var(--color-text-secondary);
          margin-bottom: var(--space-md);
          line-height: 1.5; /* Slightly tighter line height */
        }

        .expand-btn {
          width: 100%;
        }

        /* Modal Styles - Global Scope via Portal */
        .mobile-modal-only {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99999; /* Ensure it's above everything */
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-md);
          animation: fadeIn 0.2s ease-out;
          pointer-events: auto;
          backdrop-filter: blur(2px);
        }

        .modal-content {
          background: white;
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 500px;
          max-height: 85vh; /* Safe max height */
          position: relative;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 100000;
          overflow: hidden;
          margin: auto;
        }

        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(0, 0, 0, 0.05);
          border: none;
          font-size: 28px;
          color: var(--color-text-secondary);
          cursor: pointer;
          z-index: 10;
          padding: 8px;
          line-height: 1;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .close-btn:hover {
          background: rgba(0, 0, 0, 0.1);
          color: var(--color-text-primary);
        }
        
        .close-btn:active {
          transform: scale(0.95);
        }

        .modal-header {
          padding: var(--space-lg) var(--space-2xl) var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--color-border-light);
        }

        .modal-title {
          font-size: var(--font-size-2xl);
          color: var(--color-primary-dark);
          margin-bottom: var(--space-xs);
          padding-right: 20px;
        }

        .modal-scroll {
          padding: var(--space-lg);
          padding-bottom: var(--space-2xl);
          overflow-y: auto;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }

        /* Info Sections */
        .info-section {
          margin-bottom: var(--space-lg);
        }

        .info-section:last-child {
          margin-bottom: 0;
        }

        .section-title-wrapper {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          margin-bottom: var(--space-sm);
        }

        .section-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--color-bg-secondary);
          color: var(--color-primary);
        }

        .section-title {
          font-size: var(--font-size-lg);
          color: var(--color-primary-dark);
          margin: 0;
          text-align: left;
          font-weight: 600;
        }

        .section-text {
          color: var(--color-text-secondary);
          line-height: 1.6;
          text-align: left;
          margin: 0;
        }

        .info-list {
          margin: 0;
          padding-left: var(--space-lg);
          color: var(--color-text-secondary);
          line-height: 1.8;
          text-align: left;
        }

        .info-list li {
          margin-bottom: var(--space-xs);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalSlideIn {
          from { 
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Desktop improvements */
        @media (min-width: 1024px) {
          .modal-content {
            max-width: 800px;
            margin: var(--space-3xl) auto;
          }

          .modal-body {
            padding: var(--space-2xl);
          }

          .section-title {
            font-size: var(--font-size-xl);
          }

          .info-list {
            padding-left: var(--space-xl);
          }

          /* Force hide mobile modal on desktop even if rendered */
          .mobile-modal-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(DiseaseCard);
