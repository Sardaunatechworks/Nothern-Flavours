import React, { useState } from 'react';
import { Printer, RefreshCw, X, Check, Copy } from 'lucide-react';
import { cashierService } from '../services/cashierService';

export default function ThermalReceiptModal({ receipt, onClose, onReprintSuccess }) {
  const [reprinting, setReprinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reprintCount, setReprintCount] = useState(receipt?.reprint_count || 0);

  if (!receipt) return null;

  const order = receipt.order || {};
  const items = order.items || [];
  const payment = receipt.payment || {};
  const cashierName = receipt.cashier?.full_name || receipt.metadata?.cashier_name || 'Cashier';
  const customerName = order.customer?.full_name || receipt.metadata?.customer_name || 'Walk-in Customer';

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
Date: ${new Date(receipt.issued_at).toLocaleString()}
Cashier: ${cashierName}
Customer: ${customerName}
Order Ref: ${order.order_number || receipt.metadata?.order_number || 'N/A'}
--------------------------------
ITEMS:
${items.map((it) => `${it.product_name || 'Item'} x${it.quantity} @ ₦${Number(it.unit_price).toLocaleString()} = ₦${Number(it.line_total).toLocaleString()}`).join('\n')}
--------------------------------
Total: ₦${Number(order.total_amount || 0).toLocaleString()}
Paid: ₦${Number(payment.amount || order.amount_paid || order.total_amount || 0).toLocaleString()}
Method: ${payment.payment_method?.toUpperCase() || 'PAID'}
================================
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
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:max-w-none print:w-full">
        {/* Header bar (hidden when printing) */}
        <div className="px-6 py-4 bg-forest-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-gold-400" />
            <h3 className="font-serif font-bold text-sm">Receipt Preview</h3>
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
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-forest-800 text-gold-300 font-bold text-xs rounded-xl hover:bg-forest-900 transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
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

        {/* Thermal Slip Content (Visible on screen and optimized for 80mm/58mm thermal rolls in print) */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-stone-900 leading-tight print:p-0 print:text-[11px] print:leading-normal">
          <div className="max-w-[340px] mx-auto space-y-4">
            {/* Restaurant Masthead */}
            <div className="text-center space-y-1">
              <h2 className="font-serif font-black text-lg tracking-tight text-forest-950 uppercase">
                Northern Flavors
              </h2>
              <p className="text-[10px] text-stone-600">Restaurant & Grills V3.0</p>
              <p className="text-[10px] text-stone-600">
                Gajambe Plaza, Yalwawa, Dutse, Jigawa State
              </p>
              <p className="text-[10px] text-stone-600">Hotline: 0906 820 2567</p>
            </div>

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
                {items.length > 0 ? (
                  items.map((item, idx) => (
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
                  ))
                ) : (
                  <div className="text-stone-500 text-center py-2">Sale details on record</div>
                )}
              </div>
            </div>

            {/* Totals and Payments */}
            <div className="border-t border-dashed border-stone-300 pt-2 space-y-1">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>₦{Number(order.subtotal || order.total_amount || 0).toLocaleString()}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>-₦{Number(order.discount_amount).toLocaleString()}</span>
                </div>
              )}
              {Number(order.delivery_fee) > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Delivery:</span>
                  <span>₦{Number(order.delivery_fee).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-stone-200">
                <span>TOTAL:</span>
                <span>₦{Number(order.total_amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-700 pt-1">
                <span>Paid ({payment.payment_method || 'Payment'}):</span>
                <span>₦{Number(payment.amount || order.amount_paid || order.total_amount || 0).toLocaleString()}</span>
              </div>
              {payment.amount_tendered && (
                <div className="flex justify-between text-stone-600">
                  <span>Tendered:</span>
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
        </div>
      </div>
    </div>
  );
}

