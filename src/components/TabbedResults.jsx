import React, { useEffect, useId, useRef, useState } from 'react';
import './TabbedResults.css';

const TabbedResults = ({ tabs, activeIndex, onTabChange }) => {
  const [internalTab, setInternalTab] = useState(0);
  const activeTab = activeIndex ?? internalTab;
  const setActiveTab = index => { setInternalTab(index); onTabChange?.(index); };
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const tabsRef = useRef(null);
  const tabId = useId();

  const handleKeyDown = (event, index) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(next);
    tabsRef.current.children[next]?.focus();
  };

  const checkScroll = () => {
    if (!tabsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
    const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(maxScrollLeft > 10 && scrollLeft < maxScrollLeft - 10);
    setHasScrolled(scrollLeft > 50);
  };

  useEffect(() => {
    if (!tabsRef.current) return;
    const activeElement = tabsRef.current.children[activeTab];
    if (activeElement) {
      tabsRef.current.scrollTo?.({
        left: Math.max(0, activeElement.offsetLeft - tabsRef.current.clientWidth / 2 + activeElement.offsetWidth / 2),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    }
  }, [activeTab]);

  useEffect(() => {
    const tabsElement = tabsRef.current;
    if (!tabsElement) return undefined;

    tabsElement.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    checkScroll();

    return () => {
      tabsElement.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  return (
    <div className="tabbed-results">
      <div
        className={`tab-headers-container app-surface ${canScrollLeft ? 'can-scroll-left' : ''} ${canScrollRight ? 'can-scroll-right' : ''} ${hasScrolled ? 'scrolled' : ''}`}
      >
        <div className="tab-headers" ref={tabsRef} role="tablist">
          {tabs.map((tab, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              id={`${tabId}-tab-${index}`}
              aria-controls={`${tabId}-panel-${index}`}
              aria-selected={activeTab === index}
              tabIndex={activeTab === index ? 0 : -1}
              onKeyDown={(event) => handleKeyDown(event, index)}
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

      <div className="tab-content" role="tabpanel" id={`${tabId}-panel-${activeTab}`} aria-labelledby={`${tabId}-tab-${activeTab}`} tabIndex={0}>
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

export default TabbedResults;
