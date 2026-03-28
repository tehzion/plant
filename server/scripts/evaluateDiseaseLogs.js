import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_DIR = path.join(__dirname, '../dataset');
const HOLDOUT_DIR = path.join(DATASET_DIR, 'holdout');
const VERIFIED_HOLDOUT_FILE = path.join(HOLDOUT_DIR, 'holdout_verified.json');

const readJsonlFiles = (prefix) => {
  if (!fs.existsSync(DATASET_DIR)) return [];

  return fs.readdirSync(DATASET_DIR)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.jsonl'))
    .flatMap((name) => {
      const content = fs.readFileSync(path.join(DATASET_DIR, name), 'utf8');
      return content
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    });
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const dataLogs = readJsonlFiles('data_log_');
const feedbackLogs = readJsonlFiles('feedback_log_');
const feedbackByScanId = new Map(feedbackLogs.map((entry) => [entry.scanId, entry]));
const verifiedHoldout = readJsonFile(VERIFIED_HOLDOUT_FILE);

let verifiedCount = 0;
let top1Correct = 0;
let top3Hit = 0;
let healthyStatusCorrect = 0;
let speciesLockErrors = 0;
const confusion = {
  fungal: { fungal: 0, bacterial: 0, nutrient: 0, pest: 0, other: 0 },
  bacterial: { fungal: 0, bacterial: 0, nutrient: 0, pest: 0, other: 0 },
  nutrient: { fungal: 0, bacterial: 0, nutrient: 0, pest: 0, other: 0 },
  pest: { fungal: 0, bacterial: 0, nutrient: 0, pest: 0, other: 0 },
  other: { fungal: 0, bacterial: 0, nutrient: 0, pest: 0, other: 0 },
};

const bucketFor = (value) => {
  const normalized = normalize(value);
  if (normalized.includes('fung')) return 'fungal';
  if (normalized.includes('bacter')) return 'bacterial';
  if (normalized.includes('nutri') || normalized.includes('deficien')) return 'nutrient';
  if (normalized.includes('pest') || normalized.includes('insect')) return 'pest';
  return 'other';
};

const evaluateEntry = ({ predictedDisease, correctedDisease, differentials, predictedHealthy, correctedHealthy, speciesConfidence, predictedBucket, actualBucket, wasCorrect, issueType }) => {
  verifiedCount += 1;

  if (wasCorrect) {
    top1Correct += 1;
  } else if (correctedDisease && predictedDisease === correctedDisease) {
    top1Correct += 1;
  }

  if (
    wasCorrect
    || (correctedDisease && differentials.some((entry) => normalize(entry.name) === correctedDisease))
  ) {
    top3Hit += 1;
  }

  if (predictedHealthy === correctedHealthy) {
    healthyStatusCorrect += 1;
  }

  if (!wasCorrect && issueType === 'wrong_species' && speciesConfidence >= 60) {
    speciesLockErrors += 1;
  }

  confusion[actualBucket][predictedBucket] += 1;
};

if (verifiedHoldout.length > 0) {
  for (const entry of verifiedHoldout) {
    evaluateEntry({
      predictedDisease: normalize(entry.predictedDisease),
      correctedDisease: normalize(entry.correctDisease),
      differentials: Array.isArray(entry.differentialDiagnoses) ? entry.differentialDiagnoses : [],
      predictedHealthy: normalize(entry.predictedHealthStatus) === 'healthy',
      correctedHealthy: entry.wasCorrect
        ? normalize(entry.predictedHealthStatus) === 'healthy'
        : normalize(entry.correctDisease).includes('healthy') || normalize(entry.correctDisease).includes('no issue'),
      speciesConfidence: Number(entry.confidenceBreakdown?.speciesConfidence || 0),
      predictedBucket: bucketFor(entry.predictedPathogenType || entry.predictedDisease),
      actualBucket: bucketFor(entry.correctDisease || entry.issueType),
      wasCorrect: entry.wasCorrect,
      issueType: entry.issueType,
    });
  }
} else {
  for (const log of dataLogs) {
    const feedback = feedbackByScanId.get(log.id);
    if (!feedback || typeof feedback.wasCorrect === 'undefined') continue;

    evaluateEntry({
      predictedDisease: normalize(log.prediction?.disease),
      correctedDisease: normalize(feedback.correctDisease || log.correction?.disease),
      differentials: Array.isArray(log.prediction?.differentialDiagnoses) ? log.prediction.differentialDiagnoses : [],
      predictedHealthy: normalize(log.prediction?.healthStatus) === 'healthy',
      correctedHealthy: feedback.wasCorrect
        ? normalize(log.prediction?.healthStatus) === 'healthy'
        : normalize(feedback.correctDisease).includes('healthy') || normalize(feedback.correctDisease).includes('no issue'),
      speciesConfidence: Number(log.prediction?.confidenceBreakdown?.speciesConfidence || 0),
      predictedBucket: bucketFor(log.raw_result?.pathogenType || log.raw_result?.diseaseCategory),
      actualBucket: bucketFor(feedback.correctDisease || feedback.issueType),
      wasCorrect: feedback.wasCorrect,
      issueType: feedback.issueType,
    });
  }
}

const ratio = (value) => (verifiedCount > 0 ? `${((value / verifiedCount) * 100).toFixed(1)}%` : 'n/a');

console.log('Disease Evaluation Summary');
console.log('==========================');
console.log(`Evaluation source: ${verifiedHoldout.length > 0 ? 'holdout_verified.json' : 'structured feedback logs'}`);
console.log(`Verified scans: ${verifiedCount}`);
console.log(`Top-1 disease accuracy: ${ratio(top1Correct)}`);
console.log(`Top-3 differential hit rate: ${ratio(top3Hit)}`);
console.log(`Healthy vs unhealthy accuracy: ${ratio(healthyStatusCorrect)}`);
console.log(`Species-lock error rate: ${ratio(speciesLockErrors)}`);
console.log('');
console.log('Confusion Matrix (actual -> predicted)');
console.log(JSON.stringify(confusion, null, 2));
