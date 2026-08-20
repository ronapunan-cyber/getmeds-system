import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import { 
  Plus, 
  Trash2, 
  ShoppingCart, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Send, 
  Sparkles,
  Building2,
  Package,
  Truck,
  Search,
  X,
  ChevronDown
} from 'lucide-react';
import { useDebug } from '../../context/DebugContext';

const NewOrderPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isDebug } = useDebug();

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [customerType, setCustomerType] = useState('credit');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  
  // Dynamic Product Search & Selection States
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Line items in order
  const [items, setItems] = useState([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const { data: customersRes } = useQuery({
    queryKey: ['customers'],
    queryFn: () => client.get('/api/orders/meta/customers').then(r => r.data)
  });
  const { data: productsRes } = useQuery({
    queryKey: ['products'],
    queryFn: () => client.get('/api/orders/meta/products').then(r => r.data)
  });

  const customers = customersRes?.data?.customers || [];
  const products = productsRes?.data?.products || [];

  const selectedCustomer = customers.find(c => String(c.id) === String(customerId));

  // Close floating dropdown panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Customer Selection
  const handleCustomerChange = (id) => {
    setCustomerId(id);
    const c = customers.find(cust => String(cust.id) === String(id));
    if (c) {
      setCustomerType(c.type || 'credit');
      if (c.address) {
        setDeliveryAddress(c.address);
      }
    }
  };

  // Client-Side Filter on Products Array
  const filteredProducts = products.filter(p => {
    if (!productSearchQuery.trim()) return true;
    const query = productSearchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    );
  });

  // Handle Product Select from Floating Dropdown
  const handleSelectProduct = (product) => {
    setSelectedProductId(String(product.id));
    setProductSearchQuery(`${product.name} (${product.sku})`);
    setIsProductDropdownOpen(false);
  };

  // Clear current product search input
  const handleClearProductSearch = () => {
    setSelectedProductId('');
    setProductSearchQuery('');
    setIsProductDropdownOpen(true);
  };

  // DEBUG Fast-Track Auto-Fill
  const handleAutoFillFastTrack = () => {
    if (!customers.length || !products.length) {
      toast.error('Products or customers are still loading...');
      return;
    }

    // Find St. Luke's or first hospital credit account
    const stLukes = customers.find(c => c.name?.toLowerCase().includes('luke')) || customers[0];
    
    setCustomerId(String(stLukes.id));
    setCustomerType(stLukes.type || 'credit');
    setDeliveryAddress(stLukes.address || "St. Luke's Medical Center - 279 E Rodriguez Sr. Ave, Quezon City");
    setDeliveryNotes('Deliver directly to Central Pharmacy Receiving Bay. Ref: PO-2026-0889.');

    // Auto-populate 2-3 sample products
    const sampleItems = [];
    if (products.length >= 1) {
      sampleItems.push({ product_id: String(products[0].id), quantity: 20 });
    }
    if (products.length >= 2) {
      sampleItems.push({ product_id: String(products[1].id), quantity: 10 });
    }
    if (products.length >= 3) {
      sampleItems.push({ product_id: String(products[2].id), quantity: 5 });
    }
    setItems(sampleItems);
    setSelectedProductId('');
    setProductSearchQuery('');
    setSelectedQuantity(1);
    setIsProductDropdownOpen(false);

    toast.success("⚡ St. Luke's Medical Center fast-track order auto-filled!", {
      icon: '🚀',
      duration: 3000
    });
  };

  // Add Item to table
  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error('Please search and select a product first');
      return;
    }
    if (selectedQuantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    // Check if item already exists in table
    const existingIndex = items.findIndex(i => String(i.product_id) === String(selectedProductId));
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += Number(selectedQuantity);
      setItems(updated);
      toast.success('Updated item quantity in table');
    } else {
      setItems([...items, { product_id: String(selectedProductId), quantity: Number(selectedQuantity) }]);
      toast.success('Product added to requisition table');
    }

    // Reset picker inputs
    setSelectedProductId('');
    setProductSearchQuery('');
    setSelectedQuantity(1);
    setIsProductDropdownOpen(false);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemQuantity = (index, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty < 1) return;
    const updated = [...items];
    updated[index].quantity = qty;
    setItems(updated);
  };

  const getProduct = (id) => products.find(p => String(p.id) === String(id));

  const getItemSubtotal = (item) => {
    const p = getProduct(item.product_id);
    return p ? (p.unit_price * (item.quantity || 0)) : 0;
  };

  const grandTotal = items.reduce((sum, item) => sum + getItemSubtotal(item), 0);

  // Form completion validation
  const isFormValid = Boolean(
    customerId && 
    deliveryAddress.trim() && 
    items.length > 0 && 
    items.every(i => i.product_id && Number(i.quantity) > 0)
  );

  // Order submission mutation
  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Create Draft
      const createRes = await client.post('/api/orders', {
        customer_id: parseInt(customerId),
        items: items.map(i => ({
          product_id: parseInt(i.product_id),
          quantity: parseInt(i.quantity)
        })),
        delivery_address: deliveryAddress,
        delivery_notes: deliveryNotes,
        customer_type: customerType
      });
      const newOrderId = createRes.data.data.order.id;

      // 2. Submit Draft directly to workflow state machine
      await client.post(`/api/orders/${newOrderId}/submit`);
      return createRes.data.data.order;
    },
    onSuccess: (order) => {
      toast.success(`Order ${order.getmeds_order_id} submitted! Routing: ${order.customer_type === 'direct' ? 'Finance Queue' : 'Dispatch Queue'} 🚀`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      qc.invalidateQueries({ queryKey: ['medrep-orders'] });
      navigate(`/orders/${order.id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to submit order');
    }
  });

  const handleOpenReview = (e) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error('Please complete all mandatory fields');
      return;
    }
    setIsReviewOpen(true);
  };

  const handleConfirmSubmit = () => {
    mutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header & Fast-Track Debug Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Create New Order</h1>
          <p className="text-sm text-ink-secondary mt-1">
            Initiate a new sales requisition for customer verification and fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Debug Auto-Fill Fast-Track Button */}
          <button
            type="button"
            onClick={handleAutoFillFastTrack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors shadow-2xs cursor-pointer"
            title="Auto-fill sample order for St. Luke's Medical Center"
          >
            <Sparkles size={14} className="text-amber-700" />
            <span>[DEBUG: Auto-Fill Fast-Track]</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="inline-flex items-center gap-1 px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-ink-secondary bg-white hover:bg-surface hover:text-ink-primary transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </div>

      {/* Main Crisp Card White Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
        <form onSubmit={handleOpenReview} className="divide-y divide-slate-100">
          
          {/* ─────────────────────────────────────────────────────────────
              SECTION 1: CUSTOMER DETAILS
          ───────────────────────────────────────────────────────────── */}
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-md bg-getmeds-blue/15 flex items-center justify-center text-getmeds-blue">
                <Building2 size={16} />
              </div>
              <h2 className="text-base font-bold text-ink-primary">1. Customer Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-2">
                  Select Customer Account <span className="text-state-error">*</span>
                </label>
                <select
                  value={customerId}
                  onChange={e => handleCustomerChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-primary font-medium focus:outline-none focus:ring-2 focus:ring-getmeds-blue shadow-2xs transition-colors"
                  required
                >
                  <option value="">-- Choose registered customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'credit' ? 'Credit Account' : 'Direct Patient'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-ink-secondary mt-1.5">
                  Pulls active credit institutional clients and direct patient profiles.
                </p>
              </div>

              {/* Dynamic Account Badge & Workflow Indicator */}
              <div className="flex flex-col justify-start">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-2">
                  Account Classification & Workflow Path
                </label>
                
                {selectedCustomer ? (
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    customerType === 'credit' 
                      ? 'bg-pharmacy-green/10 border-pharmacy-green/30 text-pharmacy-green-dark' 
                      : 'bg-state-warning-light border-state-warning/30 text-amber-950'
                  }`}>
                    <div className="flex items-center gap-2">
                      {customerType === 'credit' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-pharmacy-green text-white shadow-2xs">
                          <CheckCircle size={12} /> Credit Customer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-state-warning text-white shadow-2xs">
                          <AlertCircle size={12} /> Direct Patient
                        </span>
                      )}
                      <span className="text-xs font-semibold text-ink-primary">
                        {customerType === 'credit' ? 'Institutional Terms' : 'Advance Payment'}
                      </span>
                    </div>

                    <p className="text-xs mt-2 leading-relaxed">
                      {customerType === 'credit' ? (
                        <>
                          <strong className="font-semibold">Bypasses upfront payment.</strong> Auto-creates Zoho Sales Order with 30-day terms and routes directly to the <span className="font-bold underline">Dispatch Queue</span>.
                        </>
                      ) : (
                        <>
                          <strong className="font-semibold">Requires payment verification.</strong> Routes to <span className="font-bold underline">Finance Queue</span> for 100% advance clearance before picking.
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-surface text-ink-secondary text-xs flex items-center justify-center h-[88px]">
                    Select a customer above to view their workflow routing
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 2: ORDER ITEMS (DYNAMIC CLIENT-SIDE FILTER)
          ───────────────────────────────────────────────────────────── */}
          <div className="p-6 sm:p-8 space-y-5 overflow-visible">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-getmeds-blue/15 flex items-center justify-center text-getmeds-blue">
                  <Package size={16} />
                </div>
                <h2 className="text-base font-bold text-ink-primary">2. Order Items</h2>
              </div>
              <span className="text-xs font-semibold text-ink-secondary">
                {items.length} {items.length === 1 ? 'item' : 'items'} added
              </span>
            </div>

            {/* Dynamic Product Search Input & Add Item Bar */}
            <div className="bg-surface p-4 rounded-xl border border-slate-200/80 relative">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                
                {/* Client-Side Autocomplete Search Input */}
                <div className="sm:col-span-7 relative" ref={searchContainerRef}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-1.5">
                    Search & Select Product <span className="text-state-error">*</span>
                  </label>
                  
                  <div className="relative">
                    <Search className="w-4 h-4 text-ink-secondary absolute left-3.5 top-3 pointer-events-none" />
                    
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={e => {
                        setProductSearchQuery(e.target.value);
                        setSelectedProductId('');
                        setIsProductDropdownOpen(true);
                      }}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      placeholder="Type medicine name or SKU (e.g. Paracetamol, Amoxicillin)..."
                      className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-2.5 text-sm text-ink-primary font-medium focus:outline-none focus:ring-2 focus:ring-getmeds-blue shadow-2xs transition-colors"
                    />

                    {productSearchQuery && (
                      <button
                        type="button"
                        onClick={handleClearProductSearch}
                        className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-ink-primary rounded-full hover:bg-slate-100 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Absolutely Positioned Card White Dropdown Panel */}
                  {isProductDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                      {filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-xs text-ink-secondary">
                          No pharmaceutical products matching <span className="font-semibold text-ink-primary">"{productSearchQuery}"</span>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {filteredProducts.map(product => {
                            const isSelected = String(product.id) === String(selectedProductId);
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleSelectProduct(product)}
                                className={`w-full text-left p-3 hover:bg-surface flex items-center justify-between transition-colors ${
                                  isSelected ? 'bg-getmeds-blue/10' : ''
                                }`}
                              >
                                <div className="min-w-0 pr-3">
                                  <p className="text-sm font-semibold text-ink-primary truncate">
                                    {product.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] font-mono text-ink-secondary bg-slate-100 px-1.5 py-0.5 rounded">
                                      {product.sku}
                                    </span>
                                    {product.category && (
                                      <span className="text-[11px] text-ink-secondary/80">
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
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quantity Input */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={selectedQuantity}
                    onChange={e => setSelectedQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-center text-ink-primary font-bold focus:outline-none focus:ring-2 focus:ring-getmeds-blue shadow-2xs"
                  />
                </div>

                {/* Add Item Button */}
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-getmeds-blue text-white rounded-lg text-sm font-semibold hover:bg-getmeds-blue-hover transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus size={16} /> Add Item
                  </button>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            {items.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-white text-ink-secondary text-sm">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-ink-primary">No items in requisition</p>
                <p className="text-xs text-ink-secondary mt-0.5">Type to search for a product and click "Add Item".</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                  <thead className="bg-surface">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-ink-secondary uppercase tracking-wider">Product Name & SKU</th>
                      <th className="px-4 py-3 text-right font-bold text-ink-secondary uppercase tracking-wider">Unit Price</th>
                      <th className="px-4 py-3 text-center font-bold text-ink-secondary uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-right font-bold text-ink-secondary uppercase tracking-wider">Subtotal</th>
                      <th className="px-4 py-3 text-center font-bold text-ink-secondary uppercase tracking-wider w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item, idx) => {
                      const p = getProduct(item.product_id);
                      return (
                        <tr key={idx} className="hover:bg-surface/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ink-primary">{p?.name || 'Product'}</p>
                            <span className="text-[11px] font-mono text-ink-secondary">{p?.sku}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-ink-secondary font-mono">
                            ₱{Number(p?.unit_price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => handleUpdateItemQuantity(idx, e.target.value)}
                              className="w-16 text-center border border-slate-200 rounded py-1 text-xs font-bold text-ink-primary focus:outline-none focus:ring-1 focus:ring-getmeds-blue"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-ink-primary font-mono">
                            ₱{getItemSubtotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-state-error hover:bg-state-error-light rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Grand Total Footer */}
                  <tfoot className="bg-surface/80 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-3.5 text-right font-bold text-ink-primary uppercase tracking-wider text-xs">
                        Grand Total:
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-getmeds-blue text-base font-mono">
                        ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 3: DELIVERY INFORMATION
          ───────────────────────────────────────────────────────────── */}
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-md bg-getmeds-blue/15 flex items-center justify-center text-getmeds-blue">
                <Truck size={16} />
              </div>
              <h2 className="text-base font-bold text-ink-primary">3. Delivery Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-2">
                  Destination Delivery Address <span className="text-state-error">*</span>
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Complete hospital, clinic, or residential shipping address..."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-getmeds-blue shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-2">
                  Special Dispatch & Routing Notes
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Attn: Dr. Santos, Room 302. Handle with cold chain packaging..."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-getmeds-blue shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SUBMISSION & ACTION CONTROLS
          ───────────────────────────────────────────────────────────── */}
          <div className="p-6 sm:p-8 bg-surface/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-ink-secondary">
              {!isFormValid ? (
                <span className="text-state-warning font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} /> Mandatory fields required (Customer, 1+ Items, Address) to unlock submission.
                </span>
              ) : (
                <span className="text-pharmacy-green-dark font-medium flex items-center gap-1.5">
                  <CheckCircle size={14} /> Requisition is valid and ready for workflow review.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="w-1/2 sm:w-auto px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-ink-secondary bg-white hover:bg-surface hover:text-ink-primary transition-colors"
              >
                Cancel
              </button>

              {/* Primary Action Button with State Enforcement */}
              <button
                type="submit"
                disabled={!isFormValid}
                className={`w-1/2 sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                  isFormValid
                    ? 'bg-getmeds-blue hover:bg-getmeds-blue-hover text-white shadow-md shadow-getmeds-blue/20 cursor-pointer'
                    : 'bg-state-neutral text-white cursor-not-allowed opacity-80'
                }`}
              >
                <ShoppingCart size={17} />
                Submit Order
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Review & Confirmation Modal */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => !mutation.isPending && setIsReviewOpen(false)}
        title="Confirm Requisition Submission"
      >
        <div className="space-y-4 text-sm text-ink-primary">
          <p className="text-xs text-ink-secondary leading-relaxed">
            Please verify the order line items and workflow route before committing this requisition.
          </p>

          {/* Customer & Route Details */}
          <div className="bg-surface rounded-xl p-4 space-y-2.5 border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-xs text-ink-secondary font-medium">Customer:</span>
              <span className="font-bold text-ink-primary">{selectedCustomer?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-ink-secondary font-medium">Account Type:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                customerType === 'credit' ? 'bg-pharmacy-green/15 text-pharmacy-green-dark border border-pharmacy-green/30' : 'bg-state-warning-light text-amber-950 border border-state-warning/30'
              }`}>
                {customerType === 'credit' ? '🏦 Credit Customer' : '💳 Direct Patient'}
              </span>
            </div>
            <div className="flex justify-between items-start pt-2 border-t border-slate-200">
              <span className="text-xs text-ink-secondary font-medium">Delivery Address:</span>
              <span className="font-medium text-ink-primary text-right max-w-[240px] truncate">{deliveryAddress}</span>
            </div>
            {deliveryNotes && (
              <div className="flex justify-between items-start">
                <span className="text-xs text-ink-secondary font-medium">Notes:</span>
                <span className="text-ink-secondary text-right max-w-[240px] italic">{deliveryNotes}</span>
              </div>
            )}
          </div>

          {/* Itemized Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2">Order Line Items</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-ink-secondary">Item</th>
                    <th className="px-2 py-2 text-center font-bold text-ink-secondary">Qty</th>
                    <th className="px-3 py-2 text-right font-bold text-ink-secondary">Price</th>
                    <th className="px-3 py-2 text-right font-bold text-ink-secondary">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, idx) => {
                    const p = getProduct(item.product_id);
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-ink-primary">
                          {p?.name} <span className="text-ink-secondary">({p?.sku})</span>
                        </td>
                        <td className="px-2 py-2 text-center text-ink-primary font-bold">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-ink-secondary">₱{p?.unit_price?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-bold text-ink-primary">₱{getItemSubtotal(item).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-surface">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-bold text-ink-primary">Grand Total:</td>
                    <td className="px-3 py-2 text-right font-extrabold text-getmeds-blue text-sm">₱{grandTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Workflow Routing Banner */}
          {customerType === 'direct' ? (
            <div className="bg-state-warning-light border border-state-warning/30 rounded-xl p-3 flex items-start gap-2 text-amber-950 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-state-warning" />
              <div>
                <strong className="font-bold text-amber-950">Next Workflow Step: Finance Payment Clearance</strong>
                <p className="mt-0.5 text-amber-900">
                  This Direct Patient requisition requires proof of advance payment verification before being released to warehouse dispatch.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-pharmacy-green/10 border border-pharmacy-green/30 rounded-xl p-3 flex items-start gap-2 text-pharmacy-green-dark text-xs">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-pharmacy-green" />
              <div>
                <strong className="font-bold text-pharmacy-green-dark">Next Workflow Step: Immediate Fulfillment Queue</strong>
                <p className="mt-0.5 text-pharmacy-green-dark/90">
                  Verified credit customer order automatically generates a Zoho Sales Order and queues for warehouse picking.
                </p>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setIsReviewOpen(false)}
              className="flex items-center gap-1 px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-ink-secondary hover:bg-surface hover:text-ink-primary disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit
            </button>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={handleConfirmSubmit}
              className="flex items-center gap-1.5 px-6 py-2 bg-getmeds-blue text-white rounded-lg text-xs font-bold hover:bg-getmeds-blue-hover disabled:opacity-50 shadow-md shadow-getmeds-blue/20"
            >
              {mutation.isPending ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Confirm & Submit Requisition
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NewOrderPage;
