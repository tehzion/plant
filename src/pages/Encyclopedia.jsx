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
    <div className="page encyclopedia-page slide-up">
      <div className="encyclopedia-layout">
        <header className="encyclopedia-header">
          <h1 className="page-title">{t('encyclopedia.title')}</h1>
          <p className="page-subtitle">
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
            <div className="superapp-shelf-container" style={{ padding: '4px 0 8px 0', gap: '8px' }}>
              {categories.map(category => {
                const isActive = selectedCategory === category;
                const labelText = category === 'all'
                  ? t('encyclopedia.all')
                  : (t(`encyclopedia.${category.toLowerCase().replace(/ /g, '')}`)?.includes('encyclopedia.') ? category : t(`encyclopedia.${category.toLowerCase().replace(/ /g, '')}`));
                
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`filter-btn ${isActive ? 'active' : ''}`}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '14px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      border: '1.5px solid',
                      borderColor: isActive ? 'var(--color-primary)' : '#e2e8f0',
                      background: isActive ? 'var(--color-brand-mist)' : '#f8fafc',
                      color: isActive ? 'var(--color-primary)' : '#64748b',
                      fontFamily: 'var(--font-heading)'
                    }}
                  >
                    {labelText}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="results-info">
          <span className="superapp-stat-pill" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
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
