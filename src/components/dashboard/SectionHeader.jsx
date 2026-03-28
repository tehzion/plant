const SectionHeader = ({ icon, title, count, action }) => (
    <div className="udp-section-header">
        {icon && <span className="udp-sh-icon">{icon}</span>}
        <span className="udp-sh-title">{title}</span>
        {count !== undefined && <span className="udp-sh-count">{count}</span>}
        {action && <span className="udp-sh-action">{action}</span>}
    </div>
);

export default SectionHeader;
