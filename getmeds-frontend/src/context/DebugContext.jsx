import React, { createContext, useContext, useState, useEffect } from 'react';

const DebugContext = createContext();

export const DebugProvider = ({ children }) => {
  const [isDebug, setIsDebug] = useState(() => {
    const saved = localStorage.getItem('getmeds_debug_mode');
    return saved === 'true';
  });

  const toggleDebug = () => {
    setIsDebug(prev => {
      const next = !prev;
      localStorage.setItem('getmeds_debug_mode', String(next));
      return next;
    });
  };

  return (
    <DebugContext.Provider value={{ isDebug, setIsDebug, toggleDebug }}>
      {children}
    </DebugContext.Provider>
  );
};

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    return { isDebug: false, toggleDebug: () => {} };
  }
  return context;
};
