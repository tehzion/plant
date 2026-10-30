// Builds a per-plot, newest-first timeline from scans, their follow-up
// checks, myGAP logbook entries and daily notes. Pure, so it is easy to test.
const NO_PLOT = '__no_plot__';
const time = (value) => {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
};
const clean = (value) => (value == null ? '' : String(value).trim());

export const buildFarmTimeline = ({ scans = [], logs = [], notes = [], plots = [] } = {}) => {
    const plotNames = new Map(plots.map((plot) => [String(plot.id), clean(plot.name)]));
    // Logbook entries store the plot as free text; match it to a plot by name.
    const plotIdsByName = new Map(plots.map((plot) => [clean(plot.name).toLowerCase(), String(plot.id)]).filter(([name]) => name));
    const resolvePlot = (value) => {
        const raw = clean(value);
        if (!raw) return NO_PLOT;
        if (plotNames.has(raw)) return raw;
        return plotIdsByName.get(raw.toLowerCase()) || `name:${raw}`;
    };

    const events = [];
    for (const scan of scans) {
        const plot = resolvePlot(scan.plotId || scan.plot_id);
        events.push({ id: `scan-${scan.id}`, kind: 'scan', plot, at: scan.timestamp || scan.created_at,
            title: clean(scan.disease) || clean(scan.plantType), detail: clean(scan.plantType), scanId: scan.id });
        for (const check of scan.followUp?.history || []) {
            events.push({ id: `followup-${check.id}`, kind: 'followUp', plot, at: check.recordedAt || check.recorded_at,
                title: clean(check.outcome), detail: clean(check.note), scanId: scan.id });
        }
    }
    for (const log of logs) {
        events.push({ id: `log-${log.id}`, kind: 'log', plot: resolvePlot(log.plot_id), at: log.activity_date || log.timestamp || log.created_at,
            title: clean(log.type), detail: [clean(log.product_used), clean(log.quantity), clean(log.notes)].filter(Boolean).join(' · '),
            pending: log.syncStatus === 'pending' });
    }
    for (const note of notes) {
        events.push({ id: `note-${note.id}`, kind: 'note', plot: resolvePlot(note.plot_id), at: note.created_at || note.timestamp,
            title: clean(note.activity_type), detail: clean(note.note), pending: note.syncStatus === 'pending' });
    }

    const groups = new Map();
    for (const event of events.filter((item) => time(item.at))) {
        if (!groups.has(event.plot)) groups.set(event.plot, []);
        groups.get(event.plot).push(event);
    }
    return [...groups.entries()]
        .map(([plot, items]) => ({
            plot,
            name: plot === NO_PLOT ? '' : plot.startsWith('name:') ? plot.slice(5) : plotNames.get(plot) || plot,
            noPlot: plot === NO_PLOT,
            events: items.sort((a, b) => time(b.at) - time(a.at)),
        }))
        // Named plots first (most recent activity first), unassigned records last.
        .sort((a, b) => Number(a.noPlot) - Number(b.noPlot) || time(b.events[0]?.at) - time(a.events[0]?.at));
};
