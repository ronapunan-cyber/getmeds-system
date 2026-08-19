import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const StopIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10.7 2h10.6L30 10.7v10.6L21.3 30H10.7L2 21.3V10.7L10.7 2z"
      fill="#DC2626"
    />
    <text x="16" y="22" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="sans-serif">!</text>
  </svg>
);

const ErrorMessage = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (message) {
      setShouldRender(true);
      const inTimer = setTimeout(() => setIsVisible(true), 10);
      
      const outTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setShouldRender(false);
          if (onClose) onClose();
        }, 300);
      }, 3500);
      
      return () => {
        clearTimeout(inTimer);
        clearTimeout(outTimer);
      };
    }
  }, [message, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShouldRender(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!shouldRender || !message) return null;

  return (
    <div className={`fixed top-8 right-8 z-50 transition-all duration-300 ease-in-out transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className="rounded-2xl bg-gray-100 px-5 py-4 shadow-lg min-w-[320px] flex items-center gap-4">
        <div className="flex-shrink-0">
          <StopIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">Something went wrong</h3>
          <p className="text-[13px] text-gray-500 mt-0.5 leading-tight">{message}</p>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ErrorMessage;
