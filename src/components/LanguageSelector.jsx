import { useLanguage } from '../i18n/i18n.jsx';
import './LanguageSelector.css';

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'en', name: 'English', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
    { code: 'ms', name: 'Bahasa Malaysia', flag: '\uD83C\uDDF2\uD83C\uDDFE' },
    { code: 'zh', name: '\u4E2D\u6587', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
  ];

  return (
    <div className="language-selector">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="language-dropdown"
        aria-label="Language selector"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
