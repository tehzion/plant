import React, { useEffect, useRef, useState } from 'react';
import './TabbedResults.css';

const TabbedResults = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const tabsRef = useRef(null);
  const containerRef = useRef(null);

  const checkScroll = () => {
    if (!tabsRef.current) return;
    const { scrollLeft } = tabsRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setHasScrolled(scrollLeft > 50);
  };

  useEffect(() => {
    if (!tabsRef.current) return;
    const activeElement = tabsRef.current.children[activeTab];
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  useEffect(() => {
    const tabsElement = tabsRef.current;
    if (!tabsElement) return undefined;

    tabsElement.addEventListener('scroll', checkScroll);
    checkScroll();

    return () => tabsElement.removeEventListener('scroll', checkScroll);
  }, []);

  return (
    <div className="tabbed-results">
      <div
        ref={containerRef}
        className={`tab-headers-container app-surface ${canScrollLeft ? 'can-scroll-left' : ''} ${hasScrolled ? 'scrolled' : ''}`}
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
              {activeTab === index && <div className="active-indicator" />}
            </button>
          ))}
        </div>
      </div>

      <div className="tab-content">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

export default TabbedResults;
