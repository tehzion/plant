import { useState, useRef, useEffect } from 'react';

const TabbedResults = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabsRef = useRef(null);

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

  return (
    <div className="tabbed-results">
      {/* Tab Headers - Sticky & Scrollable */}
      <div className="tab-headers-container">
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
          top: 0; /* Align with top if needed, or offset */
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          margin-bottom: var(--space-md);
          /* Negative margins to span full width of container if inside filtered View */
          margin-left: -var(--space-md);
          margin-right: -var(--space-md);
          padding-left: var(--space-md);
          padding-right: var(--space-md);
        }

        .tab-headers {
          display: flex;
          overflow-x: auto;
          scrollbar-width: none; /* Hide scrollbar Firefox */
          -ms-overflow-style: none; /* Hide scrollbar IE/Edge */
          gap: var(--space-md);
          padding: 0 var(--space-xs);
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
          padding: var(--space-md) var(--space-sm);
          background: transparent;
          border: none;
          color: var(--color-text-light);
          font-family: var(--font-family);
          font-size: var(--font-size-sm);
          font-weight: 500;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
          min-width: 80px; /* Readable touch target */
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
          font-size: 1.25rem;
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
