import { describe, it, expect } from 'vitest';
import { getUiCopy, isFollowUpDue } from './uiCopy.js';
describe('UI follow-up discovery', () => {
 const today = new Date(2026, 9, 6, 12);
 it('includes today and overdue reminders but excludes future dates', () => {
  for (const date of ['2026-10-05', '2026-10-06']) expect(isFollowUpDue({followUp:{nextCheckDate:date}}, today)).toBe(true);
  expect(isFollowUpDue({followUp:{nextCheckDate:'2026-10-07'}}, today)).toBe(false);
 });
 it('does not remind for resolved follow-ups or missing dates', () => {
  expect(isFollowUpDue({followUp:{nextCheckDate:'2026-10-05',history:[{outcome:'resolved'}]}},today)).toBe(false);
  expect(isFollowUpDue({},today)).toBe(false);
 });
 it('keeps translated control labels aligned', () => {
  for (const language of ['ms','zh']) expect(Object.keys(getUiCopy(language))).toEqual(Object.keys(getUiCopy('en')));
 });
});
