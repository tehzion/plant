import { useReducer, useMemo } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { imageToBase64, analyzePlantDisease } from '../utils/diseaseDetection';
import { saveScan } from '../utils/localStorage';

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
            return { ...state, loading: true, error: '', analyzingStep: 0 };
        case 'UPDATE_ANALYZING_STEP':
            return { ...state, analyzingStep: action.payload };
        case 'COMPLETE_ANALYSIS':
            return { ...state, loading: false, analyzingStep: 0 };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
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
    analyzingStep: 0
};

export const useScanLogic = () => {
    const { language, t } = useLanguage();
    const [state, dispatch] = useReducer(scanReducer, initialScanState);

    const actions = useMemo(() => {
        const handleImageCapture = (file) => dispatch({ type: 'SET_IMAGE', payload: file });
        const handleLeafImageCapture = (file) => dispatch({ type: 'SET_LEAF_IMAGE', payload: file });
        const setCategory = (cat) => dispatch({ type: 'SET_CATEGORY', payload: cat });
        const setScale = (scale) => dispatch({ type: 'SET_SCALE', payload: scale });
        const setQuantity = (qty) => dispatch({ type: 'SET_QUANTITY', payload: qty });
        const nextStep = () => dispatch({ type: 'NEXT_STEP' });
        const prevStep = () => dispatch({ type: 'PREV_STEP' });
        const setStep = (step) => dispatch({ type: 'SET_STEP', payload: step });
        const resetScan = () => dispatch({ type: 'RESET_SCAN' });
        const setError = (msg) => dispatch({ type: 'SET_ERROR', payload: msg });

        const performAnalyze = async (location, locationName) => {
            dispatch({ type: 'START_ANALYSIS' });

            const performStep = (stepIndex, duration) => {
                return new Promise(resolve => {
                    dispatch({ type: 'UPDATE_ANALYZING_STEP', payload: stepIndex });
                    setTimeout(resolve, duration);
                });
            };

            try {
                await performStep(0, 1500);
                const treeImageBase64 = await imageToBase64(state.selectedImage);
                const leafImageBase64 = state.selectedLeafImage ? await imageToBase64(state.selectedLeafImage) : null;

                await performStep(1, 2000);
                const result = await analyzePlantDisease(
                    treeImageBase64,
                    state.selectedCategory || 'Vegetables',
                    leafImageBase64,
                    language,
                    locationName || 'Malaysia'
                );

                await performStep(2, 1000);

                // Create thumbnails
                const treeImageThumbnail = await imageToBase64(state.selectedImage, 400);
                const leafImageThumbnail = state.selectedLeafImage ? await imageToBase64(state.selectedLeafImage, 400) : null;

                const savedScan = saveScan({
                    image: treeImageThumbnail,
                    leafImage: leafImageThumbnail,
                    disease: result.disease,
                    ...result,
                    plantType: result.plantType || state.selectedCategory,
                    category: state.selectedCategory || 'Vegetables',
                    farmScale: state.selectedScale,
                    scaleQuantity: state.scaleQuantity,
                    location: location,
                    locationName: locationName || result.locationName
                });

                dispatch({ type: 'COMPLETE_ANALYSIS' });
                return savedScan.id;

            } catch (err) {
                console.error('Analysis error:', err);
                dispatch({ type: 'SET_ERROR', payload: err.message || t('home.errorAnalysis') });
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
    }, [language, t, state.selectedCategory, state.selectedImage, state.selectedLeafImage, state.selectedScale, state.scaleQuantity]);

    // Note: performAnalyze depends on state, so we must include state deps or use Refs for state. 
    // Ideally, for a purely stable action object, we shouldn't depend on state inside closures but pass it. 
    // However, for this refactor, I will keep it simple but ensure deps are correct to avoid stale state.

    return {
        state,
        actions
    };
};
