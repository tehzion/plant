import { useLanguage } from '../i18n/i18n.jsx';
import {
  AlertTriangle,
  CheckCircle,
  Sprout,
  Calendar,
  Bug,
  AlertCircle,
  Wheat,
  Carrot,
  Apple,
  TreePalm,
  TreeDeciduous,
  Leaf,
  Bean,
  Flame,
  Flower2,
  Info
} from 'lucide-react';

const DiseaseResult = ({ result, image, leafImage }) => {
  const { t } = useLanguage();

  // Map plantType string back to category icon
  const getPlantIcon = (plantType) => {
    if (!plantType) return <Sprout size={32} />;

    const type = plantType.toLowerCase();

    if (type.includes('rice') || type.includes('padi') || type.includes('corn') || type.includes('jagung')) return <Wheat size={32} />;
    if (type.includes('vegetable') || type.includes('sayur')) return <Carrot size={32} />;
    if (type.includes('fruit') || type.includes('buah')) return <Apple size={32} />;
    if (type.includes('palm') || type.includes('sawit') || type.includes('rubber') || type.includes('getah')) return <TreePalm size={32} />;
    if (type.includes('durian')) return <TreeDeciduous size={32} />;
    if (type.includes('banana') || type.includes('pisang')) return <Leaf size={32} />;
    if (type.includes('cocoa') || type.includes('koko')) return <Bean size={32} />;
    if (type.includes('pepper') || type.includes('lada')) return <Flame size={32} />;
    if (type.includes('pineapple') || type.includes('nanas')) return <Sprout size={32} />;
    if (type.includes('weed') || type.includes('rumpai')) return <Flower2 size={32} />;

    return <Sprout size={32} />;
  };

  if (!result) return null;

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'mild':
      case 'low':
      case 'rendah':
        return 'badge-mild';
      case 'moderate':
      case 'sederhana':
        return 'badge-moderate';
      case 'severe':
      case 'high':
      case 'tinggi':
      case 'kritikal':
        return 'badge-severe';
      default:
        return 'badge-unknown';
    }
  };

  const isHealthy = ['healthy', 'sihat'].includes(result.healthStatus?.toLowerCase()) ||
    ['no issues', 'tiada masalah', 'tiada'].some(term => result.disease?.toLowerCase()?.includes(term));

  /* 
     Details section logic moved inline for robustness 
     (preventing empty containers)
  */

  return (
    <div className="disease-result">
      {/* Image Display - Dual Images */}
      {(image || leafImage) && (
        <div className={`result-images-container ${image && leafImage ? 'dual-images' : 'single-image'}`}>
          {image && (
            <div className="image-wrapper">
              <img src={image} alt="Plant overview" className="result-image" />
              <span className="image-label">{t('results.plantPhoto')}</span>
            </div>
          )}
          {leafImage && (
            <div className="image-wrapper">
              <img src={leafImage} alt="Leaf close-up" className="result-image" />
              <span className="image-label">{t('results.leafPhoto')}</span>
            </div>
          )}
        </div>
      )}

      {/* Disease Information Container */}
      <div className="disease-info-container">

        {(() => {
          // Robust handling for system ignoring word limits
          // Robust handling for system ignoring word limits
          let displayTitle = result.disease || t('results.unknownDisease');
          // Fix for Malay title in English mode
          if (displayTitle === 'Tiada Masalah') displayTitle = t('results.noIssues');

          // Don't apply default fallbacks yet - we want to try splitting the title first if no specific notes exist
          let extraDescription = result.additionalNotes || result.analysisSummary || result.analysis_summary || result.description || result.summary || result.justification;

          // Fix for Malay demo text in English mode
          if (extraDescription === 'Mod Demo / Data Simulasi') extraDescription = t('results.demoModeDesc');

          // If title is clearly a sentence, split it to extract the core explanation
          // We do this even if additionalNotes exists, merging the extracted explanation into Idea Utama
          if (typeof displayTitle === 'string' && displayTitle.length > 40) {
            // Priority 1: Split by ", " if followed by explanation keywords (e.g., "pada permukaan, kemungkinan besar...")
            // This is specific to the user's request case
            if (displayTitle.includes(', ')) {
              const commaParts = displayTitle.split(', ');
              // Check if 2nd part starts with explanatory words
              const explanatoryStart = ['kemungkinan', 'likely', 'disebabkan', 'caused', 'berpunca', 'due to'];
              const potentialExplanation = commaParts.slice(1).join(', ').trim();

              if (explanatoryStart.some(keyword => potentialExplanation.toLowerCase().startsWith(keyword))) {
                displayTitle = commaParts[0].trim();
                const extractedExplanation = potentialExplanation.charAt(0).toUpperCase() + potentialExplanation.slice(1);

                // Prepend to existing description (this makes it the primary "Idea Utama")
                extraDescription = extraDescription
                  ? `${extractedExplanation}\n\n${extraDescription}`
                  : extractedExplanation;
              }
            }

            // Priority 2: Split by common explanatory keywords if no comma split occurred
            // Only proceed if length is still long (meaning Priority 1 didn't already shorten it)
            if (displayTitle.length > 40) {
              const splitKeywords = [
                ' akibat ', ' kerana ', ' disebabkan ', ' berpunca ',
                ' due to ', ' caused by ', ' because ', ' results from ',
                ' yang ', ' in ', ' on '
              ];

              let splitIndex = -1;
              let foundKeyword = '';

              for (const kw of splitKeywords) {
                const idx = displayTitle.toLowerCase().indexOf(kw);
                if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
                  splitIndex = idx;
                  foundKeyword = kw;
                }
              }

              if (splitIndex !== -1) {
                // Split at the keyword
                const titlePart = displayTitle.substring(0, splitIndex).trim();
                const descPart = displayTitle.substring(splitIndex).trim();

                // Only apply split if the resulting title is reasonable
                if (titlePart.length > 5) {
                  displayTitle = titlePart;
                  const formattedDesc = descPart.charAt(0).toUpperCase() + descPart.slice(1);
                  extraDescription = extraDescription
                    ? `${formattedDesc}\n\n${extraDescription}`
                    : formattedDesc;
                }
              }
            }
          }

          return (
            <>
              {/* Disease Title Card */}
              <div className="disease-title-card">
                <div className="disease-name-section">
                  <h2 className="disease-name">
                    {typeof displayTitle === 'string' ? displayTitle.split('(')[0]?.trim() : displayTitle}
                  </h2>
                  {displayTitle?.includes('(') && (
                    <p className="scientific-name">
                      {displayTitle.match(/\(([^)]+)\)/)?.[1]}
                    </p>
                  )}

                  {/* Species Identification (PlantNet) */}
                  {result.identification && (
                    <div className="species-id-info" style={{ marginTop: '8px', fontSize: '0.85rem', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                      <Leaf size={14} color="#059669" />
                      <span>

                        <strong>{result.identification.scientificName}</strong>
                        {result.identification.commonNames && result.identification.commonNames.length > 0 && (
                          <span style={{ fontWeight: 'normal', marginLeft: '4px', color: '#4B5563' }}>
                            ({result.identification.commonNames[0]})
                          </span>
                        )}
                        <span style={{ opacity: 0.8, marginLeft: '4px' }}>
                          {result.identification.confidence}%
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Validated nutrient deficiency note */}
                  {result.nutritionalIssues?.hasDeficiency && (
                    <div className="nutrition-referral-note">
                      <Sprout size={14} />
                      <span>{t('results.seeNutritionTab')}</span>
                    </div>
                  )}
                </div>
                {/* Severity badge removed from here - moved to Status Card */}
              </div>

              {/* Idea Utama Card - Primary Justification (Forced Visible) */}
              {/* Idea Utama Card - Primary Justification (Forced Visible) */}
              <div className="idea-utama-card">
                <div className="idea-header-row">
                  <div className="idea-icon-wrapper">
                    <Info size={18} />
                  </div>
                  <span className="idea-header">{t('results.keyIdea')}</span>
                </div>
                <div className="idea-content-wrapper">
                  <p className="idea-content">
                    {extraDescription || result.additionalNotes || (isHealthy ? t('results.defaultHealthyReasoning') : t('results.defaultUnhealthyReasoning'))}
                  </p>
                </div>
              </div>

              {/* Status Card - Prominent */}
              {result.healthStatus && (
                <div className={`status-banner ${isHealthy ? 'status-healthy' : 'status-unhealthy'}`}>
                  <div className="status-icon-wrapper">
                    {isHealthy ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                  </div>
                  <div className="status-content">
                    <span className="status-label">{t('results.status')}</span>
                    <span className="status-value">
                      {t(`results.${(result.healthStatus || 'unknown').toLowerCase().replace(/\s+/g, '')}`)}
                    </span>

                    {/* Severity display moved here */}
                    {!isHealthy && result.severity && (
                      <div className="status-severity-container" style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        <span className="status-label">{t('results.severity')}</span>
                        <span className="status-value">
                          {t(`results.${(result.severity || 'unknown').toLowerCase().replace(/\s+/g, '')}`)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Demo Mode Warning */}
        {result.additionalNotes && (result.additionalNotes.toLowerCase().includes('demo') || result.additionalNotes.toLowerCase().includes('simulated') || result.additionalNotes.toLowerCase().includes('fallback')) && (
          <div className="demo-mode-warning">
            <AlertCircle size={18} />
            <div className="demo-mode-content">
              <strong>{t('results.demoModeTitle')}</strong>
              <span>{t('results.demoModeDesc')}</span>
            </div>
          </div>
        )}

        {/* Details Grid */}
        {/* Details Grid */}
        {(() => {
          const detailItems = [];

          // Estimated Age (Healthy only)
          if (isHealthy && result.estimatedAge) {
            detailItems.push(
              <div key="age" className="detail-item">
                <div className="detail-icon age-icon">
                  <Calendar size={20} />
                </div>
                <div className="detail-text">
                  <span className="detail-label">{t('results.estimatedAge')}</span>
                  <span className="detail-value">{result.estimatedAge}</span>
                </div>
              </div>
            );
          }

          // Pathogen Type OR Primary Cause
          if (!isHealthy && (result.pathogenType || result.nutritionalIssues?.hasDeficiency) && result.pathogenType !== 'unknown') {
            detailItems.push(
              <div key="pathogen" className="detail-item">
                <div className="detail-icon pathogen-icon">
                  <Bug size={20} />
                </div>
                <div className="detail-text">
                  <span className="detail-label">
                    {result.nutritionalIssues?.hasDeficiency
                      ? t('results.primaryCause')
                      : t('results.pathogenType')}
                  </span>
                  <span className="detail-value">
                    {result.nutritionalIssues?.hasDeficiency
                      ? t('results.nutrientDeficiencyType')
                      : result.pathogenType.charAt(0).toUpperCase() + result.pathogenType.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>
            );
          }

          // Fungus Species (Hide if Nutrient Deficiency)
          if (!isHealthy && !result.nutritionalIssues?.hasDeficiency && result.fungusType) {
            detailItems.push(
              <div key="fungus" className="detail-item">
                <div className="detail-icon fungus-icon">
                  <AlertCircle size={20} />
                </div>
                <div className="detail-text">
                  <span className="detail-label">{t('results.fungusSpecies')}</span>
                  <span className="detail-value">{result.fungusType}</span>
                </div>
              </div>
            );
          }

          if (detailItems.length === 0) return null;

          return (
            <div className="details-section">
              <div className="details-grid">
                {detailItems}
              </div>
            </div>
          );
        })()}

        {/* Symptoms Section (Unhealthy only) */}
        {!isHealthy && result.symptoms && result.symptoms.length > 0 && (
          <div className="symptoms-section">
            <h4 className="subsection-title">
              <AlertCircle size={18} className="subsection-icon" />
              {t('results.symptoms')}
            </h4>
            <ul className="symptoms-list">
              {result.symptoms.map((symptom, idx) => (
                <li key={idx} className="symptom-item">{symptom}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style>{`
        .disease-result {
          width: 100%;
        }

        .result-images-container {
          margin-bottom: var(--space-md);
          display: grid;
          gap: var(--space-md);
        }

        .result-images-container.single-image {
          grid-template-columns: 1fr;
        }

        .result-images-container.dual-images {
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }

        .image-wrapper {
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .result-image {
          width: 100%;
          height: 300px;
          object-fit: cover;
          display: block;
        }

        .image-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
          color: white;
          padding: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          text-align: center;
        }

        @media (max-width: 600px) {
          .result-images-container.dual-images {
            grid-template-columns: 1fr;
          }
          
          .result-image {
            height: 250px;
          }
        }

        /* Container matching other sections */
        .disease-info-container {
          background: #FAFAFA;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .section-header-centered {
          display: flex;
          align-items: center;
          justify-content: flex-start; /* Standardize to left */
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 1.25rem;
          color: #1F2937;
          margin: 0;
          text-align: left; /* Standardize to left */
          font-weight: 700;
        }

        /* Disease Title Card (Maklumat Penyakit) */
        .disease-title-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .disease-name {
          font-size: 1.1rem;
          color: #111827;
          margin: 0 0 4px 0;
          font-weight: 700;
          line-height: 1.4;
        }

        /* Idea Utama Card - Blue Style */
        .idea-utama-card {
          display: flex;
          flex-direction: column; 
          gap: 8px;
          padding: 16px;
          border-radius: 12px;
          background: #EFF6FF; /* Light blue bg */
          border: 1px solid #3B82F6; /* Blue border */
          margin-bottom: 24px;
        }
        
        /* Inner wrapper for icon + label row */
        .idea-header-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
        }

        .idea-icon-wrapper {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: #2563EB; /* Strong blue */
          flex-shrink: 0;
          border-radius: 0;
        }

        .idea-header {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #2563EB; /* Strong blue */
        }

        .idea-content-wrapper {
          flex: 1;
        }

        .idea-content {
          font-size: 0.9rem;
          color: #374151;
          line-height: 1.5;
          margin: 0;
          font-weight: 400;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Status Banner */
        .status-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid;
          margin-bottom: 12px;
        }

        .status-banner.status-healthy {
          background: #D1FAE5;
          border-color: #6EE7B7;
        }

        .status-banner.status-unhealthy {
          background: #FEE2E2;
          border-color: #FCA5A5;
        }

        .status-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          flex-shrink: 0;
        }

        .status-healthy .status-icon-wrapper {
          color: #10B981;
        }

        .status-unhealthy .status-icon-wrapper {
          color: #EF4444;
        }

        .status-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .status-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-healthy .status-label {
          color: #065F46;
        }

        .status-unhealthy .status-label {
          color: #991B1B;
        }

        .status-value {
          font-size: 1.125rem;
          font-weight: 700;
        }

        .status-healthy .status-value {
          color: #047857;
        }

        .status-unhealthy .status-value {
          color: #DC2626;
        }

        /* Details Section */
        .details-section {
          background: white;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          margin-bottom: 12px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #F9FAFB;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
        }

        .detail-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .plant-icon {
          background: #E0F2FE;
          color: #0284C7;
        }

        .age-icon {
          background: #EDE9FE;
          color: #7C3AED;
        }

        .pathogen-icon {
          background: #FEF3C7;
          color: #D97706;
        }

        .fungus-icon {
          background: #FCE7F3;
          color: #DB2777;
        }

        .detail-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .detail-label {
          font-size: 0.7rem;
          color: #6B7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1F2937;
          line-height: 1.2;
          word-break: break-word;
        }

        /* Symptoms Section */
        .symptoms-section {
          background: white;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
        }

        .subsection-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 600;
          color: #1F2937;
          margin: 0 0 12px 0;
        }

        .subsection-icon {
          color: var(--color-primary);
        }

        .symptoms-list {
          margin: 0;
          padding-left: 20px;
          color: #4B5563;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .symptom-item {
          margin-bottom: 6px;
        }

        .symptom-item:last-child {
          margin-bottom: 0;
        }

        /* Demo Mode Warning */
        .demo-mode-warning {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
          border: 2px solid #F59E0B;
          border-radius: 12px;
          margin-bottom: 24px;
          animation: pulse-warning 2s ease-in-out infinite;
        }

        .demo-mode-warning svg {
          color: #D97706;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .demo-mode-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .demo-mode-content strong {
          color: #92400E;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .demo-mode-content span {
          color: #78350F;
          font-size: 0.8125rem;
          line-height: 1.4;
        }

        @keyframes pulse-warning {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
          }
        }

        .nutrition-referral-note {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          font-size: 0.75rem;
          color: var(--color-primary-dark);
          background-color: #ECFDF5;
          padding: 6px 12px;
          border-radius: 20px;
          width: fit-content;
          border: 1px solid #6EE7B7;
          font-weight: 600;
          animation: fade-in 0.5s ease-out;
        }

        .nutrition-referral-note:hover {
          background-color: #D1FAE5;
        }

        @media (max-width: 768px) {
          .disease-info-container {
            padding: 16px;
          }

          .section-title {
            font-size: 1.125rem;
          }

          .disease-name {
            font-size: 1.1rem;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .detail-item {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default DiseaseResult;
