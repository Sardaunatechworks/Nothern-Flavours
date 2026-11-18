import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';
import { formatNaira, formatDateLagos } from '../../utils/formatters';
import {
  Search,
  CheckCircle,
  XCircle,
  Printer,
  ChevronRight,
  Eye,
  AlertCircle,
  RotateCcw,
  Clock,
  Package,
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await orderService.getAdminOrders({
        status: filterStatus,
        search,
      });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, search]);

  const handleConfirmOrder = async (order) => {
    const res = await Swal.fire({
      title: `Confirm Order ${order.order_number}?`,
      text: 'This will atomically verify availability and deduct product stock.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#194633',
      cancelButtonColor: '#78716c',
      confirmButtonText: 'Yes, Confirm & Deduct Stock',
    });

    if (res.isConfirmed) {
      try {
        await orderService.confirmOrder(order.id);
        Swal.fire({
          title: 'Confirmed!',
          text: `Order ${order.order_number} confirmed and stock deducted.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
        fetchOrders();
        setSelectedOrder(null);
      } catch (err) {
        Swal.fire({
          title: 'Confirmation Failed',
          text: err.message,
          icon: 'error',
          confirmButtonColor: '#194633',
        });
      }
    }
  };

  const handleRejectOrder = async (order) => {
    const { value: reason } = await Swal.fire({
      title: `Reject Order ${order.order_number}?`,
      input: 'text',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'e.g. Out of stock ingredients, closing early',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Reject Order',
    });

    if (reason !== undefined) {
      try {
        await orderService.rejectOrder(order.id, reason);
        Swal.fire({
          title: 'Order Rejected',
          text: `Order ${order.order_number} has been rejected.`,
          icon: 'info',
          timer: 2000,
          showConfirmButton: false,
        });
        fetchOrders();
        setSelectedOrder(null);
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  const handleCancelOrder = async (order) => {
    const { value: reason } = await Swal.fire({
      title: `Cancel Order ${order.order_number}?`,
      text: 'If stock was deducted at confirmation, it will be automatically restored.',
      input: 'text',
      inputLabel: 'Reason for cancellation',
      inputPlaceholder: 'e.g. Customer cancelled via call',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Yes, Cancel & Restore Stock',
    });

    if (reason !== undefined) {
      try {
        await orderService.cancelOrder(order.id, reason);
        Swal.fire({
          title: 'Cancelled',
          text: `Order cancelled and inventory restored where applicable.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
        fetchOrders();
        setSelectedOrder(null);
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  const handleStatusTransition = async (orderId, newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      Swal.fire({
        title: 'Status Updated',
        text: `Order moved to ${newStatus}`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      Swal.fire('Transition Failed', err.message, 'error');
    }
  };

  const statuses = [
    { label: 'All Orders', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Preparing', value: 'preparing' },
    { label: 'Ready', value: 'ready' },
    { label: 'Out for Delivery', value: 'out_for_delivery' },
    { label: 'Completed', value: 'completed' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const handlePrintReceipt = async () => {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch (e) {
      console.warn(e);
    }
    document.body.classList.add('printing-receipt');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-receipt');
      }, 500);
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Order Management
          </h1>
          <p className="text-xs text-stone-500">
            Review incoming orders, deduct stock on confirmation, and track fulfillment
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or address..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {statuses.map((st) => (
          <button
            key={st.value}
            onClick={() => setFilterStatus(st.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filterStatus === st.value
                ? 'bg-forest-800 text-gold-400 font-bold'
                : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-forest-800 border-t-gold-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-stone-400">Loading orders...</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Order Reference</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-forest-900">
                      {ord.order_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-forest-950">{ord.customer?.full_name || 'Customer'}</p>
                        <p className="text-[11px] text-stone-500">{ord.customer?.phone || ord.phone || '—'}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px]">
                        {ord.order_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-forest-950">
                      {formatNaira(ord.total)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ord.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : ord.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : ord.status === 'preparing'
                            ? 'bg-purple-100 text-purple-800'
                            : ord.status === 'ready'
                            ? 'bg-teal-100 text-teal-800'
                            : ord.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'cancelled' || ord.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {ord.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-400">
                      {formatDateLagos(ord.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-forest-800 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setReceiptOrder(ord)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-forest-800 hover:text-white transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-stone-400">
            No orders match the selected criteria.
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="px-6 py-5 bg-forest-800 text-cream-50 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold">
                    {selectedOrder.order_number}
                  </h3>
                  <p className="text-[11px] text-gold-400">
                    Placed: {formatDateLagos(selectedOrder.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-full text-cream-200 hover:text-white hover:bg-forest-700"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status banner */}
                <div className="p-3.5 rounded-xl bg-stone-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-600">Current Status:</span>
                  <span className="font-bold uppercase tracking-wider text-forest-900">
                    {selectedOrder.status?.replace('_', ' ')}
                  </span>
                </div>

                {/* Customer info */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Customer Information
                  </h4>
                  <div className="p-4 rounded-xl bg-cream-50 border border-stone-200 text-xs space-y-1.5">
                    <p>
                      <strong className="text-stone-700">Name:</strong>{' '}
                      {selectedOrder.customer?.full_name || '—'}
                    </p>
                    <p>
                      <strong className="text-stone-700">Phone:</strong>{' '}
                      {selectedOrder.customer?.phone || selectedOrder.phone || '—'}
                    </p>
                    <p>
                      <strong className="text-stone-700">Order Type:</strong>{' '}
                      <span className="capitalize">{selectedOrder.order_type}</span>
                    </p>
                    {selectedOrder.delivery_address && (
                      <p>
                        <strong className="text-stone-700">Delivery Address:</strong>{' '}
                        {selectedOrder.delivery_address}
                      </p>
                    )}
                    {selectedOrder.notes && (
                      <p>
                        <strong className="text-stone-700">Notes:</strong>{' '}
                        <span className="italic">{selectedOrder.notes}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Ordered Dishes
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.order_items?.map((item, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-stone-200 flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-bold text-forest-950">{item.product_name}</p>
                          <p className="text-stone-500">
                            {item.quantity} x {formatNaira(item.unit_price)}
                          </p>
                        </div>
                        <span className="font-bold text-forest-900">
                          {formatNaira(item.line_total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="p-4 rounded-xl bg-cream-100 border border-stone-200 text-xs space-y-2">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal:</span>
                    <span>{formatNaira(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Delivery Fee:</span>
                    <span>{formatNaira(selectedOrder.delivery_fee)}</span>
                  </div>
                  <div className="pt-2 border-t border-stone-300 flex justify-between font-bold text-forest-950 text-sm">
                    <span>Total Amount:</span>
                    <span>{formatNaira(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* Actions depending on current status */}
                <div className="space-y-2 pt-2">
                  {selectedOrder.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleConfirmOrder(selectedOrder)}
                        className="py-2.5 rounded-xl bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold text-xs shadow flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirm Order</span>
                      </button>
                      <button
                        onClick={() => handleRejectOrder(selectedOrder)}
                        className="py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs border border-rose-200 flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusTransition(selectedOrder.id, 'preparing')}
                      className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      <span>Start Preparing</span>
                    </button>
                  )}

                  {selectedOrder.status === 'preparing' && (
                    <button
                      onClick={() => handleStatusTransition(selectedOrder.id, 'ready')}
                      className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Mark Ready for Pickup/Dispatch</span>
                    </button>
                  )}

                  {selectedOrder.status === 'ready' && selectedOrder.order_type === 'delivery' && (
                    <button
                      onClick={() => handleStatusTransition(selectedOrder.id, 'out_for_delivery')}
                      className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow"
                    >
                      Dispatch (Out for Delivery)
                    </button>
                  )}

                  {((selectedOrder.status === 'ready' && selectedOrder.order_type === 'pickup') ||
                    selectedOrder.status === 'out_for_delivery') && (
                    <button
                      onClick={() => handleStatusTransition(selectedOrder.id, 'completed')}
                      className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow"
                    >
                      Mark Completed (Delivered)
                    </button>
                  )}

                  {['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => handleCancelOrder(selectedOrder)}
                      className="w-full py-2 text-xs text-rose-600 hover:underline flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Cancel Order & Restore Stock</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Thermal Receipt Modal */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-transparent print:static">
          <div className="receipt-print-area bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 border border-stone-200 shadow-2xl print:border-none print:shadow-none print:p-2 text-black font-sans">
            <div className="text-center border-b border-dashed border-black pb-3 space-y-1">
              <img
                src="/logo-thermal.png"
                alt="Northern Flavors Logo"
                className="receipt-logo w-14 h-14 mx-auto object-contain mb-1"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logo.png';
                }}
              />
              <h3 className="font-sans font-black text-base text-black uppercase">NORTHERN FLAVORS</h3>
              <p className="text-[10px] font-bold text-black uppercase">Restaurant & Grills</p>
              <p className="text-[10px] font-semibold text-black">Gajambe Plaza, Yalwawa, Dutse, Jigawa State</p>
              <p className="text-[10px] font-bold text-black">Hotline: 0906 820 2567</p>
              <p className="text-[10px] font-bold text-black">Tel: 0813 139 3402 | 0904 353 8768</p>
              <p className="text-xs font-mono font-bold pt-1 text-black">{receiptOrder.order_number}</p>
              <p className="text-[10px] text-black">{formatDateLagos(receiptOrder.created_at)}</p>
            </div>

            <div className="space-y-1 text-xs border-b border-dashed border-black pb-3 text-black font-semibold">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold">{receiptOrder.customer?.full_name || 'Walk-in Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="capitalize font-bold">{receiptOrder.order_type}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-b border-dashed border-black pb-3 text-xs text-black">
              {receiptOrder.order_items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start font-semibold">
                  <span className="flex-1 pr-1 break-words">{item.quantity}x {item.product_name}</span>
                  <span className="font-bold whitespace-nowrap">{formatNaira(item.line_total)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs text-black font-semibold">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatNaira(receiptOrder.subtotal)}</span>
              </div>
              {receiptOrder.delivery_fee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>{formatNaira(receiptOrder.delivery_fee)}</span>
                </div>
              )}
              {receiptOrder.packaging_fee > 0 && (
                <div className="flex justify-between">
                  <span>Takeaway Packaging:</span>
                  <span>{formatNaira(receiptOrder.packaging_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-solid border-black">
                <span>Total:</span>
                <span className="text-base font-black">{formatNaira(receiptOrder.total)}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2 no-print">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2 bg-forest-800 text-gold-400 rounded-xl text-xs font-bold hover:bg-forest-900 transition-colors"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setReceiptOrder(null)}
                className="px-4 py-2 bg-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

