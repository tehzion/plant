import { useReducer, useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { imageToBase64, analyzePlantDisease, analyzeLocalImageQuality } from '../utils/diseaseDetection';
import {
    consumeStorageCleanupNotice,
    saveScan,
} from '../utils/localStorage';
import { getStandardizedStatus } from '../utils/statusUtils';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast.js';

// Scan state reducer
const scanReducer = (state, action) => {
    switch (action.type) {
        case 'SET_IMAGE':
            return { ...state, selectedImage: action.payload, error: '' };
        case 'SET_LEAF_IMAGE':
            return { ...state, selectedLeafImage: action.payload, error: '' };
        case 'SET_CATEGORY':
            return { ...state, selectedCategory: action.payload, error: '' };
        case 'SET_SCALE':
            return { ...state, selectedScale: action.payload };
        case 'SET_QUANTITY':
            return { ...state, scaleQuantity: action.payload };
        case 'NEXT_STEP':
            return { ...state, currentStep: state.currentStep + 1, error: '' };
        case 'PREV_STEP':
            return { ...state, currentStep: state.currentStep - 1, error: '' };
        case 'SET_STEP':
            return { ...state, currentStep: action.payload, error: '' };
        case 'START_ANALYSIS':
            return { ...state, loading: true, error: '', analyzingStep: 0, scanStartTime: Date.now() };
        case 'UPDATE_ANALYZING_STEP':
            return { ...state, analyzingStep: action.payload };
        case 'COMPLETE_ANALYSIS':
            return { ...state, loading: false, analyzingStep: 0, scanStartTime: 0 };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false, scanStartTime: 0 };
        case 'RESET_SCAN':
            return { ...initialScanState };
        default:
            return state;
    }
};

const initialScanState = {
    selectedImage: null,
    selectedLeafImage: null,
    selectedCategory: '',
    selectedScale: 'personal',
    scaleQuantity: 1,
    currentStep: 1,
    loading: false,
    error: '',
    analyzingStep: 0,
    scanStartTime: 0
};

export const useScanLogic = () => {
    const { language, t } = useLanguage();
    const { user } = useAuth();
    const [state, dispatch] = useReducer(scanReducer, initialScanState);
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const actions = useMemo(() => {
        const dispatchAction = (type, payload) => dispatch({ type, payload });

        const handleImageCapture = (file) => dispatchAction('SET_IMAGE', file);
        const handleLeafImageCapture = (file) => dispatchAction('SET_LEAF_IMAGE', file);
        const setCategory = (cat) => dispatchAction('SET_CATEGORY', cat);
        const setScale = (scale) => dispatchAction('SET_SCALE', scale);
        const setQuantity = (qty) => dispatchAction('SET_QUANTITY', qty);
        const nextStep = () => dispatchAction('NEXT_STEP');
        const prevStep = () => dispatchAction('PREV_STEP');
        const setStep = (step) => dispatchAction('SET_STEP', step);
        const resetScan = () => dispatchAction('RESET_SCAN');
        const setError = (msg) => dispatchAction('SET_ERROR', msg);

        const performAnalyze = async (location, locationName) => {
            const currentState = stateRef.current;
            dispatch({ type: 'START_ANALYSIS' });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Analysis timed out')), 60000)
            );

            const analysisTask = async () => {
                const performStep = (stepIndex, duration) => {
                    return new Promise(resolve => {
                        dispatch({ type: 'UPDATE_ANALYZING_STEP', payload: stepIndex });
                        setTimeout(resolve, duration);
                    });
                };

                await performStep(0, 1500);
                const treeQuality = await analyzeLocalImageQuality(currentState.selectedImage);
                const leafQuality = currentState.selectedLeafImage
                    ? await analyzeLocalImageQuality(currentState.selectedLeafImage)
                    : null;
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

                const treeImageBase64 = await imageToBase64(currentState.selectedImage);
                const leafImageBase64 = currentState.selectedLeafImage ? await imageToBase64(currentState.selectedLeafImage) : null;

                await performStep(1, 2000);
                const result = await analyzePlantDisease(
                    treeImageBase64,
                    currentState.selectedCategory || 'Vegetables',
                    leafImageBase64,
                    language,
                    locationName || 'Malaysia',
                    { tree: treeQuality, leaf: leafQuality }
                );

                await performStep(2, 1000);

                const treeImageThumbnail = await imageToBase64(currentState.selectedImage, 400);
                const leafImageThumbnail = currentState.selectedLeafImage ? await imageToBase64(currentState.selectedLeafImage, 400) : null;
                const standardizedHealthStatus = getStandardizedStatus(result);

                const savedScan = await saveScan({
                    image: treeImageThumbnail,
                    leafImage: leafImageThumbnail,
                    ...result,
                    healthStatus: standardizedHealthStatus,
                    disease: result.disease,
                    plantType: result.plantType || currentState.selectedCategory,
                    category: currentState.selectedCategory || 'Vegetables',
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
                dispatch({ type: 'COMPLETE_ANALYSIS' });
                return savedScan.id;
            };

            try {
                return await Promise.race([analysisTask(), timeoutPromise]);
            } catch (err) {
                console.error('Analysis error:', err);
                const qualityErrors = {
                    IMAGE_TOO_DARK: t('home.errorImageTooDark') || 'The photo is too dark. Please retake it in brighter light.',
                    IMAGE_TOO_BLURRY: t('home.errorImageTooBlurry') || 'The photo is too blurry. Please retake it with clearer focus.',
                    IMAGE_TOO_LITTLE_LEAF: t('home.errorImageTooLittleLeaf') || 'The leaf is too small in the frame. Please move closer.',
                    IMAGE_NOT_PLANT: t('home.errorImageNotPlantLike') || 'The image does not look like a clear plant photo. Please try again.',
                };
                const errorCode = err.code || err.message;
                const errorMessage = err.message === 'NOT_A_PLANT'
                    ? t('home.errorNotPlant')
                    : (qualityErrors[errorCode] || err.message || t('home.errorAnalysis'));
                dispatch({ type: 'SET_ERROR', payload: errorMessage });
                dispatch({ type: 'SET_STEP', payload: 2 });
                throw err;
            }
        };

        return {
            handleImageCapture,
            handleLeafImageCapture,
            setCategory,
            setScale,
            setQuantity,
            nextStep,
            prevStep,
            setStep,
            resetScan,
            setError,
            performAnalyze
        };
    }, [language, t, stateRef, user]);

    return {
        state,
        actions
    };
};
