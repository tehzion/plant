import { CheckCircle, AlertTriangle } from 'lucide-react';
const StatusBadge = ({ tone = 'review', children, className = '' }) => <span className={`ui-status-badge ui-status-badge--${tone} ${className}`}>
 {tone === 'healthy' ? <CheckCircle size={12} aria-hidden="true" /> : <AlertTriangle size={12} aria-hidden="true" />}
 <span>{children}</span>
</span>;
export default StatusBadge;
