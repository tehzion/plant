import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/i18n.jsx';
import { summarizeFarmScans } from '../../utils/farmOverview.js';
import { getEnhancementCopy } from '../../utils/enhancementCopy.js';

const FarmOverview = ({ scans = [], plots = [] }) => {
 const { language } = useLanguage();
 const [showAll, setShowAll] = useState(false);
 const copy = getEnhancementCopy(language);
 const groups = summarizeFarmScans(scans, plots);
 const ranked = [...groups].sort((a, b) => b.due.length - a.due.length || b.review - a.review || b.scans - a.scans);
 const crops = new Set(groups.flatMap(group => group.crops));
 const recurring = new Set(groups.flatMap(group => group.recurring.map(([issue]) => issue)));
 const due = groups.flatMap(group => group.due).sort((a, b) => a.followUp.nextCheckDate.localeCompare(b.followUp.nextCheckDate));
 const renderCheck = scan => <li key={scan.id}><Link to={`/results/${scan.id}`}>{plots.find(plot => plot.id === scan.plot_id)?.name || copy.unassigned} · {scan.disease || copy.scans} · <time dateTime={scan.followUp.nextCheckDate}>{scan.followUp.nextCheckDate}</time></Link></li>;
 return <section className="farm-overview app-surface" aria-label={copy.overview}>
  <h2>{copy.overview}</h2><p className="ui-muted">{copy.sampleNote}</p>
  {!scans.length && <p>{copy.noScans}</p>}
  <div className="farm-overview-totals">
   <p><strong>{crops.size}</strong> {copy.crops}</p>
   <p><strong>{recurring.size}</strong> {copy.recurring}</p>
   <p><strong>{due.length}</strong> {copy.due}</p>
  </div>
  {due.length > 0 && <div className="ui-card">
   <h3>{copy.due}</h3><ul>{due.slice(0, 5).map(renderCheck)}</ul>
   {due.length > 5 && <details><summary>{copy.due} (+{due.length - 5})</summary><ul>{due.slice(5).map(renderCheck)}</ul></details>}
  </div>}
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
