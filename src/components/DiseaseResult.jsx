import { useLanguage } from '../i18n/i18n.jsx';
import DiseaseResultMedia from './disease-result/DiseaseResultMedia';
import DiseaseResultSummary from './disease-result/DiseaseResultSummary';
import DiseaseResultSections from './disease-result/DiseaseResultSections';
import { normalizeDiseaseResult } from '../utils/diseaseResultUtils';
import { buildScanResultModel } from '../utils/scanResultModel.js';

const DiseaseResult = ({ result, image, leafImage }) => {
  const { t, language } = useLanguage();

  if (!result) return null;
  result = buildScanResultModel(result, language);

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
          margin-bottom: 16px;
          display: grid;
          gap: 12px;
        }

        .result-images-container.single-image {
          grid-template-columns: 1fr;
        }

        .result-images-container.dual-images {
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }

        .image-wrapper {
          position: relative;
          border-radius: var(--radius-xl);
          overflow: hidden;
          border: 1px solid var(--color-border);
          background: var(--color-bg-subtle);
        }

        .result-image {
          width: 100%;
          height: 300px;
          object-fit: cover;
          display: block;
        }

        .image-label {
          position: absolute;
          left: 8px;
          bottom: 8px;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          background: rgba(31, 35, 32, 0.72);
          color: #ffffff;
          font-size: var(--font-size-xs);
          font-weight: 500;
        }

        @media (max-width: 600px) {
          .result-images-container.dual-images {
            grid-template-columns: 1fr;
          }

          .result-image {
            height: 240px;
          }
        }

        .disease-info-container {
          background: #ffffff;
          padding: 20px;
          border-radius: var(--radius-xl);
          margin-bottom: 24px;
          border: 1px solid var(--color-border);
        }

        .section-header-centered {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: var(--font-size-lg);
          color: var(--color-text-primary);
          margin: 0;
          text-align: left;
          font-weight: 600;
        }

        .disease-title-card {
          padding: 0 0 16px;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .disease-name {
          font-size: var(--font-size-xl);
          color: var(--color-text-primary);
          margin: 0 0 8px 0;
          font-weight: 700;
          line-height: 1.35;
        }

        /* State pill: neutral outline; only "needs review" states get the warning tint. */
        .diagnosis-state-pill {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 3px 10px;
          margin-bottom: 8px;
          border-radius: var(--radius-full);
          background: #ffffff;
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border-strong);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }

        .diagnosis-state-pill--uncertain,
        .diagnosis-state-pill--retake_required,
        .diagnosis-state-pill--needs_closer_photo,
        .diagnosis-state-pill--expert_review_needed {
          background: var(--color-warning-bg);
          color: var(--color-warning-ink);
          border-color: var(--color-warning-border);
        }

        .scientific-name {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          font-style: italic;
        }

        .idea-utama-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 14px 16px;
          border-radius: var(--radius-lg);
          background: var(--color-bg-subtle);
          border: 1px solid var(--color-border-light);
          margin-bottom: 16px;
        }

        .idea-header-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .idea-icon-wrapper {
          display: flex;
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }

        .idea-header {
          font-size: var(--font-size-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .idea-content {
          font-size: var(--font-size-base);
          color: var(--color-text-primary);
          line-height: 1.6;
          margin: 0;
        }

        /* Status row: white, coloured icon tile, words carry the meaning. */
        .status-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          background: #ffffff;
          margin-bottom: 12px;
        }

        .status-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--color-bg-subtle);
          color: var(--color-text-secondary);
        }

        .status-healthy .status-icon-wrapper { background: var(--color-primary-light); color: var(--color-primary); }
        .status-unhealthy .status-icon-wrapper { background: var(--color-danger-bg); color: var(--color-severe); }
        .status-review .status-icon-wrapper { background: var(--color-warning-bg); color: var(--color-warning-ink); }

        .status-content {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 2px 16px;
        }

        .status-severity-container {
          display: grid;
          gap: 2px;
        }

        .status-label {
          font-size: var(--font-size-xs);
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .status-value {
          font-size: var(--font-size-base);
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .details-section,
        .symptoms-section {
          background: #ffffff;
          padding: 16px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
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
          background: var(--color-bg-subtle);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border-light);
        }

        .detail-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #ffffff;
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
        }

        .detail-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .detail-label {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .detail-value {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-text-primary);
          line-height: 1.3;
          word-break: break-word;
        }

        .retake-banner,
        .confidence-panel,
        .evidence-section,
        .differentials-section {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: var(--radius-lg);
          background: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
        }

        .retake-banner {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-top: 0;
          margin-bottom: 12px;
          background: var(--color-warning-bg);
          border-color: var(--color-warning-border);
          color: var(--color-warning-ink);
        }

        .retake-banner p {
          margin: 4px 0 0;
          color: var(--color-warning-ink);
        }

        .confidence-header {
          font-weight: 600;
          color: var(--color-text-primary);
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
          border-radius: var(--radius-md);
          background: #ffffff;
          border: 1px solid var(--color-border);
        }

        .confidence-item span,
        .evidence-item span {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .subsection-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--font-size-base);
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 12px 0;
        }

        .subsection-icon {
          color: var(--color-text-secondary);
        }

        .symptoms-list {
          margin: 0;
          padding-left: 20px;
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.6;
        }

        .symptom-item {
          margin-bottom: 6px;
        }

        .symptom-item:last-child {
          margin-bottom: 0;
        }

        /* Demo label: clearly marked, but not a flashing alert. */
        .demo-mode-warning {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px dashed var(--color-border-strong);
          border-radius: var(--radius-lg);
          margin-bottom: 16px;
        }

        .demo-mode-warning svg {
          color: var(--color-text-secondary);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .demo-mode-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .demo-mode-content strong {
          color: var(--color-text-primary);
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .demo-mode-content span {
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.4;
        }

        .nutrition-referral-note {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          width: fit-content;
          max-width: 100%;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .disease-info-container {
            padding: 16px;
          }

          .disease-name {
            font-size: var(--font-size-lg);
          }

          .details-grid,
          .confidence-grid,
          .evidence-grid {
            grid-template-columns: 1fr;
          }

          .status-banner,
          .retake-banner {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default DiseaseResult;
