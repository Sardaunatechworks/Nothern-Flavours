import React, { useState, useEffect } from 'react';
import { Printer, RefreshCw, X, Check, Copy, ShoppingBag } from 'lucide-react';
import { cashierService } from '../services/cashierService';

export default function ThermalReceiptModal({ receipt, onClose, onNewSale, onReprintSuccess }) {
  const [format, setFormat] = useState('thermal'); // 'thermal' (80mm) | 'a4'
  const [reprinting, setReprinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reprintCount, setReprintCount] = useState(receipt?.reprint_count || 0);

  // Clean up printing classes if print dialog finishes or is cancelled
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-receipt', 'printing-a4');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-receipt', 'printing-a4');
    };
  }, []);

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

  /**
   * Waits for fonts and images in receipt-print-area to fully load,
   * sets the targeted printing class, and invokes Chrome's print dialog.
   */
  const triggerPrint = async (targetFormat = format) => {
    try {
      // 1. Ensure web fonts are ready
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 2. Ensure receipt logo and any images are fully loaded & decoded
      const selector = targetFormat === 'a4' ? '.receipt-print-area-a4' : '.receipt-print-area';
      const printContainer = document.querySelector(selector);
      if (printContainer) {
        const imgs = Array.from(printContainer.querySelectorAll('img'));
        await Promise.all(
          imgs.map((img) => {
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })
        );
      }
    } catch (err) {
      console.warn('Pre-print asset verification failed:', err);
    }

    const printClass = targetFormat === 'a4' ? 'printing-a4' : 'printing-receipt';
    document.body.classList.add(printClass);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-receipt', 'printing-a4');
      }, 500);
    }, 100);
  };

  const handlePrint = () => {
    triggerPrint(format);
  };

  const handleReprint = async () => {
    try {
      setReprinting(true);
      const res = await cashierService.reprintReceipt(receipt.id);
      setReprintCount(res.reprint_count);
      if (onReprintSuccess) onReprintSuccess(res);
      await triggerPrint(format);
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
  Gajambe Plaza, Yalwawa, Dutse
  Tel: 0906 820 2567 | 0813 139 3402
       Tel: 0904 353 8768
================================
Receipt No: ${receipt.receipt_number}
Order Ref: ${order.order_number || receipt.metadata?.order_number || 'N/A'}
Order Type: ${orderType.toUpperCase()}
Date: ${new Date(receipt.issued_at).toLocaleString()}
Cashier: ${cashierName}
Customer: ${customerName}
${reprintCount > 0 ? `*** REPRINT COPY #${reprintCount} ***\n` : ''}--------------------------------
ITEMS:
${items.map((it) => `${it.product_name || 'Item'} x${it.quantity} @ ₦${Number(it.unit_price).toLocaleString()} = ₦${Number(it.line_total).toLocaleString()}`).join('\n')}
--------------------------------
Subtotal: ₦${subtotal.toLocaleString()}
${packagingFee > 0 ? `Takeaway Packaging: ₦${packagingFee.toLocaleString()}\n` : ''}${deliveryFee > 0 ? `Delivery Fee: ₦${deliveryFee.toLocaleString()}\n` : ''}${discountAmount > 0 ? `Discount: -₦${discountAmount.toLocaleString()}\n` : ''}TOTAL PAYABLE: ₦${total.toLocaleString()}
Paid: ₦${Number(payment.amount || order.amount_paid || total).toLocaleString()} (${payment.payment_method?.toUpperCase() || 'PAID'})
${payment.amount_tendered ? `Tendered: ₦${Number(payment.amount_tendered).toLocaleString()}\n` : ''}${payment.change_due > 0 ? `Change Due: ₦${Number(payment.change_due).toLocaleString()}\n` : ''}${payment.transaction_reference ? `Ref: ${payment.transaction_reference}\n` : ''}================================
  Thank you for dining with us!
  Authentic Taste • Quality Meals
================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-transparent print:static">
      {/* Container */}
      <div
        className={`bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:w-auto print:rounded-none ${
          format === 'a4' ? 'max-w-2xl w-full' : 'max-w-md w-full'
        }`}
      >
        {/* Header bar (hidden when printing) */}
        <div className="px-6 py-4 bg-forest-900 text-white flex items-center justify-between no-print">
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
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 no-print">
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
        <div className="p-6 overflow-y-auto leading-tight print:p-0 print:overflow-visible">
          {format === 'thermal' ? (
            /* ================= 80MM THERMAL SLIP FORMAT (Xprinter XP-80C) ================= */
            <div className="receipt-print-area max-w-[340px] mx-auto text-black font-sans text-xs space-y-3 bg-white p-2">
              {/* Restaurant Masthead */}
              <div className="text-center space-y-1">
                <img
                  src="/logo-thermal.png"
                  alt="Northern Flavors Logo"
                  className="receipt-logo w-14 h-14 mx-auto object-contain mb-1"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/logo.png';
                  }}
                />
                <h2 className="font-sans font-black text-base tracking-tight text-black uppercase">
                  NORTHERN FLAVORS
                </h2>
                <p className="text-[10px] font-bold text-black uppercase tracking-wider">
                  Restaurant & Grills
                </p>
                <p className="text-[10px] font-semibold text-black leading-tight">
                  Gajambe Plaza, Yalwawa, Dutse, Jigawa State
                </p>
                <div className="text-[10px] font-bold text-black space-y-0.5 pt-0.5">
                  <p>Hotline: 0906 820 2567</p>
                  <p>Tel: 0813 139 3402 | 0904 353 8768</p>
                </div>
              </div>

              {/* Order Meta */}
              <div className="border-t border-dashed border-black pt-2 space-y-1 text-[11px] font-semibold text-black">
                <div className="flex justify-between">
                  <span>Receipt No:</span>
                  <span className="font-mono font-bold">{receipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Ref:</span>
                  <span className="font-mono font-bold">{order.order_number || receipt.metadata?.order_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Type:</span>
                  <span className="font-bold uppercase">{orderType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(receipt.issued_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span className="font-bold">{cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{customerName}</span>
                </div>
                {reprintCount > 0 && (
                  <div className="text-center font-black text-[11px] uppercase pt-1 tracking-wider">
                    *** REPRINT COPY #{reprintCount} ***
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="border-t border-dashed border-black pt-2">
                <div className="flex justify-between font-black pb-1 text-[11px] uppercase border-b border-solid border-black">
                  <span className="flex-1">Item</span>
                  <span className="w-20 text-center">Qty x Price</span>
                  <span className="w-16 text-right">Total</span>
                </div>
                <div className="space-y-1.5 pt-1.5 text-[11px] font-medium text-black">
                  {items.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-start">
                      <div className="flex-1 pr-1 break-words font-semibold">
                        {item.product_name || 'Menu item'}
                      </div>
                      <div className="w-20 text-center text-[10px] whitespace-nowrap pt-0.5">
                        {item.quantity} x ₦{Number(item.unit_price).toLocaleString()}
                      </div>
                      <div className="w-16 font-bold text-right whitespace-nowrap">
                        ₦{Number(item.line_total).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Fees */}
              <div className="border-t border-dashed border-black pt-2 space-y-1 text-[11px] font-semibold text-black">
                <div className="flex justify-between">
                  <span>Food Subtotal:</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>

                {packagingFee > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Takeaway Packaging:</span>
                    <span>₦{packagingFee.toLocaleString()}</span>
                  </div>
                )}

                {deliveryFee > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Delivery Charge:</span>
                    <span>₦{deliveryFee.toLocaleString()}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Discount:</span>
                    <span>-₦{discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between font-black text-sm pt-1.5 border-t border-solid border-black">
                  <span>TOTAL PAYABLE:</span>
                  <span className="text-base font-black">₦{total.toLocaleString()}</span>
                </div>

                <div className="flex justify-between font-bold pt-1">
                  <span>Paid ({payment.payment_method?.toUpperCase() || 'PAID'}):</span>
                  <span>₦{Number(payment.amount || order.amount_paid || total).toLocaleString()}</span>
                </div>

                {payment.amount_tendered && (
                  <div className="flex justify-between">
                    <span>Amount Tendered:</span>
                    <span>₦{Number(payment.amount_tendered).toLocaleString()}</span>
                  </div>
                )}

                {payment.change_due > 0 && (
                  <div className="flex justify-between font-black">
                    <span>Change Due:</span>
                    <span>₦{Number(payment.change_due).toLocaleString()}</span>
                  </div>
                )}

                {payment.transaction_reference && (
                  <div className="flex justify-between text-[10px]">
                    <span>Transaction Ref:</span>
                    <span className="font-mono">{payment.transaction_reference}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-dashed border-black pt-2 text-center space-y-1 text-black">
                <p className="font-bold text-[11px] uppercase tracking-wide">Thank you for dining with us!</p>
                <p className="text-[10px] font-medium">Authentic Taste • Quality Ingredients</p>
                <p className="text-[9px]">Please retain this slip for your records</p>
              </div>
            </div>
          ) : (
            /* ================= A4 INVOICE FORMAT ================= */
            <div className="receipt-print-area-a4 p-8 space-y-6 text-sm text-stone-900 font-sans">
              <div className="flex justify-between items-start border-b border-stone-200 pb-6">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="Northern Flavors Logo"
                    className="w-16 h-16 rounded-full object-cover border border-stone-200 shadow-sm"
                  />
                  <div>
                    <h1 className="font-serif font-black text-2xl text-forest-950">
                      NORTHERN FLAVORS
                    </h1>
                    <p className="text-xs text-stone-500 mt-1">Authentic Northern Cuisine & Grills</p>
                    <p className="text-xs text-stone-500">Gajambe Plaza, Yalwawa, Dutse, Jigawa State</p>
                    <p className="text-xs font-semibold text-stone-700">
                      Hotline: 0906 820 2567 | Tel: 0813 139 3402 | 0904 353 8768
                    </p>
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
