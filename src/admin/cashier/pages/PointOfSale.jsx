import React, { useState, useEffect, useMemo } from 'react';
import { cashierService } from '../services/cashierService';
import { useShift } from '../context/ShiftContext';
import { supabase } from '../../../services/supabase';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Building,
  Split,
  User,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  Sparkles,
} from 'lucide-react';
import ThermalReceiptModal from '../components/ThermalReceiptModal';
import { OpenShiftModal } from '../components/ShiftModals';

export default function PointOfSale() {
  const { activeShift, isShiftOpen, refreshShift } = useShift();

  // Catalog State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cart State
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // Customer State
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment Selection State
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'bank_transfer' | 'pos_terminal' | 'split'
  const [amountTendered, setAmountTendered] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [posTerminalRef, setPosTerminalRef] = useState('');

  // Split payment rows
  const [splitPayments, setSplitPayments] = useState([
    { method: 'cash', amount: '', reference: '' },
    { method: 'bank_transfer', amount: '', reference: '' },
  ]);

  // Submission & Receipt
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);

  // Fetch initial catalog & categories
  useEffect(() => {
    async function initCatalog() {
      try {
        setLoadingProducts(true);
        const [prodData, { data: catData }] = await Promise.all([
          cashierService.getPOSProducts(),
          supabase ? supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }) : { data: [] },
        ]);
        setProducts(prodData || []);
        setCategories(catData || []);
      } catch (err) {
        console.error('Failed to load POS catalog:', err);
        setError('Failed to load menu products');
      } finally {
        setLoadingProducts(false);
      }
    }
    initCatalog();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat =
        selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const total = useMemo(() => {
    const val = subtotal - (Number(discountAmount) || 0);
    return val > 0 ? val : 0;
  }, [subtotal, discountAmount]);

  // Default cash tendered to total if empty
  useEffect(() => {
    if (paymentMethod === 'cash' && (!amountTendered || Number(amountTendered) < total)) {
      setAmountTendered(total.toString());
    }
  }, [total, paymentMethod]);

  const changeDue = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    const tendered = parseFloat(amountTendered) || 0;
    return tendered > total ? tendered - total : 0;
  }, [amountTendered, total, paymentMethod]);

  // Cart Actions
  const addToCart = (product) => {
    if (!product.is_available) return;
    if (product.track_stock && product.stock_quantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (product.track_stock && existing.quantity >= product.stock_quantity) {
          alert(`Cannot add more than ${product.stock_quantity} available units`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (item.track_stock && nextQty > item.stock_quantity) {
              alert(`Only ${item.stock_quantity} available`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setAmountTendered('');
    setTransferRef('');
    setPosTerminalRef('');
    setError('');
  };

  // Preset bill quick buttons
  const addQuickCash = (bill) => {
    const current = parseFloat(amountTendered) || 0;
    setAmountTendered((current + bill).toString());
  };

  // Submit and Complete Walk-in Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setError('');

    // Shift check if accepting cash
    const involvesCash =
      paymentMethod === 'cash' ||
      (paymentMethod === 'split' && splitPayments.some((p) => p.method === 'cash' && Number(p.amount) > 0));

    if (involvesCash && !isShiftOpen) {
      setShowOpenShiftModal(true);
      return;
    }

    // Build Payments array
    let paymentsPayload = [];
    if (paymentMethod === 'cash') {
      const tendered = parseFloat(amountTendered) || total;
      if (tendered < total) {
        setError(`Amount tendered (₦${tendered.toLocaleString()}) cannot be less than total (₦${total.toLocaleString()}).`);
        return;
      }
      paymentsPayload.push({
        method: 'cash',
        amount: total,
        amount_tendered: tendered,
        change_due: changeDue,
      });
    } else if (paymentMethod === 'bank_transfer') {
      if (!transferRef.trim()) {
        setError('Please enter a bank transfer transaction reference or narration.');
        return;
      }
      paymentsPayload.push({
        method: 'bank_transfer',
        amount: total,
        transaction_reference: transferRef.trim(),
      });
    } else if (paymentMethod === 'pos_terminal') {
      if (!posTerminalRef.trim()) {
        setError('Please enter the POS terminal authorization/STAN reference.');
        return;
      }
      paymentsPayload.push({
        method: 'pos_terminal',
        amount: total,
        transaction_reference: posTerminalRef.trim(),
      });
    } else if (paymentMethod === 'split') {
      const splitSum = splitPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
      if (splitSum < total) {
        setError(`Split payment sum (₦${splitSum.toLocaleString()}) must cover total order (₦${total.toLocaleString()}).`);
        return;
      }
      paymentsPayload = splitPayments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount),
          transaction_reference: p.reference || null,
        }));
    }

    // Build items payload
    const itemsPayload = cart.map((it) => ({
      product_id: it.id,
      quantity: it.quantity,
      unit_price: it.price,
    }));

    try {
      setSubmitting(true);
      const res = await cashierService.completePOSSale({
        items: itemsPayload,
        payments: paymentsPayload,
        customer: {
          name: customerName,
          phone: customerPhone,
        },
        discountAmount: Number(discountAmount) || 0,
        taxAmount: 0,
        notes: notes || null,
        shiftId: activeShift?.id || null,
      });

      // Construct receipt for immediate thermal preview
      const receiptObj = {
        id: res.receipt_id,
        receipt_number: res.receipt_number,
        issued_at: new Date().toISOString(),
        reprint_count: 0,
        order: {
          order_number: res.order_number,
          subtotal: res.subtotal,
          discount_amount: res.discount,
          total_amount: res.total,
          items: cart.map((it) => ({
            id: it.id,
            product_name: it.name,
            quantity: it.quantity,
            unit_price: it.price,
            line_total: it.price * it.quantity,
          })),
          customer: {
            full_name: customerName,
            phone: customerPhone,
          },
        },
        payment: {
          payment_method: paymentMethod,
          amount: res.amount_paid,
          amount_tendered: paymentMethod === 'cash' ? parseFloat(amountTendered) || total : null,
          change_due: changeDue,
        },
        cashier: {
          full_name: 'Cashier',
        },
        metadata: {
          customer_name: customerName,
          order_number: res.order_number,
        },
      };

      setCompletedReceipt(receiptObj);
      clearCart();
      refreshShift();
    } catch (err) {
      console.error('POS Sale error:', err);
      setError(err.message || 'Failed to complete POS sale');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      {/* LEFT SECTION: PRODUCT CATALOG (8 COLS) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Search & Category Filter Bar */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search food by name or SKU (e.g. Tuwo, Suya, Chapman)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
            />
          </div>

          {/* Categories Pill Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-forest-900 text-gold-300 shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-forest-900 text-gold-300 shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {loadingProducts ? (
          <div className="py-20 text-center text-stone-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-forest-800" />
            <p className="text-xs">Loading authentic Northern Flavors menu...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-stone-400 border border-stone-200">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-stone-300" />
            <p className="text-sm font-semibold">No food products found</p>
            <p className="text-xs text-stone-400 mt-1">Try another category or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const inStock = !product.track_stock || product.stock_quantity > 0;
              const available = product.is_available && inStock;

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={!available}
                  className={`group relative text-left bg-white p-3.5 rounded-2xl border transition-all flex flex-col justify-between h-44 shadow-sm hover:shadow-md ${
                    available
                      ? 'border-stone-200 hover:border-gold-500'
                      : 'border-stone-200 opacity-60 cursor-not-allowed bg-stone-50'
                  }`}
                >
                  <div className="space-y-1 w-full">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider truncate">
                        {product.category?.name || 'Dish'}
                      </span>
                      {product.track_stock && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            product.stock_quantity <= product.low_stock_threshold
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {product.stock_quantity} left
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif font-bold text-xs text-stone-900 group-hover:text-forest-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 w-full">
                    <span className="font-serif font-extrabold text-sm text-forest-950">
                      ₦{Number(product.price).toLocaleString()}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                        available
                          ? 'bg-forest-800 group-hover:bg-gold-500 text-gold-300 group-hover:text-forest-950'
                          : 'bg-stone-200 text-stone-400'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: POS CART & CHECKOUT DRAWER (4 COLS) */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-stone-200 shadow-elevated p-5 flex flex-col space-y-4 sticky top-20">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-forest-900" />
            <h3 className="font-serif font-bold text-base text-forest-950">Current Order</h3>
            <span className="px-2 py-0.5 bg-forest-100 text-forest-900 text-xs font-bold rounded-full">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-stone-400 hover:text-red-600 transition p-1"
              title="Clear entire cart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Customer Information (Optional counter walk-in) */}
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-400" />
              Customer Details
            </span>
            <span className="text-[10px] text-stone-400">Walk-in Counter</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs focus:ring-1 focus:ring-forest-800"
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone (Optional)"
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs focus:ring-1 focus:ring-forest-800"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto max-h-[280px] divide-y divide-stone-100 pr-1">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <ShoppingBag className="w-8 h-8 mx-auto text-stone-300" />
              <p className="text-xs">Cart is empty. Tap items on the left to add.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="font-serif font-bold text-xs text-stone-900 truncate">
                    {item.name}
                  </h5>
                  <span className="text-[11px] text-stone-500">
                    ₦{Number(item.price).toLocaleString()}
                  </span>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-5 h-5 rounded-lg bg-white shadow-xs flex items-center justify-center text-stone-600 hover:text-red-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-5 h-5 rounded-lg bg-white shadow-xs flex items-center justify-center text-stone-600 hover:text-forest-900"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right w-16">
                  <span className="font-serif font-bold text-xs text-forest-950 block">
                    ₦{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-stone-300 hover:text-red-500 transition p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary */}
        <div className="border-t border-stone-200 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal:</span>
            <span className="font-semibold">₦{subtotal.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-600">Discount (₦):</span>
            <input
              type="number"
              min="0"
              max={subtotal}
              value={discountAmount || ''}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder="0"
              className="w-24 px-2 py-0.5 rounded border border-stone-200 text-right text-xs font-semibold focus:ring-1 focus:ring-forest-800"
            />
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-stone-200">
            <span className="font-serif font-bold text-sm text-stone-900">Total Payable:</span>
            <span className="font-serif font-black text-xl text-forest-950">
              ₦{total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2 pt-2 border-t border-stone-200">
          <label className="block text-xs font-bold text-stone-700">Payment Method</label>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                paymentMethod === 'cash'
                  ? 'bg-forest-900 text-gold-300 border-forest-900 shadow-sm'
                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Cash
            </button>
            <button
              onClick={() => setPaymentMethod('bank_transfer')}
              className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                paymentMethod === 'bank_transfer'
                  ? 'bg-forest-900 text-gold-300 border-forest-900 shadow-sm'
                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Building className="w-4 h-4" />
              Transfer
            </button>
            <button
              onClick={() => setPaymentMethod('pos_terminal')}
              className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                paymentMethod === 'pos_terminal'
                  ? 'bg-forest-900 text-gold-300 border-forest-900 shadow-sm'
                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              POS Card
            </button>
            <button
              onClick={() => setPaymentMethod('split')}
              className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                paymentMethod === 'split'
                  ? 'bg-forest-900 text-gold-300 border-forest-900 shadow-sm'
                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Split className="w-4 h-4" />
              Split
            </button>
          </div>

          {/* Conditional Cash Payment Box */}
          {paymentMethod === 'cash' && (
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-700">Cash Tendered (₦):</span>
                <input
                  type="number"
                  min={total}
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  className="w-28 px-2.5 py-1 rounded-lg border border-stone-300 text-right font-bold text-sm focus:ring-1 focus:ring-forest-800"
                />
              </div>

              {/* Quick bill chips */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {[1000, 2000, 5000, 10000, 20000].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => addQuickCash(bill)}
                    className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-[10px] font-bold text-stone-700 hover:bg-stone-100 whitespace-nowrap"
                  >
                    +₦{bill.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmountTendered(total.toString())}
                  className="px-2 py-0.5 rounded-lg bg-forest-800 text-gold-300 text-[10px] font-bold whitespace-nowrap"
                >
                  Exact
                </button>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-stone-200 font-bold">
                <span className="text-stone-700">Change Due:</span>
                <span className="text-emerald-700 font-serif text-sm">
                  ₦{changeDue.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Conditional Transfer Payment Box */}
          {paymentMethod === 'bank_transfer' && (
            <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200 space-y-2 text-xs">
              <p className="text-[11px] text-blue-900 font-medium">
                Verify receipt of funds into Northern Flavors account before finalizing:
              </p>
              <div className="bg-white p-2 rounded-xl text-[11px] font-mono border border-blue-100">
                <div className="font-bold text-forest-950">Jaiz Bank / Zenith Bank</div>
                <div className="text-stone-600">Acc: 0123456789 • Northern Flavors Ltd</div>
              </div>
              <input
                type="text"
                required
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder="Sender Name / Bank Reference / Session ID *"
                className="w-full px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-semibold focus:ring-1 focus:ring-blue-600"
              />
            </div>
          )}

          {/* Conditional POS Terminal Box */}
          {paymentMethod === 'pos_terminal' && (
            <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200 space-y-2 text-xs">
              <p className="text-[11px] text-purple-900 font-medium">
                Enter POS slip reference or Stan # from counter terminal:
              </p>
              <input
                type="text"
                required
                value={posTerminalRef}
                onChange={(e) => setPosTerminalRef(e.target.value)}
                placeholder="POS Auth Code / RRN (e.g. MON-09284) *"
                className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-semibold focus:ring-1 focus:ring-purple-600"
              />
            </div>
          )}

          {/* Conditional Split Payment Box */}
          {paymentMethod === 'split' && (
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <span className="font-bold text-stone-700 block">Split Amounts</span>
              {splitPayments.map((sp, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={sp.method}
                    onChange={(e) => {
                      const next = [...splitPayments];
                      next[idx].method = e.target.value;
                      setSplitPayments(next);
                    }}
                    className="w-28 px-2 py-1 rounded-lg border border-stone-300 text-xs bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Transfer</option>
                    <option value="pos_terminal">POS Card</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount (₦)"
                    value={sp.amount}
                    onChange={(e) => {
                      const next = [...splitPayments];
                      next[idx].amount = e.target.value;
                      setSplitPayments(next);
                    }}
                    className="flex-1 px-2 py-1 rounded-lg border border-stone-300 text-xs font-semibold"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCompleteSale}
          disabled={cart.length === 0 || submitting}
          className="w-full py-3.5 bg-forest-800 hover:bg-forest-900 disabled:opacity-50 disabled:cursor-not-allowed text-gold-300 font-serif font-bold text-sm rounded-2xl transition shadow-elevated flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing Order & Printing...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Sale & Issue Receipt</span>
            </>
          )}
        </button>
      </div>

      {/* Completed Thermal Receipt Modal */}
      {completedReceipt && (
        <ThermalReceiptModal
          receipt={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
        />
      )}

      {/* Open Shift Modal Prompt */}
      <OpenShiftModal
        isOpen={showOpenShiftModal}
        onClose={() => setShowOpenShiftModal(false)}
        onSuccess={() => {
          refreshShift();
          setShowOpenShiftModal(false);
        }}
      />
    </div>
  );
}

