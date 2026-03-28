// Farm Intelligence AI - Backend API Integration

import { fetchJsonWithTimeout } from './networkRequest.js';

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
    return await fetchJsonWithTimeout(
      `${API_URL}/api/farm/insights`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs, alerts, harvestData, plots, checklistPct, language })
      },
      {
        timeoutMs: 20000,
        timeoutMessage: 'AI insights are taking too long. Please try again in a moment.',
        networkMessage: 'Could not reach the AI insights service. Please check your connection.',
        unavailableMessage: 'AI insights are temporarily unavailable. Please try again shortly.',
      },
    );
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
    return await fetchJsonWithTimeout(
      `${API_URL}/api/farm/sop`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crop, disease, severity, language })
      },
      {
        timeoutMs: 20000,
        timeoutMessage: 'SOP generation is taking too long. Please try again shortly.',
        networkMessage: 'Could not reach the SOP service. Please check your connection.',
        unavailableMessage: 'SOP generation is temporarily unavailable. Please try again shortly.',
      },
    );
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
    return await fetchJsonWithTimeout(
      `${API_URL}/api/farm/parse-log`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language })
      },
      {
        timeoutMs: 15000,
        timeoutMessage: 'Log enhancement is taking too long. Please try again shortly.',
        networkMessage: 'Could not reach the log enhancement service. Please check your connection.',
        unavailableMessage: 'Log enhancement is temporarily unavailable. Please try again shortly.',
      },
    );
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
    return await fetchJsonWithTimeout(
      `${API_URL}/api/farm/predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plots, logs, alerts, location, language })
      },
      {
        timeoutMs: 18000,
        timeoutMessage: 'Risk prediction is taking too long. Please try again shortly.',
        networkMessage: 'Could not reach the farm risk service. Please check your connection.',
        unavailableMessage: 'Farm risk prediction is temporarily unavailable. Please try again shortly.',
      },
    );
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
    return await fetchJsonWithTimeout(
      `${API_URL}/api/ask`,
      {
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
      },
      {
        timeoutMs: 18000,
        timeoutMessage: 'AI advice is taking too long. Please try again in a moment.',
        networkMessage: 'Could not reach the AI advisor service. Please check your connection.',
        unavailableMessage: 'The AI advisor is temporarily unavailable. Please try again shortly.',
      },
    );
  } catch (error) {
    console.error('AI Ask API failed:', error);
    throw error;
  }
};
