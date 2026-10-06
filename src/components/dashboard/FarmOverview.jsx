import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/i18n.jsx';
import { summarizeFarmScans } from '../../utils/farmOverview.js';
import { getEnhancementCopy } from '../../utils/enhancementCopy.js';
const FarmOverview = ({ scans = [], plots = [] }) => {
 const { language } = useLanguage();
 const copy = getEnhancementCopy(language);
 const groups = summarizeFarmScans(scans, plots);
 return <section className="farm-overview app-surface" aria-label={copy.overview}>
  <h2>{copy.overview}</h2><p className="ui-muted">{copy.sampleNote}</p>
  {!groups.length && <p>{copy.noScans}</p>}
  <div className="farm-overview-grid">{groups.map(group => <article key={group.id} className="ui-card">
   <h3>{group.name || copy.unassigned}</h3>
   <p>{group.scans} {copy.scans} · {group.review} {copy.review}</p>
   <h4>{copy.crops}</h4><p>{group.crops.join(', ') || '—'}</p>
   <h4>{copy.recurring}</h4>
   {group.recurring.length ? <ul>{group.recurring.map(([issue,count]) => <li key={issue}>{issue} · {count}</li>)}</ul> : <p>{copy.noRecurring}</p>}
   <h4>{copy.due} ({group.due.length})</h4>
   {group.due.length ? <ul>{group.due.map(scan => <li key={scan.id}><Link to={`/results/${scan.id}`}>{scan.disease || copy.scans} · <time dateTime={scan.followUp.nextCheckDate}>{scan.followUp.nextCheckDate}</time></Link></li>)}</ul> : <p>—</p>}
  </article>)}</div>
 </section>;
};
export default FarmOverview;
