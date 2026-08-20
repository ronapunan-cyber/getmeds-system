import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';

/**
 * ProductAutocomplete Component
 * 
 * @param {Array} products - Master product list cached via React Query
 * @param {Function} onSelect - Callback when user selects a product: onSelect(product)
 * @param {string} placeholder - Input placeholder text
 * @param {boolean} disabled - Whether the input is disabled
 */
const ProductAutocomplete = ({ 
  products = [], 
  onSelect, 
  placeholder = "Search product by name, SKU, or category...", 
  disabled = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derived filtered array based on searchTerm
  const filteredProducts = products.filter((product) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.name?.toLowerCase().includes(term) ||
      product.sku?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
  });

  const handleSelect = (product) => {
    if (onSelect) {
      onSelect(product);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Search Input Field */}
      <div className="relative">
        <Search className="w-4 h-4 text-ink-secondary absolute left-3 top-3 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-8 py-2 text-sm text-ink-primary font-medium placeholder-ink-secondary/50 focus:outline-none focus:border-getmeds-blue focus:ring-1 focus:ring-getmeds-blue shadow-2xs transition-colors disabled:opacity-50"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-ink-primary rounded-full transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-20 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          {filteredProducts.length === 0 ? (
            <li className="px-4 py-3 text-center text-xs text-ink-secondary">
              No products found matching <span className="font-semibold text-ink-primary">"{searchTerm}"</span>
            </li>
          ) : (
            filteredProducts.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(product)}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface flex items-center justify-between transition-colors focus:bg-surface focus:outline-none"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold text-ink-primary truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-ink-secondary bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                        {product.sku}
                      </span>
                      {product.category && (
                        <span className="text-[11px] text-ink-secondary/70">
                          {product.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-getmeds-blue font-mono">
                      ₱{Number(product.unit_price || 0).toFixed(2)}
                    </p>
                    <span className="text-[10px] text-ink-secondary uppercase">
                      per {product.unit || 'unit'}
                    </span>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default ProductAutocomplete;
