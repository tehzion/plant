import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { isFollowUpDue } from '../../utils/uiCopy.js';
import { dismissHarvestReminder, dueHarvestReminders, getReminderOptIn, localDateKey, setReminderOptIn } from '../../utils/farmerPrefs.js';
import './DueReminders.css';

const NOTIFIED_KEY = 'plant_reminders_notified_on';

// Browsers cannot schedule notifications without a push server, so reminders
// are shown here and, if the farmer allows it, as one phone notification the
// first time the app is opened on a due day.
const notifyOncePerDay = async (title, body) => {
    try {
        if (localStorage.getItem(NOTIFIED_KEY) === localDateKey()) return;
        const registration = await navigator.serviceWorker?.getRegistration?.();
        if (registration?.showNotification) await registration.showNotification(title, { body, tag: 'plant-reminders', icon: '/icon-192.png' });
        else new Notification(title, { body });
        localStorage.setItem(NOTIFIED_KEY, localDateKey());
    } catch { /* notifications are a convenience only */ }
};

const DueReminders = ({ scans = [], onOpenScan }) => {
    const { t } = useLanguage();
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    const [harvest, setHarvest] = useState(() => dueHarvestReminders());
    const [optedIn, setOptedIn] = useState(() => getReminderOptIn());
    const [message, setMessage] = useState('');
    const supportsNotifications = typeof window !== 'undefined' && 'Notification' in window;

    const items = useMemo(() => [
        ...(Array.isArray(scans) ? scans : []).filter((scan) => isFollowUpDue(scan)).map((scan) => ({
            id: `followup-${scan.id}`,
            text: label('assessment.ux.reminderFollowUp', 'Re-check: {name}').replace('{name}', [scan.plantType, scan.disease].filter(Boolean).join(' – ')),
            open: onOpenScan ? () => onOpenScan(scan.id) : null,
        })),
        ...harvest.map((item) => ({
            id: item.id,
            text: label('assessment.ux.reminderHarvest', 'Safe to harvest from today: {name}').replace('{name}', item.name),
            dismiss: () => { dismissHarvestReminder(item.id); setHarvest(dueHarvestReminders()); },
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [scans, harvest, t]);

    useEffect(() => {
        if (!optedIn || !items.length || !supportsNotifications || Notification.permission !== 'granted') return;
        notifyOncePerDay(label('assessment.ux.remindersTitle', 'Due today'), items.map((item) => item.text).join('\n'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optedIn, items.length]);

    if (!items.length) return null;

    const enable = async () => {
        const permission = await Notification.requestPermission().catch(() => 'denied');
        if (permission === 'granted') {
            setReminderOptIn(true); setOptedIn(true);
            setMessage(label('assessment.ux.remindersEnabled', 'Reminders are on.'));
        } else {
            setMessage(label('assessment.ux.remindersBlocked', 'Notifications are blocked in your browser settings.'));
        }
    };

    return (
        <section className="due-reminders app-surface" aria-labelledby="due-reminders-title">
            <h3 id="due-reminders-title"><CalendarCheck size={20} aria-hidden="true" /> {label('assessment.ux.remindersTitle', 'Due today')}</h3>
            <ul>
                {items.map((item) => (
                    <li key={item.id}>
                        {item.open
                            ? <button type="button" className="due-reminders__item" onClick={item.open}>{item.text}</button>
                            : <span className="due-reminders__item">{item.text}</span>}
                        {item.dismiss && <button type="button" className="due-reminders__done" onClick={item.dismiss}>{label('assessment.ux.dismiss', 'Done')}</button>}
                    </li>
                ))}
            </ul>
            {supportsNotifications && !optedIn && (
                <button type="button" className="btn btn-secondary due-reminders__enable" onClick={enable}>
                    <Bell size={18} aria-hidden="true" /> {label('assessment.ux.remindersEnable', 'Remind me on this phone')}
                </button>
            )}
            {message && <p role="status" className="due-reminders__message">{message}</p>}
        </section>
    );
};

export default DueReminders;
