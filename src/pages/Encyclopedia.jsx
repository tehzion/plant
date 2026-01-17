import { useState } from 'react';
import { diseaseDatabase, searchDiseases, getDiseasesByCategory, getCategories } from '../data/diseaseDatabase';
import DiseaseCard from '../components/DiseaseCard';
import { useLanguage } from '../i18n/i18n.jsx';
import { BookOpen, Search, ArrowRight } from 'lucide-react';

const Encyclopedia = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...getCategories().sort((a, b) => {
    const labelA = (t(`encyclopedia.${a?.toLowerCase().replace(/ /g, '')}`) || a).toLowerCase();
    const labelB = (t(`encyclopedia.${b?.toLowerCase().replace(/ /g, '')}`) || b).toLowerCase();
    // Fallback to raw category if translation is missing (though we expect them to be there)
    const finalA = labelA.includes('encyclopedia.') ? a.toLowerCase() : labelA;
    const finalB = labelB.includes('encyclopedia.') ? b.toLowerCase() : labelB;
    return finalA.localeCompare(finalB);
  })];

  const getFilteredDiseases = () => {
    let diseases = diseaseDatabase;

    // Filter by category
    if (selectedCategory !== 'all') {
      diseases = getDiseasesByCategory(selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      diseases = searchDiseases(searchQuery);
    }

    return diseases;
  };

  const filteredDiseases = getFilteredDiseases();

  return (
    <div className="page" style={{ background: '#F9FAFB' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
        {/* Header */}
        <div className="encyclopedia-header">

          <h2 className="page-title">{t('encyclopedia.title')}</h2>
          <p className="page-subtitle">
            {t('encyclopedia.subtitle')}
          </p>
        </div>

        {/* Controls Card */}
        <div className="controls-card">
          {/* Search Bar */}
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

          {/* Category Filter */}
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

        {/* Results Count */}
        <div className="results-info">
          <p>{filteredDiseases.length} {t('encyclopedia.disease')}{filteredDiseases.length !== 1 ? 's' : ''} {t('encyclopedia.found')}</p>
        </div>

        {/* Disease Cards */}
        <div className="diseases-grid">
          {filteredDiseases.length > 0 ? (
            filteredDiseases.map(disease => (
              <DiseaseCard key={disease.id} disease={disease} />
            ))
          ) : (
            <div className="no-results">
              <div className="no-results-icon">
                <Search size={48} strokeWidth={1.5} />
              </div>
              <h3>{t('encyclopedia.noResults')}</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .encyclopedia-header {
          text-align: center;
          margin-bottom: 24px;
          padding-top: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }



        .page-title {
          font-size: 1.75rem;
          color: #1F2937; /* Darker gray for premium feel */
          margin-bottom: 8px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          font-size: 1rem;
          color: #6B7280;
          margin: 0;
          max-width: 600px;
        }

        .controls-card {
            background: white;
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.04);
            margin-bottom: 32px;
            border: 1px solid rgba(0,0,0,0.02);
            position: relative;
            z-index: 10;
        }

        .search-section {
          margin-bottom: 24px;
          position: relative;
        }

        .search-icon-wrapper {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: #9CA3AF;
            pointer-events: none;
            display: flex;
            align-items: center;
        }

        .search-input {
          width: 100%;
          padding: 16px 20px 16px 56px;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          font-size: 1rem;
          background: #F9FAFB;
          color: #1F2937;
          transition: all 0.2s ease;
          outline: none;
        }

        .search-input:focus {
            background: white;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 4px rgba(74, 124, 44, 0.1);
        }

        .category-wrapper {
            /* Mask overflow for nice fade effect on edges if scrollable */
            position: relative;
        }
        
        .category-filter {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 4px 4px 12px 4px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .category-filter::-webkit-scrollbar {
            display: none;
        }

        .filter-btn {
          padding: 10px 20px;
          background: #F3F4F6;
          border: 1px solid transparent;
          border-radius: 12px;
          font-family: var(--font-family);
          font-size: 0.9rem;
          font-weight: 600;
          color: #4B5563;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .filter-btn:hover {
          background: #E5E7EB;
          color: #1F2937;
          transform: translateY(-1px);
        }

        .filter-btn.active {
          background: var(--color-primary);
          color: white;
          box-shadow: 0 4px 12px rgba(74, 124, 44, 0.2);
          transform: translateY(-1px);
        }

        .results-info {
          margin-bottom: 16px;
          color: #6B7280;
          font-size: 0.9rem;
          padding-left: 8px;
          font-weight: 500;
        }

        .results-info p { margin: 0; }

        .diseases-grid {
            padding-bottom: 24px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
            gap: 20px;
            align-items: start;
        }

        .no-results {
          text-align: center;
          padding: 64px 24px;
          color: #6B7280;
          background: white;
          border-radius: 24px;
          border: 1px dashed #E5E7EB;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .no-results-icon {
            margin-bottom: 16px;
            color: #D1D5DB;
            background: #F3F4F6;
            padding: 20px;
            border-radius: 50%;
        }

        .no-results h3 {
            margin: 0 0 8px 0;
            color: #374151;
            font-size: 1.25rem;
        }

        @media (min-width: 640px) {
            .diseases-grid {
                 grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            }
        }
        
        @media (min-width: 1024px) {
            .diseases-grid {
                 grid-template-columns: repeat(3, 1fr);
                 gap: 24px;
            }
        }
      `}</style>
    </div>
  );
};

export default Encyclopedia;
