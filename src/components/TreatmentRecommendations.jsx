import { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { Zap, Pill, Shield } from 'lucide-react';

const TreatmentRecommendations = ({ result }) => {
  const { t } = useLanguage();
  const [expandedSections, setExpandedSections] = useState({
    immediate: true,
    treatments: false,
    prevention: false
  });

  if (!result) return null;

  const normalizeList = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      return value
        .split(/\r?\n|•/g)
        .map(v => v.trim())
        .filter(Boolean);
    }
    return [];
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sections = [
    {
      key: 'immediate',
      title: t('results.immediateActions'),
      icon: <Zap size={20} />,
      data: normalizeList(result.immediateActions),
      listType: 'ol'
    },
    {
      key: 'treatments',
      title: t('results.treatments'),
      icon: <Pill size={20} />,
      data: normalizeList(result.treatments),
      listType: 'ul'
    },
    {
      key: 'prevention',
      title: t('results.prevention'),
      icon: <Shield size={20} />,
      data: normalizeList(result.prevention),
      listType: 'ul'
    }
  ];

  return (
    <div className="treatment-recommendations">
      {/* Section Header */}
      <div className="section-header-centered">
        <h3 className="section-title">{t('results.treatment')} & {t('results.prevention')}</h3>
      </div>

      {/* Sections */}
      {sections.map(section => (
        section.data && section.data.length > 0 && (
          <div key={section.key} className="treatment-section">
            <button
              className="section-toggle"
              onClick={() => toggleSection(section.key)}
              aria-expanded={expandedSections[section.key]}
            >
              <div className="toggle-left">
                <div className="section-icon">{section.icon}</div>
                <h4 className="section-subtitle">{section.title}</h4>
              </div>
              <svg
                className={`chevron ${expandedSections[section.key] ? 'expanded' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {expandedSections[section.key] && (
              <div className="section-content">
                {section.listType === 'ol' ? (
                  <ol className="action-list">
                    {section.data.map((item, index) => (
                      <li key={index} className="list-item">{item}</li>
                    ))}
                  </ol>
                ) : (
                  <ul className="action-list">
                    {section.data.map((item, index) => (
                      <li key={index} className="list-item">{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      ))}

      {/* Additional Notes */}
      {result.additionalNotes && (
        <div className="additional-notes">
          <p className="notes-text">
            <strong>{t('common.note')}:</strong> {result.additionalNotes}
          </p>
        </div>
      )}

    </div>
  );
};

export default TreatmentRecommendations;
