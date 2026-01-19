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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatAction = (text) => {
    if (typeof text !== 'string') return text;
    const colonIndex = text.indexOf(':');
    if (colonIndex > 0 && colonIndex < 50) {
      const title = text.substring(0, colonIndex);
      const content = text.substring(colonIndex + 1);

      // Convert ALL CAPS title to Title Case and bold it
      if (title === title.toUpperCase() && title !== title.toLowerCase()) {
        const titleCase = title
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return (
          <>
            <strong>{titleCase}:</strong>{content}
          </>
        );
      }

      return (
        <>
          <strong>{title}:</strong>{content}
        </>
      );
    }
    return text;
  };

  const sections = [
    {
      key: 'immediate',
      title: t('results.immediateActions'),
      icon: <Zap size={20} />,
      data: result.immediateActions,
      listType: 'ol'
    },
    {
      key: 'treatments',
      title: t('results.treatments'),
      icon: <Pill size={20} />,
      data: result.treatments,
      listType: 'ul'
    },
    {
      key: 'prevention',
      title: t('results.prevention'),
      icon: <Shield size={20} />,
      data: result.prevention,
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
                      <li key={index} className="list-item">{formatAction(item)}</li>
                    ))}
                  </ol>
                ) : (
                  <ul className="action-list">
                    {section.data.map((item, index) => (
                      <li key={index} className="list-item">{formatAction(item)}</li>
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

      <style>{`
        .treatment-recommendations {
          background: #FAFAFA;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .section-header-centered {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 1.25rem;
          color: #1F2937;
          margin: 0;
          text-align: center;
          font-weight: 700;
        }

        .treatment-section {
          background: white;
          border-radius: 12px;
          margin-bottom: 12px;
          overflow: hidden;
          border: 1px solid #E5E7EB;
        }

        .section-toggle {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: white;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .section-toggle:hover {
          background: #F9FAFB;
        }

        .toggle-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F3F4F6;
          color: var(--color-primary);
          flex-shrink: 0;
        }

        .section-subtitle {
          font-size: 1rem;
          font-weight: 600;
          color: #1F2937;
          margin: 0;
          text-align: left;
        }

        .chevron {
          color: #9CA3AF;
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .chevron.expanded {
          transform: rotate(180deg);
        }

        .section-content {
          padding: 0 16px 16px 16px;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 1000px;
          }
        }

        .action-list {
          margin: 0 0 0 20px;
          padding: 0;
          color: #4B5563;
          line-height: 1.6;
          font-size: 0.9rem;
        }

        .list-item {
          margin-bottom: 8px;
        }

        .list-item:last-child {
          margin-bottom: 0;
        }

        .additional-notes {
          margin-top: 12px;
          padding: 12px 16px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
        }

        .notes-text {
          color: #6B7280;
          margin: 0;
          line-height: 1.5;
          font-size: 0.85rem;
        }

        @media (max-width: 768px) {
          .treatment-recommendations {
            padding: 16px;
          }

          .section-title {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TreatmentRecommendations;
