import { useLanguage } from '../i18n/i18n.jsx';

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ms', name: 'Bahasa Malaysia', flag: '🇲🇾' },
  ];

  return (
    <div className="language-selector">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="language-dropdown"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>

      <style>{`
        .language-selector {
          position: relative;
        }

        .language-dropdown {
          padding: var(--space-sm) var(--space-md);
          background: white;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          font-family: var(--font-family);
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          min-width: 180px;
        }

        .language-dropdown:hover {
          border-color: var(--color-primary);
        }

        .language-dropdown:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(95, 168, 62, 0.1);
        }

        @media (max-width: 768px) {
          .language-dropdown {
            min-width: 140px;
            font-size: var(--font-size-xs);
            padding: var(--space-xs) var(--space-sm);
          }
        }
      `}</style>
    </div>
  );
};

export default LanguageSelector;
