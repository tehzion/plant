import { assessScanDecision } from '../../shared/scanResultPolicy.js';
import { isFollowUpDue } from './uiCopy.js';
export const summarizeFarmScans = (scans = [], plots = [], now = new Date()) => {
 const groups = new Map(plots.map(plot => [plot.id, { id: plot.id, name: plot.name, crops: new Set(), issues: new Map(), scans: 0, review: 0, due: [] }]));
 const unassigned = { id: 'unassigned', name: '', crops: new Set(), issues: new Map(), scans: 0, review: 0, due: [] };
 for (const scan of scans) {
  const group = groups.get(scan.plot_id) || unassigned;
  const decision = assessScanDecision(scan);
  group.scans++;
  if (decision.needsReview) group.review++;
  if (!decision.healthy) {
   if (scan.plantType) group.crops.add(scan.plantType);
   const issue = String(scan.disease || '').trim();
   if (issue) group.issues.set(issue, (group.issues.get(issue) || 0) + 1);
  }
  if (isFollowUpDue(scan, now)) group.due.push(scan);
 }
 return [...groups.values(), ...(unassigned.scans ? [unassigned] : [])].map(group => ({ ...group,
  crops: [...group.crops], recurring: [...group.issues].filter(([, count]) => count > 1).sort((a,b) => b[1]-a[1]),
  due: group.due.sort((a,b) => a.followUp.nextCheckDate.localeCompare(b.followUp.nextCheckDate)),
 }));
};
