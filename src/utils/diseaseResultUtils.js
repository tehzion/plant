import { isHealthy } from './statusUtils';

const DEMO_TERMS = ['demo', 'simulated', 'fallback'];

const splitDiseaseTitleAndDescription = (initialTitle, initialDescription) => {
    let displayTitle = initialTitle;
    let extraDescription = initialDescription;

    if (typeof displayTitle === 'string' && displayTitle.length > 40) {
        if (displayTitle.includes(', ')) {
            const commaParts = displayTitle.split(', ');
            const explanatoryStart = ['kemungkinan', 'likely', 'disebabkan', 'caused', 'berpunca', 'due to'];
            const potentialExplanation = commaParts.slice(1).join(', ').trim();

            if (explanatoryStart.some((keyword) => potentialExplanation.toLowerCase().startsWith(keyword))) {
                displayTitle = commaParts[0].trim();
                const extractedExplanation = potentialExplanation.charAt(0).toUpperCase() + potentialExplanation.slice(1);
                extraDescription = extraDescription
                    ? `${extractedExplanation}\n\n${extraDescription}`
                    : extractedExplanation;
            }
        }

        if (displayTitle.length > 40) {
            const splitKeywords = [
                ' akibat ', ' kerana ', ' disebabkan ', ' berpunca ',
                ' due to ', ' caused by ', ' because ', ' results from ',
                ' yang ', ' in ', ' on ',
            ];

            let splitIndex = -1;

            for (const keyword of splitKeywords) {
                const index = displayTitle.toLowerCase().indexOf(keyword);
                if (index !== -1 && (splitIndex === -1 || index < splitIndex)) {
                    splitIndex = index;
                }
            }

            if (splitIndex !== -1) {
                const titlePart = displayTitle.substring(0, splitIndex).trim();
                const descPart = displayTitle.substring(splitIndex).trim();

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

    return { displayTitle, extraDescription };
};

export const normalizeDiseaseResult = (result, t) => {
    const healthy = isHealthy(result);
    const resultState = result.status || (result.requiresRetake ? 'retake_required' : result.abstainReason ? 'uncertain' : 'likely');
    const differentials = Array.isArray(result.differentialDiagnoses)
        ? result.differentialDiagnoses.filter(Boolean)
        : [];
    const confidenceBreakdown = result.confidenceBreakdown || null;
    const diagnosticEvidence = result.diagnosticEvidence || null;
    const showIdentification = Boolean(
        result.identification
        && (result.speciesAssessment?.confirmed ?? (Number(result.identification?.confidence) >= 60))
    );
    const symptomsList = Array.isArray(result.symptoms)
        ? result.symptoms.filter(Boolean)
        : (typeof result.symptoms === 'string'
            ? result.symptoms.split(/\r?\n|•|â€¢/g).map((value) => value.trim()).filter(Boolean)
            : []);

    let displayTitle = result.disease || t('results.unknownDisease');
    if (displayTitle === 'Tiada Masalah') {
        displayTitle = t('results.noIssues');
    }

    let extraDescription = result.additionalNotes || result.analysisSummary || result.analysis_summary || result.description || result.summary || result.justification;
    if (extraDescription === 'Mod Demo / Data Simulasi') {
        extraDescription = t('results.demoModeDesc');
    }

    ({ displayTitle, extraDescription } = splitDiseaseTitleAndDescription(displayTitle, extraDescription));

    const detailItems = [];

    if (healthy && result.estimatedAge) {
        detailItems.push({
            key: 'age',
            icon: 'calendar',
            iconClassName: 'age-icon',
            label: t('results.estimatedAge'),
            value: result.estimatedAge,
        });
    }

    if (!healthy && (result.pathogenType || result.nutritionalIssues?.hasDeficiency) && result.pathogenType !== 'unknown') {
        detailItems.push({
            key: 'pathogen',
            icon: 'bug',
            iconClassName: 'pathogen-icon',
            label: result.nutritionalIssues?.hasDeficiency
                ? t('results.primaryCause')
                : t('results.pathogenType'),
            value: result.nutritionalIssues?.hasDeficiency
                ? t('results.nutrientDeficiencyType')
                : result.pathogenType.charAt(0).toUpperCase() + result.pathogenType.slice(1).toLowerCase(),
        });
    }

    if (!healthy && !result.nutritionalIssues?.hasDeficiency && result.fungusType) {
        detailItems.push({
            key: 'fungus',
            icon: 'alert-circle',
            iconClassName: 'fungus-icon',
            label: t('results.fungusSpecies'),
            value: result.fungusType,
        });
    }

    return {
        healthy,
        resultState,
        stateLabel: {
            confirmed: t('results.confirmedDiagnosis') || 'Confirmed diagnosis',
            likely: t('results.likelyDiagnosis') || 'Likely diagnosis',
            uncertain: t('results.uncertainDiagnosis') || 'Uncertain diagnosis',
            retake_required: t('results.retakeRequired') || 'Need a clearer leaf close-up',
        }[resultState] || (t('results.likelyDiagnosis') || 'Likely diagnosis'),
        differentials,
        confidenceBreakdown,
        diagnosticEvidence,
        showIdentification,
        symptomsList,
        displayTitle,
        displayName: typeof displayTitle === 'string' ? displayTitle.split('(')[0]?.trim() : displayTitle,
        scientificName: typeof displayTitle === 'string'
            ? (displayTitle.match(/\(([^)]+)\)/)?.[1] || '')
            : '',
        extraDescription: extraDescription || result.additionalNotes || (healthy ? t('results.defaultHealthyReasoning') : t('results.defaultUnhealthyReasoning')),
        showDemoModeWarning: typeof result.additionalNotes === 'string'
            && DEMO_TERMS.some((term) => result.additionalNotes.toLowerCase().includes(term)),
        detailItems,
        translatedHealthStatus: result.healthStatus
            ? t(`results.${(result.healthStatus || 'unknown').toLowerCase().replace(/\s+/g, '')}`)
            : '',
        translatedSeverity: result.severity
            ? t(`results.${(result.severity || 'unknown').toLowerCase().replace(/\s+/g, '')}`)
            : '',
    };
};
