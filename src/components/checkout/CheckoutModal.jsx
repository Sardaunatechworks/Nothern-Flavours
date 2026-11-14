import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, CheckCircle, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { checkoutSchema } from '../../schemas/orderSchema';
import { useBasket } from '../../context/BasketContext';
import { orderService } from '../../services/orderService';
import { formatNaira } from '../../utils/formatters';

export default function CheckoutModal({ onClose, onSuccess }) {
  const { basket, subtotal, clearBasket } = useBasket();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      orderType: 'delivery',
      deliveryAddress: '',
      notes: '',
    },
  });

  const orderType = watch('orderType');
  const deliveryFee = orderType === 'delivery' ? 1000 : 0;
  const grandTotal = subtotal + deliveryFee;

  const onSubmit = async (formData) => {
    setSubmitting(true);
    setServerError('');

    try {
      const result = await orderService.submitCustomerOrder({
        fullName: formData.fullName,
        phone: formData.phone,
        orderType: formData.orderType,
        deliveryAddress: formData.deliveryAddress,
        notes: formData.notes,
        items: basket,
      });

      const whatsappUrl = orderService.buildWhatsAppUrl({
        orderNumber: result.order_number,
        fullName: formData.fullName,
        phone: formData.phone,
        orderType: formData.orderType,
        deliveryAddress: formData.deliveryAddress,
        notes: formData.notes,
        items: basket,
        subtotal: result.subtotal || subtotal,
        deliveryFee: result.delivery_fee || deliveryFee,
        total: result.total || grandTotal,
      });

      // Clear shopping basket
      clearBasket();

      // Show confirmation dialog before triggering WhatsApp
      setOrderConfirmation({
        orderNumber: result.order_number,
        whatsappUrl,
        customerName: formData.fullName,
        total: result.total || grandTotal,
      });
    } catch (err) {
      setServerError(err.message || 'Unable to place order. Please check stock or try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-forest-800 text-cream-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold">
              {orderConfirmation ? 'Order Received' : 'Complete Your Order'}
            </h3>
            <p className="text-[11px] text-gold-400">Northern Flavours Restaurant · Dutse</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-cream-200 hover:text-white hover:bg-forest-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {orderConfirmation ? (
            /* Confirmation View */
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-gold-600">
                  ORDER PLACED SUCCESSFULLY
                </span>
                <h4 className="font-serif text-2xl font-bold text-forest-950">
                  {orderConfirmation.orderNumber}
                </h4>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  Thank you, <span className="font-semibold">{orderConfirmation.customerName}</span>! Your order has been recorded in our system. Tap below to send your order details directly to our staff on WhatsApp for confirmation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-cream-100 border border-stone-200 text-left space-y-2">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Order Reference:</span>
                  <span className="font-mono font-bold text-forest-950">{orderConfirmation.orderNumber}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Total Amount:</span>
                  <span className="font-bold text-forest-900">{formatNaira(orderConfirmation.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Pending Staff Confirmation
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={orderConfirmation.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onSuccess}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-98"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Order via WhatsApp</span>
                </a>

                <button
                  onClick={onSuccess}
                  className="w-full py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form View */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('fullName')}
                  placeholder="e.g. Fatima Mohammed"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
                {errors.fullName && (
                  <p className="text-[11px] text-red-500">{errors.fullName.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  placeholder="e.g. 09068202567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
                {errors.phone && (
                  <p className="text-[11px] text-red-500">{errors.phone.message}</p>
                )}
              </div>

              {/* Order Type: Delivery / Pickup */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">Order Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      orderType === 'delivery'
                        ? 'border-forest-800 bg-forest-50/60 text-forest-900 font-bold'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="radio"
                      value="delivery"
                      {...register('orderType')}
                      className="sr-only"
                    />
                    <span className="text-xs">🚗 Delivery (+₦1,000)</span>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      orderType === 'pickup'
                        ? 'border-forest-800 bg-forest-50/60 text-forest-900 font-bold'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="radio"
                      value="pickup"
                      {...register('orderType')}
                      className="sr-only"
                    />
                    <span className="text-xs">🛍️ Pickup (Free)</span>
                  </label>
                </div>
              </div>

              {/* Delivery Address (only if delivery) */}
              {orderType === 'delivery' && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Delivery Address in Dutse <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    {...register('deliveryAddress')}
                    placeholder="House number, street name, landmark in Dutse..."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                  {errors.deliveryAddress && (
                    <p className="text-[11px] text-red-500">{errors.deliveryAddress.message}</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  Special Instructions / Notes <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  {...register('notes')}
                  placeholder="e.g. Extra spicy, separate sauce, etc."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              {/* Summary line */}
              <div className="p-4 rounded-xl bg-cream-100 border border-stone-200 space-y-1">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Subtotal</span>
                  <span>{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Delivery Fee</span>
                  <span>{formatNaira(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-forest-950 pt-1 border-t border-stone-300">
                  <span>Total Amount</span>
                  <span>{formatNaira(grandTotal)}</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-full bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <span>Place Order</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
