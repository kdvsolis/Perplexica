import React, { useState, useRef } from 'react';

interface CitationPopupProps {
  children: React.ReactNode;
  content: string;
  onLinkClick?: () => void;
}

const CitationPopup: React.FC<CitationPopupProps> = ({ children, content, onLinkClick }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showPopup = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(true);
  };

  const hidePopup = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 100);
  };

  return (
    <span
      onMouseEnter={showPopup}
      onMouseLeave={hidePopup}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {visible && (
        <div
          className="z-50 absolute left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded shadow-lg p-2 text-xs max-w-xs min-w-[180px] text-black dark:text-white"
          style={{ top: '100%' }}
          onClick={e => {
            // Intercept clicks on links inside the popup
            if (onLinkClick && (e.target as HTMLElement).tagName === 'A') {
              e.preventDefault();
              onLinkClick();
            }
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      )}
    </span>
  );
};

export default CitationPopup;
