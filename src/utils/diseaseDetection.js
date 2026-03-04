// Plant Disease Detection - Backend API Integration

// In production (Render/Vercel), we want relative paths (e.g. /api/analyze) 
// so the frontend talks to the backend on the same domain.
// In local dev, we might need localhost:3002 if not using a proxy.
const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Convert image file to base64, resizing it to optimal dimensions for smart analysis
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width/height dimension (default 1024px)
 * @returns {Promise<string>} Base64 encoded image
 */
export const imageToBase64 = (file, maxWidth = 1024) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Invalid file type. Please upload an image.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression (JPEG 0.8)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Call backend API to analyze plant disease
 * @param {string} treeImageBase64 - Base64 encoded tree image
 * @param {string} category - Plant category
 * @param {string} leafImageBase64 - Optional base64 encoded leaf close-up
 * @param {string} language - Language code ('en', 'ms', or 'zh')
 * @returns {Promise<Object>} Analysis result
 */
// Import disease database for fallback/mock data
import { getMockAnalysisResult } from './mockData';

export const analyzePlantDisease = async (
  treeImageBase64,
  category,
  leafImageBase64 = null,
  language = 'en',
  location = null
) => {
  try {
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        treeImage: treeImageBase64,
        category,
        leafImage: leafImageBase64,
        language,
        location
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 429) {
        throw new Error(errorData.message || errorData.error || 'Too many requests. Please try again later.');
      }

      if (response.status === 500) {
        throw new Error(errorData.message || errorData.error || 'Server error. Please try again.');
      }

      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.warn('Disease detection API failed:', error);

    // Safety: Only fallback to mock data in development or if the API URL is local
    const isLocal = API_URL.includes('localhost') || API_URL === '';
    if (import.meta.env.DEV || isLocal) {
      console.log('Using local fallback (Development/Local mode only)');
      return await getMockAnalysisResult(treeImageBase64, category, language);
    }

    throw error;
  }
};

/**
 * Get server health status
 * @returns {Promise<Object>} Health status
 */
export const checkServerHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    if (data.status !== 'ok') throw new Error('Server status is not ok');

    return data;
  } catch (error) {
    throw new Error('Backend server is not reachable');
  }
};

