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

const QUALITY_REASON_CODES = {
  too_dark: 'IMAGE_TOO_DARK',
  too_blurry: 'IMAGE_TOO_BLURRY',
  too_little_leaf: 'IMAGE_TOO_LITTLE_LEAF',
  not_plant_like: 'IMAGE_NOT_PLANT',
};

const estimateImageQuality = (imageData) => {
  const { data, width, height } = imageData;
  let totalBrightness = 0;
  let greenishPixels = 0;
  let edgeAccumulator = 0;
  let sampleCount = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const brightness = (0.299 * r) + (0.587 * g) + (0.114 * b);
      totalBrightness += brightness;
      sampleCount += 1;

      if (g > r * 0.9 && g > b * 0.9 && g > 55) {
        greenishPixels += 1;
      }

      if (x < width - 2 && y < height - 2) {
        const rightIndex = (y * width + (x + 2)) * 4;
        const downIndex = (((y + 2) * width) + x) * 4;
        const rightBrightness = (0.299 * data[rightIndex]) + (0.587 * data[rightIndex + 1]) + (0.114 * data[rightIndex + 2]);
        const downBrightness = (0.299 * data[downIndex]) + (0.587 * data[downIndex + 1]) + (0.114 * data[downIndex + 2]);
        edgeAccumulator += Math.abs(brightness - rightBrightness) + Math.abs(brightness - downBrightness);
      }
    }
  }

  const brightness = sampleCount > 0 ? totalBrightness / sampleCount : 0;
  const greenRatio = sampleCount > 0 ? greenishPixels / sampleCount : 0;
  const blurScore = sampleCount > 0 ? edgeAccumulator / sampleCount : 0;
  const qualityConfidence = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (Math.min(brightness, 160) / 160) * 40
        + (Math.min(blurScore, 35) / 35) * 40
        + (Math.min(greenRatio, 0.25) / 0.25) * 20
      ),
    ),
  );

  const flags = [];
  if (brightness < 38) flags.push('too_dark');
  if (blurScore < 10) flags.push('too_blurry');
  if (greenRatio < 0.04) flags.push('too_little_leaf');
  if (greenRatio < 0.02 && brightness < 55 && blurScore < 9) flags.push('not_plant_like');

  return {
    brightness,
    greenRatio,
    blurScore,
    qualityConfidence,
    flags,
  };
};

export const analyzeLocalImageQuality = (file, maxWidth = 640) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('INVALID_IMAGE_FILE'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else if (height > maxWidth) {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const metrics = estimateImageQuality(ctx.getImageData(0, 0, width, height));
        const primaryIssue = metrics.flags[0] || null;

        resolve({
          ...metrics,
          primaryIssue,
          requiresRetake: Boolean(primaryIssue),
          retakeReason: primaryIssue ? QUALITY_REASON_CODES[primaryIssue] : null,
        });
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
export const analyzePlantDisease = async (
  treeImageBase64,
  category,
  leafImageBase64 = null,
  language = 'en',
  location = null,
  imageQuality = null
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
        location,
        imageQuality
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

