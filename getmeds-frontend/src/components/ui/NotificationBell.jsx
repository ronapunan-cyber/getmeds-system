import React from 'react';
import { Bell } from 'lucide-react';

const NotificationBell = ({ count = 0, hasException = false, onClick }) => {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="relative p-2 text-ink-secondary hover:text-ink-primary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-getmeds-blue rounded-full transition-colors"
      title="System Notifications & Alerts"
    >
      <span className="sr-only">View notifications</span>
      <Bell className="h-5 w-5 text-ink-secondary" aria-hidden="true" />
      
      {/* Attention / Exception Red Dot */}
      {(hasException || count > 0) && (
        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-state-error opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-state-error ring-2 ring-white"></span>
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
