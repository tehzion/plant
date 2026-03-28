import { useLanguage } from '../i18n/i18n.jsx';
import DiseaseResultMedia from './disease-result/DiseaseResultMedia';
import DiseaseResultSummary from './disease-result/DiseaseResultSummary';
import DiseaseResultSections from './disease-result/DiseaseResultSections';
import { normalizeDiseaseResult } from '../utils/diseaseResultUtils';

const DiseaseResult = ({ result, image, leafImage }) => {
  const { t } = useLanguage();

  if (!result) return null;

  const normalized = normalizeDiseaseResult(result, t);

  return (
    <div className="disease-result">
      <DiseaseResultMedia image={image} leafImage={leafImage} t={t} />

      <div className="disease-info-container">
        <DiseaseResultSummary result={result} normalized={normalized} t={t} />
        <DiseaseResultSections normalized={normalized} t={t} />
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

        .retake-banner,
        .confidence-panel,
        .evidence-section,
        .differentials-section {
          margin-top: 20px;
          padding: 16px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .retake-banner {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: #fff7ed;
          border-color: #fdba74;
          color: #9a3412;
        }

        .retake-banner p {
          margin: 6px 0 0;
          color: #9a3412;
        }

        .confidence-header {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .confidence-grid,
        .evidence-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }

        .confidence-item,
        .evidence-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }

        .confidence-item span,
        .evidence-item span {
          font-size: 0.85rem;
          color: #64748b;
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
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
          font-size: 0.75rem;
          color: var(--color-primary-dark);
          background-color: #ECFDF5;
          padding: 6px 12px;
          border-radius: 20px;
          width: fit-content;
          max-width: 100%;
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

          .status-banner,
          .retake-banner {
            align-items: flex-start;
          }

          .confidence-grid,
          .evidence-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DiseaseResult;


