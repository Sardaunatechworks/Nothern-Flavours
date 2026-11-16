import React, { useState } from 'react';
import { Printer, RefreshCw, X, Check, Copy, FileText, ShoppingBag } from 'lucide-react';
import { cashierService } from '../services/cashierService';

export default function ThermalReceiptModal({ receipt, onClose, onNewSale, onReprintSuccess }) {
  const [format, setFormat] = useState('thermal'); // 'thermal' (80mm) | 'a4'
  const [reprinting, setReprinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reprintCount, setReprintCount] = useState(receipt?.reprint_count || 0);

  if (!receipt) return null;

  const order = receipt.order || {};
  const items = order.items || [];
  const payment = receipt.payment || {};
  const cashierName = receipt.cashier?.full_name || receipt.metadata?.cashier_name || 'Cashier Staff';
  const customerName = order.customer?.full_name || receipt.metadata?.customer_name || 'Walk-in Customer';
  const orderType = order.order_type || receipt.metadata?.order_type || 'dine_in';
  const packagingFee = Number(order.packaging_fee || receipt.metadata?.packaging_fee || 0);
  const deliveryFee = Number(order.delivery_fee || receipt.metadata?.delivery_fee || 0);
  const discountAmount = Number(order.discount_amount || receipt.metadata?.discount_amount || 0);
  const subtotal = Number(order.subtotal || 0);
  const total = Number(order.total_amount || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleReprint = async () => {
    try {
      setReprinting(true);
      const res = await cashierService.reprintReceipt(receipt.id);
      setReprintCount(res.reprint_count);
      if (onReprintSuccess) onReprintSuccess(res);
      window.print();
    } catch (err) {
      alert('Failed to log reprint: ' + err.message);
    } finally {
      setReprinting(false);
    }
  };

  const copyReceiptText = () => {
    const text = `
================================
     NORTHERN FLAVORS RESTAURANT
  Gajambe Plaza, Dutse, Jigawa
      Tel: +234 906 820 2567
================================
Receipt: ${receipt.receipt_number}
Order Ref: ${order.order_number || receipt.metadata?.order_number || 'N/A'}
Type: ${orderType.toUpperCase()}
Date: ${new Date(receipt.issued_at).toLocaleString()}
Cashier: ${cashierName}
Customer: ${customerName}
--------------------------------
ITEMS:
${items.map((it) => `${it.product_name || 'Item'} x${it.quantity} @ ₦${Number(it.unit_price).toLocaleString()} = ₦${Number(it.line_total).toLocaleString()}`).join('\n')}
--------------------------------
Subtotal: ₦${subtotal.toLocaleString()}
${packagingFee > 0 ? `Takeaway Packaging: ₦${packagingFee.toLocaleString()}\n` : ''}${deliveryFee > 0 ? `Delivery Fee: ₦${deliveryFee.toLocaleString()}\n` : ''}${discountAmount > 0 ? `Discount: -₦${discountAmount.toLocaleString()}\n` : ''}TOTAL: ₦${total.toLocaleString()}
Paid: ₦${Number(payment.amount || order.amount_paid || total).toLocaleString()} (${payment.payment_method?.toUpperCase() || 'PAID'})
${payment.amount_tendered ? `Tendered: ₦${Number(payment.amount_tendered).toLocaleString()}\n` : ''}${payment.change_due > 0 ? `Change: ₦${Number(payment.change_due).toLocaleString()}\n` : ''}================================
  Thank you for dining with us!
================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:fixed">
      {/* Container */}
      <div
        className={`bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:w-full ${
          format === 'a4' ? 'max-w-2xl w-full' : 'max-w-md w-full'
        }`}
      >
        {/* Header bar (hidden when printing) */}
        <div className="px-6 py-4 bg-forest-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-gold-400" />
            <h3 className="font-serif font-bold text-sm">Receipt Confirmation</h3>
          </div>

          {/* Format Toggle */}
          <div className="flex items-center bg-forest-800 rounded-xl p-0.5 text-xs font-semibold">
            <button
              onClick={() => setFormat('thermal')}
              className={`px-2.5 py-1 rounded-lg transition ${
                format === 'thermal' ? 'bg-gold-500 text-forest-950 font-bold' : 'text-stone-300'
              }`}
            >
              80mm Slip
            </button>
            <button
              onClick={() => setFormat('a4')}
              className={`px-2.5 py-1 rounded-lg transition ${
                format === 'a4' ? 'bg-gold-500 text-forest-950 font-bold' : 'text-stone-300'
              }`}
            >
              A4 Page
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-forest-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls (hidden when printing) */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 print:hidden">
          {/* Primary Action 1: Print Receipt */}
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-forest-800 text-gold-300 font-bold text-xs rounded-xl hover:bg-forest-900 transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>

          {/* Primary Action 2: New Sale */}
          {onNewSale && (
            <button
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-forest-950 font-bold text-xs rounded-xl transition shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              New Sale
            </button>
          )}

          <button
            onClick={handleReprint}
            disabled={reprinting}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-100 transition"
            title="Record reprint audit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reprinting ? 'animate-spin text-forest-700' : ''}`} />
            <span>Reprint</span>
            {reprintCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {reprintCount}
              </span>
            )}
          </button>

          <button
            onClick={copyReceiptText}
            className="p-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-100 transition"
            title="Copy plain text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 overflow-y-auto leading-tight print:p-0">
          {format === 'thermal' ? (
            /* ================= 80MM THERMAL SLIP FORMAT ================= */
            <div className="max-w-[340px] mx-auto font-mono text-xs text-stone-900 space-y-4 print:p-0 print:text-[11px]">
              {/* Restaurant Masthead */}
              <div className="text-center space-y-1">
                <img
                  src="/logo.png"
                  alt="Northern Flavors Logo"
                  className="w-12 h-12 mx-auto rounded-full object-cover border border-stone-200 mb-1"
                />
                <h2 className="font-serif font-black text-lg tracking-tight text-forest-950 uppercase">
                  Northern Flavors
                </h2>
                <p className="text-[10px] text-stone-600">Restaurant & Grills V3.0</p>
                <p className="text-[10px] text-stone-600">
                  Gajambe Plaza, Yalwawa, Dutse, Jigawa State
                </p>
                <p className="text-[10px] text-stone-600">Hotline: 0906 820 2567</p>
              </div>

              {/* Order Meta */}
              <div className="border-t border-dashed border-stone-300 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Receipt No:</span>
                  <span className="font-bold">{receipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Order No:</span>
                  <span className="font-bold">{order.order_number || receipt.metadata?.order_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Order Type:</span>
                  <span className="font-bold uppercase text-forest-900">{orderType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Date:</span>
                  <span>{new Date(receipt.issued_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Cashier:</span>
                  <span>{cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer:</span>
                  <span>{customerName}</span>
                </div>
                {reprintCount > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold text-[10px] uppercase">
                    <span>Reprint Copy:</span>
                    <span>#{reprintCount}</span>
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="border-t border-dashed border-stone-300 pt-2">
                <div className="flex justify-between font-bold pb-1 text-[11px]">
                  <span>Item</span>
                  <span>Qty x Price</span>
                  <span>Total</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {items.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-start">
                      <div className="max-w-[170px] truncate">
                        {item.product_name || 'Menu item'}
                      </div>
                      <div className="text-stone-600">
                        {item.quantity} x ₦{Number(item.unit_price).toLocaleString()}
                      </div>
                      <div className="font-bold text-right">
                        ₦{Number(item.line_total).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Packaging Fee */}
              <div className="border-t border-dashed border-stone-300 pt-2 space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>Food Subtotal:</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>

                {packagingFee > 0 && (
                  <div className="flex justify-between text-stone-800 font-medium">
                    <span>Takeaway Packaging:</span>
                    <span>₦{packagingFee.toLocaleString()}</span>
                  </div>
                )}

                {deliveryFee > 0 && (
                  <div className="flex justify-between text-stone-800 font-medium">
                    <span>Delivery Charge:</span>
                    <span>₦{deliveryFee.toLocaleString()}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₦{discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between font-black text-sm pt-1 border-t border-stone-200">
                  <span>TOTAL PAYABLE:</span>
                  <span>₦{total.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-stone-700 pt-1">
                  <span>Paid ({payment.payment_method?.toUpperCase() || 'PAID'}):</span>
                  <span>₦{Number(payment.amount || order.amount_paid || total).toLocaleString()}</span>
                </div>

                {payment.amount_tendered && (
                  <div className="flex justify-between text-stone-600">
                    <span>Amount Tendered:</span>
                    <span>₦{Number(payment.amount_tendered).toLocaleString()}</span>
                  </div>
                )}

                {payment.change_due > 0 && (
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Change Given:</span>
                    <span>₦{Number(payment.change_due).toLocaleString()}</span>
                  </div>
                )}

                {payment.transaction_reference && (
                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span>Ref:</span>
                    <span>{payment.transaction_reference}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-dashed border-stone-300 pt-3 text-center space-y-1">
                <p className="font-bold text-[11px] text-forest-950">Thank you for dining with us!</p>
                <p className="text-[10px] text-stone-500">Authentic Taste • Quality Ingredients</p>
                <p className="text-[9px] text-stone-400">Please keep this slip for your records</p>
              </div>
            </div>
          ) : (
            /* ================= A4 INVOICE FORMAT ================= */
            <div className="p-8 space-y-6 text-sm text-stone-900 font-sans">
              <div className="flex justify-between items-start border-b border-stone-200 pb-6">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="Northern Flavors Logo"
                    className="w-14 h-14 rounded-full object-cover border border-stone-200 shadow-sm"
                  />
                  <div>
                    <h1 className="font-serif font-black text-2xl text-forest-950">
                      NORTHERN FLAVORS
                    </h1>
                    <p className="text-xs text-stone-500 mt-1">Authentic Northern Cuisine & Grills</p>
                    <p className="text-xs text-stone-500">Gajambe Plaza, Yalwawa, Dutse, Jigawa State</p>
                    <p className="text-xs text-stone-500">Tel: +234 906 820 2567</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-lg text-forest-900 block">
                    {receipt.receipt_number}
                  </span>
                  <span className="text-xs text-stone-500 block">
                    Order Ref: {order.order_number || 'N/A'}
                  </span>
                  <span className="text-xs text-stone-500 block">
                    Date: {new Date(receipt.issued_at).toLocaleDateString()}
                  </span>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-forest-100 text-forest-900 text-xs font-bold uppercase mt-2">
                    {orderType}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-stone-500 block uppercase text-[10px]">Billed To</span>
                  <span className="font-bold text-stone-900 text-sm">{customerName}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-stone-500 block uppercase text-[10px]">Issued By</span>
                  <span className="font-semibold text-stone-800">{cashierName}</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Item</th>
                    <th className="py-2.5 px-4 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Price</th>
                    <th className="py-2.5 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-4 font-semibold">{item.product_name}</td>
                      <td className="py-2.5 px-4 text-center">{item.quantity}</td>
                      <td className="py-2.5 px-4 text-right">₦{Number(item.unit_price).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-bold">₦{Number(item.line_total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="w-64 ml-auto space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                {packagingFee > 0 && (
                  <div className="flex justify-between text-stone-800">
                    <span>Takeaway Packaging:</span>
                    <span>₦{packagingFee.toLocaleString()}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-stone-800">
                    <span>Delivery Charge:</span>
                    <span>₦{deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₦{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base pt-2 border-t border-stone-300 text-forest-950">
                  <span>Grand Total:</span>
                  <span>₦{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-stone-600 pt-1">
                  <span>Payment Method:</span>
                  <span className="font-bold uppercase">{payment.payment_method}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
