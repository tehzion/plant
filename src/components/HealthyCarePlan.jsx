import { useLanguage } from '../i18n/i18n.jsx';
import { Calendar, CalendarDays, CalendarRange, Sparkles } from 'lucide-react';

const HealthyCarePlan = ({ carePlan, plantType }) => {
  const { t } = useLanguage();
  // if (!carePlan) return null; // Logic moved to fallback below

  const formatCareItem = (text) => {
    if (typeof text !== 'string') return text;
    const colonIndex = text.indexOf(':');
    if (colonIndex > 0 && colonIndex < 50) {
      const title = text.substring(0, colonIndex);
      const content = text.substring(colonIndex + 1);

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

  // Default plan if API didn't return one or for legacy scans
  const defaultPlan = {
    dailyCare: [t('care.defaultDaily') || "Check soil moisture daily", t('care.defaultSun') || "Ensure adequate sunlight"],
    weeklyCare: [t('care.defaultWeekly') || "Inspect for pests", t('care.defaultPrunable') || "Remove dead leaves"],
    monthlyCare: [t('care.defaultMonthly') || "Apply balanced fertilizer", t('care.defaultSoil') || "Check soil drainage"],
    bestPractices: [t('care.defaultPractice') || "Keep garden clean", t('care.defaultRotate') || "Rotate crops if possible"]
  };

  const activePlan = carePlan || defaultPlan;

  const careSections = [
    {
      key: 'dailyCare',
      title: t('results.dailyCare'),
      icon: <Calendar size={18} />,
      data: activePlan.dailyCare || defaultPlan.dailyCare
    },
    {
      key: 'weeklyCare',
      title: t('results.weeklyCare'),
      icon: <CalendarDays size={18} />,
      data: activePlan.weeklyCare || defaultPlan.weeklyCare
    },
    {
      key: 'monthlyCare',
      title: t('results.monthlyCare'),
      icon: <CalendarRange size={18} />,
      data: activePlan.monthlyCare || defaultPlan.monthlyCare
    },
    {
      key: 'bestPractices',
      title: t('results.bestPractices'),
      icon: <Sparkles size={18} />,
      data: activePlan.bestPractices || defaultPlan.bestPractices
    }
  ];

  return (
    <div className="healthy-care-plan">
      {/* Section Header */}
      <div className="section-header-centered">
        <h3 className="section-title">{t('results.healthyPlantTitle')}</h3>
      </div>
      <p className="section-subtitle">
        {t('results.healthyPlantSubtitle').replace('{plantType}', plantType)}
      </p>

      {/* Care Sections */}
      {careSections.map(section => (
        section.data && section.data.length > 0 && (
          <div key={section.key} className="care-section">
            <div className="subsection-header">
              {section.icon}
              <h4 className="subsection-title">{section.title}</h4>
            </div>
            <ul className="care-list">
              {section.data.map((item, index) => (
                <li key={index} className="care-item">{formatCareItem(item)}</li>
              ))}
            </ul>
          </div>
        )
      ))}

      <style>{`
        .healthy-care-plan {
          background: #FAFAFA;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .section-header-centered {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 8px;
        }

        .section-title {
          font-size: 1.25rem;
          color: #1F2937;
          margin: 0;
          text-align: left;
          font-weight: 700;
        }

        .section-subtitle {
          text-align: left;
          color: #6B7280;
          margin-bottom: 16px;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .care-section {
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          border: 1px solid #E5E7EB;
        }

        .subsection-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: var(--color-primary);
        }

        .subsection-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1F2937;
          margin: 0;
        }

        .care-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .care-item {
          padding: 10px 12px;
          margin-bottom: 8px;
          background: #F9FAFB;
          border-left: 3px solid var(--color-primary);
          border-radius: 6px;
          color: #4B5563;
          line-height: 1.6;
          font-size: 0.9rem;
        }

        .care-item:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 768px) {
          .healthy-care-plan {
            padding: 16px;
          }

          .section-title {
            font-size: 1.125rem;
          }

          .care-section {
            padding: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default HealthyCarePlan;
