import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Info,
    Leaf,
    Sprout,
} from 'lucide-react';
import { SCAN_RESULT_STATES } from '../../utils/statusUtils';

const REVIEW_STATE_HINT_KEYS = {
    [SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO]: 'results.scanStateNeedsCloserPhotoDesc',
    [SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE]: 'results.scanStatePossibleNutrientIssueDesc',
    [SCAN_RESULT_STATES.POSSIBLE_PEST]: 'results.scanStatePossiblePestDesc',
    [SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED]: 'results.scanStateExpertReviewNeededDesc',
};

const REVIEW_STATE_HINT_FALLBACKS = {
    [SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO]: 'Please upload a clearer close-up leaf photo for a safer diagnosis.',
    [SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE]: 'The scan may involve nutrition stress. Confirm with field signs or soil/leaf testing before choosing treatment products.',
    [SCAN_RESULT_STATES.POSSIBLE_PEST]: 'Pest signs may be present. Check leaf undersides, stems, or fruit clusters before applying any product.',
    [SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED]: 'The visible evidence is not strong enough for direct treatment. Ask an expert to review this scan before applying inputs.',
};

const DiseaseResultSummary = ({ result, normalized, t }) => {
    const {
        healthy,
        resultState,
        stateLabel,
        showIdentification,
        displayName,
        scientificName,
        extraDescription,
        translatedHealthStatus,
        translatedSeverity,
    } = normalized;

    return (
        <>
            <div className="disease-title-card">
                <div className="disease-name-section">
                    <h2 className="disease-name">{displayName}</h2>
                    {!healthy && resultState && (
                        <span className={`diagnosis-state-pill diagnosis-state-pill--${resultState}`}>
                            {stateLabel}
                        </span>
                    )}
                    {scientificName && <p className="scientific-name">{scientificName}</p>}

                    {showIdentification && (
                        <div className="species-id-info">
                            <Leaf size={14} color="#059669" />
                            <span>
                                <strong>{result.identification.scientificName}</strong>
                                {result.identification.commonNames && result.identification.commonNames.length > 0 && (
                                    <span className="species-id-common-name">
                                        ({result.identification.commonNames[0]})
                                    </span>
                                )}
                                <span className="species-id-confidence">
                                    {result.identification.confidence}%
                                </span>
                            </span>
                        </div>
                    )}

                    {result.nutritionalIssues?.status && result.nutritionalIssues.status !== 'none' && (
                        <div className="nutrition-referral-note">
                            <Sprout size={14} />
                            <span>{t('results.seeNutritionTab')}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="idea-utama-card">
                <div className="idea-header-row">
                    <div className="idea-icon-wrapper">
                        <Info size={18} />
                    </div>
                    <span className="idea-header">{t('results.keyIdea')}</span>
                </div>
                <div className="idea-content-wrapper">
                    <p className="idea-content">{extraDescription}</p>
                </div>
            </div>

            {result.healthStatus && (
                <div className={`status-banner ${healthy ? 'status-healthy' : 'status-unhealthy'}`}>
                    <div className="status-icon-wrapper">
                        {healthy ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div className="status-content">
                        <span className="status-label">{t('results.status')}</span>
                        <span className="status-value">{translatedHealthStatus}</span>

                        {!healthy && result.severity && (
                            <div className="status-severity-container">
                                <span className="status-label">{t('results.severity')}</span>
                                <span className="status-value">{translatedSeverity}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {REVIEW_STATE_HINT_KEYS[resultState] && (
                <div className="retake-banner">
                    <AlertCircle size={18} />
                    <div>
                        <strong>{stateLabel}</strong>
                        <p>
                            {result.retakeReason
                                || result.abstainReason
                                || t(REVIEW_STATE_HINT_KEYS[resultState])
                                || REVIEW_STATE_HINT_FALLBACKS[resultState]}
                        </p>
                    </div>
                </div>
            )}

        </>
    );
};

export default DiseaseResultSummary;
