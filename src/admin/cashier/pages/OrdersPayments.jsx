import React, { useState, useEffect } from 'react';
import { cashierService } from '../services/cashierService';
import { useShift } from '../context/ShiftContext';
import {
  CreditCard,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Building,
  RefreshCw,
  Receipt,
  X,
  Loader2,
  ChevronDown,
  Eye,
} from 'lucide-react';
import ThermalReceiptModal from '../components/ThermalReceiptModal';
import { OpenShiftModal } from '../components/ShiftModals';

export default function OrdersPayments() {
  const { activeShift, isShiftOpen, refreshShift } = useShift();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('unpaid'); // 'unpaid' | 'paid' | 'all'
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Order for Payment Modal
  const [payingOrder, setPayingOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [posRef, setPosRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Receipt Modal
  const [receiptData, setReceiptData] = useState(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await cashierService.getOnlineOrdersForPayment({
        statusFilter,
        search: searchTerm,
      });
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders for payment:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrders();
  };

  const openPaymentModal = (order) => {
    const balance = Number(order.total_amount) - Number(order.amount_paid || 0);
    setPayingOrder(order);
    setAmount(balance > 0 ? balance.toString() : '0');
    setAmountTendered(balance > 0 ? balance.toString() : '0');
    setPaymentMethod('cash');
    setTransferRef('');
    setPosRef('');
    setPaymentNotes('');
    setPaymentError('');
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payingOrder) return;

    const payAmount = parseFloat(amount) || 0;
    if (payAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    if (paymentMethod === 'cash' && !isShiftOpen) {
      setShowOpenShiftModal(true);
      return;
    }

    let tendered = null;
    let change = 0;
    if (paymentMethod === 'cash') {
      tendered = parseFloat(amountTendered) || payAmount;
      if (tendered < payAmount) {
        setPaymentError('Amount tendered cannot be less than payment amount.');
        return;
      }
      change = tendered - payAmount;
    }

    let provider = null;
    let ref = null;
    if (paymentMethod === 'bank_transfer') {
      if (!transferRef.trim()) {
        setPaymentError('Please supply a bank transaction reference or session ID.');
        return;
      }
      provider = 'bank_transfer';
      ref = transferRef.trim();
    } else if (paymentMethod === 'pos_terminal') {
      if (!posRef.trim()) {
        setPaymentError('Please enter the POS approval code or Stan reference.');
        return;
      }
      provider = 'pos_terminal';
      ref = posRef.trim();
    }

    try {
      setRecordingPayment(true);
      setPaymentError('');

      const res = await cashierService.recordOrderPayment({
        orderId: payingOrder.id,
        paymentMethod,
        amount: payAmount,
        amountTendered: tendered,
        changeDue: change,
        provider,
        transactionReference: ref,
        notes: paymentNotes || null,
        shiftId: activeShift?.id || null,
      });

      // Construct receipt for viewing
      const slip = {
        id: res.receipt_id,
        receipt_number: res.receipt_number,
        issued_at: new Date().toISOString(),
        reprint_count: 0,
        order: {
          ...payingOrder,
          amount_paid: res.amount_paid,
        },
        payment: {
          payment_method: paymentMethod,
          amount: payAmount,
          amount_tendered: tendered,
          change_due: change,
          transaction_reference: ref,
        },
        metadata: {
          customer_name: payingOrder.customer?.full_name,
          order_number: payingOrder.order_number,
        },
      };

      setReceiptData(slip);
      setPayingOrder(null);
      loadOrders();
      refreshShift();
    } catch (err) {
      console.error('Error recording order payment:', err);
      setPaymentError(err.message || 'Payment recording failed');
    } finally {
      setRecordingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-forest-950">
            Orders & Payments Management
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Accept and verify payments for customer online orders and phone deliveries
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          <div className="bg-stone-100 p-1 rounded-2xl flex items-center text-xs">
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                statusFilter === 'unpaid'
                  ? 'bg-forest-900 text-gold-300 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Unpaid / Pending
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                statusFilter === 'paid'
                  ? 'bg-forest-900 text-gold-300 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Fully Paid
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-forest-900 text-gold-300 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Orders
            </button>
          </div>

          <button
            onClick={loadOrders}
            disabled={loading}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 text-stone-700 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter orders by Order Number (e.g. NF-20261115-0001)..."
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-stone-200 text-xs focus:ring-2 focus:ring-forest-800 shadow-sm"
        />
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 uppercase font-semibold">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Order Total</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-forest-800" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-400">
                    No orders match the selected filter.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const total = Number(order.total_amount);
                  const paid = Number(order.amount_paid || 0);
                  const balance = total - paid;
                  const isPaid = order.payment_status === 'paid' || balance <= 0;

                  return (
                    <tr key={order.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-forest-950">
                        {order.order_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-stone-900 block">
                          {order.customer?.full_name || 'Walk-in'}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {order.customer?.phone || 'No phone'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            order.order_source === 'pos'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {order.order_source || 'online'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-stone-600">
                        {order.items?.map((it) => `${it.quantity}x ${it.product_name}`).join(', ') ||
                          'No items'}
                      </td>
                      <td className="py-3 px-4 font-serif font-bold text-stone-900">
                        ₦{total.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-serif font-bold text-emerald-800">
                        ₦{paid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : paid > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isPaid ? (
                          <button
                            onClick={() => openPaymentModal(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest-800 text-gold-300 hover:bg-forest-900 font-bold text-xs rounded-xl transition shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Collect ₦{balance.toLocaleString()}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setReceiptData({
                                id: order.id,
                                receipt_number: `REC-${order.order_number.replace('NF-', '')}`,
                                issued_at: order.paid_at || order.created_at,
                                reprint_count: 0,
                                order,
                                payment: {
                                  payment_method: order.payments?.[0]?.payment_method || 'Paid',
                                  amount: paid,
                                },
                                metadata: {
                                  customer_name: order.customer?.full_name,
                                  order_number: order.order_number,
                                },
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 font-semibold text-xs rounded-xl transition"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-serif font-bold text-lg text-forest-950">
                  Collect Order Payment
                </h3>
                <p className="text-xs text-stone-500 font-mono">
                  {payingOrder.order_number} • {payingOrder.customer?.full_name || 'Customer'}
                </p>
              </div>
              <button
                onClick={() => setPayingOrder(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Order Ledger summary */}
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-stone-500 block">Total Due</span>
                <span className="font-serif font-bold text-sm text-stone-900">
                  ₦{Number(payingOrder.total_amount).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Already Paid</span>
                <span className="font-serif font-bold text-sm text-emerald-700">
                  ₦{Number(payingOrder.amount_paid || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Balance Pending</span>
                <span className="font-serif font-bold text-sm text-red-700">
                  ₦{(Number(payingOrder.total_amount) - Number(payingOrder.amount_paid || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'cash'
                        ? 'bg-forest-900 text-gold-300 border-forest-900 shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'bank_transfer'
                        ? 'bg-forest-900 text-gold-300 border-forest-900 shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    Bank Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pos_terminal')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'pos_terminal'
                        ? 'bg-forest-900 text-gold-300 border-forest-900 shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    POS Terminal
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Amount to Collect (₦)
                </label>
                <input
                  type="number"
                  min="1"
                  step="50"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 font-bold text-sm focus:ring-2 focus:ring-forest-800"
                />
              </div>

              {/* Cash tendered inputs */}
              {paymentMethod === 'cash' && (
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-stone-700">Cash Tendered (₦):</span>
                    <input
                      type="number"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      className="w-28 px-2 py-1 rounded border border-stone-300 text-right font-bold"
                    />
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Change Due:</span>
                    <span>
                      ₦{Math.max(0, (parseFloat(amountTendered) || 0) - (parseFloat(amount) || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Transfer Reference */}
              {paymentMethod === 'bank_transfer' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Bank Reference / Session ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    placeholder="e.g. 090284019284 / TRF-ZENITH"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-forest-800"
                  />
                </div>
              )}

              {/* POS Terminal Reference */}
              {paymentMethod === 'pos_terminal' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    POS Terminal STAN / Auth Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={posRef}
                    onChange={(e) => setPosRef(e.target.value)}
                    placeholder="e.g. STAN 004912 / MON-882"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-forest-800"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingOrder(null)}
                  className="flex-1 py-2.5 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="flex-1 py-2.5 bg-forest-800 text-gold-300 font-bold rounded-xl text-xs hover:bg-forest-900 transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {recordingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Confirm Payment & Issue Slip'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      {receiptData && (
        <ThermalReceiptModal
          receipt={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* Open Shift Modal */}
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

