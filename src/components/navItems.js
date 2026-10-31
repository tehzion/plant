import { BookOpen, ClipboardCheck, History, Home, ScanLine, ShoppingBag, Sprout } from 'lucide-react';
import { STORE_URL } from '../utils/store.js';

export const SCAN_PATH = '/?scan=true';

// Shared by the desktop header and the mobile bottom bar so both show the
// same workflows in the same order. `mobile` marks the five bottom-bar items.
export const NAV_ITEMS = [
    { id: 'home', to: '/', labelKey: 'nav.home', fallback: 'Home', icon: Home, mobile: true },
    { id: 'check', to: SCAN_PATH, labelKey: 'nav.checkPlant', shortKey: 'nav.check', fallback: 'Check plant health', icon: ScanLine, mobile: true, primary: true },
    { id: 'history', to: '/history', labelKey: 'nav.history', fallback: 'History', icon: History, mobile: true },
    { id: 'farm', to: '/profile', labelKey: 'nav.farm', fallback: 'My farm', icon: Sprout, mobile: true },
    { id: 'mygap', to: '/mygap', labelKey: 'nav.mygap', fallback: 'myGAP', icon: ClipboardCheck, mobile: true },
    { id: 'encyclopedia', to: '/encyclopedia', labelKey: 'nav.encyclopedia', fallback: 'Encyclopedia', icon: BookOpen },
    { id: 'products', href: STORE_URL, labelKey: 'nav.products', fallback: 'Products', icon: ShoppingBag, external: true },
];

export const isNavItemActive = (item, location) => {
    const isScan = location.pathname === '/' && location.search.includes('scan=true');
    if (item.id === 'check') return isScan;
    if (item.id === 'home') return location.pathname === '/' && !isScan;
    if (item.id === 'farm') return location.pathname.startsWith('/profile') || location.pathname.startsWith('/login');
    if (item.id === 'history') return location.pathname.startsWith('/history') || location.pathname.startsWith('/results');
    return Boolean(item.to) && location.pathname.startsWith(item.to);
};

// Detail pages get an explicit way back to the list they belong to.
export const getBackTarget = (pathname) => {
    if (pathname.startsWith('/results/')) return { to: '/history', labelKey: 'nav.backToHistory', fallback: 'Back to history' };
    if (pathname.startsWith('/nutrition')) return { to: -1, labelKey: 'nav.back', fallback: 'Back' };
    if (['/guide', '/encyclopedia', '/admin', '/onboarding'].some((path) => pathname.startsWith(path))) {
        return { to: '/', labelKey: 'nav.backToHome', fallback: 'Back to home', mobileOnly: true };
    }
    return null;
};
