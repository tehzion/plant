import { getDataConsent } from '../utils/dataConsent.js';
import { discardCaptureDraft } from '../utils/captureDraft.js';
import { useReducer, useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { imageToBase64, analyzePlantDisease, analyzeLocalImageQuality } from '../utils/diseaseDetection';
import { isNetworkUnavailableError, isTimeoutError } from '../utils/networkRequest.js';
import { friendlyErrorKey } from '../utils/friendlyError.js';
import {
    consumeStorageCleanupNotice,
    saveScan,
} from '../utils/localStorage';
import { getStandardizedStatus, getScanResultState, SCAN_RESULT_STATES } from '../utils/statusUtils';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast.js';

// Scan state reducer
const scanReducer = (state, action) => {
    switch (action.type) {
        case 'SET_OWNER':
            return { ...initialScanState, ...action.payload };
        case 'RESTORE_DRAFT':
            return { ...initialScanState, owner: state.owner, ...action.payload, loading: false, error: '', errorCode: '', currentStep: action.payload.selectedImage ? Math.min(action.payload.currentStep || 1, 2) : 1 };
        case 'SET_IMAGE':
            return { ...state, selectedImage: action.payload, error: '', errorCode: '' };
        case 'SET_LEAF_IMAGE':
            return { ...state, selectedLeafImage: action.payload, error: '', errorCode: '' };
        case 'SET_CATEGORY':
            return { ...state, selectedCategory: action.payload, selectedCrop: action.payload === state.selectedCategory ? state.selectedCrop : '', error: '', errorCode: '' };
        case 'SET_CROP':
            return { ...state, selectedCrop: action.payload || '' };
        case 'SET_SCALE':
            return { ...state, selectedScale: action.payload };
        case 'SET_QUANTITY':
            return { ...state, scaleQuantity: action.payload };
        case 'NEXT_STEP':
            return { ...state, currentStep: state.currentStep + 1, error: '', errorCode: '' };
        case 'PREV_STEP':
            return { ...state, currentStep: state.currentStep - 1, error: '', errorCode: '' };
        // SET_STEP preserves error so the failure card stays visible when Back is clicked.
        // Use SET_STEP_CLEAR for explicit forward navigation that should dismiss errors.
        case 'SET_STEP':
            return { ...state, currentStep: action.payload };
        case 'SET_STEP_CLEAR':
            return { ...state, currentStep: action.payload, error: '', errorCode: '' };
        case 'START_ANALYSIS':
            return { ...state, loading: true, error: '', errorCode: '', analyzingStep: 0, scanStartTime: Date.now() };
        case 'UPDATE_ANALYZING_STEP':
            return { ...state, analyzingStep: action.payload };
        case 'COMPLETE_ANALYSIS':
            return { ...state, loading: false, analyzingStep: 0, scanStartTime: 0, errorCode: '' };
        // SET_ERROR intentionally preserves selectedImage, selectedLeafImage, and
        // selectedCategory so users can retry without re-uploading after a failure.
        case 'SET_ERROR':
            return {
                ...state,
                error: typeof action.payload === 'string' ? action.payload : action.payload?.message || '',
                errorCode: typeof action.payload === 'string' ? '' : action.payload?.code || '',
                loading: false,
                scanStartTime: 0,
                currentStep: 3,
            };
        case 'RESET_SCAN':
            return { ...initialScanState, owner: state.owner, selectedCategory: state.selectedCategory, selectedCrop: state.selectedCrop, selectedScale: state.selectedScale };
        default:
            return state;
    }
};

const initialScanState = {
    owner: null,
    selectedImage: null,
    selectedLeafImage: null,
    selectedCategory: '',
    selectedCrop: '',
    selectedScale: 'acre',
    scaleQuantity: 1,
    currentStep: 1,
    loading: false,
    error: '',
    errorCode: '',
    analyzingStep: 0,
    scanStartTime: 0
};

const capturePreferences = owner => {
    const defaults = { selectedCategory: '', selectedCrop: '', selectedScale: 'acre', scaleQuantity: 1 };
    if (!owner) return defaults;
    try {
        const saved = JSON.parse(localStorage.getItem(`plant_capture_preferences:${owner}`) || '{}');
        if (saved.owner && saved.owner !== owner) return defaults;
        return { selectedCategory: saved.category || '', selectedCrop: saved.crop || '', selectedScale: ['acre', 'tree', 'personal'].includes(saved.scale) ? saved.scale : 'acre', scaleQuantity: Number(saved.quantity) > 0 && Number.isFinite(Number(saved.quantity)) ? Number(saved.quantity) : 1 };
    } catch { return defaults; }
};

export const useScanLogic = () => {
    const { language, t } = useLanguage();
    const { user, guestId } = useAuth();
    const owner = user?.id ? `user:${user.id}` : guestId ? `guest:${guestId}` : null;
    const [storedState, dispatch] = useReducer(scanReducer, initialScanState, initial => ({ ...initial, owner, ...capturePreferences(owner) }));
    const state = useMemo(() => storedState.owner === owner ? storedState : { ...initialScanState, owner }, [storedState, owner]);
    useEffect(() => { dispatch({ type: 'SET_OWNER', payload: { owner, ...capturePreferences(owner) } }); }, [owner]);
    useEffect(() => {
        if (!owner || storedState.owner !== owner) return;
        try {
            const value = JSON.stringify({ owner, category: state.selectedCategory, crop: state.selectedCrop, scale: state.selectedScale, quantity: Number(state.scaleQuantity) || 1 });
            localStorage.setItem(`plant_capture_preferences:${owner}`, value);
        } catch { /* preferences are optional; photos use explicit draft saving */ }
    }, [owner, storedState.owner, state.selectedCategory, state.selectedCrop, state.selectedScale, state.scaleQuantity]);
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const actions = useMemo(() => {
        const dispatchAction = (type, payload) => dispatch({ type, payload });

        const handleImageCapture = (file) => dispatchAction('SET_IMAGE', file);
        const handleLeafImageCapture = (file) => dispatchAction('SET_LEAF_IMAGE', file);
        const setCategory = (cat) => dispatchAction('SET_CATEGORY', cat);
        const setCrop = (crop) => dispatchAction('SET_CROP', crop);
        const setScale = (scale) => dispatchAction('SET_SCALE', scale);
        const setQuantity = (qty) => dispatchAction('SET_QUANTITY', qty);
        const nextStep = () => dispatchAction('NEXT_STEP');
        const prevStep = () => dispatchAction('PREV_STEP');
        // setStep preserves the error state so the failure card remains visible.
        // Use setStepClear when you explicitly want to dismiss any error too.
        const setStep = (step) => dispatchAction('SET_STEP', step);
        const setStepClear = (step) => dispatchAction('SET_STEP_CLEAR', step);
        const restoreDraft = draft => dispatchAction('RESTORE_DRAFT', { selectedImage: draft.selectedImage, selectedLeafImage: draft.selectedLeafImage, selectedCategory: draft.selectedCategory, selectedCrop: draft.selectedCrop, selectedScale: draft.selectedScale, scaleQuantity: draft.scaleQuantity, currentStep: draft.currentStep });
        const resetScan = () => dispatchAction('RESET_SCAN');
        const setError = (payload) => dispatchAction('SET_ERROR', payload);

        // background runs a saved offline check from its own photos without
        // touching the capture screen the farmer may be using.
        const performAnalyze = async (location, locationName, overrides = {}, { background = false } = {}) => {
            const currentState = {
                ...stateRef.current,
                ...overrides,
            };
            const assertOwner = () => {
                if (stateRef.current.owner !== owner) { const error = new Error('Capture account changed'); error.code = 'ANALYSIS_CANCELLED'; throw error; }
            };
            assertOwner();
            const report = background ? () => {} : dispatch;
            report({ type: 'START_ANALYSIS' });

            const analysisTask = async () => {
                // AI disease assessment runs on the server; there is no local
                // model. Fail fast with a clear message instead of a timeout.
                if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                    const offlineError = new Error('ANALYSIS_OFFLINE');
                    offlineError.code = 'ANALYSIS_OFFLINE';
                    throw offlineError;
                }
                report({ type: 'UPDATE_ANALYZING_STEP', payload: 0 });
                const [treeQuality, leafQuality] = await Promise.all([
                    analyzeLocalImageQuality(currentState.selectedImage),
                    currentState.selectedLeafImage
                        ? analyzeLocalImageQuality(currentState.selectedLeafImage)
                        : Promise.resolve(null),
                ]);
                if (treeQuality.requiresRetake) {
                    const qualityError = new Error(treeQuality.retakeReason || 'LOW_IMAGE_QUALITY');
                    qualityError.code = treeQuality.retakeReason || 'LOW_IMAGE_QUALITY';
                    throw qualityError;
                }
                if (leafQuality?.requiresRetake) {
                    const qualityError = new Error(leafQuality.retakeReason || 'LOW_IMAGE_QUALITY');
                    qualityError.code = leafQuality.retakeReason || 'LOW_IMAGE_QUALITY';
                    throw qualityError;
                }

                const [
                    treeImageBase64,
                    leafImageBase64,
                    treeImageThumbnail,
                    leafImageThumbnail,
                ] = await Promise.all([
                    imageToBase64(currentState.selectedImage),
                    currentState.selectedLeafImage
                        ? imageToBase64(currentState.selectedLeafImage)
                        : Promise.resolve(null),
                    imageToBase64(currentState.selectedImage, 400),
                    currentState.selectedLeafImage
                        ? imageToBase64(currentState.selectedLeafImage, 400)
                        : Promise.resolve(null),
                ]);

                report({ type: 'UPDATE_ANALYZING_STEP', payload: 1 });
                assertOwner();
                const result = await analyzePlantDisease(
                    treeImageBase64,
                    currentState.selectedCategory || 'Vegetables',
                    leafImageBase64,
                    language,
                    locationName || 'Malaysia',
                    { tree: treeQuality, leaf: leafQuality, ...(currentState.captureContext ? { context: currentState.captureContext } : {}) },
                    { crop: currentState.selectedCrop || '', dataConsent: getDataConsent(owner) }
                );

                report({ type: 'UPDATE_ANALYZING_STEP', payload: 2 });
                const resultState = getScanResultState(result);
                const standardizedHealthStatus = resultState === SCAN_RESULT_STATES.HEALTHY ? 'healthy'
                    : resultState === SCAN_RESULT_STATES.CONFIDENT_TREATMENT ? getStandardizedStatus(result) : 'unknown';

                assertOwner();
                const savedScan = await saveScan({
                    image: treeImageThumbnail,
                    leafImage: leafImageThumbnail,
                    ...result,
                    analysisLanguage: language,
                    plantPart: currentState.captureContext?.plantPart || 'whole',
                    captureContext: currentState.captureContext || null,
                    healthStatus: standardizedHealthStatus,
                    disease: result.disease,
                    plantType: result.plantType || currentState.selectedCrop || currentState.selectedCategory,
                    category: currentState.selectedCategory || 'Vegetables',
                    crop: currentState.selectedCrop || null,
                    farmScale: currentState.selectedScale,
                    scaleQuantity: currentState.scaleQuantity,
                    location: location,
                    locationName: locationName || result.locationName
                }, user?.id ?? null);
                const cleanupNotice = consumeStorageCleanupNotice();
                if (cleanupNotice) {
                    showToast(
                        t('common.storageCleanupNotice')
                        || 'Old records were cleaned up to save your latest data.',
                        'warning',
                        4500,
                    );
                }

                // ── Sync: Auto-log a "Scouting" activity for the dashboard ──────
                if (!background) await discardCaptureDraft(user?.id ? `user:${user.id}` : guestId ? `guest:${guestId}` : null).catch(() => {});
                assertOwner();
                report({ type: 'COMPLETE_ANALYSIS' });
                return savedScan.id;
            };

            try {
                return await analysisTask();
            } catch (err) {
                if (err.code === 'ANALYSIS_CANCELLED' || stateRef.current.owner !== owner) { err.code = 'ANALYSIS_CANCELLED'; throw err; }
                console.error('Analysis error:', err);
                const qualityErrors = {
                    IMAGE_TOO_DARK: t('home.errorImageTooDark') || 'The photo is too dark. Please retake it in brighter light.',
                    IMAGE_TOO_BLURRY: t('home.errorImageTooBlurry') || 'The photo is too blurry. Please retake it with clearer focus.',
                    IMAGE_TOO_LITTLE_LEAF: t('home.errorImageTooLittleLeaf') || 'The leaf is too small in the frame. Please move closer.',
                    IMAGE_NOT_PLANT: t('home.errorImageNotPlantLike') || 'The image does not look like a clear plant photo. Please try again.',
                };
                const errorCode = err.code || err.message || '';
                const offlineMessage = t('assessment.offlineScanMessage') !== 'assessment.offlineScanMessage'
                    ? t('assessment.offlineScanMessage')
                    : 'AI disease checks need an internet connection. Your photos were not sent. You can still save farm and myGAP records offline.';
                const errorMessage = errorCode === 'ANALYSIS_OFFLINE'
                    ? offlineMessage
                    : err.message === 'NOT_A_PLANT'
                    ? t('home.errorNotPlant')
                    : isTimeoutError(err)
                        ? (t('home.errorAnalysisTimeout') || 'Analysis is taking too long on the current connection. Please try again in a moment.')
                        : isNetworkUnavailableError(err)
                            ? (t('home.errorAnalysisNetwork') || 'We could not reach the analysis service. Please check your connection and try again.')
                            : err.status >= 500
                                ? (t('home.errorAnalysisUnavailable') || 'The analysis service is temporarily unavailable. Please try again shortly.')
                                : friendlyErrorKey(err)
                                    ? t(friendlyErrorKey(err))
                                    // 4xx bodies carry the server's localized AI_* text; anything else
                                    // (a JavaScript or library error) is not meant for farmers.
                                    : (qualityErrors[errorCode] || (err.status >= 400 ? err.message : '') || t('home.errorAnalysis'));
                report({
                    type: 'SET_ERROR',
                    payload: {
                        message: errorMessage,
                        code: isTimeoutError(err)
                            ? 'ANALYSIS_TIMEOUT'
                            : isNetworkUnavailableError(err)
                                ? 'ANALYSIS_NETWORK'
                                : err.status >= 500
                                    ? 'ANALYSIS_UNAVAILABLE'
                                    : errorCode,
                    }
                });
                err.userMessage = errorMessage;
                err.userCode = isTimeoutError(err)
                    ? 'ANALYSIS_TIMEOUT'
                    : isNetworkUnavailableError(err)
                        ? 'ANALYSIS_NETWORK'
                        : err.status >= 500
                            ? 'ANALYSIS_UNAVAILABLE'
                            : errorCode;
                throw err;
            }
        };

        return {
            handleImageCapture,
            handleLeafImageCapture,
            setCategory,
            setCrop,
            setScale,
            setQuantity,
            nextStep,
            prevStep,
            setStep,
            setStepClear,
            resetScan,
            restoreDraft,
            setError,
            performAnalyze
        };
    }, [language, t, stateRef, user, guestId, owner]);

    return {
        state,
        actions
    };
};
