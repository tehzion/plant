import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import './LanguageSelector.css';
import { getEnhancementCopy } from '../utils/enhancementCopy.js';

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 480px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const media = window.matchMedia('(max-width: 480px)');
    const updateMode = (event) => setIsCompact(event.matches);

    setIsCompact(media.matches);

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateMode);
      return () => media.removeEventListener('change', updateMode);
    }

    media.addListener(updateMode);
    return () => media.removeListener(updateMode);
  }, []);

  const languages = [
    { code: 'en', name: isCompact ? 'EN' : 'English' },
    { code: 'ms', name: isCompact ? 'BM' : 'Bahasa Melayu' },
    { code: 'zh', name: '\u4E2D\u6587' },
  ];

  return (
    <div className="language-selector">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="language-dropdown"
        aria-label={getEnhancementCopy(language).languageLabel}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
