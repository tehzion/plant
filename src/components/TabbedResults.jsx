import { useState, useRef, useEffect } from 'react';

const TabbedResults = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const tabsRef = useRef(null);
  const containerRef = useRef(null);

  // Check scroll position
  const checkScroll = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setHasScrolled(scrollLeft > 50);
    }
  };

  // Auto-scroll active tab into view
  useEffect(() => {
    if (tabsRef.current) {
      const activeElement = tabsRef.current.children[activeTab];
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center' // Center the active tab
        });
      }
    }
  }, [activeTab]);

  // Listen to scroll events
  useEffect(() => {
    const tabsElement = tabsRef.current;
    if (tabsElement) {
      tabsElement.addEventListener('scroll', checkScroll);
      checkScroll(); // Initial check
      return () => tabsElement.removeEventListener('scroll', checkScroll);
    }
  }, []);

  return (
    <div className="tabbed-results">
      {/* Tab Headers - Sticky & Scrollable */}
      <div 
        ref={containerRef}
        className={`tab-headers-container ${
          canScrollLeft ? 'can-scroll-left' : ''
        } ${
          hasScrolled ? 'scrolled' : ''
        }`}
      >
        <div className="tab-headers" ref={tabsRef}>
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`tab-header ${activeTab === index ? 'active' : ''}`}
            >
              <span className="tab-content-wrapper">
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-title">{tab.title}</span>
                {tab.badge && <span className="tab-badge">{tab.badge}</span>}
              </span>
              {/* Active Indicator (Underline) */}
              {activeTab === index && <div className="active-indicator" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {tabs[activeTab]?.content}
      </div>

      <style>{`
        .tabbed-results {
          background: transparent; /* Seamless with page */
          width: 100%;
          border-radius: 0;
          overflow: visible;
        }

        .tab-headers-container {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          margin-bottom: var(--space-sm);
          /* Negative margins to span full width of container if inside filtered View */
          margin-left: calc(-1 * var(--space-sm));
          margin-right: calc(-1 * var(--space-sm));
          padding-left: var(--space-sm);
          padding-right: var(--space-sm);
          overflow: hidden; /* Ensure mask stays within bounds */
        }
        
        /* Gradient Masks for Scroll Hints - Both Sides */
        .tab-headers-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: 24px;
            background: linear-gradient(to left, rgba(255,255,255,0), rgba(255,255,255,0.95));
            pointer-events: none;
            z-index: 101;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .tab-headers-container.can-scroll-left::before {
            opacity: 1;
        }

        .tab-headers-container::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 60px;
            background: linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.95));
            pointer-events: none;
            z-index: 101;
        }
        
        /* Animated scroll hint chevron */
        .tab-headers-container::after {
            content: '›';
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--color-primary);
            animation: pulse-chevron 2s ease-in-out infinite;
        }
        
        .tab-headers-container.scrolled::after {
            opacity: 0.3;
            animation: none;
        }
        
        @keyframes pulse-chevron {
            0%, 100% { 
                opacity: 0.4;
                transform: translateX(0);
            }
            50% { 
                opacity: 1;
                transform: translateX(4px);
            }
        }

        .tab-headers {
          display: flex;
          overflow-x: auto;
          scrollbar-width: none; /* Hide scrollbar Firefox */
          -ms-overflow-style: none; /* Hide scrollbar IE/Edge */
          gap: var(--space-md);
          padding: 0 80px 0 var(--space-xs); /* Increased right padding to show peek */
          scroll-padding: 0 80px 0 0; /* Ensure proper scroll snap */
        }

        .tab-headers::-webkit-scrollbar {
          display: none; /* Hide scrollbar Chrome/Safari */
        }

        .tab-header {
          flex: 0 0 auto; /* Don't shrink */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 8px; /* Smaller padding */
          background: transparent;
          border: none;
          color: var(--color-text-light);
          font-family: var(--font-family);
          font-size: 0.75rem; /* Smaller font */
          font-weight: 500;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
          min-width: 70px; /* Smaller min-width */
        }

        .tab-content-wrapper {
            display: flex;
            align-items: center;
            gap: 6px;
            padding-bottom: 6px; /* Space for underline */
        }

        .tab-header:hover {
          color: var(--color-primary);
        }

        .tab-header.active {
          color: var(--color-primary);
          font-weight: 600;
        }

        .active-indicator {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: var(--color-primary);
            border-top-left-radius: 3px;
            border-top-right-radius: 3px;
            animation: expand 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes expand {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
        }

        .tab-icon {
          font-size: 1.1rem; /* Smaller icons */
          display: flex;
          align-items: center;
        }

        .tab-badge {
          position: absolute;
          top: 6px;
          right: -4px;
          background: var(--color-severe);
          color: white;
          font-size: 10px;
          font-weight: bold;
          height: 16px;
          min-width: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 99px;
          border: 2px solid white;
          padding: 0 4px;
        }

        .tab-content {
          padding: var(--space-xs) 0; /* Reduced padding */
          animation: fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (min-width: 768px) {
           .tab-headers-container {
               border-radius: var(--radius-xl);
               margin: 0 0 var(--space-xl) 0;
               padding: 0;
               /* Undo negative margins */
               margin-left: 0;
               margin-right: 0;
           }

           .tab-headers {
               justify-content: center;
           }

           .tab-header {
               padding: var(--space-md) var(--space-xl);
               min-width: auto;
           }
        }

        @media (max-width: 480px) {
            .tab-title {
                font-size: 0.85rem;
            }
        }
      `}</style>
    </div>
  );
};

export default TabbedResults;
