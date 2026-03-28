// Farm Intelligence AI - Backend API Integration

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Call backend API to generate AI Agronomist Insights
 * @param {Array} logs - Recent daily logs
 * @param {Array} alerts - Active alerts
 * @param {Array} harvestData - Recent harvest data
 * @param {Array} plots - User's farm plot data
 * @param {number} checklistPct - GAP Compliance score (0-100)
 * @param {string} language - Language code ('en', 'ms', or 'zh')
 * @returns {Promise<Object>} Insight result { summary, recommendations, yieldAnalysis }
 */
export const generateInsights = async (logs, alerts, harvestData, plots, checklistPct, language = 'en') => {
  try {
    const response = await fetch(`${API_URL}/api/farm/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs, alerts, harvestData, plots, checklistPct, language })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI Insights API failed:', error);
    throw error;
  }
};

/**
 * Call backend API to generate a Treatment SOP
 * @param {string} crop - Crop type
 * @param {string} disease - Disease or pest name
 * @param {string} severity - Severity level
 * @param {string} language - Language code ('en', 'ms', or 'zh')
 * @returns {Promise<Object>} SOP result { treatmentPlan, recommendedChemicals }
 */
export const generateSOP = async (crop, disease, severity, language = 'en') => {
  try {
    const response = await fetch(`${API_URL}/api/farm/sop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ crop, disease, severity, language })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI SOP API failed:', error);
    throw error;
  }
};

/**
 * Call backend API to parse unstructured log text
 * @param {string} text - The natural language log
 * @param {string} language - Language code ('en', 'ms', or 'zh')
 * @returns {Promise<Object>} Parsed log fields { type, crop, chemical, quantity, notes }
 */
export const parseNaturalLog = async (text, language = 'en') => {
  try {
    const response = await fetch(`${API_URL}/api/farm/parse-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, language })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI Parse Log API failed:', error);
    throw error;
  }
};

/**
 * Call backend API to predict farm risks based on current context
 * @param {Array} plots - User's farm plot data
 * @param {Array} logs - Recent daily logs
 * @param {Array} alerts - Active alerts
 * @param {string} language - Language code ('en', 'ms', or 'zh')
 * @returns {Promise<Object>} Risk result { hasRisk, riskLevel, warningMessage, suggestedAction }
 */
export const predictFarmRisk = async (plots, logs, alerts, location, language = 'en') => {
  try {
    const response = await fetch(`${API_URL}/api/farm/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plots, logs, alerts, location, language })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI Predict Risk API failed:', error);
    return { hasRisk: false }; // Failsafe
  }
};

/**
 * Call backend API for contextual farm Q&A.
 * @param {string} question - User question for the AI advisor
 * @param {string} language - Language code ('en', 'ms', or 'zh')
 * @param {Array} recentNotes - Recent daily notes for lightweight context
 * @param {Array} recentAlerts - Active or recent alerts for lightweight context
 * @returns {Promise<Object>} Ask result { answer, timestamp, cached }
 */
export const askFarmQuestion = async (
  question,
  language = 'en',
  recentNotes = [],
  recentAlerts = [],
) => {
  try {
    const response = await fetch(`${API_URL}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        language,
        recentNotes,
        recentAlerts,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI Ask API failed:', error);
    throw error;
  }
};
