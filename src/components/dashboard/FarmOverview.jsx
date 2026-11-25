import { assessScanDecision } from '../../../shared/scanResultPolicy.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/i18n.jsx';
import { summarizeFarmScans } from '../../utils/farmOverview.js';
import { getEnhancementCopy } from '../../utils/enhancementCopy.js';

const FarmOverview = ({ scans = [], plots = [] }) => {
 const { language, t } = useLanguage();
 const [showAll, setShowAll] = useState(false);
 const copy = getEnhancementCopy(language);
 const groups = summarizeFarmScans(scans, plots);
 const ranked = [...groups].sort((a, b) => b.due.length - a.due.length || b.review - a.review || b.scans - a.scans);
 const crops = new Set(groups.flatMap(group => group.crops));
 const recurring = new Set(groups.flatMap(group => group.recurring.map(([issue]) => issue)));
 const due = groups.flatMap(group => group.due).sort((a, b) => a.followUp.nextCheckDate.localeCompare(b.followUp.nextCheckDate));
 const dueIds = new Set(due.map(scan => scan.id));
 const reviewScans = scans.filter(scan => !dueIds.has(scan.id) && assessScanDecision(scan).needsReview);
 const attention = [...due.map(scan => ({scan, due:true})), ...reviewScans.map(scan => ({scan, due:false}))];
 const renderAttention = ({scan, due: isDue}) => <li key={scan.id}><Link to={`/results/${scan.id}`}><strong>{scan.plantType ? `${scan.plantType} · ` : ''}{scan.disease || copy.scans}</strong><span>{plots.find(plot => plot.id === scan.plot_id)?.name || copy.unassigned}</span><span>{isDue ? t('common.dueAction') : t('common.reviewAction')}</span>{isDue && <time dateTime={scan.followUp.nextCheckDate}>{scan.followUp.nextCheckDate}</time>}</Link></li>;
 const renderCheck = scan => <li key={scan.id}><Link to={`/results/${scan.id}`}>{plots.find(plot => plot.id === scan.plot_id)?.name || copy.unassigned} · {scan.disease || copy.scans} · <time dateTime={scan.followUp.nextCheckDate}>{scan.followUp.nextCheckDate}</time></Link></li>;
 return <section className="farm-overview app-surface" aria-label={copy.overview}>
  <h2>{copy.overview}</h2>
  {!scans.length && <div className="farm-overview-empty"><p>{copy.noScans}</p><Link className="btn btn-primary" to="/?scan=true">{t('common.startCheck')}</Link></div>}
  {scans.length > 0 && <section className="farm-attention"><h3>{t('common.attentionTitle')}</h3>{attention.length ? <><ul>{attention.slice(0,5).map(renderAttention)}</ul>{attention.length > 5 && <details><summary>{t('common.attentionTitle')} (+{attention.length-5})</summary><ul>{attention.slice(5).map(renderAttention)}</ul></details>}</> : <p>{t('common.nothingDue')}</p>}</section>}
  <p className="ui-muted">{copy.sampleNote}</p>
  <div className="farm-overview-totals">
   <p><strong>{crops.size}</strong> {copy.crops}</p>
   <p><strong>{recurring.size}</strong> {copy.recurring}</p>
   <p><strong>{due.length}</strong> {copy.due}</p>
  </div>
  <div className="farm-overview-grid">{(showAll ? ranked : ranked.slice(0, 3)).map(group => <article key={group.id} className="ui-card">
   <h3>{group.name || copy.unassigned}</h3>
   <p>{group.scans} {copy.scans} · {group.review} {copy.review} · {group.due.length} {copy.due}</p>
   <details><summary>{copy.plotDetails}</summary>
    <h4>{copy.crops}</h4><p>{group.crops.join(', ') || '—'}</p>
    <h4>{copy.recurring}</h4>
    {group.recurring.length ? <ul>{group.recurring.map(([issue,count]) => <li key={issue}>{issue} · {count}</li>)}</ul> : <p>{copy.noRecurring}</p>}
    <h4>{copy.due} ({group.due.length})</h4>
    {group.due.length ? <ul>{group.due.slice(0, 5).map(renderCheck)}</ul> : <p>—</p>}
    {group.due.length > 5 && <details><summary>{copy.due} (+{group.due.length - 5})</summary><ul>{group.due.slice(5).map(renderCheck)}</ul></details>}
   </details>
  </article>)}</div>
  {!showAll && groups.length > 3 && <div className="ui-action-row"><button className="btn btn-secondary" onClick={() => setShowAll(true)}>{copy.viewAll} ({groups.length})</button></div>}
 </section>;
};
export default FarmOverview;
