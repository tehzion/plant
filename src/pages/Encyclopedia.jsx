import { useMemo, useState } from 'react';
import { diseaseDatabase, getDiseasesByCategory, getCategories } from '../data/diseaseDatabase';
import DiseaseCard from '../components/DiseaseCard';
import { useLanguage } from '../i18n/i18n.jsx';
import { Search } from 'lucide-react';
import './Encyclopedia.css';

const Encyclopedia = () => {
  const { t, label } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const safeLabel = (key, fallback) => {
    if (typeof label === 'function') return label(key, fallback);
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const getLocalizedValue = (field) => {
    if (!field) return '';
    if (typeof field === 'object') {
      return Object.values(field).filter(Boolean).join(' ');
    }
    return String(field);
  };

  const getCategoryLabel = (category) => {
    if (category === 'all') return safeLabel('encyclopedia.all', 'All');
    const key = `encyclopedia.${category?.toLowerCase().replace(/ /g, '')}`;
    return safeLabel(key, category);
  };

  const categories = useMemo(() => ['all', ...getCategories().sort((a, b) => {
    return getCategoryLabel(a).toLowerCase().localeCompare(getCategoryLabel(b).toLowerCase());
  })], [t, label]);

  const filteredDiseases = useMemo(() => {
    const baseDiseases = selectedCategory !== 'all'
      ? getDiseasesByCategory(selectedCategory)
      : diseaseDatabase;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return baseDiseases;

    return baseDiseases.filter((disease) => {
      const haystack = [
        getLocalizedValue(disease.name),
        getLocalizedValue(disease.symptoms),
        getLocalizedValue(disease.causes),
        getLocalizedValue(disease.pathogen),
        getLocalizedValue(disease.category),
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="page encyclopedia-page slide-up">
      <div className="encyclopedia-layout">
        <header className="encyclopedia-header">
          <h1 className="encyclopedia-page-title">{t('encyclopedia.title')}</h1>
          <p className="encyclopedia-page-subtitle">
            {t('encyclopedia.subtitle')}
          </p>
        </header>

        <section className="controls-card">
          <div className="search-section">
            <div className="search-icon-wrapper">
              <Search size={22} className="search-icon" strokeWidth={2} />
            </div>
            <input
              type="text"
              placeholder={t('encyclopedia.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="category-wrapper">
            <div className="superapp-shelf-container encyclopedia-category-shelf">
              {categories.map(category => {
                const isActive = selectedCategory === category;
                const labelText = getCategoryLabel(category);
                
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`filter-btn ${isActive ? 'active' : ''}`}
                  >
                    {labelText}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="results-info">
          <span className="superapp-stat-pill encyclopedia-results-pill">
            {filteredDiseases.length} {filteredDiseases.length === 1 ? t('encyclopedia.disease') : t('encyclopedia.diseases')} {t('encyclopedia.found')}
          </span>
        </div>

        <div className="diseases-grid">
          {filteredDiseases.length > 0 ? (
            filteredDiseases.map(disease => (
              <DiseaseCard key={disease.id} disease={disease} />
            ))
          ) : (
            <div className="no-results app-surface app-empty-state">
              <div className="no-results-icon app-icon-badge">
                <Search size={48} strokeWidth={1.5} />
              </div>
              <h3>{t('encyclopedia.noResults')}</h3>
              <p>{t('encyclopedia.filterHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Encyclopedia;
