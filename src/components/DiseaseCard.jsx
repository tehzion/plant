import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { Microscope, Search, Pill, Shield, X } from 'lucide-react';
import './DiseaseCard.css';

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

  const name = getLocalized(disease.name) || t('common.unknown') || 'Unknown';
  const symptoms = getLocalized(disease.symptoms) || '';
  const category = getLocalized(disease.category) || t('common.unknown') || 'Unknown';
  const categoryKey = typeof category === 'string'
    ? category.toLowerCase().replace(/ /g, '')
    : '';
  // Translate category label if it matches a key
  const translatedCategory = categoryKey && t(`encyclopedia.${categoryKey}`) !== `encyclopedia.${categoryKey}`
    ? t(`encyclopedia.${categoryKey}`)
    : category;
  const pathogen = getLocalized(disease.pathogen);

  return (
    <div className={`disease-card ${showModal ? 'is-expanded' : ''}`}>
      <div className="card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '12px' }}>
          <h3 className="disease-name">{name}</h3>
        </div>
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
              ><X size={20} /></button>

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

    </div>
  );
};

export default React.memo(DiseaseCard);
