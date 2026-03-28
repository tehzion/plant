import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

vi.mock('lucide-react', () => {
    const IconStub = (props) => React.createElement('svg', props);
    const iconNames = [
        'AlertCircle',
        'AlertTriangle',
        'Apple',
        'ArrowLeft',
        'ArrowRight',
        'ArrowRight',
        'BarChart2',
        'Bean',
        'Bell',
        'BookOpen',
        'BrainCircuit',
        'Bug',
        'Building2',
        'Calendar',
        'CalendarDays',
        'CalendarRange',
        'Camera',
        'Carrot',
        'Check',
        'CheckCircle',
        'CheckCircle2',
        'CheckSquare',
        'ChevronDown',
        'ChevronLeft',
        'ChevronRight',
        'ChevronUp',
        'CircleDot',
        'ClipboardList',
        'Clock',
        'Cloud',
        'CloudLightning',
        'CloudRain',
        'CloudSun',
        'Database',
        'DollarSign',
        'Download',
        'Droplet',
        'Droplets',
        'ExternalLink',
        'FileText',
        'Flame',
        'FlaskConical',
        'Flower2',
        'History',
        'Home',
        'Image',
        'Info',
        'Leaf',
        'Lightbulb',
        'Loader',
        'Loader2',
        'Lock',
        'LogOut',
        'Mail',
        'Map',
        'MapPin',
        'MessageSquareWarning',
        'Microscope',
        'PackageX',
        'Phone',
        'Pill',
        'Plus',
        'RefreshCw',
        'RotateCcw',
        'Save',
        'Scale',
        'ScanEye',
        'ScanLine',
        'Search',
        'Send',
        'Share2',
        'Shield',
        'ShieldCheck',
        'ShoppingBag',
        'ShoppingCart',
        'Snowflake',
        'Sparkles',
        'Sprout',
        'Sun',
        'ThermometerSun',
        'Trash2',
        'TrendingUp',
        'TreeDeciduous',
        'TreePalm',
        'Upload',
        'User',
        'Users',
        'Wifi',
        'WifiOff',
        'Wheat',
        'X',
        'XCircle',
        'Zap',
    ];
    const module = {
        __esModule: true,
        default: IconStub,
        ...Object.fromEntries(iconNames.map((name) => [name, IconStub])),
    };

    return module;
});

if (!window.matchMedia) {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    });
}

if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

if (!window.scrollTo) {
    window.scrollTo = () => {};
}
