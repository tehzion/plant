import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildProductDiagnosisPayload,
  createProductRecommendationsKey,
  fetchLiveProductRecommendations,
} from '../utils/liveProductRecommendations.js';

const inFlightRequests = new Map();
const resolvedRequests = new Map();

const requestRecommendations = (request, { force = false } = {}) => {
  const key = request.key;
  if (!force && resolvedRequests.has(key)) {
    return Promise.resolve(resolvedRequests.get(key));
  }
  if (!force && inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const promise = fetchLiveProductRecommendations(request)
    .then((data) => {
      resolvedRequests.set(key, data);
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
};

export const useProductRecommendations = ({
  plantType = '',
  disease = '',
  scanResult = {},
  language = 'en',
  enabled = true,
} = {}) => {
  const diagnosis = useMemo(
    () => buildProductDiagnosisPayload({ plantType, disease, scanResult }),
    [plantType, disease, scanResult],
  );
  const key = useMemo(
    () => createProductRecommendationsKey(diagnosis, language),
    [diagnosis, language],
  );
  const diagnosisRef = useRef(diagnosis);
  diagnosisRef.current = diagnosis;
  const [state, setState] = useState({ data: null, loading: false, error: null, errorCode: '' });
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async ({ force = false } = {}) => {
    const currentDiagnosis = diagnosisRef.current;
    if (!enabled || (!currentDiagnosis.plantType && currentDiagnosis.disease === 'None')) {
      return null;
    }
    return requestRecommendations({
      plantType: currentDiagnosis.plantType,
      disease: currentDiagnosis.disease,
      scanResult: currentDiagnosis,
      language,
      key,
    }, { force });
  }, [enabled, key, language]);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || (!diagnosis.plantType && diagnosis.disease === 'None')) {
      setState({ data: null, loading: false, error: null, errorCode: '' });
      return undefined;
    }

    setState((current) => ({ ...current, loading: true, error: null, errorCode: '' }));
    load({ force: attempt > 0 })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null, errorCode: '' });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, loading: false, error, errorCode: error?.code || '' });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, diagnosis.disease, diagnosis.plantType, enabled, key, load]);

  return {
    ...state,
    diagnosis,
    retry: () => setAttempt((value) => value + 1),
    load,
  };
};

export default useProductRecommendations;
