const VALID_NUTRITION_STATUSES = new Set(['none', 'possible', 'confirmed']);

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|•|â€¢|;/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeDeficientNutrientItem = (item) => {
  if (!item) return null;

  if (typeof item === 'string') {
    const nutrient = item.trim();
    if (!nutrient) return null;
    return {
      nutrient,
      severity: '',
      symptoms: [],
      recommendations: [],
    };
  }

  if (typeof item !== 'object') return null;

  const nutrient = String(item.nutrient || item.name || item.label || '').trim();
  const symptoms = normalizeList(item.symptoms);
  const recommendations = normalizeList(item.recommendations || item.actions || item.treatments);
  const severity = String(item.severity || '').trim();

  if (!nutrient && symptoms.length === 0 && recommendations.length === 0) {
    return null;
  }

  return {
    nutrient: nutrient || 'Unknown',
    severity,
    symptoms,
    recommendations,
  };
};

export const normalizeDeficientNutrients = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => normalizeDeficientNutrientItem(item))
    .filter(Boolean);
};

export const normalizePossibleNutrients = (items) => {
  if (items && typeof items === 'object' && !Array.isArray(items)) {
    const single = String(items.nutrient || items.name || items.label || '').trim();
    return single ? [single] : [];
  }

  if (!Array.isArray(items)) {
    return normalizeList(items);
  }

  return items
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return String(item.nutrient || item.name || item.label || '').trim();
      }
      return '';
    })
    .filter(Boolean);
};

export const normalizeNutritionalIssues = (nutritionalIssues = null) => {
  const source = nutritionalIssues && typeof nutritionalIssues === 'object' ? nutritionalIssues : {};
  const deficientNutrients = normalizeDeficientNutrients(source.deficientNutrients);
  const possibleNutrients = normalizePossibleNutrients(source.possibleNutrients);
  const symptoms = normalizeList(source.symptoms);
  const reasoning = String(source.reasoning || source.notes || '').trim();
  const explicitStatus = String(source.status || '').trim().toLowerCase();

  let status = VALID_NUTRITION_STATUSES.has(explicitStatus) ? explicitStatus : '';

  if (!status) {
    if (source.hasDeficiency || deficientNutrients.length > 0) {
      status = 'confirmed';
    } else if (possibleNutrients.length > 0 || reasoning || symptoms.length > 0) {
      status = 'possible';
    } else {
      status = 'none';
    }
  }

  if (status === 'confirmed') {
    return {
      status,
      hasDeficiency: true,
      severity: String(source.severity || 'Mild').trim() || 'Mild',
      symptoms,
      deficientNutrients,
      possibleNutrients: [],
      reasoning: '',
    };
  }

  if (status === 'possible') {
    return {
      status,
      hasDeficiency: false,
      severity: String(source.severity || 'Mild').trim() || 'Mild',
      symptoms,
      deficientNutrients: [],
      possibleNutrients,
      reasoning,
    };
  }

  return {
    status: 'none',
    hasDeficiency: false,
    severity: String(source.severity || 'Mild').trim() || 'Mild',
    symptoms: [],
    deficientNutrients: [],
    possibleNutrients: [],
    reasoning: '',
  };
};

export const getNutrientNames = (nutritionalIssues = null) => {
  const normalized = normalizeNutritionalIssues(nutritionalIssues);
  if (normalized.status === 'confirmed') {
    return normalized.deficientNutrients
      .map((item) => String(item?.nutrient || '').trim())
      .filter(Boolean);
  }

  if (normalized.status === 'possible') {
    return normalized.possibleNutrients;
  }

  return [];
};
