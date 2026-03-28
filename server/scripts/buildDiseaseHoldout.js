import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_DIR = path.join(__dirname, '../dataset');
const HOLDOUT_DIR = path.join(DATASET_DIR, 'holdout');
const VERIFIED_FILE = path.join(HOLDOUT_DIR, 'holdout_verified.json');
const REVIEW_FILE = path.join(HOLDOUT_DIR, 'holdout_review_candidates.json');

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

const dataLogs = readJsonlFiles('data_log_');
const feedbackLogs = readJsonlFiles('feedback_log_');
const feedbackByScanId = new Map(feedbackLogs.map((entry) => [entry.scanId, entry]));

fs.mkdirSync(HOLDOUT_DIR, { recursive: true });

const verified = [];
const reviewCandidates = [];

for (const log of dataLogs) {
  const feedback = feedbackByScanId.get(log.id);
  const baseRecord = {
    scanId: log.id,
    timestamp: log.timestamp,
    category: log.category,
    images: log.images,
    predictedCrop: log.raw_result?.plantType || '',
    predictedDisease: log.prediction?.disease || '',
    predictedHealthStatus: log.prediction?.healthStatus || '',
    predictedPathogenType: log.raw_result?.pathogenType || '',
    predictedSeverity: log.raw_result?.severity || '',
    confidence: log.prediction?.confidence || 0,
    confidenceBreakdown: log.prediction?.confidenceBreakdown || null,
    differentialDiagnoses: log.prediction?.differentialDiagnoses || [],
    identification: log.raw_result?.identification || null,
  };

  const hasStructuredCorrection = Boolean(
    feedback
    && (typeof feedback.wasCorrect !== 'undefined'
      || feedback.correctDisease
      || feedback.correctCrop
      || feedback.issueType)
  );

  if (hasStructuredCorrection) {
    verified.push({
      ...baseRecord,
      reviewedBy: feedback.reviewedBy || feedback.reviewer || 'unknown',
      reviewSource: 'feedback_log',
      wasCorrect: feedback.wasCorrect,
      correctCrop: feedback.correctCrop || null,
      correctDisease: feedback.correctDisease || null,
      issueType: feedback.issueType || null,
      note: feedback.note || feedback.comment || null,
    });
    continue;
  }

  reviewCandidates.push({
    ...baseRecord,
    reviewStatus: 'pending_expert_review',
    expertLabelTemplate: {
      wasCorrect: null,
      correctCrop: null,
      correctDisease: null,
      issueType: null,
      note: null,
      reviewedBy: null,
    },
    hasLegacyHelpfulFeedback: Boolean(feedback && typeof feedback.rating !== 'undefined' && typeof feedback.wasCorrect === 'undefined'),
    legacyFeedbackSummary: feedback
      ? {
          rating: feedback.rating ?? null,
          comment: feedback.comment ?? null,
          timestamp: feedback.timestamp ?? null,
        }
      : null,
  });
}

fs.writeFileSync(VERIFIED_FILE, JSON.stringify(verified, null, 2));
fs.writeFileSync(REVIEW_FILE, JSON.stringify(reviewCandidates, null, 2));

console.log('Disease holdout build complete');
console.log('==============================');
console.log(`Verified holdout entries: ${verified.length}`);
console.log(`Review candidates: ${reviewCandidates.length}`);
console.log(`Verified file: ${VERIFIED_FILE}`);
console.log(`Review file: ${REVIEW_FILE}`);
