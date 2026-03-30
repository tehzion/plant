import { useState } from 'react';
import { diseaseDatabase, searchDiseases, getDiseasesByCategory, getCategories } from '../data/diseaseDatabase';
import DiseaseCard from '../components/DiseaseCard';
import { useLanguage } from '../i18n/i18n.jsx';
import { Search } from 'lucide-react';
import './Encyclopedia.css';

const Encyclopedia = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...getCategories().sort((a, b) => {
    const labelA = (t(`encyclopedia.${a?.toLowerCase().replace(/ /g, '')}`) || a).toLowerCase();
    const labelB = (t(`encyclopedia.${b?.toLowerCase().replace(/ /g, '')}`) || b).toLowerCase();
    const finalA = labelA.includes('encyclopedia.') ? a.toLowerCase() : labelA;
    const finalB = labelB.includes('encyclopedia.') ? b.toLowerCase() : labelB;
    return finalA.localeCompare(finalB);
  })];

  const getFilteredDiseases = () => {
    let diseases = diseaseDatabase;

    if (selectedCategory !== 'all') {
      diseases = getDiseasesByCategory(selectedCategory);
    }

    if (searchQuery) {
      diseases = searchDiseases(searchQuery);
    }

    return diseases;
  };

  const filteredDiseases = getFilteredDiseases();

  return (
    <div className="page encyclopedia-page">
      <div className="container encyclopedia-layout">
        <div className="encyclopedia-header">
          <h2 className="page-title">{t('encyclopedia.title')}</h2>
          <p className="page-subtitle">
            {t('encyclopedia.subtitle')}
          </p>
        </div>

        <div className="controls-card app-surface app-surface--soft">
          <div className="search-section">
            <div className="search-icon-wrapper">
              <Search size={20} className="search-icon" />
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
            <div className="category-filter">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                >
                  {category === 'all'
                    ? t('encyclopedia.all')
                    : (t(`encyclopedia.${category.toLowerCase().replace(/ /g, '')}`)?.includes('encyclopedia.') ? category : t(`encyclopedia.${category.toLowerCase().replace(/ /g, '')}`))
                  }
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="results-info">
          <p className="app-pill">
            {filteredDiseases.length} {filteredDiseases.length === 1 ? t('encyclopedia.disease') : t('encyclopedia.diseases')} {t('encyclopedia.found')}
          </p>
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
