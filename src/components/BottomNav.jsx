import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { NAV_ITEMS, isNavItemActive } from './navItems.js';
import './BottomNav.css';

// Scan sits in the centre slot, like a wallet app's scan button.
const MOBILE_ORDER = ['home', 'history', 'check', 'farm', 'mygap'];
const MOBILE_ITEMS = MOBILE_ORDER.map((id) => NAV_ITEMS.find((item) => item.id === id)).filter(Boolean);

const BottomNav = () => {
    const location = useLocation();
    const { label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);

    return (
        <nav className="bottom-nav" aria-label={label('nav.primary', 'Main navigation')}>
            <div className="bottom-nav-shell">
                {MOBILE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isNavItemActive(item, location);
                    return (
                        <Link
                            key={item.id}
                            to={item.to}
                            className={`nav-item ${item.primary ? 'nav-item--scan' : ''} ${active ? 'active' : ''}`}
                            aria-current={active ? 'page' : undefined}
                        >
                            <span className="nav-item-icon">
                                <Icon size={item.primary ? 28 : 20} strokeWidth={item.primary ? 2.2 : 1.85} aria-hidden="true" />
                            </span>
                            <span className="nav-item-label">{label(item.shortKey || item.labelKey, item.fallback)}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
